import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { formatNumber } from '../../core'
import type { ScenarioFinancialResult, ScenarioStory } from '../../core/types'
import { COST_ELEMENT_COLORS } from '../cost-breakdown/components/cost-element-colors'

type MetricKey = keyof ScenarioFinancialResult
type CostPartKey = 'material' | 'labor' | 'burden'
type LegendKey = CostPartKey | 'sga' | 'opPositive' | 'opNegative' | 'sellingPrice' | 'ruler'

interface ChartPart {
  key: MetricKey
  legendKey: LegendKey | null
  tooltipLabel: string
  color: string
}

interface LegendItem {
  key: LegendKey
  label: string
  color: string
  sample: 'box' | 'line' | 'dashed'
}

const COST_PARTS: ChartPart[] = [
  { key: 'material', legendKey: 'material', tooltipLabel: 'Material', color: COST_ELEMENT_COLORS.material },
  { key: 'labor', legendKey: 'labor', tooltipLabel: 'Labor', color: COST_ELEMENT_COLORS.labor },
  { key: 'burden', legendKey: 'burden', tooltipLabel: 'Burden', color: COST_ELEMENT_COLORS.burden }
]

const OPERATING_PROFIT_POSITIVE = '#15803d'
const OPERATING_PROFIT_NEGATIVE = '#be123c'
const SELLING_PRICE_COLOR = '#1d4ed8'
const RULER_COLOR = '#64748b'

const STATE_PARTS: ChartPart[] = [
  ...COST_PARTS,
  { key: 'sgaAmountPerPiece', legendKey: 'sga', tooltipLabel: 'SG&A', color: '#94a3b8' },
  { key: 'operatingProfitPerPiece', legendKey: null, tooltipLabel: 'Operating Profit', color: OPERATING_PROFIT_POSITIVE }
]

const LEGEND_ITEMS: LegendItem[] = [
  { key: 'material', label: 'MAT', color: COST_ELEMENT_COLORS.material, sample: 'box' },
  { key: 'labor', label: 'LB', color: COST_ELEMENT_COLORS.labor, sample: 'box' },
  { key: 'burden', label: 'BD', color: COST_ELEMENT_COLORS.burden, sample: 'box' },
  { key: 'sga', label: 'SG&A', color: '#94a3b8', sample: 'box' },
  { key: 'opPositive', label: 'OP+', color: OPERATING_PROFIT_POSITIVE, sample: 'box' },
  { key: 'opNegative', label: 'OP−', color: OPERATING_PROFIT_NEGATIVE, sample: 'box' },
  { key: 'sellingPrice', label: 'Selling Price', color: SELLING_PRICE_COLOR, sample: 'line' },
  { key: 'ruler', label: 'Ruler', color: RULER_COLOR, sample: 'dashed' }
]

const DEFAULT_LEGEND_VISIBILITY: Record<LegendKey, boolean> = {
  material: true,
  labor: true,
  burden: true,
  sga: true,
  opPositive: true,
  opNegative: true,
  sellingPrice: true,
  ruler: true
}

const STATE_LAYOUT = [
  { key: 'reference', label: 'REF', description: 'Reference', x: 180 },
  { key: 'current', label: 'CUR', description: 'Current', x: 430 },
  { key: 'simulated', label: 'SIM', description: 'Simulated', x: 680 }
] as const

interface SimulationStoryGraphProps {
  story: ScenarioStory
  unit: string
}

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

function isPartVisible(part: ChartPart, value: number, visible: Record<LegendKey, boolean>): boolean {
  if (part.key === 'operatingProfitPerPiece') return visible[value > 0 ? 'opPositive' : 'opNegative']
  return part.legendKey === null || visible[part.legendKey]
}

function gapTotalColor(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '#94a3b8'
  if (value > 0) return '#be123c'
  if (value < 0) return '#15803d'
  return '#475569'
}

