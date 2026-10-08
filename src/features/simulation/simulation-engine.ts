import { compareSnapshots, safeAdd } from '../../core'
import type {
  ComparisonFinding,
  CostComparison,
  CostSnapshot,
  MatchStatus,
  SnapshotCost,
  SnapshotBOMItem,
  SnapshotRoutingStep
} from '../../core/types'
import {
  simulationFactorId,
  type SimulationParameter,
  type SimulationWorkspaceState
} from './simulation-state'

export type SimulationRecordKind = 'bom' | 'routing'
export type SimulationRecordStatus = 'UNCHANGED' | 'CHANGED' | 'ADDED' | 'REMOVED'
export type SimulationIdentityIssue = Extract<MatchStatus, 'ambiguous' | 'unmatched'>

export interface SimulationComparisonRow {
  kind: SimulationRecordKind
  name: string
  currentRecordId?: string
  simulationRecordId?: string
  status: SimulationRecordStatus | null
  identityIssue: SimulationIdentityIssue | null
}

export interface ParameterSimulationResult {
  comparison: CostComparison
  records: SimulationComparisonRow[]
  currentCost: SnapshotCost
  simulationCost: SnapshotCost
  parameterSavingPerPiece: number | null
}

function simulationStatus(finding: ComparisonFinding): SimulationRecordStatus | null {
  if (finding.matchStatus === 'added') return 'ADDED'
  if (finding.matchStatus === 'removed') return 'REMOVED'
  if (finding.matchStatus !== 'matched') return null
  const changed = Object.keys(finding.fieldDiffs).length > 0 || Object.values(finding.changeFlags).some(Boolean)
  return changed ? 'CHANGED' : 'UNCHANGED'
}

function recordName(kind: SimulationRecordKind, simulationRow: SnapshotBOMItem | SnapshotRoutingStep | undefined, currentRow: SnapshotBOMItem | SnapshotRoutingStep | undefined): string {
  const row = simulationRow ?? currentRow
  if (!row) return '—'
  return kind === 'bom'
    ? (row as SnapshotBOMItem).description || (row as SnapshotBOMItem).itemCode || '—'
    : (row as SnapshotRoutingStep).processName || '—'
}

function comparisonRows<T extends SnapshotBOMItem | SnapshotRoutingStep>(
  kind: SimulationRecordKind,
  findings: ComparisonFinding[],
  currentRows: T[],
  simulationRows: T[]
): SimulationComparisonRow[] {
  return findings.map(finding => {
    const currentRow = finding.referenceId ? currentRows.find(row => row.id === finding.referenceId) : undefined
    const simulationRow = finding.currentId ? simulationRows.find(row => row.id === finding.currentId) : undefined
    const identityIssue = finding.matchStatus === 'ambiguous' || finding.matchStatus === 'unmatched'
      ? finding.matchStatus
      : null
    return {
      kind,
      name: recordName(kind, simulationRow, currentRow),
      currentRecordId: finding.referenceId,
      simulationRecordId: finding.currentId,
      status: simulationStatus(finding),
      identityIssue
    }
  })
}

export function calculateParameterSimulation(
  currentSnapshot: CostSnapshot,
  simulationSnapshot: CostSnapshot
): ParameterSimulationResult {
  const comparison = compareSnapshots(currentSnapshot, simulationSnapshot)
  const currentCost = comparison.referenceCost
  const simulationCost = comparison.currentCost
  const parameterSavingPerPiece = currentCost.total !== null && simulationCost.total !== null
    ? safeAdd(currentCost.total, -simulationCost.total)
    : null

  return {
    comparison,
    records: [
      ...comparisonRows('bom', comparison.bomFindings, currentSnapshot.bom, simulationSnapshot.bom),
      ...comparisonRows('routing', comparison.routingFindings, currentSnapshot.routing, simulationSnapshot.routing)
    ],
    currentCost,
    simulationCost,
    parameterSavingPerPiece
  }
}

const PARAMETER_FIELDS: Record<SimulationParameter, { kind: SimulationRecordKind; field: string }> = {
  'bom.price': { kind: 'bom', field: 'price' },
  'bom.consumption': { kind: 'bom', field: 'consumption' },
  'bom.loss': { kind: 'bom', field: 'loss' },
  'routing.manning': { kind: 'routing', field: 'manning' },
  'routing.capacity': { kind: 'routing', field: 'capacity' },
  'routing.yield': { kind: 'routing', field: 'yield' }
}

export function updateSimulationParameter(
  state: SimulationWorkspaceState,
  currentSnapshot: CostSnapshot,
  simulationRecordId: string,
  parameter: SimulationParameter,
  value: number | null
): SimulationWorkspaceState {
  const configuration = PARAMETER_FIELDS[parameter]
  if (!configuration || !state.snapshot
    || !state.selectedFactors.includes(simulationFactorId(configuration.kind, simulationRecordId))
    || (value !== null && !Number.isFinite(value))) return state

  const row = calculateParameterSimulation(currentSnapshot, state.snapshot).records
    .find(record => record.kind === configuration.kind && record.simulationRecordId === simulationRecordId)
  if (!row || !row.status || row.status === 'REMOVED' || row.identityIssue) return state

  if (configuration.kind === 'bom') {
    const matches = state.snapshot.bom.filter(item => item.id === simulationRecordId).length
    if (matches !== 1) return state
    return {
      ...state,
      snapshot: {
        ...state.snapshot,
        bom: state.snapshot.bom.map(item => item.id === simulationRecordId
          ? { ...item, [configuration.field]: value }
          : item)
      }
    }
  }

  const matches = state.snapshot.routing.filter(step => step.id === simulationRecordId).length
  if (matches !== 1) return state
  return {
    ...state,
    snapshot: {
      ...state.snapshot,
      routing: state.snapshot.routing.map(step => step.id === simulationRecordId
        ? { ...step, [configuration.field]: value }
        : step)
    }
  }
}
