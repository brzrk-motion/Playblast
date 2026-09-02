# Security Policy

Playblast is a **free, open-source, self-hosted** video proofing application. Each studio runs its own instance; BRZRK does not operate a centralized hosted service for studio data.

## Supported versions

| Version | Supported |
|---------|-----------|
| `0.1.x` release candidates | Yes |
| Older internal alpha branches | No |

Security fixes land on the current MVP release-candidate line. Upgrade using [docs/deployment/upgrade-rollback.md](docs/deployment/upgrade-rollback.md).

## Reporting a vulnerability

**Do not** open public GitHub issues for exploitable security problems.

Report suspected vulnerabilities through the repository's **private security advisory** workflow on GitHub (Security → Advisories → Report a vulnerability). If that channel is unavailable, contact the repository maintainers through an existing private studio operator channel.

Include:

- Affected version or commit SHA
- Reproduction steps or proof-of-concept
- Impact assessment (session bypass, cross-studio data access, file read, etc.)
- Any suggested fix, if you have one

We aim to acknowledge reports within **5 business days**. Critical issues affecting session isolation, authorization, or secret exposure receive priority.

## Scope

In scope:

- Authentication, session handling, CSRF, invite tokens, and role authorization bypasses
- Cross-studio data access on a single instance
- Unauthenticated access to `/api/*` or `/video/*` assets
- Secret exposure via APIs, logs, errors, or repository commits
- SQLite injection or path traversal against uploads and avatars

Out of scope:

- Missing HTTPS/TLS at the reverse proxy (operator responsibility)
- Weak operator-chosen passwords or leaked `.env` files on the host
- SMTP relay compromise outside Playblast
- Denial-of-service against a self-hosted instance without demonstrated application defect
- Issues in third-party dependencies already covered by an upstream fix in a supported release

## Safe harbor

Good-faith research that avoids privacy violations, data destruction, and service disruption is appreciated. Do not access studio data you do not own or attempt live testing against production studio instances without explicit permission from the operator.

## Security practices in this repository

- Application auth uses signed sessions, not deployment-wide HTTP Basic Auth (except optional emergency bootstrap flag).
- Production startup rejects missing or short `SESSION_SECRET` values.
- CI runs `npm run verify:secrets` to block common accidental secret commits.
- Release verification exercises the API route inventory, role matrix, and single-studio deny paths.

## No bug bounty

Playblast does not operate a paid bug bounty or commercial support program. See [docs/deployment/operator-responsibilities.md](docs/deployment/operator-responsibilities.md) for the support boundary.
