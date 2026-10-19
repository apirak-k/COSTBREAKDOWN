import type { CostSnapshot, MasterDataRole } from '../../core/types'
import { calculateParameterSimulation, isSimulationParameterInputValid } from './simulation-engine'
import {
  createEconomicSimulationDraft,
  isEconomicSimulationInputValid,
  updateEconomicSimulationDraft,
  type EconomicSimulationDraft,
  type EconomicSimulationField
} from './simulation-economics'

export type SimulationSources = Record<MasterDataRole, CostSnapshot>

export const SIMULATION_PARAMETERS = [
  'bom.price', 'bom.consumption', 'bom.loss',
  'routing.manning', 'routing.capacity', 'routing.yield'
] as const
export type SimulationParameter = typeof SIMULATION_PARAMETERS[number]

export type SimulationParameterOverrides = Partial<Record<SimulationParameter, Record<string, number | null>>>

export interface SimulationDatasetState {
  basisFingerprint: string
  parameterOverrides: SimulationParameterOverrides
  economicInputs: EconomicSimulationDraft
  workingSelection: string[]
}

export interface SimulationWorkspaceState {
  schemaVersion: 2
  activeDataset: MasterDataRole
  comparisonBefore: MasterDataRole
  comparisonAfter: MasterDataRole
  datasets: Record<MasterDataRole, SimulationDatasetState>
}

export interface SimulationDatasetView extends SimulationDatasetState {
  role: MasterDataRole
  snapshot: CostSnapshot
  baselineSnapshot: CostSnapshot
}

