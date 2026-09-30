/**
 * Safe Session Storage Adapter with error fallback.
 */

export const STORAGE_KEYS = {
  SESSIONS: 'costbreakdown_sessions',
  ACTIVE_ID: 'costbreakdown_active_id',
  ACTIVE_TAB: 'costbreakdown_active_tab',
  RCA_SIMULATION_STATES: 'costbreakdown_rca_simulation_states',
  UOM_LIST: 'costbreakdown_uom_list'
} as const

export function loadFromSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch (e) {
    console.warn(`[sessionStorage] Error reading ${key}`, e)
  }
  return fallback
}

export function saveToSession(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`[sessionStorage] Error writing ${key}`, e)
  }
}
