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

type ScopedValue = { value: SelectedValue; scopeKey?: string } | null
interface SelectedValueState {
  focused: ScopedValue
  previewed: ScopedValue
  pinned: ScopedValue
}

interface SelectedValueContextValue {
  selection: SelectedValue | null
  focusedSelection: SelectedValue | null
  previewSelection: SelectedValue | null
  pinnedSelection: SelectedValue | null
  activateFocus: (value: SelectedValue) => void
  clearFocus: (id?: string) => void
  previewValue: (value: SelectedValue) => void
  clearPreview: (id?: string) => void
  pinValue: (value: SelectedValue) => void
  clearSelection: (id?: string) => void
  syncSelection: (value: SelectedValue) => void
  scopeKey?: string
}

const SelectedValueContext = createContext<SelectedValueContextValue | null>(null)
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const isSelectable = (source: SelectedValue) => Number.isFinite(source.value) || (source.editable && source.value == null)

export function SelectedValueProvider({ children, scopeKey }: { children: ReactNode; scopeKey?: string }) {
  const [state, setState] = useState<SelectedValueState>({ focused: null, previewed: null, pinned: null })
  const inScope = (slot: ScopedValue) => slot && slot.scopeKey === scopeKey ? slot.value : null
  const focusedSelection = inScope(state.focused)
  const previewSelection = inScope(state.previewed)
  const pinnedSelection = inScope(state.pinned)
  const selection = focusedSelection ?? previewSelection ?? pinnedSelection

  const activateFocus = useCallback((value: SelectedValue) => {
    setState(current => ({
      ...current,
      focused: isSelectable(value) ? { value, scopeKey } : null
    }))
  }, [scopeKey])
  const clearFocus = useCallback((id?: string) => {
    setState(current => ({
      ...current,
      focused: current.focused && current.focused.scopeKey === scopeKey && (id === undefined || current.focused.value.id === id) ? null : current.focused
    }))
  }, [scopeKey])
  const previewValue = useCallback((value: SelectedValue) => {
    if (value.editable || !isSelectable(value)) return
    setState(current => ({ ...current, previewed: { value, scopeKey } }))
  }, [scopeKey])
  const clearPreview = useCallback((id?: string) => {
    setState(current => ({
      ...current,
      previewed: current.previewed && current.previewed.scopeKey === scopeKey && (id === undefined || current.previewed.value.id === id) ? null : current.previewed
    }))
  }, [scopeKey])
  const pinValue = useCallback((value: SelectedValue) => {
    if (value.editable || !isSelectable(value)) return
    setState(current => ({ ...current, pinned: { value, scopeKey } }))
  }, [scopeKey])
  const clearSelection = useCallback((id?: string) => {
    const clearCurrentSource = (slot: ScopedValue): ScopedValue =>
      slot && slot.scopeKey === scopeKey && (id === undefined || slot.value.id === id) ? null : slot
    setState(current => ({
      focused: clearCurrentSource(current.focused),
      previewed: clearCurrentSource(current.previewed),
      pinned: clearCurrentSource(current.pinned)
    }))
  }, [scopeKey])
  const syncSelection = useCallback((value: SelectedValue) => {
    const syncSource = (slot: ScopedValue): ScopedValue => {
      if (!slot || slot.scopeKey !== scopeKey || slot.value.id !== value.id) return slot
      return isSelectable(value) ? { value, scopeKey } : null
    }
    setState(current => ({
      focused: syncSource(current.focused),
      previewed: syncSource(current.previewed),
      pinned: syncSource(current.pinned)
    }))
  }, [scopeKey])

  useEffect(() => {
    const clearObsoleteScope = (slot: ScopedValue): ScopedValue => slot?.scopeKey === scopeKey ? slot : null
    setState(current => ({
      focused: clearObsoleteScope(current.focused),
      previewed: clearObsoleteScope(current.previewed),
      pinned: clearObsoleteScope(current.pinned)
    }))
  }, [scopeKey])

  const context = useMemo(() => ({
    selection,
    focusedSelection,
    previewSelection,
    pinnedSelection,
    activateFocus,
    clearFocus,
    previewValue,
    clearPreview,
    pinValue,
    clearSelection,
    syncSelection,
    scopeKey
  }), [selection, focusedSelection, previewSelection, pinnedSelection, activateFocus, clearFocus, previewValue, clearPreview, pinValue, clearSelection, syncSelection, scopeKey])
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
  const {
    selection,
    focusedSelection,
    previewSelection,
    pinnedSelection,
    activateFocus,
    clearFocus,
    previewValue,
    clearPreview,
    pinValue,
    clearSelection,
    syncSelection,
    scopeKey
  } = useSelectedValue()
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
  const focus = useCallback(() => activateFocus(snapshot()), [activateFocus, snapshot])
  const blur = useCallback(() => clearFocus(id), [clearFocus, id])
  const preview = useCallback(() => previewValue(snapshot()), [previewValue, snapshot])
  const unpreview = useCallback(() => clearPreview(id), [clearPreview, id])
  const pin = useCallback(() => pinValue(snapshot()), [pinValue, snapshot])
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

  return {
    isSelected: selection?.id === id,
    isFocused: focusedSelection?.id === id,
    isPreviewed: previewSelection?.id === id,
    isPinned: pinnedSelection?.id === id,
    focus,
    blur,
    preview,
    clearPreview: unpreview,
    pin
  }
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
  const { isPinned, preview, clearPreview, pin } = useSelectedValueSource({ value, editable: false, domain: { integer }, percentage }, selectionId)
  const content = children ?? formatBusinessNumber(value, { integer, percent: percentage })
  if (value == null || !Number.isFinite(value)) return <span className={className} style={style}>{content}</span>

  return (
    <button
      {...props}
      type="button"
      aria-label={props['aria-label'] ?? `Select value ${formatFullNumericValue(value)}${percentage ? '%' : ''}`}
      aria-pressed={isPinned}
      data-selected-number="true"
      className={`inline cursor-pointer appearance-none rounded-none text-inherit ${isPinned ? 'bg-blue-50 ring-1 ring-inset ring-blue-700' : 'bg-transparent hover:ring-1 hover:ring-inset hover:ring-blue-500/70 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-700'} ${className ?? ''}`.trim()}
      style={{ ...style, border: 0, outline: 'none', padding: 0, margin: 0 }}
      onPointerEnter={event => {
        preview()
        props.onPointerEnter?.(event)
      }}
      onPointerLeave={event => {
        clearPreview()
        props.onPointerLeave?.(event)
      }}
      onClick={event => {
        event.stopPropagation()
        pin()
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
