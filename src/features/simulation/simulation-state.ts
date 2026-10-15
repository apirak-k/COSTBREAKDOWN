import type { CostSnapshot, MasterDataRole } from '../../core/types'
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

export interface SimulationWorkspaceState {
  sourceRole: MasterDataRole | null
  basisFingerprint: string | null
  snapshot: CostSnapshot | null
  resetBaselineSnapshot: CostSnapshot | null
  startedAt: string | null
  economicInputs: EconomicSimulationDraft
  workingSelection: string[]
}

const MASTER_DATA_ROLES: MasterDataRole[] = ['reference', 'current', 'custom']

export function createEmptySimulationState(): SimulationWorkspaceState {
  return {
    sourceRole: null,
    basisFingerprint: null,
    snapshot: null,
    resetBaselineSnapshot: null,
    startedAt: null,
    economicInputs: createEconomicSimulationDraft(),
    workingSelection: []
  }
}

export function simulationBasisFingerprint(_sourceRole: MasterDataRole, sources: SimulationSources): string {
  // The copied source is independent after cloning; only a changed Current baseline invalidates SIM.
  return JSON.stringify(sources.current)
}

export function startSimulationFrom(
  sourceRole: MasterDataRole,
  sources: SimulationSources,
  now = new Date().toISOString(),
  economicInputs = createEconomicSimulationDraft()
): SimulationWorkspaceState {
  const snapshot = structuredClone(sources[sourceRole])
  // Simulation changes process parameters with a fixed Current-rate context.
  snapshot.rates = structuredClone(sources.current.rates)
  return {
    sourceRole,
    basisFingerprint: simulationBasisFingerprint(sourceRole, sources),
    snapshot,
    resetBaselineSnapshot: structuredClone(snapshot),
    startedAt: now,
    economicInputs: { ...economicInputs },
    workingSelection: []
  }
}

export function simulationWorkingTargetKey(kind: 'bom' | 'routing', recordId: string): string {
  return `${kind}:${recordId}`
}

export function toggleSimulationWorkingTarget(
  state: SimulationWorkspaceState,
  kind: 'bom' | 'routing',
  recordId: string
): SimulationWorkspaceState {
  if (!state.snapshot || !recordId) return state
  const records = kind === 'bom' ? state.snapshot.bom : state.snapshot.routing
  if (records.filter(record => record.id === recordId).length !== 1) return state

  const targetKey = simulationWorkingTargetKey(kind, recordId)
  const selection = new Set(state.workingSelection)
  if (selection.has(targetKey)) selection.delete(targetKey)
  else selection.add(targetKey)
  const workingSelection = [...selection]
  return workingSelection.length === state.workingSelection.length
    && workingSelection.every((value, index) => value === state.workingSelection[index])
    ? state
    : { ...state, workingSelection }
}

