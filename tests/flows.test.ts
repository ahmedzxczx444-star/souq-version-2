// End-to-end user flows against the real server and a throwaway database:
// registration -> OTP -> login, dealer onboarding, uploads, follow / rate,
// reels. No email is sent (the Brevo key is blank in tests); the OTP is
// planted directly in the test database because the real one is only ever
// stored hashed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import bcrypt from "bcryptjs";
import { adminToken, api, createCar, createDealer, createUser, login, startTestServer, TestServer, withDb } from "./helpers";

let server: TestServer;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.stop();
});

function plantOtp(email: string, purpose: string, code: string) {
  withDb(server, (db) => {
    const updated = db
      .prepare("UPDATE otp_codes SET otp_hash = ?, otp_attempts = 0 WHERE email = ? AND purpose = ?")
      .run(bcrypt.hashSync(code, 4), email, purpose);
    assert.equal(updated.changes, 1, "the server stored an OTP for this email");
  });
}

// 1x1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

async function upload(route: string, field: string, files: Array<{ name: string; type: string; data: Buffer }>, token?: string) {
  const form = new FormData();
  for (const file of files) form.append(field, new Blob([file.data], { type: file.type }), file.name);
  const res = await fetch(server.baseUrl + route, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = { nonJson: text.slice(0, 120) }; }
  return { status: res.status, json };
}

describe("registration, OTP and login", () => {
  test("buyer: register -> wrong code -> right code -> session -> login -> logout-all", async () => {
    const email = "flow-buyer@souq-test.invalid";
    const password = "buyer-pass-1";

    const registered = await api(server, "POST", "/api/auth/register", { body: { accept_terms: true, email, password, name: "Flow Buyer", role: "user" } });
    assert.equal(registered.status, 200);
    assert.equal(registered.json.requiresOtpVerification, true);

    assert.equal((await login(server, email, password)).status, 403, "cannot log in before verifying");

    plantOtp(email, "register", "482913");
    const wrong = await api(server, "POST", "/api/auth/verify-otp", { body: { email, otp: "000000", purpose: "register" } });
    assert.equal(wrong.status, 400);

    const verified = await api(server, "POST", "/api/auth/verify-otp", { body: { email, otp: "482913", purpose: "register" } });
    assert.equal(verified.status, 200);
    assert.equal(typeof verified.json.token, "string");
    assert.equal(verified.json.user.role, "user");

    const reuse = await api(server, "POST", "/api/auth/verify-otp", { body: { email, otp: "482913", purpose: "register" } });
    assert.equal(reuse.status, 400, "the code cannot be used twice");

    const me = await api(server, "GET", "/api/auth/me", { token: verified.json.token });
    assert.equal(me.status, 200);
    assert.equal(me.json.email, email);

    const session = await login(server, email, password);
    assert.equal(session.status, 200);

    assert.equal((await api(server, "POST", "/api/auth/logout-all", { token: session.json.token })).status, 200);
    assert.equal((await api(server, "GET", "/api/auth/me", { token: session.json.token })).status, 401);
    assert.equal((await api(server, "GET", "/api/auth/me", { token: verified.json.token })).status, 401);
  });

  test("registering an existing verified email is refused; a pending one is refreshed", async () => {
    const existing = createUser(server);
    const duplicate = await api(server, "POST", "/api/auth/register", {
      body: { accept_terms: true, email: existing.email, password: "password1", name: "Dup", role: "user" },
    });
    assert.equal(duplicate.status, 400);

    const pendingEmail = "flow-pending@souq-test.invalid";
    assert.equal((await api(server, "POST", "/api/auth/register", { body: { accept_terms: true, email: pendingEmail, password: "password1", name: "P", role: "user" } })).status, 200);
    // A second attempt inside the resend cooldown is rate limited, not an error page.
    const again = await api(server, "POST", "/api/auth/register", { body: { accept_terms: true, email: pendingEmail, password: "password2", name: "P", role: "user" } });
    assert.equal(again.status, 429);
    assert.equal(withDb(server, (db) => (db.prepare("SELECT COUNT(*) c FROM users WHERE email = ?").get(pendingEmail) as any).c), 1);
  });

  test("forgot password: reset with the emailed code, old password stops working", async () => {
    const user = createUser(server);
    assert.equal((await api(server, "POST", "/api/auth/forgot-password", { body: { email: user.email } })).status, 200);
    // Unknown addresses get the same answer (no account enumeration).
    assert.equal((await api(server, "POST", "/api/auth/forgot-password", { body: { email: "nobody@souq-test.invalid" } })).status, 200);

    plantOtp(user.email, "forgot_password", "775201");
    const short = await api(server, "POST", "/api/auth/reset-password", { body: { email: user.email, otp: "775201", password: "123" } });
    assert.equal(short.status, 400);
    const reset = await api(server, "POST", "/api/auth/reset-password", { body: { email: user.email, otp: "775201", password: "a-new-password" } });
    assert.equal(reset.status, 200);

    assert.equal((await login(server, user.email, user.password)).status, 401);
    assert.equal((await login(server, user.email, "a-new-password")).status, 200);
  });

  test("dealer: registers as pending, cannot publish until an admin approves", async () => {
    const email = "flow-dealer@souq-test.invalid";
    const registered = await api(server, "POST", "/api/auth/register", {
      body: { accept_terms: true,
        email, password: "dealer-pass-1", name: "Flow Showroom", role: "dealer",
        phone: "+201012345678", whatsapp_number: "+201012345678", branches_count: 1, address: "Cairo",
      },
    });
    assert.equal(registered.status, 200);
    plantOtp(email, "register", "390174");
    const verified = await api(server, "POST", "/api/auth/verify-otp", { body: { email, otp: "390174", purpose: "register" } });
    assert.equal(verified.status, 200);
    assert.equal(verified.json.user.role, "dealer");
    const dealerId = verified.json.user.dealerId;
    assert.ok(dealerId);
    assert.equal(withDb(server, (db) => (db.prepare("SELECT status s FROM dealers WHERE id = ?").get(dealerId) as any).s), "pending");

    const listing = { make: "Flow", model: "Car", year: 2024, price: 500000, mileage: 1, location: "Cairo", images: ["https://example.invalid/a.jpg"] };
    // (Publishing while pending is covered in security.test.ts; a second attempt
    // here would only hit the 10-second add-listing cooldown.)
    assert.equal((await api(server, "GET", `/api/dealers/${dealerId}`)).status, 404, "a pending dealer has no public page");

    const admin = await adminToken(server);
    assert.equal((await api(server, "PUT", `/api/admin/dealers/${dealerId}/approve`, { token: admin })).status, 200);

    const created = await api(server, "POST", "/api/cars", { token: verified.json.token, body: listing });
    assert.equal(created.status, 200);
    assert.equal((await api(server, "GET", `/api/cars/${created.json.id}`)).status, 200);
    assert.ok((await api(server, "GET", "/api/search?q=Flow")).json.results.some((c: any) => c.id === created.json.id));

    // The owner can edit and delete their own listing.
    const edited = await api(server, "PUT", `/api/cars/${created.json.id}`, { token: verified.json.token, body: { ...listing, price: 450000, status: "reserved" } });
    assert.equal(edited.status, 200);
    assert.equal((await api(server, "GET", `/api/cars/${created.json.id}`)).json.status, "reserved");
    assert.equal((await api(server, "DELETE", `/api/cars/${created.json.id}`, { token: verified.json.token })).status, 200);
    assert.equal((await api(server, "GET", `/api/cars/${created.json.id}`)).status, 404);
  });
});

