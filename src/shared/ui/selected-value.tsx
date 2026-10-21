import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { NumericInputDomain } from './numeric-input-rules'
import { formatBusinessNumber, formatFullNumericValue } from './numeric-display'

interface SelectedValueBase {
  value: number | null | undefined
  percentage?: boolean
}

// Values and domains use the source editor's units; its writer owns any stored-percent conversion.
export type SelectedValueSource = SelectedValueBase & (
  | { editable: false; domain?: NumericInputDomain }
  | {
    editable: true
    domain: NumericInputDomain
    onValueChange: (value: number | null) => void
    allowSubMinimumDraft?: boolean
    stopAtMinimum?: boolean
  }
)

export type SelectedValue = SelectedValueSource & { id: string }

interface SelectedValueContextValue {
  selection: SelectedValue | null
  selectValue: (value: SelectedValue) => void
  clearSelection: (id?: string) => void
  syncSelection: (value: SelectedValue) => void
  scopeKey?: string
}

const SelectedValueContext = createContext<SelectedValueContextValue | null>(null)
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const isSelectable = (source: SelectedValue) => Number.isFinite(source.value) || (source.editable && source.value == null)

export function SelectedValueProvider({ children, scopeKey }: { children: ReactNode; scopeKey?: string }) {
  const [selected, setSelected] = useState<{ value: SelectedValue; scopeKey?: string } | null>(null)
  const selection = selected?.scopeKey === scopeKey ? selected?.value ?? null : null
  const selectValue = useCallback((value: SelectedValue) => {
    setSelected(isSelectable(value) ? { value, scopeKey } : null)
  }, [scopeKey])
  const clearSelection = useCallback((id?: string) => {
    setSelected(current => current && current.scopeKey === scopeKey && (id === undefined || current.value.id === id) ? null : current)
  }, [scopeKey])
  const syncSelection = useCallback((value: SelectedValue) => {
    setSelected(current => current && current.scopeKey === scopeKey && current.value.id === value.id
      ? isSelectable(value) ? { value, scopeKey } : null
      : current)
  }, [scopeKey])

  useEffect(() => {
    setSelected(current => current?.scopeKey === scopeKey ? current : null)
  }, [scopeKey])

  const context = useMemo(() => ({ selection, selectValue, clearSelection, syncSelection, scopeKey }), [selection, selectValue, clearSelection, syncSelection, scopeKey])
  return <SelectedValueContext.Provider value={context}>{children}</SelectedValueContext.Provider>
}

export function useSelectedValue() {
  const context = useContext(SelectedValueContext)
  if (!context) throw new Error('Selected value sources must be inside SelectedValueProvider')
  return context
}

/** Opt in a source without adding a second selection treatment to an editable input. */
export function useSelectedValueSource(source: SelectedValueSource, sourceId?: string) {
  const generatedId = useId()
  const id = sourceId ?? generatedId
  const { selection, selectValue, clearSelection, syncSelection, scopeKey } = useSelectedValue()
  const current = useRef({ source, id, scopeKey, selectedId: selection?.id, mounted: true })
  current.current.source = source
  current.current.id = id
  current.current.scopeKey = scopeKey
  current.current.selectedId = selection?.id

  const write = useCallback((value: number | null) => {
    const latest = current.current
    if (latest.mounted && latest.id === id && latest.selectedId === id && latest.scopeKey === scopeKey && latest.source.editable) latest.source.onValueChange(value)
  }, [id, scopeKey])
  const snapshot = useCallback((): SelectedValue => {
    const latest = current.current.source
    return latest.editable ? { ...latest, id, onValueChange: write } : { ...latest, id }
  }, [id, write])
  const select = useCallback(() => selectValue(snapshot()), [selectValue, snapshot])
  const { integer, min, max, minExclusive } = source.domain ?? {}
  const allowSubMinimumDraft = source.editable ? source.allowSubMinimumDraft : undefined
  const stopAtMinimum = source.editable ? source.stopAtMinimum : undefined

  useBrowserLayoutEffect(() => {
    syncSelection(snapshot())
  }, [syncSelection, snapshot, source.value, source.editable, source.percentage, integer, min, max, minExclusive, allowSubMinimumDraft, stopAtMinimum])

  useBrowserLayoutEffect(() => {
    current.current.mounted = true
    return () => {
      current.current.mounted = false
      clearSelection(id)
    }
  }, [id, scopeKey, clearSelection])

  return { isSelected: selection?.id === id, select }
}

export interface SelectedNumberProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onClick' | 'type' | 'children'> {
  value: number | null | undefined
  integer?: boolean
  percentage?: boolean
  selectionId?: string
  stopKeyboardPropagation?: boolean
  children?: ReactNode
}

export function SelectedNumber({ value, integer, percentage, selectionId, children, className, style, stopKeyboardPropagation = true, onKeyDown, onKeyUp, ...props }: SelectedNumberProps) {
  const { isSelected, select } = useSelectedValueSource({ value, editable: false, domain: { integer }, percentage }, selectionId)
  const content = children ?? formatBusinessNumber(value, { integer, percent: percentage })
  if (value == null || !Number.isFinite(value)) return <span className={className} style={style}>{content}</span>

  return (
    <button
      {...props}
      type="button"
      aria-label={props['aria-label'] ?? `Select value ${formatFullNumericValue(value)}${percentage ? '%' : ''}`}
      aria-pressed={isSelected}
      data-selected-number="true"
      className={`inline cursor-pointer appearance-none rounded-none text-inherit ${isSelected ? 'bg-blue-100 hover:bg-blue-100' : 'bg-transparent hover:bg-blue-50'} focus-visible:bg-blue-100 ${className ?? ''}`.trim()}
      style={{ ...style, border: 0, outline: 'none', padding: 0, margin: 0 }}
      onClick={event => {
        event.stopPropagation()
        select()
      }}
      onKeyDown={event => {
        if (stopKeyboardPropagation && (event.key === 'Enter' || event.key === ' ')) event.stopPropagation()
        onKeyDown?.(event)
      }}
      onKeyUp={event => {
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
        onKeyUp?.(event)
      }}
    >
      {content}
    </button>
  )
}
