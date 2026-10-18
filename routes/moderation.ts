// Reporting objectionable content, blocking accounts, and the admin review
// queue for reports. Mounted at /api by server.ts.
//
//   POST   /api/reports              signed-in users report a car, reel, part, dealer or user
//   GET    /api/blocks               the caller's blocked accounts
//   POST   /api/blocks               block an account (by user id or dealer id)
//   DELETE /api/blocks/:userId       unblock
//   GET    /api/admin/reports        admins: reports, newest first, optional ?status=
//   PUT    /api/admin/reports/:id    admins: resolve a report, optionally acting on the content
import express from "express";
import fs from "fs";
import type Database from "better-sqlite3";
import { bumpTokenVersion } from "../services/accounts";
import { uploadedFilePath } from "../services/accountDeletion";

type Middleware = (req: any, res: any, next: any) => void;

interface Deps {
  db: Database.Database;
  authenticate: Middleware;
  isAdmin: Middleware;
  uploadsDir: string;
  logActivity: (action: string, userId: number, details: string) => void;
}

export const REPORT_TARGETS = ["car", "reel", "part", "dealer", "user"] as const;
export const REPORT_REASONS = ["spam", "fraud", "inappropriate", "offensive", "misleading", "other"] as const;
export const REPORT_STATUSES = ["open", "actioned", "dismissed"] as const;
const MAX_REPORTS_PER_DAY = 20;
const MAX_DETAILS = 500;

