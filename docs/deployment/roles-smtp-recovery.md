# Roles, SMTP, and recovery

## Application roles

Every user belongs to the single studio on this self-hosted instance. The server enforces roles; hidden UI is not authorization.

| Role | Summary |
|------|---------|
| **Admin** | Installation setup, studio profile, team and SMTP, full proofing capabilities |
| **Creative** | Create and edit proofing work, upload media, manage versions, participate in review |
| **Proofing** | Review deliverables; comment, annotate, compare, and download; cannot restructure projects |

Admins invite Creative and Proofing users from **Team**. Invitations require working SMTP (or manual link sharing from the invite email flow once SMTP delivers).

## SMTP setup (Admin)

1. Sign in as Admin → **Team**.
2. Open SMTP settings.
3. Enter host, port, TLS mode, username, and password for your studio's mail relay.
4. Run **Test delivery** to a reachable inbox.
5. Save settings before sending invitations.

If SMTP is unavailable, the instance remains usable for signed-in users, but new email invitations will not deliver until test delivery succeeds.

SMTP credentials live in the local database. Back up `data/` to protect them.

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
