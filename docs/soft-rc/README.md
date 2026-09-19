# Soft-RC operator evidence

Dated, operator-recorded evidence for manual release gates. These documents close **honesty gaps** that automated tests cannot — for example, live SMTP deliverability, clean-machine installs from docs only, and NAS-specific drills.

**Rules**

- Do **not** fabricate delivery metrics, host names, or success/failure outcomes.
- Do **not** record passwords, SMTP secrets, invite tokens, or full message bodies in this directory.
- Box-local or CI skips are **not** gate closure unless a dated external operator row says otherwise.

| Pack | Issue | Document | Status |
|------|-------|----------|--------|
| T6 — live mailbox invite | [BRZ-238](https://linear.app/brzrk-motion-studio/issue/BRZ-238) | [t6-live-mailbox-invite-evidence.md](./t6-live-mailbox-invite-evidence.md) | **Open** — awaiting operator live mailbox row |
| T7 — clean install | [BRZ-231](https://linear.app/brzrk-motion-studio/issue/BRZ-231) | [t7-clean-install-evidence.md](./t7-clean-install-evidence.md) | See evidence log |

See also [release candidate guide](../release/README.md) for the full automated vs manual gate matrix.
