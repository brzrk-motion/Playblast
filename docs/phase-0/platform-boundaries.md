# Platform boundaries

Source of truth: `@playblast/shared` (`platform-boundaries.ts`).

## Runtime

| Boundary | MVP value |
|----------|-----------|
| Node minimum | 20.19.0 |
| Docker image | `node:20-alpine` |
| Release target | Supported Node LTS before Phase 7 |

## Deployment

- Docker Compose with persistent `/app/data` and `/app/uploads` volumes.
- Documented Synology Container Manager and Linux bind-mount paths.
- Public health check at `/health`.

## Clients

| Surface | Support |
|---------|---------|
| Desktop browsers | Chrome, Firefox, Safari, Edge (current − 1) |
| Tablet | Setup, login, review, Team, profile at desktop breakpoints |
| Mobile | Out of MVP scope |

## Media and storage

- Upload limit from `MAX_UPLOAD_SIZE` (default 5000 MB).
- Media on local filesystem at `UPLOAD_DIR`.
- Playback via browser-supported codecs; professional codecs not guaranteed.

## Database

- SQLite file at `DB_PATH`.
- Driver: `better-sqlite3` for MVP.
- Drizzle ORM for new identity tables; legacy SQL migrations stay authoritative until reconciled.

## Email

- Generic SMTP with TLS for production.
- Mailpit or equivalent capture transport for development and automated tests.
- No centralized brzrk credential or API token.
