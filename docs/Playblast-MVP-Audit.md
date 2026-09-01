# Playblast MVP Audit

**Review date:** 2026-09-01
**Repository:** `/workspace/playblast`
**Branch:** `feat/playblast-pilot-hardening`
**Commit:** `26e0fbe` (`chore: add pilot auth-boundary verification harness`)
**Working tree:** clean at audit start

## Executive summary

Playblast is a technically substantial internal alpha with a working video-proofing loop. It is **not yet an MVP that can be released in front of studios**.

The current repository can create projects and deliverables, upload and stream video, add timestamped comments and frame annotations, compare versions, approve versions, download files, and manage a wider internal studio-operations surface. The current hardening branch also has deployment-wide HTTP Basic Auth, upload-path remediation, backup/restore verification, and an authenticated API smoke test.

The central MVP gap is identity and studio ownership. Basic Auth protects the whole deployment with one shared credential; it is not an application account system. There is no first-run setup, studio profile, user table, password hashing, session management, invitation flow, email delivery, role/permission model, or studio-level data isolation. The UI still displays hard-coded `BRZRK Studio` and `admin@brzrk.com` values, and the profile route is a placeholder.

**Practical status:**

- **Engineering readiness:** core proofing and persistence are substantially implemented; security/deployment hardening exists on this branch.
- **MVP/release readiness:** blocked by application identity, studio onboarding, authorization/data isolation, invitation email, and self-hosted release UX/documentation.
- **Commercial validation:** none recorded in the repository. Passing tests are not evidence that studios want or will adopt Playblast.

## Scope of this MVP

The first studio-facing MVP is a focused proofing product, not a complete studio operating system.

### In scope

- One self-hosted Playblast instance per studio.
- First-run setup performed by the studio administrator.
- Studio profile with name and profile picture.
- Admin account creation and login.
- Admin-created accounts for studio users.
- Invitation email with a secure acceptance link.
- Invite recipient creates a password and logs in.
- Authenticated studio members can access the studio’s projects and proofing workflow.
- Projects, deliverables, video versions, playback, timestamped comments, frame annotations, comparison, review states, approvals, and downloads.
- Docker-based installation with persistent SQLite and media storage.
- Documented backup, restore, upgrade, rollback, data ownership, and deletion boundaries.
- Public documentation and issue tracking rather than founder support.

### Deferred from the initial MVP

- Hosted SaaS and multi-tenant cloud operations.
- Founder-installed customer deployments.
- Paid support or response-time commitments.
- Client/guest accounts with a separate external-permission model.
- SSO, SCIM, enterprise audit exports, advanced organization policy, and billing.
- Broad CRM, invoicing, capacity, profitability, and studio-operations features unless they block the proofing workflow.
- Native mobile apps and guaranteed playback of every professional codec.

## Repository evidence reviewed

### Product and UI surface

- React 19/Vite client with routes for dashboard, projects, project overview, deliverable review, comparison, clients, services, timesheet, pipeline, capacity, and settings.
- The `/profile` route renders a coming-soon placeholder.
- The sidebar renders hard-coded `BRZRK Studio` and `admin@brzrk.com` identity values.
- Settings currently covers local browser preferences such as internal hourly cost and weekly capacity; it has no account, studio, team, password, invite, or email settings.
- The client API wrapper contains project, deliverable, version, comment, client, lead, service, milestone, task, timesheet, and invoice operations. It has no auth, studio, user, invite, session, or profile API.

### Server and persistence

- Express serves the API and built client from one process.
- SQLite via `better-sqlite3` stores projects, deliverables, milestones, tasks, time logs, versions, comments, leads, clients, services, invoices, payments, and related data.
- The schema has no `users`, `studios`, `sessions`, `invitations`, password credential, avatar, email-verification, or audit-event tables.
- API routes are globally scoped. They do not derive a studio or user from an authenticated application session.
- Comment authors are accepted as arbitrary client-supplied strings rather than being tied to an authenticated user.
- Video and download routes authorize only through the deployment-wide middleware; they do not check studio ownership or user permissions.
- Project deletion recursively removes project data and its upload directory, but there is no studio-level deletion/export workflow.

### Current authentication

`server/src/middleware/auth.ts` implements optional production HTTP Basic Auth using `PLAYBLAST_AUTH_USER` and `PLAYBLAST_AUTH_PASSWORD` environment variables.

