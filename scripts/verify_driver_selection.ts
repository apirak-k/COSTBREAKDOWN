import assert from 'node:assert/strict'
import { getSelectedDrivers, toggleDriverKey } from '../src/features/candidate-selection/driver-selection'

const drivers = [
  { driverKey: 'bom:a', driverName: 'A' },
  { driverKey: 'routing:b', driverName: 'B' },
  { driverKey: 'bom:c', driverName: 'C' }
] as any

let selected = toggleDriverKey([], 'bom:a')
selected = toggleDriverKey(selected, 'routing:b')
assert.deepEqual(selected, ['bom:a', 'routing:b'])

const reordered = [drivers[2], drivers[0], drivers[1]]
assert.deepEqual(getSelectedDrivers(reordered, selected).map(driver => driver.driverKey), ['bom:a', 'routing:b'])

selected = toggleDriverKey(selected, 'bom:a')
assert.deepEqual(selected, ['routing:b'], 'toggling must remove only the selected stable identity')

console.log('driver selection verification passed')
