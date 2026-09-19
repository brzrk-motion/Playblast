# Soft-RC evidence — T9 backup + SMTP recovery

**Linear:** [BRZ-233](https://linear.app/brzrk-motion-studio/issue/BRZ-233/t9-soft-rc-evidence-backup-smtp-recovery)  
**Pack:** T9 — Phase 7 soft-RC  
**Branch:** `development-mvp` (evidence captured on feature branch before merge)  
**Purpose:** Record that an operator can restore from backup and re-verify SMTP without tribal knowledge.

> **Gate honesty:** Automated filesystem backup/restore passes in CI and locally. Container-volume / NAS Hyper Backup drills and live SMTP delivery to a real mailbox remain **manual operator gates** — a local Docker skip does **not** close Phase 7.

## Acceptance mapping

| Criterion | Evidence |
|-----------|----------|
| Operator can restore DB + uploads and follow documented post-restore steps | [backup-restore.md](../deployment/backup-restore.md#after-restore--operator-checklist), [operator-checklist.md](../deployment/operator-checklist.md#after-restore) |
| SMTP recovery covers env-wins vs Team UI + test-send verification | [roles-smtp-recovery.md](../deployment/roles-smtp-recovery.md) |
| Admin recover path after restore documented | [roles-smtp-recovery.md](../deployment/roles-smtp-recovery.md#admin-recovery), [secrets.md](../deployment/secrets.md) |
| Automated backup gate includes SMTP settings row | `npm run verify:backup-restore` (fixture seeds `studio_smtp_settings`) |

## Operator runbook (summary)

No maintainer intervention required if the operator follows:

1. **Backup:** `data/` + `uploads/` together (+ secure `.env` copy).
2. **Restore:** stop container → replace both dirs from same archive → confirm `.env`.
3. **Health:** `curl -fsS http://<host>:3000/health` → `"status":"ok"`.
4. **Login:** Admin signs in (fresh session if `SESSION_SECRET` or DB point-in-time changed).
5. **SMTP:** **Team** → **Test delivery** or **Send test email** until confirmed (env-wins: read-only summary + test only).
6. **Recovery:** if admin password lost → `/recover-admin` with `PLAYBLAST_ADMIN_RECOVERY_TOKEN`.

## Automated evidence (2026-09-19)

Environment: Cloud Agent VM, Node v22.14.0, no Docker daemon.

### `npm run verify:backup-restore`

```
Seeding fixture database, identity rows, media, and avatar...
Creating backup archive of data/ and uploads/...
Wiping live data and uploads...
Restoring from backup archive...
Verifying restored SQLite integrity, identity rows, media, and avatar...
note: docker is unavailable; skipped container-volume backup checks (filesystem gate only).
Backup/restore verification passed.
```

Fixture now includes: projects, studios, users, invitations, sessions, avatars, uploads, and **`studio_smtp_settings`** with `test_verified_at` — verified after tar restore.

### Server tests (focused)

```
npx tsx --test src/storage/backup-restore.test.ts src/identity/smtp-env.test.ts
# 5 tests, 0 failures
```

SMTP env precedence suite confirms: env-wins reporting, UI settings ignored for delivery when env complete, UI updates forbidden when env complete, UI path when env incomplete.

## Manual gates (operator-owned)

Record dated results when executed on a production-like host. Do not fabricate.

| Gate | Command / action | Status | Date | Notes |
|------|------------------|--------|------|-------|
| Filesystem backup/restore | `npm run verify:backup-restore` | Pass (automated) | 2026-09-19 | This VM |
| Post-restore Admin login + SMTP test | Operator checklist § After restore | Pending | | Requires live instance |
| `/recover-admin` after restore | roles-smtp-recovery.md | Pending | | Requires recovery token on host |
| NAS / container volume restore drill | Hyper Backup or equivalent | Pending | | Hardware-specific |
| Live SMTP to real mailbox | Team → Send test email | Pending | | Operator relay credentials |

## Related documentation updated

- `docs/deployment/backup-restore.md` — post-restore checklist, SMTP honesty
- `docs/deployment/roles-smtp-recovery.md` — env vs UI paths, post-restore SMTP recovery
- `docs/deployment/operator-checklist.md` — After restore section
- `docs/deployment/secrets.md` — SMTP backup inclusion by path
- `docs/deployment/operator-responsibilities.md` — restore row in recovery split

## Phase 7 note

This evidence supports the unchecked audit item *“Run clean install, upgrade, backup, restore, recovery, SMTP capture/delivery, and media tests.”* Filesystem backup/restore and SMTP recovery **documentation + automated gate** are satisfied here. Full Phase 7 exit still requires dated operator execution of manual rows above (and related T7 clean-install evidence).
