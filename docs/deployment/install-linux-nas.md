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
curl -fsS http://localhost:3000/health
```

A healthy instance returns `"status":"ok"` and `"database":"ok"`.

## Build and ship to a remote host

From the repository root:

```bash
npm run build:deploy
```

This builds for `linux/amd64` by default and writes `deploy/playblast.tar.gz`. Transfer and load on the target host:

```bash
scp deploy/playblast.tar.gz admin@<host>:/path/to/playblast/
ssh admin@<host>
sudo docker load < /path/to/playblast/playblast.tar.gz
```

Set `PLATFORM=linux/arm64` for ARM-based NAS models.

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

In **Container Manager → Project → Create**, use bind mounts and session-based auth:

```yaml
services:
  playblast:
    image: playblast:latest
    container_name: playblast
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: "3000"
      UPLOAD_DIR: /app/uploads
      DB_PATH: /app/data/playblast.db
      MAX_UPLOAD_SIZE: "5000"
      SESSION_SECRET: ${SESSION_SECRET:?Set SESSION_SECRET}
      SESSION_TTL_HOURS: ${SESSION_TTL_HOURS:-168}
      PLAYBLAST_ADMIN_RECOVERY_TOKEN: ${PLAYBLAST_ADMIN_RECOVERY_TOKEN:-}
    volumes:
      - /volume1/docker/playblast/uploads:/app/uploads
      - /volume1/docker/playblast/data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
```

Store `SESSION_SECRET` in a `.env` file beside the compose file (Container Manager supports env files for projects). Do not commit secrets.

### Why build off the NAS?

Compiling native modules (`better-sqlite3`) during `npm ci` is memory-intensive. Low-RAM Synology models may kill the build (exit code 137). Build on a machine with more RAM and load the pre-built image instead.

### Port and firewall

If port 3000 is taken, change the host side of the mapping (e.g. `"3001:3000"`). Allow the chosen port in DSM firewall rules. Prefer HTTPS or VPN for remote access — see [operator responsibilities](./operator-responsibilities.md).

## Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SESSION_SECRET` | Yes (production) | — | Session signing secret (32+ chars) |
| `SESSION_TTL_HOURS` | No | `168` | Session lifetime in hours |
| `PLAYBLAST_ADMIN_RECOVERY_TOKEN` | No | — | Operator recovery for lost admin credentials |
| `PLAYBLAST_EMERGENCY_BASIC_AUTH` | No | `false` | Optional bootstrap-only Basic Auth before setup completes |
| `PLAYBLAST_AUTH_USER` | Only if emergency auth enabled | — | Emergency Basic Auth username |
| `PLAYBLAST_AUTH_PASSWORD` | Only if emergency auth enabled | — | Emergency Basic Auth password |
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
| Can't reach the web UI | Confirm host port, firewall, and LAN IP. |
| Uploads fail for large files | Increase `MAX_UPLOAD_SIZE`; raise reverse-proxy body limits if fronting the app. |
| `exec format error` | Rebuild image with matching `PLATFORM` (`linux/amd64` vs `linux/arm64`). |
| Setup page unreachable | Ensure `/api/setup/status` is reachable; emergency Basic Auth (if enabled) allows setup paths. |

See also [secrets](./secrets.md), [migrations](./migrations.md), and [upgrade/rollback](./upgrade-rollback.md).
