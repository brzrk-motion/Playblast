# AGENTS.md

## Cursor Cloud specific instructions

Playblast is an internal video proofing tool for BRZRK — timestamped comments, version management, side-by-side comparison, and approval workflows for reviewing CGI renders and motion work.

The repo is an **npm workspaces monorepo** with two packages:

| Package | Path | Stack |
|---------|------|-------|
| `@playblast/client` | `client/` | React 19, Vite 8, TypeScript, shadcn/ui, Tailwind CSS, Vidstack |
| `@playblast/server` | `server/` | Express 5, TypeScript, local filesystem + JSON file store |

In development, the Vite dev server (port `5173`) proxies `/api` and `/video` to the Express server (port `3000`). In production, Express serves the built client from `client/dist` alongside the API.

There is **no authentication** — comment authors are supplied by the client at post time.

### Data & storage

- **Metadata** (projects, versions, comments, annotations) is persisted in SQLite via `better-sqlite3`. The database file defaults to `/app/data/playblast.db`; override with `DB_PATH`.
- **Video uploads** are stored on the local filesystem under `UPLOAD_DIR` (default `/app/uploads`; see `.env.example` for local dev).
- There is no database server — a single SQLite file holds all app data.

### Environment variables

Copy `.env.example` to `.env` at the repo root. Supported variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Express listen port |
| `UPLOAD_DIR` | `/app/uploads` | Absolute path for uploaded video files |
| `DB_PATH` | `/app/data/playblast.db` | Absolute path to the SQLite database file |
| `MAX_UPLOAD_SIZE` | `5000` | Max upload size in megabytes |
| `NODE_ENV` | `development` | `production` or `development` |

### Standard commands

Run from the repository root:

| Command | Description |
|---------|-------------|
| `npm install` | Install all workspace dependencies |
| `npm run dev` | Start client and server concurrently |
| `npm run build` | Build client (`tsc -b` + Vite) and server (`tsc`) |
| `npm run lint` | Lint the client (`eslint`) |
| `npm run test` | Run server tests (`tsx --test`) |

Workspace-specific scripts:

```bash
npm run dev -w client      # Vite dev server on :5173
npm run dev -w server      # Express with tsx watch on :3000
npm run preview -w client  # Preview built client
npm run start -w server    # Run compiled server (after build)
```

### Testing & verification

- **Server tests** live in `server/src/**/*.test.ts` and cover env config, storage, routes, and data models. Run with `npm run test`.
- **No client tests** — verify UI changes via lint, build, and manual interaction.
- After server or API changes, run `npm run test` in addition to lint and build.

### Deployment

- `Dockerfile` builds both workspaces and runs a single Node process that serves API + static client on port `3000`.
- `docker-compose.yml` mounts named volumes at `/app/uploads` and `/app/data` for upload and database persistence.
- `scripts/validate-upload-volume.sh` smoke-tests Docker volume persistence (requires Docker).
- `scripts/validate-backup-restore.sh` (`npm run verify:backup-restore`) verifies filesystem backup → wipe → restore of `data/` + `uploads/` without Docker; does not exercise Hyper Backup or container volumes.

### Notes

- Node 20+ is required (Dockerfile uses Node 20; Vite 8 needs `^20.19` or `>=22.12`).
- Client API calls go through `client/src/lib/api.ts` using relative `/api/*` paths.
- Key client routes: dashboard (`/`), project review (`/projects/:projectId`), version comparison (`/projects/:projectId/compare`).
