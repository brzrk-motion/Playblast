# Backup and restore

All application state for one studio lives on the filesystem. There is no separate database server.

For the short maintenance-day sequence (backup → upgrade → verify → rollback), see the [operator checklist](./operator-checklist.md).

## What to back up

| Location | Contents | Required |
|----------|----------|----------|
| `DB_PATH` directory | `playblast.db` plus WAL/SHM files if present | Yes |
| `UPLOAD_DIR` | Project videos, deliverable files, studio avatars under `avatars/` | Yes |
| `.env` on the host | `SESSION_SECRET`, recovery token, optional emergency auth, optional `SMTP_*` env vars | Recommended (store securely, not in the DB backup) |

### Included in the database file

The SQLite database holds:

- Studio profile and setup state (`studios.setup_status`)
- Users, password hashes, and disabled flags
- Sessions (hashed tokens) — restoring an old DB may invalidate current browser sessions
- Invitations (hashed tokens, pending/accepted/revoked status)
- SMTP settings (Team UI credentials encrypted in DB; test verification timestamps)
- Projects, deliverables, versions, comments, annotations, approvals, and related metadata

### Included in uploads

- Video and media files referenced by the database
- Studio avatar images (`uploads/avatars/<studioId>/...`)

### Not included

- Browser cookies on user machines (users sign in again after restore if sessions changed)
- Plaintext invitation links already emailed (re-send invites after a restore if needed)
- Docker images (re-pull or re-load from tarball)
- Host TLS certificates and reverse-proxy configuration
- Env-based SMTP passwords when using the [environment SMTP path](./roles-smtp-recovery.md#smtp-configuration-paths) (credentials live in `.env`, not SQLite)

## Backup procedure

1. **Quiesce writes** (recommended): stop the Playblast container or schedule backups during low activity.
2. Archive both directories:

```bash
tar -C /path/to/playblast -czf playblast-backup-$(date +%Y%m%d).tar.gz data uploads
```

On Synology, include the bind-mount folders in Hyper Backup or an equivalent job.

3. Copy `.env` to secure storage separately (password manager or encrypted archive).
4. Store backups off the NAS/host. Test restores periodically.

## Restore procedure

1. Stop the Playblast container.
2. Replace `data/` and `uploads/` with the backup copy (or extract the archive over the mount paths).
3. Restore or confirm host `.env` — especially `SESSION_SECRET`, `PLAYBLAST_ADMIN_RECOVERY_TOKEN`, and `SMTP_*` if used.
4. Ensure file ownership allows the container to read/write.
5. Start the container.
6. Verify:

```bash
curl -fsS http://<host>:3000/health
```

7. Follow [After restore — operator checklist](#after-restore--operator-checklist) below.

## After restore — operator checklist

Complete these steps in order. Details for SMTP and admin recovery are in [roles, SMTP, and recovery](./roles-smtp-recovery.md).

| Step | Actor | Action | Pass criteria |
|------|-------|--------|---------------|
| 1 | Operator | Confirm `/health` | `"status":"ok"`, `"database":"ok"` |
| 2 | Operator | Confirm `.env` secrets | `SESSION_SECRET` present; recovery token and `SMTP_*` match intended production values |
| 3 | Admin | Sign in at `/login` | Dashboard loads (all users may need fresh login) |
| 4 | Admin | **Team** → SMTP | Run **Test delivery** or **Send test email**; status shows delivery confirmed |
| 5 | Admin | Smoke proofing | Open one project, play video, add comment |
| 6 | Admin | Invitations (if needed) | **Invite member** available only after SMTP test succeeds |

**If admin password is unknown:** operator directs Admin to `/recover-admin` with `PLAYBLAST_ADMIN_RECOVERY_TOKEN` (see [Admin recovery](./roles-smtp-recovery.md#admin-recovery)).

**If SMTP test fails after restore:**

- **Env SMTP:** update `SMTP_*` in `.env`, restart container, re-test from **Team**.
- **Team UI SMTP:** re-enter credentials on **Team** if `SESSION_SECRET` changed since backup (encrypted passwords may not decrypt).

## Session revocation semantics

These actions invalidate existing sessions (by design):

- User password change
- Admin recovery flow
- Restoring a database backup from a different point in time
- Rotating `SESSION_SECRET` while keeping an old database

After restore, ask team members to sign in again. Pending invitations remain valid only if the restored DB still contains the same invitation rows and tokens.

## SMTP and invite honesty after restore

Invitations require `testVerified` on the server. A restored database may still show a prior successful test, but operators should **always re-run test delivery** after restore so invite gating reflects current relay health.

| SMTP path | After restore |
|-----------|---------------|
| Team UI | DB row restored; re-run **Test delivery** on **Team** |
| Environment | Relay from `.env`; DB may hold old `test_verified_at` — re-run **Send test email** |

See [Post-restore SMTP recovery](./roles-smtp-recovery.md#post-restore-smtp-recovery).

## Automated verification

```bash
npm run verify:backup-restore
```

This script seeds a temporary database and uploads (including identity tables, SMTP settings, avatars, invites, and sessions), archives them, wipes live dirs, restores, and checks SQLite `integrity_check` plus file bytes. It does not require Docker and does not read host `.env` secrets.

Container volume and Synology Hyper Backup end-to-end checks remain a manual operator step.

## Partial restore

Restoring only the database or only uploads leads to broken references (missing videos or orphaned files). Always restore **both** directories from the same backup point in time.
