import type { MasterDataRole } from '../../core/types'
import { calculateParameterSimulation, updateSimulationParameter } from './simulation-engine'
import {
  getEffectiveSimulationDataset,
  setSimulationEconomicInput,
  type SimulationSources,
  type SimulationParameter,
  type SimulationParameterExactInputs,
  type SimulationWorkspaceState
} from './simulation-state'
import type { EconomicSimulationDraft, EconomicSimulationField } from './simulation-economics'

type EditableBOMValues = { price: number | null; consumption: number | null; loss: number | null }
type EditableRoutingValues = { manning: number | null; capacity: number | null; yield: number | null }

export interface SimulationEditableSnapshot {
  bom: Record<string, EditableBOMValues>
  routing: Record<string, EditableRoutingValues>
  exactDecimalInputs?: SimulationParameterExactInputs
  economicInputs: EconomicSimulationDraft
}

export interface SimulationHistoryEntry {
  before: SimulationEditableSnapshot
  after: SimulationEditableSnapshot
  directEditSourcesBefore: SimulationDirectEditProvenance
  directEditSourcesAfter: SimulationDirectEditProvenance
}

export type SimulationDirectEditProvenance = Record<string, string>

export interface SimulationHistory {
  basisFingerprint: string | null
  undo: SimulationHistoryEntry[]
  redo: SimulationHistoryEntry[]
}

export interface SimulationHistoryChronology {
  undo: MasterDataRole[]
  redo: MasterDataRole[]
}

export const SIMULATION_HISTORY_LIMIT = 100

export function createSimulationHistoryChronology(): SimulationHistoryChronology {
  return { undo: [], redo: [] }
}

function trimRoleEntries(roles: MasterDataRole[], role: MasterDataRole, limit = SIMULATION_HISTORY_LIMIT): MasterDataRole[] {
  let result = [...roles]
  while (result.filter(item => item === role).length > limit) {
    result.splice(result.indexOf(role), 1)
  }
  return result
}

export function recordSimulationHistoryChronology(
  chronology: SimulationHistoryChronology,
  role: MasterDataRole,
  roleUndoCount: number
): SimulationHistoryChronology {
  const undo = trimRoleEntries([...chronology.undo, role], role, roleUndoCount)
  return { undo, redo: chronology.redo.filter(item => item !== role) }
}

export function takeSimulationHistoryChronology(
  chronology: SimulationHistoryChronology,
  direction: 'undo' | 'redo'
): { chronology: SimulationHistoryChronology; role?: MasterDataRole } {
  const source = direction === 'undo' ? chronology.undo : chronology.redo
  const role = source[source.length - 1]
  if (!role) return { chronology }
  const undo = direction === 'undo' ? source.slice(0, -1) : trimRoleEntries([...chronology.undo, role], role)
  const redo = direction === 'undo' ? trimRoleEntries([...chronology.redo, role], role) : source.slice(0, -1)
  return { chronology: { undo, redo }, role }
}

export function clearSimulationHistoryChronologyRoles(
  chronology: SimulationHistoryChronology,
  roles: readonly MasterDataRole[]
): SimulationHistoryChronology {
  const stale = new Set(roles)
  return {
    undo: chronology.undo.filter(role => !stale.has(role)),
    redo: chronology.redo.filter(role => !stale.has(role))
  }
}

export function peekSimulationHistoryChronology(
  chronology: SimulationHistoryChronology,
  direction: 'undo' | 'redo'
): MasterDataRole | undefined {
  const stack = direction === 'undo' ? chronology.undo : chronology.redo
  return stack[stack.length - 1]
}

const ECONOMIC_FIELDS: EconomicSimulationField[] = [
  'fixedActionCost', 'variableActionCostPerPiece', 'batchSize', 'sellingPriceOverride', 'sgaPercentOverride'
]

const BOM_FIELDS: Array<{ field: keyof EditableBOMValues; parameter: SimulationParameter }> = [
  { field: 'price', parameter: 'bom.price' },
  { field: 'consumption', parameter: 'bom.consumption' },
  { field: 'loss', parameter: 'bom.loss' }
]

