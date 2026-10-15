import { useEffect, useRef } from 'react'

export type TransientDismissReason = 'escape' | 'workspace'

type TransientDismissHandler = (reason: TransientDismissReason) => void

interface TransientInteraction {
  id: symbol
  dismiss: TransientDismissHandler
}

const transientInteractions: TransientInteraction[] = []

export function registerTransientInteraction(dismiss: TransientDismissHandler): () => void {
  const interaction = { id: Symbol('transient-interaction'), dismiss }
  transientInteractions.push(interaction)
  return () => {
    const index = transientInteractions.findIndex(candidate => candidate.id === interaction.id)
    if (index >= 0) transientInteractions.splice(index, 1)
  }
}

export function dismissTopmostTransientInteraction(reason: TransientDismissReason): boolean {
  const interaction = transientInteractions.pop()
  if (!interaction) return false
  interaction.dismiss(reason)
  return true
}

export function dismissTransientInteractions(reason: TransientDismissReason): void {
  transientInteractions.splice(0).reverse().forEach(interaction => interaction.dismiss(reason))
}

export function useTransientInteraction(isOpen: boolean, dismiss: TransientDismissHandler): void {
  const dismissRef = useRef(dismiss)
  dismissRef.current = dismiss

  useEffect(() => {
    if (!isOpen) return
    return registerTransientInteraction(reason => dismissRef.current(reason))
  }, [isOpen])
}

export const MASTER_DATA_CLEAR_CELL_FOCUS_EVENT = 'master-data:clear-cell-focus'

export function clearTemporarySpreadsheetCellFocus(): void {
  window.dispatchEvent(new Event(MASTER_DATA_CLEAR_CELL_FOCUS_EVENT))
}

const safeWorkspaceInteractiveTargets = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="dialog"]',
  '[role="slider"]',
  '[role="tooltip"]',
  '[data-grid-cell="true"]',
  '[data-safe-workspace-interaction="true"]',
  '[contenteditable="true"]'
].join(',')

export function isSafeWorkspaceDismissTarget(target: EventTarget | null): boolean {
  return !(target instanceof Element && target.closest(safeWorkspaceInteractiveTargets))
}
