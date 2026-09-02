# Upgrade and rollback

## Upgrade

1. Read release notes for migration changes ([migrations](./migrations.md)).
2. Back up `data/` and `uploads/` ([backup and restore](./backup-restore.md)).
3. Build or load the new image (`npm run build:deploy` or `docker compose build`).
4. Stop the running container.
5. Start the new image against the **same** volumes.
6. Watch logs for migration completion.
7. Confirm health and sign in:

```bash
curl -fsS http://<host>:3000/health
```

Migrations run automatically on startup. For large instances, plan a short maintenance window.

## Rollback (unsupported downgrade)

Running an **older** Playblast version against a database that already applied **newer** migrations is unsupported and may fail or corrupt data.

Safe rollback:

1. Stop the container.
2. Restore `data/` and `uploads/` from a backup taken **before** the failed upgrade.
3. Start the previous image tag on the restored volumes.

There is no partial schema rollback.

## Image-only rollback

If the new image fails before writing migrations (e.g. bad env var), you may switch back to the previous image without restoring data. Check logs — if any migration id was recorded, treat the database as upgraded and use filesystem restore instead.

## Session and invite effects

Upgrades that change session or auth behavior may sign users out once. Communicate a brief maintenance window to the studio.

Pending invitations survive upgrades when the database is unchanged. After a full filesystem restore, re-send invites if tokens may have been rotated.

## Verification after upgrade

- `GET /health` → `"status":"ok"`, `"database":"ok"`
- Admin can sign in
- Creative/Proofing smoke test on one project
- SMTP test from Team settings (if invitations are used)

Automated checks when Docker is available:

```bash
npm run verify:docker-deployment
npm run verify:backup-restore
```
