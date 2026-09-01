# Deferred features audit

Confirmed: the following have **no required client or server surface** in the MVP.

| Deferred feature | Client surface | Server surface |
|------------------|----------------|----------------|
| Hosted SaaS tenancy | None | None |
| Guest/client external accounts | None | None |
| Billing and subscriptions | None | None |
| Paid support commitments | None | None |
| SSO / SCIM | None | None |
| Native mobile apps | None | None |
| Self-hosted mail server operations | Documented as unsupported | None |

## CRM and studio-operations surfaces

The repository contains CRM/finance routes (`/clients`, `/pipeline`, `/services`, `/timesheet`, `/capacity`) from the internal alpha. For MVP:

- **Decision:** Admin-only; hidden from Creative and Proofing navigation.
- **Enforcement:** Server authorization in Phase 5; navigation hidden in Phase 0 contract.
- Creative and Proofing users access proofing through Projects only.

## Basic Auth (current branch)

Deployment-wide HTTP Basic Auth is a temporary pilot boundary, not application authentication. Phase 2 replaces it for normal access. It is not listed as an MVP user-facing feature.

Source: `DEFERRED_FEATURE_SURFACES` and `MVP_CRM_ROUTES_ADMIN_ONLY` in `@playblast/shared`.
