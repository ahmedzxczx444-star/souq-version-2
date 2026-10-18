// Dealer types are enforced by the API (not just by which dashboard the site
// shows), and users can delete their own account.
import assert from "node:assert/strict";
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
  assert.equal(res.status, 200);
  return res.json.token as string;
}

describe("dealer types", () => {
  const kinds = [
    { label: "single", kind: { category: "single" } },
    { label: "multi_branch", kind: { category: "multi_branch" } },
    { label: "chain", kind: { category: "chain" } },
    { label: "importer", kind: { category: "importer" } },
    { label: "official_agent", kind: { category: "official_agent" } },
    { label: "parts_dealer", kind: { businessType: "parts_dealer" } },
  ] as const;

  // Which dealer types may call each type-specific management endpoint.
  const matrix: Array<{ route: string; allowed: string[] }> = [
    { route: "/api/dealer/branches", allowed: ["multi_branch", "chain"] },
    { route: "/api/dealer/employees", allowed: ["multi_branch", "chain"] },
    { route: "/api/dealer/chain/overview", allowed: ["chain"] },
    { route: "/api/importer/warehouses", allowed: ["importer"] },
    { route: "/api/importer/shipments", allowed: ["importer"] },
    { route: "/api/importer/preorders", allowed: ["importer"] },
    { route: "/api/official/service-centers", allowed: ["official_agent"] },
    { route: "/api/official/offers", allowed: ["official_agent"] },
    { route: "/api/official/warranties", allowed: ["official_agent"] },
    { route: "/api/parts", allowed: ["parts_dealer"] },
    { route: "/api/parts/dealer/stats", allowed: ["parts_dealer"] },
  ];

  test("each type-specific API accepts only its own dealer type", async () => {
    for (const { label, kind } of kinds) {
      const dealer = createDealer(server, "active", kind);
      const token = await tokenFor(dealer);
      for (const { route, allowed } of matrix) {
        const res = await api(server, "GET", route, { token });
        const expected = allowed.includes(label) ? 200 : 403;
        assert.equal(res.status, expected, `${label} -> GET ${route}`);
      }
    }
  });

  test("buyers and guests are refused everywhere", async () => {
    const buyerToken = await tokenFor(createUser(server));
    for (const { route } of matrix) {
      assert.equal((await api(server, "GET", route, { token: buyerToken })).status, 403, `buyer -> ${route}`);
      assert.equal((await api(server, "GET", route)).status, 401, `guest -> ${route}`);
    }
  });

  test("writes follow the same rule (a single showroom cannot create importer or parts records)", async () => {
    const single = await tokenFor(createDealer(server, "active", { category: "single" }));
    assert.equal((await api(server, "POST", "/api/importer/warehouses", { token: single, body: { name: "W" } })).status, 403);
    assert.equal((await api(server, "POST", "/api/official/offers", { token: single, body: { title: "T" } })).status, 403);
    assert.equal((await api(server, "POST", "/api/dealer/branches", { token: single, body: { name: "B", address: "A" } })).status, 403);
    assert.equal((await api(server, "POST", "/api/parts", { token: single, body: { name: "Filter" } })).status, 403);

    const importer = await tokenFor(createDealer(server, "active", { category: "importer" }));
    assert.equal((await api(server, "POST", "/api/importer/warehouses", { token: importer, body: { name: "W" } })).status, 200);
    const multi = await tokenFor(createDealer(server, "active", { category: "multi_branch" }));
    assert.equal((await api(server, "POST", "/api/dealer/branches", { token: multi, body: { name: "B", address: "A" } })).status, 200);
  });

  test("every car-dealer type keeps the shared listing tools; parts dealers keep the public parts pages", async () => {
    for (const category of ["single", "multi_branch", "chain", "importer", "official_agent"]) {
      const token = await tokenFor(createDealer(server, "active", { category }));
      assert.equal((await api(server, "GET", "/api/dealer/cars", { token })).status, 200, category);
      assert.equal((await api(server, "GET", "/api/dealer/stats", { token })).status, 200, category);
      assert.equal((await api(server, "GET", "/api/dealer/profile", { token })).status, 200, category);
    }
    assert.equal((await api(server, "GET", "/api/parts/search/query?q=filter")).status, 200, "public parts search");
  });
});

describe("account deletion", () => {
  test("a buyer can delete their account: data erased, session ended, email free again", async () => {
    const buyer = createUser(server);
    const token = await tokenFor(buyer);
    const carId = (await api(server, "GET", "/api/cars")).json[0].id;
    assert.equal((await api(server, "POST", `/api/favorites/${carId}`, { token })).status, 200);

    assert.equal((await api(server, "POST", "/api/auth/delete-account")).status, 401);
    assert.equal((await api(server, "POST", "/api/auth/delete-account", { token, body: {} })).status, 400);
    assert.equal((await api(server, "POST", "/api/auth/delete-account", { token, body: { password: "wrong-password" } })).status, 400);
    assert.equal((await api(server, "GET", "/api/auth/me", { token })).status, 200, "a wrong password deletes nothing");

    const deleted = await api(server, "POST", "/api/auth/delete-account", { token, body: { password: buyer.password } });
    assert.deepEqual(deleted.json, { success: true });

    assert.equal((await api(server, "GET", "/api/auth/me", { token })).status, 401);
    assert.equal((await login(server, buyer.email, buyer.password)).status, 401, "the old login no longer exists");

    const row = withDb(server, (db) => db.prepare("SELECT email, name, is_verified FROM users WHERE id = ?").get(buyer.id) as any);
    assert.match(row.email, /@deleted\.invalid$/);
    assert.equal(row.name, "Deleted user");
    assert.equal(withDb(server, (db) => (db.prepare("SELECT COUNT(*) c FROM favorites WHERE user_id = ?").get(buyer.id) as any).c), 0);
    assert.equal(withDb(server, (db) => (db.prepare("SELECT COUNT(*) c FROM users WHERE email = ?").get(buyer.email) as any).c), 0);

    // The address can be used for a brand-new registration.
    const again = await api(server, "POST", "/api/auth/register", { body: { accept_terms: true, email: buyer.email, password: "password1", name: "New", role: "user" } });
    assert.equal(again.status, 200);
  });

  test("a dealer's deletion takes the showroom and its listings off the public site", async () => {
    const dealer = createDealer(server, "active");
    const carId = createCar(server, dealer.dealerId);
    const token = await tokenFor(dealer);
    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 200);

    assert.equal((await api(server, "POST", "/api/auth/delete-account", { token, body: { password: dealer.password } })).status, 200);

    assert.equal((await api(server, "GET", `/api/cars/${carId}`)).status, 404);
    assert.equal((await api(server, "GET", `/api/dealers/${dealer.dealerId}`)).status, 404);
    assert.equal((await api(server, "GET", "/api/cars")).json.some((c: any) => c.id === carId), false);
    const stored = withDb(server, (db) => db.prepare("SELECT phone, whatsapp_number, address, status FROM dealers WHERE id = ?").get(dealer.dealerId) as any);
    assert.deepEqual(stored, { phone: "", whatsapp_number: "", address: null, status: "deleted" });
  });

  test("the administrator account cannot be deleted this way", async () => {
    const admin = await adminToken(server);
    const res = await api(server, "POST", "/api/auth/delete-account", { token: admin, body: { password: server.adminPassword } });
    assert.equal(res.status, 400);
    assert.equal((await api(server, "GET", "/api/admin/stats", { token: admin })).status, 200);
  });
});
