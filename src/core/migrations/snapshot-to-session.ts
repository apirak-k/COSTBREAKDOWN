import {
  BOMItem,
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

export interface LegacySessionProjection {
  product: ProductMaster
  rates: WorkCenterRate[]
  bom: BOMItem[]
  routing: RoutingStep[]
}

function key(value: string | undefined, fallback: string): string {
  return value?.trim().toLowerCase() || fallback
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
    customer: current.customer || reference.customer,
    effectiveDate: current.effectiveDate || reference.effectiveDate
  }
}

function projectBOM(reference: SnapshotBOMItem | undefined, current: SnapshotBOMItem | undefined, sourceRef: string, index: number): BOMItem {
  return {
    id: current?.id ?? reference?.id ?? `bom-projection-${index + 1}`,
    itemCode: current?.itemCode || reference?.itemCode || `ITEM-${index + 1}`,
    description: current?.description || reference?.description || '',
    consumption: current?.consumption ?? reference?.consumption ?? 0,
    unit: current?.unit || reference?.unit || 'PC',
    basePrice: reference?.price ?? 0,
    activePrice: current?.price ?? 0,
    baseLoss: reference?.loss ?? 0,
    activeLoss: current?.loss ?? 0,
    sourceRef: current?.sourceRef || reference?.sourceRef || sourceRef,
    confidence: combineConfidence(reference?.confidence, current?.confidence)
  }
}

function projectRouting(reference: SnapshotRoutingStep | undefined, current: SnapshotRoutingStep | undefined, sourceRef: string, index: number): RoutingStep {
  return {
    id: current?.id ?? reference?.id ?? `routing-projection-${index + 1}`,
    opSeq: current?.sequence ?? reference?.sequence ?? 0,
    description: current?.processName || reference?.processName || '',
    wc: current?.workCenterId || reference?.workCenterId || '',
    manning: current?.manning ?? reference?.manning ?? 0,
    baseCap: reference?.capacity ?? 0,
    activeCap: current?.capacity ?? 0,
    baseYield: reference?.yield ?? 0,
    activeYield: current?.yield ?? 0,
    sourceRef: current?.sourceRef || reference?.sourceRef || sourceRef,
    confidence: combineConfidence(reference?.confidence, current?.confidence)
  }
}

function projectRate(rate: SnapshotWorkCenterRate, index: number): WorkCenterRate {
  return {
    id: rate.id || `rate-projection-${index + 1}`,
    wc: rate.workCenterCode,
    description: rate.description,
    laborRate: rate.laborRate ?? 0,
    burdenRate: rate.burdenRate ?? 0,
    effectiveDate: rate.effectiveDate,
    sourceRef: rate.sourceRef || '',
    confidence: combineConfidence(rate.confidence, rate.confidence)
  }
}

/** Projects independent snapshots into the current paired model for legacy screens. */
export function projectSnapshotPairToLegacySession(pair: SnapshotPair): LegacySessionProjection {
  const referenceBOM = new Map(pair.reference.bom.map(item => [key(item.itemCode, item.id), item]))
  const currentBOM = new Map(pair.current.bom.map(item => [key(item.itemCode, item.id), item]))
  const bomKeys = new Set([...referenceBOM.keys(), ...currentBOM.keys()])

  const referenceRouting = new Map(pair.reference.routing.map(item => [key(item.operationCode || item.processName, item.id), item]))
  const currentRouting = new Map(pair.current.routing.map(item => [key(item.operationCode || item.processName, item.id), item]))
  const routingKeys = new Set([...referenceRouting.keys(), ...currentRouting.keys()])

  return {
    product: mergedProduct(pair.reference.product, pair.current.product),
    rates: pair.current.rates.map(projectRate),
    bom: [...bomKeys].map((bomKey, index) => projectBOM(referenceBOM.get(bomKey), currentBOM.get(bomKey), pair.current.sourceRef, index)),
    routing: [...routingKeys].map((routingKey, index) => projectRouting(referenceRouting.get(routingKey), currentRouting.get(routingKey), pair.current.sourceRef, index))
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