This is useful as a temporary private-deployment boundary, but it does not meet the MVP onboarding requirement:

- one credential is shared by the whole studio;
- there is no user identity inside the application;
- there is no first-run account creation;
- there is no password hashing or password-change flow;
- there is no session lifecycle or logout;
- there are no roles or permissions;
- there is no invitation email or password creation link;
- comments cannot reliably identify their author;
- all authenticated users can reach all global API data;
- browsers receive a Basic Auth prompt rather than a Playblast login screen.

The MVP should replace Basic Auth for normal application access with application accounts and secure sessions. Basic Auth may remain as a documented emergency/bootstrap control only if it does not create a second confusing credential system.

### Deployment and operations

- Dockerfile builds client and server into a single Node 20 Alpine image.
- `docker-compose.yml` persists `/app/uploads` and `/app/data` using named volumes.
- README documents Synology Container Manager deployment and a bind-mount variation.
- `/health` is public; application/static/API/video routes are protected by Basic Auth when production credentials are configured.
- Database and upload backup/restore script exists and passed its filesystem gate.
- Container-volume/NAS restore was not verified here because Docker is unavailable in the audit environment.
- SMTP/email delivery is not configured or documented.
- There is no first-run setup state in the deployment, no admin recovery procedure, and no documented secret/session key configuration.

## Verification performed

All commands were run from `/workspace/playblast` on the audited branch.

### Passed

- `npm run test`
  - Server: **141 tests passed**, 0 failed.
  - Client: **62 tests passed**, 0 failed.
  - Total: **203 tests passed**, 0 failed.
- `npm run build`
  - Client TypeScript/Vite build passed.
  - Server TypeScript build passed.
- `npm run lint`
  - ESLint passed.
- `npm run verify:backup-restore`
  - Filesystem database/upload archive, wipe, restore, SQLite integrity, and upload-byte verification passed.
- `npm run verify:pilot-browser`
  - Health public, unauthenticated API rejected, authenticated API accepted.
- `npm audit --omit=dev --json`
  - 0 production vulnerabilities reported at audit time.

### Warnings and unverified areas

- Vite reports a production chunk larger than 500 kB; this is a performance warning, not an MVP blocker.
- Docker is not installed or available on `PATH`; the Docker image, Compose deployment, container healthcheck, named-volume behavior, and NAS workflow were not executed in this audit.
- The backup script explicitly skips container-volume checks when Docker is unavailable.
- The browser verification script is an auth-boundary curl/self-check; it does not drive the actual browser UI.
- No visual QA, clean-machine installation, email delivery test, account onboarding test, invite acceptance test, multi-user authorization test, or external studio workflow was performed.
- The branch is `feat/playblast-pilot-hardening`, not `main`; the audit describes this branch’s state.

## MVP gap assessment

### Critical blockers

1. **Application identity and first-run bootstrap do not exist.**
2. **Studio entity/profile does not exist.**
3. **Users, password credentials, sessions, logout, and recovery do not exist.**
4. **Invitation tokens, email delivery, invite acceptance, and password creation do not exist.**
5. **Studio-level ownership and authorization do not exist.** Existing routes expose one global data set to any deployment-authenticated request.
6. **The requested self-hosted onboarding flow is absent.** There is only a technical deployment guide followed by a shared Basic Auth prompt.

### High-priority blockers

7. **Existing data model has no studio ownership columns or migration strategy.** Every project, client, lead, service, invoice, task, version, comment, and upload path must be assigned to the studio boundary.
8. **Role model is undefined.** At minimum, the MVP needs an instance/studio admin and a normal studio member; permissions must cover team management and destructive actions.
9. **Email configuration and delivery are absent.** Production invites require SMTP/provider configuration, safe secret handling, delivery errors, and a development/test transport.
10. **Client identity is not authoritative.** Comment author names are client-provided; comments need authenticated user identity while preserving an optional display name/history policy.
11. **Account and studio UI are absent.** The app has no login, setup wizard, team management, invite status, profile, or logout surfaces.
12. **Release documentation describes Basic Auth/private pilot behavior.** It needs to describe first-run setup, application accounts, email prerequisites, recovery, and the no-support boundary.

### Medium-priority MVP hardening

