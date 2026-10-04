export function duplicateIdentityIds<T extends { isGeneratedSizingPlaceholder?: boolean }>(
  items: T[],
  getId: (item: T) => string,
  getIdentity: (item: T) => string
): Set<string> {
  const idsByIdentity = new Map<string, string[]>()

  items.forEach(item => {
    if (item.isGeneratedSizingPlaceholder) return
    const identity = getIdentity(item).trim().toLocaleLowerCase()
    if (!identity) return
    const ids = idsByIdentity.get(identity) || []
    ids.push(getId(item))
    idsByIdentity.set(identity, ids)
  })

  return new Set([...idsByIdentity.values()].filter(ids => ids.length > 1).flat())
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
