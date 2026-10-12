import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FocusEvent, InputHTMLAttributes, KeyboardEvent } from 'react'
import {
  formatNumericInputValue,
  isNumericDraftSyntax,
  numericCaretForPlace,
  parseNumericDraft,
  resolveNumericStepPlace,
  stepNumericValue,
  type NumericInputDomain,
  type NumericStepPlace
} from './numeric-input-rules'

export interface NumericInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max'>, NumericInputDomain {
  value: number | null | undefined
  onValueChange: (value: number | null) => void
  allowSubMinimumDraft?: boolean
  reserveMarker?: boolean
}

const defaultInputClassName = 'h-8 w-full min-w-0 font-mono text-xs tabular-nums focus:outline-none'
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function NumericInput({
  value,
  onValueChange,
  className,
  integer,
  precision = 2,
  min,
  max,
  minExclusive,
  allowSubMinimumDraft = false,
  reserveMarker = false,
  onFocus,
  onBlur,
  onKeyDown,
  onPaste,
  style,
  ...inputProps
}: NumericInputProps) {
  const domain: NumericInputDomain = { integer, precision, min, max, minExclusive }
  const inputRef = useRef<HTMLInputElement>(null)
  const currentValueRef = useRef(value)
  const onValueChangeRef = useRef(onValueChange)
  const previousValueRef = useRef(value)
  const previousFormattedValueRef = useRef(formatNumericInputValue(value, domain))
  const preservedPlaceRef = useRef<{ raw: string; caret: number; place: NumericStepPlace } | null>(null)
  const restorePlaceRef = useRef<number | null>(null)
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(() => formatNumericInputValue(value, domain))

  currentValueRef.current = value
  onValueChangeRef.current = onValueChange

  useEffect(() => {
    const formattedValue = formatNumericInputValue(value, domain)
    const valueChanged = !Object.is(previousValueRef.current, value)

    // Clipboard edits update the parent value without going through this input's
    // onChange handler. Keep the focused editor in sync when it still shows the
    // previous committed value, while preserving an in-progress numeric draft.
    if (!focused || (valueChanged && draft === previousFormattedValueRef.current)) {
      setDraft(formattedValue)
    }

    previousValueRef.current = value
    previousFormattedValueRef.current = formattedValue
  }, [draft, focused, value, integer, precision, min, max, minExclusive])

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
    const input = inputRef.current
    const raw = input?.value ?? draft
    const selectionStart = input?.selectionStart ?? raw.length
    const selectionEnd = input?.selectionEnd ?? selectionStart
    const hasSelection = selectionStart !== selectionEnd
    const preservedPlace = preservedPlaceRef.current
    const activePlace = !hasSelection && preservedPlace?.raw === raw && preservedPlace.caret === selectionStart
      ? preservedPlace.place
      : resolveNumericStepPlace(raw, hasSelection ? null : selectionStart, domain)
    const next = stepNumericValue(currentValueRef.current, direction, activePlace.step, domain)
    if (next === null) {
      preservedPlaceRef.current = null
      restorePlaceRef.current = null
      onValueChangeRef.current(null)
      setDraft('')
    } else {
      const nextDraft = formatNumericInputValue(next, domain)
      if (nextDraft === raw) {
        preservedPlaceRef.current = { raw, caret: selectionStart, place: activePlace }
        restorePlaceRef.current = null
      } else {
        restorePlaceRef.current = activePlace.exponent
      }
      onValueChangeRef.current(next)
      setDraft(nextDraft)
    }
    inputRef.current?.focus()
  }

  const handleChange = (raw: string) => {
    if (!isNumericDraftSyntax(raw, domain)) return
    const parsed = parseNumericDraft(raw, domain, allowSubMinimumDraft)
    if (parsed.kind === 'invalid' || parsed.kind === 'out-of-domain') return
    preservedPlaceRef.current = null
    setDraft(raw)
    if (parsed.kind === 'blank') onValueChangeRef.current(null)
    else if (parsed.kind === 'valid') onValueChangeRef.current(parsed.value)
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(false)
    const parsed = parseNumericDraft(draft, domain, allowSubMinimumDraft)
    if (parsed.kind === 'blank') onValueChangeRef.current(null)
    setDraft(formatNumericInputValue(currentValueRef.current, domain))
    onBlur?.(event)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
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

  const label = inputProps['aria-label'] ?? inputProps.name ?? inputProps.placeholder ?? 'value'
  const parsedValue = parseNumericDraft(draft, domain, allowSubMinimumDraft)
  const valueIsNumeric = parsedValue.kind === 'valid'

  useEffect(() => {
    const input = inputRef.current
    if (!input || !focused) return

    const handleWheel = (event: globalThis.WheelEvent) => {
      if (document.activeElement !== input || event.deltaY === 0) return
      event.preventDefault()
      applyStep(event.deltaY < 0 ? 1 : -1)
    }

    input.addEventListener('wheel', handleWheel, { passive: false })
    return () => input.removeEventListener('wheel', handleWheel)
  }, [focused, draft, integer, precision, min, max, minExclusive])

  return (
    <div className="relative w-full min-w-0">
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
          preservedPlaceRef.current = null
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
        style={{ ...style, paddingRight: reserveMarker ? '2rem' : '1.5rem' }}
        data-numeric-editor="true"
      />
      {focused && !inputProps.disabled && !inputProps.readOnly && (
        <span className={`absolute inset-y-0 ${reserveMarker ? 'right-4' : 'right-0'} flex w-3 flex-col justify-center`}>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Increase ${label}`}
            onMouseDown={event => event.preventDefault()}
            onClick={() => applyStep(1)}
            className="grid h-3 flex-none place-items-center text-slate-500 hover:text-slate-950 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700"
          >
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Decrease ${label}`}
            onMouseDown={event => event.preventDefault()}
            onClick={() => applyStep(-1)}
            className="grid h-3 flex-none place-items-center text-slate-500 hover:text-slate-950 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700"
          >
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      )}
    </div>
  )
}
