import type { CostSnapshot, MasterDataRole, SnapshotBOMItem, SnapshotRoutingStep } from '../../core/types'
import {
  compareExactDecimals,
  exactDecimalInputValue,
  exactDecimalSidecarValue,
  resolveExactDecimalInputPair
} from '../../core/utils/exact-decimal'
import { areNumericValuesEquivalent } from '../../core/utils/guards'
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
export type SimulationParameterExactInputs = Partial<Record<SimulationParameter, Record<string, string>>>

export type SimulationParameterOverrides = Partial<Record<SimulationParameter, Record<string, number | null>>>

export interface SimulationDatasetState {
  basisFingerprint: string
  parameterOverrides: SimulationParameterOverrides
  exactDecimalInputs?: SimulationParameterExactInputs
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

export const DEFAULT_SIMULATION_CONTEXT = {
  activeDataset: 'custom',
  comparisonBefore: 'current',
  comparisonAfter: 'custom'
} as const satisfies Pick<SimulationWorkspaceState, 'activeDataset' | 'comparisonBefore' | 'comparisonAfter'>

export interface SimulationDatasetView extends SimulationDatasetState {
  role: MasterDataRole
  snapshot: CostSnapshot
  baselineSnapshot: CostSnapshot
}

const MASTER_DATA_ROLES: MasterDataRole[] = ['reference', 'current', 'custom']
type SimulationParameterField =
  | { kind: 'bom'; field: keyof NonNullable<SnapshotBOMItem['exactDecimalInputs']> }
  | { kind: 'routing'; field: keyof NonNullable<SnapshotRoutingStep['exactDecimalInputs']> }

const PARAMETER_FIELDS: Record<SimulationParameter, SimulationParameterField> = {
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

function isPercentageParameter(parameter: SimulationParameter): boolean {
  return parameter === 'bom.loss' || parameter === 'routing.yield'
}

function isPercentageField(field: string): boolean {
  return field === 'loss' || field === 'yield'
}

function numericFieldEqual(
  left: Record<string, unknown> & { exactDecimalInputs?: Record<string, string> },
  right: Record<string, unknown> & { exactDecimalInputs?: Record<string, string> },
  field: string
): boolean {
  const leftValue = left[field] as number | null | undefined
  const rightValue = right[field] as number | null | undefined
  if (leftValue == null || rightValue == null) return leftValue === rightValue
  const percentage = isPercentageField(field)
  const leftExact = exactDecimalInputValue(leftValue, left.exactDecimalInputs?.[field], percentage)
  const rightExact = exactDecimalInputValue(rightValue, right.exactDecimalInputs?.[field], percentage)
  return leftExact && rightExact
    ? compareExactDecimals(leftExact, rightExact) === 0
    : leftValue === rightValue
}

export function omitSimulationViewState(value: unknown): unknown {
  if (!isRecord(value)) return value
  const state = { ...value }
  delete state.activeDataset
  delete state.comparisonBefore
  delete state.comparisonAfter
  delete state.workingSelection
  if (isRecord(value.datasets)) {
    state.datasets = Object.fromEntries(Object.entries(value.datasets).map(([role, dataset]) => {
      if (!isRecord(dataset)) return [role, dataset]
      const persistedDataset = { ...dataset }
      delete persistedDataset.workingSelection
      return [role, persistedDataset]
    }))
  }
  return state
}

export function omitSimulationViewStateMap(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(Object.entries(value).map(([productId, state]) => [
    productId,
    omitSimulationViewState(state)
  ]))
}

function isMasterDataRole(value: unknown): value is MasterDataRole {
  return typeof value === 'string' && MASTER_DATA_ROLES.includes(value as MasterDataRole)
}

export function createEmptySimulationState(sources: SimulationSources): SimulationWorkspaceState {
  return {
    schemaVersion: 2,
    ...DEFAULT_SIMULATION_CONTEXT,
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
    exactDecimalInputs: {},
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
  let dataset: SimulationDatasetState
  if (stored?.basisFingerprint === simulationBasisFingerprint(role, sources)) {
    const parameterOverrides = normalizeParameterOverrides(stored.parameterOverrides, sources[role], stored.exactDecimalInputs)
    dataset = {
      ...stored,
      parameterOverrides,
      exactDecimalInputs: normalizeExactDecimalInputs(
        stored.exactDecimalInputs,
        sources[role],
        parameterOverrides,
        stored.parameterOverrides
      )
    }
  } else {
    dataset = createEmptyDataset(role, sources)
  }
  return {
    ...dataset,
    role,
    snapshot: applyParameterOverrides(sources[role], dataset.parameterOverrides, dataset.exactDecimalInputs),
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
  return isMasterDataRole(role) && (state.activeDataset !== role || state.comparisonAfter !== role)
    ? { ...state, activeDataset: role, comparisonAfter: role }
    : state
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
  const current = matches[0] as unknown as Record<string, unknown> & { exactDecimalInputs?: Record<string, string> }
  const reference = baselineMatches[0] as unknown as Record<string, unknown> & { exactDecimalInputs?: Record<string, string> }
  return fields.every(field => numericFieldEqual(reference, current, field))
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

export function setSimulationWorkingSelection(
  state: SimulationWorkspaceState,
  sources: SimulationSources,
  selection: readonly string[],
  role = state.activeDataset
): SimulationWorkspaceState {
  if (!isMasterDataRole(role)) return state
  const dataset = getEffectiveSimulationDataset(sources, state, role)
  const eligibleKeys = selectableSimulationTargetKeys(dataset.baselineSnapshot, dataset.snapshot)
  const workingSelection = [...new Set(selection.filter(key => eligibleKeys.has(key)))]
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
  role: MasterDataRole
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
  const contextIsDefault = state.activeDataset === DEFAULT_SIMULATION_CONTEXT.activeDataset
    && state.comparisonBefore === DEFAULT_SIMULATION_CONTEXT.comparisonBefore
    && state.comparisonAfter === DEFAULT_SIMULATION_CONTEXT.comparisonAfter
  return contextIsDefault && MASTER_DATA_ROLES.every(role => datasets[role] === state.datasets[role])
    ? state
    : { ...state, ...DEFAULT_SIMULATION_CONTEXT, datasets }
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
    ? { ...fresh, workingSelection: dataset.workingSelection }
    : fresh
  return dataset && JSON.stringify(dataset) === JSON.stringify(next) ? dataset : next
}

function toDatasetState(dataset: SimulationDatasetView): SimulationDatasetState {
  return {
    basisFingerprint: dataset.basisFingerprint,
    parameterOverrides: dataset.parameterOverrides,
    exactDecimalInputs: dataset.exactDecimalInputs,
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
    activeDataset: isMasterDataRole(state.activeDataset) ? state.activeDataset : DEFAULT_SIMULATION_CONTEXT.activeDataset,
    comparisonBefore: isMasterDataRole(state.comparisonBefore) ? state.comparisonBefore : DEFAULT_SIMULATION_CONTEXT.comparisonBefore,
    comparisonAfter: isMasterDataRole(state.comparisonAfter) ? state.comparisonAfter : DEFAULT_SIMULATION_CONTEXT.comparisonAfter,
    datasets
  }
  return JSON.stringify(reconciled) === JSON.stringify(state) ? state as unknown as SimulationWorkspaceState : reconciled
}

function reconcileDataset(value: unknown, role: MasterDataRole, sources: SimulationSources): SimulationDatasetState {
  const fresh = createEmptyDataset(role, sources)
  if (!isRecord(value) || value.basisFingerprint !== fresh.basisFingerprint) return fresh

  const parameterOverrides = normalizeParameterOverrides(value.parameterOverrides, sources[role], value.exactDecimalInputs)
  const exactDecimalInputs = normalizeExactDecimalInputs(
    value.exactDecimalInputs,
    sources[role],
    parameterOverrides,
    value.parameterOverrides
  )
  const snapshot = applyParameterOverrides(sources[role], parameterOverrides, exactDecimalInputs)
  const selection = Array.isArray(value.workingSelection)
    ? [...new Set(value.workingSelection.filter((item): item is string => typeof item === 'string'))]
    : []
  const eligibleKeys = selectableSimulationTargetKeys(sources[role], snapshot)
  const workingSelection = selection.filter(key => eligibleKeys.has(key))
  return {
    basisFingerprint: fresh.basisFingerprint,
    parameterOverrides,
    exactDecimalInputs,
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

function normalizeParameterOverrides(
  value: unknown,
  baseline: CostSnapshot,
  exactDecimalInputsValue?: unknown
): SimulationParameterOverrides {
  if (!isRecord(value)) return {}
  const result: SimulationParameterOverrides = {}
  for (const parameter of SIMULATION_PARAMETERS) {
    const entries = value[parameter]
    if (!isRecord(entries)) continue
    const exactEntries = isRecord(exactDecimalInputsValue) && isRecord(exactDecimalInputsValue[parameter])
      ? exactDecimalInputsValue[parameter]
      : {}
    const { kind, field } = PARAMETER_FIELDS[parameter]
    const rows = kind === 'bom' ? baseline.bom : baseline.routing
    const valid: Record<string, number | null> = {}
    for (const [recordId, candidate] of Object.entries(entries)) {
      const matches = rows.filter(row => row.id === recordId)
      if (!recordId || matches.length !== 1 || (candidate !== null && typeof candidate !== 'number')) continue
      if (!isSimulationParameterInputValid(parameter, candidate as number | null)) continue
      const baselineRow = matches[0] as unknown as Record<string, unknown> & { exactDecimalInputs?: Record<string, string> }
      const baselineValue = baselineRow[field] as number | null | undefined
      const candidateValue = candidate as number | null
      const candidateExact = typeof exactEntries[recordId] === 'string' ? exactEntries[recordId] as string : undefined
      const validCandidateExact = typeof candidateValue === 'number'
        && exactDecimalSidecarValue(candidateValue, candidateExact, isPercentageParameter(parameter))
        ? candidateExact
        : undefined
      const equivalent = typeof baselineValue === 'number' && typeof candidateValue === 'number'
        ? resolveExactDecimalInputPair(
          baselineValue,
          baselineRow.exactDecimalInputs?.[field],
          candidateValue,
          validCandidateExact,
          isPercentageParameter(parameter)
        ).equivalent
        : areNumericValuesEquivalent(baselineValue, candidateValue)
      if (equivalent) continue
      valid[recordId] = candidate as number | null
    }
    if (Object.keys(valid).length) result[parameter] = valid
  }
  return result
}

function normalizeExactDecimalInputs(
  value: unknown,
  baseline: CostSnapshot,
  overrides: SimulationParameterOverrides = {},
  rawOverridesValue?: unknown
): SimulationParameterExactInputs {
  if (!isRecord(value)) return {}
  const result: SimulationParameterExactInputs = {}
  for (const parameter of SIMULATION_PARAMETERS) {
    const entries = value[parameter]
    if (!isRecord(entries)) continue
    const rawOverrideEntries = isRecord(rawOverridesValue) && isRecord(rawOverridesValue[parameter])
      ? rawOverridesValue[parameter]
      : undefined
    const { kind, field } = PARAMETER_FIELDS[parameter]
    const rows = kind === 'bom' ? baseline.bom : baseline.routing
    const valid: Record<string, string> = {}
    for (const [recordId, candidate] of Object.entries(entries)) {
      if (typeof candidate !== 'string') continue
      const matches = rows.filter(row => row.id === recordId)
      if (matches.length !== 1) continue
      const row = matches[0] as unknown as Record<string, unknown> & { exactDecimalInputs?: Record<string, string> }
      const parameterOverrides = overrides[parameter]
      const hasOverride = Boolean(parameterOverrides && Object.prototype.hasOwnProperty.call(parameterOverrides, recordId))
      const hadStoredOverride = Boolean(rawOverrideEntries && Object.prototype.hasOwnProperty.call(rawOverrideEntries, recordId))
      if (hadStoredOverride) {
        const storedNumber = rawOverrideEntries?.[recordId]
        if (typeof storedNumber !== 'number'
          || !isSimulationParameterInputValid(parameter, storedNumber)
          || !exactDecimalSidecarValue(storedNumber, candidate, isPercentageParameter(parameter))) continue
      }
      const numericValue = hasOverride
        ? parameterOverrides?.[recordId]
        : row[field] as number | null | undefined
      if (typeof numericValue !== 'number') continue
      const exact = exactDecimalSidecarValue(numericValue, candidate, isPercentageParameter(parameter))
      if (!exact) continue
      if (!hasOverride) {
        const baselineExact = exactDecimalInputValue(
          row[field] as number | null | undefined,
          row.exactDecimalInputs?.[field],
          isPercentageParameter(parameter)
        )
        if (baselineExact && compareExactDecimals(exact, baselineExact) === 0) continue
      }
      valid[recordId] = candidate
    }
    if (Object.keys(valid).length) result[parameter] = valid
  }
  return result
}

function applyParameterOverrides(
  baseline: CostSnapshot,
  overrides: SimulationParameterOverrides,
  exactDecimalInputs: SimulationParameterExactInputs = {}
): CostSnapshot {
  const snapshot = structuredClone(baseline)
  for (const parameter of SIMULATION_PARAMETERS) {
    const { kind, field } = PARAMETER_FIELDS[parameter]
    const values = overrides[parameter]
    const exactValues = exactDecimalInputs[parameter]
    if (!values && !exactValues) continue
    if (kind === 'bom') {
      snapshot.bom = snapshot.bom.map(row => {
        const hasValue = Boolean(values && Object.prototype.hasOwnProperty.call(values, row.id))
        const exactValue = exactValues?.[row.id]
        if (!hasValue && exactValue === undefined) return row
        const nextExactInputs = { ...(row.exactDecimalInputs ?? {}) }
        if (exactValue === undefined) delete nextExactInputs[field]
        else nextExactInputs[field] = exactValue
        return {
          ...row,
          ...(hasValue ? { [field]: values?.[row.id] } : {}),
          exactDecimalInputs: Object.keys(nextExactInputs).length ? nextExactInputs : undefined
        }
      })
    } else {
      snapshot.routing = snapshot.routing.map(row => {
        const hasValue = Boolean(values && Object.prototype.hasOwnProperty.call(values, row.id))
        const exactValue = exactValues?.[row.id]
        if (!hasValue && exactValue === undefined) return row
        const nextExactInputs = { ...(row.exactDecimalInputs ?? {}) }
        if (exactValue === undefined) delete nextExactInputs[field]
        else nextExactInputs[field] = exactValue
        return {
          ...row,
          ...(hasValue ? { [field]: values?.[row.id] } : {}),
          exactDecimalInputs: Object.keys(nextExactInputs).length ? nextExactInputs : undefined
        }
      })
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
