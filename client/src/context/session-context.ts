import { createContext } from "react"
import type { Capability, CurrentSessionResponse, SetupStatusResponse, UserRole } from "@playblast/shared"

export type SessionState =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | {
      status: "ready"
      setup: SetupStatusResponse
      session: CurrentSessionResponse | null
      capabilities: Capability[]
    }

export interface SessionContextValue {
  state: SessionState
  refresh: () => Promise<void>
  role: UserRole | null
  setupComplete: boolean
  capabilities: Capability[]
}

export const SessionContext = createContext<SessionContextValue | null>(null)
