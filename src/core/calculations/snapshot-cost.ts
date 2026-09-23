import { safeDivide } from '../utils/guards'
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

  let materialTotal = 0
  let materialKnown = snapshot.bom.length > 0
  if (!materialKnown) warnings.add('Missing BOM data. No BOM rows found')
  snapshot.bom.forEach(item => {
    const consumption = finiteValue(item.consumption, `BOM ${item.id} consumption`, warnings)
    const price = finiteValue(item.price, `BOM ${item.id} price`, warnings)
    const loss = finiteValue(item.loss, `BOM ${item.id} loss`, warnings)
    if (consumption === null || price === null || loss === null) {
      materialKnown = false
      return
    }
    materialTotal += consumption * price * (1 + loss)
  })

  let laborTotal = 0
  let burdenTotal = 0
  let laborKnown = snapshot.routing.length > 0
  let burdenKnown = snapshot.routing.length > 0
  if (snapshot.routing.length === 0) warnings.add('Missing routing data. No Routing rows found')

  for (const step of snapshot.routing) {
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

    const runtime = safeDivide(manning, capacity * yieldValue)

    const laborRate = finiteValue(rate?.laborRate ?? null, `Work Center ${step.workCenterId ?? 'unknown'} labor rate`, warnings)
    const burdenRate = finiteValue(rate?.burdenRate ?? null, `Work Center ${step.workCenterId ?? 'unknown'} burden rate`, warnings)

    if (laborRate === null) laborKnown = false
    else if (laborKnown) laborTotal += runtime * laborRate

    if (burdenRate === null) burdenKnown = false
    else if (burdenKnown) burdenTotal += runtime * burdenRate
  }

  const warningList = [...warnings]
  const hasMissing = warningList.some(warning => warning.includes('Missing'))
  const material = materialKnown ? materialTotal : null
  const labor = laborKnown ? laborTotal : null
  const burden = burdenKnown ? burdenTotal : null
  const total = material === null || labor === null || burden === null
    ? null
    : material + labor + burden

  return {
    snapshotId: snapshot.id,
    material,
    labor,
    burden,
    total,
    status: hasMissing ? 'missing' : warningList.length > 0 ? 'estimated' : 'complete',
    warnings: warningList
  }
}

export function areSnapshotCostsComplete(
  referenceCost: Pick<SnapshotCost, 'status'>,
  currentCost: Pick<SnapshotCost, 'status'>
): boolean {
  return referenceCost.status === 'complete' && currentCost.status === 'complete'
}
