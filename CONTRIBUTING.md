# Contributing to Playblast

Thanks for helping improve Playblast — self-hosted video proofing for motion studios, maintained by Brzrk Interactive as sponsorship-first MIT OSS.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Bug reports** — use the Bug report issue template; include version/commit, role, and repro steps
- **Feature ideas** — use the Feature request template; tie ideas to studio proofing workflows when possible
- **Documentation** — deploy, NAS, and operator docs under `docs/` are especially welcome
- **Code** — small, focused PRs against the current development branch beat large speculative rewrites

Sponsorship keeps the lights on for a free self-hosted tool. See [SPONSORS.md](SPONSORS.md).

## Development setup

See the README quick start. Node.js 22 LTS is required.

## Pull request guidelines

1. Open an issue first for non-trivial changes so maintainers can confirm scope.
2. Keep PRs focused; prefer one concern per PR.
3. Do not commit secrets, private studio media, or production config with keys.
4. Update docs under `docs/` when behavior or deploy steps change.
5. Add or update tests when fixing bugs or changing API/auth behavior.
6. Follow existing TypeScript, Express, and React patterns in `client/`, `server/`, and `shared/`.

## Product boundaries (please respect)

- **One studio per instance** — do not introduce multi-tenant SaaS or hosted billing into the MVP line
- Authorization is **server-side**; UI hiding alone is not a security control
- Prefer SQLite + local uploads; large infrastructure pivots need maintainer buy-in (see [ROADMAP.md](ROADMAP.md))

## Security

Do **not** file public issues for exploitable vulnerabilities. Follow [SECURITY.md](SECURITY.md).

## License

Contributions are accepted under the MIT license covering this repository.
