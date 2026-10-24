import { createContext, useContext } from 'react'

// Presentation follows the existing pending history edit; it never owns a commit.
export const SimulationDirectEditContext = createContext({
  sourceId: null as string | null,
  edit: (_sourceId: string, update: () => void) => update()
})

export function useSimulationDirectEdit(sourceId: string) {
  const pending = useContext(SimulationDirectEditContext)
  return {
    directEditPending: pending.sourceId === sourceId,
    edit: (update: () => void) => pending.edit(sourceId, update)
  }
}
