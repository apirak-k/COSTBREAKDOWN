import { safeDivide } from '../utils/guards'
import { CostSnapshot, SnapshotCost, SnapshotWorkCenterRate } from '../types'

function finiteValue(value: number | null, label: string, warnings: Set<string>): number {
  if (value === null || !Number.isFinite(value)) {
    warnings.add(`Missing or invalid ${label}`)
    return 0
  }
  return value
}

function rateMap(rates: SnapshotWorkCenterRate[]): Map<string, SnapshotWorkCenterRate> {
  return new Map(rates.map(rate => [rate.workCenterCode, rate]))
}

/** Calculates one snapshot without mutating the source data. */
export function calculateSnapshotCost(snapshot: CostSnapshot): SnapshotCost {
  const warnings = new Set<string>()
  const rates = rateMap(snapshot.rates)

  const material = snapshot.bom.reduce((total, item) => {
    const consumption = finiteValue(item.consumption, `BOM ${item.id} consumption`, warnings)
    const price = finiteValue(item.price, `BOM ${item.id} price`, warnings)
    const loss = finiteValue(item.loss, `BOM ${item.id} loss`, warnings)
    return total + consumption * price * (1 + loss)
  }, 0)

  let labor = 0
  let burden = 0

  snapshot.routing.forEach(step => {
    const manning = finiteValue(step.manning, `Routing ${step.id} manning`, warnings)
    const capacity = finiteValue(step.capacity, `Routing ${step.id} capacity`, warnings)
    const yieldValue = finiteValue(step.yield, `Routing ${step.id} yield`, warnings)
    const rate = step.workCenterId ? rates.get(step.workCenterId) : undefined

    if (!rate) {
      warnings.add(`Missing Work Center rate for Routing ${step.id}`)
    }

    const runtime = capacity > 0 && yieldValue > 0
      ? safeDivide(manning, capacity * yieldValue)
      : 0

    if (capacity <= 0) warnings.add(`Invalid Routing ${step.id} capacity`)
    if (yieldValue <= 0) warnings.add(`Invalid Routing ${step.id} yield`)

    labor += runtime * finiteValue(rate?.laborRate ?? null, `Work Center ${step.workCenterId ?? 'unknown'} labor rate`, warnings)
    burden += runtime * finiteValue(rate?.burdenRate ?? null, `Work Center ${step.workCenterId ?? 'unknown'} burden rate`, warnings)
  })

  const warningList = [...warnings]
  const hasMissing = warningList.some(warning => warning.includes('Missing'))

  return {
    snapshotId: snapshot.id,
    material,
    labor,
    burden,
    total: material + labor + burden,
    status: hasMissing ? 'missing' : warningList.length > 0 ? 'estimated' : 'complete',
    warnings: warningList
  }
}
