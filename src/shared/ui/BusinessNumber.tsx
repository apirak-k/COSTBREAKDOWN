import { useRef, type ReactNode } from 'react'
import { NumericColumnSlot } from './NumericColumnSlot'
import { businessNumberPresentation, type NumericDisplayOptions } from './numeric-display'
import { measureNumericText, numericDecimalPrefixWidth, numericColumnPresentation, numericScientificFitFloor, useNumericColumnMetrics } from './numeric-column-layout'

interface BusinessNumberProps extends NumericDisplayOptions {
  value: number | null | undefined
  className?: string
  numericColumn?: boolean
  compactPercentSuffix?: boolean
  numericColumnSigned?: boolean
  numericColumnReserveEnd?: number
  prefix?: string
  renderToken?: (content: ReactNode) => ReactNode
}

/** Fixed column centerline is opt-in; graph and toolbar tokens retain their existing layout. */
export function BusinessNumber({ value, className, numericColumn = false, compactPercentSuffix = false, numericColumnSigned = true, numericColumnReserveEnd = 0, prefix = '', renderToken, ...options }: BusinessNumberProps) {
  const regionRef = useRef<HTMLSpanElement>(null)
  const metrics = useNumericColumnMetrics(regionRef, numericColumn)
  const measure = (text: string) => measureNumericText(text, metrics.font, metrics.letterSpacing)
  const presentation = numericColumn
    ? numericColumnPresentation(value, options, metrics.width, measure, numericColumnReserveEnd, prefix)
    : businessNumberPresentation(value, { ...options, percent: false })
  const text = `${prefix}${presentation.text}`
  const padding = presentation.notation === 'ordinary' && presentation.fractionDigits === 2 ? '2ch' : undefined
  const token = <span data-numeric-token="true" style={numericColumn ? undefined : { paddingInlineEnd: padding }}>{text}</span>

  if (numericColumn) {
    const ordinary = presentation.notation === 'ordinary'
    const wholeWidth = numericDecimalPrefixWidth(text, measure)
    return <NumericColumnSlot percentage={options.percent} showSuffix={!compactPercentSuffix && presentation.notation !== 'unavailable'} className={`items-baseline whitespace-nowrap font-mono tabular-nums ${className ?? ''}`}>
      <span ref={regionRef} data-numeric-column="true" data-numeric-region="true"
        data-numeric-presentation={presentation.notation} data-numeric-fraction-digits={presentation.fractionDigits}
        data-numeric-fit-inset="2" data-numeric-reserve-end={numericColumnReserveEnd}
        data-numeric-fit={presentation.notation}
        data-numeric-fit-floor={metrics.width + 0.5 >= numericScientificFitFloor(measure, numericColumnSigned, prefix) + 2 * numericColumnReserveEnd ? 'adequate' : 'insufficient'}
        className={`block min-w-0 ${compactPercentSuffix ? 'overflow-visible' : 'overflow-hidden'} text-left`}>
        <span className="relative inline-block" style={{ left: '50%', transform: ordinary ? `translateX(-${wholeWidth}px)` : 'translateX(-50%)' }}>
          {renderToken ? renderToken(token) : token}
          {options.percent && compactPercentSuffix && presentation.notation !== 'unavailable' && <span data-numeric-suffix="true" className="absolute left-full ml-1">%</span>}
        </span>
      </span>
    </NumericColumnSlot>
  }

  return <span data-numeric-presentation={presentation.notation} data-numeric-fraction-digits={presentation.fractionDigits}
    className={`inline-flex max-w-full items-baseline justify-end whitespace-nowrap font-mono tabular-nums ${className ?? ''}`}>
    {renderToken ? renderToken(token) : token}
    {options.percent && presentation.notation !== 'unavailable' && <span data-numeric-suffix="true" style={{ width: '1ch', marginLeft: '0.25ch' }}>%</span>}
  </span>
}
