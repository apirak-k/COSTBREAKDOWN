import type { DatasetSizing } from '../core/types/product.types'
import type {
  ComparisonRole,
  CostSnapshot,
  SnapshotPair,
  SnapshotBOMItem,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../core/types/snapshot.types'
import { assertDatasetSizingCounts } from '../core/utils/sizing'

export interface MasterDataSizingFactories {
  rate: (index: number) => SnapshotWorkCenterRate
  bom: (index: number) => SnapshotBOMItem
  routing: (index: number, rates: SnapshotWorkCenterRate[]) => SnapshotRoutingStep
}

export function markSizingPlaceholderEdited<T extends { isGeneratedSizingPlaceholder?: boolean }>(row: T): T {
  return { ...row, isGeneratedSizingPlaceholder: false }
}

export function importSnapshotForRole(
  pair: SnapshotPair,
  existingSizing: Partial<Record<ComparisonRole, DatasetSizing>> | undefined,
  role: ComparisonRole,
  snapshot: CostSnapshot
): { snapshotPair: SnapshotPair; datasetSizing: Record<ComparisonRole, DatasetSizing> } {
  const sizing = {
    wcCount: snapshot.rates.length,
    bomCount: snapshot.bom.length,
    routingCount: snapshot.routing.length
  }
  const snapshotPair = { ...pair, [role]: { ...snapshot, sizing } }

  return {
    snapshotPair,
    datasetSizing: {
      reference: existingSizing?.reference ?? pair.reference.sizing ?? {},
      current: existingSizing?.current ?? pair.current.sizing ?? {},
      [role]: sizing
    }
  }
}

function isGeneratedRow(row: { id: string; isGeneratedSizingPlaceholder?: boolean }, prefix: string): boolean {
  return row.isGeneratedSizingPlaceholder === true ||
    (row.isGeneratedSizingPlaceholder === undefined &&
      new RegExp(`^${prefix}-size-(?:\\d+|legacy)-\\d+$`).test(row.id))
}

function isEmpty(value: string | undefined): boolean {
  return value === undefined || value.trim() === ''
}

function hasNoExtraFields(fields?: Record<string, unknown>): boolean {
  return !fields || Object.keys(fields).length === 0
}

function hasDefaultEvidence(
  confidence: Record<string, { status: string; quality?: string; sourceRef?: string; basis?: string; sourceValue?: unknown; workingValue?: unknown }>,
  defaults: Record<string, number | null>
): boolean {
  return Object.entries(confidence).every(([key, evidence]) => {
    if (!(key in defaults)) return false
    const value = defaults[key]
    return evidence.status === (value === null ? 'missing' : 'verified') &&
      evidence.quality === (value === null ? 'missing' : 'valid') &&
      evidence.sourceRef === 'Direct Input' &&
      evidence.basis === 'Master Data working value' &&
      evidence.sourceValue === value && evidence.workingValue === value
  })
}

function generatedRateDate(id: string): string | undefined {
  const timestamp = Number(id.match(/^rate-size-(\d+)-\d+$/)?.[1])
  if (!Number.isFinite(timestamp)) return undefined
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().split('T')[0]
}

function isBlankRate(row: SnapshotWorkCenterRate, snapshot: CostSnapshot): boolean {
  const generatedPlaceholder = row.isGeneratedSizingPlaceholder === true
  const defaultRates = (row.laborRate === null && row.burdenRate === null) ||
    (generatedPlaceholder && row.laborRate === 0 && row.burdenRate === 0)
  return isGeneratedRow(row, 'rate') && isEmpty(row.workCenterCode) && isEmpty(row.description) &&
    isEmpty(row.note) &&
    defaultRates &&
    (generatedPlaceholder || isEmpty(row.effectiveDate) || row.effectiveDate === snapshot.product.effectiveDate ||
      row.effectiveDate === generatedRateDate(row.id)) &&
    (row.sourceRef === undefined || row.sourceRef === 'Direct Input') &&
    hasNoExtraFields(row.additionalFields) &&
    (generatedPlaceholder || hasDefaultEvidence(row.confidence, { laborRate: null, burdenRate: null }))
}

function isBlankBom(row: SnapshotBOMItem): boolean {
  const generatedPlaceholder = row.isGeneratedSizingPlaceholder === true
  const defaultQuantities = (row.consumption === null && row.price === null) ||
    (generatedPlaceholder && row.consumption === 0 && row.price === 0)
  return isGeneratedRow(row, 'bom') && isEmpty(row.itemCode) && isEmpty(row.description) &&
    isEmpty(row.note) &&
    defaultQuantities && row.unit === 'PC' && row.loss === 0 &&
    (row.sourceRef === undefined || row.sourceRef === 'Direct Input') &&
    hasNoExtraFields(row.additionalFields) &&
    (generatedPlaceholder || hasDefaultEvidence(row.confidence, { consumption: null, price: null, loss: 0 }))
}

function isBlankRouting(row: SnapshotRoutingStep, snapshot: CostSnapshot): boolean {
  const generatedPlaceholder = row.isGeneratedSizingPlaceholder === true
  const index = Number(row.id.match(/-(\d+)$/)?.[1])
  const defaultSequence = Number.isFinite(index) ? index * 10 : undefined
  const defaultWorkCenter = snapshot.rates[0]?.workCenterCode || undefined
  const defaultMetrics = (row.manning === null && row.capacity === null && row.yield === null) ||
    (generatedPlaceholder && row.manning === 0 && row.capacity === 0 && row.yield === 0)
  return isGeneratedRow(row, 'routing') && isEmpty(row.operationCode) &&
    isEmpty(row.processCode) && isEmpty(row.processName) && isEmpty(row.note) &&
    (row.sequence === undefined || row.sequence === defaultSequence) &&
    (isEmpty(row.workCenterId) || row.workCenterId === defaultWorkCenter) &&
    defaultMetrics &&
    (row.sourceRef === undefined || row.sourceRef === 'Direct Input') &&
    hasNoExtraFields(row.additionalFields) &&
    (generatedPlaceholder || hasDefaultEvidence(row.confidence, row.sequence === undefined ?
      { manning: null, capacity: null, yield: null } :
      { sequence: row.sequence, manning: null, capacity: null, yield: null }))
}

export function hasEnteredMasterData(snapshot: CostSnapshot): boolean {
  const product = snapshot.product
  const normalizedUom = product.uom?.trim().toUpperCase()
  const hasUserMetadata =
    !isEmpty(product.productName) ||
    product.sellingPrice !== undefined && product.sellingPrice !== null ||
    product.sgaPercent !== undefined && product.sgaPercent !== null ||
    Boolean(normalizedUom && normalizedUom !== 'PC') ||
    !isEmpty(product.productCode) ||
    !isEmpty(product.productDescription) ||
    !isEmpty(product.note) ||
    !isEmpty(product.customer) ||
    !isEmpty(product.effectiveDate) ||
    !isEmpty(snapshot.effectiveDate) ||
    !isEmpty(snapshot.remark) ||
    !hasNoExtraFields(product.additionalFields) ||
    !hasNoExtraFields(snapshot.additionalFields)

  return hasUserMetadata ||
    snapshot.rates.some(row => !isBlankRate(row, snapshot)) ||
    snapshot.bom.some(row => !isBlankBom(row)) ||
    snapshot.routing.some(row => !isBlankRouting(row, snapshot))
}

function resizeRows<T>(rows: T[], count: number | undefined, isBlank: (row: T) => boolean, create: (index: number) => T): T[] {
  const next = [...rows]
  if (count === undefined) return next
  const target = Math.max(1, Math.floor(count))
  for (let index = next.length - 1; index >= 0 && next.length > target; index--) {
    if (isBlank(next[index])) next.splice(index, 1)
  }
  while (next.length < target) next.push(create(next.length + 1))
  return next
}

export function resizeMasterDataSnapshotForSizing(
  snapshot: CostSnapshot,
  sizing: DatasetSizing,
  factories: MasterDataSizingFactories
): CostSnapshot {
  // Zero remains valid for older persisted setups; resizeRows enforces the one-row section minimum.
  assertDatasetSizingCounts(sizing, { allowZero: true })
  const rates = resizeRows(snapshot.rates, sizing.wcCount, row => isBlankRate(row, snapshot), factories.rate)
  return {
    ...snapshot,
    sizing: { ...sizing },
    rates,
    bom: resizeRows(snapshot.bom, sizing.bomCount, isBlankBom, factories.bom),
    routing: resizeRows(snapshot.routing, sizing.routingCount, row => isBlankRouting(row, snapshot), index => factories.routing(index, rates))
  }
}
