---
layout: home
hero:
  name: Playblast
  text: Self-hosted video proofing
  tagline: Review CGI renders and motion work with timestamped comments, versions, comparisons, and approvals.
  actions:
    - theme: brand
      text: Install Playblast
      link: /deployment/install-linux-nas
    - theme: alt
      text: Read the onboarding guide
      link: /deployment/onboarding-walkthrough
features:
  - title: Keep your data on your infrastructure
    details: One studio per instance, with SQLite and media stored on your own host or NAS.
  - title: Give every reviewer the right access
    details: Admin, Creative, and Proofing roles are enforced by the server.
  - title: Operate without a cloud dependency
    details: No hosted account, license server, or centralized Playblast service is required.
---

## Find your path

- **Host operator:** start with [installation](./deployment/install-linux-nas) and [operator responsibilities](./deployment/operator-responsibilities).
- **Studio Admin:** follow the [first-run onboarding](./deployment/onboarding-walkthrough), then configure [roles, SMTP, and recovery](./deployment/roles-smtp-recovery).
- **Creative or Proofing user:** ask your studio Admin for an invitation, then use the in-app workflow guide provided by your team.

## Support boundary

Playblast is free, open-source, and self-hosted. Studios operate their own Docker host, networking, HTTPS/VPN, SMTP delivery, backups, and recovery process. Report defects through the [public issue tracker](https://github.com/brzrk-motion/Playblast/issues).
