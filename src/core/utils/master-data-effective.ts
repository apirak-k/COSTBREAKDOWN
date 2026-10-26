import type { CostSnapshot } from '../types'
import { divideExactDecimals, exactDecimalToNumber, parseExactDecimal } from './exact-decimal'

type IdentityRow = {
  id: string
  isGeneratedBusinessIdentity?: boolean
  autoRenamedFrom?: string
}

type NumericCarrier = {
  exactDecimalInputs?: Record<string, string>
}

type NumericFieldSpec = {
  field: string
  percentageInput?: boolean
}

const PRODUCT_NUMERIC_FIELDS: readonly NumericFieldSpec[] = [
  { field: 'sellingPrice' },
  { field: 'sgaPercent' }
]
const RATE_NUMERIC_FIELDS: readonly NumericFieldSpec[] = [
  { field: 'laborRate' },
  { field: 'burdenRate' }
]
const BOM_NUMERIC_FIELDS: readonly NumericFieldSpec[] = [
  { field: 'consumption' },
  { field: 'price' },
  { field: 'loss', percentageInput: true }
]
const ROUTING_NUMERIC_FIELDS: readonly NumericFieldSpec[] = [
  { field: 'manning' },
  { field: 'capacity' },
  { field: 'yield', percentageInput: true }
]

function normalized(value: string): string {
  return normalizeProductIdentityValue(value)
}

export function normalizeProductIdentityValue(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase()
}

function fieldValue(row: IdentityRow, field: string): unknown {
  return (row as unknown as Record<string, unknown>)[field]
}

function setFieldValue(row: IdentityRow, field: string, value: string): void {
  ;(row as unknown as Record<string, unknown>)[field] = value
}

function exactInputMatchesNumericValue(
  numericValue: unknown,
  exactInput: string | undefined,
  percentageInput = false
): boolean {
  if (typeof numericValue !== 'number' || !Number.isFinite(numericValue) || !exactInput?.trim()) return false
  const entered = parseExactDecimal(exactInput)
  if (!entered) return false
  const stored = percentageInput
    ? divideExactDecimals(entered, { coefficient: 100n, scale: 0 })
    : entered
  const projected = stored ? exactDecimalToNumber(stored) : null
  return projected !== null && Object.is(projected, numericValue)
}

function reconcileExactDecimalInputs<T extends object>(
  source: T,
  previous: T | undefined,
  fields: readonly NumericFieldSpec[]
): T {
  const sourceRecord = source as T & NumericCarrier & Record<string, unknown>
  const previousRecord = previous as (T & NumericCarrier & Record<string, unknown>) | undefined
  const exactDecimalInputs = { ...(sourceRecord.exactDecimalInputs ?? {}) }
  let changed = false

  fields.forEach(({ field, percentageInput = false }) => {
    const exactInput = exactDecimalInputs[field]
    if (exactInput === undefined) return

    const numericValue = sourceRecord[field]
    const previousNumericValue = previousRecord?.[field]
    const previousExactInput = previousRecord?.exactDecimalInputs?.[field]
    const numericChanged = previousRecord !== undefined && !Object.is(numericValue, previousNumericValue)
    const exactChanged = previousRecord !== undefined && exactInput !== previousExactInput

    // A spread-based numeric-only mutation can otherwise leave the old exact
    // sidecar attached to a new Number. Treat that carried sidecar as stale.
    const inheritedAcrossNumericChange = numericChanged && !exactChanged
    if (inheritedAcrossNumericChange
      || !exactInputMatchesNumericValue(numericValue, exactInput, percentageInput)) {
      delete exactDecimalInputs[field]
      changed = true
    }
  })

  if (!changed) return source
  return {
    ...source,
    exactDecimalInputs: Object.keys(exactDecimalInputs).length ? exactDecimalInputs : undefined
  } as T
}

function reconcileNumericRows<T extends IdentityRow & NumericCarrier>(
  rows: readonly T[],
  previousRows: readonly T[] | undefined,
  fields: readonly NumericFieldSpec[]
): T[] {
  const previousById = new Map((previousRows ?? []).map(row => [row.id, row]))
  return rows.map(row => reconcileExactDecimalInputs(row, previousById.get(row.id), fields))
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

export type MasterDataSaveState = 'Saved' | 'Draft'

export function getDatasetSaveState(working: CostSnapshot, lastSaved?: CostSnapshot): MasterDataSaveState {
  if (!lastSaved) return 'Draft'
  return JSON.stringify(stableValue(working)) === JSON.stringify(stableValue(lastSaved)) ? 'Saved' : 'Draft'
}

export function normalizeMasterDataSnapshot(snapshot: CostSnapshot, previous?: CostSnapshot): CostSnapshot {
  const product = reconcileExactDecimalInputs(snapshot.product, previous?.product, PRODUCT_NUMERIC_FIELDS)
  const rates = reconcileNumericRows(snapshot.rates, previous?.rates, RATE_NUMERIC_FIELDS)
  const bom = reconcileNumericRows(snapshot.bom, previous?.bom, BOM_NUMERIC_FIELDS)
  const routing = reconcileNumericRows(snapshot.routing, previous?.routing, ROUTING_NUMERIC_FIELDS)

  return {
    ...snapshot,
    product: {
      ...product,
      productName: product.productName?.trim() ?? '',
      uom: product.uom?.trim() ?? ''
    },
    rates: normalizeIdentityRows(rates, previous?.rates, 'workCenterCode', 'Work Center'),
    bom: normalizeIdentityRows(bom, previous?.bom, 'description', 'Material'),
    routing: normalizeIdentityRows(routing, previous?.routing, 'processName', 'Process')
  }
}

export function isProductIdentityMismatch(
  reference: { productName?: string | null; uom?: string | null },
  current: { productName?: string | null; uom?: string | null }
): boolean {
  return normalizeProductIdentityValue(reference.productName) !== normalizeProductIdentityValue(current.productName)
    || normalizeProductIdentityValue(reference.uom) !== normalizeProductIdentityValue(current.uom)
}

export function isProductMismatch(reference: CostSnapshot, current: CostSnapshot): boolean {
  return isProductIdentityMismatch(reference.product, current.product)
}
