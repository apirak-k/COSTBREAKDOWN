import { ComparisonFinding, CostComparison, CostSnapshot, SnapshotRoutingStep } from '../types'
import { getCanonicalComparisonStatus } from './comparison-status'
import { CandidateChangeDetail, PrioritizationCandidate, PrioritizationStatus } from './material-candidates'
import { calculateSnapshotRoutingDetail } from './snapshot-routing-detail'

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    workCenterId: 'Work Center',
    manning: 'Manning',
    capacity: 'Capacity',
    yield: 'Yield',
    laborRate: 'Labor Rate',
    burdenRate: 'Burden Rate'
  }
  return labels[field] ?? field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, value => value.toUpperCase())
}

function fieldChanges(finding: ComparisonFinding): CandidateChangeDetail[] {
  return Object.entries(finding.fieldDiffs).map(([field, value]) => ({
    field: fieldLabel(field),
    reference: value.reference,
    current: value.current
  }))
}

function workCenterRateChanges(
  comparison: CostComparison,
  referenceStep: SnapshotRoutingStep | undefined,
  currentStep: SnapshotRoutingStep | undefined,
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot
): CandidateChangeDetail[] {
  const processCenters = new Set([
    normalizeKey(referenceStep?.workCenterId),
    normalizeKey(currentStep?.workCenterId)
  ].filter(Boolean))
  const referenceRates = new Map(referenceSnapshot.rates.map(rate => [rate.id, rate]))
  const currentRates = new Map(currentSnapshot.rates.map(rate => [rate.id, rate]))
  const details: CandidateChangeDetail[] = []

  for (const finding of comparison.workCenterFindings) {
    if (finding.matchStatus !== 'matched' || !finding.changeFlags.changedRate) continue
    const referenceRate = finding.referenceId ? referenceRates.get(finding.referenceId) : undefined
    const currentRate = finding.currentId ? currentRates.get(finding.currentId) : undefined
    const workCenterCode = currentRate?.workCenterCode ?? referenceRate?.workCenterCode
    if (!workCenterCode || !processCenters.has(normalizeKey(workCenterCode))) continue

    for (const [field, value] of Object.entries(finding.fieldDiffs)) {
      if (field !== 'laborRate' && field !== 'burdenRate') continue
      details.push({
        field: `${workCenterCode} ${fieldLabel(field)}`,
        reference: value.reference,
        current: value.current
      })
    }
  }

  return details
}

function processDetailsForSide(
  snapshot: CostSnapshot,
  processName: string,
  side: 'reference' | 'current'
): NonNullable<PrioritizationCandidate['processBreakdown']>['reference'] {
  return snapshot.routing
    .filter(step => normalizeKey(step.processName) === normalizeKey(processName))
    .map(step => {
      const detail = calculateSnapshotRoutingDetail(
        side === 'reference' ? { reference: step } : { current: step },
        snapshot.rates,
        snapshot.rates
      )
      const laborCost = side === 'reference' ? detail.referenceLaborCost : detail.currentLaborCost
      const burdenCost = side === 'reference' ? detail.referenceBurdenCost : detail.currentBurdenCost
      const totalCost = side === 'reference' ? detail.referenceTotal : detail.currentTotal

      return {
        id: step.id,
        processName: step.processName.trim() || 'Unnamed Process',
        manning: step.manning,
        capacity: step.capacity,
        yield: step.yield,
        laborCost,
        burdenCost,
        totalCost
      }
    })
}

/** Builds one Process/Routing Candidate from each eligible Process comparison finding. */
export function buildProcessingCandidates(
  comparison: CostComparison,
  referenceSnapshot: CostSnapshot,
  currentSnapshot: CostSnapshot,
  controllabilityMap?: Record<string, boolean>
): PrioritizationCandidate[] {
  const referenceById = new Map(referenceSnapshot.routing.map(step => [step.id, step]))
  const currentById = new Map(currentSnapshot.routing.map(step => [step.id, step]))
  const candidates: PrioritizationCandidate[] = []

  for (const finding of comparison.routingFindings) {
    const status = getCanonicalComparisonStatus(finding)
    if (!status || status === 'UNCHANGED') continue

    const referenceStep = finding.referenceId ? referenceById.get(finding.referenceId) : undefined
    const currentStep = finding.currentId ? currentById.get(finding.currentId) : undefined
    const processName = currentStep?.processName ?? referenceStep?.processName
    const sourceId = finding.currentId ?? finding.referenceId
    if (!processName || !sourceId || !finding.costEffect) continue

    const candidateKey = `process:${normalizeKey(processName)}`
    const changeDetails = [
      ...fieldChanges(finding),
      ...workCenterRateChanges(comparison, referenceStep, currentStep, referenceSnapshot, currentSnapshot)
    ]

    candidates.push({
      candidateKey,
      candidateName: processName.trim() || 'Unnamed Process',
      category: 'Process / Routing',
      status: status as PrioritizationStatus,
      referenceCost: finding.costEffect.reference.total,
      currentCost: finding.costEffect.current.total,
      costGap: finding.costEffect.gap.total,
      controllable: controllabilityMap?.[candidateKey] ?? true,
      rank: 0,
      sourceType: 'process',
      sourceId,
      sourceRef: currentStep?.sourceRef ?? referenceStep?.sourceRef,
      confidence: finding.confidence,
      changeDetails: changeDetails.length ? changeDetails : undefined,
      processBreakdown: {
        reference: processDetailsForSide(referenceSnapshot, processName, 'reference'),
        current: processDetailsForSide(currentSnapshot, processName, 'current')
      }
    })
  }

  return candidates
}
