import { useSession } from "@/hooks/use-session"
import { hasCapability, type Capability } from "@playblast/shared"

export function useCapability(capability: Capability): boolean {
  const { state, role } = useSession()
  if (state.status !== "ready" || !role) {
    return false
  }

  return hasCapability(role, capability)
}

export function useCapabilities(): Capability[] {
  const { state } = useSession()
  if (state.status !== "ready") {
    return []
  }

  return state.capabilities
}
