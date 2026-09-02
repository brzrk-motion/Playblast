# Release candidate guide

Playblast ships as a **self-hosted release candidate** for studio operators who run their own Docker instance. This document covers tagging, verification gates, upgrade expectations, and what remains manual or external.

## Release model

- **One studio per instance.** No hosted SaaS, billing, or centralized tenancy.
- **Node 22 LTS** baseline (see root `package.json` `engines` and `Dockerfile`).
- **SQLite + local uploads** persisted under operator-managed volumes.
- **No paid support.** Operators own Docker, TLS, backups, SMTP deliverability, and upgrades.

## Versioning and tags

| Artifact | Location |
|----------|----------|
| Release notes | [CHANGELOG.md](../../CHANGELOG.md) |
| Security reporting | [SECURITY.md](../../SECURITY.md) |
| Upgrade path | [../deployment/upgrade-rollback.md](../deployment/upgrade-rollback.md) |
| Migrations | [../deployment/migrations.md](../deployment/migrations.md) |

Suggested tag for the current MVP release candidate: **`v0.1.0-rc.1`**

Tag after the release verification gate passes on the release branch:

```bash
git tag -a v0.1.0-rc.1 -m "Playblast MVP release candidate 0.1.0-rc.1"
git push origin v0.1.0-rc.1
```

## Reproducible artifact

Production image build:

```bash
npm run build:deploy
```

This produces `deploy/playblast.tar.gz` (`linux/amd64`) from the root `Dockerfile`. CI also builds the same Dockerfile on every pull request.

Verify locally:

```bash
npm run verify:release-candidate
```

Docker-specific gates are skipped when the Docker daemon is unavailable; CI runs them on Ubuntu runners.

## Automated verification matrix

| Gate | Command | Requires Docker |
|------|---------|-----------------|
| Full release gate | `npm run verify:release-candidate` | Optional |
| Unit/integration tests | `npm run test` | No |
| Production build | `npm run build` | No |
| Lint | `npm run lint` | No |
| Dependency audit | `npm audit --omit=dev --audit-level=high` | No |
| Secret scan | `npm run verify:secrets` | No |
| Backup/restore | `npm run verify:backup-restore` | No |
| Deployment config | `npm run verify:deployment-config` | No |
| Compose render | `npm run verify:docker-compose` | Yes |
| Docker smoke | `npm run verify:docker-deployment` | Yes |
| Browser QA (Chromium) | `npm run verify:browser-qa` | No |

## Manual and external gates (not automated)

These remain **operator or maintainer responsibilities** and are documented explicitly rather than checked off without evidence:

| Gate | Why manual |
|------|------------|
| Cross-browser desktop QA (Firefox, Safari, Edge) | Requires additional browser installs or farm |
| Clean-machine install from docs only | Needs a fresh VM or NAS without dev tooling |
| Live SMTP delivery to a real mailbox | Operator relay credentials; never commit or log |
| NAS Hyper Backup / container volume drills | Hardware-specific; see deployment docs |
| Self-hosted adopter recruitment | External studios; no fabricated metrics |
| Donations / sponsorship tracking | External funding evidence |
| Public issue triage at scale | Process, not a code gate |

Use [../pilot-manual-verification.md](../pilot-manual-verification.md) for a session-auth browser checklist after automated gates pass.

## Adoption and funding gate

The MVP audit tracks adopter installs, repeat review cycles, issues, donations, sponsorships, and rejection reasons **separately from technical readiness**.

Do **not** mark adoption/funding audit tasks complete without real evidence from external studio installs. This repository intentionally contains no fabricated adoption metrics.

## Issue and support boundary

- Defects: public GitHub issues for non-security bugs.
- Security: private advisories per [SECURITY.md](../../SECURITY.md).
- Operations: [../deployment/operator-responsibilities.md](../deployment/operator-responsibilities.md) — no remote hands or paid support commitments.
