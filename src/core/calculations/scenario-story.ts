import { ScenarioBusinessResult, ScenarioFinancialResult, ScenarioStory, SnapshotCost } from '../types'

export function createScenarioFinancialResult(
  standardCost: SnapshotCost,
  business: ScenarioBusinessResult
): ScenarioFinancialResult {
  return {
    material: standardCost.material,
    labor: standardCost.labor,
    burden: standardCost.burden,
    standardCost: standardCost.total,
    sgaAmountPerPiece: business.sgaAmountPerPiece,
    operatingProfitPerPiece: business.operatingProfitPerPiece,
    sellingPrice: business.sellingPrice
  }
}

function signedDifference(after: number | null, before: number | null): number | null {
  if (after === null || before === null || !Number.isFinite(after) || !Number.isFinite(before)) return null
  const difference = after - before
  return Number.isFinite(difference) ? difference : null
}

function createGap(
  after: ScenarioFinancialResult,
  before: ScenarioFinancialResult
): ScenarioFinancialResult {
  return {
    material: signedDifference(after.material, before.material),
    labor: signedDifference(after.labor, before.labor),
    burden: signedDifference(after.burden, before.burden),
    standardCost: signedDifference(after.standardCost, before.standardCost),
    sgaAmountPerPiece: signedDifference(after.sgaAmountPerPiece, before.sgaAmountPerPiece),
    operatingProfitPerPiece: signedDifference(after.operatingProfitPerPiece, before.operatingProfitPerPiece),
    sellingPrice: signedDifference(after.sellingPrice, before.sellingPrice)
  }
}

export function createScenarioStory(
  reference: ScenarioFinancialResult,
  current: ScenarioFinancialResult,
  simulated: ScenarioFinancialResult
): ScenarioStory {
  return {
    reference,
    current,
    simulated,
    gap1: createGap(current, reference),
    gap2: createGap(simulated, current)
  }
}
