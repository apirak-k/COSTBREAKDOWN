import { ScenarioCostCategory, ScenarioEconomicsInputs, ScenarioEconomicsResult, SnapshotCost } from '../types'

const CATEGORIES: ScenarioCostCategory[] = ['material', 'labor', 'burden']

function isCategory(value: unknown): value is ScenarioCostCategory {
  return CATEGORIES.includes(value as ScenarioCostCategory)
}

function finiteResult(value: number, label: string, warnings: string[]): number | null {
  if (!Number.isFinite(value)) {
    warnings.push(`${label} could not be calculated as a finite value.`)
    return null
  }
  return value
}

function addEconomics(
  amount: number,
  category: ScenarioCostCategory | null,
  label: string,
  additions: Record<ScenarioCostCategory, number>,
  warnings: string[]
): boolean {
  if (amount === 0) return false
  if (!isCategory(category)) {
    warnings.push(`${label} category must be selected to include this cost in simulated Standard Cost.`)
    return true
  }
  const total = finiteResult(additions[category] + amount, `${label} category total`, warnings)
  if (total === null) return true
  additions[category] = total
  return false
}

function composeScenarioCost(
  engineCost: SnapshotCost,
  additions: Record<ScenarioCostCategory, number>,
  unavailableComposition: boolean,
  warnings: string[]
): SnapshotCost {
  const categories = {} as Pick<SnapshotCost, ScenarioCostCategory>
  CATEGORIES.forEach(category => {
    const engineValue = engineCost[category]
    categories[category] = unavailableComposition || engineValue === null
      ? null
      : finiteResult(engineValue + additions[category], `Simulated ${category} cost`, warnings)
  })

  const total = CATEGORIES.some(category => categories[category] === null)
    ? null
    : finiteResult(CATEGORIES.reduce((sum, category) => sum + (categories[category] ?? 0), 0), 'Simulated Standard Cost', warnings)
  const allWarnings = [...new Set([...engineCost.warnings, ...warnings])]
  const status = total === null || engineCost.status === 'missing'
    ? 'missing'
    : engineCost.status === 'estimated' || allWarnings.length > 0
      ? 'estimated'
      : 'complete'

  return { ...engineCost, ...categories, total, status, warnings: allWarnings }
}

/** Composes categorized economics into scenario Standard Cost exactly once. */
export function calculateScenarioEconomics(
  currentCost: SnapshotCost,
  engineScenarioCost: SnapshotCost,
  inputs: ScenarioEconomicsInputs,
  invalidFields: ReadonlySet<keyof ScenarioEconomicsInputs> = new Set()
): ScenarioEconomicsResult {
  const warnings: string[] = []
  const additions: Record<ScenarioCostCategory, number> = { material: 0, labor: 0, burden: 0 }
  const volume = inputs.evaluationVolume
  const validEvaluationQuantity = volume !== null && Number.isFinite(volume) && volume >= 0
  const validFixedConversionVolume = volume !== null && Number.isFinite(volume) && volume > 0
  if (volume !== null && (!Number.isFinite(volume) || volume < 0)) {
    warnings.push('Evaluation Quantity must be a finite non-negative number.')
  }

  let unavailableComposition = false
  let fixedCostEquivalentPerPiece: number | null = null
  if (invalidFields.has('fixedInvestment')) {
    unavailableComposition = true
  } else if (inputs.fixedInvestment !== null) {
    if (!Number.isFinite(inputs.fixedInvestment)) {
      warnings.push('Fixed Investment must be a finite number.')
      unavailableComposition = true
    } else if (inputs.fixedInvestment === 0) {
      fixedCostEquivalentPerPiece = 0
    } else if (!validFixedConversionVolume) {
      warnings.push('Fixed Equivalent / pc is unavailable until Evaluation Quantity is valid and greater than zero.')
      unavailableComposition = true
    } else {
      fixedCostEquivalentPerPiece = finiteResult(
        inputs.fixedInvestment / volume,
        'Fixed Equivalent / pc',
        warnings
      )
      if (fixedCostEquivalentPerPiece === null) unavailableComposition = true
    }
  }

  if (fixedCostEquivalentPerPiece !== null) {
    unavailableComposition = addEconomics(
      fixedCostEquivalentPerPiece,
      inputs.fixedInvestmentCategory,
      'Fixed Equivalent / pc',
      additions,
      warnings
    ) || unavailableComposition
  } else if (inputs.fixedInvestment !== null && inputs.fixedInvestment !== 0) {
    if (!isCategory(inputs.fixedInvestmentCategory)) {
      warnings.push('Fixed Equivalent / pc category must be selected to include this cost in simulated Standard Cost.')
    }
  }

  if (invalidFields.has('variableAddedCostPerPiece')) {
    unavailableComposition = true
  } else if (inputs.variableAddedCostPerPiece !== null) {
    if (!Number.isFinite(inputs.variableAddedCostPerPiece)) {
      warnings.push('Variable Added Cost / pc must be a finite number.')
      unavailableComposition = true
    } else {
      unavailableComposition = addEconomics(
        inputs.variableAddedCostPerPiece,
        inputs.variableAddedCostCategory,
        'Variable Added Cost / pc',
        additions,
        warnings
      ) || unavailableComposition
    }
  }

  const scenarioCost = composeScenarioCost(engineScenarioCost, additions, unavailableComposition, warnings)
  const grossImprovementPerPiece = currentCost.total !== null && scenarioCost.total !== null
    ? finiteResult(currentCost.total - scenarioCost.total, 'Gross Improvement / pc', warnings)
    : null
  const totalImprovement = grossImprovementPerPiece !== null && validEvaluationQuantity
    ? finiteResult(grossImprovementPerPiece * volume, 'Total Improvement', warnings)
    : null

  return {
    scenarioCost,
    grossImprovementPerPiece,
    fixedCostEquivalentPerPiece,
    variableAddedCostPerPiece: invalidFields.has('variableAddedCostPerPiece')
      ? null
      : inputs.variableAddedCostPerPiece,
    totalImprovement,
    warnings: [...new Set(warnings)]
  }
}
