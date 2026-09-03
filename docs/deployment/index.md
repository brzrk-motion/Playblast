# Playblast deployment documentation

Self-hosted release and operations guides for one Playblast instance per studio.

## Start here

| Guide | Audience | Purpose |
|-------|----------|---------|
| [Install on Linux or Synology NAS](./install-linux-nas.md) | Host operator | Build, ship, and run the Docker image |
| [First-run onboarding walkthrough](./onboarding-walkthrough.md) | Admin + team | Install → admin → studio → invite → role login |
| [Operator vs application Admin](./operator-responsibilities.md) | Host operator + Admin | Who owns Docker, HTTPS, backups, and in-app setup |
| [Roles, SMTP, and recovery](./roles-smtp-recovery.md) | Admin | Capabilities, email, and credential recovery |
| [Backup and restore](./backup-restore.md) | Host operator | What to back up, restore drills, session effects |
| [Migrations](./migrations.md) | Host operator | Legacy SQL + Drizzle ordering, upgrade safety |
| [Secrets and permissions](./secrets.md) | Host operator | SESSION_SECRET, recovery token, file permissions |
| [Upgrade and rollback](./upgrade-rollback.md) | Host operator | Image upgrades, unsupported downgrades |

## Automated verification

Run from the repository root after `npm install`:

| Command | Requires Docker | What it checks |
|---------|-----------------|----------------|
| `npm run verify:deployment-config` | No | Dockerfile, Compose, env examples, docs presence |
| `npm run verify:docker-compose` | Yes (skipped if absent) | `docker compose config` renders cleanly |
| `npm run verify:docker-deployment` | Yes (skipped if absent) | Build, start, `/health`, clean setup status |
| `npm run verify:backup-restore` | No | Filesystem backup → wipe → restore of DB + uploads |
| `npm run verify:pilot-browser` | No | Session auth-boundary curl smoke (local stub by default) |

## Support boundary

Playblast is free, open-source, and self-hosted. There is no hosted SaaS, no founder-installed deployment service, and no paid support commitment. Studios operate their own Docker host, networking, HTTPS/VPN, SMTP deliverability, backups, and restore drills. Report bugs through the project's public issue tracker.
