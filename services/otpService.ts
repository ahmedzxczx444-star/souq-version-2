// Reusable OTP service for registration, forgot-password, and change-email flows.
// Never store or expose the plain OTP or its hash outside this module.
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "./emailService";

export type OtpPurpose = "register" | "forgot_password" | "change_email";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_SENDS_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

let db: any;

export function initOtpService(database: any) {
  db = database;

  db.exec(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      purpose TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      otp_expires_at DATETIME NOT NULL,
      otp_attempts INTEGER DEFAULT 0,
      otp_resend_count INTEGER DEFAULT 0,
      last_sent_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(email, purpose)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS otp_send_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      ip TEXT NOT NULL,
      purpose TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function generateOtp(): string {
  // Cryptographically secure random 6-digit numeric code (000000-999999).
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

function cleanupExpired(email: string, purpose: OtpPurpose) {
  db.prepare("DELETE FROM otp_codes WHERE email = ? AND purpose = ? AND otp_expires_at < ?")
    .run(email, purpose, new Date().toISOString());
}

function countRecentSends(email: string, ip: string): { emailCount: number; ipCount: number } {
  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const emailCount = (db.prepare("SELECT COUNT(*) as c FROM otp_send_log WHERE email = ? AND created_at > ?").get(email, since) as any).c;
  const ipCount = (db.prepare("SELECT COUNT(*) as c FROM otp_send_log WHERE ip = ? AND created_at > ?").get(ip, since) as any).c;
  return { emailCount, ipCount };
}

export interface SendOtpResult {
  success: boolean;
  error?: string;
  cooldownSeconds?: number;
}

/**
 * Generates, hashes, stores, and emails a fresh OTP for the given email + purpose.
 * Used for both the initial send and every resend — there is only one send path.
 */
export async function sendOtp(email: string, purpose: OtpPurpose, ip: string, name?: string): Promise<SendOtpResult> {
  cleanupExpired(email, purpose);

  const { emailCount, ipCount } = countRecentSends(email, ip);
  if (emailCount >= MAX_SENDS_PER_HOUR) {
    return { success: false, error: "Too many verification codes requested for this email. Please try again later." };
  }
  if (ipCount >= MAX_SENDS_PER_HOUR) {
    return { success: false, error: "Too many verification codes requested from this network. Please try again later." };
  }

  const existing = db.prepare("SELECT * FROM otp_codes WHERE email = ? AND purpose = ?").get(email, purpose) as any;
  if (existing) {
    const elapsed = Date.now() - new Date(existing.last_sent_at).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      return {
        success: false,
        error: "Please wait before requesting another code.",
        cooldownSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000),
      };
    }
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE otp_codes
      SET otp_hash = ?, otp_expires_at = ?, otp_attempts = 0, otp_resend_count = otp_resend_count + 1, last_sent_at = ?
      WHERE id = ?
    `).run(otpHash, expiresAt, now, existing.id);
  } else {
    db.prepare(`
      INSERT INTO otp_codes (email, purpose, otp_hash, otp_expires_at, otp_attempts, otp_resend_count, last_sent_at)
      VALUES (?, ?, ?, ?, 0, 0, ?)
    `).run(email, purpose, otpHash, expiresAt, now);
  }

  db.prepare("INSERT INTO otp_send_log (email, ip, purpose) VALUES (?, ?, ?)").run(email, ip, purpose);

  try {
    await sendOtpEmail(email, otp, name);
  } catch (e) {
    console.error("Failed to send OTP email:", e);
    return { success: false, error: "Failed to send verification email. Please try again." };
  }

  return { success: true };
}

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
}

export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<VerifyOtpResult> {
  const row = db.prepare("SELECT * FROM otp_codes WHERE email = ? AND purpose = ?").get(email, purpose) as any;

  if (!row) {
    return { success: false, error: "No verification code found. Please request a new one." };
  }

  if (new Date(row.otp_expires_at) < new Date()) {
    db.prepare("DELETE FROM otp_codes WHERE id = ?").run(row.id);
    return { success: false, error: "Verification code has expired. Please request a new one." };
  }

  if (row.otp_attempts >= MAX_ATTEMPTS) {
    db.prepare("DELETE FROM otp_codes WHERE id = ?").run(row.id);
    return { success: false, error: "Too many incorrect attempts. Please request a new code." };
  }

  const isMatch = await bcrypt.compare(code, row.otp_hash);
  if (!isMatch) {
    const newAttempts = row.otp_attempts + 1;
    if (newAttempts >= MAX_ATTEMPTS) {
      db.prepare("DELETE FROM otp_codes WHERE id = ?").run(row.id);
      return { success: false, error: "Too many incorrect attempts. Please request a new code." };
    }
    db.prepare("UPDATE otp_codes SET otp_attempts = ? WHERE id = ?").run(newAttempts, row.id);
    return { success: false, error: `Incorrect code. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.` };
  }

  // Delete OTP immediately after a successful verification — never reused.
  db.prepare("DELETE FROM otp_codes WHERE id = ?").run(row.id);
  return { success: true };
}

/**
 * Periodic cleanup of expired OTPs across all emails/purposes (defense in depth
 * alongside the per-request cleanup already done in sendOtp).
 */
export function clearExpiredOtps() {
  db.prepare("DELETE FROM otp_codes WHERE otp_expires_at < ?").run(new Date().toISOString());
}
