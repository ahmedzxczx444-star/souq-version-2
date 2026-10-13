// Startup account maintenance: retiring the legacy seed passwords must never
// undo the administrator setup from ADMIN_EMAIL / ADMIN_PASSWORD, and it must
// leave every other record alone. Runs against in-memory databases.
import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import type { AppConfig } from "../config";
import { bootstrapAccounts } from "../services/accounts";

const LEGACY_ADMIN = "admin@automarket.com";
const LEGACY_DEALER = "info@unitedmotors-eg.com";
const OLD_PASSWORD = "old-public-password";
const NEW_PASSWORD = "a-new-strong-password";

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return { isProduction: true, adminPasswordForceReset: false, ...overrides } as AppConfig;
}

/** A database the way an old deployment left it: seed accounts plus real ones. */
function existingDatabase() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT, name TEXT,
      role TEXT DEFAULT 'user', is_verified INTEGER DEFAULT 0, token_version INTEGER DEFAULT 0);
    CREATE TABLE dealers (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, status TEXT);
    CREATE TABLE cars (id INTEGER PRIMARY KEY AUTOINCREMENT, dealer_id INTEGER, make TEXT);
    CREATE TABLE reels (id INTEGER PRIMARY KEY AUTOINCREMENT, dealer_id INTEGER, video_url TEXT);
  `);
  const addUser = db.prepare("INSERT INTO users (email, password, name, role, is_verified) VALUES (?, ?, ?, ?, 1)");
  const old = bcrypt.hashSync(OLD_PASSWORD, 4);
  addUser.run(LEGACY_ADMIN, old, "Admin", "super_admin");
  const dealerUser = addUser.run(LEGACY_DEALER, old, "United Motors", "dealer").lastInsertRowid;
  addUser.run("buyer@test.invalid", bcrypt.hashSync("buyer-password", 4), "Buyer", "user");
  const dealer = db.prepare("INSERT INTO dealers (user_id, name, status) VALUES (?, 'United Motors', 'approved')").run(dealerUser).lastInsertRowid;
  db.prepare("INSERT INTO cars (dealer_id, make) VALUES (?, 'BMW'), (?, 'Kia')").run(dealer, dealer);
  db.prepare("INSERT INTO reels (dealer_id, video_url) VALUES (?, '/uploads/reels/a.mp4')").run(dealer);
  return db;
}

function user(db: Database.Database, email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
}

function canLogIn(db: Database.Database, email: string, password: string) {
  return bcrypt.compareSync(password, user(db, email).password);
}

function counts(db: Database.Database) {
  return ["users", "dealers", "cars", "reels"].map((t) => (db.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as any).c);
}

test("first production start with the legacy admin email keeps the configured password", () => {
  for (const adminPasswordForceReset of [true, false]) {
    const db = existingDatabase();
    const before = counts(db);
    const result = bootstrapAccounts(db, config({ adminEmail: LEGACY_ADMIN, adminPassword: NEW_PASSWORD, adminPasswordForceReset }));

    assert.deepEqual(result, { admin: "reset", revoked: 2 }, `forceReset=${adminPasswordForceReset}`);
    assert.ok(canLogIn(db, LEGACY_ADMIN, NEW_PASSWORD), "the administrator can sign in with ADMIN_PASSWORD");
    assert.ok(!canLogIn(db, LEGACY_ADMIN, OLD_PASSWORD), "the public seed password no longer works");
    assert.ok(!canLogIn(db, LEGACY_DEALER, OLD_PASSWORD), "other seed passwords are retired");
    assert.equal(user(db, LEGACY_ADMIN).role, "super_admin");
    assert.deepEqual(counts(db), before, "no record is added or removed");
  }
});

test("first production start with a new admin email creates it and retires the legacy admin", () => {
  const db = existingDatabase();
  const [users, dealers, cars, reels] = counts(db);
  const result = bootstrapAccounts(db, config({ adminEmail: "owner@test.invalid", adminPassword: NEW_PASSWORD }));

  assert.deepEqual(result, { admin: "created", revoked: 2 });
  assert.ok(canLogIn(db, "owner@test.invalid", NEW_PASSWORD));
  assert.equal(user(db, "owner@test.invalid").role, "super_admin");
  assert.ok(!canLogIn(db, LEGACY_ADMIN, OLD_PASSWORD));
  assert.ok(!canLogIn(db, LEGACY_ADMIN, NEW_PASSWORD));
  assert.deepEqual(counts(db), [users + 1, dealers, cars, reels], "only the administrator is added");
});

test("restarts leave the administrator, other users and their data untouched", () => {
  const db = existingDatabase();
  const cfg = config({ adminEmail: LEGACY_ADMIN, adminPassword: NEW_PASSWORD });
  bootstrapAccounts(db, cfg);
  const snapshot = db.prepare("SELECT id, email, password, role, token_version FROM users ORDER BY id").all();
  const before = counts(db);

  for (let restart = 0; restart < 2; restart++) {
    assert.deepEqual(bootstrapAccounts(db, cfg), { admin: "unchanged", revoked: 0 });
  }
  assert.deepEqual(db.prepare("SELECT id, email, password, role, token_version FROM users ORDER BY id").all(), snapshot);
  assert.deepEqual(counts(db), before);
  assert.ok(canLogIn(db, LEGACY_ADMIN, NEW_PASSWORD));
  assert.ok(canLogIn(db, "buyer@test.invalid", "buyer-password"), "ordinary users keep their passwords");
});

test("admin variables added after the first start: new email is created, legacy email needs the force reset", () => {
  const db = existingDatabase();
  assert.deepEqual(bootstrapAccounts(db, config()), { admin: "skipped", revoked: 2 });
  const before = counts(db);

  // Legacy email without the explicit reset: an existing admin's password is not replaced.
  const legacy = { adminEmail: LEGACY_ADMIN, adminPassword: NEW_PASSWORD };
  assert.deepEqual(bootstrapAccounts(db, config(legacy)), { admin: "unchanged", revoked: 0 });
  assert.ok(!canLogIn(db, LEGACY_ADMIN, NEW_PASSWORD));

  assert.deepEqual(bootstrapAccounts(db, config({ ...legacy, adminPasswordForceReset: true })), { admin: "reset", revoked: 0 });
  assert.ok(canLogIn(db, LEGACY_ADMIN, NEW_PASSWORD));
  assert.deepEqual(counts(db), before);

  assert.deepEqual(bootstrapAccounts(db, config({ adminEmail: "owner@test.invalid", adminPassword: NEW_PASSWORD })), { admin: "created", revoked: 0 });
  assert.ok(canLogIn(db, "owner@test.invalid", NEW_PASSWORD));
  assert.ok(canLogIn(db, LEGACY_ADMIN, NEW_PASSWORD), "the earlier administrator is not touched");
});

test("outside production no seed password is retired and an existing admin is not reset", () => {
  const db = existingDatabase();
  const result = bootstrapAccounts(db, config({ isProduction: false, adminEmail: LEGACY_ADMIN, adminPassword: NEW_PASSWORD }));
  assert.deepEqual(result, { admin: "unchanged", revoked: 0 });
  assert.ok(canLogIn(db, LEGACY_ADMIN, OLD_PASSWORD));
});

test("an existing non-admin account is never promoted", () => {
  const db = existingDatabase();
  const result = bootstrapAccounts(db, config({ adminEmail: "buyer@test.invalid", adminPassword: NEW_PASSWORD, adminPasswordForceReset: true }));
  assert.equal(result.admin, "unchanged");
  assert.equal(user(db, "buyer@test.invalid").role, "user");
  assert.ok(canLogIn(db, "buyer@test.invalid", "buyer-password"));
});
