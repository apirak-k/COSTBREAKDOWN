import { businessNumberPresentation, type NumericDisplayOptions } from './numeric-display'

/** Fixed decimal anchor for ordinary values; scientific/integer tokens use the whole right edge. */
export function BusinessNumber({ value, className, ...options }: NumericDisplayOptions & {
  value: number | null | undefined
  className?: string
}) {
  const presentation = businessNumberPresentation(value, { ...options, percent: false })
  const padding = presentation.notation === 'ordinary' && presentation.fractionDigits === 2 ? '2ch' : undefined
  return <span data-numeric-presentation={presentation.notation} data-numeric-fraction-digits={presentation.fractionDigits}
    className={`inline-flex max-w-full items-baseline justify-end whitespace-nowrap font-mono tabular-nums ${className ?? ''}`}>
    <span data-numeric-token="true" style={{ paddingInlineEnd: padding }}>{presentation.text}</span>
    {options.percent && presentation.notation !== 'unavailable' && <span data-numeric-suffix="true" style={{ width: '1ch', marginLeft: '0.25ch' }}>%</span>}
  </span>
}
