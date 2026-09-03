# Phase 0 — Scope, contracts, and design system

Phase 0 establishes the executable contracts and documentation that later implementation follows. The phase description is historical; application auth, setup screens, and route guards were delivered in later phases.

## Artifacts

| Track | Artifact | Location |
|-------|----------|----------|
| Shared | Role capability matrix, API errors, bootstrap rules | `@playblast/shared` (`shared/src/`) |
| Server | Capability contract tests | `server/src/contracts/phase0.test.ts` |
| Client | Route/nav/UI-state adapters | `client/src/lib/mvp-contracts.ts` |
| Client | Contract tests | `client/src/lib/phase0-contracts.test.ts` |
| Docs | Human-readable specifications | `docs/phase-0/*.md` |

## Executable contracts

Import from `@playblast/shared`:

- `ROLE_CAPABILITY_MATRIX`, `hasCapability()` — server authorization source of truth
- `API_ERROR_CODES`, `createApiError()` — canonical error envelope
- `BOOTSTRAP_LIFECYCLE`, `SINGLE_STUDIO_INVARIANT` — setup lifecycle
- `PLATFORM_BOUNDARIES`, `OPERATIONS_CONTRACT` — deployment and ops boundaries
- `APP_ROUTES`, `NAV_ITEMS`, `UI_STATE_CATALOG` — client route and state map
- `FIXTURE_USERS`, `buildCapabilityTestMatrix()` — integration fixtures

## Phase exit gate

Phase 0 is complete when:

1. Server capability contract, API conventions, bootstrap rules, platform boundaries, and operations contract are defined and tested.
2. Client route map, navigation matrix, UI state catalog, visual language tokens, and responsive spec are defined.
3. Integration crosswalk confirms server capabilities align with client routes and navigation.
4. Admin, Creative, and Proofing fixtures and test matrices exist.
5. Deferred SaaS, guest, billing, and support surfaces are explicitly out of scope.

Proceed to Phase 1 only after this gate passes.

## Verification

```bash
npm install
npm run test -w shared
npm run test -w server
npm run test -w client
npm run lint
npm run build
```
