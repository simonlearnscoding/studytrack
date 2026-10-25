// Minutes as the boards read them: decimal hours, one place (`25.4h`).
export function formatMinutes(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`
}
