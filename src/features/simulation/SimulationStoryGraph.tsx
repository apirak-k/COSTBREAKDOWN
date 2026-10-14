import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { formatNumber } from '../../core'
import type { ScenarioFinancialResult, ScenarioStory } from '../../core/types'

type MetricKey = keyof ScenarioFinancialResult
type CostPartKey = 'material' | 'labor' | 'burden'

interface ChartPart {
  key: MetricKey
  label: string
  color: string
  highlight: CostPartKey | null
}

const COST_PARTS: ChartPart[] = [
  { key: 'material', label: 'MAT', color: '#5b91c8', highlight: 'material' },
  { key: 'labor', label: 'LB', color: '#e6b422', highlight: 'labor' },
  { key: 'burden', label: 'BD', color: '#55964b', highlight: 'burden' }
]

const STATE_PARTS: ChartPart[] = [
  ...COST_PARTS,
  { key: 'sgaAmountPerPiece', label: 'SG&A', color: '#94a3b8', highlight: null },
  { key: 'operatingProfitPerPiece', label: 'OP', color: '#8b73ad', highlight: null }
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
    <figure aria-labelledby="simulation-story-title" className="border border-slate-300 bg-white px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <h2 id="simulation-story-title" className="text-sm font-semibold text-slate-900">Simulation Cost Graph</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">REF → GAP 1 → CUR → GAP 2 → SIM · THB/pc</p>
        </div>
        <p className="text-[11px] text-slate-500">Standard Cost = MAT + LB + BD · Selling Price shown separately</p>
      </div>

      <div className="min-w-0">
        <svg
          aria-labelledby="simulation-story-svg-title simulation-story-svg-description"
          viewBox="0 0 820 332"
          preserveAspectRatio="none"
          className="mt-1 block h-[250px] w-full sm:h-auto"
          style={{ touchAction: 'pan-x' }}
        >
          <title id="simulation-story-svg-title">Simulation cost result graph</title>
          <desc id="simulation-story-svg-description">Reference, Current, and SIM stacked costs show MAT, LB, BD, SG&A, and OP. Gap 1 is Current minus Reference. Gap 2 is SIM minus Current. Negative components extend below zero. Selling Price is a separate line. Drag or use the keyboard on the ruler for visual comparison only.</desc>

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
                      fill={part.color}
                      stroke={highlighted ? '#0f172a' : 'none'}
                      strokeWidth={highlighted ? 2 : 0}
                    >
                      <title>{`${state.description} ${part.label}: ${formatValue(value)} THB/pc`}</title>
                    </rect>
                  )
                })}
                <text x={state.x} y={clamp(y(state.values.standardCost ?? 0) + 13, plot.top + 12, plot.bottom - 2)} textAnchor="middle" fill="#0f172a" fontSize="9px" fontWeight="700" fontFamily="ui-monospace, monospace">
                  {`STD ${formatValue(state.values.standardCost)}`}
                </text>
                <text x={state.x} y="306" textAnchor="middle" fill="#0f172a" fontSize="11px" fontWeight="700" fontFamily="ui-monospace, monospace">{state.label}</text>
                <text className="hidden sm:inline" x={state.x} y="320" textAnchor="middle" fill="#64748b" fontSize="9px">{state.description}</text>
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
                <text x={gap.x} y={clamp(y(gap.values.standardCost ?? 0) - 8, plot.top + 10, plot.bottom - 1)} textAnchor="middle" fill="#0f172a" fontSize="9px" fontWeight="700" fontFamily="ui-monospace, monospace">
                  {`SC ${signed(gap.values.standardCost)}`}
                </text>
                <text x={gap.x} y="306" textAnchor="middle" fill="#0f172a" fontSize="11px" fontWeight="700" fontFamily="ui-monospace, monospace">{gap.label}</text>
                <text className="hidden sm:inline" x={gap.x} y="320" textAnchor="middle" fill="#64748b" fontSize="9px">{gap.description}</text>
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
            onKeyDown={handleRulerKeyDown}
            onFocus={() => setRulerFocused(true)}
            onBlur={() => setRulerFocused(false)}
            className="cursor-ns-resize touch-none focus-visible:outline-none"
          >
            <title>Drag vertically to compare cost levels. This guide does not change data.</title>
            <line x1={plot.left} x2={plot.right} y1={rulerY} y2={rulerY} stroke={rulerFocused ? '#2563eb' : '#64748b'} strokeWidth={rulerFocused ? 2 : 1.25} strokeDasharray="5 4" opacity="0.9" pointerEvents="none" />
            <line x1={plot.left} x2={plot.right} y1={rulerY} y2={rulerY} stroke="transparent" strokeWidth="16" pointerEvents="stroke" />
            {rulerFocused && <line x1={plot.left} x2={plot.right} y1={rulerY - 5} y2={rulerY - 5} stroke="#2563eb" strokeWidth="1" opacity="0.45" pointerEvents="none" />}
            <rect x="662" y={rulerY - 13} width="90" height="16" fill="white" fillOpacity="0.94" pointerEvents="none" />
            <text x="748" y={rulerY - 2} textAnchor="end" fill={rulerFocused ? '#1d4ed8' : '#475569'} fontSize="9px" fontWeight="700" fontFamily="ui-monospace, monospace" pointerEvents="none">{`RULER ${formatValue(rulerLevel)}`}</text>
            <rect x={plot.left} y={rulerY - 8} width={plot.right - plot.left} height="16" fill="transparent" pointerEvents="all" />
          </g>
        </svg>
      </div>

      <ul aria-label="Simulation graph legend" className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
        {STATE_PARTS.map(part => (
          <li key={part.key} className={`inline-flex items-center gap-1.5 ${part.highlight && highlightedParts[part.highlight] ? 'font-semibold text-slate-950' : ''}`}>
            <i className="h-2.5 w-2.5" style={{ backgroundColor: part.color }} />{part.label}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 bg-blue-700" />Selling Price</li>
        <li className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 border-t border-dashed border-slate-600" />Ruler · visual only</li>
      </ul>
      <figcaption className="mt-1 text-[10px] leading-4 text-slate-500">
        Gap 1 = Current − Reference. Gap 2 = SIM − Current. Each gap total is MAT + LB + BD; negative OP remains below zero.
      </figcaption>
    </figure>
  )
}
