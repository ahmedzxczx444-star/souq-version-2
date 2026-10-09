// Runtime configuration, resolved once at startup from environment variables.
//
// In production the server refuses to start unless the security-critical
// settings are present and sane — there are no built-in fallback secrets.
import crypto from "crypto";
import path from "path";

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid configuration:\n- ${problems.join("\n- ")}`);
    this.name = "ConfigError";
  }
}

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  isTest: boolean;
  port: number;
  jwtSecret: string;
  /** SQLite file. Point this at a persistent volume in production. */
  databasePath: string;
  /** Root of uploaded media (cars/, reels/, parts/). Persistent volume in production. */
  uploadsDir: string;
  /** Browser origins allowed to call the API cross-origin. Empty = same-origin only. */
  corsOrigins: string[];
  /** Express "trust proxy" setting (needed behind Railway/Render/Fly so rate limits see real IPs). */
  trustProxy: number | boolean;
  authRateLimitMax: number;
  seedDemoData: boolean;
  /** Optional first-admin bootstrap. */
  adminEmail?: string;
  adminPassword?: string;
  adminPasswordForceReset: boolean;
}

/** Values that have appeared in this repository or its examples and must never be used for real. */
const KNOWN_WEAK_SECRETS = new Set([
  "super-secret-key",
  "your-super-secret-key",
  "secret",
  "changeme",
  "change-me",
]);

const MIN_SECRET_LENGTH = 32;
const MIN_ADMIN_PASSWORD_LENGTH = 12;

function isTrue(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value || "").trim().toLowerCase());
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, cwd: string = process.cwd()): AppConfig {
  const nodeEnv = (env.NODE_ENV || "development").trim();
  const isProduction = nodeEnv === "production";
  const isTest = nodeEnv === "test";
  const problems: string[] = [];

  // --- JWT secret -----------------------------------------------------------
  let jwtSecret = (env.JWT_SECRET || "").trim();
  const secretIsWeak = jwtSecret.length < MIN_SECRET_LENGTH || KNOWN_WEAK_SECRETS.has(jwtSecret);
  if (isProduction) {
    if (!jwtSecret) problems.push("JWT_SECRET is required in production.");
    else if (secretIsWeak) {
      problems.push(`JWT_SECRET must be a random value of at least ${MIN_SECRET_LENGTH} characters (not an example value).`);
    }
  } else if (!jwtSecret || secretIsWeak) {
    // Development/test only: a throwaway secret for this process. Sessions do
    // not survive a restart, and nothing guessable is ever used to sign tokens.
    jwtSecret = crypto.randomBytes(48).toString("hex");
  }

  // --- Email ----------------------------------------------------------------
  const brevoKey = (env.BREVO_API_KEY || "").trim();
  if (isProduction) {
    if (!brevoKey) {
      problems.push("BREVO_API_KEY is required in production (OTP emails cannot be sent without it).");
    } else if (brevoKey.startsWith("xsmtpsib-")) {
      problems.push("BREVO_API_KEY looks like an SMTP key; the transactional API needs an API key (xkeysib-...).");
    } else if (brevoKey === "your-brevo-api-key") {
      problems.push("BREVO_API_KEY is still the example placeholder.");
    }
  }

  // The built-in default sender is only a development convenience: Brevo
  // rejects senders that are not verified in the account.
  const senderEmail = (env.BREVO_SENDER_EMAIL || "").trim();
  if (isProduction && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(senderEmail)) {
    problems.push("BREVO_SENDER_EMAIL is required in production and must be a sender verified in Brevo.");
  }

  // --- reCAPTCHA placeholder guard -------------------------------------------
  if (isProduction && (env.RECAPTCHA_SECRET || "").trim() === "your-recaptcha-secret-key") {
    problems.push("RECAPTCHA_SECRET is still the example placeholder; set a real secret or leave it unset.");
  }

  // --- Storage --------------------------------------------------------------
  const databasePath = path.resolve(cwd, (env.DATABASE_PATH || "automarket.db").trim());
  const uploadsDir = path.resolve(cwd, (env.UPLOADS_DIR || "uploads").trim());

  // --- Network --------------------------------------------------------------
  const corsOrigins = (env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  for (const origin of corsOrigins) {
    if (!/^https?:\/\/[^/]+$/.test(origin)) problems.push(`CORS_ORIGINS entry "${origin}" is not an origin (scheme://host[:port]).`);
    else if (isProduction && origin.startsWith("http://")) problems.push(`CORS_ORIGINS entry "${origin}" must use https in production.`);
  }

  let trustProxy: number | boolean = isProduction ? 1 : false;
  const rawTrust = (env.TRUST_PROXY || "").trim();
  if (rawTrust) {
    if (/^\d+$/.test(rawTrust)) trustProxy = Number(rawTrust);
    else if (rawTrust === "false") trustProxy = false;
    else problems.push("TRUST_PROXY must be a number of proxy hops or \"false\".");
  }

  const port = Number(env.PORT) || 3000;

  const rawLimit = (env.AUTH_RATE_LIMIT_MAX || "").trim();
  let authRateLimitMax = 5;
  if (rawLimit) {
    if (isProduction) problems.push("AUTH_RATE_LIMIT_MAX may not be overridden in production.");
    else if (/^\d+$/.test(rawLimit) && Number(rawLimit) > 0) authRateLimitMax = Number(rawLimit);
  }

  // --- Demo data ------------------------------------------------------------
  const seedDemoData = isTrue(env.SEED_DEMO_DATA);
  if (seedDemoData && isProduction) problems.push("SEED_DEMO_DATA must not be enabled in production.");

  // --- First admin ----------------------------------------------------------
  const adminEmail = (env.ADMIN_EMAIL || "").trim().toLowerCase() || undefined;
  const adminPassword = env.ADMIN_PASSWORD || undefined;
  if (adminEmail || adminPassword) {
    if (!adminEmail || !adminPassword) problems.push("ADMIN_EMAIL and ADMIN_PASSWORD must be set together.");
    else {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) problems.push("ADMIN_EMAIL is not a valid email address.");
      if (adminPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
        problems.push(`ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`);
      }
    }
  }

  if (problems.length > 0) throw new ConfigError(problems);

  return {
    nodeEnv,
    isProduction,
    isTest,
    port,
    jwtSecret,
    databasePath,
    uploadsDir,
    corsOrigins,
    trustProxy,
    authRateLimitMax,
    seedDemoData,
    adminEmail,
    adminPassword,
    adminPasswordForceReset: isTrue(env.ADMIN_PASSWORD_FORCE_RESET),
  };
}
