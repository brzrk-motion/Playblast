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

## Routes

| Path | Access | Capabilities |
|------|--------|--------------|
| `/login` | public | — |
| `/setup` | setup | `setup.complete` |
| `/setup/studio` | setup | `setup.complete`, `studio.manage` |
| `/setup/complete` | setup | `setup.complete` |
| `/invite/:token` | public | — |
| `/` | authenticated | `projects.view` |
| `/projects` | authenticated | `projects.view` |
| `/projects/:projectId` | authenticated | `projects.view` |
| `/projects/:projectId/deliverables/:deliverableId` | authenticated | `review.play` |
| `/projects/:projectId/deliverables/:deliverableId/compare` | authenticated | `review.compare` |
| `/team` | admin | `team.manage` |
| `/settings` | authenticated | `studio.view` |
| `/profile` | authenticated | `studio.view` |
| `/clients` | admin | `projects.view` |
| `/pipeline` | admin | `projects.view` |
| `/services` | admin | `projects.view` |
| `/timesheet` | admin | `projects.view` |
| `/capacity` | admin | `projects.view` |
| `/forbidden` | public | — |
| `/session-expired` | public | — |

Route guards and screens implement this contract; navigation visibility for CRM surfaces is Admin-only per `navigation.ts`.
