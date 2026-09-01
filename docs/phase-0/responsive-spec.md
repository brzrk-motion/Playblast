# Responsive specification

Source of truth: `@playblast/shared` (`RESPONSIVE_BREAKPOINTS` in `ui-states.ts`).

## Breakpoints

| Token | Value | Usage |
|-------|-------|-------|
| `tabletMin` | 768px | Collapsed sidebar, stacked forms |
| `desktopMin` | 1024px | Full application shell |
| `reviewMinWidth` | 1024px | Side-by-side review and compare |
| `setupMaxWidth` | 480px | Setup wizard content column |
| `loginMaxWidth` | 400px | Login and invite password forms |
| `teamTableMinWidth` | 768px | Team table horizontal scroll |

## Screen behavior

### Setup and login

- Centered card layout with `setupMaxWidth` / `loginMaxWidth`.
- Single column on all breakpoints.
- Progress stepper wraps on narrow viewports.

### Review and compare

- Minimum width `reviewMinWidth` for dual-pane compare.
- Below breakpoint: stack players vertically with shared transport controls.
- Comment panel collapses to drawer below player on tablet.

### Team (Phase 4)

- Full table at `teamTableMinWidth` and above.
- Below: card list per member/invite with role badge and status.

### Profile

- Read-only identity block full width.
- Password change form uses `loginMaxWidth` centered column.

Mobile-native layouts are out of MVP scope.
