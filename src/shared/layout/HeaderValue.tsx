import { NumericInput } from '../ui/NumericInput'
import { formatFullNumericValue } from '../ui/numeric-display'
import { useSelectedValue } from '../ui/selected-value'

export function HeaderValue() {
  const { selection } = useSelectedValue()
  const fullValue = formatFullNumericValue(selection?.value)

  return (
    <div data-header-value="true" role="group" aria-label="Selected numeric value" className="mr-1 flex h-8 w-[clamp(5rem,16vw,12rem)] min-w-0 shrink-0 items-center gap-1 whitespace-nowrap text-xs">
      <span className="shrink-0 font-sans text-[11px] text-slate-300">Value</span>
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
            displayMode="full"
            showStepper
            className="select-text border border-slate-500 bg-slate-50 px-1 text-right text-slate-900 focus-visible:border-blue-400"
          />
        ) : (
          <span data-selected-value-output="true" tabIndex={selection ? 0 : undefined} title={fullValue || undefined} className="block h-8 select-text overflow-x-auto overflow-y-hidden whitespace-nowrap font-mono leading-8 text-slate-100 tabular-nums">
            {fullValue || '—'}
          </span>
        )}
      </div>
      {selection?.percentage && <span className="shrink-0 text-slate-300">%</span>}
    </div>
  )
}
