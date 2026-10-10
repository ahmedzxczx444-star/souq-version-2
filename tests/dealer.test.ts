// What the dealer dashboard in the mobile app relies on: listing management,
// reels, the dealer profile, parts inventory and parts orders.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { api, createCar, createDealer, createUser, login, startTestServer, TestServer, withDb } from "./helpers";

let server: TestServer;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.stop();
});

async function tokenFor(account: { email: string; password: string }) {
  const res = await login(server, account.email, account.password);
  assert.equal(res.status, 200);
  return res.json.token as string;
}

async function upload(route: string, field: string, file: { name: string; type: string; data: Buffer }, token: string) {
  const form = new FormData();
  form.append(field, new Blob([file.data], { type: file.type }), file.name);
  const res = await fetch(server.baseUrl + route, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  return { status: res.status, json: (await res.json()) as any };
}

const png = { name: "car.png", type: "image/png", data: Buffer.from("89504e470d0a1a0a", "hex") };
const mp4 = { name: "clip.mp4", type: "video/mp4", data: Buffer.from("not really a video") };

const carBody = (images: string[], extra: Record<string, unknown> = {}) => ({
  make: "Toyota", model: "Corolla", year: 2023, price: 900000, mileage: 15000, location: "Cairo",
  fuel_type: "Petrol", transmission: "Automatic", description: "Clean", images, ...extra,
});

describe("listing management", () => {
  test("a dealer adds, lists, edits and deletes their own listing", async () => {
    const dealer = createDealer(server, "active");
    const token = await tokenFor(dealer);

    const uploaded = await upload("/api/cars/upload", "images", png, token);
    assert.equal(uploaded.status, 200);

    const created = await api(server, "POST", "/api/cars", { token, body: carBody(uploaded.json.images) });
    assert.equal(created.status, 200);
    const carId = created.json.id;

    const mine = await api(server, "GET", "/api/dealer/cars", { token });
    assert.deepEqual(mine.json.map((c: any) => c.id), [carId]);
    assert.deepEqual(mine.json[0].images, uploaded.json.images);
    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 200, "visible to buyers");

    const edited = await api(server, "PUT", `/api/cars/${carId}`, { token, body: carBody(uploaded.json.images, { price: 850000, status: "reserved" }) });
    assert.equal(edited.status, 200);
    const after = (await api(server, "GET", "/api/dealer/cars", { token })).json[0];
    assert.equal(after.price, 850000);
    assert.equal(after.status, "reserved");

    // A dealer cannot hide/unhide through the status field: unknown values fall back.
    await api(server, "PUT", `/api/cars/${carId}`, { token, body: carBody(uploaded.json.images, { status: "hidden" }) });
    assert.equal((await api(server, "GET", "/api/dealer/cars", { token })).json[0].status, "available");

    assert.equal((await api(server, "PUT", `/api/cars/${carId}`, { token, body: carBody([]) })).status, 400, "a listing needs a photo");

    assert.equal((await api(server, "DELETE", `/api/cars/${carId}`, { token })).status, 200);
    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 404);
    assert.deepEqual((await api(server, "GET", "/api/dealer/cars", { token })).json, []);
  });

  test("a dealer cannot edit or delete another dealer's listing", async () => {
    const owner = createDealer(server, "active");
    const carId = createCar(server, owner.dealerId);
    const other = await tokenFor(createDealer(server, "active"));
    const buyer = await tokenFor(createUser(server));

    assert.equal((await api(server, "PUT", `/api/cars/${carId}`, { token: other, body: carBody(["/uploads/cars/x.png"]) })).status, 403);
    assert.equal((await api(server, "DELETE", `/api/cars/${carId}`, { token: other })).status, 403);
    assert.equal((await api(server, "DELETE", `/api/cars/${carId}`, { token: buyer })).status, 403);
    assert.equal((await api(server, "DELETE", `/api/cars/${carId}`)).status, 401);
    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 200, "still there");
  });

  test("pending dealers and parts dealers cannot publish car listings", async () => {
    const pending = await tokenFor(createDealer(server, "pending"));
    assert.equal((await api(server, "POST", "/api/cars", { token: pending, body: carBody(["/uploads/cars/x.png"]) })).status, 403);

    const parts = await tokenFor(createDealer(server, "active", { businessType: "parts_dealer" }));
    const refused = await api(server, "POST", "/api/cars", { token: parts, body: carBody(["/uploads/cars/x.png"]) });
    assert.equal(refused.status, 403);
    assert.match(refused.json.error, /dealer type/);
  });

  test("a listing can be created with a video, which becomes the dealer's reel", async () => {
    const dealer = createDealer(server, "active");
    const token = await tokenFor(dealer);
    const video = await upload("/api/reels/upload", "video", mp4, token);
    assert.equal(video.status, 200);

    const created = await api(server, "POST", "/api/cars", { token, body: carBody(["/uploads/cars/x.png"], { video_url: video.json.video_url }) });
    assert.equal(created.status, 200);

    const reels = await api(server, "GET", "/api/dealer/reels", { token });
    assert.equal(reels.json.length, 1);
    assert.equal(reels.json[0].car_id, created.json.id);
    assert.equal(reels.json[0].dealer_id, dealer.dealerId);
    assert.ok((await api(server, "GET", "/api/reels")).json.some((r: any) => r.id === reels.json[0].id), "shown in the public feed");

    const outside = createDealer(server, "active");
    const bad = await api(server, "POST", "/api/cars", {
      token: await tokenFor(outside),
      body: carBody(["/uploads/cars/x.png"], { video_url: "https://evil.example/x.mp4" }),
    });
    assert.equal(bad.status, 400);
    assert.deepEqual(withDb(server, (db) => db.prepare("SELECT id FROM cars WHERE dealer_id = ?").all(outside.dealerId)), []);
  });

  test("deleting a listing also removes its reel, likes and warranty", async () => {
    const agent = createDealer(server, "active", { category: "official_agent" });
    const token = await tokenFor(agent);
    const carId = createCar(server, agent.dealerId);
    assert.equal((await api(server, "POST", "/api/official/warranties", { token, body: { car_id: carId, warranty_type: "Factory", duration_months: 36 } })).status, 200);
    const video = await upload("/api/reels/upload", "video", mp4, token);
    const reel = await api(server, "POST", "/api/reels", { token, body: { video_url: video.json.video_url, caption: "c", car_id: carId } });
    const buyer = await tokenFor(createUser(server));
    assert.equal((await api(server, "POST", `/api/reels/${reel.json.id}/like`, { token: buyer })).status, 200);

    assert.equal((await api(server, "DELETE", `/api/cars/${carId}`, { token })).status, 200);
    assert.deepEqual((await api(server, "GET", "/api/dealer/reels", { token })).json, []);
    assert.deepEqual((await api(server, "GET", "/api/official/warranties", { token })).json, []);
  });
});