13. Define password policy, session expiry, invite expiry, reset/recovery policy, rate limits, CSRF posture, secure-cookie settings, and reverse-proxy HTTPS requirements.
14. Add rate limiting and abuse controls for login, invite resend, password creation, and password reset endpoints.
15. Add structured security/audit events for account creation, login failures, invite creation/acceptance/revocation, role changes, and destructive data actions.
16. Add a data export/deletion procedure appropriate to one self-hosted studio instance.
17. Test upgrade and migration behavior from the current unauthenticated/Basic-Auth database.
18. Resolve route/API error states and loading states for first-run, expired invites, disabled users, and invalid sessions.
19. Decide whether the internal CRM/finance features are hidden from normal studio members in the MVP or explicitly included in the role matrix.
20. Address the large client bundle if performance testing shows it harms first-run usability; do not let this precede identity and authorization work.

## Target onboarding experience

This is the required Home Assistant-like self-hosted flow. It should work from a fresh deployment without James or a developer performing setup.

### A. Install and open

1. Studio administrator deploys the Docker image using the documented Compose/bind-mount path.
2. Administrator opens the instance URL on the private network/VPN.
3. `/health` confirms the process is alive, while the application detects that no studio/admin setup has been completed.
4. The app redirects to a first-run setup screen. Normal application routes remain unavailable until setup is complete.
5. The setup screen explains data ownership, self-hosting responsibility, backup requirements, and the no-support boundary.

### B. Create initial admin account

1. Administrator enters name, email address, and password.
2. Server validates and normalizes the email for uniqueness, validates password policy, and hashes the password with a modern password-hashing algorithm.
3. Server creates the first user with the `admin` role in a transaction and records setup completion state.
4. Server creates a secure authenticated session and redirects to the studio setup step.
5. Setup cannot be claimed twice through a race or repeated request.
6. There is a documented recovery path for a lost admin credential that does not require storing a plaintext password.

### C. Create studio profile

1. Admin enters the studio name.
2. Admin optionally uploads a profile picture/avatar within a documented size/type limit.
3. Server stores the studio name and avatar safely inside the instance’s data boundary, not as an arbitrary public path.
4. Admin can preview and replace the avatar.
5. The studio identity appears in the application shell and account/team surfaces.
6. The setup flow explains that the studio owns its media, account data, and backups.

### D. Invite studio users

1. Admin opens Team/Users from the application.
2. Admin enters one or more user names and email addresses and selects an MVP role.
3. Server validates email format, prevents duplicate active memberships, creates a cryptographically random one-time invite token, stores only a hash of the token, and sets an expiry.
4. Server sends an invitation email containing the instance URL, studio name, recipient identity, expiration, and a secure acceptance link.
5. UI displays invite status: pending, accepted, expired, revoked, or delivery failed.
6. Admin can resend an invite, which invalidates the prior token, or revoke a pending invite.
7. Resend and invite creation are rate-limited and do not reveal unnecessary account-existence information.

### E. Accept invite and create password

1. User opens the invite link.
2. Server validates token hash, expiry, intended invite, and unused state.
3. User sees studio name and the email/name associated with the invite.
4. User creates and confirms a password; the server hashes it and atomically marks the invite accepted.
5. User receives a session and enters the application as a member.
6. Expired, revoked, already-used, and malformed links receive clear safe recovery guidance.
7. User can later change their password and log out from the account menu.

### F. Use the proofing workflow

1. Authenticated members see only their studio’s records.
2. Admin can manage studio users; members cannot invite, remove, or elevate users unless authorized.
3. Comments identify the authenticated author from the server-side session, not an arbitrary name supplied by the browser.
4. Project, deliverable, version, comment, annotation, approval, playback, download, and delete operations enforce studio ownership.
5. Destructive actions require role checks and confirmation.
6. The account menu shows the current user and studio, with a working logout action.

## Phased implementation task list

Tasks are ordered by dependency. Each phase has an exit gate; do not declare MVP complete because individual endpoints or tables exist.

### Phase 0 — Freeze scope and establish the acceptance contract

- [ ] Write the MVP acceptance checklist from this audit into the repository’s implementation task system.
- [ ] Confirm the MVP roles: `admin` and `member`; document what each can do.
- [ ] Confirm that paid support, hosted SaaS, founder installation, and client/guest accounts are deferred.
- [ ] Decide whether internal CRM/finance surfaces are admin-only, hidden, or out of MVP scope.
- [ ] Choose the open-source license and confirm the repository’s public-license language.
- [ ] Define the supported deployment target for MVP: Docker Compose plus one documented NAS/Linux path.
- [ ] Define supported browsers and minimum Node/build assumptions for contributors.
- [ ] Define data ownership, deletion, backup, restore, and no-support language.
- [ ] Define avatar/media limits and supported image/video formats.

