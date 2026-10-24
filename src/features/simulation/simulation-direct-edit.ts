import { createContext, useContext } from 'react'
import { compareExactDecimals, parseExactDecimal } from '../../core/utils/exact-decimal'

export function simulationDirectEditValueToken(value: number | null | string | undefined, exactValue?: string | null): string {
  return exactValue ?? (value == null ? '' : String(value))
}

export function areSimulationDirectEditValueTokensEqual(left: string, right: string): boolean {
  if (left === right) return true
  const leftDecimal = parseExactDecimal(left)
  const rightDecimal = parseExactDecimal(right)
  return leftDecimal !== null && rightDecimal !== null && compareExactDecimals(leftDecimal, rightDecimal) === 0
}

// Direct-source provenance is presentation state; history still owns commits.
export const SimulationDirectEditContext = createContext({
  sourceIds: [] as readonly string[],
  edit: (_sourceId: string, _beforeValue: string, _afterValue: string, update: () => void) => update()
})

export function useSimulationDirectEdit(sourceId: string, currentValue: string) {
  const provenance = useContext(SimulationDirectEditContext)
  return {
    directEditPending: provenance.sourceIds.includes(sourceId),
    edit: (nextValue: string, update: () => void) => provenance.edit(sourceId, currentValue, nextValue, update)
  }
}
