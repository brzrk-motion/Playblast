# Install Playblast on Linux or Synology NAS

Playblast ships as a single Docker image that serves the API and built client on one port. Persistent state lives in two directories:

| Path in container | Contents |
|-------------------|----------|
| `/app/data` | SQLite database (`playblast.db`) |
| `/app/uploads` | Video files, studio avatars, and other media |

## Prerequisites

- **Node.js 22 LTS** on your build machine (see `engines` in `package.json`).
- **Docker** on the build machine and on the host (or Synology Container Manager on DSM 7.2+).
- A host with enough RAM to run the container (build the image off low-RAM NAS units — see below).

## Quick start (Docker Compose on Linux)

1. Clone the repository and copy environment templates:

```bash
git clone <repository-url> playblast
cd playblast
cp docker-compose.env.example .env
```

2. Edit `.env` and set `SESSION_SECRET` to a random string at least 32 characters long. Optionally set `PLAYBLAST_ADMIN_RECOVERY_TOKEN` for operator recovery. Never commit `.env`.

3. Start Playblast:

```bash
docker compose up -d --build
```

4. Open `http://<host>:3000` and complete first-run setup (create admin → name studio → invite team).

5. Verify health:

```bash
curl -fsS http://127.0.0.1:3000/health
```

A healthy instance returns `"status":"ok"` and `"database":"ok"`.

### Docker file watch for development

The Compose service includes an opt-in file-watch configuration. From a checkout with Docker Compose v2.22 or newer, run:

```bash
docker compose watch
```

Changes to the application build context trigger a fresh image build and container replacement. Generated output, persistent data, uploads, and Git metadata are ignored. This is for local development; use `docker compose up -d --build` for a normal deployment.

### Start the development demo

The development override enables the development-only database seed and uses
separate Docker volumes so it cannot modify the normal deployment data:

```bash
docker compose down
docker compose -p playblast-demo \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  up -d --build
```

Open `http://127.0.0.1:3000` and sign in with
`admin@playblast.local` / `PlayblastDev2026`. The development seed also creates
`taylor@playblast.local` as an Account Executive with the same password. The data seed runs only when the
demo database is empty; missing demo video fixtures are restored on every
development startup without overwriting uploads. To reset demo data, stop that Compose project with
`docker compose -p playblast-demo -f docker-compose.yml -f docker-compose.dev.yml down -v`
and start it again.

On dual-stack hosts, prefer `127.0.0.1` over `localhost` in operator curl examples: `localhost` may resolve to `::1` while Docker publishes the mapped port on IPv4 only. Keep container `HOST=0.0.0.0` (Compose default); `HOST=127.0.0.1` inside the container breaks published-port access from the host.

## Build and ship to a remote host

From the repository root:

```bash
npm run build:deploy
```

This builds `playblast:latest` for `linux/amd64` by default and writes `deploy/playblast.tar.gz`. Transfer and load on the target host:

```bash
scp deploy/playblast.tar.gz admin@<host>:/path/to/playblast/
ssh admin@<host>
sudo docker load < /path/to/playblast/playblast.tar.gz
```

Set `PLATFORM=linux/arm64` for ARM-based NAS models. For registry overrides and the full tag matrix, see [image tags and publish / load](./image-publish.md).

## Synology Container Manager

### Folder layout

Create bind-mount folders on the NAS (adjust volume prefix if not `/volume1`):

```
/volume1/docker/playblast/
├── uploads/      # video files and avatars
└── data/         # playblast.db
```

Grant read/write to your user and Container Manager (Control Panel → Shared Folder → Permissions).

### Compose project

Canonical NAS files in the repository:

| File | Copy to NAS |
|------|-------------|
| [`deploy/synology/docker-compose.synology.yml`](../../deploy/synology/docker-compose.synology.yml) | Project compose (e.g. `/volume1/docker/playblast/docker-compose.yml`) |
| [`deploy/synology/.env.example`](../../deploy/synology/.env.example) | Rename to `.env` and set `SESSION_SECRET` |

In **Container Manager → Project → Create**, paste or upload the compose file, set the project path to your bind-mount folder, and load `playblast:latest` before starting.

Store `SESSION_SECRET` in a `.env` file beside the compose file (Container Manager supports env files for projects). Do not commit secrets.

Optional env overrides: `PLAYBLAST_HOST_PORT`, `PLAYBLAST_DATA_DIR`, `PLAYBLAST_UPLOADS_DIR`, `PROXY_HOPS` (set `1` when DSM reverse proxy terminates TLS). See the `.env.example` comments.

