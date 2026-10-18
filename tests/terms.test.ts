// Terms of Use / Privacy Policy acceptance at registration (Google Play's
// user-generated content policy): the server refuses an account without an
// explicit `accept_terms: true` and records when (server time) and which
// version was accepted. Login and OTP verification are unaffected.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import bcrypt from "bcryptjs";
import { api, createUser, login, startTestServer, TestServer, withDb } from "./helpers";
import { LEGAL_TERMS_VERSION } from "../services/legal";

let server: TestServer;
let counter = 0;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.stop();
});

const buyer = (overrides: Record<string, unknown> = {}) => ({
  email: `terms-buyer-${++counter}@souq-test.invalid`,
  password: "password1",
  name: "Terms Buyer",
  role: "user",
  ...overrides,
});

const dealer = (overrides: Record<string, unknown> = {}) => ({
  email: `terms-dealer-${++counter}@souq-test.invalid`,
  password: "password1",
  name: "Terms Showroom",
  role: "dealer",
  phone: "+201012345678",
  whatsapp_number: "+201012345678",
  branches_count: 1,
  address: "Cairo",
  ...overrides,
});

function account(email: string) {
  return withDb(server, (db) => db.prepare("SELECT id, terms_accepted_at, terms_version FROM users WHERE email = ?").get(email)) as
    | { id: number; terms_accepted_at: string | null; terms_version: string | null }
    | undefined;
}

/** Replaces the code the server stored for this email with a known one. */
function plantOtp(email: string, purpose: string, code: string) {
  withDb(server, (db) => {
    const updated = db
      .prepare("UPDATE otp_codes SET otp_hash = ?, otp_attempts = 0 WHERE email = ? AND purpose = ?")
      .run(bcrypt.hashSync(code, 4), email, purpose);
    assert.equal(updated.changes, 1, "the server stored an OTP for this email");
  });
}

describe("terms acceptance at registration", () => {
  const refused = [
    ["missing", {}],
    ["false", { accept_terms: false }],
    ["the string \"true\"", { accept_terms: "true" }],
    ["the number 1", { accept_terms: 1 }],
    ["null", { accept_terms: null }],
    ["an object", { accept_terms: { value: true } }],
    ["an array", { accept_terms: [true] }],
  ] as const;

  for (const [label, extra] of refused) {
    test(`a buyer registration with acceptance ${label} is refused and no account is created`, async () => {
      const body = buyer(extra);
      const res = await api(server, "POST", "/api/auth/register", { body });
      assert.equal(res.status, 400);
      assert.match(res.json.error, /Terms of Use and Privacy Policy/);
      assert.equal(account(body.email as string), undefined);
    });
  }

  test("a dealer registration without acceptance is refused and no showroom is created", async () => {
    for (const extra of [{}, { accept_terms: false }, { accept_terms: "yes" }]) {
      const body = dealer(extra);
      const res = await api(server, "POST", "/api/auth/register", { body });
      assert.equal(res.status, 400);
      assert.match(res.json.error, /Terms of Use and Privacy Policy/);
      assert.equal(account(body.email as string), undefined);
    }
  });

  test("other validation errors keep their own messages", async () => {
    const res = await api(server, "POST", "/api/auth/register", { body: buyer({ email: "not-an-email" }) });
    assert.equal(res.status, 400);
    assert.equal(res.json.error, "Invalid email format");
  });

  test("explicit true registers a buyer and records the server's time and the policy version", async () => {
    const body = buyer({ accept_terms: true, terms_accepted_at: "1999-01-01 00:00:00", terms_version: "forged" });
    const before = Date.now();
    const res = await api(server, "POST", "/api/auth/register", { body });
    assert.equal(res.status, 200);
    assert.equal(res.json.requiresOtpVerification, true);

    const row = account(body.email as string)!;
    assert.equal(row.terms_version, LEGAL_TERMS_VERSION, "the server's version, not the client's");
    const acceptedAt = Date.parse(row.terms_accepted_at!.replace(" ", "T") + "Z");
    assert.ok(Math.abs(acceptedAt - before) < 60_000, `server timestamp ${row.terms_accepted_at} ignores the client's value`);
  });

  test("explicit true registers a dealer and records acceptance on the account", async () => {
    const body = dealer({ accept_terms: true });
    const res = await api(server, "POST", "/api/auth/register", { body });
    assert.equal(res.status, 200);
    const row = account(body.email as string)!;
    assert.equal(row.terms_version, LEGAL_TERMS_VERSION);
    assert.ok(row.terms_accepted_at);
    assert.ok(withDb(server, (db) => db.prepare("SELECT 1 FROM dealers WHERE user_id = ?").get(row.id)), "the showroom is created");
  });

  test("OTP verification and login work normally for an account that accepted", async () => {
    const body = buyer({ accept_terms: true });
    assert.equal((await api(server, "POST", "/api/auth/register", { body })).status, 200);
    plantOtp(body.email as string, "register", "615204");
    const verified = await api(server, "POST", "/api/auth/verify-otp", { body: { email: body.email, otp: "615204", purpose: "register" } });
    assert.equal(verified.status, 200);
    assert.equal(typeof verified.json.token, "string");
    assert.equal((await login(server, body.email as string, body.password as string)).status, 200);
  });

  test("login and password reset do not ask for acceptance", async () => {
    const existing = createUser(server);
    assert.equal((await login(server, existing.email, existing.password)).status, 200);
    assert.equal((await api(server, "POST", "/api/auth/forgot-password", { body: { email: existing.email } })).status, 200);
  });

  test("accounts created before acceptance was recorded are not marked as accepted", async () => {
    const existing = createUser(server);
    const row = account(existing.email)!;
    assert.equal(row.terms_accepted_at, null);
    assert.equal(row.terms_version, null);
  });
});
