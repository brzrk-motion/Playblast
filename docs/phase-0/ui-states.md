# UI states

Source of truth: `@playblast/shared` (`ui-states.ts`).

## Required states

| State | When | Primary action |
|-------|------|----------------|
| `loading` | Fetch in progress | — |
| `empty` | Successful fetch with no rows | — |
| `ready` | Primary content available | — |
| `unauthorized` | `UNAUTHENTICATED` | Go to login |
| `forbidden` | `FORBIDDEN`, `SETUP_NOT_COMPLETE` | Back to dashboard |
| `session_expired` | `SESSION_EXPIRED` | Sign in again |
| `invite_expired` | Invite invalid/expired/revoked/used | Contact admin |
| `validation_error` | `VALIDATION_FAILED` | Fix fields |
| `delivery_failure` | `DELIVERY_FAILED` | Review SMTP |
| `offline` | Browser offline | Retry |
| `server_unavailable` | `SERVER_UNAVAILABLE`, `RATE_LIMITED` | Retry |

## Existing components

| State | Current component |
|-------|-------------------|
| loading | `PageLoading` |
| empty | `EmptyState` |
| error (generic) | `PageError`, `ActionErrorBanner` |
| ready | page content |

Phase 1+ adds dedicated screens for auth/setup-specific states. Map API codes through `mapApiErrorToUiState()`.
