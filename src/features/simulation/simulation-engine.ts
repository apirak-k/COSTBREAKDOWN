import { compareSnapshots } from '../../core'
import { exactDecimalNumberText, exactDecimalToNumber, exactDecimalToString, multiplyExactDecimals, parseExactDecimal, subtractExactDecimals } from '../../core/utils/exact-decimal'
import { areNumericValuesEquivalent } from '../../shared/ui/numeric-display'
import { isMasterDataNumericValueValid, type MasterDataNumericField } from '../../core/utils/master-data-validation'
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
  getEffectiveSimulationDataset,
  type SimulationSources,
  type SimulationParameter,
  type SimulationParameterExactInputs,
  type SimulationWorkspaceState
} from './simulation-state'

export type SimulationRecordKind = 'bom' | 'routing'
export type SimulationRecordStatus = 'UNCHANGED' | 'CHANGED' | 'ADDED' | 'REMOVED'
export type SimulationIdentityIssue = Extract<MatchStatus, 'ambiguous' | 'unmatched'>

export interface SimulationComparisonRow {
  kind: SimulationRecordKind
  name: string
  beforeRecordId?: string
  afterRecordId?: string
  status: SimulationRecordStatus | null
  identityIssue: SimulationIdentityIssue | null
}

export interface ParameterSimulationResult {
  comparison: CostComparison
  records: SimulationComparisonRow[]
  beforeCost: SnapshotCost
  afterCost: SnapshotCost
  parameterSavingPerPiece: number | null
  parameterSavingExact: string | null
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
      beforeRecordId: finding.referenceId,
      afterRecordId: finding.currentId,
      status: simulationStatus(finding),
      identityIssue
    }
  })
}

export function calculateParameterSimulation(
  beforeSnapshot: CostSnapshot,
  afterSnapshot: CostSnapshot
): ParameterSimulationResult {
  const comparison = compareSnapshots(beforeSnapshot, afterSnapshot)
  const beforeCost = comparison.referenceCost
  const afterCost = comparison.currentCost
  const beforeTotalExact = beforeCost.exactValues?.total ?? (beforeCost.total === null ? null : String(beforeCost.total))
  const afterTotalExact = afterCost.exactValues?.total ?? (afterCost.total === null ? null : String(afterCost.total))
  const parameterSavingDecimal = beforeTotalExact !== null && afterTotalExact !== null
    ? subtractExactDecimals(parseExactDecimal(beforeTotalExact)!, parseExactDecimal(afterTotalExact)!)
    : null
  const parameterSavingExact = parameterSavingDecimal ? exactDecimalToString(parameterSavingDecimal) : null
  const parameterSavingPerPiece = parameterSavingDecimal ? exactDecimalToNumber(parameterSavingDecimal) : null

  return {
    comparison,
    records: [
      ...comparisonRows('bom', comparison.bomFindings, beforeSnapshot.bom, afterSnapshot.bom),
      ...comparisonRows('routing', comparison.routingFindings, beforeSnapshot.routing, afterSnapshot.routing)
    ],
    beforeCost,
    afterCost,
    parameterSavingPerPiece,
    parameterSavingExact
  }
}

const PARAMETER_FIELDS: Record<SimulationParameter, { kind: SimulationRecordKind; field: MasterDataNumericField }> = {
  'bom.price': { kind: 'bom', field: 'price' },
  'bom.consumption': { kind: 'bom', field: 'consumption' },
  'bom.loss': { kind: 'bom', field: 'loss' },
  'routing.manning': { kind: 'routing', field: 'manning' },
  'routing.capacity': { kind: 'routing', field: 'capacity' },
  'routing.yield': { kind: 'routing', field: 'yield' }
}

