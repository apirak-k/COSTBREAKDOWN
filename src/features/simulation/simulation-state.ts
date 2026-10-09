import type { CostSnapshot, MasterDataRole } from '../../core/types'
import {
  createEconomicSimulationDraft,
  updateEconomicSimulationDraft,
  type EconomicSimulationDraft,
  type EconomicSimulationField
} from './simulation-economics'

export type SimulationSources = Record<MasterDataRole, CostSnapshot>
export type SimulationFactorRecordKind = 'bom' | 'routing'

export const SIMULATION_PARAMETERS = [
  'bom.price', 'bom.consumption', 'bom.loss',
  'routing.manning', 'routing.capacity', 'routing.yield'
] as const
export type SimulationParameter = typeof SIMULATION_PARAMETERS[number]
export type SimulationFactor = `${SimulationFactorRecordKind}:${string}`

export function simulationFactorId(kind: SimulationFactorRecordKind, recordId: string): SimulationFactor {
  return `${kind}:${recordId}`
}

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
  now = new Date().toISOString(),
  economicInputs = createEconomicSimulationDraft()
): SimulationWorkspaceState {
  return {
    sourceRole,
    basisFingerprint: simulationBasisFingerprint(sourceRole, sources),
    snapshot: structuredClone(sources[sourceRole]),
    startedAt: now,
    selectedFactors: [],
    economicInputs: { ...economicInputs }
  }
}

function factorsAvailableInSnapshot(factors: unknown, snapshot: CostSnapshot | null): SimulationFactor[] {
  if (!snapshot || !Array.isArray(factors)) return []

  const uniqueIds = (ids: string[]) => {
    const counts = new Map<string, number>()
    ids.forEach(id => counts.set(id, (counts.get(id) ?? 0) + 1))
    return ids.filter(id => counts.get(id) === 1)
  }
  const availableFactors = new Set([
    ...uniqueIds(snapshot.bom.map(item => item.id)).map(id => simulationFactorId('bom', id)),
    ...uniqueIds(snapshot.routing.map(step => step.id)).map(id => simulationFactorId('routing', id))
  ])

  return [...new Set(factors.filter((factor): factor is SimulationFactor =>
    typeof factor === 'string' && availableFactors.has(factor as SimulationFactor)
  ))]
}

export function reconcileSimulationState(
  state: SimulationWorkspaceState | undefined,
  sources: SimulationSources
): SimulationWorkspaceState {
  if (!state) return createEmptySimulationState()

  const selectedFactors = factorsAvailableInSnapshot(state.selectedFactors, state.snapshot)
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

export function prepareSimulationForRcaHandoff(
  state: SimulationWorkspaceState | undefined,
  sources: SimulationSources
): SimulationWorkspaceState {
  const current = reconcileSimulationState(state, sources)
  return { ...createEmptySimulationState(), economicInputs: { ...current.economicInputs } }
}

export function setSimulationFactors(
  state: SimulationWorkspaceState,
  factors: SimulationFactor[]
): SimulationWorkspaceState {
  if (!state.snapshot) return state
  const selectedFactors = factorsAvailableInSnapshot(factors, state.snapshot)
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
