import type { ScenarioCostDraft, ScenarioEconomicsInputs, ScenarioParameterOverrides } from '../../core'
import type { ScenarioInputDefinition } from './scenario-inputs'

export interface ScenarioDraftForm {
  letter: 'A' | 'B'
  label: string
  inputValues: Record<string, string>
  economicsInputs: Record<keyof ScenarioEconomicsInputs, string>
}

export interface RcaSimulationPageState {
  sourceDataRevision: number
  selectedCandidateKey: string | null
  trialHandoffLetter: ScenarioDraftForm['letter'] | null
  scenarioDraftsByCandidate: Record<string, ScenarioDraftForm[]>
}

export function createRcaSimulationPageState(sourceDataRevision = 0): RcaSimulationPageState {
  return { sourceDataRevision, selectedCandidateKey: null, trialHandoffLetter: null, scenarioDraftsByCandidate: {} }
}

function isScenarioLetter(value: unknown): value is ScenarioDraftForm['letter'] {
  return value === 'A' || value === 'B'
}

export function getRcaSimulationStateForRevision(
  state: RcaSimulationPageState | undefined,
  sourceDataRevision: number
): RcaSimulationPageState {
  if (state?.sourceDataRevision !== sourceDataRevision) return createRcaSimulationPageState(sourceDataRevision)

  let hasUnsupportedState = !isScenarioLetter(state.trialHandoffLetter) && state.trialHandoffLetter !== null
  const scenarioDraftsByCandidate = Object.fromEntries(
    Object.entries(state.scenarioDraftsByCandidate).map(([candidateKey, drafts]) => {
      const supportedDrafts = drafts.filter(draft => isScenarioLetter((draft as { letter: unknown }).letter))
      if (supportedDrafts.length !== drafts.length) hasUnsupportedState = true
      return [candidateKey, supportedDrafts]
    })
  )

  if (!hasUnsupportedState) return state
  return {
    ...state,
    trialHandoffLetter: isScenarioLetter(state.trialHandoffLetter) ? state.trialHandoffLetter : null,
    scenarioDraftsByCandidate
  }
}

export function updateRcaSimulationStateByProduct(
  states: Record<string, RcaSimulationPageState>,
  productId: string,
  sourceDataRevision: number,
  update: (state: RcaSimulationPageState) => RcaSimulationPageState
): Record<string, RcaSimulationPageState> {
  const current = getRcaSimulationStateForRevision(states[productId], sourceDataRevision)
  return { ...states, [productId]: { ...update(current), sourceDataRevision } }
}

export function retainRcaSimulationStatesForProducts(
  states: Record<string, RcaSimulationPageState>,
  liveProductIds: ReadonlySet<string>
): Record<string, RcaSimulationPageState> {
  let changed = false
  const retained: Record<string, RcaSimulationPageState> = {}

  Object.entries(states).forEach(([productId, state]) => {
    if (!liveProductIds.has(productId)) {
      changed = true
      return
    }

    const normalizedState = getRcaSimulationStateForRevision(state, state.sourceDataRevision)
    if (normalizedState !== state) changed = true
    retained[productId] = normalizedState
  })

  return changed ? retained : states
}

export interface PreparedScenarioDrafts {
  drafts: ScenarioCostDraft[]
  inputWarningsByLetter: Record<'A' | 'B', string[]>
}

export interface PreparedScenarioEconomicsInputs {
  inputsByLetter: Record<ScenarioDraftForm['letter'], ScenarioEconomicsInputs>
  warningsByLetter: Record<ScenarioDraftForm['letter'], string[]>
}

export function createScenarioDrafts(): ScenarioDraftForm[] {
  return (['A', 'B'] as const).map(letter => ({
    letter,
    label: '',
    inputValues: {},
    economicsInputs: { fixedInvestment: '', variableAddedCostPerPiece: '', evaluationVolume: '' }
  }))
}

export function updateScenarioLabel(
  drafts: ScenarioDraftForm[],
  letter: ScenarioDraftForm['letter'],
  label: string
): ScenarioDraftForm[] {
  return drafts.map(draft => draft.letter === letter ? { ...draft, label } : draft)
}

