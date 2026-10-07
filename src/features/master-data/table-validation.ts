export function duplicateIdentityIds<T>(
  items: readonly T[],
  getId: (item: T) => string,
  getIdentity: (item: T) => string
): Set<string> {
  const idsByIdentity = new Map<string, string[]>()

  items.forEach(item => {
    const identity = getIdentity(item).trim().toLocaleLowerCase()
    if (!identity) return
    const ids = idsByIdentity.get(identity) || []
    ids.push(getId(item))
    idsByIdentity.set(identity, ids)
  })

  return new Set([...idsByIdentity.values()].filter(ids => ids.length > 1).flat())
}

export function blankIdentityOrdinals<T extends { id: string }>(
  items: readonly T[],
  getIdentity: (item: T) => string
): Map<string, number> {
  const ordinals = new Map<string, number>()
  let next = 0

  items.forEach(item => {
    if (getIdentity(item).trim()) return
    ordinals.set(item.id, ++next)
  })

  return ordinals
}

export function hasInvalidNumber(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && (!Number.isFinite(value) || value < 0)
}

export function parsePercentage(value: string): number | null {
  const normalized = value.trim()
  if (!normalized) return null
  const hasPercentSuffix = normalized.endsWith('%')
  const numericText = (hasPercentSuffix ? normalized.slice(0, -1) : normalized).replace(/,/g, '').trim()
  const numericValue = Number(numericText)
  return Number.isFinite(numericValue) ? numericValue / 100 : Number.NaN
}
