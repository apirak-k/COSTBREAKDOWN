import { getFieldConfidence } from '../utils/confidence'
import {
  BOMItem,
  FieldEvidence,
  LegacyPairedModel,
  ComparisonRole,
  CostSnapshot,
  SnapshotBOMItem,
  SnapshotPair,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate,
  RoutingStep,
  WorkCenterRate
} from '../types'

function evidence(value: unknown, sourceRef: string | undefined, rowConfidence: BOMItem['confidence'] | RoutingStep['confidence'] | WorkCenterRate['confidence']): FieldEvidence {
  const status = rowConfidence ?? getFieldConfidence(value, sourceRef)
  return {
    status,
    sourceRef,
    basis: rowConfidence ? 'Inherited from legacy row confidence' : 'Mapped from legacy paired model'
  }
}

function toBOMItem(item: BOMItem, role: ComparisonRole): SnapshotBOMItem {
  const price = role === 'reference' ? item.basePrice : item.activePrice
  const loss = role === 'reference' ? item.baseLoss : item.activeLoss

  return {
    id: item.id,
    itemCode: item.itemCode,
    description: item.description,
    consumption: item.consumption,
    unit: item.unit,
    price,
    loss,
    sourceRef: item.sourceRef,
    confidence: {
      consumption: evidence(item.consumption, item.sourceRef, item.confidence),
      price: evidence(price, item.sourceRef, item.confidence),
      loss: evidence(loss, item.sourceRef, item.confidence)
    }
  }
}

function toRoutingStep(step: RoutingStep, role: ComparisonRole): SnapshotRoutingStep {
  const capacity = role === 'reference' ? step.baseCap : step.activeCap
  const yieldValue = role === 'reference' ? step.baseYield : step.activeYield

  return {
    id: step.id,
    sequence: step.opSeq,
    processName: step.description,
    workCenterId: step.wc,
    manning: step.manning,
    capacity,
    yield: yieldValue,
    sourceRef: step.sourceRef,
    confidence: {
      manning: evidence(step.manning, step.sourceRef, step.confidence),
      capacity: evidence(capacity, step.sourceRef, step.confidence),
      yield: evidence(yieldValue, step.sourceRef, step.confidence)
    }
  }
}

function toWorkCenterRate(rate: WorkCenterRate): SnapshotWorkCenterRate {
  return {
    id: rate.id ?? rate.wc,
    workCenterCode: rate.wc,
    description: rate.description,
    laborRate: rate.laborRate,
    burdenRate: rate.burdenRate,
    effectiveDate: rate.effectiveDate,
    sourceRef: rate.sourceRef,
    confidence: {
      laborRate: evidence(rate.laborRate, rate.sourceRef, rate.confidence),
      burdenRate: evidence(rate.burdenRate, rate.sourceRef, rate.confidence)
    }
  }
}

function createSnapshot(input: LegacyPairedModel, role: ComparisonRole): CostSnapshot {
  return {
    id: `${input.id}:${role}`,
    product: { ...input.product },
    effectiveDate: input.product.effectiveDate,
    sourceRef: input.sourceRef ?? `legacy-session:${input.id}`,
    comparisonRole: role,
    status: input.status,
    rates: input.rates.map(toWorkCenterRate),
    bom: input.bom.map(item => toBOMItem(item, role)),
    routing: input.routing.map(step => toRoutingStep(step, role))
  }
}

/** Converts the current paired Base/Active model without mutating the input. */
export function migratePairedModelToSnapshots(input: LegacyPairedModel): SnapshotPair {
  return {
    reference: createSnapshot(input, 'reference'),
    current: createSnapshot(input, 'current')
  }
}
