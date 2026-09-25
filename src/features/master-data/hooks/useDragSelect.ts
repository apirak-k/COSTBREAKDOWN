import { useEffect, useRef, useState, useCallback } from 'react'

interface UseDragSelectOptions<T> {
  items: T[]
  getItemId: (item: T) => string
  isEditMode: boolean
}

/**
 * Provides Excel-like click & drag multi-row selection:
 * - Click down on a checkbox cell or handle to begin selecting.
 * - Dragging down/up across rows toggles or extends the selection.
 * - Mouse up anywhere ends the drag mode.
 */
export function useDragSelect<T>({ items, getItemId, isEditMode }: UseDragSelectOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const isDraggingRef = useRef(false)
  const dragTargetStateRef = useRef<boolean>(true) // true = selecting, false = deselecting

  const toggleAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(items.map(getItemId)) : new Set())
  }, [items, getItemId])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const startDrag = useCallback((id: string, e: React.MouseEvent) => {
    // Only primary mouse click
    if (e.button !== 0 || !isEditMode) return
    isDraggingRef.current = true

    // Determine whether this drag is selecting or deselecting
    setSelectedIds(prev => {
      const willSelect = !prev.has(id)
      dragTargetStateRef.current = willSelect
      const next = new Set(prev)
      if (willSelect) next.add(id)
      else next.delete(id)
      return next
    })
  }, [isEditMode])

  const onMouseEnterRow = useCallback((id: string) => {
    if (!isDraggingRef.current || !isEditMode) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (dragTargetStateRef.current) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [isEditMode])

  useEffect(() => {
    const handleMouseUp = () => {
      isDraggingRef.current = false
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return {
    selectedIds,
    setSelectedIds,
    toggleAll,
    clearSelection,
    startDrag,
    onMouseEnterRow
  }
}
