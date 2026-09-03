let enabled = false

/** Enabled only by the dedicated E2E process entry point. */
export function enableE2ETestRuntime(): void {
  enabled = true
}

/** Test cleanup helper; normal production startup never enables this state. */
export function disableE2ETestRuntime(): void {
  enabled = false
}

export function isE2ETestRuntime(): boolean {
  return enabled
}
