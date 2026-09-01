# Integration crosswalk

Verifies server capability contract, client route map, and navigation matrix agree before Phase 1.

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
| `projects.mutate` | project/deliverable create/edit (Phase 5 enforcement) |
| `media.upload` | upload endpoints and UI (Phase 5) |
| `team.manage` | `/team` (Phase 4) |
| `setup.complete` | `/setup*` (Phase 2) |

## Navigation ↔ route alignment

Every `visible` nav item maps to an `APP_ROUTES` entry with equal or broader access. CRM nav items map to `admin` routes.

## Fixtures

`FIXTURE_USERS`, `FIXTURE_SESSIONS`, and `FIXTURE_INVITATIONS` in `@playblast/shared` provide Admin, Creative, and Proofing identities for Phase 1+ tests.

Test matrices: `buildCapabilityTestMatrix()`, `buildRouteTestMatrix()`, `buildNavTestMatrix()`.
