// Test harness: runs the real server (server.ts) as a child process against a
// throwaway SQLite database and uploads folder. Nothing here touches
// automarket.db, the project's uploads/, or any external service — the
// Brevo key is blanked so no email can be sent.
import { spawn, ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const require = createRequire(import.meta.url);
export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export interface TestServer {
  baseUrl: string;
  dbPath: string;
  dir: string;
  adminEmail: string;
  adminPassword: string;
  output: () => string;
  stop: () => Promise<void>;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "souq-test-"));
}

/** Environment that isolates the child from the developer's .env. */
export function isolatedEnv(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return {
    ...process.env,
    // Empty values win over .env (dotenv never overrides a variable that is already set).
    BREVO_API_KEY: "",
    BREVO_SENDER_EMAIL: "",
    RECAPTCHA_SECRET: "",
    GEMINI_API_KEY: "",
    JWT_SECRET: "",
    CORS_ORIGINS: "",
    ADMIN_EMAIL: "",
    ADMIN_PASSWORD: "",
    ADMIN_PASSWORD_FORCE_RESET: "",
    SEED_DEMO_DATA: "",
    TRUST_PROXY: "",
    AUTH_RATE_LIMIT_MAX: "",
    ...overrides,
  };
}

export function spawnServer(env: NodeJS.ProcessEnv): { child: ChildProcess; output: () => string } {
  const tsxCli = require.resolve("tsx/cli");
  const child = spawn(process.execPath, [tsxCli, "server.ts"], { cwd: repoRoot, env, stdio: ["ignore", "pipe", "pipe"] });
  let buffer = "";
  child.stdout?.on("data", (d) => (buffer += d.toString()));
  child.stderr?.on("data", (d) => (buffer += d.toString()));
  return { child, output: () => buffer };
}

export async function startTestServer(options: { dir?: string; env?: Record<string, string> } = {}): Promise<TestServer> {
  const dir = options.dir ?? makeTempDir();
  const port = await freePort();
  const adminEmail = "admin@souq-test.invalid";
  const adminPassword = crypto.randomBytes(12).toString("hex");
  const dbPath = path.join(dir, "test.db");

  const { child, output } = spawnServer(
    isolatedEnv({
      NODE_ENV: "test",
      PORT: String(port),
      DATABASE_PATH: dbPath,
      UPLOADS_DIR: path.join(dir, "uploads"),
      SEED_DEMO_DATA: "true",
      ADMIN_EMAIL: adminEmail,
      ADMIN_PASSWORD: adminPassword,
      AUTH_RATE_LIMIT_MAX: "100000",
      ...(options.env ?? {}),
    })
  );

  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) { ready = true; break; }
    } catch { /* not listening yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) {
    child.kill();
    throw new Error(`Test server did not start.\n${output()}`);
  }

  return {
    baseUrl,
    dbPath,
    dir,
    adminEmail,
    adminPassword,
    output,
    stop: () =>
      new Promise<void>((resolve) => {
        if (child.exitCode !== null) return resolve();
        child.once("exit", () => resolve());
        child.kill();
      }),
  };
}

export async function api(
  server: TestServer,
  method: string,
  route: string,
  options: { body?: unknown; token?: string; rawBody?: string } = {}
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined || options.rawBody !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;
  const res = await fetch(server.baseUrl + route, {
    method,
    headers,
    body: options.rawBody ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { json = { nonJson: text.slice(0, 200) }; }
  return { status: res.status, json };
}

export async function login(server: TestServer, email: string, password: string) {
  return api(server, "POST", "/api/auth/login", { body: { email, password } });
}

export async function adminToken(server: TestServer): Promise<string> {
  const res = await login(server, server.adminEmail, server.adminPassword);
  if (res.status !== 200) throw new Error(`Admin login failed: ${res.status} ${JSON.stringify(res.json)}`);
  return res.json.token;
}

/** Direct fixture writes into the throwaway test database. */
export function withDb<T>(server: { dbPath: string }, fn: (db: Database.Database) => T): T {
  const db = new Database(server.dbPath);
  try { return fn(db); } finally { db.close(); }
}

let fixtureCounter = 0;

export function createUser(
  server: { dbPath: string },
  options: { role?: string; verified?: number; password?: string } = {}
): { id: number; email: string; password: string } {
  const password = options.password ?? crypto.randomBytes(9).toString("hex");
  const email = `user${++fixtureCounter}-${crypto.randomBytes(3).toString("hex")}@souq-test.invalid`;
  const id = withDb(server, (db) =>
    Number(
      db
        .prepare("INSERT INTO users (email, password, name, role, is_verified) VALUES (?, ?, ?, ?, ?)")
        .run(email, bcrypt.hashSync(password, 4), "Test User", options.role ?? "user", options.verified ?? 1).lastInsertRowid
    )
  );
  return { id, email, password };
}

export function createDealer(server: { dbPath: string }, status: string) {
  const user = createUser(server, { role: "dealer" });
  const dealerId = withDb(server, (db) =>
    Number(
      db
        .prepare("INSERT INTO dealers (user_id, name, logo, phone, whatsapp_number, branches_count, rating, status) VALUES (?, ?, ?, ?, ?, 1, 5, ?)")
        .run(user.id, "Test Showroom", "https://example.invalid/logo.png", "+201000000000", "+201000000000", status).lastInsertRowid
    )
  );
  return { ...user, dealerId };
}

export function createCar(server: { dbPath: string }, dealerId: number, status = "available"): number {
  return withDb(server, (db) =>
    Number(
      db
        .prepare(
          "INSERT INTO cars (dealer_id, make, model, year, price, mileage, location, fuel_type, transmission, description, images, status, featured) VALUES (?, 'TestMake', 'TestModel', 2024, 100000, 10, 'Cairo', 'Petrol', 'Automatic', 'Test listing', ?, ?, 0)"
        )
        .run(dealerId, JSON.stringify(["https://example.invalid/car.jpg"]), status).lastInsertRowid
    )
  );
}
