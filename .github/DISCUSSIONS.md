# GitHub Discussions setup (maintainers)

One-time enablement for [brzrk-motion/Playblast](https://github.com/brzrk-motion/Playblast). Requires **org/repo admin** — the cloud agent token cannot flip `has_discussions` (403).

## 1. Enable Discussions

1. Repository **Settings** → **General** → **Features**
2. Click **Set up discussions**
3. Edit the starter welcome post (or discard and use the pinned post below)
4. Click **Start discussion**

Verify: `https://github.com/brzrk-motion/Playblast/discussions` loads (not 404).

## 2. Category setup

After enablement, customize categories so routing is obvious:

| Category | Format | Purpose |
|----------|--------|---------|
| **Announcements** | Announcement | Maintainer releases and RC notes only |
| **Q&A** | Question & answer | Install, Docker, NAS, SMTP, backup/upgrade — **rename description** to “Install & operations” if helpful |
| **General** | Open discussion | Sponsorship interest, adoption feedback, community chat |
| **Ideas** | Open discussion | Optional brainstorming — link to [feature request issues](https://github.com/brzrk-motion/Playblast/issues/new?template=feature_request.md) for actionable proposals |
| **Polls** | Poll | Disable or leave unused unless there is a concrete decision to run |

Repo ships form templates in `.github/DISCUSSION_TEMPLATE/` for **Q&A** (`q-a.yml`) and **General** (`general.yml`). Slugs must match GitHub category slugs.

## 3. Pin the welcome post

Create an **Announcements** discussion, paste the body below, **pin** and **lock** it.

```markdown
# Welcome to Playblast Discussions

Playblast is **free, open-source, and self-hosted** video proofing for motion studios — currently in **soft release candidate**. We are preparing Open Collective via [Open Source Collective](https://opencollective.com/opensource) (OSC); funding checkout is not live yet.

## Where to post

| Need | Channel |
|------|---------|
| Docker / NAS install, SMTP, backups, upgrades | **Q&A** (Install & operations) |
| Sponsorship interest, adoption feedback, general chat | **General** |
| Reproducible software defects | [Bug report **issue**](https://github.com/brzrk-motion/Playblast/issues/new?template=bug_report.md) |
| Security vulnerabilities | [Private advisory](https://github.com/brzrk-motion/Playblast/security/advisories/new) |
| Product direction (actionable) | [Feature request **issue**](https://github.com/brzrk-motion/Playblast/issues/new?template=feature_request.md) |

## What we do not offer here

- Paid support, response-time SLAs, or remote hands
- Managed hosting or founder-installed deployments
- Star-farming or social promotion — please keep threads practical

**Docs:** [deployment guide](https://github.com/brzrk-motion/Playblast/blob/development-mvp/docs/deployment/index.md) · [getting help](https://github.com/brzrk-motion/Playblast/blob/development-mvp/docs/community/getting-help.md) · [SPONSORS.md](https://github.com/brzrk-motion/Playblast/blob/development-mvp/SPONSORS.md)

Thanks for helping prove self-hosted proofing on studio-controlled infrastructure.
```

## 4. Issue chooser alignment

`.github/ISSUE_TEMPLATE/config.yml` links operators to Discussions for non-defect questions. After enablement, smoke-test:

- New issue → contact links include **Install & operations questions**
- New discussion → Q&A and General templates render

## 5. OSC readiness signal

Discussions are a lightweight community surface for OSC application readiness — honest soft-RC posture, no social publish required. Close [BRZ-247](https://linear.app/brzrk/issue/BRZ-247) after steps 1–3 are done on GitHub.
