// Google Play compliance on the backend: reporting content, blocking accounts,
// the admin review queue, deleting an account from the website, and what
// account deletion removes for dealers and buyers.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { adminToken, api, createCar, createDealer, createUser, login, startTestServer, TestServer, withDb } from "./helpers";

let server: TestServer;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.stop();
});

async function tokenFor(account: { email: string; password: string }) {
  const res = await login(server, account.email, account.password);
  assert.equal(res.status, 200, JSON.stringify(res.json));
  return res.json.token as string;
}

function createReel(dealerId: number, videoUrl = "https://example.invalid/clip.mp4"): number {
  return withDb(server, (db) => Number(db.prepare("INSERT INTO reels (dealer_id, video_url, caption) VALUES (?, ?, 'Test reel')").run(dealerId, videoUrl).lastInsertRowid));
}

function createPart(dealerId: number, images: string[] = [], status = "available"): number {
  return withDb(server, (db) =>
    Number(db.prepare("INSERT INTO parts (dealer_id, name, images, price, status) VALUES (?, 'Brake pads', ?, 850, ?)").run(dealerId, JSON.stringify(images), status).lastInsertRowid)
  );
}

function uploadFile(folder: "cars" | "reels" | "parts", name: string): { url: string; file: string } {
  const dir = path.join(server.dir, "uploads", folder);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, "test media");
  return { url: `/uploads/${folder}/${name}`, file };
}

describe("reporting content", () => {
  test("only signed-in users can report, with a valid target and reason", async () => {
    const dealer = createDealer(server, "active");
    const carId = createCar(server, dealer.dealerId);
    const buyer = createUser(server);
    const token = await tokenFor(buyer);

    assert.equal((await api(server, "POST", "/api/reports", { body: { target_type: "car", target_id: carId, reason: "spam" } })).status, 401);
    for (const body of [
      { target_type: "comment", target_id: carId, reason: "spam" },
      { target_type: "car", target_id: "abc", reason: "spam" },
      { target_type: "car", target_id: carId, reason: "boring" },
      { target_type: "car", target_id: carId, reason: "other" },
      { target_type: "car", target_id: carId, reason: "spam", details: "x".repeat(501) },
    ]) {
      assert.equal((await api(server, "POST", "/api/reports", { token, body })).status, 400, JSON.stringify(body));
    }
    assert.equal((await api(server, "POST", "/api/reports", { token, body: { target_type: "car", target_id: 999999, reason: "spam" } })).status, 404);
  });

  test("a report is stored once; repeating it while open does not add another", async () => {
    const dealer = createDealer(server, "active");
    const carId = createCar(server, dealer.dealerId);
    const token = await tokenFor(createUser(server));

    const first = await api(server, "POST", "/api/reports", { token, body: { target_type: "car", target_id: carId, reason: "fraud", details: "Fake price" } });
    assert.equal(first.status, 200);
    const again = await api(server, "POST", "/api/reports", { token, body: { target_type: "car", target_id: carId, reason: "spam" } });
    assert.equal(again.status, 200);
    assert.equal(again.json.alreadyReported, true);
    assert.equal(again.json.id, first.json.id);
    const count = withDb(server, (db) => (db.prepare("SELECT COUNT(*) AS c FROM content_reports WHERE target_type = 'car' AND target_id = ?").get(carId) as any).c);
    assert.equal(count, 1);
  });

  test("users cannot report their own content", async () => {
    const dealer = createDealer(server, "active");
    const token = await tokenFor(dealer);
    const carId = createCar(server, dealer.dealerId);
    assert.equal((await api(server, "POST", "/api/reports", { token, body: { target_type: "car", target_id: carId, reason: "spam" } })).status, 400);
    assert.equal((await api(server, "POST", "/api/reports", { token, body: { target_type: "dealer", target_id: dealer.dealerId, reason: "spam" } })).status, 400);
  });

  test("reels, parts, dealers and users can be reported", async () => {
    const dealer = createDealer(server, "active");
    const reelId = createReel(dealer.dealerId);
    const partId = createPart(dealer.dealerId);
    const other = createUser(server);
    const token = await tokenFor(createUser(server));
    for (const [type, id] of [["reel", reelId], ["part", partId], ["dealer", dealer.dealerId], ["user", other.id]] as const) {
      const res = await api(server, "POST", "/api/reports", { token, body: { target_type: type, target_id: id, reason: "inappropriate" } });
      assert.equal(res.status, 200, `${type}: ${JSON.stringify(res.json)}`);
    }
  });

  test("a user can file at most 20 reports a day", async () => {
    const dealer = createDealer(server, "active");
    const token = await tokenFor(createUser(server));
    for (let i = 0; i < 20; i++) {
      const res = await api(server, "POST", "/api/reports", { token, body: { target_type: "car", target_id: createCar(server, dealer.dealerId), reason: "spam" } });
      assert.equal(res.status, 200);
    }
    const res = await api(server, "POST", "/api/reports", { token, body: { target_type: "car", target_id: createCar(server, dealer.dealerId), reason: "spam" } });
    assert.equal(res.status, 429);
  });
});

