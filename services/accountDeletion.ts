// Account deletion: what is erased, what is kept, and the uploaded files that
// go with it. Used by the in-app delete (POST /api/auth/delete-account) and
// the public web request (POST /api/account/delete-request).
//
// Policy (keep the privacy policy in sync):
//   Removed for every account
//     - favourites, follows, ratings, reel likes, notifications, blocks
//     - verification codes and the verification-email log for the address
//     - name, email and password (the row is anonymised and can never sign in)
//     - delivery address and notes on the user's part orders, notes on pre-orders
//     - legacy conversations started by the user and messages they sent
//   Additionally for dealer accounts
//     - showroom details (name, logo, phone, WhatsApp, address, location, description)
//     - car listings are hidden and their photos removed (rows stay so buyers'
//       order and warranty history keeps its references)
//     - reels and their videos are deleted
//     - spare parts are withdrawn and their photos removed
//     - branches, employees, service centres, offers, warranties,
//       warehouses, shipments, followers and ratings of the showroom
//   Kept
//     - part orders and pre-orders (needed by the other party), with the
//       deleted side shown as "Deleted user" / "Deleted dealer"
//     - content reports, for moderation records
//     - activity log entries, with their details erased
import fs from "fs";
import path from "path";
import type Database from "better-sqlite3";
import { bumpTokenVersion, unusablePasswordHash } from "./accounts";

const UPLOADED_FILE = /^\/uploads\/(cars|reels|parts)\/([A-Za-z0-9._-]+)$/;

/** Absolute path of a file this server stored under uploadsDir, or null. */
export function uploadedFilePath(uploadsDir: string, url: unknown): string | null {
  if (typeof url !== "string") return null;
  const m = UPLOADED_FILE.exec(url);
  return m ? path.join(uploadsDir, m[1], m[2]) : null;
}

