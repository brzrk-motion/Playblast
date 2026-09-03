# Playblast

Self-hosted video proofing for one studio per instance — timestamped comments, version management, side-by-side comparison, and approval workflows for reviewing CGI renders and motion work.

Free, open-source, and self-hosted. No hosted SaaS or centralized studio data.

## Stack

| Package | Path | Stack |
|---------|------|-------|
| `@playblast/client` | `client/` | React 19, Vite 8, TypeScript, shadcn/ui, Tailwind CSS, Vidstack |
| `@playblast/server` | `server/` | Express 5, SQLite via `better-sqlite3` + Drizzle migrations |

**Node.js 22 LTS** is required (`engines` in `package.json`).

## Quick start (development)

```bash
cp .env.example .env
npm install
npm run dev
```

- Client: http://localhost:5173 (proxies `/api` and `/video` to the server)
- Server: http://localhost:3000

## Production deployment

Playblast runs as a single Docker container serving API + static client on port `3000`, with persistent volumes for:

- `/app/data` — SQLite database
- `/app/uploads` — videos and studio avatars

```bash
cp docker-compose.env.example .env
# Edit .env: set SESSION_SECRET (32+ random characters)
docker compose up -d --build
```

Open `http://<host>:3000` and complete first-run setup (admin account → studio profile → team invites).

**Full guides:** [docs/deployment/index.md](docs/deployment/index.md)

| Topic | Document |
|-------|----------|
| Linux / Synology install | [install-linux-nas.md](docs/deployment/install-linux-nas.md) |
| Onboarding walkthrough | [onboarding-walkthrough.md](docs/deployment/onboarding-walkthrough.md) |
| Operator vs Admin duties | [operator-responsibilities.md](docs/deployment/operator-responsibilities.md) |
| Backup / restore | [backup-restore.md](docs/deployment/backup-restore.md) |
| Migrations | [migrations.md](docs/deployment/migrations.md) |
| Secrets | [secrets.md](docs/deployment/secrets.md) |

Normal access uses **Playblast login sessions**, not deployment-wide HTTP Basic Auth. Optional emergency Basic Auth (`PLAYBLAST_EMERGENCY_BASIC_AUTH`) exists only for bootstrap protection before setup completes.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client and server concurrently |
| `npm run build` | Build all workspaces for production |
| `npm run test` | Run server and client tests |
| `npm run lint` | Lint the client |
| `npm run verify:deployment-config` | Static deployment config checks |
| `npm run verify:backup-restore` | Filesystem backup → restore gate |
| `npm run verify:docker-deployment` | Docker build/start/health (skipped if no Docker) |
| `npm run verify:release-candidate` | Full release-candidate gate |
| `npm run verify:browser-qa` | Playwright Chromium smoke (three roles) |
| `npm run verify:secrets` | Scan tracked files for accidental secrets |
| `npm run build:deploy` | Build `linux/amd64` image tarball for NAS |

## Environment variables

See [.env.example](.env.example) and [docs/deployment/secrets.md](docs/deployment/secrets.md).

| Variable | Required (production) | Purpose |
|----------|----------------------|---------|
| `SESSION_SECRET` | Yes | Session signing (32+ chars) |
| `SESSION_TTL_HOURS` | No | Session lifetime (default 168h) |
| `PLAYBLAST_ADMIN_RECOVERY_TOKEN` | Recommended | Operator recovery for lost admin password |
| `UPLOAD_DIR` | No | Media storage (default `/app/uploads`) |
| `DB_PATH` | No | SQLite path (default `/app/data/playblast.db`) |

## Support boundary

Self-hosted operators own Docker, networking, HTTPS/VPN, backups, and SMTP deliverability. Playblast provides application setup, roles, and proofing — not remote hands or paid support. Report defects via the project's public issue tracker. Security issues: see [SECURITY.md](SECURITY.md).

## MVP reference

Implementation phases and acceptance criteria: [docs/Playblast-MVP-Audit.md](docs/Playblast-MVP-Audit.md)
