# Legitimacy A — GitHub Discussions evidence

**Linear:** [BRZ-250](https://linear.app/brzrk-motion-studio/issue/BRZ-250/legitimacy-a-confirm-github-discussions-enabled)  
**Related:** [BRZ-247](https://linear.app/brzrk-motion-studio/issue/BRZ-247/osc-enable-github-discussions) (org enablement)  
**Evidence date (UTC):** 2026-09-19  
**Branch:** `linear/confirm-github-discussions-f91c` (PR into `development-mvp`)

## Acceptance summary

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Verify org/repository setting | **Blocked** | `has_discussions: false` via GitHub REST + GraphQL API (2026-09-19) |
| Capture public Discussions URL | **Documented** | Target: https://github.com/brzrk-motion/Playblast/discussions (404 until enabled) |
| Install/setup → Discussions; defects → Issues | **Pass (repo)** | CONTRIBUTING.md, issue template `config.yml`, welcome post routing table |
| Welcome/category setup | **Pass (repo)** | `.github/discussions/welcome-post.md`, `.github/DISCUSSION_TEMPLATE/*`, [discussions-setup.md](./discussions-setup.md) |
| README/docs links | **Pass (repo)** | README Contributing, `docs/index.md` community section |
| Soft-RC honest posture | **Pass** | No star-farming language; welcome post states RC limits |

## API verification (2026-09-19)

```bash
gh api repos/brzrk-motion/Playblast --jq '{has_discussions, discussions_url}'
# → {"has_discussions":false,"discussions_url":null}

gh api graphql -f query='query { repository(owner:"brzrk-motion", name:"Playblast") { hasDiscussionsEnabled } }'
# → {"data":{"repository":{"hasDiscussionsEnabled":false}}}
```

HTTP check: `GET https://github.com/brzrk-motion/Playblast/discussions` → **404 Not Found** (expected until org admin enables Discussions).

Automated gate: `npm run verify:github-discussions` (fails until `has_discussions` is true).

## Repo-side routing (ready before enable)

- **Q&A Discussions** — install, Docker/NAS, SMTP, onboarding, workflow questions ([template](../../.github/DISCUSSION_TEMPLATE/q-and-a.yml))
- **Bug Issues** — reproducible defects ([bug_report.md](../../.github/ISSUE_TEMPLATE/bug_report.md))
- **Security** — private advisories only ([SECURITY.md](../../SECURITY.md))
- **Ideas / Show and tell** — optional community categories with forms in `.github/DISCUSSION_TEMPLATE/`

## Remaining operator step (BRZ-247, not duplicated here)

James/org admin must enable **Settings → General → Features → Discussions** on `brzrk-motion/Playblast`, then follow [discussions-setup.md](./discussions-setup.md) to pin the welcome post. Re-run `npm run verify:github-discussions` to close the blocked row above.
