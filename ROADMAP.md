# Roadmap

High-level direction for Playblast after the self-hosted studio MVP (0.1.x release candidates). Guidance for contributors and sponsors — not a binding contract.

Detailed phase checklists live in docs/Playblast-MVP-Audit.md.

## North star

- One free, open-source, self-hosted Playblast instance per studio
- Sponsorship-funded maintenance (not SaaS billing)
- Strong server-side roles: admin, creative, proofing
- Docker-first deploy, including Synology NAS operators

## Near term (MVP to studio-ready)

- Finish and harden release-candidate verification gates
- Operator docs polish (backup/restore, upgrade/rollback, Synology)
- Accessibility and responsive review UI pass
- Clearer first-run and invite/SMTP operator experience
- Public community pack: CoC, contributing guide, issue templates, funding

## Next (post-MVP)

- Playback and annotation refinements guided by real studio pilots
- Export / archive helpers for finished deliverable reviews
- Optional reverse-proxy and HTTPS examples without owning studio networking
- Dependency and Node LTS currency

## Explicit non-goals (for now)

- Multi-tenant hosted SaaS or centralized studio media
- Paid remote hands / managed hosting as a product SKU
- Replacing DCC tools or full production-tracking suites
- Migrating off SQLite for the default single-studio deploy without a documented gate

## How to influence the roadmap

- File feature requests with studio context (role, workflow pain)
- Contribute docs and focused PRs per CONTRIBUTING.md
- Optional sponsorship funds general development — it does **not** buy roadmap control or private support (see SPONSORS.md)

Roadmap items may reorder based on pilot feedback and maintainer capacity.
