# Operations contract

Source of truth: `@playblast/shared` (`operations.ts`).

## Data ownership

The studio owns:

- SQLite database file
- Uploaded media and studio avatars
- SMTP credentials encrypted in the local SQLite database
- Session and invitation token hashes

Playblast does not host studio media, plaintext passwords, invite tokens, or SMTP secrets centrally.

## Backup and restore

- Required paths: database directory (`DB_PATH`) and uploads directory (`UPLOAD_DIR`).
- Canonical verification: `npm run verify:backup-restore`.
- Backup before schema migrations.
- Backups include sessions, invites, and setup state.

## Deletion

Admin-only destructive actions:

- Archive/delete projects and deliverables
- Disable or remove users
- Revoke pending invitations
- Replace or delete studio avatar

Creatives and Proofing users cannot delete studio data.

## Recovery

- Lost admin credential: documented recovery without plaintext password storage.
- SMTP unavailable: instance remains usable; invitations blocked until test delivery succeeds.
- Password change and admin recovery invalidate affected sessions.

## Support boundary

- Self-hosted, open-source, one instance per studio.
- No founder support commitments; public issue tracking only.
- Studio responsible for Docker host, networking, HTTPS/VPN, SMTP deliverability, and backup drills.
