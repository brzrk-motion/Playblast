# Operator vs application Admin responsibilities

Playblast separates **host/operator** work from **in-app Admin** work. One person may fill both roles in a small studio, but the product only automates the in-app side.

## Host / operator (deployment owner)

You own the machine, container runtime, and network path to Playblast.

| Area | Operator responsibilities |
|------|---------------------------|
| Docker / NAS | Install Container Manager or Docker, build or load the image, create compose projects, set restart policies |
| Networking | DNS, reverse proxy, firewall rules, LAN/VPN access |
| HTTPS / TLS | Terminate TLS at a reverse proxy or VPN; Playblast does not ship built-in HTTPS |
| Storage | Provision persistent volumes or bind mounts for `/app/data` and `/app/uploads` |
| Backups | Schedule filesystem backups of `data/` and `uploads/`; test restore drills |
| Upgrades | Pull/build new images, stop/start containers, read release notes |
| Secrets file | Create `.env` with `SESSION_SECRET` and optional recovery token; restrict file permissions |
| SMTP deliverability | Provide outbound network path; Playblast stores SMTP settings in the local database |
| Monitoring | Watch container health (`GET /health`), disk space, and backup job success |

Playblast cannot configure Docker, NAS packages, HTTPS certificates, or backup schedules from inside the application.

## Application Admin (in-app role)

The first bootstrap user is an **Admin** application account. Admins manage studio-facing configuration inside Playblast.

| Area | Admin responsibilities |
|------|------------------------|
| First-run setup | Create the bootstrap admin account and studio profile |
| Studio identity | Studio name and avatar |
| Team | Invite Creative and Proofing users, disable accounts, revoke invitations |
| SMTP | Configure and test outbound email for invitations |
| Proofing | Full proofing workflow (projects, uploads, review, approval) |
| Destructive data actions | Archive/delete projects, remove users, revoke invites |

Admins do **not** manage the Docker host, TLS certificates, or filesystem backups through the UI.

## Creative and Proofing roles

These are application accounts only. They sign in with email and password after accepting an invitation. They cannot manage Docker, SMTP host settings, or studio backups.

See [roles, SMTP, and recovery](./roles-smtp-recovery.md) for capability details.

## Recovery split

| Scenario | Who acts | Path |
|----------|----------|------|
| Lost admin password | Operator + Admin | `/recover-admin` with `PLAYBLAST_ADMIN_RECOVERY_TOKEN` (operator stores token) |
| Corrupt database | Operator | Restore `data/` from backup |
| Lost videos | Operator | Restore `uploads/` from backup |
| SMTP misconfigured | Admin | Team → SMTP settings and test delivery |
| Container won't start | Operator | Check env, logs, volume permissions |

## No-support boundary

Playblast is self-hosted open source. There is no founder-operated helpdesk, remote hands service, or guaranteed response time. Use public issue tracking for defects; studios own day-to-day operations listed above.
