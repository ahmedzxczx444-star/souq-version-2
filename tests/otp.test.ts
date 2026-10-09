// OTP rules: correct code works once, wrong codes are counted and capped,
// expired codes are rejected. Runs against an in-memory database.
import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { initOtpService, verifyOtp, clearExpiredOtps } from "../services/otpService";

const db = new Database(":memory:");
initOtpService(db);

function storeOtp(email: string, code: string, expiresInMs: number) {
  db.prepare("DELETE FROM otp_codes WHERE email = ?").run(email);
  db.prepare(
    "INSERT INTO otp_codes (email, purpose, otp_hash, otp_expires_at, otp_attempts, otp_resend_count, last_sent_at) VALUES (?, 'register', ?, ?, 0, 0, ?)"
  ).run(email, bcrypt.hashSync(code, 4), new Date(Date.now() + expiresInMs).toISOString(), new Date().toISOString());
}

test("a correct code verifies exactly once", async () => {
  storeOtp("once@test.invalid", "123456", 60_000);
  assert.deepEqual(await verifyOtp("once@test.invalid", "register", "123456"), { success: true });
  const again = await verifyOtp("once@test.invalid", "register", "123456");
  assert.equal(again.success, false, "the code must not be reusable");
});

test("a code for one purpose does not verify another", async () => {
  storeOtp("purpose@test.invalid", "123456", 60_000);
  const res = await verifyOtp("purpose@test.invalid", "forgot_password", "123456");
  assert.equal(res.success, false);
});

test("an expired code is rejected and removed", async () => {
  storeOtp("expired@test.invalid", "123456", -1_000);
  const res = await verifyOtp("expired@test.invalid", "register", "123456");
  assert.equal(res.success, false);
  assert.match(res.error ?? "", /expired/i);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM otp_codes WHERE email = ?").get("expired@test.invalid").c, 0);
});

test("wrong codes are limited to five attempts, after which even the right code fails", async () => {
  storeOtp("attempts@test.invalid", "123456", 60_000);
  for (let i = 0; i < 4; i++) {
    const res = await verifyOtp("attempts@test.invalid", "register", "000000");
    assert.equal(res.success, false);
    assert.match(res.error ?? "", /attempt/i);
  }
  const fifth = await verifyOtp("attempts@test.invalid", "register", "000000");
  assert.match(fifth.error ?? "", /Too many incorrect attempts/);
  const afterLock = await verifyOtp("attempts@test.invalid", "register", "123456");
  assert.equal(afterLock.success, false, "the code is destroyed once attempts are exhausted");
});

test("periodic cleanup removes only expired codes", () => {
  storeOtp("keep@test.invalid", "111111", 60_000);
  db.prepare(
    "INSERT INTO otp_codes (email, purpose, otp_hash, otp_expires_at, otp_attempts, otp_resend_count, last_sent_at) VALUES ('old@test.invalid', 'register', 'x', ?, 0, 0, ?)"
  ).run(new Date(Date.now() - 5_000).toISOString(), new Date().toISOString());
  clearExpiredOtps();
  assert.equal(db.prepare("SELECT COUNT(*) c FROM otp_codes WHERE email = 'old@test.invalid'").get().c, 0);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM otp_codes WHERE email = 'keep@test.invalid'").get().c, 1);
});
