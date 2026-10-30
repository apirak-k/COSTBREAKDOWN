import type { CostSnapshot } from '../types'
import { compareExactDecimals, parseExactDecimal } from './exact-decimal'
import { assertDatasetSizingCounts, DATASET_SIZING_LIMITS, isDatasetSizingCountWithinLimit } from './sizing'

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
  exactValue?: string
  quality?: string
  table: string
  identity: string
}

const exactPercentageUpperBoundFields = new Set<MasterDataNumericField>(['sgaPercent', 'loss', 'yield'])
const exactPercentageUpperBound = parseExactDecimal(100)!

function isInvalidNumeric(
  field: MasterDataNumericField,
  value: unknown,
  quality?: string,
  exactValue?: string
): boolean {
  if (quality === 'invalid') return true
  if (value === null || value === undefined || value === '') return false
  if (typeof value !== 'number' || !Number.isFinite(value)) return true

  const domain = MASTER_DATA_NUMERIC_DOMAINS[field]
  if (domain.minExclusive ? value <= domain.min : value < domain.min) return true
  if (domain.max !== undefined && value > domain.max) return true

  if (exactPercentageUpperBoundFields.has(field) && exactValue?.trim()) {
    const exact = parseExactDecimal(exactValue)
    if (!exact || compareExactDecimals(exact, exactPercentageUpperBound) > 0) return true
  }

  return false
}

export function isMasterDataNumericValueValid(field: MasterDataNumericField, value: unknown): boolean {
  return !isInvalidNumeric(field, value)
}

export function isMasterDataNumericInputValid(field: MasterDataNumericField, value: unknown, exactValue?: string): boolean {
  return !isInvalidNumeric(field, value, undefined, exactValue)
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
      ...(field === 'sgaPercent' && snapshot.product.exactDecimalInputs?.sgaPercent !== undefined
        ? { exactValue: snapshot.product.exactDecimalInputs.sgaPercent }
        : {}),
      table: 'Metadata',
      identity: field === 'sellingPrice' ? 'Selling Price' : 'SG&A %'
    })),
    ...snapshot.bom.flatMap(row => (['consumption', 'price', 'loss'] as const).map(field => ({
      key: `bom.${row.id}.${field}`,
      field,
      value: row[field],
      ...(field === 'loss' && row.exactDecimalInputs?.loss !== undefined
        ? { exactValue: row.exactDecimalInputs.loss }
        : {}),
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
      ...(field === 'yield' && row.exactDecimalInputs?.yield !== undefined
        ? { exactValue: row.exactDecimalInputs.yield }
        : {}),
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
    .filter(location => isInvalidNumeric(location.field, location.value, location.quality, location.exactValue))
    .map(location => `Invalid ${fieldLabels[location.field]} in ${location.table} · ${location.identity}.`)

  try {
    assertDatasetSizingCounts({
      wcCount: snapshot.rates.length,
      bomCount: snapshot.bom.length,
      routingCount: snapshot.routing.length
    }, { allowZero: true })
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Dataset row count exceeds its configured limit.')
  }

  unresolvedWorkCenterReferences(snapshot).forEach((workCenter, rowId) => {
    const step = snapshot.routing.find(candidate => candidate.id === rowId)
    errors.push(`Unknown Work Center "${workCenter}" referenced by Routing ${step?.processName.trim() || rowId}.`)
  })

  return errors
}

/** Allows legacy invalid data to remain editable while rejecting newly introduced invalid values. */
export function isMasterDataSnapshotChangeValid(previous: CostSnapshot, next: CostSnapshot): boolean {
  const previousCounts = {
    wcCount: previous.rates.length,
    bomCount: previous.bom.length,
    routingCount: previous.routing.length
  }
  const nextCounts = {
    wcCount: next.rates.length,
    bomCount: next.bom.length,
    routingCount: next.routing.length
  }
  if ((Object.keys(DATASET_SIZING_LIMITS) as (keyof typeof DATASET_SIZING_LIMITS)[]).some(field =>
    nextCounts[field] > previousCounts[field] && !isDatasetSizingCountWithinLimit(field, nextCounts[field]))) return false

  const previousInvalid = new Map(numericLocations(previous)
    .filter(location => isInvalidNumeric(location.field, location.value, location.quality, location.exactValue))
    .map(location => [location.key, location]))

  const hasNewInvalidNumber = numericLocations(next).some(location => {
    if (!isInvalidNumeric(location.field, location.value, location.quality, location.exactValue)) return false
    const old = previousInvalid.get(location.key)
    return !old || !Object.is(old.value, location.value) || old.quality !== location.quality || old.exactValue !== location.exactValue
  })
  if (hasNewInvalidNumber) return false

  const previousUnresolved = unresolvedWorkCenterReferences(previous)
  const nextUnresolved = unresolvedWorkCenterReferences(next)
  return [...nextUnresolved].every(([rowId, workCenter]) =>
    previousUnresolved.get(rowId) !== undefined &&
    normalized(previousUnresolved.get(rowId)!) === normalized(workCenter)
  )
}
