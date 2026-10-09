import assert from "node:assert/strict";
import { test } from "node:test";
import { ConfigError, loadConfig } from "../config";

const STRONG_SECRET = "k".repeat(16) + "9f3b7a1c5d2e8f4a6b0c";

function prodEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    JWT_SECRET: STRONG_SECRET,
    BREVO_API_KEY: "xkeysib-test-value",
    BREVO_SENDER_EMAIL: "no-reply@example.com",
    ...overrides,
  } as NodeJS.ProcessEnv;
}

function problemsOf(env: NodeJS.ProcessEnv): string[] {
  try {
    loadConfig(env, "/app");
    return [];
  } catch (e) {
    assert.ok(e instanceof ConfigError, "expected a ConfigError");
    return e.problems;
  }
}

test("a complete production configuration is accepted", () => {
  const config = loadConfig(prodEnv(), "/app");
  assert.equal(config.isProduction, true);
  assert.equal(config.jwtSecret, STRONG_SECRET);
  assert.equal(config.trustProxy, 1);
  assert.deepEqual(config.corsOrigins, []);
  assert.equal(config.authRateLimitMax, 5);
  assert.equal(config.seedDemoData, false);
});

test("production refuses to start without a JWT secret", () => {
  assert.match(problemsOf(prodEnv({ JWT_SECRET: undefined })).join("\n"), /JWT_SECRET is required/);
  assert.match(problemsOf(prodEnv({ JWT_SECRET: "" })).join("\n"), /JWT_SECRET is required/);
});

test("production rejects example, legacy and short JWT secrets", () => {
  for (const weak of ["super-secret-key", "your-super-secret-key", "secret", "short-but-not-listed"]) {
    assert.match(problemsOf(prodEnv({ JWT_SECRET: weak })).join("\n"), /JWT_SECRET must be a random value/, weak);
  }
});

test("production requires a Brevo API key of the right kind and a sender", () => {
  assert.match(problemsOf(prodEnv({ BREVO_API_KEY: undefined })).join("\n"), /BREVO_API_KEY is required/);
  assert.match(problemsOf(prodEnv({ BREVO_API_KEY: "xsmtpsib-abc" })).join("\n"), /SMTP key/);
  assert.match(problemsOf(prodEnv({ BREVO_API_KEY: "your-brevo-api-key" })).join("\n"), /placeholder/);
  assert.match(problemsOf(prodEnv({ BREVO_SENDER_EMAIL: undefined })).join("\n"), /BREVO_SENDER_EMAIL is required/);
});

test("production rejects placeholder captcha and rate-limit overrides; demo seeding is opt-in", () => {
  assert.equal(loadConfig(prodEnv(), "/app").seedDemoData, false);
  assert.equal(loadConfig(prodEnv({ SEED_DEMO_DATA: "true" }), "/app").seedDemoData, true);
  assert.match(problemsOf(prodEnv({ RECAPTCHA_SECRET: "your-recaptcha-secret-key" })).join("\n"), /RECAPTCHA_SECRET/);
  assert.match(problemsOf(prodEnv({ AUTH_RATE_LIMIT_MAX: "1000" })).join("\n"), /AUTH_RATE_LIMIT_MAX/);
});

test("CORS origins are parsed and must be https origins in production", () => {
  const config = loadConfig(prodEnv({ CORS_ORIGINS: "https://souq.example.com/, https://www.souq.example.com" }), "/app");
  assert.deepEqual(config.corsOrigins, ["https://souq.example.com", "https://www.souq.example.com"]);
  assert.match(problemsOf(prodEnv({ CORS_ORIGINS: "http://souq.example.com" })).join("\n"), /https/);
  assert.match(problemsOf(prodEnv({ CORS_ORIGINS: "souq.example.com/path" })).join("\n"), /not an origin/);
});

test("admin bootstrap needs both values and a long password", () => {
  assert.match(problemsOf(prodEnv({ ADMIN_EMAIL: "a@example.com" })).join("\n"), /set together/);
  assert.match(problemsOf(prodEnv({ ADMIN_EMAIL: "a@example.com", ADMIN_PASSWORD: "short" })).join("\n"), /at least 12/);
  const config = loadConfig(prodEnv({ ADMIN_EMAIL: "Admin@Example.com", ADMIN_PASSWORD: "a-long-enough-pass" }), "/app");
  assert.equal(config.adminEmail, "admin@example.com");
});

test("storage paths come from the environment", () => {
  const config = loadConfig(prodEnv({ DATABASE_PATH: "/data/souq.db", UPLOADS_DIR: "/data/uploads" }), "/app");
  assert.match(config.databasePath.replace(/\\/g, "/"), /\/data\/souq\.db$/);
  assert.match(config.uploadsDir.replace(/\\/g, "/"), /\/data\/uploads$/);
});

test("development never signs with a guessable secret", () => {
  const a = loadConfig({ NODE_ENV: "development" } as NodeJS.ProcessEnv, "/app");
  const b = loadConfig({ NODE_ENV: "development", JWT_SECRET: "your-super-secret-key" } as NodeJS.ProcessEnv, "/app");
  assert.ok(a.jwtSecret.length >= 64);
  assert.ok(b.jwtSecret.length >= 64);
  assert.notEqual(a.jwtSecret, b.jwtSecret, "a fresh random secret per process");
  assert.notEqual(b.jwtSecret, "your-super-secret-key");
  assert.equal(a.isProduction, false);
  assert.equal(a.trustProxy, false);
});