describe("uploads", () => {
  test("car photos: dealers only, images only, stored under the configured uploads folder and served back", async () => {
    const dealer = createDealer(server, "active");
    const dealerSession = await login(server, dealer.email, dealer.password);
    const buyer = createUser(server);
    const buyerSession = await login(server, buyer.email, buyer.password);
    const png = { name: "photo.png", type: "image/png", data: PNG };

    assert.equal((await upload("/api/cars/upload", "images", [png])).status, 401);
    assert.equal((await upload("/api/cars/upload", "images", [png], buyerSession.json.token)).status, 403);

    const ok = await upload("/api/cars/upload", "images", [png, png], dealerSession.json.token);
    assert.equal(ok.status, 200);
    assert.equal(ok.json.images.length, 2);
    for (const url of ok.json.images) {
      assert.match(url, /^\/uploads\/cars\/car-.+\.png$/);
      const served = await fetch(server.baseUrl + url);
      assert.equal(served.status, 200);
      assert.equal(fs.existsSync(path.join(server.dir, "uploads", "cars", path.basename(url))), true, "written to UPLOADS_DIR");
    }

    const script = await upload("/api/cars/upload", "images", [{ name: "x.html", type: "text/html", data: Buffer.from("<script>1</script>") }], dealerSession.json.token);
    assert.equal(script.status, 400);
    const none = await upload("/api/cars/upload", "images", [], dealerSession.json.token);
    assert.equal(none.status, 400);
    const tooMany = await upload("/api/cars/upload", "images", Array.from({ length: 11 }, () => png), dealerSession.json.token);
    assert.equal(tooMany.status, 400);
  });

  test("reel videos: only mp4/mov with a video content type", async () => {
    const dealer = createDealer(server, "active");
    const session = await login(server, dealer.email, dealer.password);
    const fakeVideo = { name: "clip.mp4", type: "video/mp4", data: Buffer.from("not really a video") };

    assert.equal((await upload("/api/reels/upload", "video", [fakeVideo])).status, 401);
    const accepted = await upload("/api/reels/upload", "video", [fakeVideo], session.json.token);
    assert.equal(accepted.status, 200);
    assert.match(accepted.json.video_url, /^\/uploads\/reels\/reel-.+\.mp4$/);

    const disguised = await upload("/api/reels/upload", "video", [{ name: "page.mp4", type: "text/html", data: Buffer.from("<html>") }], session.json.token);
    assert.equal(disguised.status, 400);
    const wrongExt = await upload("/api/reels/upload", "video", [{ name: "clip.exe", type: "video/mp4", data: Buffer.from("x") }], session.json.token);
    assert.equal(wrongExt.status, 400);
  });

  test("upload folders do not serve directory listings or dotfiles", async () => {
    fs.writeFileSync(path.join(server.dir, "uploads", ".secret"), "x");
    assert.notEqual((await fetch(server.baseUrl + "/uploads/.secret")).status, 200);
    const listing = await fetch(server.baseUrl + "/uploads/cars/");
    assert.notEqual(listing.status, 200);
  });
});