const ROUTING_FIELDS: Array<{ field: keyof EditableRoutingValues; parameter: SimulationParameter }> = [
  { field: 'manning', parameter: 'routing.manning' },
  { field: 'capacity', parameter: 'routing.capacity' },
  { field: 'yield', parameter: 'routing.yield' }
]

function cloneSnapshot(snapshot: SimulationEditableSnapshot): SimulationEditableSnapshot {
  return {
    bom: Object.fromEntries(Object.entries(snapshot.bom).map(([id, values]) => [id, { ...values }])),
    routing: Object.fromEntries(Object.entries(snapshot.routing).map(([id, values]) => [id, { ...values }])),
    exactDecimalInputs: Object.fromEntries(Object.entries(snapshot.exactDecimalInputs ?? {}).map(([parameter, values]) => [parameter, { ...values }])),
    economicInputs: { ...snapshot.economicInputs }
  }
}

function cloneDirectEditProvenance(provenance: SimulationDirectEditProvenance): SimulationDirectEditProvenance {
  return { ...provenance }
}

function equalRecord<T extends object>(left: Record<string, T>, right: Record<string, T>): boolean {
  const leftKeys = Object.keys(left).sort()
  const rightKeys = Object.keys(right).sort()
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => {
    if (key !== rightKeys[index]) return false
    const leftValues = left[key] as Record<string, unknown>
    const rightValues = right[key] as Record<string, unknown>
    const fields = Object.keys(leftValues).sort()
    return fields.join('\u0000') === Object.keys(rightValues).sort().join('\u0000')
      && fields.every(field => leftValues[field] === rightValues[field])
  })
}

export function captureSimulationEditableSnapshot(
  sources: SimulationSources,
  state: SimulationWorkspaceState,
  role: MasterDataRole = state.activeDataset
): SimulationEditableSnapshot {
  const bom: SimulationEditableSnapshot['bom'] = {}
  const routing: SimulationEditableSnapshot['routing'] = {}
  const dataset = getEffectiveSimulationDataset(sources, state, role)
  {
    const records = calculateParameterSimulation(dataset.baselineSnapshot, dataset.snapshot).records
    for (const row of records) {
      const id = row.afterRecordId
      if (!id || row.identityIssue !== null || !['UNCHANGED', 'CHANGED', 'ADDED'].includes(row.status ?? '')) continue
      if (row.kind === 'bom') {
        const matches = dataset.snapshot.bom.filter(item => item.id === id)
        if (matches.length !== 1 || Object.prototype.hasOwnProperty.call(bom, id)) continue
        const { price, consumption, loss } = matches[0]
        bom[id] = { price, consumption, loss }
      } else {
        const matches = dataset.snapshot.routing.filter(item => item.id === id)
        if (matches.length !== 1 || Object.prototype.hasOwnProperty.call(routing, id)) continue
        const { manning, capacity, yield: stepYield } = matches[0]
        routing[id] = { manning, capacity, yield: stepYield }
      }
    }
  }
  return {
    bom,
    routing,
    exactDecimalInputs: Object.fromEntries(Object.entries(dataset.exactDecimalInputs ?? {}).map(([parameter, values]) => [parameter, { ...values }])),
    economicInputs: { ...dataset.economicInputs }
  }
}

export function isSimulationEditableSnapshotEqual(
  left: SimulationEditableSnapshot,
  right: SimulationEditableSnapshot
): boolean {
  return equalRecord(left.bom, right.bom)
    && equalRecord(left.routing, right.routing)
    && equalRecord(left.exactDecimalInputs ?? {}, right.exactDecimalInputs ?? {})
    && ECONOMIC_FIELDS.every(field => left.economicInputs[field] === right.economicInputs[field])
}

export function createSimulationHistory(basisFingerprint: string | null): SimulationHistory {
  return { basisFingerprint, undo: [], redo: [] }
}

