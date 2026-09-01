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
- Admin-created accounts for studio users with one of three roles: `admin`, `creative`, or `proofing`.
- Invitation email with a secure acceptance link.
- Invite recipient creates a password and logs in.
- Authenticated studio members can access the studio’s projects and proofing workflow.
- Projects, deliverables, video versions, playback, timestamped comments, frame annotations, comparison, review states, approvals, and downloads.
- Docker-based installation with persistent SQLite and media storage.
- Documented backup, restore, upgrade, rollback, data ownership, and deletion boundaries.
- Public documentation and issue tracking rather than founder support.

### MVP role model

Every user belongs to the single studio configured for that self-hosted instance. The server must enforce these roles from the authenticated session; the client must not be trusted to declare or elevate a role. “Manage the installation” means managing Playblast’s in-app setup, studio configuration, account lifecycle, SMTP test/configuration, and recovery controls; it does not mean Playblast can manage Docker, the host OS, NAS networking, DNS, HTTPS/VPN, storage, or backups from inside the application. Those remain the studio’s deployment-owner responsibilities.

- **Admin:** manages the installation-level setup and studio profile, invites and manages users, assigns roles, configures SMTP, and can perform every action available to Creative and Proofing users. Admins can create, edit, archive, delete, upload, version, proof, comment, annotate, approve, compare, and download within the studio.
- **Creative:** the working role for motion designers, video editors, designers, and similar studio contributors. Creatives can create and edit the proofing work permitted by the MVP, upload new videos, create versions, review/play videos, comment, annotate, compare versions, approve where the permission matrix allows, and download deliverables. Creatives cannot manage installation setup, SMTP, studio administration, users, roles, or other admin-only controls.
- **Proofing:** a read-only review role. Proofing users can view/play deliverables and versions, add comments and frame annotations, compare versions, and see review status/history. They cannot upload media, create or replace versions, modify project/deliverable metadata, approve versions, delete data, manage users, configure the studio, or change installation settings.

The precise permission matrix must be explicit before implementation. “Read-only” means no mutation of media, versions, project structure, approvals, membership, or installation configuration; commenting and annotations are the deliberate review exceptions.

| Capability | Admin | Creative | Proofing |
|---|---:|---:|---:|
| Complete first-run installation and studio setup | Yes | No | No |
| Manage SMTP and installation settings | Yes | No | No |
| Invite, disable, reactivate, or assign roles | Yes | No | No |
| View studio projects and deliverables | Yes | Yes | Yes |
| Create/edit projects and deliverables | Yes | Yes | No |
| Upload media and create new versions | Yes | Yes | No |
| Play, review, and compare versions | Yes | Yes | Yes |
| Add comments and frame annotations | Yes | Yes | Yes |
| Change approval/review state | Yes | Yes | No |
| Download deliverables | Yes | Yes | Yes |
| Delete/archive studio data | Yes | No | No |

**Role-policy decision:** “proof” means viewing/playing, commenting, annotating, comparing, and participating in the review workflow; it does not grant upload or version-management rights. Creatives may change review/approval state but may not archive or delete studio data. Proofing users may download deliverables because downloading is a read operation, but they cannot mutate media, versions, project structure, approvals, membership, or installation configuration. These defaults are part of the MVP contract unless a later product decision explicitly changes them.

### Deferred from the initial MVP

- Hosted SaaS and multi-tenant cloud operations.
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
- SQLite via direct `better-sqlite3` access stores projects, deliverables, milestones, tasks, time logs, versions, comments, leads, clients, services, invoices, payments, and related data.
- The schema has no `users`, `studios`, `sessions`, `invitations`, password credential, avatar, email-verification, or audit-event tables.
- The repository is tightly coupled to the driver: `repository.ts` contains approximately 105 direct prepared-statement call sites and 44 transaction usages; database initialization, migrations, backup/restore, seed/migration scripts, and tests also import or call `better-sqlite3` directly.
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

## Database/ORM migration decision

### Current assessment

The existing SQLite database is a reasonable fit for one self-hosted studio instance, but the application is coupled directly to `better-sqlite3` rather than to a replaceable database boundary. This creates avoidable deployment and maintenance risk, especially because the production image currently needs native-module build tooling and the README documents low-memory NAS installation failures.

The concern is not that SQLite is inherently brittle. SQLite remains the intended local database. The concern is the combination of direct driver APIs, a large raw-SQL repository, driver-specific tests/scripts, and native-addon installation requirements.

