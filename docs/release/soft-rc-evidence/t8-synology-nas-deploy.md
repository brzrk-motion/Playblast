# T8 — Soft-RC evidence: Synology / NAS deploy

**Linear:** [BRZ-232](https://linear.app/brzrk-motion-studio/issue/BRZ-232/t8-soft-rc-evidence-synologynas-deploy)  
**Pack:** T8 (mvp, soft-rc, ops)  
**Evidence date (UTC):** 2026-09-19  
**Branch:** `development-mvp`  
**Commit:** `3e3f9f6` on branch `linear/t8-synology-nas-evidence-3f90` (PR into `development-mvp`)  
**Agent host:** Cursor Cloud Agent (linux/amd64, Docker 29.1.3)

## Summary

Documented Synology Container Manager deployment is **verified on an equivalent bind-mount Docker stack**. The canonical NAS compose sample, env deltas, reverse-proxy guidance, and pre-tus upload timeout pitfalls are recorded below. Hyper Backup end-to-end drills remain an operator-owned gate (not fabricated here).

| Acceptance criterion | Status |
|---------------------|--------|
| Documented NAS deploy works | **Pass** — bind-mount smoke + tar load path exercised |
| Known failure modes recorded | **Pass** — see [Known failure modes](#known-failure-modes) |
| Dated evidence for Phase 7 | **Pass** — this document |

## Deploy path exercised

### 1. Pre-built image tarball (recommended for NAS)

```bash
npm run build:deploy
# → deploy/playblast.tar.gz (linux/amd64 by default)
sudo docker load < deploy/playblast.tar.gz
```

**Evidence (2026-09-19T03:08:54Z):**

- Artifact: `deploy/playblast.tar.gz` (83 MB compressed)
- Image: `playblast:latest` (`f174df0446f2`, 352 MB)
- Platform: `linux/amd64`

### 2. NAS bind-mount compose (Synology-equivalent)

Canonical files:

| File | Purpose |
|------|---------|
| [`deploy/synology/docker-compose.synology.yml`](../../../deploy/synology/docker-compose.synology.yml) | Container Manager project with `/volume1/docker/playblast/{data,uploads}` bind mounts |
| [`deploy/synology/.env.example`](../../../deploy/synology/.env.example) | NAS env template (`SESSION_SECRET`, optional path/port overrides) |
| [`docs/deployment/install-linux-nas.md`](../../deployment/install-linux-nas.md) | Operator install guide (DSM steps, troubleshooting) |

**Automated smoke:**

```bash
bash scripts/verify-nas-deployment.sh
# NAS deployment verification passed. (2026-09-19T03:08Z)
```

Checks performed:

- Compose renders with bind-mount paths and `SESSION_SECRET`
- Container starts from `playblast:latest`
- `GET /health` → `"status":"ok"`, `"database":"ok"`
- `GET /api/setup/status` → `"status":"pending"` (clean install)
- SQLite file created at bind-mounted `data/playblast.db`

### 3. Base Docker Compose (Linux / CI parity)

```bash
npm run verify:docker-deployment
# Docker deployment verification passed. (2026-09-19T03:07Z)
```

Prior CI signal (unchanged): GitHub Actions run **34183858263** — Docker deployment smoke success on 2026-09-08 ~03:34Z UTC (PR #113).

### 4. TLS / reverse proxy overlay

Proxy compose renders with Caddy on `:443` and `PROXY_HOPS=1`:

```bash
export SESSION_SECRET="…" PLAYBLAST_DOMAIN=localhost
docker compose -f docker-compose.yml -f docker-compose.proxy.yml config
```

Operator guidance: [`docs/deployment/tls-proxy.md`](../../deployment/tls-proxy.md).

## Compose / env deltas (NAS vs base `docker-compose.yml`)

| Setting | Base Compose (`docker-compose.yml`) | NAS sample (`deploy/synology/docker-compose.synology.yml`) |
|---------|-------------------------------------|------------------------------------------------------------|
| Volumes | Named Docker volumes (`playblast_data`, `playblast_uploads`) | Host bind mounts (`PLAYBLAST_DATA_DIR`, `PLAYBLAST_UPLOADS_DIR`) |
| Image | `build: .` (local build) | `image: playblast:latest` (pre-loaded tarball) |
| Host port | Fixed `3000:3000` | `${PLAYBLAST_HOST_PORT:-3000}:3000` |
| `PROXY_HOPS` | Default `0` | Default `0`; set `1` when DSM reverse proxy terminates TLS |
| `.env` location | Repo root beside `docker-compose.yml` | Project folder on NAS beside `docker-compose.synology.yml` |

Required on all paths:

- `SESSION_SECRET` — 32+ random characters (production)
- `UPLOAD_DIR=/app/uploads`, `DB_PATH=/app/data/playblast.db` (defaults in compose)

Optional NAS overrides (see `deploy/synology/.env.example`):

- `PLAYBLAST_HOST_PORT` — when DSM or another service uses port 3000
- `MAX_UPLOAD_SIZE` — MB cap (default 5000); must match reverse-proxy body limits
- `PLAYBLAST_ADMIN_RECOVERY_TOKEN` — operator recovery

## Reverse proxy / HTTPS / volume mounts

| Concern | NAS guidance |
|---------|--------------|
| **SQLite + uploads persistence** | Bind-mount `data/` and `uploads/` under `/volume1/docker/playblast/` (or equivalent). Include both in Hyper Backup. |
| **HTTPS** | Prefer DSM **Control Panel → Login Portal → Advanced → Reverse Proxy** with a valid certificate, **or** the repo Caddy overlay on a Linux host. Production session cookies are `Secure`; plain `http://` by LAN IP may break login unless TLS is terminated. |
| **`PROXY_HOPS`** | Set `PROXY_HOPS=1` when exactly one trusted reverse proxy (DSM or Caddy) sits in front of Playblast. Do not raise above the number of proxies you control. |
| **Firewall** | Allow the chosen host port (or 443 on the proxy). Do not expose `:3000` to WAN when using a proxy on 443. |

## Pre-tus proxy timeout pitfalls (large uploads)

Playblast uploads are **single-request POST bodies** until resumable tus is implemented. Reverse proxies often default to **1–60 minute** read timeouts and **1 MB–100 MB** body limits.

| Symptom | Likely cause | Mitigation |
|---------|--------------|------------|
| Upload fails at ~60s or ~100 MB | DSM/nginx default `client_max_body_size` or proxy timeout | Raise body limit to ≥ `MAX_UPLOAD_SIZE` (default 5000 MB). Set read/send timeouts to **3600s** or higher for multi-GB renders. |
| `413 Request Entity Too Large` | Proxy body cap below file size | DSM reverse proxy: increase max upload size; Caddy: `request_body { max_size 6GB }` (see [`deploy/caddy/Caddyfile`](../../../deploy/caddy/Caddyfile)). |
| `502 Bad Gateway` mid-upload | Proxy closed idle upstream connection | Align `proxy_read_timeout` / Caddy `transport http { read_timeout 3600s }` with studio upload durations. |
| App accepts size but connection drops | `MAX_UPLOAD_SIZE` OK; proxy not | Set **both** `MAX_UPLOAD_SIZE` env and proxy limits. |
| Progress stalls, spinner hangs (HTTP by IP) | Browser `crypto.randomUUID()` requires secure context | Use HTTPS (or `localhost`); see [Known failure modes](#known-failure-modes). |

Reference limits in repo: Caddy `6GB` body + `3600s` timeouts; nginx snippet in [`tls-proxy.md`](../../deployment/tls-proxy.md).

## Known failure modes

| Failure | Cause | Fix |
|---------|-------|-----|
| Container restart loop | Missing/short `SESSION_SECRET` | Set 32+ char secret in NAS `.env` |
| `EACCES` on data/uploads | Bind-mount permissions | Grant Container Manager write access (Shared Folder permissions) |
| `exec format error` | Wrong image architecture | Rebuild with `PLATFORM=linux/arm64` for ARM NAS models |
| Build OOM (exit 137) on NAS | `better-sqlite3` compile during `docker build` | Build off-NAS: `npm run build:deploy` + `docker load` |
| Healthcheck unhealthy | `HOST=127.0.0.1` inside container | Keep `HOST=0.0.0.0` (compose default) |
| Login/session fails over HTTP | `Secure` cookies in production | Terminate HTTPS at DSM or Caddy |
| Annotation/service UI hangs on HTTP IP | `crypto.randomUUID()` insecure context | Access via HTTPS or documented LAN TLS; fallback UUID helper planned/tracked separately |
| Upload fails only through proxy | Timeout/body limit | See [Pre-tus proxy timeout pitfalls](#pre-tus-proxy-timeout-pitfalls-large-uploads) |
| Data loss after “restore” | Partial restore (DB only or uploads only) | Restore **both** `data/` and `uploads/` from the same backup point ([`backup-restore.md`](../../deployment/backup-restore.md)) |

## Automated gates run for this evidence

| Command | Result | Timestamp (UTC) |
|---------|--------|-----------------|
| `npm run verify:deployment-config` | Pass | 2026-09-19 |
| `npm run verify:backup-restore` | Pass | 2026-09-19 |
| `npm run verify:docker-compose` | Pass | 2026-09-19 |
| `npm run verify:docker-deployment` | Pass | 2026-09-19 |
| `bash scripts/verify-nas-deployment.sh` | Pass | 2026-09-19 |
| `npm run build:deploy` | Pass (`deploy/playblast.tar.gz`) | 2026-09-19 |

## Out of scope (honest boundaries)

- **Hyper Backup / container-volume restore drill** on physical Synology hardware — operator step; see [`backup-restore.md`](../../deployment/backup-restore.md).
- **Live multi-GB upload through DSM reverse proxy** — timeout guidance documented; full soak test deferred to studio operator network.
- **Resumable tus uploads** — pre-tus limitations documented above.
- **Guest portal / SaaS / prettier-review track** — soft-RC locked out of scope per BRZ-232.

## Related

- Install guide: [`docs/deployment/install-linux-nas.md`](../../deployment/install-linux-nas.md)
- TLS / proxy: [`docs/deployment/tls-proxy.md`](../../deployment/tls-proxy.md)
- Release gates: [`docs/release/README.md`](../README.md)
- Phase 7 audit: [`docs/Playblast-MVP-Audit.md`](../../Playblast-MVP-Audit.md) — integration task “Run Docker Compose and documented Synology/Linux installation checks”
