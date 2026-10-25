// A development-only offset from the real wall clock. The deployment gate is
// separate from the offset: a production deployment can hold a row, but it must
// never apply it to a read or a write (ST-32).
export function resolveDevClockOffset(isDevDeployment: boolean, offsetMs: number): number {
  return isDevDeployment ? offsetMs : 0
}

export function withDevClockOffset(realNow: number, offsetMs: number): number {
  return realNow + offsetMs
}

// The same deployment gate the rest of the dev-only code uses: the local
// deployment sets DEV_AUTH_BYPASS, production never sets it.
export function isDevClockDeployment(isDevAuthBypass: boolean): boolean {
  return isDevAuthBypass
}

export function isValidClockOffset(offsetMs: number): boolean {
  return Number.isSafeInteger(offsetMs)
}
