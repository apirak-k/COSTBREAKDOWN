import { useEffect, useRef, useState, useCallback } from 'react'

interface UseDragSelectOptions<T> {
  items: T[]
  getItemId: (item: T) => string
  isEditMode: boolean
  selectionScope?: string
}

/**
 * Provides Excel-like click & drag multi-row selection:
 * - Click down on a row-number cell to begin selecting.
 * - Dragging down/up across rows toggles or extends the selection.
 * - Mouse up anywhere ends the drag mode.
 */
export function useDragSelect<T>({ items, getItemId, isEditMode, selectionScope }: UseDragSelectOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const isDraggingRef = useRef(false)
  const selectionAnchorId = useRef<string | null>(null)

  const toggleAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(items.map(getItemId)) : new Set())
  }, [items, getItemId])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  useEffect(() => {
    setSelectedIds(new Set())
    isDraggingRef.current = false
    selectionAnchorId.current = null
  }, [selectionScope])

  const toggleRow = useCallback((id: string) => {
    if (!isEditMode) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [isEditMode])

  const startDrag = useCallback((id: string, e: React.MouseEvent) => {
    // Only primary mouse click
    if (e.button !== 0 || !isEditMode) return
    if (e.shiftKey) {
      isDraggingRef.current = false
      const anchorId = selectionAnchorId.current || id
      const anchorIndex = items.findIndex(item => getItemId(item) === anchorId)
      const targetIndex = items.findIndex(item => getItemId(item) === id)
      const range = items.slice(Math.min(anchorIndex < 0 ? targetIndex : anchorIndex, targetIndex), Math.max(anchorIndex, targetIndex) + 1)
      setSelectedIds(prev => {
        const next = e.ctrlKey || e.metaKey ? new Set(prev) : new Set<string>()
        range.forEach(item => next.add(getItemId(item)))
        return next
      })
      return
    }

    selectionAnchorId.current = id
    if (e.ctrlKey || e.metaKey) {
      isDraggingRef.current = false
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      return
    }

    isDraggingRef.current = true
    setSelectedIds(new Set([id]))
  }, [getItemId, isEditMode, items])

  const onMouseEnterRow = useCallback((id: string) => {
    if (!isDraggingRef.current || !isEditMode) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.add(id)
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
    toggleRow,
    startDrag,
    onMouseEnterRow
  }
}
