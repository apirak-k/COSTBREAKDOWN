import {
  BOMItem,
  CostSnapshot,
  DataConfidence,
  FieldEvidence,
  ProductMaster,
  ProductSession,
  RoutingStep,
  SnapshotBOMItem,
  SnapshotPair,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate,
  WorkCenterRate
} from '../types'
import { sessionToSnapshotPair } from './session-to-snapshots'

export interface LegacySessionProjection {
  product: ProductMaster
  rates: WorkCenterRate[]
  bom: BOMItem[]
  routing: RoutingStep[]
}

function key(value: string | undefined, fallback: string): string {
  return value?.trim().toLowerCase() || fallback
}

function routingProjectionMap(
  rows: SnapshotRoutingStep[],
  role: 'reference' | 'current'
): Map<string, SnapshotRoutingStep> {
  const counts = new Map<string, number>()
  rows.forEach(step => {
    const operationCode = step.operationCode?.trim().toLowerCase()
    if (operationCode) counts.set(operationCode, (counts.get(operationCode) ?? 0) + 1)
  })

  return new Map(rows.map((step, index) => {
    const operationCode = step.operationCode?.trim().toLowerCase()
    const rowIdentity = `${index}:${step.id.trim().toLowerCase()}`
    const projectionKey = !operationCode
      ? `missing:${role}:${rowIdentity}`
      : counts.get(operationCode) === 1
        ? `operation:${operationCode}`
        : `ambiguous:${role}:${operationCode}:${rowIdentity}`
    return [projectionKey, step] as const
  }))
}

function routingMembershipKey(step: { operationCode?: string; id: string }): string {
  const operationCode = step.operationCode?.trim().toLowerCase()
  return operationCode ? `operation:${operationCode}` : `id:${step.id.trim().toLowerCase()}`
}

function uniqueProjectionId(preferred: string | undefined, fallback: string, usedIds: Set<string>): string {
  const base = preferred?.trim() || fallback
  let candidate = base
  let suffix = 2

  while (usedIds.has(candidate)) {
    candidate = `${fallback}-${suffix}`
    suffix += 1
  }

  usedIds.add(candidate)
  return candidate
}

function combineConfidence(
  reference: Record<string, FieldEvidence> | undefined,
  current: Record<string, FieldEvidence> | undefined
): DataConfidence {
  const statuses = [
    ...Object.values(reference ?? {}).map(field => field.status),
    ...Object.values(current ?? {}).map(field => field.status)
  ]
  if (!reference || !current || statuses.includes('missing')) return 'missing'
  if (statuses.includes('estimated')) return 'estimated'
  return 'verified'
}

function mergedProduct(reference: ProductMaster, current: ProductMaster): ProductMaster {
  return {
    productCode: current.productCode || reference.productCode,
    productDescription: current.productDescription || reference.productDescription,
    uom: current.uom || reference.uom,
    note: current.note ?? '',
    customer: current.customer || reference.customer,
    effectiveDate: current.effectiveDate || reference.effectiveDate
  }
}

function projectBOM(reference: SnapshotBOMItem | undefined, current: SnapshotBOMItem | undefined, sourceRef: string, index: number, id: string): BOMItem {
  const isGeneratedSizingPlaceholder = current?.isGeneratedSizingPlaceholder ?? reference?.isGeneratedSizingPlaceholder
  const hasSizingPlaceholderMarker = current?.isGeneratedSizingPlaceholder !== undefined ||
    reference?.isGeneratedSizingPlaceholder !== undefined
  return {
    id,
    isGeneratedSizingPlaceholder,
    itemCode: hasSizingPlaceholderMarker
      ? current?.itemCode ?? reference?.itemCode ?? ''
      : current?.itemCode || reference?.itemCode || `ITEM-${index + 1}`,
    description: current?.description || reference?.description || '',
    consumption: current?.consumption ?? reference?.consumption ?? 0,
    unit: current?.unit || reference?.unit || 'PC',
    basePrice: reference?.price ?? 0,
    activePrice: current?.price ?? 0,
    baseLoss: reference?.loss ?? 0,
    activeLoss: current?.loss ?? 0,
    note: current ? (current.note ?? '') : (reference?.note ?? ''),
    sourceRef: current?.sourceRef || reference?.sourceRef || sourceRef,
    confidence: combineConfidence(reference?.confidence, current?.confidence)
  }
}

