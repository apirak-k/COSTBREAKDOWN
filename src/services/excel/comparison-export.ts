import {
  ComparisonFinding,
  ConfidenceStatus,
  CostComparison,
  CostSnapshot,
  ProductMaster,
  SnapshotPair,
} from '../../core'

export interface ComparisonExportInput {
  product: ProductMaster
  snapshotPair: SnapshotPair
  comparison: CostComparison
}

export interface ComparisonExportSummaryRow {
  element: 'Material' | 'Labor' | 'Burden' | 'Total'
  reference: number
  current: number
  gap: number | null
  referenceStatus: string
  currentStatus: string
}

export interface ComparisonExportStatusCounts {
  matched: number
  changed: number
  added: number
  removed: number
  review: number
}

export interface ComparisonExportBOMRow {
  itemCode: string
  description: string
  comparison: string
  confidence: ConfidenceStatus
  referenceConsumption: number | null
  currentConsumption: number | null
  consumptionGap: number | null
  unit: string
  referencePrice: number | null
  currentPrice: number | null
  priceGap: number | null
  referenceLoss: number | null
  currentLoss: number | null
  lossGap: number | null
  referenceSource: string
  currentSource: string
}

export interface ComparisonExportRoutingRow {
  operationCode: string
  processName: string
  comparison: string
  confidence: ConfidenceStatus
  referenceSequence: number | null
  currentSequence: number | null
  referenceWorkCenter: string
  currentWorkCenter: string
  manning: number | null
  referenceCapacity: number | null
  currentCapacity: number | null
  capacityGap: number | null
  referenceYield: number | null
  currentYield: number | null
  yieldGap: number | null
  referenceSource: string
  currentSource: string
}

export interface ComparisonExportWorkCenterRow {
  workCenterCode: string
  description: string
  comparison: string
  confidence: ConfidenceStatus
  referenceLaborRate: number | null
  currentLaborRate: number | null
  laborGap: number | null
  referenceBurdenRate: number | null
  currentBurdenRate: number | null
  burdenGap: number | null
  referenceEffectiveDate: string
  currentEffectiveDate: string
  referenceSource: string
  currentSource: string
}

export interface ComparisonExportModel {
  metadata: {
    productCode: string
    productDescription: string
    uom: string
    customer: string
    comparisonId: string
    referenceSnapshotId: string
    currentSnapshotId: string
    referenceEffectiveDate: string
    currentEffectiveDate: string
    referenceSource: string
    currentSource: string
  }
  summaryRows: ComparisonExportSummaryRow[]
  statusCounts: ComparisonExportStatusCounts
  bomRows: ComparisonExportBOMRow[]
  routingRows: ComparisonExportRoutingRow[]
  workCenterRows: ComparisonExportWorkCenterRow[]
  warnings: string[]
}

type ComparisonExportRow = {
  comparison: string
  confidence: ConfidenceStatus
  referenceSource: string
  currentSource: string
}

function gap(current: number | null | undefined, reference: number | null | undefined): number | null {
  if (current === null || current === undefined || reference === null || reference === undefined) return null
  return current - reference
}

function sourceOf(row: { sourceRef?: string } | undefined, fallback: CostSnapshot): string {
  return row?.sourceRef || fallback.sourceRef || '—'
}

function confidenceOf(finding: ComparisonFinding | undefined): ConfidenceStatus {
  return finding?.confidence ?? 'missing'
}

function statusGroup(finding: ComparisonFinding | undefined, changed: boolean): keyof ComparisonExportStatusCounts {
  if (!finding || finding.matchStatus === 'ambiguous' || finding.matchStatus === 'unmatched') return 'review'
  if (finding.matchStatus === 'added') return 'added'
  if (finding.matchStatus === 'removed') return 'removed'
  return changed ? 'changed' : 'matched'
}

function addStatusCount(
  counts: ComparisonExportStatusCounts,
  finding: ComparisonFinding,
  changed: boolean
): void {
  counts[statusGroup(finding, changed)] += 1
}

