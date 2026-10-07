import { safeAdd, safeDivide, safeMultiply } from '../utils/guards'
import { CostSnapshot, SnapshotCost, SnapshotWorkCenterRate } from '../types'

function finiteValue(value: number | null, label: string, warnings: Set<string>): number | null {
  if (value === null || !Number.isFinite(value)) {
    warnings.add(`Missing or invalid ${label}`)
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

  let materialTotal: number | null = 0
  let materialKnown = bom.length > 0
  if (!materialKnown) warnings.add('Missing BOM data. No BOM rows found')
  bom.forEach(item => {
    const consumption = finiteValue(item.consumption, `BOM ${item.id} consumption`, warnings)
    const price = finiteValue(item.price, `BOM ${item.id} price`, warnings)
    const loss = finiteValue(item.loss, `BOM ${item.id} loss`, warnings)
    if (consumption === null || price === null || loss === null) {
      materialKnown = false
      return
    }
    const lossFactor = safeAdd(1, loss)
    const rowCost = lossFactor === null ? null : safeMultiply(consumption, price, lossFactor)
    const nextTotal = rowCost === null || materialTotal === null ? null : safeAdd(materialTotal, rowCost)
    if (rowCost === null || nextTotal === null) {
      materialKnown = false
      materialTotal = null
      warnings.add(`Invalid or non-finite BOM ${item.id} material cost or material total`)
      return
    }
    materialTotal = nextTotal
  })

  let laborTotal: number | null = 0
  let burdenTotal: number | null = 0
  let laborKnown = routing.length > 0
  let burdenKnown = routing.length > 0
  if (routing.length === 0) warnings.add('Missing routing data. No Routing rows found')

  for (const step of routing) {
    const manning = finiteValue(step.manning, `Routing ${step.id} manning`, warnings)
    const capacity = finiteValue(step.capacity, `Routing ${step.id} capacity`, warnings)
    const yieldValue = finiteValue(step.yield, `Routing ${step.id} yield`, warnings)
    const rate = step.workCenterId ? rates.get(normalizeKey(step.workCenterId)) : undefined

    if (!rate) {
      warnings.add(`Missing Work Center rate for Routing ${step.id}`)
    }

    if (manning === null || capacity === null || yieldValue === null) {
      laborKnown = false
      burdenKnown = false
      continue
    }

    if (capacity <= 0) warnings.add(`Invalid Routing ${step.id} capacity`)
    if (yieldValue <= 0) warnings.add(`Invalid Routing ${step.id} yield`)

    if (capacity <= 0 || yieldValue <= 0) {
      laborKnown = false
      burdenKnown = false
      continue
    }

    const denominator = safeMultiply(capacity, yieldValue)
    const runtime = denominator === null ? null : safeDivide(manning, denominator)
    if (runtime === null) {
      laborKnown = false
      burdenKnown = false
      warnings.add(`Invalid or non-finite Routing ${step.id} factor`)
      continue
    }

    const laborRate = finiteValue(rate?.laborRate ?? null, `Work Center ${step.workCenterId ?? 'unknown'} labor rate`, warnings)
    const burdenRate = finiteValue(rate?.burdenRate ?? null, `Work Center ${step.workCenterId ?? 'unknown'} burden rate`, warnings)

    if (laborRate === null) {
      laborKnown = false
      laborTotal = null
    } else if (laborKnown && laborTotal !== null) {
      const rowCost = safeMultiply(runtime, laborRate)
      const nextLaborTotal: number | null = rowCost === null ? null : safeAdd(laborTotal, rowCost)
      if (nextLaborTotal === null) {
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
      const rowCost = safeMultiply(runtime, burdenRate)
      const nextBurdenTotal: number | null = rowCost === null ? null : safeAdd(burdenTotal, rowCost)
      if (nextBurdenTotal === null) {
        burdenKnown = false
        burdenTotal = null
        warnings.add(`Invalid or non-finite Routing ${step.id} burden cost or burden total`)
      } else {
        burdenTotal = nextBurdenTotal
      }
    }
  }

  const material = materialKnown ? materialTotal : null
  const labor = laborKnown ? laborTotal : null
  const burden = burdenKnown ? burdenTotal : null
  let total: number | null = null
  if (!missingIdentity && material !== null && labor !== null && burden !== null) {
    total = safeAdd(material, labor, burden)
    if (total === null) warnings.add('Invalid or non-finite Standard Cost total')
  }
  const unavailable = material === null || labor === null || burden === null || total === null

  return {
    snapshotId: snapshot.id,
    material,
    labor,
    burden,
    total,
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
