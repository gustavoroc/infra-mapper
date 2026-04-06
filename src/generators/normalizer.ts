/**
 * Normalizes a component label into a valid resource name.
 * RE-004: lowercase, spaces → underscore, remove special chars.
 * RE-005: ensures uniqueness via incremental suffix.
 */

export function toResourceName(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '') // strip leading/trailing underscores
    || 'resource'
}

/**
 * Builds a map of node id → unique resource name, handling RE-005 collisions.
 */
export function buildResourceMap(
  nodes: Array<{ id: string; data: { label: string } }>
): Map<string, string> {
  const map = new Map<string, string>()
  const seen = new Map<string, number>() // base name → count

  for (const node of nodes) {
    const base = toResourceName(node.data.label)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    map.set(node.id, count === 0 ? base : `${base}_${count + 1}`)
  }

  return map
}
