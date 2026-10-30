export type CandidateTableType = 'bom' | 'routing'

export type CandidateManualOrders = Record<CandidateTableType, string[] | null>

export interface CandidateReorderHistory {
  manualOrders: CandidateManualOrders
  undo: CandidateManualOrders[]
  redo: CandidateManualOrders[]
}

export function createCandidateReorderHistory(): CandidateReorderHistory {
  return { manualOrders: { bom: null, routing: null }, undo: [], redo: [] }
}

function copyOrders(orders: CandidateManualOrders): CandidateManualOrders {
  return {
    bom: orders.bom ? [...orders.bom] : null,
    routing: orders.routing ? [...orders.routing] : null
  }
}

export function recordCandidateReorder(
  history: CandidateReorderHistory,
  type: CandidateTableType,
  keys: readonly string[]
): CandidateReorderHistory {
  const nextOrder = [...keys]
  const previousOrder = history.manualOrders[type]
  if (previousOrder && previousOrder.length === nextOrder.length && previousOrder.every((key, index) => key === nextOrder[index])) return history

  return {
    manualOrders: { ...copyOrders(history.manualOrders), [type]: nextOrder },
    undo: [...history.undo, copyOrders(history.manualOrders)],
    redo: []
  }
}

export function undoCandidateReorder(history: CandidateReorderHistory): CandidateReorderHistory {
  const previousOrders = history.undo.at(-1)
  if (!previousOrders) return history
  return {
    manualOrders: copyOrders(previousOrders),
    undo: history.undo.slice(0, -1),
    redo: [...history.redo, copyOrders(history.manualOrders)]
  }
}

export function redoCandidateReorder(history: CandidateReorderHistory): CandidateReorderHistory {
  const nextOrders = history.redo.at(-1)
  if (!nextOrders) return history
  return {
    manualOrders: copyOrders(nextOrders),
    undo: [...history.undo, copyOrders(history.manualOrders)],
    redo: history.redo.slice(0, -1)
  }
}

export function resetCandidateReorderHistory(): CandidateReorderHistory {
  return createCandidateReorderHistory()
}

export function reorderCandidateRowKeys(
  keys: readonly string[],
  sourceKey: string,
  targetKey: string,
  insertAfterTarget: boolean,
  movingKeys: readonly string[] = [sourceKey]
): string[] {
  const moving = new Set(movingKeys.includes(sourceKey) ? movingKeys : [sourceKey])
  const group = keys.filter(key => moving.has(key))
  if (!group.length || !keys.includes(targetKey) || moving.has(targetKey)) return [...keys]

  const remaining = keys.filter(key => !moving.has(key))
  const targetIndex = remaining.indexOf(targetKey)
  remaining.splice(targetIndex + (insertAfterTarget ? 1 : 0), 0, ...group)
  return remaining
}
