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

> **Security note:** Playblast has **no authentication** — anyone who can reach the port can view and comment. Keep it on your LAN or behind a VPN/reverse proxy with access control. Do **not** port-forward it to the public internet as-is.

### Prerequisites

- A Synology NAS that supports Docker/Container Manager (x86_64 Plus-series, or a supported ARM model — see [Synology's package compatibility list](https://www.synology.com/en-global/dsm/packages/ContainerManager)).
- **DSM 7.2 or newer**.
- At least 4 GB RAM (8 GB+ recommended).
- An admin account on the NAS, and (for the build step) SSH access enabled.
- The **Container Manager** package installed from Package Center.

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

### Step 2 — Get the source onto the NAS

The image is built from this repository's `Dockerfile`, so the NAS needs the full source. Either:

- **Clone via SSH** (recommended). Enable SSH in **Control Panel → Terminal & SNMP → Enable SSH service**, then:

```bash
ssh admin@<nas-ip>
cd /volume1/docker/playblast
git clone <your-repo-url> src
```

- **Or upload** a copy of the repo into `/volume1/docker/playblast/src` using File Station.

You should end up with the repo (including `Dockerfile`, `client/`, and `server/`) at `/volume1/docker/playblast/src`.

### Step 3 — Build the image

Container Manager's GUI cannot build from a `Dockerfile`, so build once over SSH. The repo's multi-stage `Dockerfile` compiles the client and server and the native `better-sqlite3` module:

```bash
cd /volume1/docker/playblast/src
sudo docker build -t playblast:latest .
```

The built image then appears under **Container Manager → Image**.

> The build needs to compile a native module, which is CPU-intensive. On lower-powered/ARM models it can take several minutes — that's expected.

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

When you pull new code, rebuild the image and recreate the project:

```bash
cd /volume1/docker/playblast/src
git pull
sudo docker build -t playblast:latest .
```

Then in **Container Manager → Project → playblast**, click **Action → Build** / **Stop** then **Start** (or **Reset**) to recreate the container on the new image. Your `uploads/` and `data/` folders are untouched by rebuilds.

### Backups

Back up `/volume1/docker/playblast/data` (the SQLite database) and `/volume1/docker/playblast/uploads` (the videos) with **Hyper Backup** or a scheduled copy. Those two folders contain all application state.

### Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Container restarts in a loop | Check **Logs**. Common causes: the `data`/`uploads` paths don't exist or aren't writable by Container Manager — verify Step 1 permissions. |
| `EACCES` / permission errors | Grant the `Container Manager` and your user read/write on the `docker` shared folder. |
| Can't reach the web UI | Confirm the host port, that DSM's firewall (Control Panel → Security → Firewall) allows it, and that you're using the NAS's LAN IP. |
| Uploads fail for large files | Increase `MAX_UPLOAD_SIZE` (in MB). If you front the app with a reverse proxy, also raise its request body size limit. |
| Build fails compiling `better-sqlite3` | Ensure you're building on the NAS itself (so the native module matches the NAS architecture), not copying an image built on a different CPU. |
