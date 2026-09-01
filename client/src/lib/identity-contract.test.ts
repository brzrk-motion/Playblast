import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  createApiError,
  getCapabilitiesForRole,
  isApiErrorEnvelope,
  type InvitationSummary,
  type RoleCapabilitiesResponse,
  type SetupStatusResponse,
  type StudioProfileResponse,
  type UserSummary,
} from "@playblast/shared"

describe("identity shared contracts", () => {
  it("defines setup status response fields consumed by the client", () => {
    const response: SetupStatusResponse = {
      status: "pending",
      nextRoute: "/setup",
      setupComplete: false,
    }

    assert.equal(response.status, "pending")
    assert.equal(response.setupComplete, false)
  })

  it("defines studio, user, and invitation summaries", () => {
    const studio: StudioProfileResponse = {
      id: "studio-1",
      name: "Fixture Studio",
      avatarUrl: null,
      setupStatus: "complete",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }

    const user: UserSummary = {
      id: "user-1",
      name: "Admin",
      email: "admin@fixture.studio",
      role: "admin",
      disabled: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }

    const invitation: InvitationSummary = {
      id: "invite-1",
      email: "creative@fixture.studio",
      name: "Creative",
      role: "creative",
      status: "pending",
      expiresAt: "2026-02-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }

    assert.equal(studio.name, "Fixture Studio")
    assert.equal(user.role, "admin")
    assert.equal(invitation.role, "creative")
  })

  it("aligns capability responses with the shared role matrix", () => {
    const response: RoleCapabilitiesResponse = {
      role: "proofing",
      capabilities: getCapabilitiesForRole("proofing"),
    }

    assert.ok(!response.capabilities.includes("team.manage"))
    assert.ok(response.capabilities.includes("comments.create"))
  })

  it("recognizes canonical API error envelopes", () => {
    const envelope = createApiError("SETUP_NOT_COMPLETE")
    assert.ok(isApiErrorEnvelope(envelope))
    assert.equal(envelope.code, "SETUP_NOT_COMPLETE")
  })
})