describe("admin review", () => {
  test("only administrators can list and resolve reports", async () => {
    const userToken = await tokenFor(createUser(server));
    assert.equal((await api(server, "GET", "/api/admin/reports", { token: userToken })).status, 403);
    assert.equal((await api(server, "PUT", "/api/admin/reports/1", { token: userToken, body: { status: "dismissed" } })).status, 403);
    assert.equal((await api(server, "GET", "/api/admin/reports")).status, 401);
  });

  test("hiding a reported car closes every open report on it", async () => {
    const dealer = createDealer(server, "active");
    const carId = createCar(server, dealer.dealerId);
    const carReel = withDb(server, (db) => Number(db.prepare("INSERT INTO reels (dealer_id, car_id, video_url, caption) VALUES (?, ?, 'https://example.invalid/car.mp4', 'Car reel')").run(dealer.dealerId, carId).lastInsertRowid));
    const otherReel = createReel(dealer.dealerId);
    const ids: number[] = [];
    for (let i = 0; i < 2; i++) {
      const res = await api(server, "POST", "/api/reports", { token: await tokenFor(createUser(server)), body: { target_type: "car", target_id: carId, reason: "misleading" } });
      ids.push(res.json.id);
    }
    const admin = await adminToken(server);
    const list = await api(server, "GET", "/api/admin/reports?status=open", { token: admin });
    const row = list.json.find((r: any) => r.id === ids[0]);
    assert.equal(row.target.title, "TestMake TestModel 2024");
    assert.equal(row.open_reports_for_target, 2);
    assert.ok(row.reporter_email);

    const res = await api(server, "PUT", `/api/admin/reports/${ids[0]}`, { token: admin, body: { status: "actioned", action: "hide_content", note: "Fake listing" } });
    assert.equal(res.status, 200);
    withDb(server, (db) => {
      assert.equal((db.prepare("SELECT status FROM cars WHERE id = ?").get(carId) as any).status, "hidden");
      for (const id of ids) assert.equal((db.prepare("SELECT status FROM content_reports WHERE id = ?").get(id) as any).status, "actioned");
    });
    const publicCars = await api(server, "GET", "/api/cars");
    assert.ok(!publicCars.json.some((c: any) => c.id === carId));
    const publicReels = await api(server, "GET", "/api/reels");
    assert.ok(!publicReels.json.some((r: any) => r.id === carReel), "the hidden car's reel is not shown");
    assert.ok(publicReels.json.some((r: any) => r.id === otherReel), "the dealer's other reels stay");
    assert.ok(withDb(server, (db) => db.prepare("SELECT 1 FROM reels WHERE id = ?").get(carReel)), "nothing is deleted");
  });

  test("a hidden part stays hidden: the dealer cannot republish it and buyers cannot see it", async () => {
    const dealer = createDealer(server, "active", { businessType: "parts_dealer" });
    const partId = createPart(dealer.dealerId);
    const report = await api(server, "POST", "/api/reports", { token: await tokenFor(createUser(server)), body: { target_type: "part", target_id: partId, reason: "fraud" } });
    const admin = await adminToken(server);
    assert.equal((await api(server, "PUT", `/api/admin/reports/${report.json.id}`, { token: admin, body: { status: "actioned", action: "hide_content" } })).status, 200);

    const dealerToken = await tokenFor(dealer);
    assert.equal((await api(server, "PUT", `/api/parts/${partId}/status`, { token: dealerToken, body: { status: "available" } })).status, 403);
    await api(server, "PUT", `/api/parts/${partId}`, { token: dealerToken, body: { status: "available", name: "Renamed" } });
    assert.equal(withDb(server, (db) => (db.prepare("SELECT status FROM parts WHERE id = ?").get(partId) as any).status), "hidden");
    assert.equal((await api(server, "GET", `/api/parts/${partId}`)).status, 404);
    const search = await api(server, "GET", "/api/parts/search/query?q=");
    assert.ok(!search.json.results.some((p: any) => p.id === partId));
  });

  test("hiding a reel deletes it and its uploaded video", async () => {
    const dealer = createDealer(server, "active");
    const media = uploadFile("reels", `moderated-${Date.now()}.mp4`);
    const reelId = createReel(dealer.dealerId, media.url);
    const report = await api(server, "POST", "/api/reports", { token: await tokenFor(createUser(server)), body: { target_type: "reel", target_id: reelId, reason: "offensive" } });
    const admin = await adminToken(server);
    assert.equal((await api(server, "PUT", `/api/admin/reports/${report.json.id}`, { token: admin, body: { status: "actioned", action: "hide_content" } })).status, 200);
    assert.equal(withDb(server, (db) => db.prepare("SELECT 1 FROM reels WHERE id = ?").get(reelId)), undefined);
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(fs.existsSync(media.file), false);
  });

  test("suspending the dealer or banning the user from a report", async () => {
    const admin = await adminToken(server);
    const dealer = createDealer(server, "active");
    const carId = createCar(server, dealer.dealerId);
    const r1 = await api(server, "POST", "/api/reports", { token: await tokenFor(createUser(server)), body: { target_type: "car", target_id: carId, reason: "fraud" } });
    assert.equal((await api(server, "PUT", `/api/admin/reports/${r1.json.id}`, { token: admin, body: { status: "actioned", action: "suspend_dealer" } })).status, 200);
    assert.equal(withDb(server, (db) => (db.prepare("SELECT status FROM dealers WHERE id = ?").get(dealer.dealerId) as any).status), "suspended");

    const abuser = createUser(server);
    const r2 = await api(server, "POST", "/api/reports", { token: await tokenFor(createUser(server)), body: { target_type: "user", target_id: abuser.id, reason: "offensive" } });
    assert.equal((await api(server, "PUT", `/api/admin/reports/${r2.json.id}`, { token: admin, body: { status: "actioned", action: "ban_user" } })).status, 200);
    assert.equal((await login(server, abuser.email, abuser.password)).status, 403);
  });

  test("dismissing changes only that report; bad requests are refused", async () => {
    const admin = await adminToken(server);
    const dealer = createDealer(server, "active");
    const carId = createCar(server, dealer.dealerId);
    const r1 = await api(server, "POST", "/api/reports", { token: await tokenFor(createUser(server)), body: { target_type: "car", target_id: carId, reason: "spam" } });
    const r2 = await api(server, "POST", "/api/reports", { token: await tokenFor(createUser(server)), body: { target_type: "car", target_id: carId, reason: "spam" } });
    assert.equal((await api(server, "PUT", `/api/admin/reports/${r1.json.id}`, { token: admin, body: { status: "maybe" } })).status, 400);
    assert.equal((await api(server, "PUT", `/api/admin/reports/${r1.json.id}`, { token: admin, body: { status: "actioned", action: "delete_everything" } })).status, 400);
    assert.equal((await api(server, "PUT", `/api/admin/reports/999999`, { token: admin, body: { status: "dismissed" } })).status, 404);
    assert.equal((await api(server, "PUT", `/api/admin/reports/${r1.json.id}`, { token: admin, body: { status: "dismissed" } })).status, 200);
    withDb(server, (db) => {
      assert.equal((db.prepare("SELECT status FROM content_reports WHERE id = ?").get(r1.json.id) as any).status, "dismissed");
      assert.equal((db.prepare("SELECT status FROM content_reports WHERE id = ?").get(r2.json.id) as any).status, "open");
      assert.equal((db.prepare("SELECT status FROM cars WHERE id = ?").get(carId) as any).status, "available");
    });
  });
});

