// End-to-end security regression tests against the real server process and a
// throwaway database. One test per defect that was fixed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import jwt from "jsonwebtoken";
import {
  adminToken,
  api,
  createCar,
  createDealer,
  createUser,
  isolatedEnv,
  login,
  makeTempDir,
  spawnServer,
  startTestServer,
  TestServer,
  withDb,
} from "./helpers";

let server: TestServer;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.stop();
});

describe("startup and health", () => {
  test("health endpoint reports ok", async () => {
    const res = await api(server, "GET", "/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.json.status, "ok");
  });

  test("demo seed (opt-in) creates active dealers, public cars and no admin with a known password", async () => {
    const cars = await api(server, "GET", "/api/cars");
    assert.equal(cars.status, 200);
    assert.equal(cars.json.length, 10);
    const dealers = await api(server, "GET", "/api/dealers");
    assert.equal(dealers.json.length, 4);

    const legacyAdmin = withDb(server, (db) => db.prepare("SELECT id FROM users WHERE email = 'admin@automarket.com'").get());
    assert.equal(legacyAdmin, undefined, "the legacy default admin is no longer created");

    // None of the passwords that used to be hardcoded in the seed works.
    for (const email of ["admin@automarket.com", "info@unitedmotors-eg.com", "sales@alnasrauto-eg.com"]) {
      for (const guess of ["admin123", "password123", "password", "123456"]) {
        const res = await login(server, email, guess);
        assert.equal(res.status, 401, `${email} must not accept a default password`);
      }
    }
  });

  test("the administrator comes from ADMIN_EMAIL / ADMIN_PASSWORD", async () => {
    const res = await login(server, server.adminEmail, server.adminPassword);
    assert.equal(res.status, 200);
    assert.equal(res.json.user.role, "super_admin");
    const stats = await api(server, "GET", "/api/admin/stats", { token: res.json.token });
    assert.equal(stats.status, 200);
  });
});

describe("registration and login input handling", () => {
  test("nobody can register themselves as an administrator", async () => {
    for (const role of ["super_admin", "admin", "moderator"]) {
      const res = await api(server, "POST", "/api/auth/register", {
        body: { email: `escalate-${role}@souq-test.invalid`, password: "password1", name: "X", role },
      });
      assert.equal(res.status, 400, role);
    }
    const created = withDb(server, (db) => db.prepare("SELECT COUNT(*) c FROM users WHERE email LIKE 'escalate-%'").get() as any);
    assert.equal(created.c, 0);
  });

  test("a normal registration still answers with the existing contract", async () => {
    const res = await api(server, "POST", "/api/auth/register", {
      body: { email: "buyer@souq-test.invalid", password: "password1", name: "Buyer", role: "user" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.equal(res.json.requiresOtpVerification, true);
    assert.equal(res.json.email, "buyer@souq-test.invalid");

    // Not verified yet: login is refused and points at OTP verification.
    const attempt = await login(server, "buyer@souq-test.invalid", "password1");
    assert.equal(attempt.status, 403);
    assert.equal(attempt.json.requiresOtpVerification, true);
  });

  test("malformed login bodies get a 4xx and never crash the server", async () => {
    const bodies: unknown[] = [{}, { email: 5, password: 5 }, { email: ["a@b.co"], password: {} }, { email: null }, []];
    for (const body of bodies) {
      const res = await api(server, "POST", "/api/auth/login", { body });
      assert.ok(res.status >= 400 && res.status < 500, `${JSON.stringify(body)} -> ${res.status}`);
    }
    for (const route of ["/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/verify-otp", "/api/auth/send-otp"]) {
      const res = await api(server, "POST", route, { body: { email: { $gt: "" }, password: 1, otp: [], purpose: {} } });
      assert.ok(res.status < 500, `${route} -> ${res.status}`);
    }
    const health = await api(server, "GET", "/api/health");
    assert.equal(health.status, 200, "server is still running");
  });

  test("invalid JSON is answered as JSON without internals", async () => {
    const res = await api(server, "POST", "/api/auth/login", { rawBody: "{not json" });
    assert.equal(res.status, 400);
    assert.equal(res.json.error, "Invalid JSON body");
    assert.equal(JSON.stringify(res.json).includes("SyntaxError"), false);
    assert.equal(JSON.stringify(res.json).includes("at "), false);
  });

  test("wrong credentials return 401 with no account detail", async () => {
    const user = createUser(server);
    const res = await login(server, user.email, "definitely-wrong");
    assert.equal(res.status, 401);
    assert.deepEqual(Object.keys(res.json), ["error"]);
  });
});

describe("tokens", () => {
  test("a token signed with the old hardcoded secret is rejected", async () => {
    const user = createUser(server);
    for (const legacySecret of ["super-secret-key", "your-super-secret-key", "secret"]) {
      const forged = jwt.sign({ id: user.id, email: user.email, role: "super_admin" }, legacySecret, { expiresIn: "1h" });
      const res = await api(server, "GET", "/api/admin/users", { token: forged });
      assert.equal(res.status, 401, legacySecret);
    }
  });

  test("the role in the token is not trusted: admin routes need a real admin", async () => {
    const user = createUser(server);
    const session = await login(server, user.email, user.password);
    assert.equal(session.status, 200);
    for (const [method, route] of [
      ["GET", "/api/admin/users"],
      ["GET", "/api/admin/stats"],
      ["PUT", "/api/admin/cars/1/hide"],
      ["DELETE", "/api/admin/cars/1"],
      ["PUT", "/api/admin/dealers/1/approve"],
      ["PUT", `/api/admin/users/${user.id}/ban`],
    ] as const) {
      const res = await api(server, method, route, { token: session.json.token });
      assert.equal(res.status, 403, `${method} ${route}`);
      const anonymous = await api(server, method, route);
      assert.equal(anonymous.status, 401, `${method} ${route} without a token`);
    }
  });

  test("logout-all ends existing sessions", async () => {
    const user = createUser(server);
    const first = await login(server, user.email, user.password);
    const token = first.json.token;
    assert.equal((await api(server, "GET", "/api/auth/me", { token })).status, 200);

    assert.equal((await api(server, "POST", "/api/auth/logout-all", { token })).status, 200);
    assert.equal((await api(server, "GET", "/api/auth/me", { token })).status, 401);

    const second = await login(server, user.email, user.password);
    assert.equal(second.status, 200);
    assert.equal((await api(server, "GET", "/api/auth/me", { token: second.json.token })).status, 200);
  });

  test("a deleted account's token stops working", async () => {
    const user = createUser(server);
    const session = await login(server, user.email, user.password);
    withDb(server, (db) => {
      db.prepare("DELETE FROM activity_log WHERE user_id = ?").run(user.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
    });
    assert.equal((await api(server, "GET", "/api/auth/me", { token: session.json.token })).status, 401);
  });

  test("/api/auth/me and the admin user list never expose password hashes", async () => {
    const admin = await adminToken(server);
    const me = await api(server, "GET", "/api/auth/me", { token: admin });
    const users = await api(server, "GET", "/api/admin/users", { token: admin });
    for (const payload of [me.json, users.json]) {
      const text = JSON.stringify(payload);
      assert.equal(text.includes("$2a$") || text.includes("$2b$"), false);
      assert.equal(/"password"/.test(text), false);
    }
  });
});

describe("banned users", () => {
  test("a ban ends the session, blocks login, and cannot be lifted through OTP", async () => {
    const admin = await adminToken(server);
    const user = createUser(server);
    const session = await login(server, user.email, user.password);
    assert.equal(session.status, 200);
    assert.equal((await api(server, "GET", "/api/favorites", { token: session.json.token })).status, 200);

    assert.equal((await api(server, "PUT", `/api/admin/users/${user.id}/ban`, { token: admin })).status, 200);

    const blockedCall = await api(server, "GET", "/api/favorites", { token: session.json.token });
    assert.equal(blockedCall.status, 401, "existing token is refused");
    assert.equal((await api(server, "POST", "/api/favorites/1", { token: session.json.token })).status, 401);

    const blockedLogin = await login(server, user.email, user.password);
    assert.equal(blockedLogin.status, 403);
    assert.equal(blockedLogin.json.token, undefined);
    assert.equal(blockedLogin.json.requiresOtpVerification, undefined, "a banned user is not sent to re-verify");

    // The re-verification path is closed too.
    assert.equal((await api(server, "POST", "/api/auth/send-otp", { body: { email: user.email, purpose: "register" } })).status, 400);
    const reRegister = await api(server, "POST", "/api/auth/register", {
      body: { email: user.email, password: "password1", name: "Again", role: "user" },
    });
    assert.equal(reRegister.status, 400);
    assert.equal(withDb(server, (db) => (db.prepare("SELECT is_verified v FROM users WHERE id = ?").get(user.id) as any).v), -1);
  });

  test("administrators cannot be banned or deleted through the API", async () => {
    const admin = await adminToken(server);
    const adminId = withDb(server, (db) => (db.prepare("SELECT id FROM users WHERE role = 'super_admin'").get() as any).id);
    assert.equal((await api(server, "PUT", `/api/admin/users/${adminId}/ban`, { token: admin })).status, 400);
    assert.equal((await api(server, "DELETE", `/api/admin/users/${adminId}`, { token: admin })).status, 400);
    assert.equal((await api(server, "GET", "/api/admin/stats", { token: admin })).status, 200);
  });
});

describe("dealer approval and suspension", () => {
  test("a pending dealer is not public and cannot publish", async () => {
    const dealer = createDealer(server, "pending");
    const carId = createCar(server, dealer.dealerId);

    const feed = await api(server, "GET", "/api/cars");
    assert.equal(feed.json.some((c: any) => c.id === carId), false);
    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 404);
    assert.equal((await api(server, "GET", `/api/dealers/${dealer.dealerId}`)).status, 404);
    const listed = await api(server, "GET", "/api/dealers");
    assert.equal(listed.json.some((d: any) => d.id === dealer.dealerId), false);

    const session = await login(server, dealer.email, dealer.password);
    assert.equal(session.status, 200, "a pending dealer can sign in to see their status");
    const publish = await api(server, "POST", "/api/cars", {
      token: session.json.token,
      body: { make: "A", model: "B", year: 2024, price: 1, images: ["https://example.invalid/x.jpg"] },
    });
    assert.equal(publish.status, 403);
  });

  test("only an admin approval activates a dealer", async () => {
    const admin = await adminToken(server);
    const dealer = createDealer(server, "pending");
    const carId = createCar(server, dealer.dealerId);

    const self = await login(server, dealer.email, dealer.password);
    assert.equal((await api(server, "PUT", `/api/admin/dealers/${dealer.dealerId}/approve`, { token: self.json.token })).status, 403);
    assert.equal(withDb(server, (db) => (db.prepare("SELECT status s FROM dealers WHERE id = ?").get(dealer.dealerId) as any).s), "pending");

    assert.equal((await api(server, "PUT", `/api/admin/dealers/${dealer.dealerId}/approve`, { token: admin })).status, 200);
    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 200);
    assert.equal((await api(server, "GET", `/api/dealers/${dealer.dealerId}`)).status, 200);
  });

  test("a suspended dealer is locked out, hidden, and cannot undo it by re-verifying", async () => {
    const admin = await adminToken(server);
    const dealer = createDealer(server, "active");
    const carId = createCar(server, dealer.dealerId);
    const session = await login(server, dealer.email, dealer.password);
    assert.equal((await api(server, "GET", "/api/dealer/cars", { token: session.json.token })).status, 200);

    assert.equal((await api(server, "PUT", `/api/admin/dealers/${dealer.dealerId}/suspend`, { token: admin })).status, 200);

    assert.equal((await api(server, "GET", "/api/dealer/cars", { token: session.json.token })).status, 401);
    const blockedLogin = await login(server, dealer.email, dealer.password);
    assert.equal(blockedLogin.status, 403);
    assert.equal(blockedLogin.json.requiresOtpVerification, undefined);
    assert.equal((await api(server, "POST", "/api/auth/send-otp", { body: { email: dealer.email, purpose: "register" } })).status, 400);
    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 404);

    // An admin can reinstate them.
    assert.equal((await api(server, "PUT", `/api/admin/dealers/${dealer.dealerId}/approve`, { token: admin })).status, 200);
    assert.equal((await login(server, dealer.email, dealer.password)).status, 200);
  });
});

describe("admin listing moderation", () => {
  test("hiding a car removes it everywhere public, and the dealer cannot republish it", async () => {
    const admin = await adminToken(server);
    const dealer = createDealer(server, "active");
    const carId = createCar(server, dealer.dealerId);
    const buyer = createUser(server);
    const buyerSession = await login(server, buyer.email, buyer.password);
    assert.equal((await api(server, "POST", `/api/favorites/${carId}`, { token: buyerSession.json.token })).status, 200);

    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 200);
    assert.equal((await api(server, "PUT", `/api/admin/cars/${carId}/hide`, { token: admin })).status, 200);

    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 404);
    assert.equal((await api(server, "GET", "/api/cars")).json.some((c: any) => c.id === carId), false);
    assert.equal((await api(server, "GET", "/api/search?q=TestMake")).json.results.some((c: any) => c.id === carId), false);
    assert.equal((await api(server, "GET", `/api/dealers/${dealer.dealerId}`)).json.cars.some((c: any) => c.id === carId), false);
    assert.equal((await api(server, "GET", "/api/favorites", { token: buyerSession.json.token })).json.some((c: any) => c.id === carId), false);

    // The owner editing the listing (even asking for "available") leaves it hidden.
    const dealerSession = await login(server, dealer.email, dealer.password);
    const edit = await api(server, "PUT", `/api/cars/${carId}`, {
      token: dealerSession.json.token,
      body: {
        make: "TestMake", model: "Edited", year: 2024, price: 100000, mileage: 10, location: "Cairo",
        fuel_type: "Petrol", transmission: "Automatic", description: "x", status: "available",
        images: ["https://example.invalid/car.jpg"],
      },
    });
    assert.equal(edit.status, 200);
    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 404);

    // Unhide restores it; hiding something that does not exist is a 404.
    assert.equal((await api(server, "PUT", `/api/admin/cars/${carId}/unhide`, { token: admin })).status, 200);
    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 200);
    assert.equal((await api(server, "PUT", "/api/admin/cars/999999/hide", { token: admin })).status, 404);
  });

  test("an admin can remove a listing; a dealer cannot touch another dealer's", async () => {
    const admin = await adminToken(server);
    const owner = createDealer(server, "active");
    const other = createDealer(server, "active");
    const carId = createCar(server, owner.dealerId);

    const otherSession = await login(server, other.email, other.password);
    assert.equal((await api(server, "DELETE", `/api/cars/${carId}`, { token: otherSession.json.token })).status, 403);
    const edit = await api(server, "PUT", `/api/cars/${carId}`, {
      token: otherSession.json.token,
      body: { make: "X", model: "Y", year: 2024, price: 1, images: ["https://example.invalid/x.jpg"] },
    });
    assert.equal(edit.status, 403);

    assert.equal((await api(server, "DELETE", `/api/admin/cars/${carId}`, { token: admin })).status, 200);
    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 404);
  });

  test("dealers cannot set a listing to an arbitrary status", async () => {
    const dealer = createDealer(server, "active");
    const session = await login(server, dealer.email, dealer.password);
    const created = await api(server, "POST", "/api/cars", {
      token: session.json.token,
      body: { make: "Status", model: "Check", year: 2024, price: 5, status: "hidden", images: ["https://example.invalid/x.jpg"] },
    });
    assert.equal(created.status, 200);
    const stored = withDb(server, (db) => (db.prepare("SELECT status s FROM cars WHERE id = ?").get(created.json.id) as any).s);
    assert.equal(stored, "available");
  });
});

