# Local Mailpit development

Mailpit captures outbound SMTP in development without delivering real email. Use it when exercising Team SMTP test-send, invitations, and password recovery flows on a workstation.

Mailpit is **not** a production mail service. Production deployments must use a real SMTP relay configured through environment variables or the Team UI.

## Quick start

1. Install and start Mailpit (Docker example):

```bash
docker run --rm -p 8025:8025 -p 1025:1025 axllent/mailpit
```

2. Add to your repo-root `.env`:

```bash
MAILPIT_URL=http://localhost:8025
```

3. Start Playblast (`npm run dev`).

4. Sign in as Admin → **Team**. When `MAILPIT_URL` is set and full `SMTP_*` env vars are absent, Playblast routes outbound mail to Mailpit automatically in development. The SMTP card is read-only and includes **Send test email**.

5. Open the Mailpit web UI at http://localhost:8025 to inspect captured messages.

## How routing works

| Condition | SMTP source |
|-----------|-------------|
| All required `SMTP_*` env vars set | Environment (read-only Team UI) |
| `MAILPIT_URL` set, `NODE_ENV=development`, no env SMTP, no UI SMTP saved | Mailpit dev catcher (read-only Team UI) |
| Admin saved SMTP in Team settings | SQLite UI settings (editable form) |

`MAILPIT_URL` is ignored when `NODE_ENV=production`.

Default Mailpit SMTP target:

| Setting | Default |
|---------|---------|
| Host | Hostname from `MAILPIT_URL` (usually `localhost`) |
| Port | `1025` (override with `MAILPIT_SMTP_PORT`) |
| TLS | `none` |
| Auth | None |
| From | `dev@localhost` |

Before test-send or invitation delivery, Playblast checks that the Mailpit web API responds at `MAILPIT_URL`. If Mailpit is not running, test-send returns a clear delivery error.

## Test hooks

Server helpers live in `server/src/identity/mailpit.ts`:

- `isMailpitReachable(apiUrl)` — health check against `/api/v1/info`
- `listMailpitMessages(apiUrl)` — list captured messages
- `waitForMailpitMessage(apiUrl, recipient)` — poll for a recipient
- `deleteAllMailpitMessages(apiUrl)` — clear the catcher

Playwright and CI helpers mirror the message API in `e2e/helpers/mailpit.ts`.

File capture for automated tests (no live Mailpit required) uses `PLAYBLAST_SMTP_CAPTURE_DIR` with `PLAYBLAST_E2E_TEST_MODE=1`; see `e2e/helpers/smtp-capture.ts`.

## Explicit UI SMTP vs Mailpit dev

Saving SMTP credentials in Team settings always takes precedence over Mailpit dev routing. Use that path when you need to test TLS modes, authentication, or a non-default Mailpit port.

## Related issues

- Compose service and production guardrails: BRZ-193
- CI Mailpit job: BRZ-194
- Playwright assertions via Mailpit API: BRZ-195