function projectRouting(reference: SnapshotRoutingStep | undefined, current: SnapshotRoutingStep | undefined, sourceRef: string, id: string): RoutingStep {
  return {
    id,
    isGeneratedSizingPlaceholder: current?.isGeneratedSizingPlaceholder ?? reference?.isGeneratedSizingPlaceholder,
    operationCode: current?.operationCode ?? reference?.operationCode,
    opSeq: current?.sequence ?? reference?.sequence ?? 0,
    description: current?.processName || reference?.processName || '',
    wc: current?.workCenterId || reference?.workCenterId || '',
    manning: current?.manning ?? reference?.manning ?? 0,
    baseCap: reference?.capacity ?? 0,
    activeCap: current?.capacity ?? 0,
    baseYield: reference?.yield ?? 0,
    activeYield: current?.yield ?? 0,
    note: current ? (current.note ?? '') : (reference?.note ?? ''),
    sourceRef: current?.sourceRef || reference?.sourceRef || sourceRef,
    confidence: combineConfidence(reference?.confidence, current?.confidence)
  }
}

function projectRate(rate: SnapshotWorkCenterRate, index: number): WorkCenterRate {
  return {
    id: rate.id || `rate-projection-${index + 1}`,
    isGeneratedSizingPlaceholder: rate.isGeneratedSizingPlaceholder,
    wc: rate.workCenterCode,
    description: rate.description,
    laborRate: rate.laborRate ?? 0,
    burdenRate: rate.burdenRate ?? 0,
    effectiveDate: rate.effectiveDate,
    note: rate.note,
    sourceRef: rate.sourceRef || '',
    confidence: combineConfidence(rate.confidence, rate.confidence)
  }
}

/** Projects independent snapshots into the current paired model for legacy screens. */
export function projectSnapshotPairToLegacySession(pair: SnapshotPair): LegacySessionProjection {
  const referenceBOM = new Map(pair.reference.bom.map(item => [key(item.itemCode, item.id), item]))
  const currentBOM = new Map(pair.current.bom.map(item => [key(item.itemCode, item.id), item]))
  const bomKeys = new Set([...referenceBOM.keys(), ...currentBOM.keys()])

  const referenceRouting = routingProjectionMap(pair.reference.routing, 'reference')
  const currentRouting = routingProjectionMap(pair.current.routing, 'current')
  const routingKeys = new Set([...referenceRouting.keys(), ...currentRouting.keys()])
  const usedBOMIds = new Set<string>()
  const usedRoutingIds = new Set<string>()

  return {
    product: mergedProduct(pair.reference.product, pair.current.product),
    rates: pair.current.rates.map(projectRate),
    bom: [...bomKeys].map((bomKey, index) => {
      const reference = referenceBOM.get(bomKey)
      const current = currentBOM.get(bomKey)
      const id = uniqueProjectionId(current?.id ?? reference?.id, `bom-projection-${index + 1}`, usedBOMIds)
      return projectBOM(reference, current, pair.current.sourceRef, index, id)
    }),
    routing: [...routingKeys].map((routingKey, index) => {
      const reference = referenceRouting.get(routingKey)
      const current = currentRouting.get(routingKey)
      const id = uniqueProjectionId(current?.id ?? reference?.id, `routing-projection-${index + 1}`, usedRoutingIds)
      return projectRouting(reference, current, pair.current.sourceRef, id)
    })
  }
}

export function applySnapshotPairToSession(session: ProductSession, pair: SnapshotPair): ProductSession {
  return {
    ...session,
    ...projectSnapshotPairToLegacySession(pair),
    snapshotPair: pair,
    snapshotPairMode: 'independent'
  }
}

function currentRowsAfterLegacyProjection<T>(
  projectedRows: T[],
  referenceRows: T[],
  currentRows: T[],
  rowKey: (row: T) => string
): T[] {
  const referenceKeys = new Set(referenceRows.map(rowKey))
  const currentKeys = new Set(currentRows.map(rowKey))

  return projectedRows.filter(row => {
    const keyValue = rowKey(row)
    return currentKeys.has(keyValue) || !referenceKeys.has(keyValue)
  })
}

/**
 * Rebuilds Current only for legacy-derived sessions. An independent pair is
 * canonical and must never be regenerated from its fallback-filled UI projection.
 */
export function updateCurrentSnapshotFromLegacySession(
  session: ProductSession,
  pair: SnapshotPair
): CostSnapshot {
  if (session.snapshotPairMode === 'independent') return pair.current

  const derivedCurrent = sessionToSnapshotPair(session).current

  return {
    ...derivedCurrent,
    id: pair.current.id,
    comparisonRole: 'current',
    status: pair.current.status,
    effectiveDate: derivedCurrent.effectiveDate || pair.current.effectiveDate,
    sourceRef: pair.current.sourceRef,
    remark: pair.current.remark,
    sizing: pair.current.sizing,
    additionalFields: pair.current.additionalFields,
    warnings: pair.current.warnings,
    bom: currentRowsAfterLegacyProjection(
      derivedCurrent.bom,
      pair.reference.bom,
      pair.current.bom,
      item => key(item.itemCode, item.id)
    ),
    routing: currentRowsAfterLegacyProjection(
      derivedCurrent.routing,
      pair.reference.routing,
      pair.current.routing,
      routingMembershipKey
    )
  }
}