describe("restart and data safety", () => {
  test("a restart keeps pending dealers pending and deletes nothing", async () => {
    const dir = makeTempDir();
    let instance = await startTestServer({ dir });
    const pending = createDealer(instance, "pending");
    createCar(instance, pending.dealerId);
    const member = createUser(instance);
    const before = withDb(instance, (db) => ({
      users: (db.prepare("SELECT COUNT(*) c FROM users").get() as any).c,
      cars: (db.prepare("SELECT COUNT(*) c FROM cars").get() as any).c,
      dealers: (db.prepare("SELECT COUNT(*) c FROM dealers").get() as any).c,
    }));
    await instance.stop();

    instance = await startTestServer({ dir });
    try {
      const afterRestart = withDb(instance, (db) => ({
        users: (db.prepare("SELECT COUNT(*) c FROM users").get() as any).c,
        cars: (db.prepare("SELECT COUNT(*) c FROM cars").get() as any).c,
        dealers: (db.prepare("SELECT COUNT(*) c FROM dealers").get() as any).c,
        pendingStatus: (db.prepare("SELECT status s FROM dealers WHERE id = ?").get(pending.dealerId) as any).s,
      }));
      assert.deepEqual({ users: afterRestart.users, cars: afterRestart.cars, dealers: afterRestart.dealers }, before);
      assert.equal(afterRestart.pendingStatus, "pending");
      assert.equal((await login(instance, member.email, member.password)).status, 200);
    } finally {
      await instance.stop();
    }
  });

  test("a database with members but no listings is never wiped or seeded", async () => {
    const dir = makeTempDir();
    // First run without seeding creates an empty schema.
    let instance = await startTestServer({ dir, env: { SEED_DEMO_DATA: "" } });
    const member = createUser(instance);
    assert.equal((await api(instance, "GET", "/api/cars")).json.length, 0);
    await instance.stop();

    // Second run asks for demo data: the old code deleted every member here.
    instance = await startTestServer({ dir, env: { SEED_DEMO_DATA: "true" } });
    try {
      assert.equal((await login(instance, member.email, member.password)).status, 200, "the member still exists");
      assert.equal((await api(instance, "GET", "/api/cars")).json.length, 0, "no demo data in a database that has members");
    } finally {
      await instance.stop();
    }
  });

  test("production refuses to start without real secrets and creates no database", async () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, "prod.db");
    const { child, output } = spawnServer(
      isolatedEnv({ NODE_ENV: "production", PORT: "0", DATABASE_PATH: dbPath, UPLOADS_DIR: path.join(dir, "uploads") })
    );
    const exitCode: number | null = await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill(); resolve(null); }, 60_000);
      child.once("exit", (code) => { clearTimeout(timer); resolve(code); });
    });
    assert.equal(exitCode, 1);
    assert.match(output(), /JWT_SECRET is required in production/);
    assert.match(output(), /BREVO_API_KEY is required in production/);
    assert.equal(fs.existsSync(dbPath), false);
  });

  test("production with an example JWT secret is refused", async () => {
    const dir = makeTempDir();
    const { child, output } = spawnServer(
      isolatedEnv({
        NODE_ENV: "production",
        PORT: "0",
        DATABASE_PATH: path.join(dir, "prod.db"),
        UPLOADS_DIR: path.join(dir, "uploads"),
        JWT_SECRET: "your-super-secret-key",
        BREVO_API_KEY: "xkeysib-test-value",
        BREVO_SENDER_EMAIL: "no-reply@example.com",
      })
    );
    const exitCode: number | null = await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill(); resolve(null); }, 60_000);
      child.once("exit", (code) => { clearTimeout(timer); resolve(code); });
    });
    assert.equal(exitCode, 1);
    assert.match(output(), /JWT_SECRET must be a random value/);
  });
});

