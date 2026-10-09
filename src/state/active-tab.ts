export type ActiveTab = 'master' | 'breakdown' | 'candidate' | 'simulation'

export function normalizeActiveTab(value: unknown): ActiveTab {
  if (value === 'dashboard') return 'simulation'
  if (value === 'rca') return 'candidate'
  return value === 'breakdown' || value === 'candidate' || value === 'simulation' ? value : 'master'
}
