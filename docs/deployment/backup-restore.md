# Backup and restore

All application state for one studio lives on the filesystem. There is no separate database server.

## What to back up

| Location | Contents | Required |
|----------|----------|----------|
| `DB_PATH` directory | `playblast.db` plus WAL/SHM files if present | Yes |
| `UPLOAD_DIR` | Project videos, deliverable files, studio avatars under `avatars/` | Yes |
| `.env` on the host | `SESSION_SECRET`, recovery token, optional emergency auth | Recommended (store securely, not in the DB backup) |

### Included in the database file

The SQLite database holds:

- Studio profile and setup state (`studios.setup_status`)
- Users, password hashes, and disabled flags
- Sessions (hashed tokens) — restoring an old DB may invalidate current browser sessions
- Invitations (hashed tokens, pending/accepted/revoked status)
- SMTP settings (credentials stored in the local DB)
- Projects, deliverables, versions, comments, annotations, approvals, and related metadata

### Included in uploads

- Video and media files referenced by the database
- Studio avatar images (`uploads/avatars/<studioId>/...`)

### Not included

- Browser cookies on user machines (users sign in again after restore if sessions changed)
- Plaintext invitation links already emailed (re-send invites after a restore if needed)
- Docker images (re-pull or re-load from tarball)
- Host TLS certificates and reverse-proxy configuration

## Backup procedure

1. **Quiesce writes** (recommended): stop the Playblast container or schedule backups during low activity.
2. Archive both directories:

```bash
tar -C /path/to/playblast -czf playblast-backup-$(date +%Y%m%d).tar.gz data uploads
```

On Synology, include the bind-mount folders in Hyper Backup or an equivalent job.

3. Store backups off the NAS/host. Test restores periodically.

## Restore procedure

1. Stop the Playblast container.
2. Replace `data/` and `uploads/` with the backup copy (or extract the archive over the mount paths).
3. Ensure file ownership allows the container to read/write.
4. Start the container.
5. Verify:

```bash
curl -fsS http://<host>:3000/health
```

6. Sign in. Users may need to log in again if session rows changed.

## Session revocation semantics

These actions invalidate existing sessions (by design):

- User password change
- Admin recovery flow
- Restoring a database backup from a different point in time

After restore, ask team members to sign in again. Pending invitations remain valid only if the restored DB still contains the same invitation rows and tokens.

## Automated verification

```bash
npm run verify:backup-restore
```

This script seeds a temporary database and uploads (including identity-style tables), archives them, wipes live dirs, restores, and checks SQLite `integrity_check` plus file bytes. It does not require Docker and does not read host `.env` secrets.

Container volume and Synology Hyper Backup end-to-end checks remain a manual operator step.

## Partial restore

Restoring only the database or only uploads leads to broken references (missing videos or orphaned files). Always restore **both** directories from the same backup point in time.
