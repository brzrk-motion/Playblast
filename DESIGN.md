---
name: Playblast
description: Self-hosted video proofing and studio operations for motion studios
colors:
  background: "oklch(0.145 0 0)"
  foreground: "oklch(0.985 0 0)"
  card: "oklch(0.205 0 0)"
  primary: "oklch(0.922 0 0)"
  primary-foreground: "oklch(0.205 0 0)"
  muted: "oklch(0.269 0 0)"
  muted-foreground: "oklch(0.708 0 0)"
  destructive: "oklch(0.704 0.191 22.216)"
  border: "oklch(1 0 0 / 10%)"
  ring: "oklch(0.556 0 0)"
  surface: "oklch(0.205 0 0)"
  surface-raised: "oklch(0.269 0 0)"
  status-warning: "oklch(0.795 0.184 86.047)"
  status-success: "oklch(0.765 0.177 163.223)"
  annotation-accent: "oklch(0.705 0.213 47.604)"
  sidebar-primary: "oklch(0.488 0.243 264.376)"
typography:
  page-title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  caption:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1rem"
  timestamp:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  2xl: "1.125rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "oklch(0.922 0 0 / 90%)"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
---

# Design System: Playblast

## Overview

**Creative North Star: "The Proofing Floor"**

Playblast looks and feels like a dim, focused review room on a studio LAN: dark surfaces, crisp type, and color reserved for status, markers, and the single warm annotation accent. The UI recedes so video stays sovereign; CRM and finance surfaces use the same shell but never compete with the player for attention.

Default theme is **dark** (`App` sets `defaultTheme="dark"`). Light mode exists for accessibility and operator preference but dark is the canonical proofing environment.

**Key Characteristics:**

- Video-first layout with collapsible chrome and focus mode on deliverable routes
- OKLCH semantic tokens with tonal surfaces (`background` → `surface` → `surface-raised`)
- Restrained accent usage; status colors carry workflow meaning (warning, success, pending)
- shadcn/ui primitives with Playblast utility classes (`interactive-card`, `focus-ring`, `type-*`)
- Mono timestamps and timecode in the player HUD; sans-serif everywhere else

## Colors

The palette is neutral-first with functional color only where it encodes review state, roles, or scrub-bar markers.

### Primary

- **Studio Ink** (`oklch(0.922 0 0)` dark / `oklch(0.205 0 0)` light): Primary buttons, key actions, admin role badge fill. High-contrast against dark cards.

### Secondary

- **Raised Panel** (`oklch(0.269 0 0)`): Secondary buttons, muted panels, sidebar accent rows. Separates content blocks without borders alone.

### Tertiary

- **Sidebar Signal** (`oklch(0.488 0.243 264.376)`): Active nav emphasis in the sidebar only. The one chromatic brand accent in the shell.

### Neutral

- **Floor Black** (`oklch(0.145 0 0)`): App background; the "room" the UI sits in.
- **Panel Graphite** (`oklch(0.205 0 0)`): Cards, popovers, sidebar base.
- **Muted Label** (`oklch(0.708 0 0)`): Secondary text, captions, empty-state copy.
- **Hairline Edge** (`oklch(1 0 0 / 10%)`): Borders and dividers on dark surfaces.

### Functional

- **Revision Amber** (`status-warning`): Deliverables in review, budget attention, warning badges.
- **Approved Green** (`status-success`): Approved versions, proofing role badge.
- **Marker Spectrum** (`marker-1`…`marker-5`): Comment scrub-bar colors; cycle by index, never arbitrary hex.
- **Annotation Ember** (`oklch(0.705 0.213 47.604)`): Frame annotation strokes and drawing tools.

### Named Rules

**The Video Sovereignty Rule.** On deliverable and compare routes, non-player chrome must be collapsible or secondary. No full-width marketing bands, no chart widgets, no CRM tables in the primary viewport.

**The Functional Color Rule.** Color encodes state (status, role, marker, destructive). Decorative gradients and accent flooding are out of scope.

## Typography

**Display / UI Font:** `ui-sans-serif, system-ui, sans-serif` (Tailwind default stack)
**Mono Font:** `ui-monospace, SFMono-Regular, Menlo, monospace` (timecode, timestamps, keyboard hints)

**Character:** Dense and legible at 14px body; page titles are bold and tight-tracked; timestamps are mono and tabular in the player.

### Hierarchy

- **Page title** (700, 1.5rem / 2rem, tight): `.type-page-title` on every major route heading.
- **Section title** (600, 1.125rem / 1.75rem): `.type-section-title` on card headers and panel labels.
- **Body** (400, 0.875rem / 1.25rem): Default UI copy, form labels, table cells.
- **Caption** (400, 0.75rem, muted): Helper text, metadata, badge labels.
- **Timestamp** (500 mono, 0.75rem): Player time, comment timecodes, duration fields.