function bomLabel(finding: ComparisonFinding | undefined): string {
  if (!finding) return 'Review'
  if (finding.matchStatus === 'added') return 'Added'
  if (finding.matchStatus === 'removed') return 'Removed'
  if (finding.matchStatus !== 'matched') return 'Review'
  return Object.keys(finding.fieldDiffs).length > 0 ? 'Changed' : 'Matched'
}

function routingLabels(finding: ComparisonFinding | undefined): string {
  if (!finding) return 'Review'
  if (finding.matchStatus === 'added') return 'Added'
  if (finding.matchStatus === 'removed') return 'Removed'
  if (finding.matchStatus !== 'matched') return 'Review'

  const labels: string[] = []
  if (finding.changeFlags.reordered) labels.push('Reordered')
  if (finding.changeFlags.movedWorkCenter) labels.push('Moved WC')
  if (finding.changeFlags.changedInputs) labels.push('Changed Input')
  return labels.length > 0 ? labels.join(', ') : 'Matched'
}

function workCenterLabel(finding: ComparisonFinding | undefined): string {
  if (!finding) return 'Review'
  if (finding.matchStatus === 'added') return 'Added'
  if (finding.matchStatus === 'removed') return 'Removed'
  if (finding.matchStatus !== 'matched') return 'Review'
  return finding.changeFlags.changedRate ? 'Changed Rate' : 'Matched'
}

function isBomChanged(finding: ComparisonFinding): boolean {
  return finding.matchStatus === 'matched' && Object.keys(finding.fieldDiffs).length > 0
}

function isRoutingChanged(finding: ComparisonFinding): boolean {
  return finding.matchStatus === 'matched' && (
    finding.changeFlags.reordered === true ||
    finding.changeFlags.movedWorkCenter === true ||
    finding.changeFlags.changedInputs === true
  )
}

function isWorkCenterChanged(finding: ComparisonFinding): boolean {
  return finding.matchStatus === 'matched' && finding.changeFlags.changedRate === true
}

function baseRow(
  finding: ComparisonFinding | undefined,
  reference: { sourceRef?: string } | undefined,
  current: { sourceRef?: string } | undefined,
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  comparison: string
): ComparisonExportRow {
  return {
    comparison,
    confidence: confidenceOf(finding),
    referenceSource: sourceOf(reference, referenceSnapshot),
    currentSource: sourceOf(current, currentSnapshot)
  }
}

function buildBOMRows(
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  findings: ComparisonFinding[],
  statusCounts: ComparisonExportStatusCounts
): ComparisonExportBOMRow[] {
  const referenceById = new Map(referenceSnapshot.bom.map(item => [item.id, item]))
  const findingByCurrentId = new Map(
    findings.filter(finding => finding.currentId).map(finding => [finding.currentId as string, finding])
  )
  const rows = currentSnapshot.bom.map(current => {
    const finding = findingByCurrentId.get(current.id)
    const reference = finding?.referenceId ? referenceById.get(finding.referenceId) : undefined
    const comparison = bomLabel(finding)
    if (finding) addStatusCount(statusCounts, finding, isBomChanged(finding))

    return {
      ...baseRow(finding, reference, current, referenceSnapshot, currentSnapshot, comparison),
      itemCode: current.itemCode,
      description: current.description,
      referenceConsumption: reference?.consumption ?? null,
      currentConsumption: current.consumption,
      consumptionGap: gap(current.consumption, reference?.consumption),
      unit: current.unit || reference?.unit || '—',
      referencePrice: reference?.price ?? null,
      currentPrice: current.price,
      priceGap: gap(current.price, reference?.price),
      referenceLoss: reference?.loss ?? null,
      currentLoss: current.loss,
      lossGap: gap(current.loss, reference?.loss)
    }
  })

  findings
    .filter(finding => !finding.currentId && finding.referenceId)
    .forEach(finding => {
      const reference = referenceById.get(finding.referenceId as string)
      if (!reference) return
      addStatusCount(statusCounts, finding, isBomChanged(finding))
      rows.push({
        ...baseRow(finding, reference, undefined, referenceSnapshot, currentSnapshot, bomLabel(finding)),
        itemCode: reference.itemCode,
        description: reference.description,
        referenceConsumption: reference.consumption,
        currentConsumption: null,
        consumptionGap: null,
        unit: reference.unit || '—',
        referencePrice: reference.price,
        currentPrice: null,
        priceGap: null,
        referenceLoss: reference.loss,
        currentLoss: null,
        lossGap: null
      })
    })

  return rows
}

