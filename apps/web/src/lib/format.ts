// Minutes as the boards read them: `6h 50m`, or `45m` under an hour.
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  if (!hours) return `${minutes}m`
  return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`
}
