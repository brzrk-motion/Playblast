# GitHub surface operator checklist (BRZ-220)

Soft pass for repo visitors: proofing-first README, Discussions, and a pinned welcome post. Marketing stays on brzrkmotion.com; github.io hosts install docs only.

## Repo description and topics

In **Settings → General**, set:

| Field | Value |
|-------|-------|
| Description | Self-hosted video proofing for motion studios — versions, comments, annotations, compare, approvals. |
| Website | `https://brzrk-motion.github.io/Playblast/deployment/install-linux-nas` |
| Topics | `video-proofing`, `motion-graphics`, `self-hosted`, `docker`, `review-tool` |

## Enable Discussions

1. **Settings → General → Features** → enable **Discussions**.
2. **Settings → Discussions → Categories** — keep defaults or align to:
   - **Announcements** (maintainers only)
   - **General**
   - **Ideas**
   - **Q&A**
   - **Show and tell**
3. Map discussion templates in `.github/DISCUSSION_TEMPLATE/` to matching categories when prompted.

## Pin the welcome post

1. Open **Discussions → New discussion** → category **Announcements** (or General if Announcements is maintainer-only and you prefer visibility).
2. Title: `Welcome — self-hosted video proofing for motion studios`
3. Paste body from [`.github/discussions/welcome-post.md`](../.github/discussions/welcome-post.md).
4. Publish, then **Pin discussion** from the discussion menu (⋯ → Pin).

Optional: pin up to two more items (e.g. install-docs link discussion, known-RC limitations) if useful.

## Verify README links

- [Install docs](https://brzrk-motion.github.io/Playblast/deployment/install-linux-nas) resolves.
- [Discussions](https://github.com/brzrk-motion/Playblast/discussions) loads after enable step.
- [Issues](https://github.com/brzrk-motion/Playblast/issues) shows bug template chooser.

## Context locks (do not change)

- Offer: proofing-first only on the GitHub surface.
- github.io: install/operator docs OK; no marketing landing pages.
- Do not assign engineering product work to Motion.
