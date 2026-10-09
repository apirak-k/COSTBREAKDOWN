import type { CostSnapshot } from '../types'

type IdentityRow = {
  id: string
  isGeneratedBusinessIdentity?: boolean
  autoRenamedFrom?: string
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function fieldValue(row: IdentityRow, field: string): unknown {
  return (row as unknown as Record<string, unknown>)[field]
}

function setFieldValue(row: IdentityRow, field: string, value: string): void {
  ;(row as unknown as Record<string, unknown>)[field] = value
}

function nextAvailableIdentity(base: string, used: Set<string>): string {
  const match = base.match(/^(.*)\((\d+)\)$/)
  const root = match?.[1]?.trim() || base
  let suffix = match ? Number(match[2]) + 1 : 1
  let candidate = `${root}(${suffix})`
  while (used.has(normalized(candidate))) {
    suffix += 1
    candidate = `${root}(${suffix})`
  }
  return candidate
}

function normalizeIdentityRows<T extends IdentityRow>(
  sourceRows: readonly T[],
  previousRows: readonly T[] | undefined,
  field: string,
  prefix: string
): T[] {
  const previousById = new Map((previousRows ?? []).map(row => [row.id, row]))
  const changed = new Set<string>()
  let generatedOrdinal = 0

  const prepared = sourceRows.map(row => {
    const previous = previousById.get(row.id)
    const value = fieldValue(row, field)
    const identity = typeof value === 'string' ? value : ''
    const identityChanged = previous
      ? value !== fieldValue(previous, field)
      : row.isGeneratedBusinessIdentity !== true && !row.autoRenamedFrom
    if (identityChanged) changed.add(row.id)

    const generated = identity.trim() === '' || (row.isGeneratedBusinessIdentity === true && !identityChanged)
    const next = { ...row } as T
    if (generated) {
      generatedOrdinal += 1
      setFieldValue(next, field, `${prefix} ${generatedOrdinal}`)
      next.isGeneratedBusinessIdentity = true
      delete next.autoRenamedFrom
    } else if (identityChanged) {
      next.isGeneratedBusinessIdentity = false
      delete next.autoRenamedFrom
    }
    return next
  })

  const used = new Set<string>()
  const ordered = [
    ...prepared.filter(row => !changed.has(row.id)),
    ...prepared.filter(row => changed.has(row.id))
  ]

  ordered.forEach(row => {
    const identity = String(fieldValue(row, field) ?? '').trim()
    const key = normalized(identity)
    if (!key) return
    if (!used.has(key)) {
      used.add(key)
      return
    }

    const unique = nextAvailableIdentity(identity, used)
    setFieldValue(row, field, unique)
    row.isGeneratedBusinessIdentity = false
    row.autoRenamedFrom = identity
    used.add(normalized(unique))
  })

  return prepared
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stableValue(nested)]))
  }
  return value
}

export type MasterDataSaveState = 'Saved' | 'Unsaved' | 'Not saved yet'

export function getDatasetSaveState(working: CostSnapshot, lastSaved?: CostSnapshot): MasterDataSaveState {
  if (!lastSaved) return 'Not saved yet'
  return JSON.stringify(stableValue(working)) === JSON.stringify(stableValue(lastSaved)) ? 'Saved' : 'Unsaved'
}

export function normalizeMasterDataSnapshot(snapshot: CostSnapshot, previous?: CostSnapshot): CostSnapshot {
  const productName = snapshot.product.productName?.trim() || 'Product'
  return {
    ...snapshot,
    product: {
      ...snapshot.product,
      productName,
      uom: snapshot.product.uom?.trim() || 'PC'
    },
    rates: normalizeIdentityRows(snapshot.rates, previous?.rates, 'workCenterCode', 'Work Center'),
    bom: normalizeIdentityRows(snapshot.bom, previous?.bom, 'description', 'Material'),
    routing: normalizeIdentityRows(snapshot.routing, previous?.routing, 'processName', 'Process')
  }
}

export function isProductMismatch(reference: CostSnapshot, current: CostSnapshot): boolean {
  const referenceName = reference.product.productName?.trim() || 'Product'
  const currentName = current.product.productName?.trim() || 'Product'
  return normalized(referenceName) !== normalized(currentName)
}
