# Secrets and permissions

Playblast never commits credentials to the repository. Operators configure secrets on the host.

## SESSION_SECRET

| Topic | Guidance |
|-------|----------|
| Purpose | Signs session cookies and CSRF tokens |
| Required | Yes in `NODE_ENV=production` |
| Minimum length | 32 characters |
| Missing at startup | Server exits with `SESSION_SECRET is required in production` |
| Too short | Server exits with length validation error |
| Rotation | Set a new value and restart; all users must sign in again |
| Backup | Store in your password manager and/or a secure copy of `.env` **outside** the DB backup |
| Logs | Never logged by Playblast on successful startup |

Generate on Linux/macOS:

```bash
openssl rand -base64 48
```

## PLAYBLAST_ADMIN_RECOVERY_TOKEN

| Topic | Guidance |
|-------|----------|
| Purpose | Operator-held token for `/recover-admin` when the admin password is lost |
| Required | No, but strongly recommended for production |
| Storage | Password manager or sealed host secret; not in git |
| Missing | Recovery page returns an error; operator must restore from backup or set token and restart |
| Rotation | Set new token, restart container, distribute to trusted operators only |

Playblast compares a SHA-256 hash of the submitted token to a hash of the configured value. The plain token is not stored in the database.

## Emergency Basic Auth (optional)

`PLAYBLAST_EMERGENCY_BASIC_AUTH=true` enables deployment-wide Basic Auth **only until setup completes**. It is not the normal login path.

If enabled without `PLAYBLAST_AUTH_USER` and `PLAYBLAST_AUTH_PASSWORD`, production startup fails.

## SMTP credentials

Admins configure SMTP in the Team UI. Values are stored in the local SQLite database. Include the database backup when protecting SMTP configuration. Do not commit SMTP passwords to compose files or git.

## File permissions

| File / directory | Recommendation |
|------------------|----------------|
| `.env` on host | `chmod 600`, owned by the operator account that manages Docker |
| `data/` | Writable by container user; not world-readable on multi-tenant hosts |
| `uploads/` | Writable by container user |
| Backup archives | Encrypt at rest; restrict access to operators |

## Process exposure

- Playblast listens on `PORT` (default 3000) inside the container.
- Map only the required host port; prefer reverse proxy or VPN for remote access.
- Do not expose the Docker socket to the Playblast container.

## Backup inclusion and exclusion

| Secret | Include in DB backup | Include in `.env` backup |
|--------|----------------------|---------------------------|
| `SESSION_SECRET` | No (not in DB) | Yes |
| Recovery token | No | Yes |
| SMTP password | Yes (in DB) | No (configured in app) |
| User passwords | Hashed in DB only | N/A |

After restoring an old database while using a **new** `SESSION_SECRET`, existing session cookies become invalid.

## What Playblast does not require

No centralized brzrk network dependency, license server, or cloud API key is required for offline self-hosted operation. SMTP is only needed for email invitations.