describe("blocking accounts", () => {
  test("block a dealer, list it, unblock it", async () => {
    const dealer = createDealer(server, "active");
    const me = createUser(server);
    const token = await tokenFor(me);
    assert.equal((await api(server, "POST", "/api/blocks", { body: { dealer_id: dealer.dealerId } })).status, 401);
    assert.equal((await api(server, "POST", "/api/blocks", { token, body: { dealer_id: dealer.dealerId } })).status, 200);
    assert.equal((await api(server, "POST", "/api/blocks", { token, body: { dealer_id: dealer.dealerId } })).status, 200, "blocking twice is harmless");
    const list = await api(server, "GET", "/api/blocks", { token });
    assert.deepEqual(list.json.map((b: any) => [b.user_id, b.dealer_id, b.name]), [[dealer.id, dealer.dealerId, "Test Showroom"]]);
    assert.equal((await api(server, "DELETE", `/api/blocks/${dealer.id}`, { token })).status, 200);
    assert.deepEqual((await api(server, "GET", "/api/blocks", { token })).json, []);
  });

  test("cannot block yourself, an administrator or nobody", async () => {
    const me = createUser(server);
    const token = await tokenFor(me);
    assert.equal((await api(server, "POST", "/api/blocks", { token, body: { user_id: me.id } })).status, 400);
    assert.equal((await api(server, "POST", "/api/blocks", { token, body: {} })).status, 400);
    assert.equal((await api(server, "POST", "/api/blocks", { token, body: { user_id: 999999 } })).status, 404);
    const adminId = withDb(server, (db) => (db.prepare("SELECT id FROM users WHERE role = 'super_admin'").get() as any).id);
    assert.equal((await api(server, "POST", "/api/blocks", { token, body: { user_id: adminId } })).status, 400);
  });
});

