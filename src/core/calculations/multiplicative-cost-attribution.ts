import { areNumericValuesEquivalent, safeAdd, safeDivide } from '../utils/guards'

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

function zeroBoundaryEffects(
  baselineCost: number,
  targetCost: number,
  factors: readonly MultiplicativeCostFactor[]
): number[] | null {
  if (factors.some(factor => factor.baseline < 0 || factor.target < 0)) return null
  const product = (values: number[]) => values.reduce((total, value) => total * value, 1)
  const baselineValues = factors.map(factor => factor.baseline)
  const targetValues = factors.map(factor => factor.target)
  const baselineProduct = product(baselineValues)
  const targetProduct = product(targetValues)
  const multiplier = baselineProduct > 0
    ? baselineCost / baselineProduct
    : targetProduct > 0 ? targetCost / targetProduct : null
  if (multiplier === null || !Number.isFinite(multiplier) || multiplier < 0) return null
  const matchesCost = (actual: number, expected: number) =>
    Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected))
  if (!matchesCost(multiplier * baselineProduct, baselineCost)
    || !matchesCost(multiplier * targetProduct, targetCost)) return null

  const changed = factors.flatMap((factor, index) => areNumericValuesEquivalent(factor.baseline, factor.target) ? [] : [index])
  const effects = factors.map(() => 0)
  let permutations = 0
  const applyOrders = (order: number[], remaining: number[]) => {
    if (remaining.length === 0) {
      const values = [...baselineValues]
      let previousCost = baselineCost
      for (const index of order) {
        values[index] = factors[index].target
        const nextCost = multiplier * product(values)
        effects[index] += nextCost - previousCost
        previousCost = nextCost
      }
      permutations += 1
      return
    }
    remaining.forEach((index, position) => {
      applyOrders([...order, index], [...remaining.slice(0, position), ...remaining.slice(position + 1)])
    })
  }
  applyOrders([], changed)
  return permutations === 0 ? effects : effects.map(effect => effect / permutations)
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

  const changedIndices = factors.flatMap((factor, index) => areNumericValuesEquivalent(factor.baseline, factor.target) ? [] : [index])
  if (changedIndices.length === 0) {
    if (areNumericValuesEquivalent(baselineCost, targetCost)) {
      return { totalEffect: 0, effects: Object.fromEntries(factors.map(factor => [factor.key, 0])), shares: null }
    }
    return { totalEffect, effects: null, shares: null }
  }

  let values: number[]
  if (baselineCost > 0 && targetCost > 0) {
    if (factors.some(factor => factor.baseline <= 0 || factor.target <= 0)) {
      return { totalEffect, effects: null, shares: null }
    }
    const weight = logMean(baselineCost, targetCost)
    if (weight === null) return { totalEffect, effects: null, shares: null }
    values = factors.map(factor => areNumericValuesEquivalent(factor.baseline, factor.target)
      ? 0
      : weight * Math.log(factor.target / factor.baseline))
  } else if (baselineCost === 0 && targetCost === 0) {
    values = factors.map(() => 0)
  } else {
    const changed = changedIndices
    const index = changed[0]
    const singleZeroTransition = changed.length === 1 && index !== undefined
      && (baselineCost === 0
        ? factors[index].baseline === 0 && factors[index].target > 0
        : factors[index].baseline > 0 && factors[index].target === 0)
    if (singleZeroTransition) {
      values = factors.map((_, factorIndex) => factorIndex === index ? totalEffect : 0)
    } else {
      const fallback = zeroBoundaryEffects(baselineCost, targetCost, factors)
      if (fallback === null) return { totalEffect, effects: null, shares: null }
      values = fallback
    }
  }

  if (values.some(value => !Number.isFinite(value))) return { totalEffect, effects: null, shares: null }
  const attributedTotal = safeAdd(...values)
  if (attributedTotal === null) return { totalEffect, effects: null, shares: null }
  // Assign floating-point reconciliation residue to the last factor that changed.
  // An untouched trailing factor must retain an exact zero effect.
  const reconciliationIndex = changedIndices[changedIndices.length - 1]
  values[reconciliationIndex] = safeAdd(values[reconciliationIndex], totalEffect - attributedTotal) ?? values[reconciliationIndex]
  const effects = Object.fromEntries(factors.map((factor, index) => [factor.key, values[index]]))
  const shares = Object.fromEntries(factors.map((factor, index) => {
    const ratio = totalEffect === 0 ? null : safeDivide(values[index], totalEffect)
    const share = ratio === null ? null : ratio * 100
    return [factor.key, share !== null && Number.isFinite(share) ? share : null]
  }))
  return { totalEffect, effects, shares }
}
