# Playblast pilot — manual browser verification

Operator checklist for a **private production pilot** before reviewers use the instance. Run this after deployment (see [README](../README.md) — Synology / Container Manager) and after automated gates pass.

**Scope:** browser workflow only. Does not replace NAS Hyper Backup drills or container-volume restore tests.

---

## Prerequisites

- [ ] Production container is **Running** in Container Manager; built-in healthcheck reports healthy (`GET /health` every 30s).
- [ ] Pilot URL reachable from the verifier machine on the **private network** (LAN IP + host port, e.g. `http://<nas-ip>:3000`).
- [ ] `PLAYBLAST_AUTH_USER` and `PLAYBLAST_AUTH_PASSWORD` are set in the deployment environment (not in git). Verifier has the credentials out-of-band.
- [ ] Bind mounts exist and are writable:
  - `<nas>/docker/playblast/data/` — SQLite database
  - `<nas>/docker/playblast/uploads/` — video files
- [ ] Test assets ready: one small **H.264 MP4** (browser-friendly; avoid ProRes-only `.mov` for playback checks) and optionally a second file for compare.
- [ ] Repo checkout on a build/ops machine with `npm install` completed (for automated gates below).

---

## Production access & auth boundary

| Endpoint / surface | Auth expected | Pass criteria |
|--------------------|---------------|---------------|
| `GET /health` | **None** (public) | `200`, body includes `"status":"ok"` |
| Web UI (`/`, `/projects`, …) | HTTP Basic Auth | Browser prompts; wrong password → `401` / no app load |
| `/api/*` | HTTP Basic Auth | Unauthenticated → `401`, `WWW-Authenticate: Basic realm="Playblast pilot"` |
| `/video/...` playback | HTTP Basic Auth | Range request succeeds only with valid credentials |

**Security:** Use HTTPS or VPN on untrusted networks. Do not send Basic Auth credentials over plain public HTTP.

**Quick curl checks** (replace host, user, password):

```bash
curl -sS "http://<host>:<port>/health"
curl -sS -o /dev/null -w "%{http_code}\n" "http://<host>:<port>/api/projects"          # expect 401
curl -sS -u '<user>:<password>' "http://<host>:<port>/api/projects"                     # expect 200
```

---

## Automated gates (run before browser walkthrough)

From the repository root:

```bash
npm run test                 # includes pilot authenticated E2E smoke (API parity)
npm run verify:backup-restore
npm run verify:pilot-browser # auth-boundary curl smoke (local stub; no prod URL/creds)
```

Live pilot (optional; credentials never printed):

```bash
PLAYBLAST_PILOT_URL="http://<host>:<port>" \
PLAYBLAST_AUTH_USER="<user>" \
PLAYBLAST_AUTH_PASSWORD="<password>" \
npm run verify:pilot-browser
```

- [ ] `npm run test` — all server tests pass, including **pilot authenticated E2E smoke** (project → deliverable → upload → playback → comment + annotation → approval).
- [ ] `npm run verify:backup-restore` — prints `Backup/restore verification passed.` (filesystem `data/` + `uploads/` archive/restore; no Docker, no auth secrets).
- [ ] `npm run verify:pilot-browser` — prints `Pilot browser auth-boundary verification passed (self-check).` Default mode uses an ephemeral local stub; does **not** require a live URL or real credentials. Remaining UI steps stay in the checklist below.

---

## Browser workflow

Use a **private/incognito** window if you want a clean auth prompt. Complete steps in order; note the project/deliverable names for the evidence log.

### 1. Sign in & load dashboard

- [ ] Open pilot URL → enter Basic Auth credentials when prompted.
- [ ] Dashboard / **Projects** loads without console errors.

### 2. Create a project

- [ ] **Projects** → create a new project (name e.g. `Pilot Manual Verify <date>`).
- [ ] Project appears in the list; open its overview page.

### 3. Add a deliverable

- [ ] Project overview → **Deliverables** tab → add deliverable (e.g. `Hero Cut`).
- [ ] Deliverable row visible; open the deliverable review page.

### 4. Upload version v1

- [ ] **Upload** → choose test MP4, label `v1` (or accept suggested label) → upload completes with progress/success toast.
- [ ] Video loads in the player; scrub/play works; no persistent playback error banner.

