// Account-level security helpers: who may sign in, first-admin bootstrap,
// session invalidation, and retiring the credentials old seed code created.
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type Database from "better-sqlite3";
import type { AppConfig } from "../config";

export const ACCOUNT_SUSPENDED_MESSAGE = "This account has been suspended. Please contact support.";

/**
 * Why an account may not hold a session, or null if it may.
 * - `is_verified = -1` is the admin "ban" marker.
 * - A dealer whose showroom an admin suspended is locked out as well.
 */
export function accountBlockReason(db: Database.Database, user: { id: number; role?: string; is_verified?: number }): string | null {
  if (user.is_verified === -1) return ACCOUNT_SUSPENDED_MESSAGE;
  if (user.role === "dealer") {
    const dealer = db.prepare("SELECT status FROM dealers WHERE user_id = ?").get(user.id) as { status?: string } | undefined;
    if (dealer?.status === "suspended") return ACCOUNT_SUSPENDED_MESSAGE;
  }
  return null;
}

/** Invalidates every token already issued to this user. */
export function bumpTokenVersion(db: Database.Database, userId: number | string) {
  db.prepare("UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = ?").run(userId);
}

/** A bcrypt hash nobody knows the password for. */
export function unusablePasswordHash(): string {
  return bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10);
}

/**
 * Creates the first super admin from ADMIN_EMAIL / ADMIN_PASSWORD when no
 * account with that email exists. An existing admin's password is only
 * replaced when ADMIN_PASSWORD_FORCE_RESET is set; an existing non-admin
 * account is never promoted.
 */
export function ensureAdminAccount(db: Database.Database, config: AppConfig): "created" | "reset" | "unchanged" | "skipped" {
  if (!config.adminEmail || !config.adminPassword) return "skipped";

  const existing = db.prepare("SELECT id, role FROM users WHERE lower(email) = ?").get(config.adminEmail) as
    | { id: number; role: string }
    | undefined;

  if (!existing) {
    db.prepare("INSERT INTO users (email, password, name, role, is_verified) VALUES (?, ?, ?, 'super_admin', 1)").run(
      config.adminEmail,
      bcrypt.hashSync(config.adminPassword, 12),
      "Administrator"
    );
    return "created";
  }

  if (existing.role !== "super_admin") {
    console.warn("[accounts] ADMIN_EMAIL belongs to a non-admin account; it was left unchanged.");
    return "unchanged";
  }

  if (config.adminPasswordForceReset) {
    db.prepare("UPDATE users SET password = ?, is_verified = 1 WHERE id = ?").run(bcrypt.hashSync(config.adminPassword, 12), existing.id);
    bumpTokenVersion(db, existing.id);
    return "reset";
  }
  return "unchanged";
}

/** Accounts that earlier versions of the seed code created with passwords that are public in the repository's history. */
const LEGACY_SEED_EMAILS = [
  "admin@automarket.com",
  "info@unitedmotors-eg.com",
  "sales@alnasrauto-eg.com",
  "contact@rotanamotors-eg.com",
  "info@alexandria-auto-eg.com",
];

const LEGACY_REVOKED_KEY = "legacy_seed_credentials_revoked";

/**
 * Production only, once per database: replaces the password of every legacy
 * seed account with an unusable one and ends their sessions. The accounts,
 * their dealers and their listings are kept. The admin regains access through
 * ADMIN_EMAIL / ADMIN_PASSWORD (with ADMIN_PASSWORD_FORCE_RESET if the email
 * is the legacy one).
 */
export function revokeLegacySeedCredentials(db: Database.Database, config: AppConfig): number {
  if (!config.isProduction) return 0;

  db.exec("CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT)");
  const done = db.prepare("SELECT value FROM app_meta WHERE key = ?").get(LEGACY_REVOKED_KEY);
  if (done) return 0;

  let revoked = 0;
  const run = db.transaction(() => {
    for (const email of LEGACY_SEED_EMAILS) {
      const user = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(email) as { id: number } | undefined;
      if (!user) continue;
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(unusablePasswordHash(), user.id);
      bumpTokenVersion(db, user.id);
      revoked++;
    }
    db.prepare("INSERT INTO app_meta (key, value) VALUES (?, ?)").run(LEGACY_REVOKED_KEY, new Date().toISOString());
  });
  run();
  return revoked;
}

/**
 * Express 4 does not catch rejected promises from async handlers; on current
 * Node versions an unhandled rejection terminates the process. This walks an
 * app/router stack and makes every route handler forward its errors to
 * `next`, so one bad request can never take the server down.
 */
export function makeAsyncSafe(router: any) {
  const stack: any[] = router?.stack || [];
  for (const layer of stack) {
    if (layer.route?.stack) {
      for (const routeLayer of layer.route.stack) wrapLayer(routeLayer);
    } else if (layer.handle?.stack) {
      makeAsyncSafe(layer.handle);
    }
  }
}

function wrapLayer(layer: any) {
  const original = layer.handle;
  if (typeof original !== "function" || original.length > 3 || original.__asyncSafe) return;
  const wrapped = function (this: unknown, req: any, res: any, next: any) {
    try {
      const result = original.call(this, req, res, next);
      if (result && typeof result.catch === "function") result.catch(next);
    } catch (err) {
      next(err);
    }
  };
  (wrapped as any).__asyncSafe = true;
  layer.handle = wrapped;
}
