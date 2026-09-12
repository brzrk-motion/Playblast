# Navigation matrix

Source of truth: `@playblast/shared` (`navigation.ts`).

## Visibility values

| Value | UI behavior | Authorization |
|-------|-------------|---------------|
| `visible` | Render nav item | Server still enforces on navigation |
| `hidden` | Do not render | Direct URL must 403/redirect |
| `disabled` | Render disabled with tooltip | Server still enforces |

Hidden or disabled controls are never authorization.

## Main navigation

| Item | Admin | Creative | Proofing |
|------|:-----:|:--------:|:--------:|
| Dashboard | visible | visible | visible |
| Projects | visible | visible | visible |
| Pipeline | visible | hidden | hidden |
| Clients | visible | hidden | hidden |
| Services | visible | hidden | hidden |
| Timesheet | visible | hidden | hidden |
| Capacity | visible | hidden | hidden |
| Team | visible | hidden | hidden |

## Secondary and account

| Item | Admin | Creative | Proofing |
|------|:-----:|:--------:|:--------:|
| Settings | visible | visible | visible |
| Profile | visible | visible | visible |
| Log out | visible | visible | visible |

CRM and operations nav items are available to Admin and Account Executive users. Creative and Proofing users retain production routes through Projects.

Client adapter: `getVisibleNavItems()` from `@playblast/shared`.
