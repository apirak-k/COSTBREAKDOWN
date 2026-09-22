import type { CostDriver } from '../../core'

export function toggleDriverKey(selectedDriverKeys: string[], driverKey: string): string[] {
  return selectedDriverKeys.includes(driverKey)
    ? selectedDriverKeys.filter(key => key !== driverKey)
    : [...selectedDriverKeys, driverKey]
}

export function getSelectedDrivers(drivers: CostDriver[], selectedDriverKeys: string[]): CostDriver[] {
  const selected = new Set(selectedDriverKeys)
  return drivers.filter(driver => selected.has(driver.driverKey))
}