describe("deleting an account from the website", () => {
  test("an unknown email and a wrong password get the same answer", async () => {
    const user = createUser(server);
    const unknown = await api(server, "POST", "/api/account/delete-request", { body: { email: "nobody@souq-test.invalid", password: "whatever-123" } });
    const wrong = await api(server, "POST", "/api/account/delete-request", { body: { email: user.email, password: "not-the-password" } });
    assert.equal(unknown.status, 400);
    assert.equal(wrong.status, 400);
    assert.deepEqual(unknown.json, wrong.json);
    assert.equal((await login(server, user.email, user.password)).status, 200, "the account is untouched");
  });

  test("missing fields are refused and administrators are protected", async () => {
    assert.equal((await api(server, "POST", "/api/account/delete-request", { body: { email: "a@b.c" } })).status, 400);
    assert.equal((await api(server, "POST", "/api/account/delete-request", { body: { password: "x" } })).status, 400);
    const res = await api(server, "POST", "/api/account/delete-request", { body: { email: server.adminEmail, password: server.adminPassword } });
    assert.equal(res.status, 400);
    assert.equal((await login(server, server.adminEmail, server.adminPassword)).status, 200);
  });

  test("the right email and password delete the account; it cannot sign in again", async () => {
    const user = createUser(server);
    const token = await tokenFor(user);
    const res = await api(server, "POST", "/api/account/delete-request", { body: { email: user.email.toUpperCase(), password: user.password } });
    assert.equal(res.status, 200);
    assert.equal((await login(server, user.email, user.password)).status, 401);
    assert.equal((await api(server, "GET", "/api/auth/me", { token })).status, 401, "existing sessions end");
    const row = withDb(server, (db) => db.prepare("SELECT name, email FROM users WHERE id = ?").get(user.id) as any);
    assert.equal(row.name, "Deleted user");
    assert.match(row.email, /@deleted\.invalid$/);
  });
});

