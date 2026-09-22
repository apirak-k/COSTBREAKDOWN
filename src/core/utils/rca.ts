import type { CostDriver, DriverRcaDraft, DriverRcaRecord } from '../types'

export function createDriverRcaRecord(
  driver: CostDriver,
  draft: DriverRcaDraft,
  updatedAt: string
): DriverRcaRecord {
  return {
    ...draft,
    driverKey: driver.driverKey,
    sourceType: driver.sourceType,
    sourceId: driver.sourceId,
    driverName: driver.driverName,
    category: driver.category,
    baseParameter: driver.baseParameter,
    activeParameter: driver.activeParameter,
    costGap: driver.costGap,
    sourceRef: driver.sourceRef,
    updatedAt
  }
}
