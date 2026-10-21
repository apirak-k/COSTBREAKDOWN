import { useRef } from 'react'
import { NumericInput } from '../ui/NumericInput'
import { formatHeaderNumericValue } from '../ui/numeric-display'
import { useSelectedValue } from '../ui/selected-value'

export function HeaderValue({ inDialog = false }: { inDialog?: boolean }) {
  const { selection, focusedSelection, previewSelection, clearFocus } = useSelectedValue()
  const latestSources = useRef({ focusedId: focusedSelection?.id, previewId: previewSelection?.id })
  latestSources.current = { focusedId: focusedSelection?.id, previewId: previewSelection?.id }
  const headerValue = formatHeaderNumericValue(selection?.value)
  const rootWidth = inDialog ? 'w-[min(14rem,calc(100vw-6.25rem))]' : 'w-[clamp(5rem,17vw,12rem)]'
  const labelColor = inDialog ? 'text-slate-600' : 'text-slate-300'
  const outputColor = inDialog ? 'text-slate-900' : 'text-slate-100'
  const inputColors = inDialog
    ? 'border-slate-300 bg-white text-slate-900 focus-visible:border-blue-500'
    : 'border-slate-500 bg-transparent text-slate-100 hover:border-slate-400 focus-visible:border-slate-400'

  return (
    <div data-header-value="true" role="group" aria-label="Selected numeric value" className={`mr-1 flex h-8 ${rootWidth} min-w-0 shrink-0 items-center gap-1 whitespace-nowrap text-xs`}>
      <span className={`shrink-0 font-sans text-[11px] ${labelColor}`}>Value</span>
      <div className="min-w-0 flex-1">
        {selection?.editable ? (
          <NumericInput
            key={selection.id}
            aria-label="Selected value"
            value={selection.value}
            onValueChange={selection.onValueChange}
            {...selection.domain}
            allowSubMinimumDraft={selection.allowSubMinimumDraft}
            stopAtMinimum={selection.stopAtMinimum}
            displayMode="header"
            showStepper
            stepperButtonClassName={inDialog ? undefined : '!text-slate-200 hover:!text-white'}
            data-selected-value-source={selection.id}
            onBlur={event => {
              const sourceId = event.relatedTarget instanceof Element
                ? event.relatedTarget.getAttribute('data-selected-value-source')
                : null
              const sources = latestSources.current
              const replacedByPreview = sources.focusedId === selection.id
                && sources.previewId !== undefined
                && sources.previewId !== selection.id
              if (!replacedByPreview && sourceId !== selection.id) clearFocus(selection.id)
            }}
            className={`select-text border px-1 text-right ${inputColors}`}
          />
        ) : (
          <span data-selected-value-output="true" tabIndex={selection ? 0 : undefined} title={headerValue || undefined} className={`block h-8 select-text overflow-x-auto overflow-y-hidden whitespace-nowrap font-mono leading-8 tabular-nums ${outputColor}`}>
            {headerValue || '—'}
          </span>
        )}
      </div>
      {selection?.percentage && <span className={`shrink-0 ${labelColor}`}>%</span>}
    </div>
  )
}
