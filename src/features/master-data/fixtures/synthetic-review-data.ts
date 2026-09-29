import type { CostSnapshot, SnapshotPair } from '../../../core'

const product = {
  productCode: 'SYN-DEMO-001',
  productDescription: 'Synthetic Assembly for Review',
  uom: 'PC',
  customer: 'Synthetic Sample',
  effectiveDate: '2026-01-01'
}

function snapshot(
  id: string,
  comparisonRole: 'reference' | 'current',
  rates: CostSnapshot['rates'],
  bom: CostSnapshot['bom'],
  routing: CostSnapshot['routing']
): CostSnapshot {
  return {
    id,
    comparisonRole,
    status: 'draft',
    sourceRef: 'Synthetic development fixture',
    effectiveDate: product.effectiveDate,
    product: { ...product },
    rates,
    bom,
    routing,
    sizing: { wcCount: rates.length, bomCount: bom.length, routingCount: routing.length },
    remark: 'Synthetic data for local UX and logic review.'
  }
}

function rate(id: string, workCenterCode: string, laborRate: number, burdenRate: number) {
  return {
    id,
    workCenterCode,
    description: `${workCenterCode} synthetic work center`,
    laborRate,
    burdenRate,
    effectiveDate: product.effectiveDate,
    confidence: {}
  }
}

function bom(id: string, itemCode: string, price: number, consumption = 2) {
  return {
    id,
    itemCode,
    description: `${itemCode} synthetic material`,
    consumption,
    unit: 'PC',
    price,
    loss: 0.05,
    confidence: {}
  }
}

function routing(
  id: string,
  operationCode: string,
  workCenterId: string,
  capacity: number,
  yieldRate: number
) {
  return {
    id,
    operationCode,
    sequence: Number(operationCode.slice(3)),
    processName: `${operationCode} synthetic operation`,
    workCenterId,
    manning: 1,
    capacity,
    yield: yieldRate,
    confidence: {}
  }
}

export function createSyntheticReviewSnapshotPair(): SnapshotPair {
  return {
    reference: snapshot('synthetic-reference', 'reference', [
      rate('synthetic-rate-fab-ref', 'WC-FAB', 100, 50),
      rate('synthetic-rate-assembly-ref', 'WC-ASSEMBLY', 120, 60)
    ], [
      bom('synthetic-bom-mat-a-ref', 'MAT-A', 10),
      bom('synthetic-bom-mat-b-ref', 'MAT-B', 5),
      bom('synthetic-bom-mat-removed', 'MAT-REMOVED', 3)
    ], [
      routing('synthetic-route-op10-ref', 'OP-10', 'WC-FAB', 100, 0.98),
      routing('synthetic-route-op20-ref', 'OP-20', 'WC-ASSEMBLY', 40, 0.95),
      routing('synthetic-route-op30-removed', 'OP-30', 'WC-ASSEMBLY', 50, 0.99)
    ]),
    current: snapshot('synthetic-current', 'current', [
      rate('synthetic-rate-fab-current', 'WC-FAB', 110, 50),
      rate('synthetic-rate-assembly-current', 'WC-ASSEMBLY', 120, 60)
    ], [
      bom('synthetic-bom-mat-a-current', 'MAT-A', 12),
      bom('synthetic-bom-mat-b-current', 'MAT-B', 5),
      bom('synthetic-bom-mat-added', 'MAT-NEW', 7)
    ], [
      routing('synthetic-route-op10-current', 'OP-10', 'WC-FAB', 100, 0.98),
      routing('synthetic-route-op20-current', 'OP-20', 'WC-ASSEMBLY', 35, 0.9),
      routing('synthetic-route-op40-added', 'OP-40', 'WC-ASSEMBLY', 25, 0.97)
    ])
  }
}