**Exit:** a reviewer can distinguish MVP requirements from deferred product breadth, and the role/deployment/data boundaries are written down.

### Phase 1 — Identity and database foundation

- [ ] Add a `studios` table with id, name, avatar reference, created/updated timestamps, and setup state.
- [ ] Add a `users` table with id, studio id, name, normalized email, password hash, role, status, avatar reference if needed, created/updated timestamps, last-login timestamp, and disabled/deleted state.
- [ ] Add a `sessions` table with hashed session token, user id, expiry, created timestamp, last-used timestamp, and optional metadata.
- [ ] Add an `invitations` table with studio id, email, name, role, hashed token, expiry, accepted/revoked state, inviter, timestamps, and delivery status.
- [ ] Add an `audit_events` table or equivalent structured audit sink for security-sensitive account events.
- [ ] Add migrations for fresh and existing SQLite databases.
- [ ] Define indexes and uniqueness constraints for normalized user email per studio, active invites, session lookup, and token hashes.
- [ ] Define foreign-key behavior for studio deletion and user/invite cleanup.
- [ ] Add transaction boundaries for first-admin creation, invite acceptance, and role/status changes.
- [ ] Add tests for fresh schema creation, migration from current schema, constraints, and rollback behavior.

**Exit:** a fresh and existing database can represent one studio, an admin, members, sessions, and invites without losing current proofing data.

### Phase 2 — Authentication lifecycle

- [ ] Implement password hashing using a modern adaptive password-hashing library available in the project’s supported runtime.
- [ ] Implement first-run setup status endpoint that does not leak unnecessary internal state.
- [ ] Implement first-admin creation endpoint with race-safe single-use setup semantics.
- [ ] Implement login endpoint with normalized email, password verification, generic failure responses, and rate limiting.
- [ ] Implement secure server-side sessions with high-entropy opaque cookies/tokens stored hashed at rest.
- [ ] Set `HttpOnly`, `Secure` in production, `SameSite`, expiry, and path attributes deliberately.
- [ ] Implement current-user endpoint.
- [ ] Implement logout and server-side session revocation.
- [ ] Implement session expiry/cleanup and behavior after restart.
- [ ] Implement password change for authenticated users.
- [ ] Decide and implement password reset/recovery, or document a safe admin-only recovery process for MVP.
- [ ] Add CSRF protection appropriate to cookie-authenticated state-changing requests.
- [ ] Add login/session/password tests for success, wrong password, disabled user, expired session, logout, replayed token, and rate-limit behavior.
- [ ] Decide how the current Basic Auth middleware is removed, limited to bootstrap, or retained as an explicit emergency layer.
- [ ] Update API/client error handling for `401`, expired sessions, and redirect-to-login behavior.

**Exit:** a fresh user can create the first admin account, log in, stay logged in across requests, log out, and recover from an expired session without shared Basic Auth.

### Phase 3 — Studio setup and profile

- [ ] Implement authenticated studio read/update endpoints.
- [ ] Implement studio name validation and normalization.
- [ ] Implement avatar upload with MIME/type validation, size limits, safe generated filenames, and storage inside the instance data boundary.
- [ ] Prevent path traversal and arbitrary file access for studio avatars.
- [ ] Decide avatar replacement/deletion behavior and clean up old files safely.
- [ ] Build first-run setup wizard UI after admin creation.
- [ ] Build studio name and avatar form with upload progress/errors and retry behavior.
- [ ] Add studio identity to app header/sidebar.
- [ ] Replace hard-coded `BRZRK Studio` and `admin@brzrk.com` values with current-session/studio data.
- [ ] Add profile/settings surface for the current user.
- [ ] Add API, storage, validation, and UI tests.

**Exit:** an admin can create and update the studio profile from the application, and the shell shows real studio/user identity.

### Phase 4 — Team membership, roles, and invitations

