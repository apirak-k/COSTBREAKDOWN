import type { CostSnapshot, MasterDataRole } from '../../core/types'

export type SimulationSources = Record<MasterDataRole, CostSnapshot>

export interface SimulationWorkspaceState {
  sourceRole: MasterDataRole | null
  basisFingerprint: string | null
  snapshot: CostSnapshot | null
  startedAt: string | null
}

const MASTER_DATA_ROLES: MasterDataRole[] = ['reference', 'current', 'custom']

export function createEmptySimulationState(): SimulationWorkspaceState {
  return { sourceRole: null, basisFingerprint: null, snapshot: null, startedAt: null }
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
    startedAt: now
  }
}

export function reconcileSimulationState(
  state: SimulationWorkspaceState | undefined,
  sources: SimulationSources
): SimulationWorkspaceState {
  if (!state) return createEmptySimulationState()
  if (!state.sourceRole && !state.snapshot && !state.basisFingerprint && !state.startedAt) return state
  if (!state.sourceRole || !MASTER_DATA_ROLES.includes(state.sourceRole) || !state.snapshot || !state.basisFingerprint) return createEmptySimulationState()
  return simulationBasisFingerprint(state.sourceRole, sources) === state.basisFingerprint
    ? state
    : createEmptySimulationState()
}

export function retainSimulationStatesForProducts(
  states: Record<string, SimulationWorkspaceState>,
  liveProductIds: ReadonlySet<string>
): Record<string, SimulationWorkspaceState> {
  const retained = Object.fromEntries(Object.entries(states).filter(([id]) => liveProductIds.has(id)))
  return Object.keys(retained).length === Object.keys(states).length ? states : retained
}
