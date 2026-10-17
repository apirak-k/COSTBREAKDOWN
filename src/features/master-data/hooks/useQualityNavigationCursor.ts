import { useCallback, useEffect, useRef } from 'react'

export interface QualityNavigationCursorState {
  contextKey: string
  itemIds: string[]
  nextIndex: number
}

export function advanceQualityNavigationCursor<T extends { id: string }>(
  cursor: QualityNavigationCursorState | null,
  contextKey: string,
  items: readonly T[]
): { item: T | undefined; cursor: QualityNavigationCursorState } {
  const itemIds = items.map(item => item.id)
  let targetIndex = 0

  if (items.length > 0 && cursor?.contextKey === contextKey && cursor.itemIds.length > 0) {
    const currentIndexById = new Map(itemIds.map((id, index) => [id, index]))
    for (let offset = 0; offset < cursor.itemIds.length; offset += 1) {
      const previousId = cursor.itemIds[(cursor.nextIndex + offset) % cursor.itemIds.length]
      const currentIndex = currentIndexById.get(previousId)
      if (currentIndex !== undefined) {
        targetIndex = currentIndex
        break
      }
    }
  }

  return {
    item: items[targetIndex],
    cursor: {
      contextKey,
      itemIds,
      nextIndex: items.length > 0 ? (targetIndex + 1) % items.length : 0
    }
  }
}

export function useQualityNavigationCursor<T extends { id: string }>(contextKey: string) {
  const cursorRef = useRef<QualityNavigationCursorState>({ contextKey, itemIds: [], nextIndex: 0 })

  useEffect(() => {
    cursorRef.current = { contextKey, itemIds: [], nextIndex: 0 }
  }, [contextKey])

  return useCallback((items: readonly T[]): T | undefined => {
    const next = advanceQualityNavigationCursor(cursorRef.current, contextKey, items)
    cursorRef.current = next.cursor
    return next.item
  }, [contextKey])
}
