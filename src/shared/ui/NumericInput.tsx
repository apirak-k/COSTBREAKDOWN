import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FocusEvent, InputHTMLAttributes, KeyboardEvent } from 'react'
import {
  formatNumericInputValue,
  isNumericDraftSyntax,
  parseNumericDraft,
  stepNumericValue,
  type NumericInputDomain
} from './numeric-input-rules'

export interface NumericInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max'>, NumericInputDomain {
  value: number | null | undefined
  onValueChange: (value: number | null) => void
  allowSubMinimumDraft?: boolean
  reserveMarker?: boolean
  spinnerStep?: number
  wheelStep?: number
}

const defaultInputClassName = 'h-8 w-full min-w-0 font-mono text-xs tabular-nums focus:outline-none'

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
  spinnerStep,
  wheelStep,
  onFocus,
  onBlur,
  onKeyDown,
  onPaste,
  style,
  ...inputProps
}: NumericInputProps) {
  const domain: NumericInputDomain = { integer, precision, min, max, minExclusive }
  const resolvedSpinnerStep = spinnerStep ?? (integer ? 1 : 1)
  const resolvedWheelStep = wheelStep ?? (integer ? 1 : 0.01)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentValueRef = useRef(value)
  const onValueChangeRef = useRef(onValueChange)
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(() => formatNumericInputValue(value, domain))

  currentValueRef.current = value
  onValueChangeRef.current = onValueChange

  useEffect(() => {
    if (!focused) setDraft(formatNumericInputValue(value, domain))
  }, [focused, value, integer, precision, min, max, minExclusive])

  const applyStep = (direction: 1 | -1, step: number) => {
    const next = stepNumericValue(currentValueRef.current, direction, step, domain)
    if (next === null) {
      onValueChangeRef.current(null)
      setDraft('')
    } else {
      onValueChangeRef.current(next)
      setDraft(formatNumericInputValue(next, domain))
    }
    inputRef.current?.focus()
  }

  const handleChange = (raw: string) => {
    if (!isNumericDraftSyntax(raw, domain)) return
    const parsed = parseNumericDraft(raw, domain, allowSubMinimumDraft)
    if (parsed.kind === 'invalid' || parsed.kind === 'out-of-domain') return
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
      event.preventDefault()
      event.stopPropagation()
      applyStep(event.key === 'ArrowUp' ? 1 : -1, resolvedSpinnerStep)
      return
    }
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
      applyStep(event.deltaY < 0 ? 1 : -1, resolvedWheelStep)
    }

    input.addEventListener('wheel', handleWheel, { passive: false })
    return () => input.removeEventListener('wheel', handleWheel)
  }, [focused, resolvedWheelStep, domain.integer, domain.precision, domain.min, domain.max, domain.minExclusive])

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
          setFocused(true)
          onFocus?.(event)
        }}
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
        style={{ ...style, paddingRight: reserveMarker ? '2.25rem' : '1rem' }}
        data-numeric-editor="true"
      />
      {focused && !inputProps.disabled && !inputProps.readOnly && (
        <span className={`absolute inset-y-0 ${reserveMarker ? 'right-5' : 'right-0'} flex w-4 flex-col border-l border-slate-200 bg-white`}>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Increase ${label}`}
            onMouseDown={event => event.preventDefault()}
            onClick={() => applyStep(1, resolvedSpinnerStep)}
            className="grid min-h-0 flex-1 place-items-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700"
          >
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Decrease ${label}`}
            onMouseDown={event => event.preventDefault()}
            onClick={() => applyStep(-1, resolvedSpinnerStep)}
            className="grid min-h-0 flex-1 place-items-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700"
          >
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
        </span>
      )}
    </div>
  )
}
