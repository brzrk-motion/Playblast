# Playblast

Internal video proofing tool for BRZRK — timestamped comments, version management, side-by-side comparison, and approval workflows for reviewing CGI renders and motion work.

## Stack

- **Client** — React, Vite, shadcn/ui, Tailwind CSS
- **Server** — Express, local filesystem

## Project structure

```
.
├── client/   # Vite + React frontend
├── server/   # Express API
└── package.json
```

## Getting started

Install dependencies from the repository root:

```bash
npm install
```

Start both the client and server in development mode:

```bash
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3000

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client and server concurrently |
| `npm run build` | Build client and server for production |
| `npm run lint` | Lint the client |

## Workspaces

This repo uses npm workspaces. Run package-specific scripts with:

```bash
npm run dev -w client
npm run dev -w server
```

## Deploying to a Synology NAS

Playblast ships as a single Docker image that serves the API and the built client on one port, with two persistent volumes (`/app/uploads` for video files and `/app/data` for the SQLite database). That maps cleanly onto Synology's **Container Manager** (the renamed Docker package in DSM 7.2+).

> **Security note:** Production containers require HTTP Basic Auth. Set `PLAYBLAST_AUTH_USER` and `PLAYBLAST_AUTH_PASSWORD` in the deployment environment; never commit them. Keep the service on a private network or behind HTTPS/VPN access. Basic Auth credentials must not be sent over plain public HTTP.

### Prerequisites

- A Synology NAS that supports Docker/Container Manager (x86_64 Plus-series, or a supported ARM model — see [Synology's package compatibility list](https://www.synology.com/en-global/dsm/packages/ContainerManager)).
- **DSM 7.2 or newer**, with the **Container Manager** package installed from Package Center.
- An admin account on the NAS with **SSH access** enabled (Control Panel → Terminal & SNMP → Enable SSH service).
- A **build machine** (e.g. your dev laptop) with **Docker** and **bash** installed. This is where the image is built.

> **Why build off the NAS?** Compiling the client and the native `better-sqlite3` module during `npm ci` is memory-hungry. Low-RAM models (e.g. the DS220+ with 2 GB) run out of memory and the build is killed by the OOM killer — you'll see `npm ci` exit with code **137** or an `unexpected EOF`. Building on a machine with more RAM and shipping the finished image avoids this entirely. Most Plus-series NAS units are x86_64/amd64, the same architecture as a typical PC, so an image built locally for `linux/amd64` runs on the NAS unchanged.

### Step 1 — Create the folder structure

Open **File Station** and create a shared folder named `docker` (if you don't already have one). Inside it, create the project folders:

```
/volume1/docker/
└─ playblast/
   ├─ uploads/      # uploaded video files live here
   └─ data/         # playblast.db (SQLite) lives here
