import { useContext } from "react"
import { SessionContext, type SessionContextValue } from "@/context/session-context"

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSession must be used within SessionProvider")
  }
  return context
}