describe("public API compatibility", () => {
  test("car, search, dealer and reel responses keep their shapes", async () => {
    const cars = await api(server, "GET", "/api/cars");
    const car = cars.json[0];
    for (const key of ["id", "dealer_id", "make", "model", "year", "price", "mileage", "location", "images", "status", "featured", "dealer_name", "dealer_logo"]) {
      assert.ok(key in car, `car.${key}`);
    }
    assert.ok(Array.isArray(car.images));
    assert.equal(typeof car.featured, "boolean");

    const detail = await api(server, "GET", `/api/cars/${car.id}`);
    assert.equal(detail.status, 200);
    assert.ok("dealer_phone" in detail.json);

    const search = await api(server, "GET", "/api/search?q=toyota");
    assert.ok(Array.isArray(search.json.results));
    assert.equal(typeof search.json.noExactMatch, "boolean");

    const top = await api(server, "GET", "/api/dealers?type=top");
    assert.ok(top.json.length > 0 && "car_count" in top.json[0] && "reviews_count" in top.json[0]);

    const dealer = await api(server, "GET", `/api/dealers/${top.json[0].id}`);
    assert.ok(Array.isArray(dealer.json.cars) && Array.isArray(dealer.json.branches));

    const reels = await api(server, "GET", "/api/reels");
    assert.equal(reels.status, 200);
    assert.ok(Array.isArray(reels.json));
  });

  test("favorites still toggle for a signed-in buyer", async () => {
    const buyer = createUser(server);
    const session = await login(server, buyer.email, buyer.password);
    const token = session.json.token;
    const carId = (await api(server, "GET", "/api/cars")).json[0].id;

    assert.deepEqual((await api(server, "POST", `/api/favorites/${carId}`, { token })).json, { success: true });
    assert.equal((await api(server, "GET", "/api/favorites", { token })).json.length, 1);
    assert.equal((await api(server, "POST", `/api/favorites/${carId}`, { token })).json.removed, true);
    assert.equal((await api(server, "GET", "/api/favorites", { token })).json.length, 0);
    assert.equal((await api(server, "GET", "/api/favorites")).status, 401);
  });

  test("login keeps returning { token, user }", async () => {
    const buyer = createUser(server);
    const session = await login(server, buyer.email, buyer.password);
    assert.equal(session.status, 200);
    assert.equal(typeof session.json.token, "string");
    assert.deepEqual(Object.keys(session.json.user).sort(), ["dealerId", "email", "id", "name", "role"]);
  });
});
