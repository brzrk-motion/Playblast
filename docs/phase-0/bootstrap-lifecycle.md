# Bootstrap lifecycle and single-studio invariant

Source of truth: `@playblast/shared` (`bootstrap.ts`).

## Single-studio invariant

- One Playblast instance serves exactly one studio.
- All studio-owned rows reference that studio id.
- Creating a second studio after setup completes returns `SETUP_ALREADY_COMPLETE` / `CONFLICT`.
- Cross-studio access is impossible in production configuration; tests may use isolated fixture studios.

## Bootstrap admin lifecycle

| Setup status | Meaning | Next route |
|--------------|---------|------------|
| `pending` | No admin or studio | `/setup` |
| `admin_created` | Bootstrap admin exists | `/setup/studio` |
| `studio_configured` | Studio profile saved | `/setup/complete` |
| `complete` | Setup finished | `/` |

## Rules

1. Exactly one bootstrap admin is created during first-run setup.
2. Setup claim is atomic and race-safe; concurrent requests produce one winner.
3. Invitations may assign only `creative` or `proofing`; admin promotion is an in-app Admin action later.
4. Application routes remain unavailable until setup status is `complete`.
5. Admin credential recovery must not store plaintext passwords and must invalidate affected sessions.

## SMTP and invitations

- Setup can complete without SMTP.
- Production invitations require a successful SMTP test delivery.
- SMTP-unavailable recovery must keep the instance usable for the bootstrap admin.
