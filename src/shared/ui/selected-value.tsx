import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { NumericInputDomain } from './numeric-input-rules'
import { formatFullNumericValue } from './numeric-display'
import { BusinessNumber } from './BusinessNumber'
import { isSafeWorkspaceDismissTarget } from './transient-interactions'

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

interface PendingPreview {
  timer: ReturnType<typeof setTimeout> | null
  value: SelectedValue
  scopeKey?: string
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
const HOVER_PREVIEW_DWELL_MS = 350
const ADDITIONAL_PIN_PRESERVING_TARGET = [
  '[aria-expanded]',
  '[aria-haspopup]',
  '[data-cbd-popover]',
  '[data-cbd-status]',
  '[data-comparison-role-menu]',
  '[draggable="true"]',
  '[id="prepare-dataset-panel"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="menu"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="group"][aria-label="Finding type filter"]',
  '[role="group"][aria-label="Filter by comparison status"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',')
const asReadOnlyPreview = (source: SelectedValue): SelectedValue => source.editable
  ? { id: source.id, value: source.value, editable: false, domain: source.domain, percentage: source.percentage }
  : source

export function SelectedValueProvider({ children, scopeKey }: { children: ReactNode; scopeKey?: string }) {
  const [state, setState] = useState<SelectedValueState>({ focused: null, previewed: null, pinned: null })
  const pendingPreviewRef = useRef<PendingPreview | null>(null)
  const latestScopeKeyRef = useRef(scopeKey)
  latestScopeKeyRef.current = scopeKey
  const cancelPendingPreview = useCallback((id?: string, targetScopeKey?: string) => {
    const pending = pendingPreviewRef.current
    if (!pending || (id !== undefined && pending.value.id !== id)
      || (targetScopeKey !== undefined && pending.scopeKey !== targetScopeKey)) return
    if (pending.timer !== null) clearTimeout(pending.timer)
    pendingPreviewRef.current = null
  }, [])
  const inScope = (slot: ScopedValue) => slot && slot.scopeKey === scopeKey ? slot.value : null
  const focusedSelection = inScope(state.focused)
  const previewSelection = inScope(state.previewed)
  const pinnedSelection = inScope(state.pinned)
  const sameSourcePreview = previewSelection !== null && previewSelection.id === focusedSelection?.id
  const selection = sameSourcePreview
    ? focusedSelection
    : previewSelection ?? focusedSelection ?? pinnedSelection

  useEffect(() => {
    if (!pinnedSelection) return

    const clearPinOnBackgroundPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return
      const targetIsInteractive = !isSafeWorkspaceDismissTarget(event.target)
        || event.target.closest(ADDITIONAL_PIN_PRESERVING_TARGET) !== null
      if (targetIsInteractive) return
      setState(current => ({
        ...current,
        pinned: current.pinned?.scopeKey === scopeKey ? null : current.pinned
      }))
    }

    document.addEventListener('pointerdown', clearPinOnBackgroundPointerDown, true)
    return () => document.removeEventListener('pointerdown', clearPinOnBackgroundPointerDown, true)
  }, [pinnedSelection, scopeKey])

  const activateFocus = useCallback((value: SelectedValue) => {
    cancelPendingPreview()
    setState(current => {
      const focused = isSelectable(value) ? { value, scopeKey } : null
      const currentPreview = current.previewed
      const previewed = currentPreview !== null && currentPreview.scopeKey === scopeKey && currentPreview.value.id === value.id
        ? null
        : currentPreview
      return { ...current, focused, previewed }
    })
  }, [scopeKey, cancelPendingPreview])
  const clearFocus = useCallback((id?: string) => {
    setState(current => ({
      ...current,
      focused: current.focused && current.focused.scopeKey === scopeKey && (id === undefined || current.focused.value.id === id) ? null : current.focused
    }))
  }, [scopeKey])
  const previewValue = useCallback((value: SelectedValue) => {
    cancelPendingPreview()
    if (!isSelectable(value)) return

    const pending: PendingPreview = { timer: null, value, scopeKey }
    pending.timer = setTimeout(() => {
      if (pendingPreviewRef.current !== pending) return
      pendingPreviewRef.current = null
      if (latestScopeKeyRef.current !== pending.scopeKey) return
      setState(current => {
        const currentFocus = current.focused
        if (currentFocus !== null && currentFocus.scopeKey === pending.scopeKey && currentFocus.value.id === pending.value.id) {
          return current
        }
        return { ...current, previewed: { value: asReadOnlyPreview(pending.value), scopeKey: pending.scopeKey } }
      })
    }, HOVER_PREVIEW_DWELL_MS)
    pendingPreviewRef.current = pending
  }, [cancelPendingPreview, scopeKey])
  const clearPreview = useCallback((id?: string) => {
    cancelPendingPreview(id, scopeKey)
    setState(current => ({
      ...current,
      previewed: current.previewed && current.previewed.scopeKey === scopeKey && (id === undefined || current.previewed.value.id === id) ? null : current.previewed
    }))
  }, [cancelPendingPreview, scopeKey])
  const pinValue = useCallback((value: SelectedValue) => {
    cancelPendingPreview()
    if (value.editable || !isSelectable(value)) return
    setState(current => {
      const currentPin = current.pinned
      return {
        ...current,
        pinned: currentPin !== null && currentPin.scopeKey === scopeKey && currentPin.value.id === value.id
          ? null
          : { value, scopeKey }
      }
    })
  }, [cancelPendingPreview, scopeKey])
  const clearSelection = useCallback((id?: string) => {
    cancelPendingPreview(id, scopeKey)
    const clearCurrentSource = (slot: ScopedValue): ScopedValue =>
      slot && slot.scopeKey === scopeKey && (id === undefined || slot.value.id === id) ? null : slot
    setState(current => ({
      focused: clearCurrentSource(current.focused),
      previewed: clearCurrentSource(current.previewed),
      pinned: clearCurrentSource(current.pinned)
    }))
  }, [cancelPendingPreview, scopeKey])
  const syncSelection = useCallback((value: SelectedValue) => {
    const pending = pendingPreviewRef.current
    if (pending && pending.scopeKey === scopeKey && pending.value.id === value.id) {
      if (isSelectable(value)) pending.value = value
      else cancelPendingPreview(value.id, scopeKey)
    }
    const syncSource = (slot: ScopedValue, readOnly = false): ScopedValue => {
      if (!slot || slot.scopeKey !== scopeKey || slot.value.id !== value.id) return slot
      return isSelectable(value)
        ? { value: readOnly ? asReadOnlyPreview(value) : value, scopeKey }
        : null
    }
    setState(current => ({
      focused: syncSource(current.focused),
      previewed: syncSource(current.previewed, true),
      pinned: syncSource(current.pinned)
    }))
  }, [cancelPendingPreview, scopeKey])

  useBrowserLayoutEffect(() => {
    cancelPendingPreview()
    const clearObsoleteScope = (slot: ScopedValue): ScopedValue => slot?.scopeKey === scopeKey ? slot : null
    setState(current => ({
      focused: clearObsoleteScope(current.focused),
      previewed: clearObsoleteScope(current.previewed),
      pinned: clearObsoleteScope(current.pinned)
    }))
  }, [cancelPendingPreview, scopeKey])

  useEffect(() => () => cancelPendingPreview(), [cancelPendingPreview])

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
  const current = useRef({ source, id, scopeKey, focusedId: focusedSelection?.id, mounted: true })
  current.current.source = source
  current.current.id = id
  current.current.scopeKey = scopeKey
  current.current.focusedId = focusedSelection?.id

  const write = useCallback((value: number | null) => {
    const latest = current.current
    if (latest.mounted && latest.id === id && latest.focusedId === id && latest.scopeKey === scopeKey && latest.source.editable) latest.source.onValueChange(value)
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
  numericColumn?: boolean
  compactPercentSuffix?: boolean
  signPositive?: boolean
  children?: ReactNode
}

export function SelectedNumber({ value, integer, percentage, selectionId, children, className, style, numericColumn = false, compactPercentSuffix = false, signPositive, stopKeyboardPropagation = true, onKeyDown, onKeyUp, ...props }: SelectedNumberProps) {
  const { isPinned, preview, clearPreview, pin } = useSelectedValueSource({ value, editable: false, domain: { integer }, percentage }, selectionId)
  const content = children ?? <BusinessNumber value={value} integer={integer} percent={percentage} />
  if (value == null || !Number.isFinite(value)) return numericColumn
    ? <BusinessNumber numericColumn value={value} integer={integer} percent={percentage} className={className} />
    : <span className={className} style={style}>{content}</span>

  const renderButton = (token: ReactNode) => (
    <button
      {...props}
      type="button"
      aria-label={props['aria-label'] ?? `Select value ${formatFullNumericValue(value)}${percentage ? '%' : ''}`}
      aria-pressed={isPinned}
      data-selected-number="true"
      className={`inline cursor-pointer appearance-none rounded-none text-inherit focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-700 ${className ?? ''}`.trim()}
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
      <span className={`rounded-sm ${isPinned ? 'bg-blue-100' : 'bg-transparent hover:bg-[#E9EEF4]'}`}>{token}</span>
    </button>
  )
  return numericColumn
    ? <BusinessNumber numericColumn className={className} value={value} integer={integer} percent={percentage} compactPercentSuffix={compactPercentSuffix} signPositive={signPositive} renderToken={renderButton} />
    : renderButton(content)
}