function imageList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function tableExists(db: Database.Database, name: string): boolean {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

export interface ErasureResult {
  dealerId: number | null;
  removedFiles: string[];
}

/**
 * Erases the account in one transaction, then deletes the uploaded files that
 * belonged to it. Callers must have verified the user's identity first.
 */
export function eraseAccount(db: Database.Database, userId: number, uploadsDir: string): ErasureResult {
  const files = new Set<string>();
  let dealerId: number | null = null;

  const run = db.transaction(() => {
    const user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(userId) as { id: number; email: string } | undefined;
    if (!user) return;

    db.prepare("DELETE FROM favorites WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM dealer_follows WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM dealer_ratings WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM reel_likes WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM notifications WHERE user_id = ?").run(userId);
    if (user.email) {
      db.prepare("DELETE FROM otp_codes WHERE email = ?").run(user.email);
      db.prepare("DELETE FROM otp_send_log WHERE email = ?").run(user.email);
    }
    db.prepare("UPDATE activity_log SET details = '' WHERE user_id = ?").run(userId);
    db.prepare("UPDATE orders SET delivery_address = NULL, notes = NULL WHERE buyer_user_id = ?").run(userId);
    db.prepare("UPDATE preorders SET notes = NULL WHERE customer_user_id = ?").run(userId);
    if (tableExists(db, "user_blocks")) {
      db.prepare("DELETE FROM user_blocks WHERE blocker_user_id = ? OR blocked_user_id = ?").run(userId, userId);
    }
    db.prepare("DELETE FROM dealer_employees WHERE user_id = ?").run(userId);
    db.prepare("UPDATE dealer_branches SET manager_user_id = NULL WHERE manager_user_id = ?").run(userId);
    const conversations = db.prepare("SELECT id FROM conversations WHERE user_id = ?").all(userId) as { id: number }[];
    for (const c of conversations) db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(c.id);
    db.prepare("DELETE FROM conversations WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM messages WHERE sender_id = ?").run(userId);

    const dealer = db.prepare("SELECT id, logo FROM dealers WHERE user_id = ?").get(userId) as { id: number; logo: string } | undefined;
    if (dealer) {
      dealerId = dealer.id;
      const logo = uploadedFilePath(uploadsDir, dealer.logo);
      if (logo) files.add(logo);

      const cars = db.prepare("SELECT id, images FROM cars WHERE dealer_id = ?").all(dealer.id) as { id: number; images: string }[];
      for (const car of cars) {
        for (const url of imageList(car.images)) {
          const file = uploadedFilePath(uploadsDir, url);
          if (file) files.add(file);
        }
        db.prepare("DELETE FROM favorites WHERE car_id = ?").run(car.id);
      }
      db.prepare("UPDATE cars SET status = 'hidden', images = '[]' WHERE dealer_id = ?").run(dealer.id);

      const reels = db.prepare("SELECT id, video_url FROM reels WHERE dealer_id = ?").all(dealer.id) as { id: number; video_url: string }[];
      for (const reel of reels) {
        const file = uploadedFilePath(uploadsDir, reel.video_url);
        if (file) files.add(file);
        db.prepare("DELETE FROM reel_likes WHERE reel_id = ?").run(reel.id);
      }
      db.prepare("DELETE FROM reels WHERE dealer_id = ?").run(dealer.id);

      const parts = db.prepare("SELECT id, images FROM parts WHERE dealer_id = ?").all(dealer.id) as { id: number; images: string }[];
      for (const part of parts) {
        for (const url of imageList(part.images)) {
          const file = uploadedFilePath(uploadsDir, url);
          if (file) files.add(file);
        }
      }
      db.prepare("UPDATE parts SET status = 'deleted', images = '[]' WHERE dealer_id = ?").run(dealer.id);

      db.prepare("DELETE FROM dealer_branches WHERE dealer_id = ?").run(dealer.id);
      db.prepare("DELETE FROM dealer_employees WHERE dealer_id = ?").run(dealer.id);
      db.prepare("DELETE FROM service_centers WHERE dealer_id = ?").run(dealer.id);
      db.prepare("DELETE FROM official_offers WHERE dealer_id = ?").run(dealer.id);
      db.prepare("DELETE FROM car_warranties WHERE dealer_id = ?").run(dealer.id);
      const shipmentItems = `SELECT si.id FROM shipment_items si JOIN shipments s ON s.id = si.shipment_id WHERE s.dealer_id = ?`;
      db.prepare(`UPDATE preorders SET shipment_item_id = NULL WHERE shipment_item_id IN (${shipmentItems})`).run(dealer.id);
      db.prepare(`DELETE FROM shipment_items WHERE id IN (${shipmentItems})`).run(dealer.id);
      db.prepare("DELETE FROM shipments WHERE dealer_id = ?").run(dealer.id);
      db.prepare("DELETE FROM warehouses WHERE dealer_id = ?").run(dealer.id);
      db.prepare("DELETE FROM dealer_follows WHERE dealer_id = ?").run(dealer.id);
      db.prepare("DELETE FROM dealer_ratings WHERE dealer_id = ?").run(dealer.id);
      db.prepare(`
        UPDATE dealers
        SET status = 'deleted', name = 'Deleted dealer', logo = '', description = NULL, location = NULL,
            phone = '', whatsapp_number = '', address = NULL, map_location_link = NULL, latitude = NULL, longitude = NULL
        WHERE id = ?
      `).run(dealer.id);
    }

    db.prepare("UPDATE users SET email = ?, name = 'Deleted user', password = ?, is_verified = -1 WHERE id = ?")
      .run(`deleted-${userId}-${Date.now()}@deleted.invalid`, unusablePasswordHash(), userId);
    bumpTokenVersion(db, userId);
  });
  run();

  // Files go after the commit, so a failed transaction never loses media.
  for (const file of files) {
    try {
      fs.unlinkSync(file);
    } catch {
      // Already gone or never written; nothing to keep.
    }
  }
  return { dealerId, removedFiles: [...files] };
}
