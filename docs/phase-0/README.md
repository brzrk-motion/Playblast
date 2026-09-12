# Phase 0 — Scope, contracts, and design system

Phase 0 establishes the executable contracts and documentation that later implementation follows. The phase description is historical; application auth, setup screens, and route guards were delivered in later phases.

## Artifacts

| Track | Artifact | Location |
|-------|----------|----------|
| Shared | Role capability matrix, API errors, bootstrap rules | `@playblast/shared` (`shared/src/`) |
| Server | Release verification and route inventory | `server/src/release-verification.test.ts` |
| Client | Route/nav/UI-state contracts | `@playblast/shared` (`shared/src/`) |
| Shared | Contract tests | `shared/src/phase0.test.ts` |
| Docs | Human-readable specifications | `docs/phase-0/*.md` |

## Executable contracts

Import from `@playblast/shared`:

- `ROLE_CAPABILITY_MATRIX`, `hasCapability()` — server authorization source of truth
- `API_ERROR_CODES`, `createApiError()` — canonical error envelope
- `BOOTSTRAP_LIFECYCLE` — setup lifecycle
- `APP_ROUTES`, `NAV_ITEMS`, `UI_STATE_CATALOG` — client route and state map
- `buildCapabilityTestMatrix()`, `buildRouteTestMatrix()`, `buildNavTestMatrix()` — test matrices

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
