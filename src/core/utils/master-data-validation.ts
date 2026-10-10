import type { CostSnapshot } from '../types'

type NumericField = 'consumption' | 'price' | 'loss' | 'laborRate' | 'burdenRate' | 'manning' | 'capacity' | 'yield'
const numericFieldNames = new Set<string>(['consumption', 'price', 'loss', 'laborRate', 'burdenRate', 'manning', 'capacity', 'yield'])

interface NumericLocation {
  key: string
  field: NumericField
  value: unknown
  quality?: string
  table: string
  identity: string
}

function isInvalidNumeric(field: NumericField, value: unknown, quality?: string): boolean {
  if (quality === 'invalid') return true
  if (value === null || value === undefined || value === '') return false
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return true
  if ((field === 'capacity' || field === 'yield') && value <= 0) return true
  return field === 'yield' && value > 1
}

/** Keeps valid cells from a mixed paste while dropping invalid numeric cell edits. */
export function filterInvalidMasterDataNumericChanges<T extends object>(changes: T): Partial<T> {
  const accepted: Partial<T> = {}
  Object.entries(changes).forEach(([field, value]) => {
    if (!numericFieldNames.has(field) || !isInvalidNumeric(field as NumericField, value)) {
      Object.assign(accepted, { [field]: value })
    }
  })
  return accepted
}

function numericLocations(snapshot: CostSnapshot): NumericLocation[] {
  return [
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
  const errors = numericLocations(snapshot)
    .filter(location => isInvalidNumeric(location.field, location.value, location.quality))
    .map(location => `Invalid ${location.field} in ${location.table} · ${location.identity}.`)

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