function buildRoutingRows(
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  findings: ComparisonFinding[],
  statusCounts: ComparisonExportStatusCounts
): ComparisonExportRoutingRow[] {
  const referenceById = new Map(referenceSnapshot.routing.map(item => [item.id, item]))
  const findingByCurrentId = new Map(
    findings.filter(finding => finding.currentId).map(finding => [finding.currentId as string, finding])
  )
  const rows = currentSnapshot.routing.map(current => {
    const finding = findingByCurrentId.get(current.id)
    const reference = finding?.referenceId ? referenceById.get(finding.referenceId) : undefined
    const comparison = routingLabels(finding)
    if (finding) addStatusCount(statusCounts, finding, isRoutingChanged(finding))

    return {
      ...baseRow(finding, reference, current, referenceSnapshot, currentSnapshot, comparison),
      operationCode: current.operationCode || reference?.operationCode || current.id,
      processName: current.processName || reference?.processName || '—',
      referenceSequence: reference?.sequence ?? null,
      currentSequence: current.sequence ?? null,
      referenceWorkCenter: reference?.workCenterId || '—',
      currentWorkCenter: current.workCenterId || '—',
      manning: current.manning,
      referenceCapacity: reference?.capacity ?? null,
      currentCapacity: current.capacity,
      capacityGap: gap(current.capacity, reference?.capacity),
      referenceYield: reference?.yield ?? null,
      currentYield: current.yield,
      yieldGap: gap(current.yield, reference?.yield)
    }
  })

  findings
    .filter(finding => !finding.currentId && finding.referenceId)
    .forEach(finding => {
      const reference = referenceById.get(finding.referenceId as string)
      if (!reference) return
      addStatusCount(statusCounts, finding, isRoutingChanged(finding))
      rows.push({
        ...baseRow(finding, reference, undefined, referenceSnapshot, currentSnapshot, routingLabels(finding)),
        operationCode: reference.operationCode || reference.id,
        processName: reference.processName || '—',
        referenceSequence: reference.sequence ?? null,
        currentSequence: null,
        referenceWorkCenter: reference.workCenterId || '—',
        currentWorkCenter: '—',
        manning: null,
        referenceCapacity: reference.capacity,
        currentCapacity: null,
        capacityGap: null,
        referenceYield: reference.yield,
        currentYield: null,
        yieldGap: null
      })
    })

  return rows
}

function buildWorkCenterRows(
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  findings: ComparisonFinding[],
  statusCounts: ComparisonExportStatusCounts
): ComparisonExportWorkCenterRow[] {
  const referenceById = new Map(referenceSnapshot.rates.map(item => [item.id, item]))
  const findingByCurrentId = new Map(
    findings.filter(finding => finding.currentId).map(finding => [finding.currentId as string, finding])
  )
  const rows = currentSnapshot.rates.map(current => {
    const finding = findingByCurrentId.get(current.id)
    const reference = finding?.referenceId ? referenceById.get(finding.referenceId) : undefined
    const comparison = workCenterLabel(finding)
    if (finding) addStatusCount(statusCounts, finding, isWorkCenterChanged(finding))

    return {
      ...baseRow(finding, reference, current, referenceSnapshot, currentSnapshot, comparison),
      workCenterCode: current.workCenterCode,
      description: current.description || reference?.description || '—',
      referenceLaborRate: reference?.laborRate ?? null,
      currentLaborRate: current.laborRate,
      laborGap: gap(current.laborRate, reference?.laborRate),
      referenceBurdenRate: reference?.burdenRate ?? null,
      currentBurdenRate: current.burdenRate,
      burdenGap: gap(current.burdenRate, reference?.burdenRate),
      referenceEffectiveDate: reference?.effectiveDate || '—',
      currentEffectiveDate: current.effectiveDate || '—'
    }
  })

  findings
    .filter(finding => !finding.currentId && finding.referenceId)
    .forEach(finding => {
      const reference = referenceById.get(finding.referenceId as string)
      if (!reference) return
      addStatusCount(statusCounts, finding, isWorkCenterChanged(finding))
      rows.push({
        ...baseRow(finding, reference, undefined, referenceSnapshot, currentSnapshot, workCenterLabel(finding)),
        workCenterCode: reference.workCenterCode,
        description: reference.description || '—',
        referenceLaborRate: reference.laborRate,
        currentLaborRate: null,
        laborGap: null,
        referenceBurdenRate: reference.burdenRate,
        currentBurdenRate: null,
        burdenGap: null,
        referenceEffectiveDate: reference.effectiveDate || '—',
        currentEffectiveDate: '—'
      })
    })

  return rows
}