describe("dealers and reels", () => {
  test("follow and rate a dealer", async () => {
    const dealer = createDealer(server, "active");
    const buyer = createUser(server);
    const session = await login(server, buyer.email, buyer.password);
    const token = session.json.token;

    assert.equal((await api(server, "POST", `/api/dealers/${dealer.dealerId}/follow`)).status, 401);
    assert.deepEqual((await api(server, "GET", `/api/dealers/${dealer.dealerId}/follow-status`, { token })).json, { followed: false });
    assert.deepEqual((await api(server, "POST", `/api/dealers/${dealer.dealerId}/follow`, { token })).json, { followed: true });
    assert.equal((await api(server, "GET", `/api/dealers/${dealer.dealerId}`)).json.followers_count, 1);
    assert.deepEqual((await api(server, "POST", `/api/dealers/${dealer.dealerId}/follow`, { token })).json, { followed: false });

    assert.equal((await api(server, "POST", `/api/dealers/${dealer.dealerId}/rate`, { token, body: { rating: 9 } })).status, 400);
    assert.equal((await api(server, "POST", `/api/dealers/${dealer.dealerId}/rate`, { token, body: { rating: 4 } })).status, 200);
    const profile = await api(server, "GET", `/api/dealers/${dealer.dealerId}`);
    assert.equal(profile.json.rating, 4);
    assert.equal(profile.json.reviews_count, 1);

    const dealerSession = await login(server, dealer.email, dealer.password);
    const self = await api(server, "POST", `/api/dealers/${dealer.dealerId}/rate`, { token: dealerSession.json.token, body: { rating: 5 } });
    assert.equal(self.status, 403, "a dealer cannot rate their own showroom");
  });

  test("reels: public list, likes need a session and toggle, views count", async () => {
    const reels = await api(server, "GET", "/api/reels");
    assert.equal(reels.status, 200);
    assert.ok(reels.json.length >= 1);
    const reel = reels.json[0];
    for (const key of ["id", "dealer_id", "video_url", "dealer_name", "is_liked"]) assert.ok(key in reel, `reel.${key}`);

    assert.equal((await api(server, "POST", `/api/reels/${reel.id}/like`)).status, 401);
    const buyer = createUser(server);
    const token = (await login(server, buyer.email, buyer.password)).json.token;
    assert.equal((await api(server, "POST", `/api/reels/${reel.id}/like`, { token })).json.liked, true);
    const mine = (await api(server, "GET", "/api/reels", { token })).json.find((r: any) => r.id === reel.id);
    assert.equal(mine.is_liked, 1, "the like is attributed to the signed-in user");
    assert.equal((await api(server, "POST", `/api/reels/${reel.id}/like`, { token })).json.liked, false);

    const before = reel.views ?? 0;
    assert.equal((await api(server, "POST", `/api/reels/${reel.id}/view`)).status, 200);
    const after = (await api(server, "GET", "/api/reels")).json.find((r: any) => r.id === reel.id).views;
    assert.equal(after, before + 1);
  });

  test("a listing's contact details and the dealer page are available to guests", async () => {
    const dealer = createDealer(server, "active");
    const carId = createCar(server, dealer.dealerId);
    const car = await api(server, "GET", `/api/cars/${carId}`);
    assert.equal(car.status, 200);
    assert.equal(car.json.dealer_phone, "+201000000000");
    const page = await api(server, "GET", `/api/dealers/${dealer.dealerId}`);
    assert.equal(page.status, 200);
    assert.equal(page.json.cars.length, 1);
    assert.equal(JSON.stringify(page.json).includes("password"), false);
  });
});
