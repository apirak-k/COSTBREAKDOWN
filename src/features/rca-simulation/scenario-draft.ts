import { ScenarioCostDraft, ScenarioParameterOverrides } from '../../core'
import { ScenarioInputDefinition } from './scenario-inputs'

export interface ScenarioDraftForm {
  letter: 'A' | 'B' | 'C'
  label: string
  inputValues: Record<string, string>
}

export interface PreparedScenarioDrafts {
  drafts: ScenarioCostDraft[]
  inputWarningsByLetter: Record<'A' | 'B' | 'C', string[]>
}

export function createScenarioDrafts(): ScenarioDraftForm[] {
  return (['A', 'B', 'C'] as const).map(letter => ({ letter, label: '', inputValues: {} }))
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
  const inputWarningsByLetter: PreparedScenarioDrafts['inputWarningsByLetter'] = { A: [], B: [], C: [] }
  const drafts = formDrafts.map(formDraft => {
    const overrides: ScenarioParameterOverrides = {}
    const warnings = inputWarningsByLetter[formDraft.letter]

    inputDefinitions.forEach(definition => {
      const rawValue = formDraft.inputValues[definition.key]
      if (rawValue === undefined || rawValue.trim() === '') return

      const displayValue = Number(rawValue)
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