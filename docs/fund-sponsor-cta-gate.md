# Fund / sponsor CTA gate (BRZ-230)

Operator checklist for **opening public fund/sponsor CTAs only after checkout is live**. Until James signs off, outbound promotion and site checkout state stay **soft**.

**Prerequisite:** [BRZ-228 sponsor program ready-check](./sponsor-program-ready-check.md) complete.

**Owners**

| Role | Responsibility |
|------|----------------|
| **James** | Enable gate — GitHub Sponsors live, checkout open sign-off, per-message publish approval |
| **Motion** | CTA copy drafts (Linear doc), Buffer queue after approval, no autonomous publish |

**Context locks**

| Surface | URL | Before gate | After gate |
|---------|-----|-------------|------------|
| Fund page | https://brzrkmotion.com/fund | Soft — tiers listed, checkout **not open** | Live checkout + sponsor CTA |
| Product | https://brzrkmotion.com/playblast | Proofing-first; no fund checkout CTA | May add optional sponsor link |
| Social CTAs | X / LinkedIn / IG | **No fund/sponsor promotion** | James-approved copy only |
| Copy source | Linear doc | Draft only | [Fund/sponsor CTA copy (BRZ-230)](https://linear.app/brzrk-motion-studio/document/fundsponsor-cta-copy-brz-230-7e21461c3be1) |

---

## Automated gate check (run first)

**Soft state (default — CTAs must stay closed):**

```bash
npm run verify:fund-cta-gate
```

**Post-open verification (after James enables checkout):**

```bash
PLAYBLAST_FUND_CTA_MODE=live npm run verify:fund-cta-gate
```

- [ ] Default mode prints `Fund/sponsor CTA gate held (soft).` with **0 blocking failures**.
- [ ] Live mode runs only **after** James sign-off and site deploy.

---

## James gate — checkout must be live first

Complete **all** before any public fund/sponsor CTA:

1. [ ] [BRZ-228](./sponsor-program-ready-check.md) James gate complete — GitHub Sponsors enabled on `brzrk-motion` org.
2. [ ] https://github.com/sponsors/brzrk-motion resolves to a live sponsor profile (not org redirect).
3. [ ] Sponsor tiers configured ($10 / $50 / $150 / $500 / $1000 monthly).
4. [ ] Playblast repo **Sponsor** button smoke-tested.
5. [ ] `brzrk-site` fund status updated from **Checkout: Not open** → live (James/site deploy).
6. [ ] James explicit sign-off: **checkout open**.

**Until 1–6 pass:** do **not** publish fund/sponsor CTAs on any channel.

---

## Motion gate — copy after brief

CTA copy lives in the Linear document linked above. Motion drafts; James approves each surface before queue/publish.

| Surface | Draft status | Publish gate |
|---------|--------------|--------------|
| X announcement | Draft in Linear doc | James per-message approval |
| LinkedIn announcement | Draft in Linear doc | James per-message approval |
| Fund page body tweaks | Brief in Linear doc → `brzrk-site` | James + site deploy |
| Playblast optional sponsor line | Draft in Linear doc | James approval; site deploy |

Rules:

- [ ] Copy reviewed against [Motion memory — brand & social context](https://linear.app/brzrk-motion-studio/document/motion-memory-brand-and-social-context-3e34413f485d).
- [ ] Offer stays **proofing-first**; sponsorship framed as optional maintenance support, not product purchase.
- [ ] No hosted SaaS, SLA, or support-package promises.
- [ ] **Nothing publishes without James per-message approval.**

---

## Open CTAs (sequenced)

Execute in order after James gate + copy approval:

1. [ ] Deploy `brzrk-site` fund page live checkout state.
2. [ ] Re-run `npm run verify:sponsor-program` — Sponsors profile gate cleared.
3. [ ] Re-run `PLAYBLAST_FUND_CTA_MODE=live npm run verify:fund-cta-gate`.
4. [ ] James approves X copy → Motion queues in Buffer (does not auto-publish).
5. [ ] James approves LinkedIn copy → Motion queues in Buffer.
6. [ ] Optional: add sponsor line on `/playblast` after James approves site copy.
7. [ ] Log open date in evidence log below.

---

## Evidence log

```text
Fund/sponsor CTA gate — BRZ-230
Date: __________  Verifier: __________

Pre-open (must pass before any CTA)
  [ ] npm run verify:fund-cta-gate — soft state held
  [ ] npm run verify:sponsor-program — repo + /fund soft checks pass
  [ ] No fund/sponsor posts live on X / LinkedIn / IG

James gate
  [ ] GitHub Sponsors live (github.com/sponsors/brzrk-motion)
  [ ] Tier ladder configured and smoke-tested
  [ ] brzrk-site fund checkout state deployed live
  [ ] James sign-off recorded (date: ________)

Motion copy
  [ ] Linear CTA doc reviewed
  [ ] X copy approved by James
  [ ] LinkedIn copy approved by James
  [ ] Site copy approved by James (if applicable)

Post-open
  [ ] PLAYBLAST_FUND_CTA_MODE=live verify pass
  [ ] Approved posts queued/published per James instruction

Notes:
_________________________________________________________________
_________________________________________________________________

Sign-off:  [ ] CTAs opened (post-gate)   [ ] Gate held — soft only
```

---

## References

- Linear: [BRZ-230](https://linear.app/brzrk-motion-studio/issue/BRZ-230) (this gate), [BRZ-228](https://linear.app/brzrk-motion-studio/issue/BRZ-228) (ready-check)
- CTA copy: [Fund/sponsor CTA copy (BRZ-230)](https://linear.app/brzrk-motion-studio/document/fundsponsor-cta-copy-brz-230-7e21461c3be1) (Linear)
- Fund page source: `brzrk-motion/brzrk-site` (`src/pages/Fund.tsx`)
