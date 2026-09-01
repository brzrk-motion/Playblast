# Client route map

Source of truth: `@playblast/shared` (`routes.ts`).

## Access levels

| Level | Meaning |
|-------|---------|
| `public` | No session required |
| `setup` | First-run setup only; blocked after `complete` |
| `authenticated` | Any signed-in studio member |
| `admin` | Admin role only |
| `creative` | Admin or Creative |
| `proofing` | All roles (review surfaces) |

## Implemented routes (current branch)

| Path | Access | Capabilities |
|------|--------|--------------|
| `/` | authenticated | `projects.view` |
| `/projects` | authenticated | `projects.view` |
| `/projects/:projectId` | authenticated | `projects.view` |
| `/projects/:projectId/deliverables/:deliverableId` | authenticated | `review.play` |
| `/projects/:projectId/deliverables/:deliverableId/compare` | authenticated | `review.compare` |
| `/settings` | authenticated | `studio.view` |
| `/profile` | authenticated | `studio.view` |
| `/clients` | admin | `projects.view` |
| `/pipeline` | admin | `projects.view` |
| `/services` | admin | `projects.view` |
| `/timesheet` | admin | `projects.view` |
| `/capacity` | admin | `projects.view` |

## Planned routes (Phase 1+)

| Path | Access |
|------|--------|
| `/login` | public |
| `/setup` | setup |
| `/setup/studio` | setup |
| `/setup/complete` | setup |
| `/invite/:token` | public |
| `/team` | admin |
| `/forbidden` | public |
| `/session-expired` | public |

Route guards and screens are implemented in Phase 1–4; this document is the contract they must follow.
