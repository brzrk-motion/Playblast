# T7 — Soft-RC clean-install evidence

**Issue:** BRZ-231  
**Branch:** `development-mvp`  
**Pack:** Soft-RC Phase 7 — clean install from empty volumes

This document records operator-verifiable evidence for the clean-install gate. It does **not** close Phase 7 by itself; box-local skips and partial gates are called out explicitly.

## Documented path

Operators follow public docs only:

1. [Install on Linux or Synology NAS](../deployment/install-linux-nas.md) — clone, copy `.env`, set `SESSION_SECRET`, `docker compose up -d --build`
2. [First-run onboarding walkthrough](../deployment/onboarding-walkthrough.md) — Admin → studio → dashboard
3. [Roles, SMTP, and recovery](../deployment/roles-smtp-recovery.md) — **Team** SMTP (post-setup; not wizard); optional env override

## Automated gate

From the repository root after `npm install`:

```bash
npm run verify:clean-install
```

This gate:

| Step | Checks |
|------|--------|
| Fresh volumes | Empty SQLite + uploads directory |
| Health | `GET /health` → `"status":"ok"`, `"database":"ok"` |
| Clean install signal | `GET /api/setup/status` → `"status":"pending"` |
| First-run setup | `POST /api/setup/admin` → studio PATCH → `POST /api/setup/complete` |
| Login smoke | `POST /api/auth/login` after setup |
| SMTP placement | `GET /api/smtp` reachable post-setup (Team route; not configured on fresh install) |
| Proofing smoke | Create project → deliverable → stub MP4 upload → timestamped comment |
| Docker parity | Runs `npm run verify:docker-deployment` when Docker daemon is available |

## Evidence log

| Check | Date (UTC) | Host | Result | Notes |
|-------|------------|------|--------|-------|
| Filesystem clean-install smoke | 2026-09-19T03:07:23Z | Cloud agent VM (`linear/t7-clean-install-evidence-c0de`) | **Passed** | `npm run verify:clean-install` — setup pending→complete, login, project, stub upload, comment; SMTP on Team route only |
| Docker container clean-install | 2026-09-19T03:07:23Z | Cloud agent VM | **Skipped** | No Docker daemon (`docker.sock` unavailable); not Gate closure |
| Docs-only operator walkthrough | | External operator host | **Open** | Requires fresh VM/NAS following [install](../deployment/install-linux-nas.md) + [onboarding](../deployment/onboarding-walkthrough.md) only |

**Do not** record passwords, tokens, SMTP secrets, or invite links in this table.

## Gate status (honest)

| Gate | Status | Rationale |
|------|--------|-----------|
| T7 filesystem smoke | **Passed** (2026-09-19) | Ephemeral DB/uploads on Node 22 production build |
| T7 Docker smoke | **Skipped** (environment-blocked) | Container parity; prior CI signal run 34183858263 |
| Phase 7 clean-machine walkthrough | **Open** | Requires external operator host following docs only |
| Phase 7 exit | **Open** | Upgrade, backup, restore, recovery, live SMTP, NAS drills remain |

Box-local Docker skip ≠ Gate closure. Prior dated Docker signal: GitHub Actions run **34183858263** (2026-09-08 ~03:34Z UTC, PR #113).

## SMTP honesty (post-setup)

- **Default:** Admin configures SMTP on **Team** after setup completes.
- **Optional:** Full `SMTP_*` env block preconfigures relay; Team UI becomes read-only (`smtpConfiguredFromEnv: true`).
- **Not in scope:** SMTP step in the first-run wizard.

See [roles, SMTP, and recovery](../deployment/roles-smtp-recovery.md) and [secrets](../deployment/secrets.md).
