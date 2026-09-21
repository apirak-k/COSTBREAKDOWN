import { WorkCenterRate } from '../types'

export interface CalculationWorkCenterRate {
  labor: number
  burden: number
}

export interface WorkCenterRateResolution {
  rate: CalculationWorkCenterRate
  missing: boolean
  workCenterKey: string
}

const ZERO_RATE: CalculationWorkCenterRate = { labor: 0, burden: 0 }

export function createWorkCenterRateMap(rates: WorkCenterRate[]): Map<string, CalculationWorkCenterRate> {
  return new Map(rates.map(rate => [rate.wc, {
    labor: rate.laborRate,
    burden: rate.burdenRate
  }]))
}

export function resolveWorkCenterRate(
  rateMap: Map<string, CalculationWorkCenterRate>,
  workCenter: string | undefined
): WorkCenterRateResolution {
  const rate = workCenter ? rateMap.get(workCenter) : undefined

  return {
    rate: rate ?? ZERO_RATE,
    missing: !rate,
    workCenterKey: workCenter?.trim() || '(blank)'
  }
}
