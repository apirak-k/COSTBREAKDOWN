import { ChevronDown, ChevronUp } from 'lucide-react'
import { NumericColumnSlot } from './NumericColumnSlot'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FocusEvent, InputHTMLAttributes, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { businessNumberPresentation, formatFocusedNumericValue, formatFullNumericValue, formatHeaderNumericValue } from './numeric-display'
import { measureNumericText, numericDecimalPrefixWidth, numericColumnPresentation, numericScientificFitFloor, useNumericColumnMetrics } from './numeric-column-layout'
import {
  formatNumericInputValue,
  isNumericDraftSyntax,
  numericCaretForPlace,
  parseNumericDraft,
  resolveNumericWheelStepDirection,
  resolveNumericStepPlace,
  stepNumericValue,
  type NumericInputDomain,
  type NumericStepPlace
} from './numeric-input-rules'

export interface NumericInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max'>, NumericInputDomain {
  value: number | null | undefined
  /** Durable exact editor text supplied by the owning application state. */
  exactValue?: string | null
  onValueChange: (value: number | null, exactValue?: string) => void
  allowSubMinimumDraft?: boolean
  stopAtMinimum?: boolean
  showStepper?: boolean
  stepperButtonClassName?: string
  displayMode?: 'compact' | 'full' | 'header'
  integerDigits?: number
  percentSuffix?: boolean
  reserveMarker?: boolean
  numericColumn?: boolean
}