describe("reels", () => {
  test("only uploaded videos and the dealer's own cars are accepted", async () => {
    const dealer = createDealer(server, "active");
    const token = await tokenFor(dealer);
    const foreignCar = createCar(server, createDealer(server, "active").dealerId);
    const video = await upload("/api/reels/upload", "video", mp4, token);

    assert.equal((await api(server, "POST", "/api/reels", { token, body: { video_url: "https://evil.example/x.mp4" } })).status, 400);
    assert.equal((await api(server, "POST", "/api/reels", { token, body: { video_url: "/uploads/reels/../../.env" } })).status, 400);
    assert.equal((await api(server, "POST", "/api/reels", { token, body: {} })).status, 400);
    assert.equal((await api(server, "POST", "/api/reels", { token, body: { video_url: video.json.video_url, car_id: foreignCar } })).status, 404);
    assert.equal((await api(server, "POST", "/api/reels", { token, body: { video_url: video.json.video_url, caption: "ok" } })).status, 200);
  });

  test("a dealer lists and deletes only their own reels; the file goes too", async () => {
    const dealer = createDealer(server, "active");
    const token = await tokenFor(dealer);
    const video = await upload("/api/reels/upload", "video", mp4, token);
    const file = path.join(server.dir, "uploads", "reels", path.basename(video.json.video_url));
    const reel = await api(server, "POST", "/api/reels", { token, body: { video_url: video.json.video_url, caption: "mine" } });

    const other = await tokenFor(createDealer(server, "active"));
    assert.deepEqual((await api(server, "GET", "/api/dealer/reels", { token: other })).json, []);
    assert.equal((await api(server, "DELETE", `/api/reels/${reel.json.id}`, { token: other })).status, 403);
    assert.equal((await api(server, "DELETE", `/api/reels/${reel.json.id}`)).status, 401);
    assert.equal((await api(server, "GET", "/api/dealer/reels", { token: await tokenFor(createUser(server)) })).status, 403);
    assert.equal(fs.existsSync(file), true);

    assert.equal((await api(server, "DELETE", `/api/reels/${reel.json.id}`, { token })).status, 200);
    assert.deepEqual((await api(server, "GET", "/api/dealer/reels", { token })).json, []);
    assert.equal((await api(server, "DELETE", `/api/reels/${reel.json.id}`, { token })).status, 404);
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(fs.existsSync(file), false);
  });
});