### Named Rules

**The Timecode Mono Rule.** Anything tied to playback position or duration uses the mono timestamp style, never proportional sans.

## Layout

4px base grid via Tailwind spacing scale. App shell: collapsible sidebar + header + scrollable main (`ScrollArea`), except deliverable/compare routes which use `overflow-hidden` full-height main for the player.

- **Page padding:** `p-6` typical content routes; deliverable review uses edge-to-edge video column.
- **Card rhythm:** `gap-6` inside cards; dashboard grids `sm:grid-cols-2 lg:grid-cols-4`.
- **Sidebar width:** shadcn `SidebarProvider` with icon collapse and `SidebarRail`.
- **Responsive:** Desktop-first; tablet collapses sidebar; player stacks comments below video on narrow widths.

## Elevation & Depth

Flat-by-default with tonal layering. Depth is conveyed by surface steps (`background` < `surface` < `surface-raised` < `card`) and subtle borders, not heavy shadows.

### Shadow Vocabulary

- **Resting card** (`shadow-sm`): Default card elevation.
- **Interactive hover** (`shadow-sm` on `.interactive-card`): Light lift on dashboard/project cards only.
- **Overlay** (`shadow-lg` + `backdrop-blur-sm`): `.surface-overlay` for floating panels.

### Named Rules

**The Flat-By-Default Rule.** Shadows appear on cards and overlays, not on every list row. Rows use `interactive-row` background shift instead.

## Shapes

Rounded rectangles throughout; no sharp corporate corners, no pill-everything.

- **Base radius** (`--radius: 0.625rem`): Buttons, inputs, badges.
- **Cards** (`rounded-xl`): Primary content containers.
- **Role badges** (`rounded-full`): Compact status chips.
- **Upload dropzone** (`rounded-xl border-dashed`): Version upload target.

Borders are 1px hairlines on `--border`; destructive actions use `destructive` variant with confirmation dialog.

## Components

### Buttons

- **Shape:** Medium rounding (`rounded-md`, 0.5rem)
- **Primary:** Studio Ink fill, slight scale-down on active (`active:scale-[0.98]`)
- **Outline / Ghost:** For secondary actions in toolbars and cards
- **Destructive:** Requires dialog confirmation for data deletion
- **Focus:** `ring-[3px] ring-ring/50` on buttons; `.focus-ring` utility elsewhere

### Chips / Badges

- **Role badges:** `.role-badge-admin|creative|proofing` per phase-0 contract
- **Version status:** `VersionStatusBadge`, `PipelineStatusBadge` using status token classes
- **Default badge:** `rounded-full`, `text-xs`, border-transparent or outline

### Cards / Containers

- **Corner:** `rounded-xl`
- **Background:** `bg-card` with `border` and `shadow-sm`
- **Interactive cards:** `.interactive-card` hover border primary/40 + muted wash
- **Internal padding:** `px-6 py-6` default; compact stat cards use tighter header

### Inputs / Fields

- **Style:** `h-9`, `rounded-md`, `border-input`, dark `bg-input/30`
- **Focus:** Border shift + `ring-[3px] ring-ring/50`
- **Error:** `aria-invalid` triggers destructive border/ring

### Navigation

- **Sidebar:** Studio avatar + name header; grouped nav from `getVisibleNavItems` by role
- **Active state:** `sidebar-accent` background, `sidebar-primary` for emphasis
- **Account menu:** Footer dropdown with profile, settings, logout

### Video Review Shell

- **Character:** Full-bleed player, auto-hiding HUD (`.video-controls`), warm annotation accent on canvas overlay
- **Focus mode:** Hides peripheral chrome; `Z` to exit
- **Comments panel:** Right or below player; marker colors on scrub bar

## Do's and Don'ts

### Do:

- **Do** default to dark theme for review surfaces and preserve focus mode on deliverable routes.
- **Do** use semantic tokens (`bg-card`, `text-muted-foreground`, `status-*`) instead of raw hex in components.
- **Do** use `PageLoading`, `EmptyState`, and `PageError` for cataloged UI states.
- **Do** enforce role visibility server-side; mirror with `getVisibleNavItems` in the sidebar only.

### Don't:

- **Don't** place CRM/finance data on proofing-only routes or expose budget fields to proofing users.
- **Don't** use decorative color outside status, markers, annotations, and the sidebar accent.
- **Don't** hide authorization by disabling controls alone — forbidden routes redirect to `/forbidden`.
- **Don't** break keyboard focus rings or reduced-motion support in the video HUD.