export function clearSimulationHistory(
  history: SimulationHistory | undefined,
  basisFingerprint: string | null
): SimulationHistory {
  return history?.basisFingerprint === basisFingerprint && history.undo.length === 0 && history.redo.length === 0
    ? history
    : createSimulationHistory(basisFingerprint)
}

export function recordSimulationHistory(
  history: SimulationHistory,
  before: SimulationEditableSnapshot,
  after: SimulationEditableSnapshot,
  directEditSourcesBefore: SimulationDirectEditProvenance = {},
  directEditSourcesAfter: SimulationDirectEditProvenance = {}
): SimulationHistory {
  if (isSimulationEditableSnapshotEqual(before, after)) return history
  const entry = {
    before: cloneSnapshot(before),
    after: cloneSnapshot(after),
    directEditSourcesBefore: cloneDirectEditProvenance(directEditSourcesBefore),
    directEditSourcesAfter: cloneDirectEditProvenance(directEditSourcesAfter)
  }
  return {
    ...history,
    undo: [...history.undo, entry].slice(-SIMULATION_HISTORY_LIMIT),
    redo: []
  }
}

export function undoSimulationHistory(
  history: SimulationHistory,
  current: SimulationEditableSnapshot
): { history: SimulationHistory; snapshot: SimulationEditableSnapshot | null; directEditSources: SimulationDirectEditProvenance | null } {
  const entry = history.undo[history.undo.length - 1]
  if (!entry || !isSimulationEditableSnapshotEqual(current, entry.after)) return { history, snapshot: null, directEditSources: null }
  return {
    history: { ...history, undo: history.undo.slice(0, -1), redo: [...history.redo, entry] },
    snapshot: cloneSnapshot(entry.before),
    directEditSources: cloneDirectEditProvenance(entry.directEditSourcesBefore)
  }
}

export function redoSimulationHistory(
  history: SimulationHistory,
  current: SimulationEditableSnapshot
): { history: SimulationHistory; snapshot: SimulationEditableSnapshot | null; directEditSources: SimulationDirectEditProvenance | null } {
  const entry = history.redo[history.redo.length - 1]
  if (!entry || !isSimulationEditableSnapshotEqual(current, entry.before)) return { history, snapshot: null, directEditSources: null }
  return {
    history: { ...history, undo: [...history.undo, entry].slice(-SIMULATION_HISTORY_LIMIT), redo: history.redo.slice(0, -1) },
    snapshot: cloneSnapshot(entry.after),
    directEditSources: cloneDirectEditProvenance(entry.directEditSourcesAfter)
  }
}

export function applySimulationEditableSnapshot(
  sources: SimulationSources,
  state: SimulationWorkspaceState,
  target: SimulationEditableSnapshot,
  role: MasterDataRole = state.activeDataset
): SimulationWorkspaceState | null {
  const current = captureSimulationEditableSnapshot(sources, state, role)
  if (!sameKeys(current.bom, target.bom) || !sameKeys(current.routing, target.routing)) return null

  let next = state
  for (const [id, values] of Object.entries(target.bom)) {
    for (const { field, parameter } of BOM_FIELDS) {
      const exactValues = target.exactDecimalInputs?.[parameter]
      next = updateSimulationParameter(next, sources, id, parameter, values[field], role,
        exactValues && Object.prototype.hasOwnProperty.call(exactValues, id) ? exactValues[id] : null)
    }
  }
  for (const [id, values] of Object.entries(target.routing)) {
    for (const { field, parameter } of ROUTING_FIELDS) {
      const exactValues = target.exactDecimalInputs?.[parameter]
      next = updateSimulationParameter(next, sources, id, parameter, values[field], role,
        exactValues && Object.prototype.hasOwnProperty.call(exactValues, id) ? exactValues[id] : null)
    }
  }
  for (const field of ECONOMIC_FIELDS) next = setSimulationEconomicInput(next, field, target.economicInputs[field], role)

  return isSimulationEditableSnapshotEqual(captureSimulationEditableSnapshot(sources, next, role), target)
    ? next
    : null
}

function sameKeys(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const leftKeys = Object.keys(left).sort()
  const rightKeys = Object.keys(right).sort()
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index])
}