- [ ] Define admin/member permission matrix for team, studio profile, projects, destructive actions, and internal operations.
- [ ] Implement list users endpoint scoped to the current studio.
- [ ] Implement create invitation endpoint restricted to admins.
- [ ] Generate cryptographically random invite secrets; store only token hashes.
- [ ] Implement invite expiry, one-time use, revocation, and resend invalidation.
- [ ] Implement duplicate membership/invite rules and safe email normalization.
- [ ] Implement invite acceptance inspection endpoint with safe error states.
- [ ] Implement password creation/accept endpoint that atomically accepts the invite.
- [ ] Implement admin user disable/reactivate behavior and session revocation.
- [ ] Implement admin role assignment rules, including protection against removing the last admin.
- [ ] Implement SMTP/provider configuration and environment documentation without committing secrets.
- [ ] Choose and implement an email transport abstraction with a deterministic test transport.
- [ ] Create invitation email template in plain text and HTML.
- [ ] Include instance URL, studio name, recipient name/email, expiry, and no-support/self-hosting context in the email.
- [ ] Handle delivery failure without falsely showing a successful invite.
- [ ] Build Team page with user list, role/status badges, invite form, pending invites, resend, revoke, and error states.
- [ ] Build invite acceptance page and password creation form.
- [ ] Add end-to-end tests covering admin invite → email capture → acceptance → password creation → login.
- [ ] Add tests for expired, revoked, replayed, duplicate, and delivery-failed invitations.

**Exit:** an admin can invite every intended studio user by email, each invitee can create a password and log in, and the admin can manage membership without developer help.

### Phase 5 — Studio data isolation and authorization

- [ ] Add `studioId` ownership to every studio-owned entity: projects, deliverables, milestones, tasks, time logs, versions, comments, uploads, clients, leads, services, project services, invoices, payments, and related records.
- [ ] Decide whether all existing internal-management entities are migrated into the studio boundary or hidden from the MVP.
- [ ] Backfill current records into a clearly defined initial studio during migration.
- [ ] Add ownership indexes and foreign keys.
- [ ] Change repository methods to require studio context for reads, writes, updates, and deletes.
- [ ] Derive studio/user context only from the authenticated server session; never trust client-supplied studio ids for authorization.
- [ ] Scope list, detail, nested, search/filter, aggregate, duplicate, archive, and delete operations.
- [ ] Scope video playback and version downloads to the authenticated user’s studio.
- [ ] Ensure upload destination paths include a safe studio boundary where appropriate.
- [ ] Ensure comments and annotations are tied to authenticated user identity and studio.
- [ ] Enforce admin/member permissions on team, studio, destructive, and internal-management routes.
- [ ] Add deny-path tests for cross-studio project, deliverable, version, video, comment, client, invoice, and upload access.
- [ ] Add allow-path tests for admin and member operations.
- [ ] Review logs and error messages for cross-studio existence leaks.
- [ ] Verify migrations preserve existing data and do not silently assign records to the wrong studio.

**Exit:** two fixture studios cannot read, write, stream, download, or delete one another’s data, regardless of manipulated ids or route paths.

### Phase 6 — Focused proofing workflow MVP

- [ ] Define the canonical studio proofing workflow: project → deliverable → upload v1 → playback → comment/annotation → approval → upload v2 → compare → download.
- [ ] Verify every step uses authenticated session identity and studio scope.
- [ ] Verify version labels, ordering, replacement, approval state, and comparison behavior.
- [ ] Verify timestamped comments and annotations persist and display correctly.
- [ ] Verify comment author comes from the authenticated user rather than a freely editable author field.
- [ ] Verify failed uploads do not leave orphan metadata or inaccessible files.
- [ ] Verify large-file range playback, seek, client disconnect, and download behavior.
- [ ] Verify project/deliverable/version deletion behavior against data ownership and backup expectations.
- [ ] Hide or clearly label non-MVP CRM/finance/capacity surfaces for normal members.
- [ ] Add loading, empty, unauthorized, expired-session, and error states throughout the workflow.
- [ ] Add UI tests for login/setup/team/profile and the proofing path where practical.
- [ ] Run a manual browser walkthrough with at least two accounts in one studio.

**Exit:** admin and member can independently complete the proofing workflow, with correct authorship, permissions, and no cross-studio access.

### Phase 7 — Self-hosted release and onboarding documentation

