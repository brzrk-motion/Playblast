import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { getCapabilitiesForRole } from "@playblast/shared"
import {
  SessionContext,
  type SessionContextValue,
  type SessionState,
} from "@/context/session-context"
import {
  fetchCurrentSession,
  fetchSetupStatus,
  isIdentityApiError,
} from "@/lib/identity-api"

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" })

  const refresh = useCallback(async () => {
    try {
      const setup = await fetchSetupStatus()
      let session = null

      if (setup.setupComplete) {
        try {
          session = await fetchCurrentSession()
        } catch (error) {
          if (!isIdentityApiError(error)) {
            throw error
          }

          if (
            error.code !== "UNAUTHENTICATED" &&
            error.code !== "SESSION_EXPIRED"
          ) {
            throw error
          }
        }
      }

      const capabilities = session
        ? getCapabilitiesForRole(session.user.role)
        : []

      setState({
        status: "ready",
        setup,
        session,
        capabilities,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Server unavailable."
      setState({ status: "unavailable", message })
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const setup = await fetchSetupStatus()
        if (cancelled) {
          return
        }

        let session = null
        if (setup.setupComplete) {
          try {
            session = await fetchCurrentSession()
          } catch (error) {
            if (!isIdentityApiError(error)) {
              throw error
            }

            if (
              error.code !== "UNAUTHENTICATED" &&
              error.code !== "SESSION_EXPIRED"
            ) {
              throw error
            }
          }
        }

        if (cancelled) {
          return
        }

        setState({
          status: "ready",
          setup,
          session,
          capabilities: session ? getCapabilitiesForRole(session.user.role) : [],
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        const message =
          error instanceof Error ? error.message : "Server unavailable."
        setState({ status: "unavailable", message })
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<SessionContextValue>(() => {
    if (state.status !== "ready") {
      return {
        state,
        refresh,
        role: null,
        setupComplete: false,
      }
    }

    return {
      state,
      refresh,
      role: state.session?.user.role ?? null,
      setupComplete: state.setup.setupComplete,
    }
  }, [refresh, state])

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}
