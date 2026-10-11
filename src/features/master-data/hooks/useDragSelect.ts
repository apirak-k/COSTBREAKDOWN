import { useEffect, useRef, useState, useCallback } from 'react'

interface UseDragSelectOptions<T> {
  items: T[]
  getItemId: (item: T) => string
  selectionScope?: string
}

export function updateVisibleRowSelection(
  current: ReadonlySet<string>,
  visibleIds: readonly string[],
  selected: boolean
): Set<string> {
  const next = new Set(current)
  visibleIds.forEach(id => selected ? next.add(id) : next.delete(id))
  return next
}

export function toggleRowSelection(current: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(current)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/**
 * Provides Excel-like click & drag multi-row selection:
 * - Click a row-number cell to select or deselect that row.
 * - Dragging down/up across rows toggles or extends the selection.
 * - Mouse up anywhere ends the drag mode.
 */
export function useDragSelect<T>({ items, getItemId, selectionScope }: UseDragSelectOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const isDraggingRef = useRef(false)
  const selectionAnchorId = useRef<string | null>(null)
  const pointerDownId = useRef<string | null>(null)
  const dragMovedRef = useRef(false)
  const suppressNextClickRef = useRef(false)

  const toggleAll = useCallback((checked: boolean) => {
    const visibleIds = items.map(getItemId)
    setSelectedIds(previous => updateVisibleRowSelection(previous, visibleIds, checked))
  }, [items, getItemId])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  useEffect(() => {
    setSelectedIds(new Set())
    isDraggingRef.current = false
    selectionAnchorId.current = null
    pointerDownId.current = null
    dragMovedRef.current = false
    suppressNextClickRef.current = false
  }, [selectionScope])

  const toggleRow = useCallback((id: string) => {
    setSelectedIds(prev => toggleRowSelection(prev, id))
  }, [])

  const handleRowClick = useCallback((id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const isKeyboardClick = event.detail === 0
    if (isKeyboardClick) {
      suppressNextClickRef.current = false
      dragMovedRef.current = false
      toggleRow(id)
      return
    }
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }
    toggleRow(id)
  }, [toggleRow])

  const startDrag = useCallback((id: string, e: React.MouseEvent) => {
    // Only primary mouse click
    if (e.button !== 0) return
    if (e.shiftKey) {
      isDraggingRef.current = false
      pointerDownId.current = null
      dragMovedRef.current = false
      suppressNextClickRef.current = true
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
      pointerDownId.current = null
      dragMovedRef.current = false
      suppressNextClickRef.current = true
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      return
    }

    suppressNextClickRef.current = false
    dragMovedRef.current = false
    pointerDownId.current = id
    isDraggingRef.current = true
  }, [getItemId, items])

  const onMouseEnterRow = useCallback((id: string) => {
    const anchorId = pointerDownId.current
    if (!isDraggingRef.current || !anchorId || id === anchorId) return
    const alreadyMoved = dragMovedRef.current
    dragMovedRef.current = true
    setSelectedIds(prev => {
      const next = alreadyMoved ? new Set(prev) : new Set([anchorId])
      next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    const handleMouseUp = () => {
      isDraggingRef.current = false
      pointerDownId.current = null
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
    handleRowClick,
    startDrag,
    onMouseEnterRow
  }
}
