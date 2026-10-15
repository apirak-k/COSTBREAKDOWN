import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { formatNumber } from '../../core'
import type { ScenarioFinancialResult, ScenarioStory } from '../../core/types'
import { COST_ELEMENT_COLORS } from '../cost-breakdown/components/cost-element-colors'

type MetricKey = keyof ScenarioFinancialResult
type CostPartKey = 'material' | 'labor' | 'burden'

interface ChartPart {
  key: MetricKey
  label: string
  color: string
  highlight: CostPartKey | null
}

const COST_PARTS: ChartPart[] = [
  { key: 'material', label: 'MAT', color: COST_ELEMENT_COLORS.material, highlight: 'material' },
  { key: 'labor', label: 'LB', color: COST_ELEMENT_COLORS.labor, highlight: 'labor' },
  { key: 'burden', label: 'BD', color: COST_ELEMENT_COLORS.burden, highlight: 'burden' }
]

const OPERATING_PROFIT_POSITIVE = '#15803d'
const OPERATING_PROFIT_NEGATIVE = '#be123c'

const STATE_PARTS: ChartPart[] = [
  ...COST_PARTS,
  { key: 'sgaAmountPerPiece', label: 'SG&A', color: '#94a3b8', highlight: null },
  { key: 'operatingProfitPerPiece', label: 'OP', color: OPERATING_PROFIT_POSITIVE, highlight: null }
]

const STATE_LAYOUT = [
  { key: 'reference', label: 'REF', description: 'Reference', x: 180 },
  { key: 'current', label: 'CUR', description: 'Current', x: 430 },
  { key: 'simulated', label: 'SIM', description: 'Simulated', x: 680 }
] as const

function formatValue(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '—' : formatNumber(value, 2)
}

