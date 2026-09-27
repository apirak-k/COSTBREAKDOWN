import { ScenarioEconomicsInputs, ScenarioEconomicsResult } from '../types'

function finiteResult(value: number, label: string, warnings: string[]): number | null {
  if (!Number.isFinite(value)) {
    warnings.push(`${label} could not be calculated as a finite value.`)
    return null
  }
  return value
}

/** Calculates improvement economics without changing either Standard Cost result. */
export function calculateScenarioEconomics(
  currentStandardCostPerPiece: number | null,
  scenarioStandardCostPerPiece: number | null,
  inputs: ScenarioEconomicsInputs
): ScenarioEconomicsResult {
  const warnings: string[] = []
  const volume = inputs.evaluationVolume
  const validVolume = volume !== null && volume > 0
  if (volume !== null && volume <= 0) warnings.push('Evaluation Volume must be greater than zero.')

  const grossSavingPerPiece = currentStandardCostPerPiece !== null && scenarioStandardCostPerPiece !== null
    ? finiteResult(currentStandardCostPerPiece - scenarioStandardCostPerPiece, 'Gross Saving', warnings)
    : null
  const fixedCostEquivalentPerPiece = inputs.fixedInvestment !== null && validVolume
    ? finiteResult(inputs.fixedInvestment / volume, 'Fixed Cost Equivalent', warnings)
    : null
  const netBenefitPerPiece = grossSavingPerPiece !== null
    && inputs.variableAddedCostPerPiece !== null
    && fixedCostEquivalentPerPiece !== null
    ? finiteResult(grossSavingPerPiece - inputs.variableAddedCostPerPiece - fixedCostEquivalentPerPiece, 'Net Benefit', warnings)
    : null
  const totalGrossSaving = grossSavingPerPiece !== null && validVolume
    ? finiteResult(grossSavingPerPiece * volume, 'Total Gross Saving', warnings)
    : null
  const totalVariableAddedCost = inputs.variableAddedCostPerPiece !== null && validVolume
    ? finiteResult(inputs.variableAddedCostPerPiece * volume, 'Total Variable Added Cost', warnings)
    : null
  const totalNetBenefit = totalGrossSaving !== null
    && totalVariableAddedCost !== null
    && inputs.fixedInvestment !== null
    ? finiteResult(totalGrossSaving - totalVariableAddedCost - inputs.fixedInvestment, 'Total Net Benefit', warnings)
    : null

  return {
    grossSavingPerPiece,
    fixedCostEquivalentPerPiece,
    netBenefitPerPiece,
    totalGrossSaving,
    totalVariableAddedCost,
    totalNetBenefit,
    warnings
  }
}