function countFindingStatuses(
  counts: ComparisonExportStatusCounts,
  findings: ComparisonFinding[],
  changed: (finding: ComparisonFinding) => boolean
): void {
  findings.forEach(finding => addStatusCount(counts, finding, changed(finding)))
}

export function buildComparisonExportModel(input: ComparisonExportInput): ComparisonExportModel {
  const { product, snapshotPair, comparison } = input
  const statusCounts: ComparisonExportStatusCounts = {
    matched: 0,
    changed: 0,
    added: 0,
    removed: 0,
    review: 0
  }

  const bomRows = buildBOMRows(snapshotPair.reference, snapshotPair.current, comparison.bomFindings, statusCounts)
  const routingRows = buildRoutingRows(snapshotPair.reference, snapshotPair.current, comparison.routingFindings, statusCounts)
  const workCenterRows = buildWorkCenterRows(snapshotPair.reference, snapshotPair.current, comparison.workCenterFindings, statusCounts)

  // The row builders count visible rows. Keep findings without a usable row visible in the summary as review items.
  countFindingStatuses(statusCounts, comparison.bomFindings.filter(finding => !finding.currentId && !finding.referenceId), isBomChanged)
  countFindingStatuses(statusCounts, comparison.routingFindings.filter(finding => !finding.currentId && !finding.referenceId), isRoutingChanged)
  countFindingStatuses(statusCounts, comparison.workCenterFindings.filter(finding => !finding.currentId && !finding.referenceId), isWorkCenterChanged)

  return {
    metadata: {
      productCode: product.productCode,
      productDescription: product.productDescription,
      uom: product.uom,
      customer: product.customer,
      comparisonId: comparison.id,
      referenceSnapshotId: comparison.referenceSnapshotId,
      currentSnapshotId: comparison.currentSnapshotId,
      referenceEffectiveDate: snapshotPair.reference.effectiveDate,
      currentEffectiveDate: snapshotPair.current.effectiveDate,
      referenceSource: snapshotPair.reference.sourceRef,
      currentSource: snapshotPair.current.sourceRef
    },
    summaryRows: [
      {
        element: 'Material',
        reference: comparison.referenceCost.material,
        current: comparison.currentCost.material,
        gap: comparison.elementGaps.material,
        referenceStatus: comparison.referenceCost.status,
        currentStatus: comparison.currentCost.status
      },
      {
        element: 'Labor',
        reference: comparison.referenceCost.labor,
        current: comparison.currentCost.labor,
        gap: comparison.elementGaps.labor,
        referenceStatus: comparison.referenceCost.status,
        currentStatus: comparison.currentCost.status
      },
      {
        element: 'Burden',
        reference: comparison.referenceCost.burden,
        current: comparison.currentCost.burden,
        gap: comparison.elementGaps.burden,
        referenceStatus: comparison.referenceCost.status,
        currentStatus: comparison.currentCost.status
      },
      {
        element: 'Total',
        reference: comparison.referenceCost.total,
        current: comparison.currentCost.total,
        gap: comparison.totalGap,
        referenceStatus: comparison.referenceCost.status,
        currentStatus: comparison.currentCost.status
      }
    ],
    statusCounts,
    bomRows,
    routingRows,
    workCenterRows,
    warnings: comparison.warnings.map(warning => warning.message)
  }
}
