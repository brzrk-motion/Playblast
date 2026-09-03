# Integration crosswalk

Verifies that the server capability contract, client route map, and navigation matrix remain aligned after implementation.

## Automated checks

| Check | Location |
|-------|----------|
| Admin superset over Creative and Proofing | `shared/src/phase0.test.ts` |
| CRM routes admin-only | `shared/src/phase0.test.ts`, `server/src/contracts/phase0.test.ts` |
| Nav hidden for non-Admin CRM items | `client/src/lib/phase0-contracts.test.ts` |
| API error → UI state mapping | `shared/src/phase0.test.ts`, client tests |

Run: `npm run test`

## Capability ↔ route alignment

| Capability | Primary routes |
|------------|----------------|
| `projects.view` | `/`, `/projects`, project overview |
| `review.play` | deliverable review |
| `review.compare` | compare |
| `projects.mutate` | project/deliverable create/edit (server-enforced) |
| `media.upload` | upload endpoints and UI (server-enforced) |
| `team.manage` | `/team` (Admin-only) |
| `setup.complete` | `/setup*` (setup lifecycle) |

## Navigation ↔ route alignment

Every `visible` nav item maps to an `APP_ROUTES` entry with equal or broader access. CRM nav items map to `admin` routes.

## Fixtures

`FIXTURE_USERS`, `FIXTURE_SESSIONS`, and `FIXTURE_INVITATIONS` in `@playblast/shared` document the contract fixtures for Admin, Creative, and Proofing identities. Runtime E2E setup creates isolated database fixtures independently.

Test matrices: `buildCapabilityTestMatrix()`, `buildRouteTestMatrix()`, `buildNavTestMatrix()`.