describe("dealer profile", () => {
  test("the profile tells the app which dashboard to show and can be updated", async () => {
    const dealer = createDealer(server, "active", { category: "importer" });
    const token = await tokenFor(dealer);
    const profile = await api(server, "GET", "/api/dealer/profile", { token });
    assert.equal(profile.json.dealer_category, "importer");
    assert.equal(profile.json.business_type, "car_dealer");
    assert.equal(profile.json.status, "active");

    const body = {
      name: "Renamed", logo: profile.json.logo, description: "d", location: "Giza",
      phone: "+201000000001", whatsapp_number: "+201000000001", address: "Street 1", map_location_link: "",
      branches: [{ name: "Main", address: "Street 1", phone: "+201000000002" }],
    };
    assert.equal((await api(server, "PUT", "/api/dealer/profile", { token, body: { ...body, phone: "12345" } })).status, 400);
    assert.equal((await api(server, "PUT", "/api/dealer/profile", { token, body })).status, 200);
    const updated = (await api(server, "GET", "/api/dealer/profile", { token })).json;
    assert.equal(updated.name, "Renamed");
    assert.equal(updated.branches.length, 1);
    assert.equal(updated.dealer_category, "importer", "the type cannot be changed through the profile");

    assert.equal((await api(server, "GET", "/api/dealer/profile", { token: await tokenFor(createUser(server)) })).status, 403);
  });
});

describe("parts inventory and orders", () => {
  test("a parts dealer manages inventory; other parts dealers cannot touch it", async () => {
    const token = await tokenFor(createDealer(server, "active", { businessType: "parts_dealer" }));
    const created = await api(server, "POST", "/api/parts", {
      token,
      body: {
        name: "Oil filter", part_number: "OF-123", manufacturer: "Bosch", category: "Engine", part_subtype: "new_parts",
        condition_status: "new", price: 450, images: [], delivery_supported: true,
        compatibility: [{ make: "Toyota", model: "Corolla", yearFrom: 2015, yearTo: 2022 }],
      },
    });
    assert.equal(created.status, 200);
    const id = created.json.id;

    const list = (await api(server, "GET", "/api/parts", { token })).json;
    assert.equal(list.length, 1);
    assert.equal(list[0].delivery_supported, true);
    assert.equal(list[0].compatibility[0].make, "Toyota");

    assert.equal((await api(server, "PUT", `/api/parts/${id}`, { token, body: { price: 500 } })).status, 200);
    assert.equal((await api(server, "PUT", `/api/parts/${id}/status`, { token, body: { status: "unavailable" } })).status, 200);
    assert.equal((await api(server, "PUT", `/api/parts/${id}/status`, { token, body: { status: "gone" } })).status, 400);
    const stats = (await api(server, "GET", "/api/parts/dealer/stats", { token })).json;
    assert.equal(stats.totalParts, 1);
    assert.equal(stats.availableParts, 0);

    const rival = await tokenFor(createDealer(server, "active", { businessType: "parts_dealer" }));
    assert.equal((await api(server, "PUT", `/api/parts/${id}`, { token: rival, body: { price: 1 } })).status, 404);
    assert.equal((await api(server, "DELETE", `/api/parts/${id}`, { token: rival })).status, 404);

    assert.equal((await api(server, "DELETE", `/api/parts/${id}`, { token })).status, 200);
    assert.deepEqual((await api(server, "GET", "/api/parts", { token })).json, []);
  });

  test("orders reach the parts dealer, who can update them; car dealers have no orders API", async () => {
    const token = await tokenFor(createDealer(server, "active", { businessType: "parts_dealer" }));
    const part = await api(server, "POST", "/api/parts", { token, body: { name: "Brake pads", price: 900 } });
    const buyer = await tokenFor(createUser(server));
    const order = await api(server, "POST", `/api/parts/${part.json.id}/order`, { token: buyer, body: { delivery_method: "pickup" } });
    assert.equal(order.status, 200);

    const inbox = (await api(server, "GET", "/api/parts/orders", { token })).json;
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].items[0].part_name, "Brake pads");
    assert.equal((await api(server, "PUT", `/api/parts/orders/${order.json.id}/status`, { token, body: { status: "confirmed" } })).status, 200);
    assert.equal((await api(server, "PUT", `/api/parts/orders/${order.json.id}/status`, { token, body: { status: "nope" } })).status, 400);
    assert.equal((await api(server, "DELETE", `/api/parts/${part.json.id}`, { token })).status, 409, "a part with orders is kept");

    const carDealer = await tokenFor(createDealer(server, "active"));
    assert.equal((await api(server, "GET", "/api/parts/orders", { token: carDealer })).status, 403);
    assert.equal((await api(server, "PUT", `/api/parts/orders/${order.json.id}/status`, { token: carDealer, body: { status: "cancelled" } })).status, 403);
    assert.equal((await api(server, "GET", "/api/parts/my-orders", { token: buyer })).json.length, 1, "buyers still see their own orders");
  });
});