const MASTER_DATA_ROLES: MasterDataRole[] = ['reference', 'current', 'custom']
const PARAMETER_FIELDS: Record<SimulationParameter, { kind: 'bom' | 'routing'; field: string }> = {
  'bom.price': { kind: 'bom', field: 'price' },
  'bom.consumption': { kind: 'bom', field: 'consumption' },
  'bom.loss': { kind: 'bom', field: 'loss' },
  'routing.manning': { kind: 'routing', field: 'manning' },
  'routing.capacity': { kind: 'routing', field: 'capacity' },
  'routing.yield': { kind: 'routing', field: 'yield' }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMasterDataRole(value: unknown): value is MasterDataRole {
  return typeof value === 'string' && MASTER_DATA_ROLES.includes(value as MasterDataRole)
}

export function createEmptySimulationState(sources: SimulationSources): SimulationWorkspaceState {
  return {
    schemaVersion: 2,
    activeDataset: 'current',
    comparisonBefore: 'reference',
    comparisonAfter: 'current',
    datasets: {
      reference: createEmptyDataset('reference', sources),
      current: createEmptyDataset('current', sources),
      custom: createEmptyDataset('custom', sources)
    }
  }
}

function createEmptyDataset(role: MasterDataRole, sources: SimulationSources): SimulationDatasetState {
  return {
    basisFingerprint: simulationBasisFingerprint(role, sources),
    parameterOverrides: {},
    economicInputs: createEconomicSimulationDraft(sources[role]),
    workingSelection: []
  }
}

export function simulationBasisFingerprint(role: MasterDataRole, sources: SimulationSources): string {
  return JSON.stringify(sources[role])
}

export function getEffectiveSimulationDataset(
  sources: SimulationSources,
  state: SimulationWorkspaceState,
  role: MasterDataRole
): SimulationDatasetView {
  const stored = state.datasets[role]
  const dataset = stored?.basisFingerprint === simulationBasisFingerprint(role, sources)
    ? {
        ...stored,
        parameterOverrides: normalizeParameterOverrides(stored.parameterOverrides, sources[role])
      }
    : createEmptyDataset(role, sources)
  return {
    ...dataset,
    role,
    snapshot: applyParameterOverrides(sources[role], dataset.parameterOverrides),
    baselineSnapshot: sources[role]
  }
}

export function getActiveSimulationDataset(
  sources: SimulationSources,
  state: SimulationWorkspaceState
): SimulationDatasetView {
  return getEffectiveSimulationDataset(sources, state, state.activeDataset)
}

export function setSimulationActiveDataset(
  state: SimulationWorkspaceState,
  role: MasterDataRole
): SimulationWorkspaceState {
  return isMasterDataRole(role) && state.activeDataset !== role ? { ...state, activeDataset: role } : state
}

export function setSimulationComparison(
  state: SimulationWorkspaceState,
  before: MasterDataRole,
  after: MasterDataRole
): SimulationWorkspaceState {
  return isMasterDataRole(before) && isMasterDataRole(after)
    && (state.comparisonBefore !== before || state.comparisonAfter !== after)
    ? { ...state, comparisonBefore: before, comparisonAfter: after }
    : state
}

export function prepareSimulationSend(
  state: SimulationWorkspaceState,
  sources: SimulationSources
): { role: MasterDataRole; snapshot: CostSnapshot } {
  const active = getActiveSimulationDataset(sources, state)
  return { role: active.role, snapshot: active.snapshot }
}

export function prepareSimulationSendAll(
  state: SimulationWorkspaceState,
  sources: SimulationSources
): Record<MasterDataRole, CostSnapshot> {
  return Object.fromEntries(MASTER_DATA_ROLES.map(role => [
    role,
    getEffectiveSimulationDataset(sources, state, role).snapshot
  ])) as Record<MasterDataRole, CostSnapshot>
}

export function simulationWorkingTargetKey(kind: 'bom' | 'routing', recordId: string): string {
  return `${kind}:${recordId}`
}

export function simulationParameterStatus(
  kind: 'bom' | 'routing',
  recordId: string,
  snapshot: CostSnapshot,
  baseline: CostSnapshot | null
): 'CHANGED' | 'UNCHANGED' | null {
  const records = kind === 'bom' ? snapshot.bom : snapshot.routing
  const baselineRecords = kind === 'bom' ? baseline?.bom : baseline?.routing
  const matches = records.filter(record => record.id === recordId)
  const baselineMatches = baselineRecords?.filter(record => record.id === recordId) ?? []
  if (matches.length !== 1 || baselineMatches.length !== 1) return null
  const fields = kind === 'bom' ? ['price', 'consumption', 'loss'] as const : ['manning', 'capacity', 'yield'] as const
  return fields.every(field =>
    matches[0][field as keyof typeof matches[0]] === baselineMatches[0][field as keyof typeof baselineMatches[0]])
    ? 'UNCHANGED' : 'CHANGED'
}

export function toggleSimulationWorkingTarget(
  state: SimulationWorkspaceState,
  sources: SimulationSources,
  kind: 'bom' | 'routing',
  recordId: string,
  role = state.activeDataset
): SimulationWorkspaceState {
  if (!recordId || !isMasterDataRole(role)) return state
  const dataset = getEffectiveSimulationDataset(sources, state, role)
  const records = kind === 'bom' ? dataset.snapshot.bom : dataset.snapshot.routing
  if (records.filter(record => record.id === recordId).length !== 1) return state
  if (!selectableSimulationTargetKeys(dataset.baselineSnapshot, dataset.snapshot).has(simulationWorkingTargetKey(kind, recordId))) return state

  const selection = new Set(dataset.workingSelection)
  const targetKey = simulationWorkingTargetKey(kind, recordId)
  if (selection.has(targetKey)) selection.delete(targetKey)
  else selection.add(targetKey)
  const workingSelection = [...selection]
  if (workingSelection.length === dataset.workingSelection.length
    && workingSelection.every((value, index) => value === dataset.workingSelection[index])) return state
  return { ...state, datasets: { ...state.datasets, [role]: { ...toDatasetState(dataset), workingSelection } } }
}

function selectableSimulationTargetKeys(baseline: CostSnapshot, snapshot: CostSnapshot): Set<string> {
  const rows = calculateParameterSimulation(baseline, snapshot).records
  return new Set(rows.flatMap(row => {
    if (!row.afterRecordId || row.identityIssue !== null
      || !['UNCHANGED', 'CHANGED', 'ADDED'].includes(row.status ?? '')) return []
    const records = row.kind === 'bom' ? snapshot.bom : snapshot.routing
    return records.filter(record => record.id === row.afterRecordId).length === 1
      ? [simulationWorkingTargetKey(row.kind, row.afterRecordId)]
      : []
  }))
}

export function setSimulationEconomicInput(
  state: SimulationWorkspaceState,
  field: EconomicSimulationField,
  value: string,
  role = state.activeDataset
): SimulationWorkspaceState {
  if (!isMasterDataRole(role)) return state
  const dataset = state.datasets[role]
  if (!dataset) return state
  const economicInputs = updateEconomicSimulationDraft(dataset.economicInputs, field, value)
  if (economicInputs === dataset.economicInputs) return state
  return { ...state, datasets: { ...state.datasets, [role]: { ...dataset, economicInputs } } }
}

export function resetSimulationParameters(
  state: SimulationWorkspaceState,
  sources: SimulationSources
): SimulationWorkspaceState {
  return resetSimulationDataset(state, sources, state.activeDataset)
}

export function resetAllSimulationParameters(
  state: SimulationWorkspaceState,
  sources: SimulationSources
): SimulationWorkspaceState {
  const datasets = Object.fromEntries(MASTER_DATA_ROLES.map(role => [
    role,
    resetDataset(state.datasets[role], role, sources)
  ])) as Record<MasterDataRole, SimulationDatasetState>
  return MASTER_DATA_ROLES.every(role => datasets[role] === state.datasets[role])
    ? state
    : { ...state, datasets }
}

function resetSimulationDataset(
  state: SimulationWorkspaceState,
  sources: SimulationSources,
  role: MasterDataRole
): SimulationWorkspaceState {
  const dataset = resetDataset(state.datasets[role], role, sources)
  return dataset === state.datasets[role] ? state : { ...state, datasets: { ...state.datasets, [role]: dataset } }
}

function resetDataset(
  dataset: SimulationDatasetState,
  role: MasterDataRole,
  sources: SimulationSources
): SimulationDatasetState {
  const fresh = createEmptyDataset(role, sources)
  const sameBasis = dataset?.basisFingerprint === fresh.basisFingerprint
  const next = sameBasis
    ? { ...fresh, economicInputs: dataset.economicInputs, workingSelection: dataset.workingSelection }
    : fresh
  return dataset && JSON.stringify(dataset) === JSON.stringify(next) ? dataset : next
}

function toDatasetState(dataset: SimulationDatasetView): SimulationDatasetState {
  return {
    basisFingerprint: dataset.basisFingerprint,
    parameterOverrides: dataset.parameterOverrides,
    economicInputs: dataset.economicInputs,
    workingSelection: dataset.workingSelection
  }
}

export function reconcileSimulationState(
  state: unknown,
  sources: SimulationSources
): SimulationWorkspaceState {
  if (!isRecord(state)) return createEmptySimulationState(sources)
  if (Object.prototype.hasOwnProperty.call(state, 'schemaVersion')) {
    if (state.schemaVersion !== 2) return createEmptySimulationState(sources)
  } else {
    return reconcileVersionlessSimulationState(state, sources)
  }
  const storedDatasets = state.datasets
  if (!isRecord(storedDatasets)) return createEmptySimulationState(sources)

  const datasets = Object.fromEntries(MASTER_DATA_ROLES.map(role => [
    role,
    reconcileDataset(storedDatasets[role], role, sources)
  ])) as Record<MasterDataRole, SimulationDatasetState>
  const reconciled: SimulationWorkspaceState = {
    schemaVersion: 2,
    activeDataset: isMasterDataRole(state.activeDataset) ? state.activeDataset : 'current',
    comparisonBefore: isMasterDataRole(state.comparisonBefore) ? state.comparisonBefore : 'reference',
    comparisonAfter: isMasterDataRole(state.comparisonAfter) ? state.comparisonAfter : 'current',
    datasets
  }
  return JSON.stringify(reconciled) === JSON.stringify(state) ? state as unknown as SimulationWorkspaceState : reconciled
}

function reconcileDataset(value: unknown, role: MasterDataRole, sources: SimulationSources): SimulationDatasetState {
  const fresh = createEmptyDataset(role, sources)
  if (!isRecord(value) || value.basisFingerprint !== fresh.basisFingerprint) return fresh

  const parameterOverrides = normalizeParameterOverrides(value.parameterOverrides, sources[role])
  const snapshot = applyParameterOverrides(sources[role], parameterOverrides)
  const selection = Array.isArray(value.workingSelection)
    ? [...new Set(value.workingSelection.filter((item): item is string => typeof item === 'string'))]
    : []
  const eligibleKeys = selectableSimulationTargetKeys(sources[role], snapshot)
  const workingSelection = selection.filter(key => eligibleKeys.has(key))
  return {
    basisFingerprint: fresh.basisFingerprint,
    parameterOverrides,
    economicInputs: normalizeEconomicInputs(value.economicInputs, sources[role]),
    workingSelection
  }
}

function normalizeEconomicInputs(
  value: unknown,
  source: CostSnapshot,
  legacyAliases = false
): EconomicSimulationDraft {
  const stored = isRecord(value) ? value : {}
  const defaults = createEconomicSimulationDraft(source)
  const read = (field: EconomicSimulationField, alias?: string): string => {
    const candidate = typeof stored[field] === 'string'
      ? stored[field] as string
      : legacyAliases && alias && typeof stored[alias] === 'string'
        ? stored[alias] as string
        : defaults[field]
    if (!isEconomicSimulationInputValid(field, candidate)) return defaults[field]
    return candidate.trim() === '' ? '' : candidate
  }
  return {
    fixedActionCost: read('fixedActionCost', 'actionCost'),
    variableActionCostPerPiece: read('variableActionCostPerPiece'),
    batchSize: read('batchSize', 'evaluationQuantity'),
    sellingPriceOverride: read('sellingPriceOverride'),
    sgaPercentOverride: read('sgaPercentOverride')
  }
}

function normalizeParameterOverrides(value: unknown, baseline: CostSnapshot): SimulationParameterOverrides {
  if (!isRecord(value)) return {}
  const result: SimulationParameterOverrides = {}
  for (const parameter of SIMULATION_PARAMETERS) {
    const entries = value[parameter]
    if (!isRecord(entries)) continue
    const { kind, field } = PARAMETER_FIELDS[parameter]
    const rows = kind === 'bom' ? baseline.bom : baseline.routing
    const valid: Record<string, number | null> = {}
    for (const [recordId, candidate] of Object.entries(entries)) {
      const matches = rows.filter(row => row.id === recordId)
      if (!recordId || matches.length !== 1 || (candidate !== null && typeof candidate !== 'number')) continue
      if (!isSimulationParameterInputValid(parameter, candidate as number | null)) continue
      if (Object.is((matches[0] as unknown as Record<string, unknown>)[field], candidate)) continue
      valid[recordId] = candidate as number | null
    }
    if (Object.keys(valid).length) result[parameter] = valid
  }
  return result
}

function applyParameterOverrides(baseline: CostSnapshot, overrides: SimulationParameterOverrides): CostSnapshot {
  const snapshot = structuredClone(baseline)
  for (const parameter of SIMULATION_PARAMETERS) {
    const { kind, field } = PARAMETER_FIELDS[parameter]
    const values = overrides[parameter]
    if (!values) continue
    if (kind === 'bom') {
      snapshot.bom = snapshot.bom.map(row => Object.prototype.hasOwnProperty.call(values, row.id)
        ? { ...row, [field]: values[row.id] }
        : row)
    } else {
      snapshot.routing = snapshot.routing.map(row => Object.prototype.hasOwnProperty.call(values, row.id)
        ? { ...row, [field]: values[row.id] }
        : row)
    }
  }
  return snapshot
}

function reconcileVersionlessSimulationState(
  state: Record<string, unknown>,
  sources: SimulationSources
): SimulationWorkspaceState {
  if (state.sourceRole !== 'current'
    || state.basisFingerprint !== simulationBasisFingerprint('current', sources)
    || !isRecord(state.snapshot)
    || !isRecord(state.resetBaselineSnapshot)
    || JSON.stringify(state.resetBaselineSnapshot) !== JSON.stringify(sources.current)) {
    return createEmptySimulationState(sources)
  }

  const parameterOverrides = deriveLegacyOverrides(state.snapshot, sources.current)
  if (!parameterOverrides) return createEmptySimulationState(sources)
  const effective = applyParameterOverrides(sources.current, parameterOverrides)
  const legacy = createEmptySimulationState(sources)
  const economicInputs = normalizeEconomicInputs(state.economicInputs, sources.current, true)
  const selection = Array.isArray(state.workingSelection)
    ? [...new Set(state.workingSelection.filter((item): item is string => typeof item === 'string'))]
    : []
  const eligibleKeys = selectableSimulationTargetKeys(sources.current, effective)
  return {
    ...legacy,
    datasets: {
      ...legacy.datasets,
      current: {
        ...legacy.datasets.current,
        parameterOverrides,
        economicInputs,
        workingSelection: selection.filter(key => eligibleKeys.has(key))
      }
    }
  }
}

function deriveLegacyOverrides(snapshotValue: Record<string, unknown>, baseline: CostSnapshot): SimulationParameterOverrides | null {
  let restored: CostSnapshot
  try {
    restored = structuredClone(snapshotValue) as unknown as CostSnapshot
  } catch {
    return null
  }
  if (!Array.isArray(restored.bom) || !Array.isArray(restored.routing)
    || restored.bom.length !== baseline.bom.length || restored.routing.length !== baseline.routing.length) return null

  const overrides: SimulationParameterOverrides = {}
  for (const parameter of SIMULATION_PARAMETERS) {
    const { kind, field } = PARAMETER_FIELDS[parameter]
    const rows = kind === 'bom' ? restored.bom : restored.routing
    const baseRows = kind === 'bom' ? baseline.bom : baseline.routing
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index] as unknown as Record<string, unknown>
      const base = baseRows[index] as unknown as Record<string, unknown>
      if (!row || !base || row.id !== base.id || typeof row.id !== 'string') return null
      const value = row[field]
      if (Object.is(value, base[field])) continue
      if (value !== null && typeof value !== 'number') return null
      if (!isSimulationParameterInputValid(parameter, value as number | null)) return null
      const parameterValues = overrides[parameter] ?? (overrides[parameter] = {})
      parameterValues[row.id] = value as number | null
      row[field] = base[field]
    }
  }
  return JSON.stringify(restored) === JSON.stringify(baseline) ? overrides : null
}

export function retainSimulationStatesForProducts(
  states: Record<string, SimulationWorkspaceState>,
  liveProductIds: ReadonlySet<string>
): Record<string, SimulationWorkspaceState> {
  const retained = Object.fromEntries(Object.entries(states).filter(([id]) => liveProductIds.has(id)))
  return Object.keys(retained).length === Object.keys(states).length ? states : retained
}