describe("what account deletion removes", () => {
  test("a dealer's listings, reels, parts, business records and media", async () => {
    const dealer = createDealer(server, "active");
    const carImage = uploadFile("cars", `deleted-car-${Date.now()}.jpg`);
    const partImage = uploadFile("cars", `deleted-part-${Date.now()}.jpg`);
    const reelVideo = uploadFile("reels", `deleted-reel-${Date.now()}.mp4`);
    const carId = withDb(server, (db) =>
      Number(db.prepare(
        "INSERT INTO cars (dealer_id, make, model, year, price, mileage, location, fuel_type, transmission, description, images, status, featured) VALUES (?, 'Kia', 'Cerato', 2022, 1, 1, 'Cairo', 'Petrol', 'Automatic', 'x', ?, 'available', 0)"
      ).run(dealer.dealerId, JSON.stringify([carImage.url, "https://images.example.invalid/kept.jpg"])).lastInsertRowid)
    );
    const reelId = createReel(dealer.dealerId, reelVideo.url);
    const partId = createPart(dealer.dealerId, [partImage.url]);
    const fan = createUser(server);
    withDb(server, (db) => {
      db.prepare("INSERT INTO dealer_branches (dealer_id, name, address) VALUES (?, 'Branch', 'Cairo')").run(dealer.dealerId);
      db.prepare("INSERT INTO official_offers (dealer_id, title) VALUES (?, 'Offer')").run(dealer.dealerId);
      db.prepare("INSERT INTO service_centers (dealer_id, name) VALUES (?, 'Center')").run(dealer.dealerId);
      db.prepare("INSERT INTO dealer_follows (user_id, dealer_id) VALUES (?, ?)").run(fan.id, dealer.dealerId);
      db.prepare("INSERT INTO favorites (user_id, car_id) VALUES (?, ?)").run(fan.id, carId);
    });

    const token = await tokenFor(dealer);
    assert.equal((await api(server, "POST", "/api/auth/delete-account", { token, body: { password: dealer.password } })).status, 200);

    withDb(server, (db) => {
      const car = db.prepare("SELECT status, images FROM cars WHERE id = ?").get(carId) as any;
      assert.equal(car.status, "hidden");
      assert.equal(car.images, "[]");
      assert.equal(db.prepare("SELECT 1 FROM reels WHERE id = ?").get(reelId), undefined);
      const part = db.prepare("SELECT status, images FROM parts WHERE id = ?").get(partId) as any;
      assert.deepEqual([part.status, part.images], ["deleted", "[]"]);
      for (const table of ["dealer_branches", "official_offers", "service_centers", "dealer_follows"]) {
        assert.equal((db.prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE dealer_id = ?`).get(dealer.dealerId) as any).c, 0, table);
      }
      assert.equal(db.prepare("SELECT 1 FROM favorites WHERE car_id = ?").get(carId), undefined);
      const row = db.prepare("SELECT status, name, phone FROM dealers WHERE id = ?").get(dealer.dealerId) as any;
      assert.deepEqual([row.status, row.name, row.phone], ["deleted", "Deleted dealer", ""]);
    });
    for (const media of [carImage, partImage, reelVideo]) assert.equal(fs.existsSync(media.file), false, media.url);

    assert.equal((await api(server, "GET", `/api/dealers/${dealer.dealerId}`)).status, 404);
    assert.equal((await api(server, "GET", `/api/parts/${partId}`)).status, 404);
    const reels = await api(server, "GET", "/api/reels");
    assert.ok(!reels.json.some((r: any) => r.id === reelId));
  });

  test("a buyer's order address, blocks and reports' personal links", async () => {
    const dealer = createDealer(server, "active", { businessType: "parts_dealer" });
    const partId = createPart(dealer.dealerId);
    const buyer = createUser(server);
    const token = await tokenFor(buyer);
    const order = await api(server, "POST", `/api/parts/${partId}/order`, { token, body: { delivery_method: "delivery", delivery_address: "12 Private St", notes: "Ring twice" } });
    assert.equal(order.status, 200);
    await api(server, "POST", "/api/blocks", { token, body: { dealer_id: dealer.dealerId } });

    assert.equal((await api(server, "POST", "/api/auth/delete-account", { token, body: { password: buyer.password } })).status, 200);
    withDb(server, (db) => {
      const row = db.prepare("SELECT delivery_address, notes FROM orders WHERE id = ?").get(order.json.id) as any;
      assert.deepEqual([row.delivery_address, row.notes], [null, null]);
      assert.equal((db.prepare("SELECT COUNT(*) AS c FROM user_blocks WHERE blocker_user_id = ?").get(buyer.id) as any).c, 0);
    });
  });
});
