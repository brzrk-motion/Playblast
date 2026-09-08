# Operator checklist: backup and upgrade

One-page runbook for the host operator. Details live in the linked guides — this page is the sequence to follow on maintenance day.

**You own the host.** Playblast does not provide managed hosting, remote ops, or paid support. Studios run their own Docker, networking, TLS/VPN, SMTP, backups, and restore drills.

## Before you upgrade

- [ ] Read release notes / [migrations](./migrations.md) for breaking changes.
- [ ] Schedule a short maintenance window; warn the studio that sessions may drop.
- [ ] Confirm you can reach the host (SSH / Synology) and have the previous image tag available (tarball or registry dig).
- [ ] **Back up `data/` and `uploads/` together** (same point in time). Quiesce writes first when you can.

```bash
# Example — adjust paths to your bind mounts
tar -C /path/to/playblast -czf playblast-backup-$(date +%Y%m%d).tar.gz data uploads
```

- [ ] Secure copy of host `.env` (secrets stay off the DB backup) — see [secrets](./secrets.md).
- [ ] Store the archive **off** the NAS/host. If you have never restored before, run a drill first ([backup and restore](./backup-restore.md)).

## Upgrade

- [ ] Build or load the new image (`npm run build:deploy` / `docker compose build` / `docker load`). Canonical tag is `playblast:latest` — see [image publish](./image-publish.md).
- [ ] Stop the running container.
- [ ] Start the **new** image against the **same** volumes.
- [ ] Watch logs until migrations finish (they run on startup).
- [ ] If you use the Caddy/nginx overlay (`docker-compose.proxy.yml`), keep `PROXY_HOPS=1` (overlay sets it). Base Compose defaults to `0`. DSM reverse-proxy without the overlay: set `PROXY_HOPS=1` yourself — details in [TLS / reverse proxy](./tls-proxy.md).

## After upgrade — verify

- [ ] Health:

```bash
curl -fsS http://127.0.0.1:3000/health
# or https://$PLAYBLAST_DOMAIN/health behind the proxy
# expect "status":"ok" and "database":"ok"
```

- [ ] Admin can sign in.
- [ ] Creative/Proofing smoke on one project (open video, comment if used).
- [ ] SMTP test from Team settings (if invitations are used).
- [ ] Optional when Docker is available: `npm run verify:docker-deployment` and `npm run verify:backup-restore`.

Full narrative: [upgrade and rollback](./upgrade-rollback.md).

## If the upgrade fails

**Downgrade against a migrated DB is unsupported.** Safe path:

1. Stop the container.
2. Restore **both** `data/` and `uploads/` from the pre-upgrade backup.
3. Start the **previous** image tag on those restored volumes.

Image-only rollback (no DB restore) is safe **only** if logs show no migration applied. Otherwise treat the DB as upgraded and restore from backup.

## Steady-state backup (no upgrade)

- [ ] Regular off-host backups of `data/` + `uploads/` (+ secure `.env`).
- [ ] Periodic restore drill (even a dry-run extract + integrity check).
- [ ] Never restore only the DB or only uploads — broken media references either way.

## Related guides

| Guide | Use when |
|-------|----------|
| [Backup and restore](./backup-restore.md) | What is in the backup, session effects, Hyper Backup |
| [Upgrade and rollback](./upgrade-rollback.md) | Full upgrade narrative and rollback rules |
| [Image publish (tar / GHCR)](./image-publish.md) | How you build/load tags |
| [TLS / reverse proxy](./tls-proxy.md) | `PROXY_HOPS`, Caddy overlay, Secure cookies |
| [Operator vs Admin](./operator-responsibilities.md) | Who owns host vs in-app setup |
| [Secrets](./secrets.md) | `SESSION_SECRET`, recovery token, permissions |