Soft-RC verification evidence: [T8 NAS deploy](../release/soft-rc-evidence/t8-synology-nas-deploy.md).

### Why build off the NAS?

Compiling native modules (`better-sqlite3`) during `npm ci` is memory-intensive. Low-RAM Synology models may kill the build (exit code 137). Build on a machine with more RAM and load the pre-built image instead.

### Port and firewall

If port 3000 is taken, set `PLAYBLAST_HOST_PORT=3001` in `.env` (or change the host side of the port mapping). Allow the chosen port in DSM firewall rules. Prefer HTTPS or VPN for remote access — see [operator responsibilities](./operator-responsibilities.md) and [TLS / reverse proxy](./tls-proxy.md) (LAN/VPN-only stance + optional Caddy overlay).

### Reverse proxy and large uploads

Version uploads use tus at `/api/uploads/tus` and can resume after network drops. DSM reverse proxy and nginx defaults still use **small body limits** and **short read timeouts**, which break multi-GB CGI renders and long tus PATCH sessions.

| Check | Recommendation |
|-------|----------------|
| Body size | Set DSM/nginx `client_max_body_size` (or equivalent) to at least `MAX_UPLOAD_SIZE` (default 5000 MB). |
| Timeouts | Use **3600s** read/send timeouts on the proxy for long uploads. |
| `PROXY_HOPS` | Set `PROXY_HOPS=1` on the Playblast service when DSM terminates TLS in front of the container. |
| App env | Raise `MAX_UPLOAD_SIZE` only together with proxy limits — both must allow the file size. |

Full pitfall matrix: [T8 NAS evidence — proxy timeouts](../release/soft-rc-evidence/t8-synology-nas-deploy.md#pre-tus-proxy-timeout-pitfalls-large-uploads). Caddy/nginx examples: [TLS / reverse proxy](./tls-proxy.md).

## Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SESSION_SECRET` | Yes (production) | — | Session signing secret (32+ chars) |
| `SESSION_TTL_HOURS` | No | `168` | Session lifetime in hours |
| `PLAYBLAST_ADMIN_RECOVERY_TOKEN` | No | — | Operator recovery for lost admin credentials |
| `PLAYBLAST_EMERGENCY_BASIC_AUTH` | No | `false` | Optional bootstrap-only Basic Auth before setup completes |
| `PLAYBLAST_AUTH_USER` | Only if emergency auth enabled | — | Emergency Basic Auth username |
| `PLAYBLAST_AUTH_PASSWORD` | Only if emergency auth enabled | — | Emergency Basic Auth password |
| `HOST` | No | `0.0.0.0` | HTTP listen address (use `0.0.0.0` so Docker port publish works) |
| `UPLOAD_DIR` | No | `/app/uploads` | Upload and avatar storage |
| `DB_PATH` | No | `/app/data/playblast.db` | SQLite database file |
| `MAX_UPLOAD_SIZE` | No | `5000` | Max upload size in MB |
| `PORT` | No | `3000` | HTTP listen port |

Normal access uses Playblast login sessions, not deployment-wide Basic Auth.

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|-------------------|
| Container restarts in a loop | Check logs. Common: missing `SESSION_SECRET`, unwritable `data/` or `uploads/`, or invalid env values. |
| `SESSION_SECRET is required in production` | Set `SESSION_SECRET` in `.env` (32+ characters). |
| `EACCES` on uploads or data | Fix host folder permissions for the container user. |
| Can't reach the web UI | Confirm host port, firewall, and LAN IP. If `curl localhost` fails but `curl 127.0.0.1` works, use IPv4 explicitly. |
| Uploads fail for large files | Increase `MAX_UPLOAD_SIZE`; raise reverse-proxy body limits and timeouts (6h recommended) if fronting the app. Version uploads use tus at `/api/uploads/tus` — see [reverse-proxy notes](#reverse-proxy-and-large-uploads). |
| Login fails over plain HTTP | Production cookies are `Secure`; terminate HTTPS at DSM or use the Caddy overlay. |
| UI hangs adding annotations over HTTP IP | Browsers block `crypto.randomUUID()` outside a secure context; use HTTPS. |
| `exec format error` | Rebuild image with matching `PLATFORM` (`linux/amd64` vs `linux/arm64`). |
| Setup page unreachable | Ensure `/api/setup/status` is reachable; emergency Basic Auth (if enabled) allows setup paths. |

See also [image tags and publish / load](./image-publish.md), [secrets](./secrets.md), [migrations](./migrations.md), and [upgrade/rollback](./upgrade-rollback.md).