### 5. Timestamped comment + frame annotation

- [ ] Pause at a known time (e.g. ~2–5s); open comment composer (`C` or UI control).
- [ ] Enter author name and comment body → submit.
- [ ] Draw at least one annotation on the paused frame (arrow/freehand/text) and attach to the comment.
- [ ] Comment appears in the sidebar at the correct timestamp; annotation visible when seeking to that time.

### 6. Approval

- [ ] Use **Approve** (confirm if prompted) on the current version.
- [ ] Version status shows **Approved**; deliverable/project summaries reflect open comment count and approved latest version where shown.

### 7. Upload version v2 & compare

- [ ] Upload a second version (`v2`) on the same deliverable.
- [ ] **Compare** link appears (requires ≥2 versions) → side-by-side compare view opens with left/right selectors.
- [ ] Both videos play; changing left/right versions updates the comparison.

### 8. Download (optional spot check)

- [ ] **Download** on a version returns the file with correct size/type (matches uploaded asset).

---

## Expected results (summary)

After the workflow above, the pilot instance should match the authenticated smoke test behavior:

| Check | Expected |
|-------|----------|
| Health | Public `200 ok` |
| Unauthenticated API | `401` + Basic realm |
| Project + deliverable | Created and listed |
| Upload | File on disk under uploads; version `pending_review` then updatable |
| Playback | `/video/...` serves MP4 with range support |
| Comment | Stored with timestamp, author, body; listed for the version |
| Annotation | Arrow/shape persisted on comment; visible at timestamp |
| Approval | Version status `approved`; summaries show `latestVersionStatus: approved` |
| Compare | Two versions selectable; synced side-by-side UI |
| Open comments | Count includes unresolved comments (smoke expects ≥1 after step 5) |

---

## Data ownership (what to back up)

All application state lives in two on-disk locations (container paths → typical NAS bind mounts):

| Path (container) | NAS bind mount (example) | Contents |
|------------------|----------------------------|----------|
| `/app/data/playblast.db` | `/volume1/docker/playblast/data/` | Projects, deliverables, versions, comments, annotations (SQLite) |
| `/app/uploads/` | `/volume1/docker/playblast/uploads/` | Uploaded video files (hierarchical by project/deliverable/version) |

Back up **both** folders together (Hyper Backup or scheduled copy). Image updates do not touch these mounts.

---

## Backup / restore gate

**Command:** `npm run verify:backup-restore` (runs `scripts/validate-backup-restore.sh`).

Validates: seed DB + upload → `tar` archive → wipe → restore → SQLite `integrity_check` + byte match on upload file.

**Out of scope for this script:** live NAS Hyper Backup restore drill, Docker named volumes (use bind mounts on NAS per README).

- [ ] Gate passed on ops machine before pilot sign-off.
- [ ] (Manual NAS) Schedule or confirm Hyper Backup includes `data/` and `uploads/`.

---

## Evidence log

Copy for ticket / run record:

```text
Pilot manual verification — Playblast
Date: __________  Verifier: __________  Environment: __________
URL: http://<host>:<port>

Automated gates
  [ ] npm run test — pass (pilot E2E smoke included)
  [ ] npm run verify:backup-restore — pass
  [ ] npm run verify:pilot-browser — pass (self-check or live auth-boundary)

Auth boundary
  [ ] /health public 200
  [ ] /api without creds → 401
  [ ] UI + API with creds → OK

Browser workflow
  [ ] Project created: ____________________
  [ ] Deliverable: ____________________
  [ ] v1 upload + playback: ____________________
  [ ] Comment @ ______s + annotation: ____________________
  [ ] v1 approved
  [ ] v2 upload + compare: ____________________
  [ ] Download spot check (optional): ____________________

Data paths confirmed
  [ ] data/  [ ] uploads/

Issues / notes:
_________________________________________________________________
_________________________________________________________________

Sign-off:  [ ] Pilot ready for reviewers   [ ] Blocked — see notes
```

---

## References

- Deployment & NAS layout: [README](../README.md#deploying-to-a-synology-nas)
- Auth implementation: `server/src/middleware/auth.ts` (production requires `PLAYBLAST_AUTH_USER` + `PLAYBLAST_AUTH_PASSWORD`)
- API smoke parity: `server/src/routes/pilot-e2e-smoke.test.ts`