export function SimulationStoryGraph({ story, unit }: SimulationStoryGraphProps) {
  const [visibleLegend, setVisibleLegend] = useState(DEFAULT_LEGEND_VISIBILITY)
  const [manualRulerLevel, setManualRulerLevel] = useState<number | null>(null)
  const [rulerFocused, setRulerFocused] = useState(false)
  const stateValues = useMemo(() => STATE_LAYOUT.map(state => ({
    ...state,
    values: story[state.key]
  })), [story])
  const gapValues = useMemo(() => [
    { key: 'gap1', label: 'GAP 1', description: 'CUR − REF', x: 305, values: story.gap1 },
    { key: 'gap2', label: 'GAP 2', description: 'SIM − CUR', x: 555, values: story.gap2 }
  ], [story])
  const categoryLabels = [
    { key: 'reference', label: 'REF', x: 180, value: story.reference.standardCost, isGap: false },
    { key: 'gap1', label: 'GAP 1', x: 305, value: story.gap1.standardCost, isGap: true },
    { key: 'current', label: 'CUR', x: 430, value: story.current.standardCost, isGap: false },
    { key: 'gap2', label: 'GAP 2', x: 555, value: story.gap2.standardCost, isGap: true },
    { key: 'simulated', label: 'SIM', x: 680, value: story.simulated.standardCost, isGap: false }
  ]
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

  const rulerLevel = clamp(manualRulerLevel ?? story.current.standardCost ?? 0, minimum, maximum)
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
      ArrowDown: -step,
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

  const pricePoints = visibleLegend.sellingPrice
    ? stateValues.flatMap(state => state.values.sellingPrice === null || !Number.isFinite(state.values.sellingPrice)
      ? []
      : [{ x: state.x, y: y(state.values.sellingPrice), value: state.values.sellingPrice, label: state.description }])
    : []
  const priceLines = visibleLegend.sellingPrice ? stateValues.slice(0, -1).flatMap((state, index) => {
    const nextState = stateValues[index + 1]
    const first = state.values.sellingPrice
    const second = nextState.values.sellingPrice
    if (first === null || second === null || !Number.isFinite(first) || !Number.isFinite(second)) return []
    return [{ path: `M ${state.x} ${y(first)} L ${nextState.x} ${y(second)}`, label: `${state.description} to ${nextState.description}` }]
  }) : []

  return (
    <figure aria-labelledby="simulation-story-title" className="min-w-0 border border-slate-300 bg-white px-2.5 py-2.5 xl:flex xl:min-h-0 xl:flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-1.5">
        <h2 id="simulation-story-title" className="text-xs font-semibold text-slate-900">Simulation Parameter Cost Effect</h2>
      </div>

      <div className="min-w-0 xl:min-h-0 xl:flex-1">
        <svg
          aria-labelledby="simulation-story-svg-title simulation-story-svg-description"
          viewBox="0 0 820 332"
          preserveAspectRatio="none"
          className="mt-1 block h-[250px] w-full sm:h-auto xl:h-full"
          style={{ touchAction: 'pan-x' }}
        >
          <title id="simulation-story-svg-title">Simulation Parameter Cost Effect</title>
          <desc id="simulation-story-svg-description">Reference, Current, and SIM state bars show MAT, LB, BD, SG&A, and Operating Profit. GAP 1 is Current minus Reference. GAP 2 is SIM minus Current and show MAT, LB, and BD only. Negative values extend below zero. Selling Price is a separate line. Drag the dashed ruler vertically or use Arrow Up, Arrow Down, Page Up, Page Down, Home, and End keys. Legend buttons hide or show graph series without changing calculations.</desc>

          {[0, 1, 2, 3, 4].map(step => {
            const value = minimum + (span * step) / 4
            const lineY = y(value)
            return (
              <g key={step}>
                <line x1={plot.left} x2={plot.right} y1={lineY} y2={lineY} stroke={Math.abs(value) < span * 0.0001 ? '#64748b' : '#e2e8f0'} strokeWidth={Math.abs(value) < span * 0.0001 ? 1.4 : 1} />
                <text data-axis-tick={step} x="110" y={lineY + 3} textAnchor="end" fill="#64748b" fontSize="9px" fontFamily="ui-monospace, monospace">{formatNumber(value, 2)}</text>
              </g>
            )
          })}
          <line x1={plot.left} x2={plot.right} y1={zeroY} y2={zeroY} stroke="#64748b" strokeWidth="1.4" />
          <text x="15" y="22" fill="#64748b" fontSize="9px" fontFamily="ui-monospace, monospace">{`THB/${unit}`}</text>

          {stateValues.map(state => {
            let positiveBase = 0
            let negativeBase = 0
            return (
              <g key={state.key} data-graph-state={state.key}>
                {STATE_PARTS.map(part => {
                  const value = state.values[part.key]
                  if (value === null || !Number.isFinite(value) || value === 0) return null
                  const before = value > 0 ? positiveBase : negativeBase
                  const after = before + value
                  if (value > 0) positiveBase = after
                  else negativeBase = after
                  if (!isPartVisible(part, value, visibleLegend)) return null
                  const color = part.key === 'operatingProfitPerPiece'
                    ? value > 0 ? OPERATING_PROFIT_POSITIVE : OPERATING_PROFIT_NEGATIVE
                    : part.color
                  return (
                    <rect
                      key={part.key}
                      data-graph-part={part.key}
                      x={state.x - 27}
                      y={Math.min(y(before), y(after))}
                      width="54"
                      height={Math.max(Math.abs(y(before) - y(after)), 1)}
                      fill={color}
                      fillOpacity={part.key === 'operatingProfitPerPiece' ? 0.92 : 0.8}
                      stroke="none"
                    >
                      <title>{`${state.description} ${part.tooltipLabel}: ${formatValue(value)} THB/${unit}`}</title>
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
              <g key={gap.key} data-graph-gap={gap.key}>
                {COST_PARTS.map(part => {
                  const value = gap.values[part.key]
                  if (value === null || !Number.isFinite(value) || value === 0) return null
                  const before = value > 0 ? positiveBase : negativeBase
                  const after = before + value
                  if (value > 0) positiveBase = after
                  else negativeBase = after
                  if (!part.legendKey || !visibleLegend[part.legendKey]) return null
                  return (
                    <rect
                      key={part.key}
                      data-graph-part={part.key}
                      x={gap.x - 25}
                      y={Math.min(y(before), y(after))}
                      width="50"
                      height={Math.max(Math.abs(y(before) - y(after)), 1)}
                      fill={part.color}
                      fillOpacity="0.8"
                      stroke="none"
                    >
                      <title>{`${gap.label} ${part.tooltipLabel} Gap: ${signed(value)} THB/${unit}`}</title>
                    </rect>
                  )
                })}
              </g>
            )
          })}

          {priceLines.map(line => (
            <path key={line.label} d={line.path} fill="none" stroke={SELLING_PRICE_COLOR} strokeWidth="2">
              <title>{`${line.label} Selling Price line · THB/${unit}`}</title>
            </path>
          ))}
          {pricePoints.map(point => (
            <g key={point.label} data-graph-series="sellingPrice">
              <circle cx={point.x} cy={point.y} r="3.5" fill={SELLING_PRICE_COLOR} stroke="white" strokeWidth="1" />
              <text x={point.x} y={clamp(point.y - 9, plot.top + 9, plot.bottom - 3)} textAnchor="middle" fill={SELLING_PRICE_COLOR} fontSize="9px" fontWeight="700" fontFamily="ui-monospace, monospace">{formatValue(point.value)}</text>
              <title>{`${point.label} Selling Price: ${formatValue(point.value)} THB/${unit}`}</title>
            </g>
          ))}

          {visibleLegend.ruler && (
            <>
              <line data-ruler-line="true" x1={plot.left} x2={plot.right} y1={rulerY} y2={rulerY} stroke={rulerFocused ? '#2563eb' : RULER_COLOR} strokeWidth="1.2" strokeDasharray="4 5" opacity="0.8" pointerEvents="none" />
              <text data-ruler-value="true" x={plot.right + 7} y={clamp(rulerY - 3, plot.top + 10, plot.bottom - 1)} textAnchor="start" fill={rulerFocused ? '#1d4ed8' : '#475569'} fontSize="9px" fontWeight="600" fontFamily="ui-monospace, monospace" pointerEvents="none">{formatValue(rulerLevel)}</text>
              <g
                role="slider"
                tabIndex={0}
                aria-label="Simulation comparison ruler"
                aria-orientation="vertical"
                aria-valuemin={minimum}
                aria-valuemax={maximum}
                aria-valuenow={rulerLevel}
                aria-valuetext={`${formatValue(rulerLevel)} THB/${unit}`}
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
                <title>Drag near the dashed ruler line to compare cost levels. This guide does not change data.</title>
                <rect x={plot.left} y={rulerY - 5} width={plot.right - plot.left} height="10" fill="transparent" pointerEvents="all" />
              </g>
            </>
          )}

          {categoryLabels.map(category => (
            <g key={`${category.key}-labels`}>
              <text x={category.x} y={clamp(y(category.value ?? 0) + (category.isGap ? -8 : 13), plot.top + 10, plot.bottom - 1)} textAnchor="middle" fill={category.isGap ? gapTotalColor(category.value) : '#0f172a'} fontSize="9px" fontWeight="700" fontFamily="ui-monospace, monospace">
                {category.isGap ? signed(category.value) : formatValue(category.value)}
              </text>
              <text x={category.x} y="306" textAnchor="middle" fill="#0f172a" fontSize="11px" fontWeight="700" fontFamily="ui-monospace, monospace">{category.label}</text>
            </g>
          ))}
        </svg>
      </div>

      <ul aria-label="Simulation graph legend" className="flex flex-wrap gap-x-2.5 gap-y-1 border-t border-slate-200 pt-2 text-[11px]">
        {LEGEND_ITEMS.map(item => {
          const isVisible = visibleLegend[item.key]
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-label={item.label}
                aria-pressed={isVisible}
                title={`${isVisible ? 'Hide' : 'Show'} ${item.label}`}
                onClick={() => setVisibleLegend(current => ({ ...current, [item.key]: !current[item.key] }))}
                className={`inline-flex min-h-6 items-center gap-1.5 rounded-sm px-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700 ${isVisible ? 'text-slate-700' : 'text-slate-400 opacity-40'}`}
              >
                {item.sample === 'box' ? (
                  <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0" style={{ backgroundColor: item.color }} />
                ) : item.sample === 'line' ? (
                  <span aria-hidden="true" className="inline-block w-4 shrink-0 border-t-2" style={{ borderColor: item.color }} />
                ) : (
                  <span aria-hidden="true" className="inline-block w-4 shrink-0 border-t border-dashed" style={{ borderColor: item.color }} />
                )}
                <span>{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}
