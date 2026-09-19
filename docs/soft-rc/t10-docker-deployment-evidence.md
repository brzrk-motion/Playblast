# T10 — Soft-RC Docker deployment smoke evidence

**Issue:** BRZ-241  
**Branch:** `development-mvp`  
**Pack:** Soft-RC — RC Gate 1 Docker deployment smoke (daemon-capable host)

This document records operator-verifiable evidence for the Docker deployment smoke gate. A **box-local skip** (no Docker daemon / unusable `docker.sock`) does **not** close Gate 1.

## Automated gate

From the repository root after `npm install`:

```bash
npm run verify:docker-deployment
```

This gate (see `scripts/verify-docker-deployment.sh`):

| Step | Checks |
|------|--------|
| Docker availability | Exits 0 with skip note when daemon absent; runs full smoke when present |
| Build & start | `docker compose up -d --build` from root `docker-compose.yml` |
| Health | `GET /health` → `"status":"ok"`, `"database":"ok"` |
| Clean install signal | `GET /api/setup/status` → `"status":"pending"` on fresh volumes |
| Container health | Compose healthcheck reaches `healthy` when available |

## Evidence log

| Check | Date (UTC) | Host class | Result | Notes |
|-------|------------|------------|--------|-------|
| Docker deployment smoke | 2026-09-19T05:12:19Z | Daemon-capable cloud agent VM — Ubuntu 24.04.4 LTS, x86_64, Docker 29.1.3 + Compose 2.40.3 (`linear/docker-deployment-evidence-2d05`) | **Passed** | `npm run verify:docker-deployment` — build, start, `/health`, setup pending, container health |
| Prior CI signal | 2026-09-08 ~03:34Z | GitHub Actions `ubuntu-latest` (run **34183858263**, PR #113) | **Passed** | Superseded as primary dated host signal by daemon-capable re-run above |
| Box-local skip | — | Agent/VM without Docker | **Skipped** | Exit 0 skip note only; **does not** close Gate 1 |

**Do not** record passwords, tokens, or secret values in this table.

## Gate status (honest)

| Gate | Status | Rationale |
|------|--------|-----------|
| T10 Docker deployment smoke | **Passed** (2026-09-19) | Full smoke on daemon-capable host; aligns with RC gates C20–C22 |
| Box-local Docker skip | **Not Gate closure** | Script exits 0 with skip note when daemon unavailable |
| Synology / NAS operator install | **Open** | Requires external operator host following [install docs](../deployment/install-linux-nas.md) |
| Phase 7 Docker Compose exit | **Open** | Broader than automated smoke; NAS walkthrough and related gates remain |

Prior dated CI signal: GitHub Actions run **34183858263** (2026-09-08 ~03:34Z UTC, PR #113). The 2026-09-19 daemon-capable re-run is the current primary evidence for Gate 1 Docker deployment smoke sign-off.

## Related

- T7 clean-install evidence: [t7-clean-install-evidence.md](./t7-clean-install-evidence.md) (filesystem smoke; Docker parity skipped on that host)
- Release verification matrix: [../release/README.md](../release/README.md)
- Operator install path: [../deployment/install-linux-nas.md](../deployment/install-linux-nas.md)
