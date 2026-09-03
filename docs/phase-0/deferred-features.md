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
- **Enforcement:** Server authorization and navigation restrictions are implemented; this document records the MVP policy.
- Creative and Proofing users access proofing through Projects only.

## Basic Auth (historical pilot boundary)

Deployment-wide HTTP Basic Auth was a temporary pilot boundary before application sessions shipped. Normal access uses Playblast login sessions. Optional emergency bootstrap Basic Auth (`PLAYBLAST_EMERGENCY_BASIC_AUTH`) applies only before first-run setup completes.

Source: `DEFERRED_FEATURE_SURFACES` and `MVP_CRM_ROUTES_ADMIN_ONLY` in `@playblast/shared`.
