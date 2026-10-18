# Deploying Souq Cars

One Node process serves everything: the REST API, uploaded media (`/uploads`),
and the built website (`dist/`). Data lives in a SQLite file. That shape needs:

- **one instance** (SQLite is a single-writer file — do not scale to replicas),
- **a persistent volume** for the database and uploads,
- **HTTPS** in front (the platform's edge provides it).

The repository ships a `Dockerfile` and `railway.json` for this. Any host that
runs a container with a mounted volume works the same way (Railway, Render,
Fly.io, a VPS with Docker).

If you later need several instances or zero-downtime deploys, move the data to
a managed PostgreSQL database and object storage first; that is a code change,
not a configuration switch.

## Environment variables

Set these in the platform, never in the repository.

| Variable | Required | Value |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` (the Dockerfile sets it) |
| `JWT_SECRET` | yes | random, 32+ characters: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `BREVO_API_KEY` | yes | Brevo **API** key (`xkeysib-…`), not the SMTP key |
| `BREVO_SENDER_EMAIL` | yes | a sender verified in Brevo, ideally on your authenticated domain |
| `BREVO_SENDER_NAME` | no | defaults to `Souq Cars` |
| `DATABASE_PATH` | yes | `/data/automarket.db` (the Dockerfile sets it) |
| `UPLOADS_DIR` | yes | `/data/uploads` (the Dockerfile sets it) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first deploy | creates the administrator; password 12+ characters. Remove `ADMIN_PASSWORD` afterwards |
| `ADMIN_PASSWORD_FORCE_RESET` | no | `true` to replace an existing admin's password with `ADMIN_PASSWORD`. Each `ADMIN_PASSWORD` value is applied once; later restarts leave the account alone (a warning is logged). Remove it afterwards |
| `CORS_ORIGINS` | no | only if another website must call the API from the browser |
| `SEED_DEMO_DATA` | first deploy | `true` loads the demo dealers and cars into an empty database, `false` starts empty. With an empty database and no value the server refuses to start (protection against a missing volume) |
| `ALLOW_EPHEMERAL_STORAGE` | no | on Railway the server refuses to start unless a Volume is attached and holds `DATABASE_PATH` and `UPLOADS_DIR`. `true` skips that check — only for a throwaway service whose data may be lost on every deploy |
| `GEMINI_API_KEY` | no | enables AI search |
| `RECAPTCHA_SECRET` | no | leave unset — the mobile apps do not send captcha tokens |
| `PORT` | no | set by the platform; defaults to 3000 |

The server exits immediately with a list of problems if a required value is
missing, is an example placeholder, or is too weak. It never falls back to a
built-in secret.

## Railway

1. Create a project from this GitHub repository. `railway.json` selects the
   Dockerfile build and the `/api/health` health check.
2. Add a **Volume** to the service, mounted at `/data`. (The Dockerfile has no
   `VOLUME` instruction on purpose — Railway rejects Dockerfiles that contain one.)
3. Add the variables above.
4. Deploy, then open `https://<your domain>/api/health` — it must answer
   `{"status":"ok",...}`.
5. Add your custom domain in Railway and point DNS at it. Railway issues the
   TLS certificate.

Keep the service at one replica.

## Email (Brevo)

- Authenticate your domain in Brevo (Senders, Domains & Dedicated IPs → Domains)
  and add the DKIM/DMARC DNS records it shows, then create the sender address
  on that domain and use it as `BREVO_SENDER_EMAIL`.
- If the API key has IP restrictions enabled, either disable them or authorise
  the server's outbound IP — hosted platforms usually have changing IPs.

## First start on a new database

- The schema is created automatically. The database starts empty unless
  `SEED_DEMO_DATA=true` is set, which writes the demo dealers and cars once.
- No account exists until `ADMIN_EMAIL` / `ADMIN_PASSWORD` create the admin.
- Dealers who register stay `pending` until an admin approves them.

## Moving an existing database

1. Stop the old server.
2. Copy `automarket.db` (and the `uploads/` folder) onto the volume as
   `/data/automarket.db` and `/data/uploads/`.
3. Start the new server. On its first production start it disables the
   passwords of the old demo/seed accounts (their logins were public) and
   keeps the accounts, dealers and listings. Then it creates or updates the
   administrator from `ADMIN_EMAIL` / `ADMIN_PASSWORD`:
   - A new address (recommended) creates a fresh administrator; the old
     admin account stays disabled.
   - The old admin email set on that first start gets `ADMIN_PASSWORD`
     straight away.
   - If the first start ran without `ADMIN_EMAIL` / `ADMIN_PASSWORD`, set them
     and restart. A new address needs nothing else; the old admin email also
     needs `ADMIN_PASSWORD_FORCE_RESET=true` for one start, because an
     existing admin's password is never replaced without it.

## Backups

SQLite is one file, so a backup is a consistent copy of it:

```
node -e "require('better-sqlite3')(process.env.DATABASE_PATH||'automarket.db',{readonly:true}).backup('backup-'+Date.now()+'.db').then(()=>console.log('done'))"
```

Run it on a schedule and copy the result, together with the uploads folder,
off the server. To restore, stop the server, replace the database file with a
backup, and start it again.

## Local production check

```
npm run build
set NODE_ENV=production
set JWT_SECRET=<random 32+ characters>
set BREVO_API_KEY=<key>
set BREVO_SENDER_EMAIL=<verified sender>
set DATABASE_PATH=.\data\local-prod.db
set UPLOADS_DIR=.\data\uploads
npx tsx server.ts
```

## Tests

```
npm test        # backend security and API regression tests (throwaway database)
npm run lint    # TypeScript
npm run build   # website bundle
```
