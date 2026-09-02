# Changelog

All notable changes to this self-hosted Playblast MVP are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Version tags use `v0.x.y` for release candidates until the first studio-ready MVP tag.

## [Unreleased]

### Added

- Phase 8 release-candidate verification gate (`npm run verify:release-candidate`).
- Deterministic browser QA via Playwright (`npm run verify:browser-qa`).
- Repository secret scan (`npm run verify:secrets`).
- Release verification server suite covering API route inventory, role matrix, and single-studio isolation.
- Client release QA contract tests for route guards, navigation visibility, responsive tokens, and destructive confirmations.
- Public security policy (`SECURITY.md`) and release operator notes (`docs/release/README.md`).

### Changed

- CI now runs production build, lint, shared tests, dependency audit, secret scan, and browser QA gates.
- Canonical API route inventory aligns task and hours-summary routes with authenticated capability enforcement.

## [0.1.0-rc.1] - 2026-09-02

### Added

- Self-hosted studio MVP: first-run admin bootstrap, login sessions, studio profile, team invitations, SMTP configuration, and three application roles (`admin`, `creative`, `proofing`).
- Proofing workflow: projects, deliverables, version upload, timestamped comments, annotations, approvals, playback, downloads, and side-by-side comparison.
- Studio ownership and authorization enforced server-side across API routes and video file serving.
- Drizzle migrations over `better-sqlite3` for identity, SMTP, and studio schema.
- Docker/Compose deployment on Node 22 with persistent `data/` and `uploads/` volumes.
- Operator documentation under `docs/deployment/` including backup/restore, migrations, upgrade/rollback, and onboarding walkthrough.

### Security

- Session cookies are HttpOnly with SameSite=Strict; CSRF protection on mutating requests.
- Production requires a 32+ character `SESSION_SECRET`.
- SMTP credentials and invite tokens are never returned by APIs or logged.

### Known limitations

- One Playblast instance per studio; multi-tenant SaaS is out of scope.
- No paid support or remote operator hands; see `docs/deployment/operator-responsibilities.md`.
- Cross-browser desktop QA beyond automated Chromium smoke remains a manual operator checklist.
- Adoption, donations, and sponsorship tracking require real external evidence and stay outside this repository.

[Unreleased]: https://github.com/brzrk/playblast/compare/v0.1.0-rc.1...HEAD
[0.1.0-rc.1]: https://github.com/brzrk/playblast/releases/tag/v0.1.0-rc.1
