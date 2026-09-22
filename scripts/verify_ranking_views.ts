import assert from 'node:assert/strict'
import { getRankingCategories, getVisibleDrivers } from '../src/features/candidate-selection/ranking-view'

const driver = (driverKey: string, category: string, driverName: string, costGap: number, impact: 'unfavorable' | 'neutral' | 'favorable') => ({
  driverKey,
  sourceType: 'bom' as const,
  sourceId: driverKey,
  impact,
  id: 1,
  category,
  driverName,
  rcaParameter: '',
  baseParameter: 10,
  activeParameter: 10 + costGap,
  costGap,
  tieBreakerScore: costGap,
  rank: costGap > 0 ? 1 : 2,
  pctContribution: costGap > 0 ? 100 : 0,
  controllability: '' as const,
  actionPlan: ''
})

const drivers = [
  driver('bom:b', 'Direct Material', 'B Material', 2, 'unfavorable'),
  driver('routing:a', 'Cutting', 'A Process', 5, 'unfavorable'),
  driver('bom:c', 'Direct Material', 'C Material', -1, 'favorable')
]

assert.deepEqual(getRankingCategories(drivers), ['Cutting', 'Direct Material'])

const categoryView = getVisibleDrivers(drivers, {
  category: 'Direct Material',
  impact: 'all',
  sortBy: 'driverName',
  sortDirection: 'asc'
})
assert.deepEqual(categoryView.map(item => item.driverKey), ['bom:b', 'bom:c'])

const impactView = getVisibleDrivers(drivers, {
  category: 'all',
  impact: 'unfavorable',
  sortBy: 'costGap',
  sortDirection: 'desc'
})
assert.deepEqual(impactView.map(item => item.driverKey), ['routing:a', 'bom:b'])
assert.deepEqual(drivers.map(item => item.driverKey), ['bom:b', 'routing:a', 'bom:c'], 'view changes must not mutate source order')

console.log('ranking view verification passed')
