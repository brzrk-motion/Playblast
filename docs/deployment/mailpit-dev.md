# Mailpit (development and CI only)

Mailpit is an **email catcher** for local development and automated tests. It captures outbound SMTP messages so you can inspect invitations without sending real email.

Mailpit is **not** a production mail relay. A successful invite captured in Mailpit does **not** prove production deliverability.

## Docker Compose (recommended local stack)

Start Playblast with the development overlay:

```bash
cp docker-compose.env.example .env
# Set SESSION_SECRET in .env (32+ random characters)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

The dev overlay adds an `axllent/mailpit` service and wires Playblast to it:

| Service | Port | Purpose |
|---------|------|---------|
| Mailpit SMTP | `1025` | Receives outbound mail from Playblast |
| Mailpit UI | `8025` | Web inbox at `http://localhost:8025` |

Production `docker-compose.yml` does **not** include Mailpit. Never add a catcher service to Synology or production compose files.

## Environment wiring

### Compose dev overlay

When using the dev overlay, Playblast receives:

| Variable | Dev value | Notes |
|----------|-----------|-------|
| `SMTP_HOST` | `mailpit` | Docker service name on the compose network |
| `SMTP_PORT` | `1025` | Mailpit SMTP listener |
| `SMTP_SECURE` | `false` | Plain SMTP inside the compose network |
| `SMTP_USER` / `SMTP_PASS` | any value | Mailpit accepts unauthenticated local SMTP |
| `SMTP_FROM` | `noreply@playblast.local` | Shown in captured messages |
| `MAILPIT_URL` | `http://mailpit:8025` | Server-side API base (ignored when `NODE_ENV=production`) |
| `PLAYBLAST_INSTANCE_URL` | `http://localhost:3000` | Used in invitation links |

### Host `npm run dev`

For `npm run dev` on the host (without Docker), point SMTP at a local Mailpit instance:

```bash
MAILPIT_URL=http://localhost:8025
```

Start Mailpit (Docker example):

```bash
docker run --rm -p 8025:8025 -p 1025:1025 axllent/mailpit
```

When `MAILPIT_URL` is set and full `SMTP_*` env vars are absent, Playblast routes outbound mail to Mailpit automatically in development. The Team SMTP card is read-only and includes **Send test email**.

When `NODE_ENV=development` (or `PLAYBLAST_EMAIL_CATCHER=mailpit`) and `SMTP_HOST` is unset, the server may default `SMTP_HOST` to `mailpit`. That default is **never** applied in production.

## How routing works

| Condition | SMTP source |
|-----------|-------------|
| All required `SMTP_*` env vars set | Environment (read-only Team UI) |
| `MAILPIT_URL` set, `NODE_ENV=development`, no env SMTP, no UI SMTP saved | Mailpit dev catcher (read-only Team UI) |
| Admin saved SMTP in Team settings | SQLite UI settings (editable form) |

Default Mailpit SMTP target when routing from `MAILPIT_URL`:

| Setting | Default |
|---------|---------|
| Host | Hostname from `MAILPIT_URL` (usually `localhost`) |
| Port | `1025` (override with `MAILPIT_SMTP_PORT`) |
| TLS | `none` |
| Auth | None |
| From | `dev@localhost` |

Before test-send or invitation delivery, Playblast checks that the Mailpit web API responds at `MAILPIT_URL`. If Mailpit is not running, test-send returns a clear delivery error.

## Production guardrails

Production startup **refuses** SMTP configuration that points at known catchers, including:

- host `mailpit` (any port)
- `localhost`, `127.0.0.1`, or `::1` on port `1025`

`MAILPIT_URL` and `PLAYBLAST_EMAIL_CATCHER` are ignored in production. Setting `PLAYBLAST_EMAIL_CATCHER=mailpit` in production also prevents startup.

Configure a real studio relay (Google Workspace, Microsoft 365, Brevo SMTP, etc.) for production invitations. See [Roles, SMTP, and recovery](./roles-smtp-recovery.md).

## Workflow

1. Start the dev compose stack or local Mailpit (above).
2. Complete Playblast setup and open **Team** → run **Send test email**.
3. Open the Mailpit UI at `http://localhost:8025` and confirm the test message arrived.
4. Send an invitation and verify the captured invite in Mailpit.

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

## References

- [Mailpit project](https://mailpit.axllent.org/)
- [Mailpit SMTP configuration](https://mailpit.axllent.org/docs/configuration/smtp)
