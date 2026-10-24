import {
  addExactDecimals,
  divideExactDecimals,
  exactDecimalInputValue,
  exactDecimalToNumber,
  exactDecimalToString,
  multiplyExactDecimals,
  parseExactDecimal,
  type ExactDecimal
} from '../utils/exact-decimal'
import { CostSnapshot, SnapshotCost, SnapshotWorkCenterRate } from '../types'
import { isMasterDataNumericValueValid, type MasterDataNumericField } from '../utils/master-data-validation'

function validValue(
  value: number | null,
  field: MasterDataNumericField,
  label: string,
  warnings: Set<string>
): number | null {
  if (value == null) {
    warnings.add(`Missing or invalid ${label}`)
    return null
  }
  if (!isMasterDataNumericValueValid(field, value)) {
    warnings.add(`Invalid ${label}`)
    return null
  }
  return value
}

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function rateMap(rates: SnapshotWorkCenterRate[], warnings: Set<string>): Map<string, SnapshotWorkCenterRate | null> {
  const map = new Map<string, SnapshotWorkCenterRate | null>()
  rates.forEach(rate => {
    const key = normalizeKey(rate.workCenterCode)
    if (!key) return
    if (map.has(key)) {
      map.set(key, null)
      warnings.add(`Ambiguous duplicate Work Center rate for ${rate.workCenterCode}`)
      return
    }
    map.set(key, rate)
  })
  return map
}

