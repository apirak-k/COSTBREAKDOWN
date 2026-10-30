import type { CostSnapshot } from '../core/types'

export interface WorkCenterIdentityUpdate {
  id: string
  changes: { workCenterCode?: string }
}

export function propagateWorkCenterRenames(
  previous: CostSnapshot,
  normalizedNext: CostSnapshot,
  updates: readonly WorkCenterIdentityUpdate[],
  routingRowIdsByRateId?: ReadonlyMap<string, ReadonlySet<string>>
): CostSnapshot {
  const routeAssignments = new Map<string, string>()
  const nextRatesById = new Map(normalizedNext.rates.map(rate => [rate.id, rate]))

  updates.forEach(({ id, changes }) => {
    if (!Object.prototype.hasOwnProperty.call(changes, 'workCenterCode')) return
    const previousRate = previous.rates.find(rate => rate.id === id)
    const nextRate = nextRatesById.get(id)
    if (!previousRate || !nextRate || previousRate.workCenterCode === nextRate.workCenterCode) return

    const explicitTargets = routingRowIdsByRateId?.get(id)
    const linkedRoutingIds = explicitTargets ?? new Set(
      previous.routing
        .filter(step => step.workCenterId?.trim().toLocaleLowerCase() === previousRate.workCenterCode.trim().toLocaleLowerCase())
        .map(step => step.id)
    )
    linkedRoutingIds.forEach(routeId => routeAssignments.set(routeId, nextRate.workCenterCode))
  })

  if (routeAssignments.size === 0) return normalizedNext
  return {
    ...normalizedNext,
    routing: normalizedNext.routing.map(step => {
      const workCenterId = routeAssignments.get(step.id)
      return workCenterId === undefined ? step : { ...step, workCenterId }
    })
  }
}
