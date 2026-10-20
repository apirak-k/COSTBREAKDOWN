export type ActiveTab = 'master' | 'breakdown' | 'simulation'

export function normalizeActiveTab(value: unknown): ActiveTab {
  return value === 'master' || value === 'breakdown' || value === 'simulation' ? value : 'master'
}
