import type {
  CostSnapshot,
  SnapshotBOMItem,
  SnapshotPair,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../../../core'

const effectiveDate = '2026-01-01'

function product(productName = 'Synthetic Assembly for Review') {
  return {
    productName,
    sellingPrice: 250,
    sgaPercent: 8,
    productCode: 'SYN-DEMO-001',
    productDescription: 'Synthetic assembly used only for development review',
    uom: 'PC',
    customer: 'Synthetic Sample',
    effectiveDate
  }
}

function snapshot(
  id: string,
  comparisonRole: 'reference' | 'current',
  rates: SnapshotWorkCenterRate[],
  bom: SnapshotBOMItem[],
  routing: SnapshotRoutingStep[],
  productName?: string,
  sizing?: CostSnapshot['sizing']
): CostSnapshot {
  return {
    id,
    comparisonRole,
    status: 'draft',
    sourceRef: 'Synthetic development fixture',
    effectiveDate,
    product: product(productName),
    rates,
    bom,
    routing,
    sizing: {
      wcCount: sizing?.wcCount ?? rates.length,
      bomCount: sizing?.bomCount ?? bom.length,
      routingCount: sizing?.routingCount ?? routing.length
    },
    remark: 'Synthetic data for local UX and logic review.'
  }
}

function rate(
  id: string,
  workCenterCode: string,
  laborRate: number | null,
  burdenRate: number | null
): SnapshotWorkCenterRate {
  return {
    id,
    workCenterCode,
    description: `${workCenterCode} synthetic work center`,
    laborRate,
    burdenRate,
    effectiveDate,
    sourceRef: 'Synthetic development fixture',
    confidence: {}
  }
}

function bom(
  id: string,
  name: string,
  usage: number | null,
  price: number | null,
  loss: number | null
): SnapshotBOMItem {
  return {
    id,
    itemCode: id,
    description: name,
    consumption: usage,
    unit: 'PC',
    price,
    loss,
    sourceRef: 'Synthetic development fixture',
    confidence: {}
  }
}

function routing(
  id: string,
  processName: string,
  workCenterCode: string,
  manning: number | null,
  capacity: number | null,
  yieldRate: number | null
): SnapshotRoutingStep {
  return {
    id,
    processName,
    workCenterId: workCenterCode,
    manning,
    capacity,
    yield: yieldRate,
    sourceRef: 'Synthetic development fixture',
    confidence: {}
  }
}

/**
 * Complete comparison data for walking the settled cost-review flow.
 * Process names intentionally differ at WC-SHARED so Work Center aggregation
 * can be reviewed without a one-to-one Routing match.
 */
export function createSyntheticReviewSnapshotPair(): SnapshotPair {
  return {
    reference: snapshot('synthetic-reference', 'reference', [
      rate('synthetic-rate-fab-ref', 'WC-FAB', 100, 50),
      rate('synthetic-rate-assembly-ref', 'WC-ASSEMBLY', 120, 60),
      rate('synthetic-rate-removed-ref', 'WC-REMOVE', 90, 45),
      rate('synthetic-rate-shared-ref', 'WC-SHARED', 80, 40)
    ], [
      bom('synthetic-bom-mat-a-ref', 'MAT-A', 2, 10, 0.05),
      bom('synthetic-bom-mat-b-ref', 'MAT-B', 1, 5, 0.02),
      bom('synthetic-bom-mat-usage-ref', 'MAT-USAGE', 3, 4, 0.01),
      bom('synthetic-bom-mat-loss-ref', 'MAT-LOSS', 1, 6, 0.03),
      bom('synthetic-bom-mat-removed', 'MAT-REMOVED', 2, 3, 0.02)
    ], [
      routing('synthetic-route-op10-ref', 'OP-10', 'WC-FAB', 1, 100, 0.98),
      routing('synthetic-route-op20-ref', 'OP-20', 'WC-ASSEMBLY', 1, 40, 0.95),
      routing('synthetic-route-op21-ref', 'OP-21', 'WC-ASSEMBLY', 2, 60, 0.97),
      routing('synthetic-route-op-removed-ref', 'OP-REMOVED', 'WC-REMOVE', 1, 50, 0.99),
      routing('synthetic-route-manning-ref', 'OP-MANNING', 'WC-FAB', 1, 80, 0.98),
      routing('synthetic-route-cut-ref-a', 'CUT-REF-A', 'WC-SHARED', 1, 100, 0.98),
      routing('synthetic-route-cut-ref-b', 'CUT-REF-B', 'WC-SHARED', 1, 80, 0.97)
    ], undefined, { wcCount: 5, bomCount: 6, routingCount: 8 }),
    current: snapshot('synthetic-current', 'current', [
      rate('synthetic-rate-fab-current', 'WC-FAB', 110, 55),
      rate('synthetic-rate-assembly-current', 'WC-ASSEMBLY', 120, 60),
      rate('synthetic-rate-added-current', 'WC-ADD', 95, 50),
      rate('synthetic-rate-shared-current', 'WC-SHARED', 80, 40)
    ], [
      bom('synthetic-bom-mat-a-current', 'MAT-A', 2, 12, 0.05),
      bom('synthetic-bom-mat-b-current', 'MAT-B', 1, 5, 0.02),
      bom('synthetic-bom-mat-usage-current', 'MAT-USAGE', 4, 4, 0.01),
      bom('synthetic-bom-mat-loss-current', 'MAT-LOSS', 1, 6, 0.05),
      bom('synthetic-bom-mat-added', 'MAT-ADDED', 1, 7, 0.01)
    ], [
      routing('synthetic-route-op10-current', 'OP-10', 'WC-FAB', 1, 100, 0.98),
      routing('synthetic-route-op20-current', 'OP-20', 'WC-ASSEMBLY', 1, 35, 0.9),
      routing('synthetic-route-op21-current', 'OP-21', 'WC-ASSEMBLY', 2, 60, 0.97),
      routing('synthetic-route-op-added-current', 'OP-ADDED', 'WC-ADD', 1, 25, 0.97),
      routing('synthetic-route-manning-current', 'OP-MANNING', 'WC-FAB', 2, 80, 0.98),
      routing('synthetic-route-cut-current-a', 'CUT-CURRENT-A', 'WC-SHARED', 1, 105, 0.98),
      routing('synthetic-route-cut-current-b', 'CUT-CURRENT-B', 'WC-SHARED', 1, 75, 0.96)
    ], undefined, { wcCount: 5, bomCount: 6, routingCount: 8 })
  }
}

/**
 * Intentionally incomplete data for reviewing warnings and unavailable results.
 * It does not define behavior for blank Sizing rows or blank user-owned rows.
 */
export function createSyntheticDataQualitySnapshotPair(): SnapshotPair {
  return {
    reference: snapshot('synthetic-quality-reference', 'reference', [
      rate('synthetic-quality-rate-ref', 'WC-VALID', 100, 50)
    ], [
      bom('synthetic-quality-priced-ref', 'MAT-PRICE', 1, 20, 0.02),
      bom('synthetic-quality-duplicate-ref', 'MAT-DUPLICATE', 1, 5, 0.02)
    ], [
      routing('synthetic-quality-route-ref', 'VALID PROCESS', 'WC-VALID', 1, 100, 0.98)
    ], 'Synthetic Quality Review'),
    current: snapshot('synthetic-quality-current', 'current', [
      rate('synthetic-quality-rate-current', 'WC-VALID', 100, 50),
      rate('synthetic-quality-rate-unpriced', 'WC-MISSING', null, null)
    ], [
      bom('synthetic-quality-priced-current', 'MAT-PRICE', 1, null, 0.02),
      bom('synthetic-quality-duplicate-current-a', 'MAT-DUPLICATE', 1, 5, 0.02),
      bom('synthetic-quality-duplicate-current-b', 'MAT-DUPLICATE', 2, 5, 0.02)
    ], [
      routing('synthetic-quality-route-current', 'VALID PROCESS', 'WC-VALID', 1, 100, 0.98),
      routing('synthetic-quality-missing-rate', 'PROCESS WITH MISSING RATES', 'WC-MISSING', 1, 50, 0.95)
    ], 'Synthetic Quality Review Variant')
  }
}
