import type {
  CostComparison,
  PrioritizationCandidate,
  SnapshotBOMItem,
  SnapshotPair,
  SnapshotRoutingStep,
  SnapshotWorkCenterRate
} from '../../../core'

export type CandidateParameterData =
  | {
      type: 'bom'
      reference: SnapshotBOMItem | null
      current: SnapshotBOMItem | null
    }
  | {
      type: 'process'
      reference: SnapshotRoutingStep | null
      current: SnapshotRoutingStep | null
      referenceRate: SnapshotWorkCenterRate | null
      currentRate: SnapshotWorkCenterRate | null
    }

export function getCandidateViewKey(candidate: PrioritizationCandidate): string {
  return JSON.stringify([
    candidate.candidateKey,
    candidate.sourceType,
    candidate.status,
    candidate.sourceId
  ])
}

function normalizeIdentity(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase() ?? ''
}

function getRateForStep(
  step: SnapshotRoutingStep | null,
  rates: SnapshotWorkCenterRate[]
): SnapshotWorkCenterRate | null {
  const workCenterKey = normalizeIdentity(step?.workCenterId)
  if (!workCenterKey) return null

  const matches = rates.filter(rate => normalizeIdentity(rate.workCenterCode) === workCenterKey)
  return matches.length === 1 ? matches[0] : null
}

export function resolveCandidateParameterData(
  candidate: PrioritizationCandidate,
  comparison: CostComparison,
  snapshotPair: SnapshotPair
): CandidateParameterData {
  const findings = (candidate.sourceType === 'bom'
    ? comparison.bomFindings
    : comparison.routingFindings) ?? []
  const preferredSide = candidate.status === 'REMOVED' ? 'referenceId' : 'currentId'
  const alternateSide = preferredSide === 'referenceId' ? 'currentId' : 'referenceId'
  const finding = findings.find(item => item[preferredSide] === candidate.sourceId)
    ?? findings.find(item => item[alternateSide] === candidate.sourceId)

  if (candidate.sourceType === 'bom') {
    return {
      type: 'bom',
      reference: finding?.referenceId
        ? snapshotPair.reference.bom.find(item => item.id === finding.referenceId) ?? null
        : null,
      current: finding?.currentId
        ? snapshotPair.current.bom.find(item => item.id === finding.currentId) ?? null
        : null
    }
  }

  const reference = finding?.referenceId
    ? snapshotPair.reference.routing.find(step => step.id === finding.referenceId) ?? null
    : null
  const current = finding?.currentId
    ? snapshotPair.current.routing.find(step => step.id === finding.currentId) ?? null
    : null

  return {
    type: 'process',
    reference,
    current,
    referenceRate: getRateForStep(reference, snapshotPair.reference.rates),
    currentRate: getRateForStep(current, snapshotPair.current.rates)
  }
}
