# Playblast — manual browser verification

Operator checklist for a **self-hosted release candidate** after automated gates pass. Complements deterministic Playwright smoke tests (`npm run verify:browser-qa`).

**Scope:** browser workflow only. Does not replace NAS Hyper Backup drills, container-volume restore tests, or live SMTP delivery to external mailboxes.

---

## Prerequisites

- [ ] Production container is running; `GET /health` returns `"status":"ok"`.
- [ ] Instance URL reachable from the verifier machine (e.g. `http://<host>:3000` on LAN/VPN).
- [ ] Persistent volumes exist for `/app/data` and `/app/uploads`.
- [ ] Test assets ready: one small **H.264 MP4** for playback and optionally a second file for compare.
- [ ] Repository checkout with `npm install` completed (for automated gates below).

Normal access uses **Playblast login sessions**, not deployment-wide HTTP Basic Auth. Optional emergency Basic Auth (`PLAYBLAST_EMERGENCY_BASIC_AUTH`) applies only before first-run setup completes.

---

## Production access and auth boundary

| Endpoint / surface | Auth expected | Pass criteria |
|--------------------|---------------|---------------|
| `GET /health` | None (public) | `200`, body includes `"status":"ok"` |
| `GET /api/setup/status` | None (public) | `200` with setup lifecycle JSON |
| Web UI (`/login`, `/`, `/projects`, …) | Playblast session cookie | Unauthenticated protected routes redirect to `/login` |
| `/api/*` (protected) | Session + CSRF on mutations | Unauthenticated → `401`; wrong role → `403` |
| `/video/...` playback | Session + `review.play` capability | Unauthenticated → `401` |

**Security:** Terminate TLS at a reverse proxy or VPN on untrusted networks. Never commit `SESSION_SECRET`, SMTP passwords, or invite links.

**Quick curl checks** (replace host):

```bash
curl -sS "http://<host>:3000/health"
curl -sS -o /dev/null -w "%{http_code}\n" "http://<host>:3000/api/projects"   # expect 401
```

---

## Automated gates (run before browser walkthrough)

From the repository root:

```bash
npm run verify:release-candidate   # full RC gate; skips Docker locally if daemon absent
npm run verify:browser-qa        # Chromium smoke for three-role direct-URL guards
```

Individual gates:

```bash
npm run test
npm run build
npm run lint
npm run audit:prod
npm run verify:secrets
npm run verify:backup-restore
npm run verify:pilot-browser
npm run verify:deployment-config
```

- [ ] `npm run test` — shared, server, and client tests pass (includes release verification and role matrix suites).
- [ ] `npm run verify:browser-qa` — Playwright smoke passes (Admin Team access; Creative/Proofing forbidden redirects; login labels).
- [ ] `npm run verify:backup-restore` — prints `Backup/restore verification passed.`
- [ ] `npm run verify:secrets` — no accidental secret patterns in tracked files.

**Manual / external gates** (documented in [docs/release/README.md](release/README.md)):

- [ ] Cross-browser desktop QA (Firefox, Safari, Edge) on a clean instance.
- [ ] Clean-machine install from [deployment docs](deployment/README.md) only.
- [ ] Live SMTP invitation delivery to a real mailbox (operator relay).

---

## Browser workflow (three roles)

Use a private/incognito window per role. Complete steps in order.

### 1. First-run setup (fresh instance only)

- [ ] Open `/setup` → create bootstrap **Admin** account.
- [ ] Complete studio name (and optional avatar) on `/setup/studio`.
- [ ] Finish setup → land on dashboard or Team onboarding.

### 2. Admin smoke

- [ ] Sign in at `/login` if needed.
- [ ] Open **Team** — page loads; SMTP section visible.
- [ ] Create a project, upload a version, add a comment, and approve or resolve feedback.
- [ ] Open **Compare** when two versions exist.

### 3. Creative smoke

- [ ] Sign in as a **Creative** member (invite acceptance or seeded test account).
- [ ] Create or edit project content; confirm **Team** and CRM routes redirect to `/forbidden` when opened directly.
- [ ] Complete a review cycle (comment, playback).

### 4. Proofing smoke

- [ ] Sign in as a **Proofing** member.
- [ ] Confirm project **creation** and destructive actions are unavailable (UI and API).
- [ ] Complete read/review/comment workflow; direct URL to `/clients` shows **Permission denied**.

### 5. Error and recovery states

- [ ] Invalid login shows generic error without leaking account existence.
- [ ] Expired session redirects to `/session-expired` or `/login`.
- [ ] Deployment failure surfaces the server-unavailable page with retry (stop container briefly to verify).

### 6. Accessibility spot checks

- [ ] Login and setup forms expose visible labels tied to inputs.
- [ ] Destructive actions (delete project, revoke invite) require explicit confirmation.
- [ ] Keyboard: Tab reaches primary actions; Enter submits login form.

---

## Evidence log (optional)

| Check | Date | Result | Notes |
|-------|------|--------|-------|
| Automated RC gate | | | |
| Browser QA (Chromium) | | | |
| Admin walkthrough | | | |
| Creative walkthrough | | | |
| Proofing walkthrough | | | |
| Cross-browser manual | | | |
| Live SMTP delivery | | | |

Do not record passwords, tokens, or SMTP secrets in this log.
