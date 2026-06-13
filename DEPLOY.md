# Deploying Playblast with Portainer

Internal deployment guide for running Playblast as a Docker container managed via Portainer.

## Prerequisites

- Docker installed on the target machine
- [Portainer](https://www.portainer.io/) installed and reachable (CE or BE)
- Access to this repository (clone or copy the build context to the host)

## Build the image

From the repository root:

```bash
docker build -t playblast .
```

## Portainer deployment

### Option A — Stack (recommended)

1. In Portainer, go to **Stacks** → **Add stack**.
2. Paste the contents of `docker-compose.yml` from this repo, or use:

```yaml
services:
  playblast:
    image: playblast:latest
    ports:
      - "3000:3000"
    volumes:
      - playblast_uploads:/app/uploads
      - playblast_data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_PATH=/app/data/playblast.db
    restart: unless-stopped

volumes:
  playblast_uploads:
  playblast_data:
```

3. Deploy the stack.

### Option B — Container

1. Go to **Containers** → **Add container**.
2. **Image:** `playblast:latest`
3. **Port mapping:** `3000:3000` (host → container)
4. **Volumes:**
   - Named volume → container path `/app/uploads`
   - Named volume → container path `/app/data` (persists SQLite database)
5. **Env vars:** see table below.
6. **Restart policy:** `Unless stopped`
7. Deploy the container.

The app serves the UI and API on port **3000** inside the container.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port the Express server listens on |
| `NODE_ENV` | `production` | Set by the Dockerfile; leave as `production` in deploy |
| `UPLOAD_DIR` | `/app/uploads` | Mount a volume at this path for uploaded videos |
| `DB_PATH` | `/app/data/playblast.db` | SQLite database file for projects, versions, comments |
| `MAX_UPLOAD_SIZE` | `5000` | Max upload size in megabytes |

No secrets or API keys are required for the current build.

## Migrating from JSON storage

If you have an existing `store.json` from a previous deployment:

1. Back up the JSON file.
2. Set `DB_PATH` to the target database path (must not already exist).
3. Run the migration script from the repository root:

```bash
DB_PATH=/path/to/playblast.db node scripts/migrate-json-to-sqlite.js /path/to/store.json
```

Or point `PLAYBLAST_DATA_DIR` at the directory containing `store.json` and omit the path argument.

## Updating

1. On the build host, pull the latest code and rebuild:

   ```bash
   git pull
   docker build -t playblast .
   ```

2. In Portainer, open the **playblast** container or stack.
3. **Recreate** the container (or redeploy the stack) so it picks up the new image.
4. Named volumes are preserved across recreates — uploads and data are not lost.

## Volume backup

Uploaded videos and app data live on Docker named volumes, not inside the image.

| Path in container | Contents |
|-------------------|----------|
| `/app/uploads` | Video files (`{projectId}/{deliverableId}/{version}/`) |
| `/app/data` | `playblast.db` — projects, deliverables, versions, comments |

**Back up uploads** (replace `playblast_uploads` with your volume name):

```bash
docker run --rm \
  -v playblast_uploads:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/playblast-uploads-$(date +%Y%m%d).tar.gz -C /data .
```

**Back up data:**

```bash
docker run --rm \
  -v playblast_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/playblast-data-$(date +%Y%m%d).tar.gz -C /data .
```

Restore by extracting into a new or empty volume with the same `tar` pattern in reverse.
