import { useRef } from 'react'
import { NumericInput } from '../ui/NumericInput'
import { formatHeaderNumericValue } from '../ui/numeric-display'
import { useSelectedValue } from '../ui/selected-value'

export function HeaderValue({ inDialog = false }: { inDialog?: boolean }) {
  const { selection, focusedSelection, previewSelection, clearFocus } = useSelectedValue()
  const latestSources = useRef({ focusedId: focusedSelection?.id, previewId: previewSelection?.id })
  latestSources.current = { focusedId: focusedSelection?.id, previewId: previewSelection?.id }
  const headerValue = formatHeaderNumericValue(selection?.value, selection?.domain?.integer)
  const rootWidth = inDialog ? 'w-[min(14rem,calc(100vw-6.25rem))]' : 'w-[clamp(6rem,28vw,12rem)]'
  const labelColor = inDialog ? 'text-slate-600' : 'text-slate-300'
  const outputColor = inDialog ? 'text-slate-900' : 'text-slate-100'
  const inputColors = inDialog
    ? 'border-transparent bg-white text-slate-900 group-hover/header-input:border-slate-400 focus:!border-blue-500 focus:!ring-1 focus:!ring-blue-500'
    : 'border-transparent bg-transparent text-slate-100 group-hover/header-input:border-slate-500 focus:!border-blue-400 focus:!ring-1 focus:!ring-blue-400'

  return (
    <div data-header-value="true" role="group" aria-label="Selected numeric value" className={`mr-1 flex h-8 ${rootWidth} min-w-0 shrink-0 items-center gap-1 whitespace-nowrap text-xs`}>
      <span className={`w-8 shrink-0 font-sans text-[11px] ${labelColor}`}>Value</span>
      <div data-header-numeric-zone="true" className="group/header-input relative h-8 min-w-0 flex-1">
        {selection?.editable ? (
          <NumericInput
            key={selection.id}
            aria-label="Selected value"
            value={selection.value}
            exactValue={selection.exactValue}
            onValueChange={selection.onValueChange}
            {...selection.domain}
            allowSubMinimumDraft={selection.allowSubMinimumDraft}
            stopAtMinimum={selection.stopAtMinimum}
            displayMode="header"
            showStepper
            stepperButtonClassName={inDialog ? undefined : '!text-slate-200 hover:!text-white'}
            data-selected-value-source={selection.id}
            onFocus={() => selection.onBeginEdit?.()}
            onBlur={event => {
              selection.onCommitEdit?.()
              const sourceId = event.relatedTarget instanceof Element
                ? event.relatedTarget.getAttribute('data-selected-value-source')
                : null
              const sources = latestSources.current
              const replacedByPreview = sources.focusedId === selection.id
                && sources.previewId !== undefined
                && sources.previewId !== selection.id
              if (!replacedByPreview && sourceId !== selection.id) clearFocus(selection.id)
            }}
            className={`select-text border px-1 text-right transition-colors ${inputColors}`}
          />
        ) : (
          <span data-selected-value-output="true" tabIndex={selection ? 0 : undefined} title={headerValue || undefined} className={`block h-8 w-full select-text overflow-clip whitespace-nowrap border border-transparent px-1 pr-9 text-right font-mono leading-8 tabular-nums ${outputColor}`}>
            {headerValue || '—'}
          </span>
        )}
        {!selection?.editable && <span data-header-spinner-slot="true" aria-hidden="true" className="pointer-events-none invisible absolute inset-y-0 right-1 h-8 w-3" />}
        <span data-header-percent-slot="true" aria-hidden="true" className={`pointer-events-none absolute inset-y-0 right-5 flex h-8 w-[10px] items-center justify-center font-sans text-[11px] ${labelColor}`}>
          {selection?.percentage ? '%' : ''}
        </span>
      </div>
    </div>
  )
}
