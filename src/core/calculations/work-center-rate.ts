import { WorkCenterRate } from '../types'

export interface CalculationWorkCenterRate {
  labor: number
  burden: number
}

export interface WorkCenterRateResolution {
  rate: CalculationWorkCenterRate | null
  missing: boolean
  workCenterKey: string
}

export function createWorkCenterRateMap(rates: WorkCenterRate[]): Map<string, CalculationWorkCenterRate | null> {
  const map = new Map<string, CalculationWorkCenterRate | null>()
  for (const rate of rates) {
    if (map.has(rate.wc)) {
      map.set(rate.wc, null)
      continue
    }
    map.set(rate.wc, { labor: rate.laborRate, burden: rate.burdenRate })
  }
  return map
}

export function resolveWorkCenterRate(
  rateMap: Map<string, CalculationWorkCenterRate | null>,
  workCenter: string | undefined
): WorkCenterRateResolution {
  const rate = workCenter ? rateMap.get(workCenter) : undefined
  const resolvedRate = rate ?? null

  return {
    rate: resolvedRate,
    missing: resolvedRate === null,
    workCenterKey: workCenter?.trim() || '(blank)'
  }
}
