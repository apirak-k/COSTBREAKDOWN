import React, { useEffect, useRef } from 'react'
import type { ComparisonStatus } from '../../../core'
import { applyStatusDragSelection } from './status-drag-selection'
import { toggleComparisonStatus, type ComparisonViewMode } from './comparison-view'

const statusOptions: Array<{ value: ComparisonStatus; label: string }> = [
  { value: 'CHANGED', label: 'Changed' },
  { value: 'ADDED', label: 'Added' },
  { value: 'REMOVED', label: 'Removed' },
  { value: 'UNCHANGED', label: 'Unchanged' }
]

interface ComparisonStatusOptionsProps {
  selected: ComparisonViewMode
  onChange: React.Dispatch<React.SetStateAction<ComparisonViewMode>>
}

export const ComparisonStatusOptions: React.FC<ComparisonStatusOptionsProps> = ({ selected, onChange }) => {
  const gesture = useRef<{ pointerId: number; selected: boolean; lastIndex: number; visited: Set<ComparisonStatus> } | null>(null)

  const visit = (index: number) => {
    const current = gesture.current
    if (!current || index < 0) return
    const crossed = statusOptions.slice(Math.min(current.lastIndex, index), Math.max(current.lastIndex, index) + 1)
      .map(option => option.value).filter(status => !current.visited.has(status))
    crossed.forEach(status => current.visited.add(status))
    current.lastIndex = index
    const selecting = current.selected
    onChange(previous => applyStatusDragSelection(previous, crossed, selecting))
  }

  useEffect(() => {
    const endGesture = () => { gesture.current = null }
    window.addEventListener('pointerup', endGesture)
    window.addEventListener('pointercancel', endGesture)
    window.addEventListener('blur', endGesture)
    return () => {
      window.removeEventListener('pointerup', endGesture)
      window.removeEventListener('pointercancel', endGesture)
      window.removeEventListener('blur', endGesture)
    }
  }, [])

  return <div aria-label="Filter by comparison status" className="select-none touch-none"
    onPointerMove={event => {
      if (gesture.current?.pointerId !== event.pointerId) return
      const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-cbd-status]')
      if (!row || !event.currentTarget.contains(row)) return
      visit(statusOptions.findIndex(option => option.value === row.dataset.cbdStatus))
    }}
    onPointerUp={() => { gesture.current = null }}
    onPointerCancel={() => { gesture.current = null }}
    onLostPointerCapture={() => { gesture.current = null }}
  >
    {statusOptions.map((option, index) => <label key={option.value} data-cbd-status={option.value}
      className="flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-xs text-slate-800 hover:bg-slate-100 focus-within:bg-slate-100"
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) return
        event.preventDefault()
        event.currentTarget.querySelector('input')?.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        gesture.current = { pointerId: event.pointerId, selected: !selected.includes(option.value), lastIndex: index, visited: new Set() }
        visit(index)
      }}
      onClick={event => { if (event.detail > 0) event.preventDefault() }}
    >
      <input type="checkbox" checked={selected.includes(option.value)}
        onChange={() => onChange(previous => toggleComparisonStatus(previous, option.value))}
        className="h-3.5 w-3.5 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" />
      <span>{option.label}</span>
    </label>)}
  </div>
}
