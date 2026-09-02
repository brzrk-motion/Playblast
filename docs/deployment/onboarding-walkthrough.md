# First-run onboarding walkthrough

This walkthrough describes the complete path from a clean install to role-specific login. Use it for operator QA and studio onboarding. Screens show the Playblast dark UI with the clapperboard mark on setup cards.

## 1. Install (operator)

1. Deploy Playblast per [install guide](./install-linux-nas.md).
2. Set `SESSION_SECRET` in `.env` (32+ characters).
3. Start the container and confirm health:

```bash
curl -fsS http://<host>:3000/health
```

Expected: `"status":"ok"`, `"database":"ok"`.

4. Open `http://<host>:3000` in a desktop browser.

**Clean install signal:** API returns setup status `pending` (no users yet).

## 2. Create Admin (first visitor)

Route: `/setup`

1. **Create admin account** form — enter name, email, and password.
2. Submit → redirected to studio setup.

Only one bootstrap admin can be created per instance. If setup was already started, the page offers **Continue setup** or **Sign in**.

## 3. Name the studio (Admin)

Route: `/setup/studio`

1. Enter studio display name (shown in sidebar and account menu).
2. Optionally upload a square avatar (JPEG, PNG, WebP, GIF).
3. Continue → setup complete preview.

## 4. Finish setup (Admin)

Route: `/setup/complete`

1. Review studio identity preview.
2. **Continue to Playblast** → dashboard (`/`).

Setup checklist on this screen:

- Invite Creative and Proofing teammates from **Team**
- Configure SMTP before sending email invitations
- Create a project and upload a first deliverable to validate proofing

## 5. Configure SMTP and invite (Admin)

Route: `/team`

1. Configure SMTP and run **Test delivery**.
2. **Invite member** — email, display name, role (Creative or Proofing).
3. Copy the invite link from the email or resend if needed.

## 6. Accept invitation (Creative or Proofing)

Route: `/invite/<token>` (from email link)

1. Invitee sets name and password.
2. Submit → signed in to the studio dashboard.

## 7. Role-specific login (returning users)

Route: `/login`

1. Enter email and password.
2. Admin lands on full dashboard including **Team** and **Settings**.
3. Creative sees proofing and project management surfaces permitted by role.
4. Proofing sees review surfaces; project structure editing is denied server-side.

## 8. One proofing cycle (all roles)

Suggested smoke test:

1. **Admin or Creative:** create project → deliverable → upload version.
2. **Proofing:** open deliverable, add timestamped comment and annotation.
3. **Admin or Creative:** upload v2, use compare view.
4. **Proofing:** approve or request changes per workflow.

## Role experience summary

```
┌─────────────────────────────────────────────────────────────┐
│ Admin          │ Team, SMTP, settings, full proofing      │
├────────────────┼────────────────────────────────────────────┤
│ Creative       │ Projects, uploads, versions, review        │
├────────────────┼────────────────────────────────────────────┤
│ Proofing       │ View, comment, annotate, compare, download │
└─────────────────────────────────────────────────────────────┘
```

## Deployment errors (browser)

| Screen | Meaning | Remediation |
|--------|---------|-------------|
| Server unavailable | API unreachable or 5xx | Check container running, port, firewall, logs |
| Session expired | Idle past TTL | Sign in again at `/login` |
| Forbidden | Role cannot access route | Use correct account or ask Admin for role change |

Configuration failures (missing `SESSION_SECRET`, unwritable volumes) appear in container logs; the UI shows a generic unavailable state — see [install troubleshooting](./install-linux-nas.md#troubleshooting).

## Offline / self-hosted check

No brzrk cloud account, license server, or external API key is required after install. SMTP is the only optional outbound integration for email invitations.
