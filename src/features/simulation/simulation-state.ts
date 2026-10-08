import type { CostSnapshot, MasterDataRole } from '../../core/types'
import {
  createEconomicSimulationDraft,
  updateEconomicSimulationDraft,
  type EconomicSimulationDraft,
  type EconomicSimulationField
} from './simulation-economics'

export type SimulationSources = Record<MasterDataRole, CostSnapshot>
export const SIMULATION_FACTORS = [
  'bom.price', 'bom.consumption', 'bom.loss',
  'routing.manning', 'routing.capacity', 'routing.yield'
] as const
export type SimulationFactor = typeof SIMULATION_FACTORS[number]

export interface SimulationWorkspaceState {
  sourceRole: MasterDataRole | null
  basisFingerprint: string | null
  snapshot: CostSnapshot | null
  startedAt: string | null
  selectedFactors: SimulationFactor[]
  economicInputs: EconomicSimulationDraft
}

const MASTER_DATA_ROLES: MasterDataRole[] = ['reference', 'current', 'custom']

export function createEmptySimulationState(): SimulationWorkspaceState {
  return {
    sourceRole: null,
    basisFingerprint: null,
    snapshot: null,
    startedAt: null,
    selectedFactors: [],
    economicInputs: createEconomicSimulationDraft()
  }
}

export function simulationBasisFingerprint(sourceRole: MasterDataRole, sources: SimulationSources): string {
  return JSON.stringify([sourceRole, sources[sourceRole], sources.current])
}

export function startSimulationFrom(
  sourceRole: MasterDataRole,
  sources: SimulationSources,
  now = new Date().toISOString()
): SimulationWorkspaceState {
  return {
    sourceRole,
    basisFingerprint: simulationBasisFingerprint(sourceRole, sources),
    snapshot: structuredClone(sources[sourceRole]),
    startedAt: now,
    selectedFactors: [],
    economicInputs: createEconomicSimulationDraft()
  }
}

export function reconcileSimulationState(
  state: SimulationWorkspaceState | undefined,
  sources: SimulationSources
): SimulationWorkspaceState {
  if (!state) return createEmptySimulationState()

  const selectedFactors = [...new Set((Array.isArray(state.selectedFactors) ? state.selectedFactors : [])
    .filter((factor): factor is SimulationFactor => SIMULATION_FACTORS.includes(factor as SimulationFactor)))]
  const storedInputs = state.economicInputs
  const economicInputs: EconomicSimulationDraft = {
    actionCost: typeof storedInputs?.actionCost === 'string' ? storedInputs.actionCost : '',
    evaluationQuantity: typeof storedInputs?.evaluationQuantity === 'string' ? storedInputs.evaluationQuantity : '',
    sellingPriceOverride: typeof storedInputs?.sellingPriceOverride === 'string' ? storedInputs.sellingPriceOverride : '',
    sgaPercentOverride: typeof storedInputs?.sgaPercentOverride === 'string' ? storedInputs.sgaPercentOverride : ''
  }

  if (!state.sourceRole && !state.snapshot && !state.basisFingerprint && !state.startedAt) {
    const factorsUnchanged = selectedFactors.length === state.selectedFactors?.length
      && selectedFactors.every((factor, index) => factor === state.selectedFactors?.[index])
    const inputsUnchanged = Object.keys(economicInputs).every(key =>
      economicInputs[key as EconomicSimulationField] === storedInputs?.[key as EconomicSimulationField])
    return factorsUnchanged && inputsUnchanged
      ? state
      : { ...createEmptySimulationState(), selectedFactors, economicInputs }
  }
  if (!state.sourceRole || !MASTER_DATA_ROLES.includes(state.sourceRole) || !state.snapshot || !state.basisFingerprint) return createEmptySimulationState()
  if (simulationBasisFingerprint(state.sourceRole, sources) !== state.basisFingerprint) return createEmptySimulationState()
  const factorsUnchanged = selectedFactors.length === state.selectedFactors?.length
    && selectedFactors.every((factor, index) => factor === state.selectedFactors?.[index])
  const inputsUnchanged = Object.keys(economicInputs).every(key =>
    economicInputs[key as EconomicSimulationField] === storedInputs?.[key as EconomicSimulationField])
  return factorsUnchanged && inputsUnchanged ? state : { ...state, selectedFactors, economicInputs }
}

export function setSimulationFactors(
  state: SimulationWorkspaceState,
  factors: SimulationFactor[]
): SimulationWorkspaceState {
  if (!state.snapshot) return state
  const selectedFactors = [...new Set(factors.filter(factor => SIMULATION_FACTORS.includes(factor)))]
  if (selectedFactors.length === state.selectedFactors.length
    && selectedFactors.every((factor, index) => factor === state.selectedFactors[index])) return state
  return { ...state, selectedFactors }
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
