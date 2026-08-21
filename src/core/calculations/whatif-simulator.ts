import { CostDriver, BOMItem, RoutingStep, WorkCenterRate, WhatIfScenario, WhatIfResult } from '../types'
import { safeDivide, parsePercentage, isYieldDriver, isPriceDriver } from '../utils/guards'

export interface SimulateOptionsParams {
  driver: CostDriver | null
  bomItem: BOMItem | null
  routingStep: RoutingStep | null
  rates: WorkCenterRate[]
  totalActiveCost: number
  scenarios: WhatIfScenario[]
}

/**
 * Pure simulation engine for What-If Scenarios across all 4 cost levers:
 * Price (P), Loss % (L), Capacity (C), and Yield % (Y).
 */
export function simulateWhatIfScenarios(params: SimulateOptionsParams): WhatIfResult[] {
  const { driver, bomItem, routingStep, rates, totalActiveCost, scenarios } = params

  if (!driver) {
    return scenarios.map(s => ({
      ...s,
      valid: false,
      grossSaving: 0,
      fixedAddedCostPerUnit: 0,
      variableAddedCostPerUnit: 0,
      addedCost: 0,
      netSaving: 0,
      predictedTotal: totalActiveCost,
      isProfitable: false,
      totalNetBenefit: 0
    }))
  }

  const rateMap = new Map<string, { labor: number; burden: number }>()
  rates.forEach(r => rateMap.set(r.wc, { labor: r.laborRate, burden: r.burdenRate }))

  const isRouting = driver.category !== 'Direct Material'

  return scenarios.map(opt => {
    const targetVal = parseFloat(opt.targetValue)
    const investment = parseFloat(opt.investment) || 0
    const variableAddedCostPerUnit = Math.max(0, parseFloat(opt.variableAddedCost || '0') || 0)
    const lotSize = Math.max(1, parseFloat(opt.lotSize) || 1)

    if (isNaN(targetVal) || targetVal <= 0) {
      return {
        ...opt,
        valid: false,
        grossSaving: 0,
        fixedAddedCostPerUnit: 0,
        variableAddedCostPerUnit: 0,
        addedCost: 0,
        netSaving: 0,
        predictedTotal: totalActiveCost,
        isProfitable: false,
        totalNetBenefit: 0
      }
    }

    let grossSaving = 0

    if (isRouting && routingStep) {
      const r = rateMap.get(routingStep.wc) || { labor: 105.29, burden: 95.00 }
      const totalRate = r.labor + r.burden

      const activeRuntime = routingStep.activeCap > 0 && routingStep.activeYield > 0
        ? safeDivide(routingStep.manning, routingStep.activeCap * routingStep.activeYield)
        : 0
      const activeConvCost = activeRuntime * totalRate

      const targetManning = opt.secondaryTargetValue && parseFloat(opt.secondaryTargetValue) > 0
        ? parseFloat(opt.secondaryTargetValue)
        : routingStep.manning

      const isYield = isYieldDriver(driver.rcaParameter)
      let newRuntime = 0

      if (isYield) {
        const targetYield = parsePercentage(targetVal)
        newRuntime = targetYield > 0 && routingStep.activeCap > 0
          ? safeDivide(targetManning, routingStep.activeCap * targetYield)
          : 0
      } else {
        const targetCap = targetVal
        newRuntime = targetCap > 0 && routingStep.activeYield > 0
          ? safeDivide(targetManning, targetCap * routingStep.activeYield)
          : 0
      }

      const newConvCost = newRuntime * totalRate
      grossSaving = activeConvCost - newConvCost

    } else if (bomItem) {
      const activeMatCost = bomItem.consumption * bomItem.activePrice * (1 + bomItem.activeLoss)
      const isPrice = isPriceDriver(driver.rcaParameter)

      if (isPrice) {
        const targetLoss = opt.secondaryTargetValue && !isNaN(parseFloat(opt.secondaryTargetValue))
          ? parsePercentage(parseFloat(opt.secondaryTargetValue))
          : bomItem.activeLoss
        const newMatCost = bomItem.consumption * targetVal * (1 + targetLoss)
        grossSaving = activeMatCost - newMatCost
      } else {
        const targetPrice = opt.secondaryTargetValue && parseFloat(opt.secondaryTargetValue) > 0
          ? parseFloat(opt.secondaryTargetValue)
          : bomItem.activePrice
        const targetLoss = parsePercentage(targetVal)
        const newMatCost = bomItem.consumption * targetPrice * (1 + targetLoss)
        grossSaving = activeMatCost - newMatCost
      }
    }

    const fixedAddedCostPerUnit = safeDivide(investment, lotSize)
    const addedCost = fixedAddedCostPerUnit + variableAddedCostPerUnit
    const netSaving = grossSaving - addedCost
    const predictedTotal = totalActiveCost - netSaving
    const isProfitable = netSaving > 0
    const totalNetBenefit = netSaving * lotSize

    return {
      ...opt,
      valid: true,
      grossSaving,
      fixedAddedCostPerUnit,
      variableAddedCostPerUnit,
      addedCost,
      netSaving,
      predictedTotal,
      isProfitable,
      totalNetBenefit
    }
  })
}
