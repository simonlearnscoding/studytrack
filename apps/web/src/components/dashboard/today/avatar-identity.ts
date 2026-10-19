// A member's avatar identity: their initials and the stable per-person tint. The
// room rail and the consistency board both use these, so the same person wears
// the same face in both places.

// Stable per-person tint: the same face keeps its colour across reloads. A fixed
// palette (the rail needs many distinct hues at once) keyed off the Discord id.
const AVATAR_PALETTE = ['#b3a7e8', '#e89aa6', '#8fd9c9', '#e8c07a', '#e0a1c4', '#8fb8d9', '#d9a05b']

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function colorFor(id: string): string {
  return AVATAR_PALETTE[hashId(id) % AVATAR_PALETTE.length]
}

function hashId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return hash
}