export function updateScenarioInputValue(
  drafts: ScenarioDraftForm[],
  letter: ScenarioDraftForm['letter'],
  inputKey: string,
  value: string
): ScenarioDraftForm[] {
  return drafts.map(draft => {
    if (draft.letter !== letter) return draft
    const inputValues = { ...draft.inputValues }
    if (value === '') delete inputValues[inputKey]
    else inputValues[inputKey] = value
    return { ...draft, inputValues }
  })
}

export function updateScenarioEconomicsInput(
  drafts: ScenarioDraftForm[],
  letter: ScenarioDraftForm['letter'],
  key: keyof ScenarioEconomicsInputs,
  value: string
): ScenarioDraftForm[] {
  return drafts.map(draft => draft.letter === letter
    ? { ...draft, economicsInputs: { ...draft.economicsInputs, [key]: value } }
    : draft)
}

function parseFiniteInput(rawValue: string | undefined, label: string, warnings: string[]): number | null {
  if (rawValue === undefined || rawValue.trim() === '') return null
  const value = Number(rawValue)
  if (!Number.isFinite(value)) {
    warnings.push(`${label} must be a finite number.`)
    return null
  }
  return value
}

function addNumericOverride(
  overrides: ScenarioParameterOverrides,
  definition: ScenarioInputDefinition,
  value: number
): void {
  if (definition.sourceType === 'bom') {
    overrides.bom ??= {}
    overrides.bom[definition.sourceId] = {
      ...overrides.bom[definition.sourceId],
      [definition.field]: value
    }
    return
  }

  if (definition.sourceType === 'routing') {
    overrides.routing ??= {}
    overrides.routing[definition.sourceId] = {
      ...overrides.routing[definition.sourceId],
      [definition.field]: value
    }
    return
  }

  overrides.rates ??= {}
  overrides.rates[definition.sourceId] = {
    ...overrides.rates[definition.sourceId],
    [definition.field]: value
  }
}

export function prepareScenarioDrafts(
  formDrafts: ScenarioDraftForm[],
  inputDefinitions: ScenarioInputDefinition[]
): PreparedScenarioDrafts {
  const inputWarningsByLetter: PreparedScenarioDrafts['inputWarningsByLetter'] = { A: [], B: [] }
  const drafts = formDrafts.map(formDraft => {
    const overrides: ScenarioParameterOverrides = {}
    const warnings = inputWarningsByLetter[formDraft.letter]

    inputDefinitions.forEach(definition => {
      const displayValue = parseFiniteInput(formDraft.inputValues[definition.key], definition.label, warnings)
      if (displayValue === null) return
      const value = displayValue / definition.displayScale
      if (!Number.isFinite(value)) {
        warnings.push(`${definition.label} must be a finite number.`)
        return
      }

      addNumericOverride(overrides, definition, value)
    })

    return { letter: formDraft.letter, label: formDraft.label, overrides }
  })

  return { drafts, inputWarningsByLetter }
}

export function prepareScenarioEconomicsInputs(
  formDrafts: ScenarioDraftForm[]
): PreparedScenarioEconomicsInputs {
  const warningsByLetter: PreparedScenarioEconomicsInputs['warningsByLetter'] = { A: [], B: [] }
  const inputsByLetter = {} as PreparedScenarioEconomicsInputs['inputsByLetter']

  formDrafts.forEach(draft => {
    const warnings = warningsByLetter[draft.letter]
    inputsByLetter[draft.letter] = {
      fixedInvestment: parseFiniteInput(draft.economicsInputs.fixedInvestment, 'Fixed Investment', warnings),
      variableAddedCostPerPiece: parseFiniteInput(draft.economicsInputs.variableAddedCostPerPiece, 'Variable Added Cost / pc', warnings),
      evaluationVolume: parseFiniteInput(draft.economicsInputs.evaluationVolume, 'Evaluation Volume', warnings)
    }
  })

  return { inputsByLetter, warningsByLetter }
}
