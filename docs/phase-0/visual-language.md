# Visual language

Source of truth: `@playblast/shared` (`ui-states.ts`) and `client/src/index.css`.

## Role badges

| Role | Label | Token class |
|------|-------|-------------|
| Admin | Admin | `role-badge-admin` |
| Creative | Creative | `role-badge-creative` |
| Proofing | Proofing | `role-badge-proofing` |

Use `ROLE_BADGE_TOKENS` for labels and Tailwind utility classes in components.

## Studio identity

- Sidebar/header show server-derived studio name and avatar (replacing hard-coded `BRZRK Studio`).
- Account menu shows current user name, email, and role badge.
- Studio avatar uses instance-local storage with authorized file serving.

## Destructive actions

- Use `destructive` button variant.
- Require explicit confirmation dialog with `Confirm` / `Cancel`.
- Destructive data actions require Admin `data.delete` capability server-side.

## Setup progress

`SETUP_PROGRESS_STEPS`:

1. Admin account
2. Studio profile
3. Email (optional)
4. Invite team

Render as a horizontal stepper on setup screens; completed steps use `status-success` tokens.

## Account menu

- Current user block: avatar/initials, name, email, role badge.
- Links: Profile, Settings (role-appropriate), Log out.
- Admin-only: Team, SMTP (Phase 4).