export function ensureModerationSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_user_id INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      admin_note TEXT,
      action_taken TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS content_reports_one_open
      ON content_reports (reporter_user_id, target_type, target_id) WHERE status = 'open';
    CREATE INDEX IF NOT EXISTS content_reports_status ON content_reports (status, created_at);
    CREATE TABLE IF NOT EXISTS user_blocks (
      blocker_user_id INTEGER NOT NULL,
      blocked_user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (blocker_user_id, blocked_user_id)
    );
  `);
}

/** The user who owns a reported item, or null when the item does not exist. */
function ownerOf(db: Database.Database, type: string, id: number): number | null {
  const row = (() => {
    switch (type) {
      case "car":
        return db.prepare("SELECT d.user_id AS owner FROM cars c JOIN dealers d ON d.id = c.dealer_id WHERE c.id = ?").get(id);
      case "reel":
        return db.prepare("SELECT d.user_id AS owner FROM reels r JOIN dealers d ON d.id = r.dealer_id WHERE r.id = ?").get(id);
      case "part":
        return db.prepare("SELECT d.user_id AS owner FROM parts p JOIN dealers d ON d.id = p.dealer_id WHERE p.id = ?").get(id);
      case "dealer":
        return db.prepare("SELECT user_id AS owner FROM dealers WHERE id = ? AND status != 'deleted'").get(id);
      case "user":
        return db.prepare("SELECT id AS owner FROM users WHERE id = ? AND is_verified != -1").get(id);
      default:
        return undefined;
    }
  })() as { owner: number } | undefined;
  return row ? row.owner : null;
}

function targetSummary(db: Database.Database, type: string, id: number): Record<string, unknown> {
  switch (type) {
    case "car":
      return (db.prepare(
        "SELECT c.make || ' ' || c.model || ' ' || c.year AS title, c.status, d.id AS dealer_id, d.name AS dealer_name FROM cars c LEFT JOIN dealers d ON d.id = c.dealer_id WHERE c.id = ?"
      ).get(id) as any) ?? {};
    case "reel":
      return (db.prepare(
        "SELECT COALESCE(NULLIF(r.caption, ''), 'Reel #' || r.id) AS title, r.video_url, d.id AS dealer_id, d.name AS dealer_name FROM reels r LEFT JOIN dealers d ON d.id = r.dealer_id WHERE r.id = ?"
      ).get(id) as any) ?? { title: "Deleted reel" };
    case "part":
      return (db.prepare(
        "SELECT p.name AS title, p.status, d.id AS dealer_id, d.name AS dealer_name FROM parts p LEFT JOIN dealers d ON d.id = p.dealer_id WHERE p.id = ?"
      ).get(id) as any) ?? {};
    case "dealer":
      return (db.prepare("SELECT name AS title, status, id AS dealer_id, name AS dealer_name FROM dealers WHERE id = ?").get(id) as any) ?? {};
    case "user":
      return (db.prepare("SELECT name AS title, role, CASE WHEN is_verified = -1 THEN 'banned' ELSE 'active' END AS status FROM users WHERE id = ?").get(id) as any) ?? {};
    default:
      return {};
  }
}

export function createModerationRouter({ db, authenticate, isAdmin, uploadsDir, logActivity }: Deps) {
  ensureModerationSchema(db);
  const router = express.Router();

  router.post("/reports", authenticate, (req: any, res) => {
    const { target_type, reason } = req.body || {};
    const targetId = Number(req.body?.target_id);
    const details = typeof req.body?.details === "string" ? req.body.details.trim() : "";
    if (!REPORT_TARGETS.includes(target_type)) return res.status(400).json({ error: "Invalid report target" });
    if (!Number.isInteger(targetId) || targetId <= 0) return res.status(400).json({ error: "Invalid report target" });
    if (!REPORT_REASONS.includes(reason)) return res.status(400).json({ error: "Choose a reason for the report" });
    if (details.length > MAX_DETAILS) return res.status(400).json({ error: `Details must be ${MAX_DETAILS} characters or fewer` });
    if (reason === "other" && !details) return res.status(400).json({ error: "Describe the problem" });

    const owner = ownerOf(db, target_type, targetId);
    if (owner === null) return res.status(404).json({ error: "This content no longer exists" });
    if (owner === req.user.id) return res.status(400).json({ error: "You cannot report your own content" });

    const existing = db
      .prepare("SELECT id FROM content_reports WHERE reporter_user_id = ? AND target_type = ? AND target_id = ? AND status = 'open'")
      .get(req.user.id, target_type, targetId) as { id: number } | undefined;
    if (existing) return res.json({ success: true, id: existing.id, alreadyReported: true });

    const today = db
      .prepare("SELECT COUNT(*) AS c FROM content_reports WHERE reporter_user_id = ? AND created_at > datetime('now', '-1 day')")
      .get(req.user.id) as { c: number };
    if (today.c >= MAX_REPORTS_PER_DAY) return res.status(429).json({ error: "Too many reports today. Please try again tomorrow." });

    const result = db
      .prepare("INSERT INTO content_reports (reporter_user_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?)")
      .run(req.user.id, target_type, targetId, reason, details || null);
    logActivity("Content reported", req.user.id, `${target_type} ${targetId} (${reason})`);
    res.json({ success: true, id: Number(result.lastInsertRowid) });
  });

  router.get("/blocks", authenticate, (req: any, res) => {
    const rows = db.prepare(`
      SELECT b.blocked_user_id AS user_id, d.id AS dealer_id, COALESCE(d.name, u.name) AS name, b.created_at
      FROM user_blocks b
      LEFT JOIN users u ON u.id = b.blocked_user_id
      LEFT JOIN dealers d ON d.user_id = b.blocked_user_id
      WHERE b.blocker_user_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user.id);
    res.json(rows);
  });

  router.post("/blocks", authenticate, (req: any, res) => {
    let userId = Number(req.body?.user_id);
    const dealerId = Number(req.body?.dealer_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      if (!Number.isInteger(dealerId) || dealerId <= 0) return res.status(400).json({ error: "Choose an account to block" });
      const dealer = db.prepare("SELECT user_id FROM dealers WHERE id = ?").get(dealerId) as { user_id: number } | undefined;
      if (!dealer) return res.status(404).json({ error: "Account not found" });
      userId = dealer.user_id;
    }
    if (userId === req.user.id) return res.status(400).json({ error: "You cannot block yourself" });
    const target = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId) as { id: number; role: string } | undefined;
    if (!target) return res.status(404).json({ error: "Account not found" });
    if (target.role === "super_admin") return res.status(400).json({ error: "This account cannot be blocked" });
    db.prepare("INSERT OR IGNORE INTO user_blocks (blocker_user_id, blocked_user_id) VALUES (?, ?)").run(req.user.id, userId);
    res.json({ success: true, user_id: userId });
  });

  router.delete("/blocks/:userId", authenticate, (req: any, res) => {
    db.prepare("DELETE FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ?").run(req.user.id, Number(req.params.userId));
    res.json({ success: true });
  });

  router.get("/admin/reports", authenticate, isAdmin, (req: any, res) => {
    const status = typeof req.query.status === "string" && REPORT_STATUSES.includes(req.query.status as any) ? req.query.status : null;
    const rows = db.prepare(`
      SELECT r.*, u.email AS reporter_email,
        (SELECT COUNT(*) FROM content_reports o WHERE o.target_type = r.target_type AND o.target_id = r.target_id AND o.status = 'open') AS open_reports_for_target
      FROM content_reports r LEFT JOIN users u ON u.id = r.reporter_user_id
      ${status ? "WHERE r.status = ?" : ""}
      ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.created_at DESC
      LIMIT 500
    `).all(...(status ? [status] : [])) as any[];
    res.json(rows.map((r) => ({ ...r, target: targetSummary(db, r.target_type, r.target_id) })));
  });

  router.put("/admin/reports/:id", authenticate, isAdmin, (req: any, res) => {
    const report = db.prepare("SELECT * FROM content_reports WHERE id = ?").get(req.params.id) as any;
    if (!report) return res.status(404).json({ error: "Report not found" });
    const { status, action } = req.body || {};
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 1000) : null;
    if (status !== "actioned" && status !== "dismissed") return res.status(400).json({ error: "status must be 'actioned' or 'dismissed'" });
    const validActions = ["none", "hide_content", "suspend_dealer", "ban_user"];
    const act = status === "dismissed" ? "none" : action ?? "none";
    if (!validActions.includes(act)) return res.status(400).json({ error: "Unknown action" });

    const { target_type: type, target_id: id } = report;
    const fileToRemove: string[] = [];
    const apply = db.transaction(() => {
      if (act === "hide_content") {
        if (type === "car") db.prepare("UPDATE cars SET status = 'hidden' WHERE id = ?").run(id);
        else if (type === "part") db.prepare("UPDATE parts SET status = 'hidden' WHERE id = ?").run(id);
        else if (type === "reel") {
          const reel = db.prepare("SELECT video_url FROM reels WHERE id = ?").get(id) as { video_url: string } | undefined;
          db.prepare("DELETE FROM reel_likes WHERE reel_id = ?").run(id);
          db.prepare("DELETE FROM reels WHERE id = ?").run(id);
          const file = reel && uploadedFilePath(uploadsDir, reel.video_url);
          if (file && !db.prepare("SELECT 1 FROM reels WHERE video_url = ? LIMIT 1").get(reel!.video_url)) fileToRemove.push(file);
        } else throw new HttpError(400, "Only cars, parts and reels can be hidden; suspend the dealer or ban the user instead");
      } else if (act === "suspend_dealer") {
        const dealer = (type === "dealer"
          ? db.prepare("SELECT id, user_id FROM dealers WHERE id = ?").get(id)
          : (summaryDealer(db, type, id))) as { id: number; user_id: number } | undefined;
        if (!dealer) throw new HttpError(400, "No dealer is linked to this report");
        db.prepare("UPDATE dealers SET status = 'suspended' WHERE id = ?").run(dealer.id);
        bumpTokenVersion(db, dealer.user_id);
      } else if (act === "ban_user") {
        const userId = type === "user" ? id : ownerOf(db, type, id);
        const user = userId ? (db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId) as { id: number; role: string } | undefined) : undefined;
        if (!user) throw new HttpError(400, "No account is linked to this report");
        if (user.role === "super_admin") throw new HttpError(400, "Administrator accounts cannot be banned");
        db.prepare("UPDATE users SET is_verified = -1 WHERE id = ?").run(user.id);
        bumpTokenVersion(db, user.id);
      }
      // One decision closes every open report on the same item.
      const closeAll = act !== "none";
      db.prepare(`
        UPDATE content_reports SET status = ?, action_taken = ?, admin_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE ${closeAll ? "target_type = ? AND target_id = ? AND status = 'open'" : "id = ?"}
      `).run(status, act, note, req.user.id, ...(closeAll ? [type, id] : [report.id]));
    });
    try {
      apply();
    } catch (e) {
      if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
      throw e;
    }
    for (const file of fileToRemove) fs.promises.unlink(file).catch(() => {});
    logActivity("Admin reviewed report", req.user.id, `Report ${report.id}: ${status} (${act})`);
    res.json({ success: true });
  });

  return router;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function summaryDealer(db: Database.Database, type: string, id: number) {
  const table = type === "car" ? "cars" : type === "reel" ? "reels" : type === "part" ? "parts" : null;
  if (!table) return undefined;
  return db.prepare(`SELECT d.id, d.user_id FROM ${table} t JOIN dealers d ON d.id = t.dealer_id WHERE t.id = ?`).get(id);
}