- [ ] Update Docker Compose examples for the application-account model.
- [ ] Remove obsolete required Basic Auth variables from the primary onboarding path, or clearly document their limited emergency/bootstrap role.
- [ ] Add production secret configuration for session signing/encryption if required, SMTP, instance URL, and upload/database paths.
- [ ] Add startup validation for required production configuration.
- [ ] Document SMTP setup, sender identity, invite URL/base URL, HTTPS/VPN requirement, and failure behavior.
- [ ] Document the exact Home Assistant-like flow: install → open URL → create admin → create studio → invite users → users create passwords → login.
- [ ] Document that the studio owns its media, database, backups, accounts, and deletion process.
- [ ] Document supported browser, host, storage, image/video, and upgrade boundaries.
- [ ] Document backup and restore of database, uploads, studio avatars, and account/invite data.
- [ ] Document admin recovery without exposing plaintext credentials.
- [ ] Document upgrade/migration rollback expectations.
- [ ] Add a clean-install script or checklist that starts with empty data and verifies the complete onboarding path.
- [ ] Add SMTP test mode or local capture instructions for contributors.
- [ ] Build Docker image and execute Compose health/startup checks in an environment with Docker.
- [ ] Execute the documented Synology/Linux installation manually.
- [ ] Execute a restore into a fresh instance and verify login, studio profile, invites, projects, media, comments, and approvals.
- [ ] Add screenshots or a short walkthrough for the public repository.
- [ ] Update README terminology from internal/private pilot to open-source self-hosted adoption.

**Exit:** a technically capable studio can deploy, configure, recover, and onboard its team without James performing the work.

### Phase 8 — Release candidate QA and adoption gate

- [ ] Run full server/client tests, build, lint, dependency audit, backup/restore, and new auth/invite tests.
- [ ] Run clean-install and migration tests on supported Node/Docker environments.
- [ ] Run two-user and two-studio authorization matrix tests.
- [ ] Verify no secrets, test credentials, or private email configuration are committed.
- [ ] Verify cookies, password hashes, invite tokens, avatar paths, and logs do not leak sensitive values.
- [ ] Verify rate limits and generic auth/invite errors.
- [ ] Run browser QA on supported desktop browsers.
- [ ] Run representative upload/playback tests with documented media sizes/codecs.
- [ ] Run backup/restore including account, studio, avatar, invite, metadata, and media state.
- [ ] Confirm working tree, release tag, changelog, and reproducible build artifact.
- [ ] Publish issue tracker and security-reporting instructions.
- [ ] Recruit the first self-hosted adopters; do not promise support.
- [ ] Record install completion, repeat review cycles, issue volume, donations, sponsorship interest, and reasons for rejection.

**MVP exit:**

- A fresh instance can be installed and reached by a studio admin.
- The admin can create an account, log in, create the studio name/avatar, and invite users.
- Invited users receive email, create passwords, and log in.
- Admin/member permissions are enforced server-side.
- Two studios cannot access one another’s data.
- The proofing workflow completes end to end with real authenticated authorship.
- Backup, restore, upgrade, deletion, and recovery boundaries are documented and tested.
- The release can be operated without James installing instances or providing ongoing support.
- Adoption and funding evidence is tracked separately from technical readiness.

## Recommended implementation order

1. Identity/schema/migrations.
2. Login/session/first-run admin.
3. Studio profile and setup wizard.
4. Email/invitations/team roles.
5. Studio ownership and authorization across all routes and files.
6. Authenticated proofing workflow and focused UI cleanup.
7. Clean self-hosted deployment and onboarding docs.
8. Cross-browser, clean-install, backup/restore, and release-candidate QA.
9. Public release and adoption/funding measurement.

Do not start by building SaaS tenancy, billing, support tooling, or more studio-management features. The MVP’s hard problem is making one self-hosted studio instance safe, understandable, and usable by multiple named accounts without founder intervention.

## Audit conclusion

Playblast is closer to a **feature-rich proofing alpha with deployment hardening** than to a studio-ready MVP. The proofing mechanics are a credible foundation, and the current automated checks are strong. The remaining work is not primarily more proofing features; it is converting a shared-credential single-instance tool into a self-hosted studio application with a first-run experience, named users, invitations, authorization, and release-grade operational documentation.

The next engineering milestone is a vertical slice of the requested onboarding flow:

> fresh Docker data → first-run admin account → login → studio name/avatar → invite one member email → member creates password → member logs in → both complete one isolated proofing review cycle.

Until that slice passes on a clean instance and the two-studio deny-path tests pass, Playblast should remain an internal alpha rather than being presented to studios as an MVP.
