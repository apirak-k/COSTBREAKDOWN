import { calculateTopDrivers } from '../src/core/calculations/top-drivers'

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message)
  }
}

const bom = (id: string, activePrice: number) => ({
  id,
  itemCode: id,
  description: 'Shared material label',
  consumption: 1,
  unit: 'EA',
  basePrice: 10,
  activePrice,
  baseLoss: 0,
  activeLoss: 0,
  sourceRef: `bom:${id}`
})

const savedDrivers = [{
  id: 99,
  driverKey: 'bom:b',
  category: 'Direct Material',
  driverName: 'Shared material label',
  rcaParameter: '',
  baseParameter: 10,
  activeParameter: 30,
  costGap: 20,
  tieBreakerScore: 20,
  rank: 1,
  pctContribution: 100,
  controllability: 'Controllable',
  actionPlan: 'Review supplier contract',
  canInfluence: true,
  requirementFit: true
}]

const ordered = calculateTopDrivers(
  [bom('a', 20), bom('b', 30)],
  [],
  [],
  savedDrivers
)
const reordered = calculateTopDrivers(
  [bom('b', 30), bom('a', 20)],
  [],
  [],
  savedDrivers
)

const orderedB = ordered.find(driver => driver.driverKey === 'bom:b')
const reorderedB = reordered.find(driver => driver.driverKey === 'bom:b')

assert(orderedB, 'Expected the BOM source identity to be present in the calculated driver')
assert(reorderedB, 'Expected the BOM source identity to survive source ordering changes')
assert(orderedB.controllability === 'Controllable', 'Expected saved controllability to follow the source identity')
assert(reorderedB.actionPlan === 'Review supplier contract', 'Expected saved action to follow the source identity after reordering')

console.log('driver identity verification passed')
