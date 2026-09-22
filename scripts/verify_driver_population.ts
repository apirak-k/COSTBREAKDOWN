import assert from 'node:assert/strict'
import { calculateTopDrivers } from '../src/core/calculations/top-drivers'

const makeBom = (id: string, activePrice: number) => ({
  id,
  itemCode: id,
  description: `Material ${id}`,
  consumption: 1,
  unit: 'EA',
  basePrice: 10,
  activePrice,
  baseLoss: 0,
  activeLoss: 0,
  sourceRef: `population:${id}`
})

const drivers = calculateTopDrivers(
  Array.from({ length: 12 }, (_, index) => {
    if (index === 10) return makeBom(`item-${index + 1}`, 10)
    if (index === 11) return makeBom(`item-${index + 1}`, 8)
    return makeBom(`item-${index + 1}`, 20 - index * 0.25)
  }),
  [],
  []
)

assert.equal(drivers.length, 12, 'all valid BOM findings must remain inspectable beyond the old Top 10 limit')
assert.equal(drivers[0]?.costGap && drivers[0].costGap >= (drivers[1]?.costGap ?? 0), true, 'default order must be descending by cost impact')
assert.equal(drivers.find(driver => driver.driverKey === 'bom:item-11')?.impact, 'neutral', 'zero gap must be explicit')
assert.equal(drivers.find(driver => driver.driverKey === 'bom:item-12')?.impact, 'favorable', 'negative gap must be explicit')

console.log('driver population verification passed')
