# Roles, SMTP, and recovery

## Application roles

Every user belongs to the single studio on this self-hosted instance. The server enforces roles; hidden UI is not authorization.

| Role | Summary |
|------|---------|
| **Admin** | Installation setup, studio profile, team and SMTP, full proofing capabilities |
| **Account Executive** | Full CRM and financial operations, project/deliverable review, and read-only Team membership |
| **Creative** | Create and edit proofing work, upload media, manage versions, participate in review |
| **Proofing** | Review deliverables; comment, annotate, compare, and download; cannot restructure projects or view commercial details |

Admins invite Account Executive, Creative, and Proofing users from **Team**. Invitations require working SMTP **and** a successful test delivery (see [Invite gating](#invite-gating-test-verified-honesty) below).

## SMTP configuration paths

Playblast supports two ways to supply outbound mail credentials. Only one path is active per instance.

| Path | When it applies | Where credentials live | Admin UI |
|------|-----------------|------------------------|----------|
| **Team UI** (default) | Required SMTP env vars are **not** all set | Encrypted in SQLite (`studio_smtp_settings`) | Full SMTP form on **Team** |
| **Environment** (env-wins) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` are all set | Host `.env` / compose secrets | Read-only summary + **Send test email** only |

### Env-wins behavior

When env SMTP is complete, the server sets `smtpConfiguredFromEnv=true`:

- Connection settings (host, port, user, password, sender) always come from the environment at runtime.
- Stored Team UI SMTP values are **ignored for delivery** (they may still exist in the database from before env was enabled).
- The Admin cannot edit SMTP fields in the UI; attempts to save return a forbidden error.
- `PLAYBLAST_INSTANCE_URL` should be set so invitation links use the correct public URL.

See `.env.example` for the full variable list.

### Team UI behavior

When env SMTP is incomplete:

- Admin configures host, port, TLS mode, username, password, and sender on **Team**.
- Credentials are encrypted in the local database using `SESSION_SECRET`.
- Include `data/` in backups to protect SMTP configuration.

## Invite gating (test-verified honesty)

Email invitations are blocked until SMTP passes a **successful test delivery**:

- **Team UI path:** Admin saves SMTP settings, then runs **Test delivery** (or **Send test email**). On success, `testVerified` becomes true and **Invite member** unlocks.
- **Env path:** Relay credentials come from the environment, but invites remain gated until Admin runs **Send test email** on **Team** and it succeeds. Test results are recorded in the database (`test_verified_at`).

After a backup restore, `testVerified` may still read true from the restored database row, but operators should **re-run test delivery** whenever mail relay, credentials, or network path may have changed (see [Post-restore SMTP recovery](#post-restore-smtp-recovery)).

## SMTP setup (Admin) — Team UI path

1. Sign in as Admin → **Team**.
2. Open SMTP settings.
3. Enter host, port, TLS mode, username, and password for your studio's mail relay.
4. Run **Test delivery** to a reachable inbox.
5. Save settings before sending invitations.

If SMTP is unavailable, the instance remains usable for signed-in users, but new email invitations will not deliver until test delivery succeeds.

## SMTP setup (Admin) — environment path

1. Operator sets all required `SMTP_*` variables (and `PLAYBLAST_INSTANCE_URL`) in host `.env`.
2. Restart the container so the process picks up env values.
3. Admin signs in → **Team** → confirm read-only SMTP summary.
4. Run **Send test email** and confirm delivery to a real inbox.
5. Proceed with invitations once **SMTP delivery confirmed** appears.

Credentials are **not** in the database backup when using env SMTP; protect `.env` separately. Test verification state **is** in the database.

## Post-restore SMTP recovery

Use this after restoring `data/` and `uploads/` from backup ([backup and restore](./backup-restore.md)).

| Configuration path | What restore brings back | What operator must verify |
|--------------------|--------------------------|---------------------------|
| **Team UI** | Encrypted SMTP row in SQLite; prior `testVerified` flag if backup included it | Sign in as Admin → **Team** → run **Test delivery**; fix settings if relay changed |
| **Environment** | `test_verified_at` row if present; live relay still from `.env` | Confirm `.env` `SMTP_*` vars match production relay → **Team** → **Send test email** |

**Decision tree:**

1. Check host `.env`: are all required `SMTP_*` vars set?
   - **Yes (env-wins):** UI shows read-only SMTP summary. Re-run **Send test email**. Do not edit SMTP in the UI.
   - **No (Team UI):** Open SMTP form. Confirm host/port/credentials still correct; re-run **Test delivery**.
2. If test fails, fix relay credentials (in `.env` or Team UI), restart if env changed, and test again.
3. Only invite users after **SMTP delivery confirmed** (or successful test status in Team).

Restoring an old database while keeping a **new** `SESSION_SECRET` invalidates sessions and can prevent decrypting old Team UI SMTP passwords. If decryption fails, re-enter SMTP credentials in Team UI or switch to env SMTP.

## Admin recovery

If the admin password is lost:

1. Operator confirms `PLAYBLAST_ADMIN_RECOVERY_TOKEN` is set in the deployment environment.
2. Browse to `/recover-admin`.
3. Enter the recovery token and set a new admin password.

Recovery invalidates existing admin sessions. Store the recovery token like a root password — not in git.

Without a recovery token, restore the database from backup or redeploy on fresh volumes (losing data).

### Post-restore first login

After any full restore:

1. Operator starts the container and confirms `GET /health` returns `"status":"ok"`.
2. All users sign in again (sessions from the backup may be stale or invalid depending on `SESSION_SECRET`).
3. Admin completes [Post-restore SMTP recovery](#post-restore-smtp-recovery) before sending new invitations.
4. If admin password is unknown **and** recovery token is configured, use `/recover-admin` instead of guessing passwords.

See the [operator checklist](./operator-checklist.md) **After restore** section for the full sequence.

## User password change

Users change passwords from **Profile**. Password change invalidates that user's other sessions.

## Team operations (Admin)

- Invite users by email and role (Creative or Proofing)
- Resend or revoke pending invitations
- Disable users (does not delete proofing history attribution)

## No-support boundary

Playblast does not operate your mail server, DNS SPF/DKIM records, or inbox deliverability. Studios are responsible for SMTP configuration and monitoring bounce/failure states in the Team UI.
