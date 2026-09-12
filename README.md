# Playblast

[![CI](https://github.com/brzrk-motion/Playblast/actions/workflows/ci.yml/badge.svg?branch=development-mvp)](https://github.com/brzrk-motion/Playblast/actions/workflows/ci.yml?query=branch%3Adevelopment-mvp) [![Docs](https://github.com/brzrk-motion/Playblast/actions/workflows/deploy-docs.yml/badge.svg?branch=development-mvp)](https://github.com/brzrk-motion/Playblast/actions/workflows/deploy-docs.yml?query=branch%3Adevelopment-mvp) [![License: MIT](https://img.shields.io/github/license/brzrk-motion/Playblast)](LICENSE) [![Node.js 22](https://img.shields.io/badge/node-%3E%3D22.12.0-339933?logo=node.js&logoColor=white)](package.json) ![status: release candidate](https://img.shields.io/badge/status-release%20candidate-orange)

**Self-hosted video proofing and studio CRM for motion studios** — timestamped comments, version management, side-by-side comparison, and approval workflows for reviewing CGI renders and motion work, plus Admin CRM and finance (clients, pipeline, services, timesheet, capacity, invoicing).

MIT-licensed, one studio per instance. Playblast is sponsorship-first open source from Brzrk Interactive: studios run free self-hosted deployments; optional donations and company sponsorships fund general maintenance and development — not a support SLA or managed service.

> Looking to fund the project? See [SPONSORS.md](SPONSORS.md). The GitHub Sponsors button appears after Sponsors is enabled on the brzrk-motion org and [`.github/FUNDING.yml`](.github/FUNDING.yml) is present.

## Why self-host Playblast

- **Own your pipeline** — Docker/NAS deploy with local SQLite and uploads; no hosted SaaS or centralized studio media
- **Proofing built for motion** — versions, timestamped comments, side-by-side compare, and approval workflows for CGI and motion review
- **Studio CRM and finance (Admin)** — clients, pipeline, services, timesheet, capacity, and project invoicing on the same self-hosted instance
- **Roles that match the floor** — server-side admin, creative, and proofing permissions
- **Built for operators** — first-run setup, invite flows, and deploy docs you run yourself — not a managed service

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

For Docker-based development, start the same production-shaped container with automatic image rebuilds when source files change:

```bash
docker compose watch
```

This is intentionally opt-in; normal deployments should continue using `docker compose up -d --build`.

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
| `npm run verify:browser-qa` | Playwright Chromium smoke (four roles) |
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

Self-hosted operators own Docker, networking, HTTPS/VPN, backups, and SMTP deliverability. Playblast provides application setup, roles, proofing, and Admin CRM/finance — not remote hands or paid support. Report defects via the project's public issue tracker. Security issues: see [SECURITY.md](SECURITY.md).

## MVP reference

Implementation phases and acceptance criteria: [docs/Playblast-MVP-Audit.md](docs/Playblast-MVP-Audit.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Security reports: [SECURITY.md](SECURITY.md). Direction and non-goals: [ROADMAP.md](ROADMAP.md). MVP phases: [docs/Playblast-MVP-Audit.md](docs/Playblast-MVP-Audit.md).

## License

[MIT](LICENSE)