function signed(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : ''}${formatNumber(value, 2)}`
}

function stackExtent(values: Array<number | null>): { positive: number; negative: number } {
  let positive = 0
  let negative = 0
  values.forEach(value => {
    if (value === null || !Number.isFinite(value)) return
    if (value >= 0) positive += value
    else negative += value
  })
  return { positive, negative }
}

function finiteRangeValues(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value))
}

interface SimulationStoryGraphProps {
  story: ScenarioStory
  highlightedParts?: Partial<Record<CostPartKey, boolean>>
}

export function SimulationStoryGraph({ story, highlightedParts = {} }: SimulationStoryGraphProps) {
  const stateValues = useMemo(() => STATE_LAYOUT.map(state => ({
    ...state,
    values: story[state.key]
  })), [story])
  const gapValues = useMemo(() => [
    { key: 'gap1', label: 'GAP 1', description: 'CUR − REF', x: 305, values: story.gap1 },
    { key: 'gap2', label: 'GAP 2', description: 'SIM − CUR', x: 555, values: story.gap2 }
  ], [story])
  const rangeValues = useMemo(() => {
    const extents = [
      ...stateValues.map(state => stackExtent(STATE_PARTS.map(part => state.values[part.key]))),
      ...gapValues.map(gap => stackExtent(COST_PARTS.map(part => gap.values[part.key])))
    ]
    return finiteRangeValues([
      ...extents.flatMap(extent => [extent.positive, extent.negative]),
      ...stateValues.flatMap(state => [state.values.standardCost, state.values.sellingPrice]),
      ...gapValues.map(gap => gap.values.standardCost)
    ])
  }, [gapValues, stateValues])
  const plot = { left: 120, right: 752, top: 38, bottom: 272 }
  const rawMinimum = Math.min(0, ...rangeValues)
  const rawMaximum = Math.max(0, ...rangeValues)
  const rawSpan = rawMaximum - rawMinimum || 1
  const minimum = rawMinimum - rawSpan * 0.1
  const maximum = rawMaximum + rawSpan * 0.1
  const span = maximum - minimum
  const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
  const y = (value: number) => plot.top + ((maximum - value) / span) * (plot.bottom - plot.top)
  const zeroY = y(0)
  const importantLevels = finiteRangeValues([
    0,
    ...stateValues.flatMap(state => [state.values.standardCost, state.values.sellingPrice])
  ]).filter(value => value >= minimum && value <= maximum)
  const snapLevel = (value: number) => {
    const threshold = span * 0.008
    const nearest = importantLevels.reduce<number | null>((best, level) =>
      best === null || Math.abs(level - value) < Math.abs(best - value) ? level : best, null)
    return nearest !== null && Math.abs(nearest - value) <= threshold ? nearest : value
  }

  const [manualRulerLevel, setManualRulerLevel] = useState<number | null>(null)
  const [rulerFocused, setRulerFocused] = useState(false)
  const rulerLevel = manualRulerLevel ?? story.current.standardCost ?? 0
  const rulerY = y(rulerLevel)
  useEffect(() => {
    if (manualRulerLevel === null) return
    const clamped = clamp(manualRulerLevel, minimum, maximum)
    if (clamped !== manualRulerLevel) setManualRulerLevel(clamped)
  }, [manualRulerLevel, maximum, minimum])

  const updateRulerFromPointer = (event: PointerEvent<SVGGElement>) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!bounds || bounds.height === 0) return
    const svgY = ((event.clientY - bounds.top) / bounds.height) * 332
    const ratio = clamp((svgY - plot.top) / (plot.bottom - plot.top), 0, 1)
    setManualRulerLevel(snapLevel(maximum - ratio * span))
  }
  const handleRulerKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const step = span / 100
    const keySteps: Record<string, number> = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
      PageUp: step * 10,
      PageDown: -step * 10
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setManualRulerLevel(minimum)
    } else if (event.key === 'End') {
      event.preventDefault()
      setManualRulerLevel(maximum)
    } else if (keySteps[event.key] !== undefined) {
      event.preventDefault()
      setManualRulerLevel(snapLevel(clamp(rulerLevel + keySteps[event.key], minimum, maximum)))
    }
  }

  const pricePoints = stateValues.flatMap(state => state.values.sellingPrice === null || !Number.isFinite(state.values.sellingPrice)
    ? []
    : [{ x: state.x, y: y(state.values.sellingPrice), value: state.values.sellingPrice, label: state.description }])
  const priceLines = stateValues.slice(0, -1).flatMap((state, index) => {
    const nextState = stateValues[index + 1]
    const first = state.values.sellingPrice
    const second = nextState.values.sellingPrice
    if (first === null || second === null || !Number.isFinite(first) || !Number.isFinite(second)) return []
    return [`M ${state.x} ${y(first)} L ${nextState.x} ${y(second)}`]
  })

  return (
    <figure aria-labelledby="simulation-story-title" className="min-w-0 border border-slate-300 bg-white px-2.5 py-2.5 xl:flex xl:min-h-0 xl:flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-1.5">
        <div>
          <h2 id="simulation-story-title" className="text-xs font-semibold text-slate-900">Graph</h2>
        </div>
      </div>

      <div className="min-w-0 xl:min-h-0 xl:flex-1">
        <svg
          aria-labelledby="simulation-story-svg-title simulation-story-svg-description"
          viewBox="0 0 820 332"
          preserveAspectRatio="none"
          className="mt-1 block h-[250px] w-full sm:h-auto xl:h-full"
          style={{ touchAction: 'pan-x' }}
        >
          <title id="simulation-story-svg-title">Simulation cost result graph</title>
          <desc id="simulation-story-svg-description">Reference, Current, and SIM stacked costs show MAT, LB, BD, SG&A, and OP. Gap 1 is Current minus Reference. Gap 2 is SIM minus Current. Negative components extend below zero. Selling Price is a separate line. Drag vertically or use arrow, page, Home, and End keys on the horizontal ruler for visual comparison only.</desc>

          {[0, 1, 2, 3, 4].map(step => {
            const value = minimum + (span * step) / 4
            const lineY = y(value)
            return (
              <g key={step}>
                <line x1={plot.left} x2={plot.right} y1={lineY} y2={lineY} stroke={Math.abs(value) < span * 0.0001 ? '#64748b' : '#e2e8f0'} strokeWidth={Math.abs(value) < span * 0.0001 ? 1.4 : 1} />
                <text x="110" y={lineY + 3} textAnchor="end" fill="#64748b" fontSize="9px" fontFamily="ui-monospace, monospace">{formatNumber(value, 2)}</text>
              </g>
            )
          })}
          <line x1={plot.left} x2={plot.right} y1={zeroY} y2={zeroY} stroke="#64748b" strokeWidth="1.4" />
          <text x="15" y="22" fill="#64748b" fontSize="9px" fontFamily="ui-monospace, monospace">THB/pc</text>

          {stateValues.map(state => {
            let positiveBase = 0
            let negativeBase = 0
            return (
              <g key={state.key}>
                {STATE_PARTS.map(part => {
                  const value = state.values[part.key]
                  if (value === null || !Number.isFinite(value) || value === 0) return null
                  const before = value > 0 ? positiveBase : negativeBase
                  const after = before + value
                  if (value > 0) positiveBase = after
                  else negativeBase = after
                  const highlighted = Boolean(part.highlight && highlightedParts[part.highlight])
                  return (
                    <rect
                      key={part.key}
                      x={state.x - 27}
                      y={Math.min(y(before), y(after))}
                      width="54"
                      height={Math.max(Math.abs(y(before) - y(after)), 1)}
                      fill={part.key === 'operatingProfitPerPiece'
                        ? value > 0 ? OPERATING_PROFIT_POSITIVE : value < 0 ? OPERATING_PROFIT_NEGATIVE : '#94a3b8'
                        : part.color}
                      fillOpacity={part.key === 'operatingProfitPerPiece' ? 1 : 0.86}
                      stroke={highlighted ? '#0f172a' : 'none'}
                      strokeWidth={highlighted ? 2 : 0}
                    >
                      <title>{`${state.description} ${part.label}: ${formatValue(value)} THB/pc`}</title>
                    </rect>
                  )
                })}
              </g>
            )
          })}

          {gapValues.map(gap => {
            let positiveBase = 0
            let negativeBase = 0
            return (
              <g key={gap.key}>
                {COST_PARTS.map(part => {
                  const value = gap.values[part.key]
                  if (value === null || !Number.isFinite(value) || value === 0) return null
                  const before = value > 0 ? positiveBase : negativeBase
                  const after = before + value
                  if (value > 0) positiveBase = after
                  else negativeBase = after
                  const highlightKey = part.highlight
                  const highlighted = Boolean(highlightKey && highlightedParts[highlightKey])
                  return (
                    <rect
                      key={part.key}
                      x={gap.x - 25}
                      y={Math.min(y(before), y(after))}
                      width="50"
                      height={Math.max(Math.abs(y(before) - y(after)), 1)}
                      fill={part.color}
                      fillOpacity="0.86"
                      stroke={highlighted ? '#0f172a' : 'none'}
                      strokeWidth={highlighted ? 2 : 0}
                    >
                      <title>{`${gap.label} ${part.label} Gap: ${signed(value)} THB/pc`}</title>
                    </rect>
                  )
                })}
              </g>
            )
          })}

          {priceLines.map((path, index) => <path key={index} d={path} fill="none" stroke="#1d4ed8" strokeWidth="2" />)}
          {pricePoints.map(point => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="3.5" fill="#1d4ed8" stroke="white" strokeWidth="1" />
              <text x={point.x} y={clamp(point.y - 9, plot.top + 9, plot.bottom - 3)} textAnchor="middle" fill="#1d4ed8" fontSize="9px" fontWeight="700" fontFamily="ui-monospace, monospace">{`SP ${formatValue(point.value)}`}</text>
              <title>{`${point.label} Selling Price: ${formatValue(point.value)} THB/pc`}</title>
            </g>
          ))}

          <line x1={plot.left} x2={plot.right} y1={rulerY} y2={rulerY} stroke={rulerFocused ? '#2563eb' : '#475569'} strokeWidth="1.25" strokeDasharray="4 5" opacity="0.72" pointerEvents="none" />
          <rect x="690" y="8" width="122" height="18" fill="white" fillOpacity="0.95" stroke={rulerFocused ? '#2563eb' : '#cbd5e1'} strokeWidth="0.8" pointerEvents="none" />
          <text x="806" y="20" textAnchor="end" fill={rulerFocused ? '#1d4ed8' : '#475569'} fontSize="9px" fontWeight="700" fontFamily="ui-monospace, monospace" pointerEvents="none">{`RULER ${formatValue(rulerLevel)}`}</text>

          {stateValues.map(state => (
            <g key={`${state.key}-labels`}>
              <text x={state.x} y={clamp(y(state.values.standardCost ?? 0) + 13, plot.top + 12, plot.bottom - 2)} textAnchor="middle" fill="#0f172a" fontSize="9px" fontWeight="700" fontFamily="ui-monospace, monospace">
                {formatValue(state.values.standardCost)}
              </text>
              <text x={state.x} y="306" textAnchor="middle" fill="#0f172a" fontSize="11px" fontWeight="700" fontFamily="ui-monospace, monospace">{state.label}</text>
            </g>
          ))}
          {gapValues.map(gap => (
            <g key={`${gap.key}-labels`}>
              <text x={gap.x} y={clamp(y(gap.values.standardCost ?? 0) - 8, plot.top + 10, plot.bottom - 1)} textAnchor="middle" fill="#0f172a" fontSize="9px" fontWeight="700" fontFamily="ui-monospace, monospace">
                {signed(gap.values.standardCost)}
              </text>
              <text x={gap.x} y="306" textAnchor="middle" fill="#0f172a" fontSize="11px" fontWeight="700" fontFamily="ui-monospace, monospace">{gap.label}</text>
            </g>
          ))}

          <g
            role="slider"
            tabIndex={0}
            aria-label="Visual comparison ruler"
            aria-orientation="vertical"
            aria-valuemin={minimum}
            aria-valuemax={maximum}
            aria-valuenow={rulerLevel}
            aria-valuetext={`${formatValue(rulerLevel)} THB per piece`}
            onPointerDown={event => {
              if (event.button !== 0) return
              event.currentTarget.setPointerCapture(event.pointerId)
              updateRulerFromPointer(event)
            }}
            onPointerMove={event => { if (event.buttons !== 0) updateRulerFromPointer(event) }}
            onPointerUp={event => {
              updateRulerFromPointer(event)
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            onPointerCancel={event => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            onKeyDown={handleRulerKeyDown}
            onFocus={() => setRulerFocused(true)}
            onBlur={() => setRulerFocused(false)}
            className="cursor-ns-resize touch-none focus-visible:outline-none"
          >
            <title>Drag vertically to compare cost levels. This guide does not change data.</title>
            <rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} fill="transparent" pointerEvents="all" />
          </g>
        </svg>
      </div>

      <ul aria-label="Simulation graph legend" className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
        {STATE_PARTS.filter(part => part.key !== 'operatingProfitPerPiece').map(part => (
          <li key={part.key} className={`inline-flex items-center gap-1.5 ${part.highlight && highlightedParts[part.highlight] ? 'font-semibold text-slate-950' : ''}`}>
            <i className="h-2.5 w-2.5" style={{ backgroundColor: part.color }} />{part.label}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5" style={{ backgroundColor: OPERATING_PROFIT_POSITIVE }} />OP +</li>
        <li className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5" style={{ backgroundColor: OPERATING_PROFIT_NEGATIVE }} />OP −</li>
        <li className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 bg-blue-700" />Selling Price</li>
        <li className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 border-t border-dashed border-slate-600" />Ruler</li>
      </ul>
    </figure>
  )
}