### Decision

Adopt **Drizzle ORM as the typed schema/query layer while retaining `better-sqlite3` as the SQLite driver for the MVP**.

The intended near-term architecture is:

```text
Playblast repository → Drizzle ORM/schema → better-sqlite3 → SQLite file
```

Do not attempt a simultaneous ORM and driver rewrite. The existing proofing workflow is tested and should not be destabilized before the onboarding vertical slice is complete.

Use Drizzle first for the new identity and studio foundation—studios, users, sessions, invitations, and audit events—then migrate existing repository areas incrementally after schema introspection and regression tests prove compatibility. Existing SQL migrations remain authoritative until an explicit migration plan reconciles them with Drizzle Kit output.

### Long-term driver direction

The long-term target is:

```text
Playblast repository → Drizzle ORM/schema → node:sqlite → SQLite file
```

`node:sqlite` is strategically attractive because it is maintained in Node.js and removes the separate native npm addon. It is not yet the immediate MVP driver: Node’s official documentation currently classifies the SQLite module as Release Candidate, and the API has evolved across recent Node releases. The driver migration is deferred until the API reaches a sufficiently stable release status and Playblast verifies the supported Node LTS/NAS deployment path.

This is a separate decision from adopting Drizzle. Drizzle supports both `better-sqlite3` and `node:sqlite`; adopting Drizzle now does not commit Playblast to the current driver permanently.

### Alternatives considered

- **Remain on raw `better-sqlite3`:** lowest immediate code churn, but preserves direct driver coupling, native installation friction, and manual schema/query typing.
- **Drizzle over `better-sqlite3`:** recommended MVP path; adds typed schema, query/migration tooling, and an incremental route without changing the database file or driver.
- **Drizzle over `node:sqlite`:** preferred future direction once Node API stability and target deployment compatibility are proven; not the MVP foundation today.
- **Prisma:** credible and well-supported, but a larger generated-client/repository rewrite and still commonly paired with `better-sqlite3` for local SQLite; no clear MVP advantage over Drizzle.
- **Kysely:** credible SQL-first alternative, but it does not provide as complete a schema/migration direction and does not itself remove the native driver.
- **libSQL/Turso:** useful for remote/distributed SQLite-compatible operation, but unnecessary for the initial local self-hosted model and would introduce a service/deployment direction Playblast does not currently need.

### Migration constraints and safeguards

- Preserve the existing SQLite file path, schema behavior, foreign-key enforcement, WAL configuration, transaction semantics, and backup/restore contract.
- Introspect the existing schema before generating or replacing migrations; compare all current schema SQL and migration files against the generated Drizzle schema.
- Test nullable fields, booleans, JSON budget values, timestamps, indexes, `CHECK` constraints, foreign keys, table-recreation migrations, and cascading deletes.
- Keep database migrations backward-compatible for existing self-hosted installations and define rollback behavior before publishing a migration.
- Do not mix Drizzle migrations with the existing migration runner without an explicit ordering and metadata strategy.
- Add repository contract tests so the proofing API behavior is checked independently of the selected driver.
- Verify fresh install, upgrade, backup, restore, seed, JSON migration, and production build behavior after each persistence milestone.
- Do not remove `better-sqlite3` until the `node:sqlite` implementation passes the full server test suite, migration tests, backup/restore checks, and real Docker/NAS verification.

### Decision gate

For the MVP, success means Drizzle can support the new identity/studio schema without regressions while `better-sqlite3` remains the driver. Reconsider the driver migration when all of the following are true:

1. `node:sqlite` has stable enough API status for the supported Node LTS baseline.
2. Drizzle’s Node SQLite adapter supports every required Playblast operation.
3. Existing databases migrate forward and can be restored without data loss.
4. The Node 22+ or later Docker image works on the documented Linux/NAS targets.
5. The full proofing, auth, onboarding, migration, and backup suites pass.
6. Removing native build requirements materially improves independent installation success.

