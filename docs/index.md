# Playblast documentation

Self-hosted deployment and operations guides for one Playblast instance per studio.

Product overview and workflow details live on [brzrkmotion.com/playblast](https://brzrkmotion.com/playblast). This site is install and operator documentation only — not a marketing landing page.

## Install

**[Install Playblast on Linux or Synology NAS →](./deployment/install-linux-nas)** — build the Docker image, ship it to your host, and complete first-run setup.

## Operator guides

| Guide | Audience |
|-------|----------|
| [Deployment overview](./deployment/) | Host operator — full guide index |
| [First-run onboarding](./deployment/onboarding-walkthrough) | Studio Admin |
| [Operator vs application Admin](./deployment/operator-responsibilities) | Host operator + Admin |
| [TLS / reverse proxy](./deployment/tls-proxy) | Host operator |

## Community & help

Playblast is in **soft release candidate** — no paid support SLA.

| Need | Where |
|------|-------|
| Install, Docker/NAS, SMTP, backups | [GitHub Discussions](https://github.com/brzrk-motion/Playblast/discussions) |
| Software defects (repro steps) | [GitHub Issues](https://github.com/brzrk-motion/Playblast/issues) |
| Security | [Private advisory](https://github.com/brzrk-motion/Playblast/security/advisories/new) |

Full routing: [Getting help](./community/getting-help.md).

## Support boundary

Playblast is free, open-source, and self-hosted. Studios operate their own Docker host, networking, HTTPS/VPN, SMTP delivery, backups, and recovery.
