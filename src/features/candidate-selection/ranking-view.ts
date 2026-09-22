import type { CostDriver, CostDriverImpact } from '../../core'

export type RankingViewImpact = 'all' | CostDriverImpact
export type RankingSortField = 'rank' | 'costGap' | 'pctContribution' | 'driverName' | 'category'
export type RankingSortDirection = 'asc' | 'desc'

export interface RankingViewState {
  category: string
  impact: RankingViewImpact
  sortBy: RankingSortField
  sortDirection: RankingSortDirection
}

export function getRankingCategories(drivers: CostDriver[]): string[] {
  return Array.from(new Set(drivers.map(driver => driver.category)))
    .sort((a, b) => a.localeCompare(b))
}

export function getVisibleDrivers(drivers: CostDriver[], state: RankingViewState): CostDriver[] {
  const filtered = drivers.filter(driver => {
    const matchesCategory = state.category === 'all' || driver.category === state.category
    const matchesImpact = state.impact === 'all' || driver.impact === state.impact
    return matchesCategory && matchesImpact
  })

  const direction = state.sortDirection === 'asc' ? 1 : -1

  return filtered.slice().sort((a, b) => {
    let comparison = 0

    switch (state.sortBy) {
      case 'rank':
        comparison = a.rank - b.rank
        break
      case 'costGap':
        comparison = a.costGap - b.costGap
        break
      case 'pctContribution':
        comparison = a.pctContribution - b.pctContribution
        break
      case 'driverName':
        comparison = a.driverName.localeCompare(b.driverName)
        break
      case 'category':
        comparison = a.category.localeCompare(b.category)
        break
    }

    return comparison !== 0 ? comparison * direction : a.driverKey.localeCompare(b.driverKey)
  })
}
