# Contributing to Playblast

Thanks for helping improve Playblast — self-hosted video proofing for motion studios, maintained by Brzrk Interactive as sponsorship-first MIT OSS.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Project status

Playblast is a **public, actively developed** open-source project. The current line is a **soft release candidate**: APIs, deploy paths, and operator workflows may still change. Self-host, Docker, and Synology/NAS validation are ongoing — we do not claim production-grade stability or offer unsupported uptime guarantees. Run release-candidate gates in your environment before relying on a deploy for studio work.

For orientation, start with the [README](README.md). Deployment and install guides live under [docs/deployment/](docs/deployment/index.md) (including [Linux / Synology install](docs/deployment/install-linux-nas.md)). Contributions are accepted under the [MIT license](LICENSE).

## Ways to contribute

- **Bug reports** — use the [Bug report](.github/ISSUE_TEMPLATE/bug_report.md) issue template
- **Feature ideas** — use the [Feature request](.github/ISSUE_TEMPLATE/feature_request.md) template; tie ideas to studio proofing workflows when possible
- **Documentation** — deploy, NAS, and operator docs under `docs/` are especially welcome
- **Code** — small, focused pull requests beat large speculative rewrites

Sponsorship keeps the lights on for a free self-hosted tool. See [SPONSORS.md](SPONSORS.md).

## Reporting issues

Use GitHub Issues with the templates above. Good reports help maintainers reproduce problems quickly:

- **Version or commit** — image tag, `git rev-parse HEAD`, or release label
- **Role** — admin, creative, or proofing when the bug involves permissions or UI
- **Deploy target** — local dev, Docker, Synology/NAS, or other self-host setup
- **Steps to reproduce** — numbered, minimal path from a clean or known state
- **Expected vs actual** — what should happen and what happened instead
- **Logs or screenshots** — redact secrets, tokens, and studio media

Do **not** paste secrets, production credentials, or client deliverables into public issues. Security vulnerabilities belong in a private advisory — see [SECURITY.md](SECURITY.md).

## Development setup

See the [README quick start](README.md#quick-start-development). Node.js 22 LTS is required.

## Pull request guidelines

1. **Branch from `development-mvp`** and open PRs **into `development-mvp`** (not `main`).
2. Keep changes **focused** — one concern per PR when possible.
3. Open an issue first for non-trivial changes so maintainers can confirm scope.
4. Do not commit secrets, private studio media, or production config with keys.
5. Update docs under `docs/` when behavior or deploy steps change. If you add or rename a public guide, also update `docs-site/.vitepress/config.ts` (sidebar/nav) and relevant indexes (`docs/index.md`, `docs/deployment/index.md`) in the same PR, then run `npm run docs:build`.
6. Add or update tests when fixing bugs or changing API/auth behavior.
7. Follow existing TypeScript, Express, and React patterns in `client/`, `server/`, and `shared/`.

Use the [pull request template](.github/PULL_REQUEST_TEMPLATE.md) and note how you tested (commands run, roles exercised).

## Product boundaries (please respect)

- **One studio per instance** — do not introduce multi-tenant SaaS or hosted billing into the MVP line
- Authorization is **server-side**; UI hiding alone is not a security control
- Prefer SQLite + local uploads; large infrastructure pivots need maintainer buy-in (see [ROADMAP.md](ROADMAP.md))

## Security

Do **not** file public issues for exploitable vulnerabilities. Follow [SECURITY.md](SECURITY.md).

## License

Contributions are accepted under the [MIT license](LICENSE) covering this repository.
