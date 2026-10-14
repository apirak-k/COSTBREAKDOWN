export type ActiveTab = 'master' | 'breakdown' | 'simulation'

export function normalizeActiveTab(value: unknown): ActiveTab {
  if (value === 'dashboard') return 'simulation'
  if (value === 'candidate' || value === 'rca') return 'breakdown'
  return value === 'breakdown' || value === 'simulation' ? value : 'master'
}
