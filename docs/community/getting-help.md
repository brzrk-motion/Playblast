# Getting help

Playblast is **free, open-source, and self-hosted** — in **soft release candidate**. There is no paid support SLA or remote hands.

## Start with docs

Most install and operator questions are answered in the [deployment guide](../deployment/index.md):

- [Install on Linux or Synology NAS](../deployment/install-linux-nas.md)
- [First-run onboarding](../deployment/onboarding-walkthrough.md)
- [Operator vs application Admin](../deployment/operator-responsibilities.md)
- [Roles, SMTP, and recovery](../deployment/roles-smtp-recovery.md)

## GitHub Discussions (install, usage, community)

Use [GitHub Discussions](https://github.com/brzrk-motion/Playblast/discussions) for:

- Docker, Synology/NAS, and compose questions
- SMTP, backup, upgrade, and operator workflow questions
- Sponsorship interest and general community conversation (see [SPONSORS.md](https://github.com/brzrk-motion/Playblast/blob/development-mvp/SPONSORS.md))

Pick **Q&A** for install/operations topics and **General** for broader chat. Maintainers may answer when capacity allows — no guaranteed response time.

Do **not** post secrets, production credentials, or client deliverables in public threads.

## GitHub Issues (actionable defects and features)

Use [GitHub Issues](https://github.com/brzrk-motion/Playblast/issues) for:

- **Bug reports** with repro steps, version, role, and deploy target
- **Feature requests** tied to studio proofing workflows

Security vulnerabilities belong in a [private advisory](https://github.com/brzrk-motion/Playblast/security/advisories/new), not a public issue or discussion.

## Support boundary

Studios own Docker, networking, HTTPS/VPN, SMTP deliverability, backups, and restore drills. Playblast provides application setup, roles, proofing, and Admin CRM/finance — not managed hosting. See [operator responsibilities](../deployment/operator-responsibilities.md).
