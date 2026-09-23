import type {
  FieldEvidence,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../../../core'

export type SnapshotRow = SnapshotBOMItem | SnapshotRoutingStep | SnapshotWorkCenterRate
export type DataQualityLabel = 'Valid' | 'Missing' | 'Invalid' | 'Warning' | 'Need Review'

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
}

function valuesOf(row: SnapshotRow): unknown[] {
  if ('consumption' in row) {
    return [row.itemCode, row.consumption, row.unit, row.price, row.loss]
  }
  if ('capacity' in row) {
    return [row.sequence, row.processName, row.workCenterId, row.manning, row.capacity, row.yield]
  }
  return [row.workCenterCode, row.laborRate, row.burdenRate, row.effectiveDate]
}

function evidencesOf(row: SnapshotRow): FieldEvidence[] {
  return Object.values(row.confidence)
}

/** Resolves row data quality independently from comparison status. */
export function getSnapshotDataQuality(row: SnapshotRow | undefined): DataQualityLabel | undefined {
  if (!row) return undefined

  const evidences = evidencesOf(row)
  const qualities = evidences.map(evidence => evidence.quality)
  if (qualities.includes('invalid')) return 'Invalid'
  if (qualities.includes('missing') || valuesOf(row).some(isBlank)) return 'Missing'
  if (qualities.includes('needs-review')) return 'Need Review'
  if (qualities.includes('warning') || evidences.some(evidence => evidence.status === 'estimated')) return 'Warning'
  if (evidences.length === 0) return 'Need Review'
  return 'Valid'
}

function qualityRank(label: DataQualityLabel): number {
  if (label === 'Invalid') return 4
  if (label === 'Missing') return 3
  if (label === 'Need Review') return 2
  if (label === 'Warning') return 1
  return 0
}

function worseQuality(left: DataQualityLabel, right: DataQualityLabel): DataQualityLabel {
  return qualityRank(left) >= qualityRank(right) ? left : right
}

/** Includes the Work Center rate dependency when assessing a Routing row. */
export function getRoutingDataQuality(
  row: SnapshotRoutingStep | undefined,
  rates: SnapshotWorkCenterRate[]
): DataQualityLabel | undefined {
  const rowQuality = getSnapshotDataQuality(row)
  if (!row || !rowQuality) return undefined
  const linkedRate = rates.find(rate => rate.workCenterCode.trim().toLowerCase() === row.workCenterId?.trim().toLowerCase())
  if (!linkedRate) return worseQuality(rowQuality, 'Missing')
  const rateQuality = getSnapshotDataQuality(linkedRate)
  return rateQuality ? worseQuality(rowQuality, rateQuality) : rowQuality
}

export function dataQualityClass(label: DataQualityLabel): string {
  if (label === 'Valid') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (label === 'Warning') return 'text-amber-700 bg-amber-50 border-amber-200'
  if (label === 'Missing') return 'text-orange-700 bg-orange-50 border-orange-200'
  if (label === 'Invalid') return 'text-rose-700 bg-rose-50 border-rose-200'
  return 'text-violet-700 bg-violet-50 border-violet-200'
}
