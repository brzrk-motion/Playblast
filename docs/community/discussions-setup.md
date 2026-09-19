# GitHub Discussions setup (maintainers)

Operator checklist to enable Discussions and pin the welcome post. Org/repo enablement is owned by [BRZ-247](https://linear.app/brzrk-motion-studio/issue/BRZ-247/osc-enable-github-discussions); this document covers post-enable setup only.

**Public URL (once enabled):** https://github.com/brzrk-motion/Playblast/discussions

## Enable Discussions

1. **Settings → General → Features** → enable **Discussions**.
2. **Settings → Discussions → Categories** — keep GitHub defaults or align to:
   - **Announcements** (maintainers only)
   - **General**
   - **Ideas**
   - **Q&A**
   - **Show and tell**
3. Discussion category forms in `.github/DISCUSSION_TEMPLATE/` map to matching category slugs (`q-and-a`, `ideas`, `show-and-tell`).

## Pin the welcome post

1. Open **Discussions → New discussion** → category **Announcements** (or **General** if Announcements is maintainer-only).
2. Title: `Welcome — self-hosted video proofing for motion studios`
3. Paste body from [`.github/discussions/welcome-post.md`](../../.github/discussions/welcome-post.md).
4. Publish, then **Pin discussion** from the discussion menu (⋯ → Pin).

## Community routing

| Topic | Channel |
|-------|---------|
| Install, upgrade, operator, or workflow questions | [Discussions → Q&A](https://github.com/brzrk-motion/Playblast/discussions/new?category=q-a) |
| Actionable defects (reproducible bugs) | [Issues → Bug report](https://github.com/brzrk-motion/Playblast/issues/new?template=bug_report.md) |
| Security vulnerabilities | [Private advisory](https://github.com/brzrk-motion/Playblast/security/advisories/new) |
| Feature ideas (structured) | Issues → Feature request, or Discussions → Ideas |

## Verify after enable

```bash
npm run verify:github-discussions
```

Or manually:

- [Discussions](https://github.com/brzrk-motion/Playblast/discussions) loads (not 404).
- [Issues](https://github.com/brzrk-motion/Playblast/issues) chooser shows **Ask a question (Discussions)** contact link.
- Welcome post is pinned.

## Guardrails

- Soft-RC posture only — no star-farming or social publishing from this checklist.
- Product CTA: try/install Playblast, not engagement metrics.
- github.io hosts install/operator docs only; marketing stays on brzrkmotion.com.