function exactInputForStoredValue(parameter: SimulationParameter, value: number | null): string {
  if (value === null) return ''
  const exactValue = parseExactDecimal(exactDecimalNumberText(value) ?? value) ?? parseExactDecimal(value)!
  return parameter === 'bom.loss' || parameter === 'routing.yield'
    ? exactDecimalToString(multiplyExactDecimals(exactValue, parseExactDecimal(100)!))
    : exactDecimalToString(exactValue)
}

export function isSimulationParameterInputValid(parameter: SimulationParameter, value: number | null): boolean {
  const field = PARAMETER_FIELDS[parameter]?.field
  return field !== undefined && isMasterDataNumericValueValid(field, value)
}

export function updateSimulationParameter(
  state: SimulationWorkspaceState,
  sources: SimulationSources,
  simulationRecordId: string,
  parameter: SimulationParameter,
  value: number | null,
  role = state.activeDataset,
  exactValue?: string | null
): SimulationWorkspaceState {
  const configuration = PARAMETER_FIELDS[parameter]
  if (!configuration || !isSimulationParameterInputValid(parameter, value)) return state

  const dataset = getEffectiveSimulationDataset(sources, state, role)
  const records = configuration.kind === 'bom' ? dataset.snapshot.bom : dataset.snapshot.routing
  const baselineRecords = configuration.kind === 'bom' ? dataset.baselineSnapshot.bom : dataset.baselineSnapshot.routing
  const matches = records.filter(record => record.id === simulationRecordId)
  const baselineMatches = baselineRecords.filter(record => record.id === simulationRecordId)
  if (matches.length !== 1 || baselineMatches.length !== 1) return state

  const row = calculateParameterSimulation(dataset.baselineSnapshot, dataset.snapshot).records
    .find(record => record.kind === configuration.kind && record.afterRecordId === simulationRecordId)
  if (!row || !row.status || row.status === 'REMOVED' || row.identityIssue) return state

  const currentValue = (matches[0] as unknown as Record<string, unknown>)[configuration.field] as number | null | undefined
  const baselineValue = (baselineMatches[0] as unknown as Record<string, unknown>)[configuration.field] as number | null | undefined
  const exactDecimalInputs: SimulationParameterExactInputs = { ...(dataset.exactDecimalInputs ?? {}) }
  const parameterExactInputs = { ...(exactDecimalInputs[parameter] ?? {}) }
  const previousExactValue = parameterExactInputs[simulationRecordId]
  const numericChanged = !areNumericValuesEquivalent(currentValue, value)
  if (exactValue !== undefined) {
    if (exactValue === null) delete parameterExactInputs[simulationRecordId]
    else parameterExactInputs[simulationRecordId] = exactValue
  } else if (numericChanged) {
    parameterExactInputs[simulationRecordId] = exactInputForStoredValue(parameter, value)
  }
  const nextExactValue = exactValue === null ? undefined : exactValue
  const exactValueChanged = exactValue !== undefined
    ? previousExactValue !== nextExactValue
    : numericChanged && previousExactValue !== exactInputForStoredValue(parameter, value)
  if (Object.keys(parameterExactInputs).length) exactDecimalInputs[parameter] = parameterExactInputs
  else delete exactDecimalInputs[parameter]
  if (!numericChanged && !exactValueChanged) return state

  const parameterValues = { ...(dataset.parameterOverrides[parameter] ?? {}) }
  if (areNumericValuesEquivalent(baselineValue, value)) delete parameterValues[simulationRecordId]
  else parameterValues[simulationRecordId] = value
  const parameterOverrides = { ...dataset.parameterOverrides }
  if (Object.keys(parameterValues).length) parameterOverrides[parameter] = parameterValues
  else delete parameterOverrides[parameter]

  return {
    ...state,
    datasets: {
      ...state.datasets,
      [role]: {
        basisFingerprint: dataset.basisFingerprint,
        parameterOverrides,
        exactDecimalInputs,
        economicInputs: dataset.economicInputs,
        workingSelection: dataset.workingSelection
      }
    }
  }
}
