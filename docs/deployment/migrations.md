# Database migrations

Playblast uses two migration layers on the same SQLite file. Understanding the order matters for upgrades and backups.

## Migration order

On every startup (and via `npm run migrate`):

1. **Base schema** — `server/src/storage/schema.sql` creates core proofing tables if missing.
2. **Legacy SQL migrations** — numbered files in `server/src/storage/migrations/` tracked in `schema_migrations`.
3. **Drizzle identity migrations** — files in `server/src/db/migrations/` tracked in `__drizzle_migrations` (users, studios, sessions, invitations, SMTP settings).

Legacy migrations always run before Drizzle identity migrations. Do not run Drizzle tooling against a database that has not completed legacy migrations.

## Backup before migrating

Take a filesystem backup of both persistent directories before upgrading to a release that adds migrations:

- `DB_PATH` parent directory (the SQLite file and WAL/SHM sidecars if present)
- `UPLOAD_DIR` (media and avatars)

Canonical verification:

```bash
npm run verify:backup-restore
```

On Docker hosts, stop the container or ensure no writes during backup for a crash-consistent copy, or use your platform's volume snapshot tooling.

## Upgrade procedure

1. Back up `data/` and `uploads/`.
2. Build or pull the new image.
3. Stop the running container.
4. Start the new container on the same volumes.
5. Migrations run automatically on startup.
6. Confirm `GET /health` returns `"database":"ok"`.
7. Sign in and smoke-test setup status, team, and one proofing path.

Manual migration (without starting the server):

```bash
npm run migrate
```

## Interrupted migration behavior

SQLite DDL in legacy migrations is applied per file inside a transaction where possible. If startup fails mid-migration:

- Do **not** delete the database file immediately.
- Inspect server logs for the failing migration id.
- Restore from the pre-upgrade backup if the database is inconsistent.
- After restore, fix the underlying issue (disk full, permissions) before retrying.

Drizzle's migrator records applied migrations in `__drizzle_migrations`. Re-running startup skips completed steps.

## Unsupported downgrade

**Downgrading to an older Playblast release against a database that ran newer migrations is unsupported.** Older code may not recognize new tables or columns and can fail at startup or corrupt data.

If you must roll back:

1. Stop the container.
2. Restore both `data/` and `uploads/` from a backup taken **before** the upgrade.
3. Start the older image on the restored volumes.

There is no in-app "migration undo."

## JSON → SQLite legacy path

Very old installations may have used JSON storage. The one-time `scripts/migrate-json-to-sqlite.js` script is for historical imports only. New installs use SQLite from first boot.
