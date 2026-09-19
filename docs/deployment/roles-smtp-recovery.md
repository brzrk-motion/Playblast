# Roles, SMTP, and recovery

## Application roles

Every user belongs to the single studio on this self-hosted instance. The server enforces roles; hidden UI is not authorization.

| Role | Summary |
|------|---------|
| **Admin** | Installation setup, studio profile, team and SMTP, full proofing capabilities |
| **Account Executive** | Full CRM and financial operations, project/deliverable review, and read-only Team membership |
| **Creative** | Create and edit proofing work, upload media, manage versions, participate in review |
| **Proofing** | Review deliverables; comment, annotate, compare, and download; cannot restructure projects or view commercial details |

Admins invite Account Executive, Creative, and Proofing users from **Team**. Invitations require working SMTP (or manual link sharing from the invite email flow once SMTP delivers).

## SMTP setup (Admin)

SMTP is **not** part of the first-run setup wizard. After setup completes, configure email from **Team** (`/team`) or via deployment environment variables (see below).

### Team UI path (default)

1. Sign in as Admin → **Team**.
2. Open SMTP settings.
3. Enter host, port, TLS mode, username, and password for your studio's mail relay.
4. Run **Test delivery** to a reachable inbox.
5. Save settings before sending invitations.

If SMTP is unavailable, the instance remains usable for signed-in users, but new email invitations will not deliver until test delivery succeeds.

SMTP credentials configured in the UI live in the local database. Back up `data/` to protect them.

### Environment path (optional 12-factor override)

When **all** required SMTP variables are set in the deployment environment, Playblast treats SMTP as preconfigured (`smtpConfiguredFromEnv: true`). The Team UI shows read-only settings and blocks UI updates; invitations still require a successful test delivery.

| Variable | Required for env SMTP | Purpose |
|----------|----------------------|---------|
| `SMTP_HOST` | Yes | Relay hostname |
| `SMTP_PORT` | Yes | Relay port (1–65535) |
| `SMTP_SECURE` | Yes | `true`/`false` for implicit TLS |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASS` | Yes | SMTP password |
| `SMTP_FROM` | Yes | Sender address |
| `SMTP_REPLY_TO` | No | Optional reply-to header |
| `PLAYBLAST_INSTANCE_URL` | Recommended | Public URL embedded in invitation links |

Set these in `.env` beside `docker-compose.yml` or in Container Manager env files — never commit values to git. See [secrets and permissions](./secrets.md) and root `.env.example`.

If only some SMTP variables are set, Playblast ignores the partial env block and falls back to Team UI configuration.

## Admin recovery

If the admin password is lost:

1. Operator confirms `PLAYBLAST_ADMIN_RECOVERY_TOKEN` is set in the deployment environment.
2. Browse to `/recover-admin`.
3. Enter the recovery token and set a new admin password.

Recovery invalidates existing admin sessions. Store the recovery token like a root password — not in git.

Without a recovery token, restore the database from backup or redeploy on fresh volumes (losing data).

## User password change

Users change passwords from **Profile**. Password change invalidates that user's other sessions.

## Team operations (Admin)

- Invite users by email and role (Creative or Proofing)
- Resend or revoke pending invitations
- Disable users (does not delete proofing history attribution)

## No-support boundary

Playblast does not operate your mail server, DNS SPF/DKIM records, or inbox deliverability. Studios are responsible for SMTP configuration and monitoring bounce/failure states in the Team UI.
