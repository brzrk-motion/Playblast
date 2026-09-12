# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary users:** motion design and CGI studios reviewing renders and motion work on a private network or VPN.

| Role | Job in the product |
|------|-------------------|
| **Admin** | First-run setup, studio profile, SMTP, team invites, roles, and full proofing + CRM/finance access |
| **Account Executive** | Clients, leads, pipeline, services, timesheet, capacity, invoicing; read-only project context; can review/comment |
| **Creative** | Upload versions, manage projects/deliverables, proof, annotate, compare, approve; no admin or CRM/finance |
| **Proofing** | View/play, comment, annotate, compare, download; no uploads, approvals, CRM/finance, or admin |

**Operators (out of app):** studio IT or deployment owners who install Docker, manage volumes, backups, TLS, and host networking. Playblast documents operator duties but does not manage the host from inside the app.

## Product Purpose

Playblast is a free, open-source, self-hosted video proofing and studio CRM tool. Studios run one instance per organization with local SQLite metadata and filesystem video storage.

**Success means:** a studio can deploy without vendor support, complete first-run setup, invite the team, upload versions, collect timestamped comments and frame annotations, compare versions side-by-side, run approval workflows, and (for Admin/AE) manage clients, pipeline, services, timesheet, capacity, and invoicing — all with server-enforced roles.

## Positioning

Unlike hosted proofing SaaS, Playblast is **one MIT-licensed instance per studio** with **no multi-tenant cloud**, **no paid support SLA**, and **no founder-installed deployments**. Proofing and commercial operations share one self-hosted deployment with **role-separated access** enforced on the server, not hidden UI.

## Operating Context

- **Deployment:** Docker on Linux or Synology NAS; single Node process serves API + built client on port 3000; persistent `data/` (SQLite) and `uploads/` volumes.
- **Network:** Private studio network or VPN; optional reverse proxy/TLS documented for operators.
- **Auth:** Playblast login sessions after first-run bootstrap; optional emergency HTTP Basic Auth only before setup completes.
- **Workflows:** First-run admin → studio profile → optional SMTP → team invites → projects → deliverables → versions → review/compare/approve; parallel CRM/finance surfaces for Admin and Account Executive.
- **North star:** `docs/Playblast-MVP-Audit.md` is the authoritative product and implementation brief.

## Capabilities and Constraints

**In scope (MVP):**

- Projects, deliverables, video versions, playback (Vidstack), timestamped comments, frame annotations, comparison, review states, approvals, downloads
- CRM/finance: clients, leads, pipeline, services, timesheet, capacity, project invoicing (Admin + Account Executive)
- Identity: four roles, invitations, SMTP, session auth, studio profile
- Self-hosted backup/restore/upgrade documentation

**Explicitly out of scope (unless audit is revised):**

- Hosted SaaS, multi-tenant cloud, paid support commitments, billing inside the product
- Playblast managing Docker, OS, NAS, DNS, HTTPS, or backups from inside the app

**Technical constraints:**

- Monorepo: `@playblast/client` (React 19, Vite 8, TypeScript, shadcn/ui, Tailwind, Vidstack) + `@playblast/server` (Express 5, SQLite via `better-sqlite3`, Drizzle for identity)
- Node 22 LTS; single SQLite file; local filesystem uploads
- Authorization must be server-side; hidden or disabled UI is not authorization

**Terminology:** studio (one per instance), deliverable, version, proofing (review role), project overview, compare.

## Brand Commitments

- **Name:** Playblast
- **License:** MIT; sponsorship-first open source from Brzrk Interactive (see `README.md`, `SPONSORS.md`)
- **Voice:** Operator-facing docs are direct and procedural; in-app copy is studio-professional, not consumer SaaS
- **Studio identity:** Server-derived studio name and avatar in shell; role badges per `ROLE_BADGE_TOKENS` in `@playblast/shared`
- **No fabricated:** testimonials, customer logos, benchmarks, pricing, or deployment claims not present in the repository

## Evidence on Hand

| Asset | Location |
|-------|----------|
| Product/implementation brief | `docs/Playblast-MVP-Audit.md` |
| Operator deployment guides | `docs/deployment/` |
| Route and role contracts | `docs/phase-0/`, `shared/src/routes.ts`, `shared/src/navigation.ts` |
| UI state catalog | `docs/phase-0/ui-states.md`, `@playblast/shared` `ui-states.ts` |
| Visual language (tokens, badges, setup stepper) | `docs/phase-0/visual-language.md`, `client/src/index.css` |
| Public docs site | `docs/` + `docs-site/` (VitePress) |

**Absent — do not invent:** customer case studies, adoption metrics, commercial validation, or managed-service promises.

## Product Principles

1. **Self-hosted first** — one studio, one instance, local data ownership.
2. **Server is the authority** — roles, capabilities, and data scope are enforced in API responses and route guards.
3. **Proofing is the core loop** — upload → version → review → compare → approve; CRM/finance supports the business around it.
4. **Operators own the metal** — clear boundary between in-app admin and deployment-owner responsibilities.
5. **Document what ships** — operator and phase-0 docs stay synchronized with behavior changes.

## Accessibility & Inclusion

- Use semantic HTML, labels, roles, keyboard navigation, and focus management via shadcn/ui primitives.
- Loading, error, empty, forbidden, and session-expired states are cataloged and must remain perceivable (`PageLoading`, `PageError`, `EmptyState`).
- No product-specific WCAG level is mandated in-repo; treat keyboard-accessible review flows and readable contrast as release requirements for UI work.
