# AGENTS.md

## Cursor Cloud specific instructions

Playblast is an internal video proofing tool for BRZRK — timestamped comments, version management, side-by-side comparison, and approval workflows for reviewing CGI renders and motion work.

## MVP north star and source of truth

`docs/Playblast-MVP-Audit.md` is the authoritative product and implementation brief for the studio-facing MVP. Treat it as the project Bible and north star when planning, implementing, reviewing, or sequencing work.

- Follow the synchronized phased task list in that document, which separates **Server/API**, **Client/UI**, and **Integration/verification** work.
- Keep the three tracks synchronized: client work must consume the server contract, and a phase is not complete until its integration gate passes.
- The MVP is one free, open-source, self-hosted Playblast instance per studio; do not introduce hosted SaaS, founder-installed deployments, paid support commitments, or billing unless the audit is explicitly revised.
- The required roles are `admin`, `creative`, and `proofing`. Enforce permissions server-side; hidden or disabled UI controls are not authorization.
- The near-term database direction is Drizzle over the existing `better-sqlite3` driver. Do not migrate to `node:sqlite` as part of MVP work; that is a later gated decision documented in the audit.

### Task completion protocol

When completing implementation work:

1. Select a bounded task from the appropriate phase and track in `docs/Playblast-MVP-Audit.md`.
2. Read the surrounding phase exit criteria and any dependent Server/API or Client/UI tasks before coding.
3. Implement the task and run the relevant focused checks, followed by the phase-required integration checks where applicable.
4. Check off the exact task in `docs/Playblast-MVP-Audit.md` only after the acceptance behavior is actually implemented and verified. Do not check off planning tasks based on intent, partial code, or a passing unrelated test.
5. If the implementation reveals a missing requirement, add or revise the task in the audit rather than silently working around it.
6. Report the task, files changed, commands run, real results, and any remaining blockers.

Do not mark a phase exit complete until all required Server/API, Client/UI, and Integration/verification tasks for that phase are complete and the exit gate has been exercised.

The repo is an **npm workspaces monorepo** with two packages:

| Package | Path | Stack |
|---------|------|-------|
| `@playblast/client` | `client/` | React 19, Vite 8, TypeScript, shadcn/ui, Tailwind CSS, Vidstack |
| `@playblast/server` | `server/` | Express 5, TypeScript, local filesystem + SQLite via `better-sqlite3` (Drizzle migration planned) |

In development, the Vite dev server (port `5173`) proxies `/api` and `/video` to the Express server (port `3000`). In production, Express serves the built client from `client/dist` alongside the API.

Application authentication uses secure sessions, first-run bootstrap, and role-based access. Deployment-wide HTTP Basic Auth is optional emergency bootstrap protection only (`PLAYBLAST_EMERGENCY_BASIC_AUTH`); normal access uses Playblast login sessions.

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
| `SESSION_SECRET` | dev fallback | Session signing secret (required in production, 32+ chars) |
| `SESSION_TTL_HOURS` | `168` | Session lifetime in hours |
| `PLAYBLAST_EMERGENCY_BASIC_AUTH` | `false` | Optional bootstrap-only Basic Auth before setup completes |
| `PLAYBLAST_ADMIN_RECOVERY_TOKEN` | unset | Operator recovery token for lost admin credentials |

### Standard commands

Run from the repository root:

| Command | Description |
|---------|-------------|
| `npm install` | Install all workspace dependencies |
| `npm run dev` | Start client and server concurrently |
| `npm run build` | Build client (`tsc -b` + Vite) and server (`tsc`) |
| `npm run lint` | Lint the client (`eslint`) |
| `npm run test` | Run server and client tests |

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
- `scripts/verify-pilot-browser.sh` (`npm run verify:pilot-browser`) auth-boundary curl smoke (local stub by default; live via `PLAYBLAST_PILOT_URL` + auth env); does not drive the browser UI.

### Notes

- Node 20+ is required (Dockerfile uses Node 20; Vite 8 needs `^20.19` or `>=22.12`).
- Client API calls go through `client/src/lib/api.ts` using relative `/api/*` paths.
- Key client routes: dashboard (`/`), project review (`/projects/:projectId`), version comparison (`/projects/:projectId/compare`).
