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
  startedAt: string | null
  economicInputs: EconomicSimulationDraft
}

const MASTER_DATA_ROLES: MasterDataRole[] = ['reference', 'current', 'custom']

export function createEmptySimulationState(): SimulationWorkspaceState {
  return {
    sourceRole: null,
    basisFingerprint: null,
    snapshot: null,
    startedAt: null,
    economicInputs: createEconomicSimulationDraft()
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
    startedAt: now,
    economicInputs: { ...economicInputs }
  }
}

export function reconcileSimulationState(
  state: SimulationWorkspaceState | undefined,
  sources: SimulationSources
): SimulationWorkspaceState {
  if (!state) return createEmptySimulationState()

  const persistedState = state as SimulationWorkspaceState & { selectedFactors?: unknown }
  const hasLegacyFactors = Object.prototype.hasOwnProperty.call(persistedState, 'selectedFactors')
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

  if (!state.sourceRole && !state.snapshot && !state.basisFingerprint && !state.startedAt) {
    const inputsUnchanged = Object.keys(economicInputs).every(key =>
      economicInputs[key as EconomicSimulationField] === storedInputs?.[key as EconomicSimulationField])
    return !hasLegacyFactors && inputsUnchanged
      ? state
      : { ...createEmptySimulationState(), economicInputs }
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
  const inputsUnchanged = Object.keys(economicInputs).every(key =>
    economicInputs[key as EconomicSimulationField] === storedInputs?.[key as EconomicSimulationField])
  return !hasLegacyFactors && inputsUnchanged && snapshot === state.snapshot
    ? state
    : { ...stateWithoutLegacyFactors, snapshot, economicInputs }
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
