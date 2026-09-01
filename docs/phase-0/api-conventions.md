# API conventions

Source of truth: `@playblast/shared` (`api-error.ts`).

## Error envelope

All MVP auth, setup, team, and invitation endpoints return:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": { "field": ["message"] }
}
```

## Status code mapping

| Code | HTTP | When |
|------|------|------|
| `VALIDATION_FAILED` | 400 | Invalid input, malformed invite link |
| `UNAUTHENTICATED` | 401 | Missing or invalid session |
| `SESSION_EXPIRED` | 401 | Expired session cookie/token |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `SETUP_NOT_COMPLETE` | 403 | Normal routes blocked until setup finishes |
| `NOT_FOUND` | 404 | Missing resource; no existence leak across studios |
| `CONFLICT` | 409 | Duplicate email, used invite, setup race |
| `INVITE_ALREADY_USED` | 409 | Invite acceptance replay |
| `SETUP_ALREADY_COMPLETE` | 409 | Repeated bootstrap admin creation |
| `PAYLOAD_TOO_LARGE` | 413 | Upload exceeds `MAX_UPLOAD_SIZE` |
| `INVITE_EXPIRED` | 410 | Expired invitation token |
| `INVITE_REVOKED` | 410 | Revoked invitation token |
| `DELIVERY_FAILED` | 502 | SMTP send failure after validation |
| `RATE_LIMITED` | 429 | Login, invite, or resend throttling |
| `SERVER_UNAVAILABLE` | 503 | Process or dependency unavailable |

## Client handling

- Map codes to shared UI states via `getUiStateForErrorCode()`.
- Never trust client-supplied role, studio, or author identifiers.
- Generic auth failure copy must not reveal whether an email exists.

## Legacy routes

Existing proofing routes continue returning `{ error: string }` until Phase 5 migration. New identity/setup routes adopt the full envelope from Phase 1.
