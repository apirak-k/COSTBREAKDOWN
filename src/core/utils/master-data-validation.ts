import type { CostSnapshot } from '../types'

export type MasterDataNumericField =
  | 'sellingPrice'
  | 'sgaPercent'
  | 'consumption'
  | 'price'
  | 'loss'
  | 'laborRate'
  | 'burdenRate'
  | 'manning'
  | 'capacity'
  | 'yield'

interface NumericDomain {
  min: number
  max?: number
  minExclusive?: boolean
}

/** Canonical stored-value domains for all numeric Master Data fields. */
export const MASTER_DATA_NUMERIC_DOMAINS: Record<MasterDataNumericField, NumericDomain> = {
  sellingPrice: { min: 0 },
  sgaPercent: { min: 0, max: 100 },
  consumption: { min: 0 },
  price: { min: 0 },
  loss: { min: 0, max: 1 },
  laborRate: { min: 0 },
  burdenRate: { min: 0 },
  manning: { min: 0 },
  capacity: { min: 0, minExclusive: true },
  yield: { min: 0, max: 1, minExclusive: true }
}

const numericFieldNames = new Set<string>(Object.keys(MASTER_DATA_NUMERIC_DOMAINS))

interface NumericLocation {
  key: string
  field: MasterDataNumericField
  value: unknown
  quality?: string
  table: string
  identity: string
}

function isInvalidNumeric(field: MasterDataNumericField, value: unknown, quality?: string): boolean {
  if (quality === 'invalid') return true
  if (value === null || value === undefined || value === '') return false
  if (typeof value !== 'number' || !Number.isFinite(value)) return true

  const domain = MASTER_DATA_NUMERIC_DOMAINS[field]
  if (domain.minExclusive ? value <= domain.min : value < domain.min) return true
  return domain.max !== undefined && value > domain.max
}

export function isMasterDataNumericValueValid(field: MasterDataNumericField, value: unknown): boolean {
  return !isInvalidNumeric(field, value)
}

export function isMasterDataNumericInputValid(field: MasterDataNumericField, value: unknown): boolean {
  return !isInvalidNumeric(field, value)
}

/** Input constraints use the same canonical domain, converting fractional percent fields for their UI. */
export function getMasterDataNumericInputDomain(
  field: MasterDataNumericField,
  percentageDisplay = false
): { min: number; max?: number; minExclusive?: boolean } {
  const domain = MASTER_DATA_NUMERIC_DOMAINS[field]
  const multiplier = percentageDisplay ? 100 : 1
  return {
    min: domain.min * multiplier,
    ...(domain.max === undefined ? {} : { max: domain.max * multiplier }),
    ...(domain.minExclusive ? { minExclusive: true } : {})
  }
}

/** Keeps valid cells from a mixed paste while dropping invalid numeric cell edits. */
export function filterInvalidMasterDataNumericChanges<T extends object>(changes: T): Partial<T> {
  const accepted: Partial<T> = {}
  Object.entries(changes).forEach(([field, value]) => {
    if (!numericFieldNames.has(field) || isMasterDataNumericInputValid(field as MasterDataNumericField, value)) {
      Object.assign(accepted, { [field]: value })
    }
  })
  return accepted
}

function numericLocations(snapshot: CostSnapshot): NumericLocation[] {
  return [
    ...(['sellingPrice', 'sgaPercent'] as const).map(field => ({
      key: `product.${field}`,
      field,
      value: snapshot.product[field],
      table: 'Metadata',
      identity: field === 'sellingPrice' ? 'Selling Price' : 'SG&A %'
    })),
    ...snapshot.bom.flatMap(row => (['consumption', 'price', 'loss'] as const).map(field => ({
      key: `bom.${row.id}.${field}`,
      field,
      value: row[field],
      quality: row.confidence[field]?.quality,
      table: 'BOM',
      identity: row.description.trim() || row.id
    }))),
    ...snapshot.rates.flatMap(row => (['laborRate', 'burdenRate'] as const).map(field => ({
      key: `wc.${row.id}.${field}`,
      field,
      value: row[field],
      quality: row.confidence[field]?.quality,
      table: 'Work Centers',
      identity: row.workCenterCode.trim() || row.id
    }))),
    ...snapshot.routing.flatMap(row => (['manning', 'capacity', 'yield'] as const).map(field => ({
      key: `routing.${row.id}.${field}`,
      field,
      value: row[field],
      quality: row.confidence[field]?.quality,
      table: 'Routing',
      identity: row.processName.trim() || row.id
    })))
  ]
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function workCenterCodes(snapshot: CostSnapshot): Set<string> {
  return new Set(snapshot.rates.map(rate => normalized(rate.workCenterCode)).filter(Boolean))
}

function unresolvedWorkCenterReferences(snapshot: CostSnapshot): Map<string, string> {
  const available = workCenterCodes(snapshot)
  return new Map(snapshot.routing.flatMap(step => {
    const value = step.workCenterId?.trim() ?? ''
    return value && !available.has(normalized(value))
      ? [[step.id, value]]
      : []
  }))
}

/** Returns import-facing issues that must be rejected before a snapshot becomes Working data. */
export function getMasterDataSnapshotValidationErrors(snapshot: CostSnapshot): string[] {
  const fieldLabels: Record<MasterDataNumericField, string> = {
    sellingPrice: 'Selling Price',
    sgaPercent: 'SG&A %',
    consumption: 'Usage',
    price: 'Price',
    loss: 'Loss',
    laborRate: 'Labor Rate',
    burdenRate: 'Burden Rate',
    manning: 'Manning',
    capacity: 'Capacity',
    yield: 'Yield'
  }
  const errors = numericLocations(snapshot)
    .filter(location => isInvalidNumeric(location.field, location.value, location.quality))
    .map(location => `Invalid ${fieldLabels[location.field]} in ${location.table} · ${location.identity}.`)

  unresolvedWorkCenterReferences(snapshot).forEach((workCenter, rowId) => {
    const step = snapshot.routing.find(candidate => candidate.id === rowId)
    errors.push(`Unknown Work Center "${workCenter}" referenced by Routing ${step?.processName.trim() || rowId}.`)
  })

  return errors
}

/** Allows legacy invalid data to remain editable while rejecting newly introduced invalid values. */
export function isMasterDataSnapshotChangeValid(previous: CostSnapshot, next: CostSnapshot): boolean {
  const previousInvalid = new Map(numericLocations(previous)
    .filter(location => isInvalidNumeric(location.field, location.value, location.quality))
    .map(location => [location.key, location]))

  const hasNewInvalidNumber = numericLocations(next).some(location => {
    if (!isInvalidNumeric(location.field, location.value, location.quality)) return false
    const old = previousInvalid.get(location.key)
    return !old || !Object.is(old.value, location.value) || old.quality !== location.quality
  })
  if (hasNewInvalidNumber) return false

  const previousUnresolved = unresolvedWorkCenterReferences(previous)
  const nextUnresolved = unresolvedWorkCenterReferences(next)
  return [...nextUnresolved].every(([rowId, workCenter]) =>
    previousUnresolved.get(rowId) !== undefined &&
    normalized(previousUnresolved.get(rowId)!) === normalized(workCenter)
  )
}