const defaultInputClassName = 'h-8 w-full min-w-0 font-mono text-xs tabular-nums focus:outline-none'
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function NumericInput({
  value,
  exactValue,
  onValueChange,
  className,
  integer,
  min,
  max,
  minExclusive,
  allowSubMinimumDraft = false,
  stopAtMinimum = false,
  showStepper = false,
  stepperButtonClassName = '',
  displayMode = 'compact',
  integerDigits = 8,
  percentSuffix = false,
  reserveMarker = false,
  numericColumn = false,
  onFocus,
  onBlur,
  onKeyDown,
  onPaste,
  style,
  ...inputProps
}: NumericInputProps) {
  const domain: NumericInputDomain = { integer, min, max, minExclusive }
  const inputRef = useRef<HTMLInputElement>(null)
  const columnMetrics = useNumericColumnMetrics(inputRef, numericColumn && displayMode === 'compact')
  const columnReserveEnd = reserveMarker ? (showStepper ? 28 : 8) : showStepper ? 28 : 0
  const measure = (text: string) => measureNumericText(text, columnMetrics.font, columnMetrics.letterSpacing)
  const columnPresentation = (next: number | null | undefined) => numericColumnPresentation(next, { integer }, columnMetrics.width, measure, columnReserveEnd)
  const formatValue = (next: number | null | undefined) => displayMode === 'full'
    ? formatFullNumericValue(next)
    : displayMode === 'header'
      ? formatHeaderNumericValue(next, integer)
      : numericColumn ? (next == null || !Number.isFinite(next) ? '' : columnPresentation(next).text) : formatNumericInputValue(next, { ...domain, integerDigits })
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const currentValueRef = useRef(value)
  const onValueChangeRef = useRef(onValueChange)
  const lastEmittedValueRef = useRef(value)
  const authoritativeDraftRef = useRef(exactValue ?? formatFocusedNumericValue(value, integer))
  const authoritativeSourceRef = useRef(exactValue)
  const authoritativeDraftValueRef = useRef(value)
  const previousValueRef = useRef(value)
  const previousFormattedValueRef = useRef(formatValue(value))
  const preservedPlaceRef = useRef<{ raw: string; caret: number; place: NumericStepPlace } | null>(null)
  const restorePlaceRef = useRef<number | null>(null)
  const repeatPointerIdRef = useRef<number | null>(null)
  const repeatDelayRef = useRef<number | null>(null)
  const repeatIntervalRef = useRef<number | null>(null)
  const lastPointerUpRef = useRef(0)
  const canStepRef = useRef(!inputProps.disabled && !inputProps.readOnly)
  const resetScrollOnFocusRef = useRef(false)
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(() => formatValue(value))

  currentValueRef.current = value
  onValueChangeRef.current = onValueChange
  canStepRef.current = !inputProps.disabled && !inputProps.readOnly
  const emitValue = (next: number | null, authoritativeDraft = formatFocusedNumericValue(next, integer)) => {
    lastEmittedValueRef.current = next
    authoritativeDraftRef.current = authoritativeDraft
    authoritativeSourceRef.current = authoritativeDraft
    authoritativeDraftValueRef.current = next
    onValueChangeRef.current(next, authoritativeDraft)
  }

  const stopArrowRepeat = useCallback((pointerId?: number) => {
    if (pointerId !== undefined && repeatPointerIdRef.current !== pointerId) return
    if (repeatDelayRef.current !== null) window.clearTimeout(repeatDelayRef.current)
    if (repeatIntervalRef.current !== null) window.clearInterval(repeatIntervalRef.current)
    repeatDelayRef.current = null
    repeatIntervalRef.current = null
    repeatPointerIdRef.current = null
  }, [])

  const startArrowRepeat = (direction: 1 | -1, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !canStepRef.current) return
    event.preventDefault()
    stopArrowRepeat()
    inputRef.current?.focus()
    repeatPointerIdRef.current = event.pointerId
    applyStep(direction)
    repeatDelayRef.current = window.setTimeout(() => {
      if (repeatPointerIdRef.current !== event.pointerId || !canStepRef.current || document.activeElement !== inputRef.current) {
        stopArrowRepeat(event.pointerId)
        return
      }
      repeatIntervalRef.current = window.setInterval(() => {
        if (repeatPointerIdRef.current !== event.pointerId || !canStepRef.current || document.activeElement !== inputRef.current) {
          stopArrowRepeat(event.pointerId)
          return
        }
        applyStep(direction)
      }, 100)
    }, 450)
  }

  useEffect(() => {
    if (!showStepper) return
    const handlePointerUp = (event: globalThis.PointerEvent) => {
      lastPointerUpRef.current = Date.now()
      stopArrowRepeat(event.pointerId)
    }
    const handlePointerCancel = (event: globalThis.PointerEvent) => stopArrowRepeat(event.pointerId)
    const handleExternalPointerDown = (event: globalThis.PointerEvent) => {
      if (repeatPointerIdRef.current !== null && !wrapperRef.current?.contains(event.target as Node)) {
        stopArrowRepeat()
      }
    }
    const handleWindowBlur = () => stopArrowRepeat()
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') stopArrowRepeat()
    }

    window.addEventListener('pointerup', handlePointerUp, true)
    window.addEventListener('pointercancel', handlePointerCancel, true)
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('pointerdown', handleExternalPointerDown, true)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pointerup', handlePointerUp, true)
      window.removeEventListener('pointercancel', handlePointerCancel, true)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('pointerdown', handleExternalPointerDown, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopArrowRepeat()
    }
  }, [showStepper])

  useEffect(() => {
    if (!canStepRef.current) stopArrowRepeat()
  }, [inputProps.disabled, inputProps.readOnly])

  useEffect(() => {
    const formattedValue = formatValue(value)
    const valueChanged = !Object.is(previousValueRef.current, value)
    const exactValueChanged = exactValue !== undefined && !Object.is(authoritativeSourceRef.current, exactValue)
    const editorFocused = inputRef.current !== null && document.activeElement === inputRef.current

    // The numeric prop remains the calculation representation. The owning model
    // supplies exactValue so the accepted decimal survives editor reconstruction.
    if (valueChanged && !Object.is(value, lastEmittedValueRef.current)) {
      authoritativeDraftRef.current = exactValue ?? formatFocusedNumericValue(value, integer)
      authoritativeSourceRef.current = exactValue
      authoritativeDraftValueRef.current = value
    } else if (exactValueChanged) {
      authoritativeDraftRef.current = exactValue ?? formatFocusedNumericValue(value, integer)
      authoritativeSourceRef.current = exactValue
      authoritativeDraftValueRef.current = value
    }

    // Clipboard edits update the parent value without going through this input's
    // onChange handler. Keep the focused editor in sync when it still shows the
    // previous committed value, while preserving an in-progress numeric draft.
    if (!editorFocused || exactValueChanged || (valueChanged && (
      draft === previousFormattedValueRef.current
      || draft === formatFocusedNumericValue(previousValueRef.current, integer)
      || exactValueChanged
      || (displayMode === 'full' && !Object.is(value, lastEmittedValueRef.current))
    ))) {
      setDraft(editorFocused && !inputProps.readOnly
        ? (exactValue ?? authoritativeDraftRef.current ?? formatFocusedNumericValue(value, integer))
        : formattedValue)
    }

    previousValueRef.current = value
    previousFormattedValueRef.current = formattedValue
  }, [draft, focused, value, exactValue, integer, min, max, minExclusive, displayMode, integerDigits, inputProps.readOnly, numericColumn, columnMetrics.width, columnMetrics.font, columnMetrics.letterSpacing, columnMetrics.fontRevision])

  useIsomorphicLayoutEffect(() => {
    const exponent = restorePlaceRef.current
    const input = inputRef.current
    if (exponent === null || !input || !focused || draft === '') return
    const caret = numericCaretForPlace(draft, exponent, Boolean(integer))
    input.setSelectionRange(caret, caret)
    preservedPlaceRef.current = { raw: draft, caret, place: resolveNumericStepPlace(draft, caret, domain) }
    restorePlaceRef.current = null
  }, [draft, focused, integer])

  const applyStep = (direction: 1 | -1) => {
    if (!canStepRef.current) return
    const input = inputRef.current
    const raw = input?.value ?? draft
    const selectionStart = input?.selectionStart ?? raw.length
    const selectionEnd = input?.selectionEnd ?? selectionStart
    const hasSelection = selectionStart !== selectionEnd
    const preservedPlace = preservedPlaceRef.current
    const activePlace = !hasSelection && preservedPlace?.raw === raw && preservedPlace.caret === selectionStart
      ? preservedPlace.place
      : resolveNumericStepPlace(raw, hasSelection ? null : selectionStart, domain)
    const next = stepNumericValue(currentValueRef.current, direction, activePlace.step, domain, { stopAtMinimum })
    if (next === null) {
      preservedPlaceRef.current = null
      restorePlaceRef.current = null
      emitValue(null, '')
      setDraft('')
    } else {
      const nextDraft = formatFocusedNumericValue(next, integer)
      if (Object.is(next, currentValueRef.current) || nextDraft === raw) {
        preservedPlaceRef.current = { raw, caret: selectionStart, place: activePlace }
        restorePlaceRef.current = null
      } else {
        restorePlaceRef.current = activePlace.exponent
        emitValue(next, nextDraft)
        setDraft(nextDraft)
      }
    }
    inputRef.current?.focus()
  }

  const handleChange = (raw: string) => {
    if (!isNumericDraftSyntax(raw, domain)) return
    const parsed = parseNumericDraft(raw, domain, allowSubMinimumDraft)
    if (parsed.kind === 'invalid' || parsed.kind === 'out-of-domain') return
    preservedPlaceRef.current = null
    setDraft(raw)
    if (parsed.kind === 'blank') emitValue(null, raw)
    else if (parsed.kind === 'valid') emitValue(parsed.value, raw)
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    stopArrowRepeat()
    setFocused(false)
    const parsed = parseNumericDraft(draft, domain, allowSubMinimumDraft)
    if (parsed.kind === 'blank') emitValue(null, '')
    setDraft(formatValue(currentValueRef.current))
    onBlur?.(event)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (!canStepRef.current) {
        onKeyDown?.(event)
        return
      }
      if (event.shiftKey && event.currentTarget.dataset.gridCell === 'true') {
        preservedPlaceRef.current = null
        onKeyDown?.(event)
        return
      }
      event.preventDefault()
      event.stopPropagation()
      applyStep(event.key === 'ArrowUp' ? 1 : -1)
      return
    }
    preservedPlaceRef.current = null
    onKeyDown?.(event)
  }

  const presentation = numericColumn ? columnPresentation(value) : businessNumberPresentation(value, { integer, integerDigits })
  const ordinaryDecimal = displayMode === 'compact' && !integer && !/[eE]/.test(draft) && draft !== ''
  const wholeGlyphs = draft.split('.')[0].length
  const columnOrdinary = numericColumn && draft !== '' && !/[eE]/.test(draft)
  const columnWholeWidth = numericDecimalPrefixWidth(draft, measure)
  const presentationPadding = presentation.notation === 'ordinary' && presentation.fractionDigits === 2 ? '2ch' : '0ch'
  const rightPadding = displayMode === 'header' ? '2.25rem' : reserveMarker
    ? showStepper ? '2.5rem' : '1.5rem'
    : showStepper ? '1.75rem' : style?.paddingRight ?? '0.375rem'
  const label = inputProps['aria-label'] ?? inputProps.name ?? inputProps.placeholder ?? 'value'
  const parsedValue = parseNumericDraft(draft, domain, allowSubMinimumDraft)
  const valueIsNumeric = parsedValue.kind === 'valid'

  useIsomorphicLayoutEffect(() => {
    if (!focused || !resetScrollOnFocusRef.current) return
    if (inputRef.current) inputRef.current.scrollLeft = 0
    resetScrollOnFocusRef.current = false
  }, [focused, draft])

  useEffect(() => {
    const input = inputRef.current
    if (!input || !focused) return

    const handleWheel = (event: globalThis.WheelEvent) => {
      if (document.activeElement !== input || event.deltaY === 0 || !canStepRef.current) return
      event.preventDefault()
      applyStep(resolveNumericWheelStepDirection(event.deltaY))
    }

    input.addEventListener('wheel', handleWheel, { passive: false })
    return () => input.removeEventListener('wheel', handleWheel)
  }, [focused, draft, integer, min, max, minExclusive])

  return (
    <NumericColumnSlot elementRef={wrapperRef} percentage={percentSuffix} suffixAriaHidden className="[&>[data-numeric-suffix]]:text-xs">
      <input
        {...inputProps}
        ref={inputRef}
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        role="spinbutton"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={valueIsNumeric ? parsedValue.value : undefined}
        value={draft}
        onFocus={event => {
          resetScrollOnFocusRef.current = true
          preservedPlaceRef.current = null
          // Editing starts from the authoritative value, never its formatted presentation.
          if (!inputProps.readOnly || /[eE]/.test(event.currentTarget.value)) {
            const authoritativeDraft = exactValue === null
              ? formatFocusedNumericValue(currentValueRef.current, integer)
              : exactValue ?? (Object.is(authoritativeDraftValueRef.current, currentValueRef.current)
                ? authoritativeDraftRef.current
                : formatFocusedNumericValue(currentValueRef.current, integer))
            authoritativeDraftRef.current = authoritativeDraft
            authoritativeSourceRef.current = exactValue
            authoritativeDraftValueRef.current = currentValueRef.current
            setDraft(authoritativeDraft)
          }
          setFocused(true)
          onFocus?.(event)
        }}
        onClick={() => { preservedPlaceRef.current = null }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={event => {
          const clipboardText = event.clipboardData.getData('text')
          const input = event.currentTarget
          const start = input.selectionStart ?? draft.length
          const end = input.selectionEnd ?? draft.length
          const pastedDraft = `${draft.slice(0, start)}${clipboardText}${draft.slice(end)}`
          const parsedPaste = parseNumericDraft(pastedDraft, domain, allowSubMinimumDraft)
          if (
            !isNumericDraftSyntax(pastedDraft, domain)
            || parsedPaste.kind === 'invalid'
            || parsedPaste.kind === 'transient'
            || parsedPaste.kind === 'out-of-domain'
          ) event.preventDefault()
          onPaste?.(event)
        }}
        onChange={event => handleChange(event.currentTarget.value)}
        className={`${defaultInputClassName} ${className ?? ''}`.trim()}
        style={{
          ...style,
          textAlign: ordinaryDecimal ? 'left' : style?.textAlign,
          paddingLeft: ordinaryDecimal
            ? `max(0.375rem, calc(100% - 2px - ${typeof rightPadding === 'number' ? `${rightPadding}px` : rightPadding} - ${wholeGlyphs + 5}ch))`
            : style?.paddingLeft,
          paddingRight: ordinaryDecimal ? 0 : displayMode === 'compact'
              ? `calc(${typeof rightPadding === 'number' ? `${rightPadding}px` : rightPadding} + ${presentationPadding})`
              : displayMode === 'header' || reserveMarker || showStepper ? rightPadding : style?.paddingRight,
          ...(numericColumn && displayMode === 'compact' ? {
            textAlign: columnOrdinary ? 'left' : 'center',
            paddingLeft: columnOrdinary
              ? Math.max(0, columnMetrics.width / 2 - columnMetrics.borderLeft - columnWholeWidth)
              : columnReserveEnd || 1,
            paddingRight: columnOrdinary ? columnReserveEnd : columnReserveEnd || 1
          } : {})
        }}
        data-numeric-column={numericColumn ? 'true' : undefined}
        data-numeric-region={numericColumn ? 'true' : undefined}
        data-numeric-fit-inset={numericColumn ? 2 : undefined}
        data-numeric-reserve-end={numericColumn ? columnReserveEnd : undefined}
        data-numeric-fit={numericColumn ? presentation.notation : undefined}
        data-numeric-fit-floor={numericColumn ? (columnMetrics.width - columnMetrics.borderLeft - columnMetrics.borderRight + 0.5 >= numericScientificFitFloor(measure, min === undefined || min < 0) + 2 * columnReserveEnd ? 'adequate' : 'insufficient') : undefined}
        data-numeric-editor="true"
        data-numeric-presentation={presentation.notation}
        data-numeric-fraction-digits={presentation.fractionDigits}
      />
      {showStepper && !inputProps.disabled && !inputProps.readOnly && (
        <span
          style={percentSuffix ? { right: reserveMarker ? 'calc(1rem + 1.25rem)' : 'calc(1rem + 0.25rem)' } : undefined}
          data-numeric-stepper="true"
          data-header-spinner-slot={displayMode === 'header' ? 'true' : undefined}
          className={`absolute inset-y-0 ${reserveMarker ? 'right-5' : 'right-1'} flex w-3 flex-col justify-center ${displayMode === 'header' ? 'invisible opacity-0 transition-opacity group-hover/header-input:visible group-hover/header-input:opacity-100 group-focus-within/header-input:visible group-focus-within/header-input:opacity-100' : ''}`}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Increase ${label}`}
            onPointerDown={event => startArrowRepeat(1, event)}
            onPointerUp={event => stopArrowRepeat(event.pointerId)}
            onPointerCancel={event => stopArrowRepeat(event.pointerId)}
            onPointerLeave={event => stopArrowRepeat(event.pointerId)}
            onClick={event => {
              if (event.detail > 0 && Date.now() - lastPointerUpRef.current < 800) return
              applyStep(1)
            }}
            className={`grid h-3 flex-none touch-none place-items-center text-slate-500 hover:text-slate-950 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700 ${stepperButtonClassName}`.trim()}
          >
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Decrease ${label}`}
            onPointerDown={event => startArrowRepeat(-1, event)}
            onPointerUp={event => stopArrowRepeat(event.pointerId)}
            onPointerCancel={event => stopArrowRepeat(event.pointerId)}
            onPointerLeave={event => stopArrowRepeat(event.pointerId)}
            onClick={event => {
              if (event.detail > 0 && Date.now() - lastPointerUpRef.current < 800) return
              applyStep(-1)
            }}
            className={`grid h-3 flex-none touch-none place-items-center text-slate-500 hover:text-slate-950 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700 ${stepperButtonClassName}`.trim()}
          >
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      )}
    </NumericColumnSlot>
  )
}
