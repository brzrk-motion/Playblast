# T6 — Soft-RC live mailbox invite evidence

**Issue:** [BRZ-238](https://linear.app/brzrk-motion-studio/issue/BRZ-238)  
**Branch:** `development-mvp`  
**Pack:** Soft-RC — live SMTP invitation to a real external mailbox

This document records operator-verifiable evidence that a **production SMTP relay** delivers a Playblast team invitation to a real mailbox. It does **not** close the live-SMTP gate by itself until the evidence log contains a dated operator row with outcome.

## What does **not** substitute for this evidence

The following prove transport wiring only — they do **not** prove production deliverability to an external inbox:

| Signal | Why it is insufficient |
|--------|------------------------|
| Mailpit dev catcher (`MAILPIT_URL`, local port 1025) | Captures mail locally; never leaves the host |
| CI Mailpit job (`npm run verify:smtp-mailpit`, BRZ-194) | Docker Mailpit on `127.0.0.1:1025`; not a live relay |
| File capture (`PLAYBLAST_SMTP_CAPTURE_DIR` in e2e) | Writes `.eml` to disk; no network delivery |
| SMTP test-send to Mailpit | Verifies Nodemailer + config; not inbox placement |
| Unit/integration mocks | No real transport |

Soft-RC honesty: **Mailpit ≠ prod deliverability.** CI/catcher proof does not close this gate.

## Preconditions

1. A **Soft-RC** Playblast instance (`NODE_ENV=production`) reachable by the operator — not a dev server with `MAILPIT_URL`.
2. **Verified SMTP** on that instance: Team UI shows test delivery succeeded (`testVerified: true` / invite action enabled). Invites are server-gated on verified SMTP; there is no secure invite-link fallback.
3. A real recipient mailbox the operator controls (personal or studio inbox). Use a throwaway invitee if you will revoke the invitation afterward.
4. Production compose must have **no** Mailpit service and must not point SMTP at catcher hosts (see BRZ-193 guardrails).

## Operator procedure

Perform on the Soft-RC instance only. Do not paste secrets into this log.

### 1. Confirm SMTP verified (Admin)

1. Sign in as Admin → **Team** (`/team`).
2. Confirm SMTP status shows **verified** (successful test delivery). If using env-preconfigured SMTP, settings are read-only but test-send is still required.
3. Note the **provider class** (see table below) — hostnames only, no credentials.

### 2. Send one invitation

1. On **Team**, click **Invite member**.
2. Enter invitee display name, a real external email address, and role **Creative** or **Proofing**.
3. Submit. Expect UI success (invitation `pending`, delivery `sent`) — not `delivery_failed`.
4. Do **not** copy or record the invite link or token from the email body.

### 3. Confirm inbox receipt

1. Open the recipient mailbox (webmail or client).
2. Confirm an invitation message arrived from the configured sender (`SMTP_FROM`).
3. Optional: open the message and confirm subject/body mention the studio name and instance URL — **do not** paste the acceptance link or token into this evidence log.
4. Optional smoke: complete invite acceptance on a private browser window, then revoke or disable the test user.

### 4. Record evidence

Fill the **Evidence log** row below with UTC date, provider class, outcome, and safe notes (no secrets).

## Provider class taxonomy

Record one class per attempt (not the relay password or API key):

| Class | Examples |
|-------|----------|
| `google_workspace` | Google Workspace / Gmail SMTP relay |
| `microsoft_365` | Microsoft 365 / Outlook SMTP |
| `transactional_smtp` | Brevo, Mailjet, SendGrid SMTP relay |
| `amazon_ses` | Amazon SES SMTP endpoint |
| `isp_business` | ISP or domain host SMTP |
| `self_hosted` | Studio-operated Postfix/Exim (discouraged for MVP) |
| `other` | Any other authenticated relay — name the vendor in Notes |

## Evidence log

| Check | Date (UTC) | Instance (host class) | Provider class | Recipient domain | Result | Notes |
|-------|------------|----------------------|----------------|--------------|--------|-------|
| Live mailbox invitation | | Soft-RC production | | | **Open** | Operator row required — Mailpit/CI does not substitute |

**Do not** record passwords, SMTP secrets, full message bodies, or invite tokens in this table.

## Gate status (honest)

| Gate | Status | Rationale |
|------|--------|-----------|
| T6 live mailbox invite | **Open** | No dated operator row with external inbox confirmation |
| Mailpit / CI catcher parity | **Passed** (engineering) | `npm run verify:smtp-mailpit` (BRZ-194) — transport only, not T6 closure |
| Phase 7 live SMTP delivery | **Open** | Depends on T6 operator evidence |
| Soft-RC SMTP honesty | **Enforced** | Invite gated on verified SMTP; no invite-link fallback (BRZ-237) |

## Related automation (reference only)

```bash
# CI / dev — proves catcher capture, NOT live mailbox delivery
npm run verify:smtp-mailpit
```

## Related docs and issues

- [Roles, SMTP, and recovery](../deployment/roles-smtp-recovery.md)
- [Mailpit dev (not production)](../deployment/mailpit-dev.md)
- [Onboarding walkthrough §5](../deployment/onboarding-walkthrough.md)
- BRZ-174 (env-aware SMTP UI), BRZ-193 (prod catcher refuse), BRZ-194 (CI Mailpit)
