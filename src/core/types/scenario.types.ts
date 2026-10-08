export interface ScenarioBusinessInputs {
  sellingPrice: number | null
  sgaPercent: number | null
}

export interface ScenarioBusinessResult extends ScenarioBusinessInputs {
  sgaAmountPerPiece: number | null
  operatingProfitPerPiece: number | null
  warnings: string[]
}

export interface ScenarioFinancialResult {
  material: number | null
  labor: number | null
  burden: number | null
  standardCost: number | null
  sgaAmountPerPiece: number | null
  operatingProfitPerPiece: number | null
  sellingPrice: number | null
}

export interface ScenarioStory {
  reference: ScenarioFinancialResult
  current: ScenarioFinancialResult
  simulated: ScenarioFinancialResult
  gap1: ScenarioFinancialResult
  gap2: ScenarioFinancialResult
}
