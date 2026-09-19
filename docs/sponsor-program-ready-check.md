# Sponsor program — ready-check (BRZ-228)

Operator checklist before **James opens fund/sponsor checkout** (BRZ-230). The public fund page stays **soft** until that explicit enable gate.

**Scope:** GitHub Sponsors enable readiness, repo sponsor docs, and public surface honesty. Does not replace James’s org-admin actions or Motion copy for live CTAs.

**Context locks**

| Surface | URL | Expected state |
|---------|-----|----------------|
| Fund | https://brzrkmotion.com/fund | Soft only — tiers listed, **checkout not open** |
| Product | https://brzrkmotion.com/playblast | Proofing-first offer; healthy |
| Sponsor terms | `SPONSORS.md` in this repo | Boundaries + recognition; no fake checkout |
| Funding metadata | `.github/FUNDING.yml` | Points at `brzrk-motion` org (active after Sponsors enable) |

**Enable gate:** James (org admin) — GitHub Sponsors application + tier setup + explicit checkout open.

---

## Prerequisites

- [ ] Repo checkout with `npm install` completed (for automated gates below).
- [ ] Network access to `brzrkmotion.com` and `github.com` from the verifier machine.
- [ ] James available for org-admin steps marked **James gate** (cannot be completed by automation alone).

---

## Automated gates (run first)

From the repository root:

```bash
npm run verify:sponsor-program
```

Live URLs (default):

```bash
PLAYBLAST_FUND_URL="https://brzrkmotion.com/fund" \
PLAYBLAST_PRODUCT_URL="https://brzrkmotion.com/playblast" \
npm run verify:sponsor-program
```

- [ ] Script prints `Sponsor program ready-check verification passed.` with **0 blocking failures**.
- [ ] Any **gate** lines (GitHub Sponsors not yet enabled) are recorded for James — gates do not fail the soft-fund checks.

---

## Repo alignment

| Item | Pass criteria |
|------|---------------|
| `SPONSORS.md` | Present; states funding ≠ support; no SLA/hosting/roadmap control |
| `.github/FUNDING.yml` | `github: [brzrk-motion]` with enable comment |
| Operator boundary | `docs/deployment/operator-responsibilities.md` linked from `SPONSORS.md` resolves |

Manual spot-check:

- [ ] Tier ladder on https://brzrkmotion.com/fund matches intended public amounts ($10 / $50 / $150 / $500 / $1000 per month).
- [ ] Fund page links to `SPONSORS.md` (currently `development-mvp` branch on GitHub until release branch is chosen).
- [ ] No Stripe, PayPal, or other live payment checkout URLs on `/fund`.

---

## Public surface (soft fund)

| Check | Pass criteria |
|-------|---------------|
| `/fund` HTTP | `200` |
| Fund status copy | Shows pre-launch / checkout **not open** (no active pay buttons) |
| `/playblast` HTTP | `200` |
| Offer framing | Proofing-first; no hosted-SaaS or paid-support promises beyond audit |

Browser spot-check (optional):

- [ ] Open `/fund` — tier cards visible, no checkout flow, boundaries section present.
- [ ] Open `/playblast` — product page loads; primary CTA is explore/install path, not fund checkout.

---

## James gate — GitHub Sponsors enable

Complete **before** opening public sponsor checkout (BRZ-230):

1. [ ] Apply for / enable **GitHub Sponsors** on the `brzrk-motion` organization (James login).
2. [ ] Configure sponsor tiers to match the public ladder ($10 / $50 / $150 / $500 / $1000 monthly).
3. [ ] Confirm https://github.com/sponsors/brzrk-motion resolves to a sponsor profile (not a redirect to the bare org page).
4. [ ] Confirm Playblast repo **Sponsor** button (from `.github/FUNDING.yml`) opens GitHub Sponsors checkout.
5. [ ] Smoke-test one sponsorship path (test account or $0 tier if available).

**Until steps 1–3 pass:** fund page and outbound CTAs remain **soft only** (BRZ-228 lock).

---

## Checkout open gate (BRZ-230)

Do **not** flip fund CTAs or social promotion until James signs off **and** BRZ-230 copy is approved. Full checklist: [fund-sponsor-cta-gate.md](./fund-sponsor-cta-gate.md).

- [ ] James approves checkout open.
- [ ] Motion CTA copy approved (Linear doc).
- [ ] `brzrk-site` fund status panel updated from “Checkout: Not open” to live state.
- [ ] `npm run verify:fund-cta-gate` passes in live mode after deploy.

---

## Evidence log

Copy for Linear / run record:

```text
Sponsor program ready-check — BRZ-228
Date: __________  Verifier: __________

Automated gates
  [ ] npm run verify:sponsor-program — pass (soft fund + repo checks)

Repo
  [ ] SPONSORS.md present and boundaries correct
  [ ] .github/FUNDING.yml → brzrk-motion
  [ ] operator-responsibilities.md resolves

Public surfaces
  [ ] /fund — 200, soft (checkout not open, no payment URLs)
  [ ] /playblast — 200, proofing-first

James gate (GitHub Sponsors)
  [ ] Sponsors enabled on brzrk-motion org
  [ ] Tier ladder configured
  [ ] github.com/sponsors/brzrk-motion — live profile
  [ ] Repo Sponsor button smoke-tested

Checkout open (BRZ-230 — separate)
  [ ] Not opened during this ready-check

Issues / notes:
_________________________________________________________________
_________________________________________________________________

Sign-off:  [ ] Ready-check complete (soft fund held)   [ ] Blocked — see notes
```

---

## References

- Linear: [BRZ-228](https://linear.app/brzrk-motion-studio/issue/BRZ-228) (this ready-check), [BRZ-230](https://linear.app/brzrk-motion-studio/issue/BRZ-230) (open CTAs after checkout live)
- Fund page source: `brzrk-motion/brzrk-site` (`src/pages/Fund.tsx`)
- Pilot checklist pattern: [pilot-manual-verification.md](./pilot-manual-verification.md)
