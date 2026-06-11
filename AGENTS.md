# AGENTS.md

## Cursor Cloud specific instructions

Playblast is a single-tier, frontend-only Vite + React 19 + TypeScript SPA (a video-proofing UI prototype). All data is hardcoded mock data — there is no backend, database, auth, or environment variables.

Standard commands live in `package.json`:
- Dev server: `npm run dev` (Vite, serves on port `5173`). Add `-- --host` to expose it on the network interface.
- Lint: `npm run lint`
- Build: `npm run build` (runs `tsc -b` then `vite build`)
- Preview built output: `npm run preview`

Notes:
- Node 22 (or any version satisfying Vite 8's requirement of Node ^20.19 / >=22.12) is required.
- There are no automated tests in this repo; verify changes via lint, build, and manual UI interaction.