```

Confirm the absolute path on **Control Panel → Shared Folder** — most systems use `/volume1`, but yours may differ (`/volume2`, etc.). Use the real path everywhere below.

> Ensure the shared folder grants read/write to your user, `administrators`, and `Container Manager` (Control Panel → Shared Folder → Edit → Permissions). Native-module data (the SQLite DB) needs write access.

### Step 2 — Build the image locally

On your build machine, from the repository root, run:

```bash
npm run build:deploy
```

This runs `scripts/build-deploy.sh`, which builds the image for `linux/amd64` and writes a compressed tarball to `deploy/playblast.tar.gz`. The `deploy/` folder is git-ignored.

The script accepts two optional environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `IMAGE_NAME` | `playblast:latest` | Tag for the built image |
| `PLATFORM` | `linux/amd64` | Target architecture — set to `linux/arm64` for ARM-based NAS models |

```bash
# Example: build for an ARM-based NAS
PLATFORM=linux/arm64 npm run build:deploy
```

### Step 3 — Copy the image to the NAS and load it

Transfer `deploy/playblast.tar.gz` to the NAS (via File Station, or `scp` from the build machine):

```bash
scp deploy/playblast.tar.gz admin@<nas-ip>:/volume1/docker/playblast/
```

Then SSH in and load the image into Container Manager's image store:

```bash
ssh admin@<nas-ip>
sudo docker load < /volume1/docker/playblast/playblast.tar.gz
```

The image then appears under **Container Manager → Image** as `playblast:latest`, ready to use in a Project. You can delete the `.tar.gz` from the NAS afterwards.

### Step 4 — Create the Project (Docker Compose)

In **Container Manager → Project → Create**:

1. **Project name:** `playblast`
2. **Path:** select `/volume1/docker/playblast`
3. **Source:** choose **Create docker-compose.yml** and paste the following. This uses the locally built image and **bind mounts** so your videos and database persist on the NAS filesystem (easy to back up).

```yaml
services:
  playblast:
    image: playblast:latest
    container_name: playblast
    ports:
      # host:container — change the host port (left side) if 3000 is taken on the NAS
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: "3000"
      UPLOAD_DIR: /app/uploads
      DB_PATH: /app/data/playblast.db
      # Max upload size in MB (default 5000 = ~5 GB)
      MAX_UPLOAD_SIZE: "5000"
      PLAYBLAST_AUTH_USER: pilot
      PLAYBLAST_AUTH_PASSWORD: "replace-with-a-long-random-password"
    volumes:
      - /volume1/docker/playblast/uploads:/app/uploads
      - /volume1/docker/playblast/data:/app/data
    restart: unless-stopped
```

4. Click **Next**, skip the optional Web Station web-portal step (not required), and **Done**. Container Manager will create and start the container.

> **Port conflicts:** DSM and other packages reserve some ports. If `3000` is in use, change the left side of the mapping (e.g. `"3001:3000"`) and reach the app on that port instead.

> **Why bind mounts?** The repo's default `docker-compose.yml` uses named Docker volumes, which work but are harder to browse and back up on a NAS. The bind mounts above store data in folders you can see in File Station and include in Hyper Backup.

### Step 5 — Verify and access

- Container Manager shows the container as **Running**. The image's built-in healthcheck polls `GET /health` every 30s — a healthy status means the server is up.
- Open `http://<nas-ip>:3000` (or your chosen host port) from a machine on the same network.
- To check logs, open the container in Container Manager → **Logs**.

### Updating to a new version

When you pull new code, rebuild the image locally and ship it again:

```bash
git pull
npm run build:deploy
scp deploy/playblast.tar.gz admin@<nas-ip>:/volume1/docker/playblast/
```

Then on the NAS:

```bash
ssh admin@<nas-ip>
sudo docker load < /volume1/docker/playblast/playblast.tar.gz
```

Finally, in **Container Manager → Project → playblast**, **Stop** then **Start** (or use **Action → Reset**) to recreate the container on the new image. Your `uploads/` and `data/` folders are untouched by updates.

### Backups

Back up `/volume1/docker/playblast/data` (the SQLite database) and `/volume1/docker/playblast/uploads` (the videos) with **Hyper Backup** or a scheduled copy. Those two folders contain all application state.

### Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Container restarts in a loop | Check **Logs**. Common causes: the `data`/`uploads` paths don't exist or aren't writable by Container Manager — verify Step 1 permissions. |
| `EACCES` / permission errors | Grant the `Container Manager` and your user read/write on the `docker` shared folder. |
| Can't reach the web UI | Confirm the host port, that DSM's firewall (Control Panel → Security → Firewall) allows it, and that you're using the NAS's LAN IP. |
| Uploads fail for large files | Increase `MAX_UPLOAD_SIZE` (in MB). If you front the app with a reverse proxy, also raise its request body size limit. |
| `npm ci` killed with exit code 137 / `unexpected EOF` when building on the NAS | The NAS ran out of memory. Build on your dev machine with `npm run build:deploy` and load the image instead (Steps 2–3). |
| `exec format error` when starting the container | The image was built for the wrong architecture. Rebuild with the matching `PLATFORM` (`linux/amd64` for Intel NAS, `linux/arm64` for ARM). |
