import { safeAdd, safeDivide } from '../utils/guards'

export interface MultiplicativeCostFactor {
  key: string
  baseline: number
  target: number
}

export interface MultiplicativeCostAttribution {
  totalEffect: number | null
  effects: Record<string, number> | null
  shares: Record<string, number | null> | null
}

function logMean(baseline: number, target: number): number | null {
  if (baseline === target) return baseline
  const denominator = Math.log(target) - Math.log(baseline)
  if (denominator === 0) return (baseline + target) / 2
  const result = (target - baseline) / denominator
  return Number.isFinite(result) ? result : null
}

/** Additive LMDI for a cost represented by a fixed multiplier and multiplicative factors. */
export function calculateMultiplicativeCostAttribution(
  baselineCost: number | null,
  targetCost: number | null,
  factors: readonly MultiplicativeCostFactor[]
): MultiplicativeCostAttribution {
  if (baselineCost === null || targetCost === null
    || !Number.isFinite(baselineCost) || !Number.isFinite(targetCost)
    || baselineCost < 0 || targetCost < 0 || factors.length === 0
    || factors.some(factor => !Number.isFinite(factor.baseline) || !Number.isFinite(factor.target))) {
    return { totalEffect: null, effects: null, shares: null }
  }

  const totalEffect = safeAdd(targetCost, -baselineCost)
  if (totalEffect === null) return { totalEffect: null, effects: null, shares: null }

  let values: number[]
  if (baselineCost > 0 && targetCost > 0) {
    if (factors.some(factor => factor.baseline <= 0 || factor.target <= 0)) {
      return { totalEffect, effects: null, shares: null }
    }
    const weight = logMean(baselineCost, targetCost)
    if (weight === null) return { totalEffect, effects: null, shares: null }
    values = factors.map(factor => weight * Math.log(factor.target / factor.baseline))
  } else if (baselineCost === 0 && targetCost === 0) {
    values = factors.map(() => 0)
  } else {
    const changed = factors.flatMap((factor, index) => factor.baseline === factor.target ? [] : [index])
    const index = changed[0]
    const singleZeroTransition = changed.length === 1 && index !== undefined
      && (baselineCost === 0
        ? factors[index].baseline === 0 && factors[index].target > 0
        : factors[index].baseline > 0 && factors[index].target === 0)
    if (!singleZeroTransition) return { totalEffect, effects: null, shares: null }
    values = factors.map((_, factorIndex) => factorIndex === index ? totalEffect : 0)
  }

  if (values.some(value => !Number.isFinite(value))) return { totalEffect, effects: null, shares: null }
  const attributedTotal = safeAdd(...values)
  if (attributedTotal === null) return { totalEffect, effects: null, shares: null }
  // Keep the published component values exactly reconciled despite floating-point rounding.
  values[values.length - 1] = safeAdd(values[values.length - 1], totalEffect - attributedTotal) ?? values[values.length - 1]
  const effects = Object.fromEntries(factors.map((factor, index) => [factor.key, values[index]]))
  const shares = Object.fromEntries(factors.map((factor, index) => {
    const ratio = totalEffect === 0 ? null : safeDivide(values[index], totalEffect)
    const share = ratio === null ? null : ratio * 100
    return [factor.key, share !== null && Number.isFinite(share) ? share : null]
  }))
  return { totalEffect, effects, shares }
}