Sources: [Node.js SQLite documentation](https://nodejs.org/api/sqlite.html), [Node.js release policy](https://nodejs.org/en/about/previous-releases), [Drizzle SQLite drivers](https://orm.drizzle.team/docs/sqlite/get-started-sqlite), [Drizzle Node SQLite](https://orm.drizzle.team/docs/get-started/node-sqlite-new), [Drizzle migrations](https://orm.drizzle.team/docs/migrations), [better-sqlite3 v13 release](https://github.com/WiseLibs/better-sqlite3/releases/tag/v13.0.0).

## Deployment and operations

- Dockerfile builds client and server into a single Node 20 Alpine image.
- `docker-compose.yml` persists `/app/uploads` and `/app/data` using named volumes.
- README documents Synology Container Manager deployment and a bind-mount variation.
- `/health` is public; application/static/API/video routes are protected by Basic Auth when production credentials are configured.
- Database and upload backup/restore script exists and passed its filesystem gate.
- Container-volume/NAS restore was not verified here because Docker is unavailable in the audit environment.
- SMTP/email delivery is not configured or documented.
- There is no first-run setup state in the deployment, no admin recovery procedure, and no documented secret/session key configuration.

## Email delivery strategy

### Decision

Playblast should not depend on a centralized brzrk email API account or a shared provider token. The self-hosted instance should use a provider-agnostic SMTP adapter configured by the studio.

The important distinction is:

- **No API token specifically:** achievable. Playblast can use standard SMTP host, port, username, password, sender, and TLS settings.
- **No credentials at all:** not realistic for reliable external delivery. A reputable relay needs an authenticated account or the studio must operate its own mail server.

This preserves the self-hosted model: each studio owns its email transport just as it owns its Docker host, storage, backups, network, and media. Playblast owns invitation generation and delivery behavior, not the studio’s email infrastructure or deliverability.

### Recommended production path

1. Let the studio use its existing SMTP service where possible: Google Workspace, Microsoft 365, a company mail server, or its business email provider.
2. Support generic SMTP configuration rather than a provider-specific API integration.
3. Require the admin to test SMTP delivery before enabling user invitations.
4. Store SMTP credentials only in the studio’s deployment configuration or an explicitly local secret store; never send them to brzrk or commit them to the repository.
5. Make the sender identity and instance/base URL explicit so invite links are usable.
6. Treat delivery failure as a visible configuration/error state rather than reporting a successful invite.
7. Keep Mailpit as the local development and automated-test transport; it captures mail and does not deliver production email.

### Free SMTP provider options

These services can avoid a Playblast API-token integration because they offer SMTP relay, but they still require the studio to create an account and configure credentials. Free-plan limits and provider terms can change and must be rechecked before documenting them as guaranteed product dependencies.

- **Brevo:** advertises free SMTP up to 300 emails/day. It is the simplest hosted fallback for low-volume invitations, subject to account and sender/domain verification.
  - [Brevo free SMTP server](https://brevo.com/free-smtp-server/)
  - [Brevo pricing](https://brevo.com/pricing)
- **Mailjet:** provides SMTP relay and a free tier, but its SMTP username/password are its API Key and Secret Key. This is SMTP transport, but still token-like provider credentials.
  - [Mailjet SMTP configuration](https://documentation.mailjet.com/hc/en-us/articles/360043229473-How-can-I-configure-my-SMTP-parameters)
  - [Mailjet SMTP developer configuration](https://dev.mailjet.com/docs/smtp-relay/configuration)
- **Amazon SES:** supports SMTP credentials and advertises a new-customer free tier, but requires AWS setup, sender/domain verification, and may begin in a restricted sandbox. It is not the recommended default for small studios.
  - [Amazon SES pricing](https://aws.amazon.com/ses/pricing/)
  - [Amazon SES SMTP credentials](https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html)
- **Self-hosted Postfix/Exim:** avoids an external provider token, but creates a substantial unsupported mail-operations burden: static IP, reverse DNS, SPF, DKIM, DMARC, TLS, port 25 access, reputation, bounces, queues, and blocklists. Do not make this an MVP prerequisite.
- **Mailpit:** appropriate for development/test capture only. It is not a production delivery service.
  - [Mailpit](https://mailpit.axllent.org/)
  - [Mailpit SMTP configuration](https://mailpit.axllent.org/docs/configuration/smtp)

### Email ownership and support boundary

The studio is responsible for:

- SMTP account and credentials;
- sender identity and domain verification;
- SPF/DKIM/DMARC and deliverability;
- provider limits, bounces, and account status;
- protecting its local secret configuration.

Playblast is responsible for:

- validating SMTP configuration;
- generating secure, one-time invitation tokens;
- composing invitation emails;
- storing only token hashes for invitations;
- enforcing expiry, revocation, and replay protection;
- displaying delivery success/failure accurately;
- providing documentation and a test-email action.

The initial MVP must not promise that James will configure SMTP, troubleshoot provider accounts, repair deliverability, resend failed mail manually, or provide an alternate support channel.

### Onboarding implications

The first-run flow does not need email to create the initial admin or studio profile. Before the admin can invite other users:

1. The admin enters SMTP host, port, username, password, sender address, and TLS mode through the documented local configuration path.
2. Playblast sends a test message to the admin’s address.
3. The admin confirms receipt or sees a specific safe failure message.
4. The Team invite action becomes available only after a successful test, unless the admin explicitly chooses to defer invitations.
5. Each invite email includes the studio name, recipient identity, instance URL, one-time acceptance link, expiration, and a statement that the studio operates its own Playblast instance.

If SMTP is not configured, the instance may still be used by the initial admin and existing members, but it must not silently claim that invitations were sent. A copyable invite-link fallback should be considered only if it does not weaken token security or turn James into the delivery mechanism.

### Email MVP acceptance criteria

- A fresh instance can complete admin and studio setup without email.
- Production invitations cannot be sent until SMTP configuration has passed a test delivery.
- SMTP credentials are never committed, logged, returned by APIs, or sent to brzrk.
- A real invitation email reaches the intended recipient through the configured relay.
- Invite acceptance creates a password and session as specified in the onboarding flow.
- Expired, revoked, replayed, and delivery-failed invites have safe, testable behavior.
- Mailpit or an equivalent capture transport covers automated tests without sending real email.
- The self-hosted README documents existing SMTP, Brevo SMTP, and unsupported self-hosted mail-server paths without requiring a Playblast API token.

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
8. **Role authorization is not implemented.** The audit now defines `admin`, `creative`, and `proofing`, but the repository has no persisted roles or server-enforced permission matrix yet. The two policy decisions still requiring explicit confirmation are Creative approval rights and Proofing downloads.
9. **Email configuration and delivery are absent.** Production invites require SMTP/provider configuration, safe secret handling, delivery errors, and a development/test transport.
10. **Client identity is not authoritative.** Comment author names are client-provided; comments need authenticated user identity while preserving an optional display name/history policy.
11. **Account and studio UI are absent.** The app has no login, setup wizard, team management, invite status, profile, or logout surfaces.
12. **Release documentation describes Basic Auth/private pilot behavior.** It needs to describe first-run setup, application accounts, email prerequisites, recovery, and the no-support boundary.

### Medium-priority MVP hardening

13. Define password policy, session expiry, invite expiry, reset/recovery policy, rate limits, CSRF posture, secure-cookie settings, and reverse-proxy HTTPS requirements.
14. Add rate limiting and abuse controls for login, invite resend, password creation, and password reset endpoints.
15. Define comment/annotation mutation policy: authors may edit/delete their own items within a documented policy; Admin may moderate/delete; Proofing users may not alter another user’s items; all mutations remain studio-scoped.
16. Define the complete Proofing mutation boundary, including profile/settings changes, viewed state, favorites, saved comparisons, shares, and future review metadata; add explicit deny behavior for anything outside comments/annotations.
17. Add an endpoint inventory classifying every route and file-serving path as Admin, Creative, Proofing, public, or out of scope before authorization testing.
18. Add structured security/audit events for account creation, login failures, invite creation/acceptance/revocation, role changes, and destructive data actions.
19. Add a data export/deletion procedure appropriate to one self-hosted studio instance.
20. Test upgrade and migration behavior from the current unauthenticated/Basic-Auth database.
21. Resolve route/API error states and loading states for first-run, expired invites, disabled users, and invalid sessions.
22. Decide whether the internal CRM/finance features are hidden from normal studio members in the MVP or explicitly included in the role matrix.
23. Address the large client bundle if performance testing shows it harms first-run usability; do not let this precede identity and authorization work.

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
3. Server validates the role as exactly `creative` or `proofing` for invited users, prevents duplicate active memberships, creates a cryptographically random one-time invite token, stores only a hash of the token, and sets an expiry.
4. Server sends an invitation email containing the instance URL, studio name, recipient identity, selected role, expiration, and a secure acceptance link.
5. UI displays invite status: pending, accepted, expired, revoked, or delivery failed.
6. Admin can resend an invite, which invalidates the prior token, or revoke a pending invite.
7. Resend and invite creation are rate-limited and do not reveal unnecessary account-existence information.

### E. Accept invite and create password

1. User opens the invite link.
2. Server validates token hash, expiry, intended invite, and unused state.
3. User sees studio name, selected role, and the email/name associated with the invite.
4. User creates and confirms a password; the server hashes it and atomically marks the invite accepted.
5. User receives a session and enters the application using the role selected by the admin: `creative` or `proofing`.
6. Expired, revoked, already-used, and malformed links receive clear safe recovery guidance.
7. User can later change their password and log out from the account menu.

### F. Use the proofing workflow

1. Authenticated Admins and Creatives can perform the studio’s working proofing actions; Proofing users have the deliberately limited review permissions.
2. All roles see only their studio’s records.
3. Admin can manage studio users; Creatives and Proofing users cannot invite, remove, or elevate users.
4. Comments identify the authenticated author from the server-side session, not an arbitrary name supplied by the browser.
5. Project, deliverable, version, comment, annotation, approval, playback, download, and delete operations enforce studio ownership and role permissions.
6. Proofing users cannot upload, create versions, edit project structure, approve, delete, or administer the instance.
7. Destructive actions require Admin authorization and confirmation.
8. The account menu shows the current user, role, and studio, with a working logout action.

## Synchronized server and client/UI task tracks

The following execution view is the implementation order for the detailed backlog below. Every phase is split into **Server/API**, **Client/UI**, and **Integration/verification** work. A client task in a phase may begin against a versioned server contract or test stub, but its phase cannot exit until the real server behavior and client behavior pass together.

### Synchronization rules

- Server/API work defines the request/response shapes, authentication requirements, error codes, role capabilities, loading states, and persistence behavior before the corresponding UI work is considered complete.
- Client/UI work must consume the server contract through the typed API layer; it must not duplicate authorization decisions or trust client-supplied studio/user/role identifiers.
- Each phase ends with an integration gate covering the changed server routes, client screens, persistence, and deny/allow behavior.
- A UI-only visual pass cannot mark a server-dependent task complete, and a passing API test cannot mark a user-facing flow complete.
- Test fixtures must cover Admin, Creative, and Proofing accounts and must identify which behavior is a permitted mutation, a permitted read, or a denied action.

### Phase 0 — Scope, contracts, and design system

#### Server/API

- [x] Convert the role matrix into a server capability contract for Admin, Creative, and Proofing.
- [x] Define API conventions for `401`, `403`, `404`, `409`, `413`, validation failures, expired sessions, expired invites, and delivery failures.
- [x] Define the single-studio invariant and the bootstrap Admin lifecycle.
- [x] Define the supported Node LTS, Docker, NAS/Linux, browser, media, storage, and SMTP boundaries.
- [x] Define the data ownership, deletion, recovery, no-support, and backup/restore contracts.

#### Client/UI

- [x] Map the application route tree to public, setup, authenticated, Admin-only, Creative, and Proofing surfaces.
- [x] Define navigation visibility and disabled/hidden behavior for each role without treating hidden controls as authorization.
- [x] Define shared UI states for loading, empty, unauthorized, forbidden, expired session, expired invite, validation error, delivery failure, and offline/unavailable server.
- [x] Define the visual language for role badges, studio identity, account menu, destructive actions, and setup progress.
- [x] Define the responsive desktop/tablet behavior for setup, review, Team, profile, and login screens.

#### Integration/verification

- [x] Review the server capability contract and route map against the client route map before implementation.
- [x] Create representative Admin, Creative, and Proofing fixtures and an API/UI test matrix.
- [x] Confirm that deferred SaaS, guest, billing, and support features have no required client or server surface.

**Phase exit:** the server contract, client route/state map, role matrix, and acceptance fixtures agree before feature implementation begins.

### Phase 1 — Identity, database, and API foundation

#### Server/API

- [x] Add the database boundary and Drizzle ORM/Drizzle Kit while retaining `better-sqlite3` and the existing SQLite file path.
- [x] Introspect the current schema and reconcile Drizzle schema/migration ownership for new identity tables versus legacy SQL migrations.
- [x] Add `studios`, `users`, `sessions`, `invitations`, and `audit_events` schema with `admin`, `creative`, and `proofing` roles.
- [x] Add constraints for one studio per instance, one bootstrap Admin, normalized email uniqueness, valid roles, session lookup, invite tokens, and safe foreign-key behavior.
- [ ] Add fresh-database, existing-database, repeated-startup, schema-drift, rollback, WAL, foreign-key, busy-timeout, and data-preservation tests.
- [x] Add typed server DTOs/contracts for current session, studio profile, users, invitations, setup status, and role capabilities.

#### Client/UI

- [x] Add the typed client API models and request functions for setup status, current session, studio profile, users, invitations, and role capabilities.
- [x] Add route guards for public, first-run setup, authenticated, and role-restricted routes based on server responses.
- [x] Add a temporary setup/login shell that can consume the server contract before the full visual flow is built.
- [x] Add role-aware navigation and a current-user/studio context provider; never derive authorization from local role state alone.
- [x] Add client handling for `401` session expiry, `403` forbidden actions, setup conflicts, validation errors, and unavailable server states.

#### Integration/verification

- [x] Verify the client API types match the server response schemas and error envelope.
- [ ] Run a fresh database through setup status and confirm the UI cannot enter normal application routes before setup.
- [x] Run an existing-database migration fixture and confirm current proofing data remains visible through the new API contract.
- [x] Verify a Drizzle identity slice is in use while existing proofing queries remain behaviorally unchanged.

**Phase exit:** the server exposes a tested identity/studio contract, the client consumes it through typed APIs, and the Drizzle slice works with `better-sqlite3` without changing existing proofing data.

### Phase 2 — Authentication and first-run bootstrap

#### Server/API

- [ ] Implement setup status and race-safe first Admin creation.
- [ ] Implement password hashing, login, secure sessions, current-user, logout, expiry, cleanup, and password change.
- [ ] Implement the documented Admin recovery path, including SMTP-unavailable recovery and session invalidation.
- [ ] Decide and implement Basic Auth removal or its explicitly limited emergency/bootstrap role.
- [ ] Add rate limiting, CSRF protection, generic auth errors, and security/audit events.
- [ ] Add first-run negative tests for public routes, media, downloads, repeated setup, concurrent setup, and setup after completion.

#### Client/UI

- [ ] Build the login screen with email/password validation, generic failure handling, rate-limit messaging, and retry behavior.
- [ ] Build the first-run Admin account screen with password requirements and setup conflict handling.
- [ ] Build session-expiry handling, logout, unauthorized/forbidden screens, and recovery entry points.
- [ ] Ensure the client never stores or displays plaintext passwords, session tokens, invite tokens, or SMTP credentials.
- [ ] Remove the Basic Auth-dependent UI flow from normal application navigation.

#### Integration/verification

- [ ] Complete fresh deployment → setup → login → logout → login again through the real browser UI.
- [ ] Verify Admin recovery works with and without SMTP and invalidates affected sessions.
- [ ] Verify concurrent setup attempts produce exactly one Admin and one successful setup state.
- [ ] Verify all role-restricted screens redirect or render safe forbidden states without leaking data.

**Phase exit:** a fresh instance can be claimed by exactly one bootstrap Admin and the complete authentication lifecycle works through the UI and API.

### Phase 3 — Studio profile and application shell

#### Server/API

- [ ] Implement authenticated studio read/update APIs and safe avatar upload/replace/delete behavior.
- [ ] Validate studio names, image MIME/type/size, generated filenames, path boundaries, and file-serving authorization.
- [ ] Return current studio, user, role, and avatar metadata through the authenticated session contract.
- [ ] Add tests for Admin access and Creative/Proofing denial of studio administration.

#### Client/UI

- [ ] Build the first-run studio name and avatar setup screen.
- [ ] Build studio profile/settings screens with upload progress, validation, preview, replacement, deletion, and retry states.
- [ ] Replace hard-coded `BRZRK Studio` and `admin@brzrk.com` values in the shell.
- [ ] Display studio identity, current user, and role in the header/sidebar/account menu.
- [ ] Ensure Creative and Proofing users see safe read-only identity surfaces and no Admin controls.

#### Integration/verification

- [ ] Complete Admin creation → login → studio name/avatar → application shell through the browser.
- [ ] Verify avatar files cannot be read or replaced across studios or by unauthorized roles.
- [ ] Verify a reload and restart preserve studio identity without exposing secrets or stale client identity.

**Phase exit:** the Admin can complete studio setup and every role sees the correct server-derived studio/user identity.

### Phase 4 — Team membership, roles, and invitations

#### Server/API

- [ ] Implement Admin-only user listing, invitation creation, resend, revoke, role assignment, disable/reactivate, and last-Admin protections.
- [ ] Persist and enforce invitation roles; acceptance cannot change a selected role.
- [ ] Implement secure invite-token hashing, expiry, one-time use, replay protection, and duplicate rules.
- [ ] Implement generic SMTP with explicit TLS/authentication/timeout/error behavior and local secret handling.
- [ ] Implement Admin-only SMTP test delivery and accurate delivery status.
- [ ] Implement invitation templates containing studio, recipient, role, instance URL, expiry, and self-hosting context.
- [ ] Add Admin/Creative/Proofing allow/deny tests for all team, SMTP, and invitation routes.

#### Client/UI

- [ ] Build the Admin-only Team page with users, roles, status, pending invites, resend, revoke, disable, reactivate, and validation states.
- [ ] Build role selection with the fixed role descriptions and prevent invitation of an arbitrary/custom role.
- [ ] Build SMTP configuration/test UI with masked credentials, safe errors, test status, and no secret echoing.
- [ ] Build invite acceptance and password creation screens showing studio name and assigned role.
- [ ] Build role-aware controls so Creative and Proofing users cannot reach Team or SMTP administration through navigation or direct URLs.

#### Integration/verification

- [ ] Admin configures/test-delivers SMTP → invites Creative → Creative accepts and logs in.
- [ ] Admin configures/test-delivers SMTP → invites Proofing → Proofing accepts and logs in.
- [ ] Verify invitation email capture contains the correct role and secure link.
- [ ] Verify expired, revoked, replayed, duplicate, delivery-failed, and wrong-role attempts behave consistently in API and UI.
- [ ] Verify no invitation, SMTP, telemetry, or error path contacts brzrk or requires a centralized credential.

**Phase exit:** Admin can independently invite both supported non-Admin roles, and each role receives the correct account experience.

### Phase 5 — Studio ownership and authorization

#### Server/API

- [ ] Add and backfill studio ownership for every studio-owned table, upload, avatar, and file path.
- [ ] Require authenticated server-derived studio context in every repository method and route.
- [ ] Enforce the role matrix on project, deliverable, version, comment, annotation, approval, playback, download, upload, delete, team, settings, and legacy CRM/finance routes.
- [ ] Enforce the single-studio-per-instance invariant while using a second studio only as an isolated test fixture.
- [ ] Add route/file-serving inventory and exhaustive allow/deny tests, including nested, search, aggregate, duplicate, archive, and download paths.
- [ ] Add Admin-superset tests proving Admin can perform every permitted Creative and Proofing operation.
- [ ] Add Proofing deny tests for all mutations outside comments and annotations; define comment/annotation ownership, edit, and moderation policy.

#### Client/UI

- [ ] Build role-aware project, deliverable, upload, version, comment, annotation, approval, compare, download, and delete controls.
- [ ] Hide or disable controls that the current role cannot use, while preserving server-side denial as the authority.
- [ ] Render forbidden states and safe empty states without leaking cross-studio existence.
- [ ] Ensure current user/studio context is sent only through the session and not as trusted client authorization data.
- [ ] Remove or restrict non-MVP CRM/finance/capacity surfaces for Creative and Proofing users.

#### Integration/verification

- [ ] Run the complete three-role matrix against every classified route and file-serving path.
- [ ] Verify two fixture studios cannot read, write, stream, download, or delete one another’s data.
- [ ] Verify Admin can complete every permitted Creative and Proofing flow through the UI.
- [ ] Verify Proofing cannot upload, version, edit, approve, delete, administer, or elevate privileges through direct requests or manipulated UI state.

**Phase exit:** server and client enforce the same role/ownership contract, with Admin proven as the superset and Proofing proven as review-only except comments/annotations.

### Phase 6 — Authenticated proofing workflow

#### Server/API

- [ ] Convert the existing proofing endpoints and repository operations to authenticated user/studio context.
- [ ] Preserve version ordering, range playback, comments, annotations, approvals, comparison, downloads, and deletion semantics.
- [ ] Ensure failed uploads leave no orphan metadata/files and all large-file operations remain outside long database transactions.
- [ ] Add authenticated authorship and comment/annotation mutation policy enforcement.

#### Client/UI

- [ ] Connect the real authenticated session to dashboard, project, deliverable, review, compare, upload, comments, annotations, approval, and download screens.
- [ ] Remove client-supplied author identity and show server-derived author names/roles.
- [ ] Add role-specific upload/version/approval/delete controls and clear forbidden messaging.
- [ ] Add loading, retry, upload progress, range-playback, empty, error, and expired-session states.
- [ ] Ensure the complete review flow is usable at supported desktop breakpoints.

#### Integration/verification

- [ ] Run Admin end-to-end proofing workflow.
- [ ] Run Creative end-to-end upload/version/proofing workflow.
- [ ] Run Proofing end-to-end view/comment/annotate/compare/download workflow.
- [ ] Verify Proofing cannot mutate media, versions, structure, approval, or deletion through the UI or API.
- [ ] Run a two-user browser walkthrough with authenticated authorship and a second-studio deny fixture.

**Phase exit:** Admin, Creative, and Proofing users complete their permitted portions of the real proofing workflow without cross-studio access.

### Phase 7 — Self-hosted release and operations

#### Server/API and deployment

- [ ] Upgrade the current Node 20 runtime to a supported Node LTS baseline before release.
- [ ] Update Dockerfile, Compose, health checks, environment validation, and documented NAS/Linux installation.
- [ ] Define application Admin versus host/operator responsibilities for Docker, NAS, networking, HTTPS/VPN, storage, backups, upgrades, and recovery.
- [ ] Document Drizzle/legacy migration ordering, backup-before-migration, interrupted migration behavior, and unsupported downgrade behavior.
- [ ] Verify backup/restore semantics for database, media, avatars, users, invites, setup state, and session revocation.
- [ ] Document local secret permissions, rotation, missing-secret startup behavior, process exposure, and backup inclusion/exclusion.

#### Client/UI and documentation

- [ ] Build the complete first-run wizard and onboarding guidance for install → Admin → studio → invite → role-specific login.
- [ ] Add deployment/configuration error screens with safe remediation guidance.
- [ ] Document role capabilities, SMTP setup, recovery, backup/restore, upgrade, rollback, and no-support boundaries.
- [ ] Add screenshots or a walkthrough for Admin, Creative, and Proofing experiences.
- [ ] Ensure README and public documentation do not describe obsolete Basic Auth/private-pilot behavior as the primary path.

#### Integration/verification

- [ ] Complete a clean-machine operator walkthrough using only public documentation and no James/developer intervention.
- [ ] Run Docker Compose and documented Synology/Linux installation checks.
- [ ] Run clean install, upgrade, backup, restore, recovery, SMTP capture/delivery, and media tests.
- [ ] Verify no centralized brzrk network dependency or credential is required in an offline/self-hosted run.

**Phase exit:** a technically capable studio can install, configure, onboard, operate, recover, and restore Playblast independently.

### Phase 8 — Release candidate, adoption, and funding gate

#### Server/API

- [ ] Run the complete server test suite, migration suite, security checks, dependency audit, and production build.
- [ ] Verify route inventory coverage, role matrix coverage, single-studio invariant, session security, invite security, and secret handling.
- [ ] Verify release artifact reproducibility and documented upgrade path.

#### Client/UI

- [ ] Run browser QA on supported desktop browsers for all three roles.
- [ ] Verify responsive setup, login, Team, profile, review, upload, comparison, and error states.
- [ ] Verify no role can access hidden functionality through direct URLs or stale client state.
- [ ] Verify accessible labels, keyboard navigation, focus handling, and destructive-action confirmations on the MVP surfaces.

#### Integration/verification

- [ ] Run the full canonical checks: tests, build, lint, dependency audit, backup/restore, clean install, migrations, browser QA, and SMTP capture/delivery.
- [ ] Verify Admin superset, Creative capabilities, Proofing restrictions, one-studio invariant, and two-studio deny paths.
- [ ] Verify no credentials, tokens, SMTP configuration, or private data are committed or exposed in logs/errors.
- [ ] Confirm release tag, changelog, reproducible artifact, public issue/security process, and no-support language.
- [ ] Recruit initial self-hosted adopters and track installs, repeat review cycles, issues, donations, sponsorships, and rejection reasons separately from technical readiness.

**Phase exit:** the release candidate passes the server/client integration matrix and is ready for independent self-hosted adoption testing.

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
