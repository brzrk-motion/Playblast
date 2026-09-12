# Integration crosswalk

Verifies that the server capability contract, client route map, and navigation matrix remain aligned after implementation.

## Automated checks

| Check | Location |
|-------|----------|
| Admin superset over Creative and Proofing | `shared/src/phase0.test.ts` |
| CRM routes require business capability | `shared/src/phase0.test.ts` |
| Nav hidden for non-Admin CRM items | `shared/src/phase0.test.ts` |
| API error → UI state mapping | `shared/src/phase0.test.ts` |

Run: `npm run test`

## Capability ↔ route alignment

| Capability | Primary routes |
|------------|----------------|
| `projects.view` | `/`, `/projects`, project overview |
| `review.play` | deliverable review |
| `review.compare` | compare |
| `projects.mutate` | project/deliverable create/edit (server-enforced) |
| `media.upload` | upload endpoints and UI (server-enforced) |
| `team.view` | `/team` (Admin and Account Executive read-only) |
| `setup.complete` | `/setup*` (setup lifecycle) |

## Navigation ↔ route alignment

Every `visible` nav item maps to an `APP_ROUTES` entry with equal or broader access. CRM nav items map to `admin` routes.

## Fixtures

Runtime E2E setup (`e2e/fixtures/`) creates isolated database fixtures for Admin, Account Executive, Creative, and Proofing identities. Test matrices in `@playblast/shared`: `buildCapabilityTestMatrix()`, `buildRouteTestMatrix()`, `buildNavTestMatrix()`.
