# Souq Cars backend + website (one Node process: Express API, uploads, built SPA).
FROM node:22-bookworm-slim

WORKDIR /app

# Toolchain for better-sqlite3 in case no prebuilt binary matches the platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Website bundle served by the API process in production (dist/).
RUN npm run build

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/automarket.db \
    UPLOADS_DIR=/data/uploads

# /data must be a persistent volume: it holds the SQLite database and all uploaded
# media. It is attached by the platform (Railway: service -> Volumes -> mount path
# /data). There is deliberately no VOLUME instruction here: Railway rejects
# Dockerfiles that contain one.

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npx", "tsx", "server.ts"]