/** Calculates one snapshot without mutating the source data. */
export function calculateSnapshotCost(snapshot: CostSnapshot): SnapshotCost {
  const warnings = new Set<string>()
  const rates = rateMap(snapshot.rates, warnings)
  const bom = snapshot.bom
  const routing = snapshot.routing
  const missingIdentity = snapshot.rates.some(rate => !normalizeKey(rate.workCenterCode))
    || bom.some(item => !normalizeKey(item.description))
    || routing.some(step => !normalizeKey(step.processName))
  if (snapshot.rates.some(rate => !normalizeKey(rate.workCenterCode))) warnings.add('Missing Work Center identity')
  if (bom.some(item => !normalizeKey(item.description))) warnings.add('Missing BOM identity')
  if (routing.some(step => !normalizeKey(step.processName))) warnings.add('Missing Routing identity')

  let materialTotal: ExactDecimal | null = parseExactDecimal(0)
  let materialKnown = bom.length > 0
  if (!materialKnown) warnings.add('Missing BOM data. No BOM rows found')
  bom.forEach(item => {
    const consumption = validValue(item.consumption, 'consumption', `BOM ${item.id} consumption`, warnings)
    const price = validValue(item.price, 'price', `BOM ${item.id} price`, warnings)
    const loss = validValue(item.loss, 'loss', `BOM ${item.id} loss`, warnings)
    if (consumption === null || price === null || loss === null) {
      materialKnown = false
      return
    }
    const consumptionExact = exactDecimalInputValue(consumption, item.exactDecimalInputs?.consumption)
    const priceExact = exactDecimalInputValue(price, item.exactDecimalInputs?.price)
    const lossExact = exactDecimalInputValue(loss, item.exactDecimalInputs?.loss, true)
    const rowCost = consumptionExact && priceExact && lossExact
      ? multiplyExactDecimals(consumptionExact, priceExact, addExactDecimals(parseExactDecimal(1)!, lossExact))
      : null
    const nextTotal = rowCost && materialTotal ? addExactDecimals(materialTotal, rowCost) : null
    if (rowCost === null || nextTotal === null || exactDecimalToNumber(rowCost) === null || exactDecimalToNumber(nextTotal) === null) {
      materialKnown = false
      materialTotal = null
      warnings.add(`Invalid or non-finite BOM ${item.id} material cost or material total`)
      return
    }
    materialTotal = nextTotal
  })

  let laborTotal: ExactDecimal | null = parseExactDecimal(0)
  let burdenTotal: ExactDecimal | null = parseExactDecimal(0)
  let laborKnown = routing.length > 0
  let burdenKnown = routing.length > 0
  if (routing.length === 0) warnings.add('Missing routing data. No Routing rows found')

  for (const step of routing) {
    const manning = validValue(step.manning, 'manning', `Routing ${step.id} manning`, warnings)
    const capacity = validValue(step.capacity, 'capacity', `Routing ${step.id} capacity`, warnings)
    const yieldValue = validValue(step.yield, 'yield', `Routing ${step.id} yield`, warnings)
    const rate = step.workCenterId ? rates.get(normalizeKey(step.workCenterId)) : undefined

    if (!rate) {
      warnings.add(`Missing Work Center rate for Routing ${step.id}`)
    }

    if (manning === null || capacity === null || yieldValue === null) {
      laborKnown = false
      burdenKnown = false
      continue
    }

    const manningExact = exactDecimalInputValue(manning, step.exactDecimalInputs?.manning)
    const capacityExact = exactDecimalInputValue(capacity, step.exactDecimalInputs?.capacity)
    const yieldExact = exactDecimalInputValue(yieldValue, step.exactDecimalInputs?.yield, true)
    const denominator = capacityExact && yieldExact ? multiplyExactDecimals(capacityExact, yieldExact) : null
    const runtime = manningExact && denominator ? divideExactDecimals(manningExact, denominator) : null
    if (runtime === null || exactDecimalToNumber(runtime) === null) {
      laborKnown = false
      burdenKnown = false
      warnings.add(`Invalid or non-finite Routing ${step.id} factor`)
      continue
    }

    const laborRate = validValue(rate?.laborRate ?? null, 'laborRate', `Work Center ${step.workCenterId ?? 'unknown'} labor rate`, warnings)
    const burdenRate = validValue(rate?.burdenRate ?? null, 'burdenRate', `Work Center ${step.workCenterId ?? 'unknown'} burden rate`, warnings)

    if (laborRate === null) {
      laborKnown = false
      laborTotal = null
    } else if (laborKnown && laborTotal !== null) {
      const laborRateExact = exactDecimalInputValue(laborRate, rate?.exactDecimalInputs?.laborRate)
      const rowCost = laborRateExact ? multiplyExactDecimals(runtime, laborRateExact) : null
      const nextLaborTotal = rowCost === null ? null : addExactDecimals(laborTotal, rowCost)
      if (nextLaborTotal === null || exactDecimalToNumber(rowCost!) === null || exactDecimalToNumber(nextLaborTotal) === null) {
        laborKnown = false
        laborTotal = null
        warnings.add(`Invalid or non-finite Routing ${step.id} labor cost or labor total`)
      } else {
        laborTotal = nextLaborTotal
      }
    }

    if (burdenRate === null) {
      burdenKnown = false
      burdenTotal = null
    } else if (burdenKnown && burdenTotal !== null) {
      const burdenRateExact = exactDecimalInputValue(burdenRate, rate?.exactDecimalInputs?.burdenRate)
      const rowCost = burdenRateExact ? multiplyExactDecimals(runtime, burdenRateExact) : null
      const nextBurdenTotal = rowCost === null ? null : addExactDecimals(burdenTotal, rowCost)
      if (nextBurdenTotal === null || exactDecimalToNumber(rowCost!) === null || exactDecimalToNumber(nextBurdenTotal) === null) {
        burdenKnown = false
        burdenTotal = null
        warnings.add(`Invalid or non-finite Routing ${step.id} burden cost or burden total`)
      } else {
        burdenTotal = nextBurdenTotal
      }
    }
  }

  const exactMaterial = materialKnown ? materialTotal : null
  const exactLabor = laborKnown ? laborTotal : null
  const exactBurden = burdenKnown ? burdenTotal : null
  const material = exactMaterial ? exactDecimalToNumber(exactMaterial) : null
  const labor = exactLabor ? exactDecimalToNumber(exactLabor) : null
  const burden = exactBurden ? exactDecimalToNumber(exactBurden) : null
  if (materialKnown && material === null) warnings.add('Invalid or non-finite material total')
  if (laborKnown && labor === null) warnings.add('Invalid or non-finite labor total')
  if (burdenKnown && burden === null) warnings.add('Invalid or non-finite burden total')
  let total: number | null = null
  let exactTotal: ExactDecimal | null = null
  if (!missingIdentity && material !== null && labor !== null && burden !== null) {
    if (exactMaterial && exactLabor && exactBurden) {
      exactTotal = addExactDecimals(exactMaterial, exactLabor, exactBurden)
      total = exactDecimalToNumber(exactTotal)
    }
    if (total === null) warnings.add('Invalid or non-finite Standard Cost total')
  }
  const unavailable = material === null || labor === null || burden === null || total === null

  return {
    snapshotId: snapshot.id,
    material,
    labor,
    burden,
    total,
    exactValues: {
      material: exactMaterial ? exactDecimalToString(exactMaterial) : null,
      labor: exactLabor ? exactDecimalToString(exactLabor) : null,
      burden: exactBurden ? exactDecimalToString(exactBurden) : null,
      total: exactTotal ? exactDecimalToString(exactTotal) : null
    },
    status: unavailable ? 'missing' : warnings.size > 0 ? 'estimated' : 'complete',
    warnings: [...warnings]
  }
}

export function areSnapshotCostsComplete(
  referenceCost: Pick<SnapshotCost, 'status'>,
  currentCost: Pick<SnapshotCost, 'status'>
): boolean {
  return referenceCost.status === 'complete' && currentCost.status === 'complete'
}