export function reconcileSimulationState(
  state: SimulationWorkspaceState | undefined,
  sources: SimulationSources
): SimulationWorkspaceState {
  if (!state) return createEmptySimulationState()

  const persistedState = state as SimulationWorkspaceState & { selectedFactors?: unknown; workingSelection?: unknown }
  const hasLegacyFactors = Object.prototype.hasOwnProperty.call(persistedState, 'selectedFactors')
  const hasResetBaseline = Object.prototype.hasOwnProperty.call(persistedState, 'resetBaselineSnapshot')
  const hasWorkingSelection = Array.isArray(persistedState.workingSelection)
  const stateWithoutLegacyFactors = { ...persistedState }
  delete stateWithoutLegacyFactors.selectedFactors
  const storedInputs = state.economicInputs as Partial<EconomicSimulationDraft> & {
    actionCost?: unknown
    evaluationQuantity?: unknown
  }
  const economicValue = (field: EconomicSimulationField, currentValue: unknown, legacyValue?: unknown) => {
    const value = typeof currentValue === 'string'
      ? currentValue
      : typeof legacyValue === 'string' ? legacyValue : ''
    if (!isEconomicSimulationInputValid(field, value)) return ''
    return value.trim() === '' ? '' : value
  }
  const economicInputs: EconomicSimulationDraft = {
    fixedActionCost: economicValue('fixedActionCost', storedInputs?.fixedActionCost, storedInputs?.actionCost),
    variableActionCostPerPiece: economicValue('variableActionCostPerPiece', storedInputs?.variableActionCostPerPiece),
    batchSize: economicValue('batchSize', storedInputs?.batchSize, storedInputs?.evaluationQuantity),
    sellingPriceOverride: economicValue('sellingPriceOverride', storedInputs?.sellingPriceOverride),
    sgaPercentOverride: economicValue('sgaPercentOverride', storedInputs?.sgaPercentOverride)
  }
  const workingSelection = Array.isArray(persistedState.workingSelection)
    ? [...new Set(persistedState.workingSelection.filter((value): value is string => typeof value === 'string'))]
    : []

  if (!state.sourceRole && !state.snapshot && !state.basisFingerprint && !state.startedAt) {
    const inputsUnchanged = Object.keys(economicInputs).every(key =>
      economicInputs[key as EconomicSimulationField] === storedInputs?.[key as EconomicSimulationField])
    return !hasLegacyFactors && hasResetBaseline && hasWorkingSelection && workingSelection.length === 0 && inputsUnchanged
      ? state
      : { ...createEmptySimulationState(), economicInputs, workingSelection: [] }
  }
  if (!state.sourceRole || !MASTER_DATA_ROLES.includes(state.sourceRole) || !state.snapshot || !state.basisFingerprint) {
    return { ...createEmptySimulationState(), economicInputs }
  }
  if (simulationBasisFingerprint(state.sourceRole, sources) !== state.basisFingerprint) {
    return { ...createEmptySimulationState(), economicInputs }
  }
  const snapshot = state.snapshot.rates === sources.current.rates
    ? state.snapshot
    : JSON.stringify(state.snapshot.rates) === JSON.stringify(sources.current.rates)
      ? state.snapshot
      : { ...state.snapshot, rates: structuredClone(sources.current.rates) }
  const resetBaselineSnapshot = state.resetBaselineSnapshot
    ? state.resetBaselineSnapshot.rates === sources.current.rates
      ? state.resetBaselineSnapshot
      : JSON.stringify(state.resetBaselineSnapshot.rates) === JSON.stringify(sources.current.rates)
        ? state.resetBaselineSnapshot
        : { ...state.resetBaselineSnapshot, rates: structuredClone(sources.current.rates) }
    : structuredClone(snapshot)
  const validTargetKeys = new Set([
    ...snapshot.bom.map(record => simulationWorkingTargetKey('bom', record.id)),
    ...snapshot.routing.map(record => simulationWorkingTargetKey('routing', record.id))
  ])
  const normalizedWorkingSelection = workingSelection.filter(key => validTargetKeys.has(key))
  const inputsUnchanged = Object.keys(economicInputs).every(key =>
    economicInputs[key as EconomicSimulationField] === storedInputs?.[key as EconomicSimulationField])
  return !hasLegacyFactors && hasResetBaseline && hasWorkingSelection && inputsUnchanged && snapshot === state.snapshot && resetBaselineSnapshot === state.resetBaselineSnapshot
    && normalizedWorkingSelection.length === workingSelection.length
    ? state
    : { ...stateWithoutLegacyFactors, snapshot, resetBaselineSnapshot, economicInputs, workingSelection: normalizedWorkingSelection }
}

export function resetSimulationParameters(state: SimulationWorkspaceState): SimulationWorkspaceState {
  if (!state.snapshot || !state.resetBaselineSnapshot) return state
  if (JSON.stringify(state.snapshot) === JSON.stringify(state.resetBaselineSnapshot)) return state
  const snapshot = structuredClone(state.resetBaselineSnapshot)
  // Parameter Reset must not roll the locked WC rates back from the live Current context.
  snapshot.rates = structuredClone(state.snapshot.rates)
  return { ...state, snapshot }
}

export function setSimulationEconomicInput(
  state: SimulationWorkspaceState,
  field: EconomicSimulationField,
  value: string
): SimulationWorkspaceState {
  const economicInputs = updateEconomicSimulationDraft(state.economicInputs, field, value)
  return economicInputs === state.economicInputs ? state : { ...state, economicInputs }
}

export function retainSimulationStatesForProducts(
  states: Record<string, SimulationWorkspaceState>,
  liveProductIds: ReadonlySet<string>
): Record<string, SimulationWorkspaceState> {
  const retained = Object.fromEntries(Object.entries(states).filter(([id]) => liveProductIds.has(id)))
  return Object.keys(retained).length === Object.keys(states).length ? states : retained
}
