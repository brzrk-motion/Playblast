---
version: 1
slug: "client-src-pages-deliverable-tsx"
primary_target: "client/src/pages/deliverable.tsx"
related_targets: ["client/src/components/video/video-review.tsx","client/src/pages/compare.tsx"]
---

# Surface brief: Deliverable review

**Target:** `client/src/pages/deliverable.tsx` (`/projects/:projectId/deliverables/:deliverableId`)
**Visitor mode:** Operate
**Related:** `client/src/components/video/video-review.tsx`, `client/src/pages/compare.tsx`

## Job and audience

- **Who:** Admin, Creative, Account Executive, and Proofing users reviewing a single deliverable version inside their studio's self-hosted instance.
- **Context:** Mid-review session — client feedback just landed, internal creative checking annotations, or AE doing a read-only pass with comment rights.
- **Primary job:** Watch the current version, scrub to exact frames, read/write timestamped comments and frame annotations, switch versions, and (where permitted) approve or request revision.
- **Success:** Feedback is captured at the right timecode without leaving the player; version status is obvious; focus mode removes distraction when needed.

## Outcome and proof

- **Primary action:** Leave a comment or annotation tied to the current playback position, or change review status on the active version.
- **Proof on screen:** Real video from `/video/*`, version label, status badge, comment thread sorted by timecode, scrub-bar markers colored by author index.
- **Product truth:** Proofing users cannot upload or approve; Creatives cannot see CRM fields; server enforces both — UI mirrors but does not substitute.

## Selected direction

- **Visual authority:** Incumbent Playblast design (`DESIGN.md`) — dark proofing floor, video sovereignty, annotation ember accent.
- **Structural thesis:** Two-column desktop (player + comments/versions); player column dominates width; peripheral chrome collapses into drawers and focus mode (`Z`).
- **Focal moment:** Scrub bar with colored comment markers and the annotation overlay on pause.
- **Implementation consequence:** Preserve Vidstack player, `VideoReview` composition, lazy-loaded route chunk, and existing capability gates (`useCapability`).

## Scope and boundaries

- **Fidelity:** Production-ready refinement of the existing surface, not a greenfield redesign.
- **In scope:** Layout hierarchy, comment panel density, version selector UX, focus mode affordances, loading/error/empty states per `ui-states.md`.
- **Out of scope:** CRM widgets, invoice panels, new player library, dialog-level lazy loading.
- **Anti-goals:** Marketing hero treatment, light-mode-first review UI, decorative charts beside the player.

## States and ranges

| State | Behavior |
|-------|----------|
| Loading | `PageLoading` skeleton for player + sidebar panels |
| Empty versions | `EmptyState` with upload CTA (Creative/Admin only) |
| Error | `PageError` with retry; session expiry redirects |
| Focus mode | Hides non-essential chrome; keyboard hint for exit |
| Many comments | Thread scrolls; markers cycle `marker-1`…`marker-5` |
| Long deliverable names | Truncate in header with full name in page header context |

Typical: 1–8 versions, 5–80 comments, 1080p–4K video, 30s–3min duration.

## Interaction and layout

- **Hierarchy:** Back link → deliverable title + status → player (primary) → version list / upload (secondary) → comments (persistent panel).
- **Topology:** `AppLayout` with full-height main; `VideoReview` fills available height; comments panel resizable or stacked on mobile.
- **Affordances:** Play/pause, frame step, playback speed, fullscreen, compare link, download (role-gated), approve/revision (role-gated).
- **Feedback:** Toasts on comment CRUD; inline `ActionErrorBanner` for non-blocking failures; optimistic UI avoided for approval status.

## Constraints and open decisions

- **Platform:** Web, desktop-first; tablet stacks panels; keyboard shortcuts documented in `KeyboardShortcutsPanel`.
- **Accessibility:** Focus rings on all controls; reduced-motion respected in HUD; comment composer labeled.
- **Performance:** Route-level code split already ships Vidstack in deliverable chunk — preserve.
- **Open:** None for MVP — refine within incumbent layout only.
