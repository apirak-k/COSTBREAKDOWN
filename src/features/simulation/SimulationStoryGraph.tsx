import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { formatNumber } from '../../core'
import type { MasterDataRole, ScenarioFinancialResult, ScenarioStory } from '../../core/types'
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
  marker: 'square' | 'sellingPrice' | 'ruler'
}

const COST_PARTS: ChartPart[] = [
  { key: 'material', legendKey: 'material', tooltipLabel: 'Material', color: COST_ELEMENT_COLORS.material },
  { key: 'labor', legendKey: 'labor', tooltipLabel: 'Labor', color: COST_ELEMENT_COLORS.labor },
  { key: 'burden', legendKey: 'burden', tooltipLabel: 'Burden', color: COST_ELEMENT_COLORS.burden }
]

const OPERATING_PROFIT_POSITIVE = '#4b9164'
const OPERATING_PROFIT_NEGATIVE = '#cc7489'
const SELLING_PRICE_COLOR = '#2563eb'
const RULER_COLOR = COST_ELEMENT_COLORS.standardCost
const SGA_COLOR = '#b8c2ce'

const STATE_PARTS: ChartPart[] = [
  ...COST_PARTS,
  { key: 'sgaAmountPerPiece', legendKey: 'sga', tooltipLabel: 'SG&A', color: SGA_COLOR },
  { key: 'operatingProfitPerPiece', legendKey: null, tooltipLabel: 'Operating Profit', color: OPERATING_PROFIT_POSITIVE }
]

const LEGEND_ITEMS: LegendItem[] = [
  { key: 'material', label: 'Material', color: COST_ELEMENT_COLORS.material, marker: 'square' },
  { key: 'labor', label: 'Labor', color: COST_ELEMENT_COLORS.labor, marker: 'square' },
  { key: 'burden', label: 'Burden', color: COST_ELEMENT_COLORS.burden, marker: 'square' },
  { key: 'sga', label: 'SG&A', color: SGA_COLOR, marker: 'square' },
  { key: 'opPositive', label: 'Profit +', color: OPERATING_PROFIT_POSITIVE, marker: 'square' },
  { key: 'opNegative', label: 'Profit −', color: OPERATING_PROFIT_NEGATIVE, marker: 'square' },
  { key: 'sellingPrice', label: 'Selling Price', color: SELLING_PRICE_COLOR, marker: 'sellingPrice' },
  { key: 'ruler', label: 'Ruler', color: RULER_COLOR, marker: 'ruler' }
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

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const STATE_LAYOUT = [
  { key: 'reference', label: 'Reference', description: 'Reference', x: 180 },
  { key: 'current', label: 'Current', description: 'Current', x: 430 },
  { key: 'custom', label: 'Custom', description: 'Custom', x: 680 }
] as const

interface SimulationStoryGraphProps {
  story: ScenarioStory
  unit: string
  activeRole: MasterDataRole
  onSelectActiveDataset: (role: MasterDataRole) => void
}

interface ActiveGraphTooltip {
  text: string
  anchor: { left: number; top: number; right: number; bottom: number }
  x: number
  y: number
  maxWidth: number
}

export function positionGraphTooltip(
  hostBounds: { width: number; height: number },
  anchorBounds: { left: number; top: number; right: number; bottom: number },
  tooltipBounds: { width: number; height: number }
): { x: number; y: number } {
  const inset = 8
  const gap = 8
  const x = Math.min(
    Math.max((anchorBounds.left + anchorBounds.right - tooltipBounds.width) / 2, inset),
    Math.max(inset, hostBounds.width - tooltipBounds.width - inset)
  )
  const aboveY = anchorBounds.top - tooltipBounds.height - gap
  const belowY = anchorBounds.bottom + gap
  const preferredY = aboveY >= inset ? aboveY : belowY
  const y = Math.min(
    Math.max(preferredY, inset),
    Math.max(inset, hostBounds.height - tooltipBounds.height - inset)
  )
  return { x, y }
}

function formatValue(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '—' : formatNumber(value, 2)
}

export function visibleNetMatchesStandardCost(
  visibleNet: number | null,
  standardCost: number | null
): boolean {
  if (visibleNet === null || standardCost === null || !Number.isFinite(visibleNet) || !Number.isFinite(standardCost)) return false
  return formatValue(visibleNet) === formatValue(standardCost)
}

function signed(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : ''}${formatNumber(value, 2)}`
}

function finiteRangeValues(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value))
}

function niceStep(roughStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const fraction = roughStep / magnitude
  const niceFraction = [1, 2, 2.5, 5, 10].reduce((best, candidate) =>
    Math.abs(candidate - fraction) < Math.abs(best - fraction) ? candidate : best, 1)
  return niceFraction * magnitude
}

function axisPrecision(step: number): number {
  if (step >= 1) return Number.isInteger(step) ? 0 : 1
  let precision = 2
  while (precision < 6 && Math.abs(step * 10 ** precision - Math.round(step * 10 ** precision)) > 1e-8) precision += 1
  return precision
}

export function buildGraphScale(values: Array<number | null | undefined>) {
  const finiteValues = finiteRangeValues(values)
  const rawMinimum = Math.min(0, ...finiteValues)
  const rawMaximum = Math.max(0, ...finiteValues)
  if (rawMinimum === 0 && rawMaximum === 0) return { minimum: -1, maximum: 1, step: 0.5 }

  const padding = (rawMaximum - rawMinimum) * 0.1
  const paddedMinimum = rawMinimum < 0 ? rawMinimum - padding : 0
  const paddedMaximum = rawMaximum > 0 ? rawMaximum + padding : 0
  const step = niceStep((paddedMaximum - paddedMinimum) / 5)
  return {
    minimum: Math.floor(paddedMinimum / step) * step,
    maximum: Math.ceil(paddedMaximum / step) * step,
    step
  }
}

interface VisibleStackSegment {
  part: ChartPart
  value: number
  before: number
  after: number
}

interface VisibleStack {
  segments: VisibleStackSegment[]
  positive: number
  negative: number
  total: number | null
}

interface GraphPoint {
  x: number
  y: number
}

interface GraphSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface TextBounds {
  left: number
  right: number
  top: number
  bottom: number
}

interface GraphLabelMetrics {
  fontSize: number
  ascent: number
  descent: number
}

const GRAPH_LABEL_BREAKPOINT = '(max-width: 639px)'
const WIDE_GRAPH_LABEL_METRICS: GraphLabelMetrics = { fontSize: 9, ascent: 8.25, descent: 2.35 }
const NARROW_GRAPH_LABEL_METRICS: GraphLabelMetrics = { fontSize: 16, ascent: 14.4, descent: 4.8 }
const VISIBLE_NET_LABEL_CLEARANCE = 2
const SELLING_PRICE_POINT_RADIUS = 4

function visibleNetTextBounds(
  value: number,
  x: number,
  baselineY: number,
  textAnchor: 'middle' | 'start',
  metrics: GraphLabelMetrics
): TextBounds {
  const width = formatValue(value).length * metrics.fontSize * 0.6
  const left = textAnchor === 'middle' ? x - width / 2 : x
  return {
    left,
    right: left + width,
    top: baselineY - metrics.ascent,
    bottom: baselineY + metrics.descent
  }
}

function boundsOverlap(first: TextBounds, second: TextBounds, clearance = 0): boolean {
  return first.left - clearance <= second.right && first.right + clearance >= second.left &&
    first.top - clearance <= second.bottom && first.bottom + clearance >= second.top
}

function lineCrowdsText(segment: GraphSegment, bounds: TextBounds): boolean {
  const left = Math.max(Math.min(segment.x1, segment.x2), bounds.left - VISIBLE_NET_LABEL_CLEARANCE)
  const right = Math.min(Math.max(segment.x1, segment.x2), bounds.right + VISIBLE_NET_LABEL_CLEARANCE)
  if (left > right) return false

  const yAt = (x: number) => segment.y1 + ((x - segment.x1) / (segment.x2 - segment.x1)) * (segment.y2 - segment.y1)
  const firstY = yAt(left)
  const secondY = yAt(right)
  const lineTop = Math.min(firstY, secondY)
  const lineBottom = Math.max(firstY, secondY)
  return lineTop <= bounds.bottom + VISIBLE_NET_LABEL_CLEARANCE && lineBottom >= bounds.top - VISIBLE_NET_LABEL_CLEARANCE
}

function visibleNetTextCrowdsSellingPrice(
  bounds: TextBounds,
  points: GraphPoint[],
  segments: GraphSegment[]
): boolean {
  const pointBounds = points.map(point => ({
    left: point.x - SELLING_PRICE_POINT_RADIUS,
    right: point.x + SELLING_PRICE_POINT_RADIUS,
    top: point.y - SELLING_PRICE_POINT_RADIUS,
    bottom: point.y + SELLING_PRICE_POINT_RADIUS
  }))
  return pointBounds.some(point => boundsOverlap(bounds, point, VISIBLE_NET_LABEL_CLEARANCE)) ||
    segments.some(segment => lineCrowdsText(segment, bounds))
}

function isPartVisible(part: ChartPart, value: number, visible: Record<LegendKey, boolean>): boolean {
  if (part.key === 'operatingProfitPerPiece') return visible[value > 0 ? 'opPositive' : 'opNegative']
  return part.legendKey === null || visible[part.legendKey]
}

export function buildVisibleStack(
  values: ScenarioFinancialResult,
  parts: ChartPart[],
  visible: Record<LegendKey, boolean>
): VisibleStack {
  let positive = 0
  let negative = 0
  let total = 0
  let unavailable = false
  const segments: VisibleStackSegment[] = []

  parts.forEach(part => {
    const enabled = part.key === 'operatingProfitPerPiece'
      ? visible.opPositive || visible.opNegative
      : part.legendKey === null || visible[part.legendKey]
    if (!enabled) return

    const value = values[part.key]
    if (value === null || !Number.isFinite(value)) {
      unavailable = true
      return
    }
    if (!isPartVisible(part, value, visible)) return

    total += value
    if (value === 0) return

    const before = value > 0 ? positive : negative
    const after = before + value
    if (value > 0) positive = after
    else negative = after
    segments.push({ part, value, before, after })
  })

  return { segments, positive, negative, total: unavailable ? null : total }
}

export function buildVisibleStandardCost(
  values: ScenarioFinancialResult,
  visible: Record<LegendKey, boolean>
): number | null {
  return buildVisibleStack(values, COST_PARTS, visible).total
}

function gapTotalColor(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '#94a3b8'
  if (value > 0) return '#be123c'
  if (value < 0) return '#15803d'
  return '#475569'
}

function isGraphTooltipTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-graph-tooltip]') !== null
}

export function SimulationStoryGraph({ story, unit, activeRole, onSelectActiveDataset }: SimulationStoryGraphProps) {
  const [visibleLegend, setVisibleLegend] = useState(DEFAULT_LEGEND_VISIBILITY)
  const [isNarrowGraphViewport, setIsNarrowGraphViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(GRAPH_LABEL_BREAKPOINT).matches)
  const allLegendVisible = LEGEND_ITEMS.every(item => visibleLegend[item.key])
  const [manualRulerLevel, setManualRulerLevel] = useState<number | null>(null)
  const [activeTooltip, setActiveTooltip] = useState<ActiveGraphTooltip | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const labelMetrics = isNarrowGraphViewport ? NARROW_GRAPH_LABEL_METRICS : WIDE_GRAPH_LABEL_METRICS
  const stateValues = useMemo(() => STATE_LAYOUT.map(state => ({
    ...state,
    values: story[state.key]
  })), [story])
  const gapValues = useMemo(() => [
    { key: 'gap1', label: 'GAP 1', description: 'Current − Reference', x: 305, values: story.gap1 },
    { key: 'gap2', label: 'GAP 2', description: 'Custom − Current', x: 555, values: story.gap2 }
  ], [story])
  const stateStacks = useMemo(() => stateValues.map(state => ({
    ...state,
    stack: buildVisibleStack(state.values, STATE_PARTS, visibleLegend)
  })), [stateValues, visibleLegend])
  const standardCostValues = useMemo(() => stateValues.map(state => {
    const stack = buildVisibleStack(state.values, COST_PARTS, visibleLegend)
    return { ...state, stack, value: stack.total }
  }), [stateValues, visibleLegend])
  const gapStacks = useMemo(() => gapValues.map(gap => ({
    ...gap,
    stack: buildVisibleStack(gap.values, COST_PARTS, visibleLegend)
  })), [gapValues, visibleLegend])
  const categoryLabels = [
    { key: 'reference', label: 'Reference', role: 'reference' as const, x: 180, isGap: false as const },
    { key: 'gap1', label: 'GAP 1', description: gapStacks[0].description, x: 305, value: gapStacks[0].stack.total, isGap: true as const },
    { key: 'current', label: 'Current', role: 'current' as const, x: 430, isGap: false as const },
    { key: 'gap2', label: 'GAP 2', description: gapStacks[1].description, x: 555, value: gapStacks[1].stack.total, isGap: true as const },
    { key: 'custom', label: 'Custom', role: 'custom' as const, x: 680, isGap: false as const }
  ]
  const rangeValues = useMemo(() => {
    return finiteRangeValues([
      ...stateStacks.flatMap(state => [state.stack.positive, state.stack.negative]),
      ...gapStacks.flatMap(gap => [gap.stack.positive, gap.stack.negative]),
      ...standardCostValues.map(state => state.value),
      ...(visibleLegend.sellingPrice ? stateValues.map(state => state.values.sellingPrice) : []),
    ])
  }, [gapStacks, standardCostValues, stateStacks, stateValues, visibleLegend])
  const plot = { left: 120, right: 752, top: 38, bottom: 272 }
  const { minimum, maximum, step: axisStep } = buildGraphScale(rangeValues)
  const span = maximum - minimum
  const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
  const y = (value: number) => plot.top + ((maximum - value) / span) * (plot.bottom - plot.top)
  const axisTickPrecision = axisPrecision(axisStep)
  const axisTicks = Array.from({ length: Math.round(span / axisStep) + 1 }, (_, index) => minimum + axisStep * index)
  const importantLevels = finiteRangeValues([
    0,
    ...stateStacks.flatMap(state => state.stack.segments.flatMap(segment => [segment.before, segment.after])),
    ...gapStacks.flatMap(gap => gap.stack.segments.flatMap(segment => [segment.before, segment.after])),
    ...standardCostValues.map(state => state.value),
    ...(visibleLegend.sellingPrice ? stateValues.map(state => state.values.sellingPrice) : [])
  ]).filter(value => value >= minimum && value <= maximum)
  const snapLevel = (value: number) => {
    const threshold = span * 0.008
    const nearest = importantLevels.reduce<number | null>((best, level) =>
      best === null || Math.abs(level - value) < Math.abs(best - value) ? level : best, null)
    return nearest !== null && Math.abs(nearest - value) <= threshold ? nearest : value
  }

  const rulerLevel = clamp(manualRulerLevel ?? story.current.standardCost ?? 0, minimum, maximum)
  const rulerY = y(rulerLevel)
  const showTooltipAt = (target: SVGElement, text: string) => {
    const host = target.ownerSVGElement?.parentElement
    if (!host) return
    const hostBounds = host.getBoundingClientRect()
    if (hostBounds.width === 0 || hostBounds.height === 0) return
    const elementBounds = target.getBoundingClientRect()
    const maxWidth = Math.max(0, Math.min(360, hostBounds.width - 16))
    setActiveTooltip({
      text,
      anchor: {
        left: elementBounds.left - hostBounds.left,
        top: elementBounds.top - hostBounds.top,
        right: elementBounds.right - hostBounds.left,
        bottom: elementBounds.bottom - hostBounds.top
      },
      x: 8,
      y: 8,
      maxWidth
    })
  }
  const tooltipProps = (text: string) => ({
    'data-graph-tooltip': 'true',
    role: 'img' as const,
    'aria-label': text,
    className: 'cursor-default',
    onPointerEnter: (event: PointerEvent<SVGElement>) => showTooltipAt(event.currentTarget, text),
    onPointerLeave: (event: PointerEvent<SVGElement>) => {
      if (!isGraphTooltipTarget(event.relatedTarget)) setActiveTooltip(null)
    }
  })
  const tooltipPointerProps = (text: string) => ({
    'data-graph-tooltip': 'true',
    onPointerEnter: (event: PointerEvent<SVGElement>) => showTooltipAt(event.currentTarget, text),
    onPointerLeave: (event: PointerEvent<SVGElement>) => {
      if (!isGraphTooltipTarget(event.relatedTarget)) setActiveTooltip(null)
    }
  })
  useEffect(() => {
    if (manualRulerLevel === null) return
    const clamped = clamp(manualRulerLevel, minimum, maximum)
    if (clamped !== manualRulerLevel) setManualRulerLevel(clamped)
  }, [manualRulerLevel, maximum, minimum])
  useEffect(() => {
    const mediaQuery = window.matchMedia(GRAPH_LABEL_BREAKPOINT)
    const updateLabelMetrics = () => setIsNarrowGraphViewport(mediaQuery.matches)
    updateLabelMetrics()
    mediaQuery.addEventListener('change', updateLabelMetrics)
    return () => mediaQuery.removeEventListener('change', updateLabelMetrics)
  }, [])
  useEffect(() => setActiveTooltip(null), [visibleLegend])
  useIsomorphicLayoutEffect(() => {
    const tooltip = tooltipRef.current
    const host = tooltip?.parentElement
    if (!activeTooltip || !tooltip || !host) return
    const hostBounds = host.getBoundingClientRect()
    const tooltipBounds = tooltip.getBoundingClientRect()
    const { x, y } = positionGraphTooltip(
      { width: hostBounds.width, height: hostBounds.height },
      activeTooltip.anchor,
      { width: tooltipBounds.width, height: tooltipBounds.height }
    )
    if (x !== activeTooltip.x || y !== activeTooltip.y) {
      setActiveTooltip(current => current?.text === activeTooltip.text ? { ...current, x, y } : current)
    }
  }, [activeTooltip])

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
    return [{
      x1: state.x,
      y1: y(first),
      x2: nextState.x,
      y2: y(second),
      path: `M ${state.x} ${y(first)} L ${nextState.x} ${y(second)}`,
      label: `${state.description} to ${nextState.description}`,
      tooltip: `${state.label} to ${nextState.label} Selling Price: ${formatValue(first)} to ${formatValue(second)} THB/${unit}`
    }]
  }) : []

  return (
    <figure aria-labelledby="simulation-story-title" className="min-w-0 border border-slate-300 bg-white px-2.5 py-2.5 xl:flex xl:min-h-0 xl:flex-col">
      <div className="flex min-w-0 flex-col gap-1.5 border-b border-slate-200 pb-1.5 min-[720px]:flex-row min-[720px]:items-center xl:gap-1 xl:flex-nowrap">
        <h2 id="simulation-story-title" className="shrink-0 text-xs font-semibold text-slate-900 xl:whitespace-nowrap">Simulation Cost Structure</h2>
        <ul aria-label="Simulation graph legend" className="flex min-w-0 flex-wrap gap-x-2.5 gap-y-1 border-t border-slate-200 pt-1.5 text-[11px] min-[720px]:flex-1 min-[720px]:border-l min-[720px]:border-t-0 min-[720px]:pl-2.5 min-[720px]:pt-0 xl:flex-none xl:flex-nowrap xl:gap-x-1 xl:pl-1.5">
          {LEGEND_ITEMS.map(item => {
            const isVisible = visibleLegend[item.key]
            return (
              <li key={item.key} className="xl:shrink-0">
                <button
                  type="button"
                  aria-label={item.label}
                  aria-pressed={isVisible}
                  onClick={() => setVisibleLegend(current => ({ ...current, [item.key]: !current[item.key] }))}
                  className={`inline-flex min-h-6 items-center gap-1.5 rounded-sm px-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700 xl:gap-1 xl:px-px xl:whitespace-nowrap ${isVisible ? 'text-slate-700' : 'text-slate-500'}`}
                >
                  {item.marker === 'square' ? (
                    <span
                      aria-hidden="true"
                      className={`inline-block h-2.5 w-2.5 shrink-0 ${isVisible ? 'border' : 'border-2'}`}
                      style={{ backgroundColor: isVisible ? item.color : 'transparent', borderColor: item.color }}
                    />
                  ) : (
                    <span aria-hidden="true" className="relative inline-flex h-2.5 w-4 shrink-0 items-center justify-center">
                      {item.marker === 'sellingPrice' ? (
                        <>
                          <span className="absolute inset-x-0 top-1/2 border-t-2 border-solid" style={{ borderColor: isVisible ? item.color : '#64748b' }} />
                          <span className="relative h-2 w-2 rounded-full border border-white" style={{ backgroundColor: isVisible ? item.color : '#64748b' }} />
                        </>
                      ) : (
                        <span className="w-full border-t-2 border-dashed" style={{ borderColor: isVisible ? item.color : '#64748b' }} />
                      )}
                    </span>
                  )}
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          disabled={allLegendVisible}
          onClick={() => setVisibleLegend(DEFAULT_LEGEND_VISIBILITY)}
          className={`min-h-6 self-end rounded-sm px-0.5 text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700 min-[720px]:ml-2 min-[720px]:self-auto xl:shrink-0 xl:px-px xl:whitespace-nowrap ${allLegendVisible ? 'cursor-default text-slate-400' : 'cursor-pointer text-slate-700 hover:underline'}`}
        >
          Show all
        </button>
      </div>

      <div
        data-graph-tooltip-host="true"
        className="relative min-w-0 xl:min-h-0 xl:flex-1"
        onPointerLeave={() => setActiveTooltip(null)}
      >
        <svg
          aria-labelledby="simulation-story-title"
          aria-describedby="simulation-story-svg-description"
          viewBox="0 0 820 332"
          preserveAspectRatio="xMidYMid meet"
          className="simulation-story-chart mt-1 block h-[250px] w-full sm:h-auto xl:h-full"
          style={{ touchAction: 'pan-y' }}
        >
          <desc id="simulation-story-svg-description">Reference, Current, and Custom show visible Material, Labor, Burden, SG&amp;A, and sign-matched Profit. Standard Cost is visible Material plus Labor plus Burden. Visible Net is the signed total of visible state-stack segments and excludes Selling Price. GAP 1 is Current minus Reference; GAP 2 is Custom minus Current. Select a dataset label to choose the active parameter workspace. Legend filters change this graph view only, not Result or source data. Selling Price is separate, and the ruler is a comparison guide.</desc>

          <g transform="translate(-16 0)">
          {axisTicks.map((value, index) => {
            const lineY = y(value)
            const isZero = Math.abs(value) < axisStep * 0.0001
            return (
              <g key={index}>
                <line x1={plot.left} x2={plot.right} y1={lineY} y2={lineY} stroke={isZero ? '#94a3b8' : '#e2e8f0'} strokeWidth={isZero ? 1.2 : 1} />
                <line x1={plot.left - 3} x2={plot.left + 3} y1={lineY} y2={lineY} stroke="#64748b" strokeWidth="1" />
                <text data-axis-tick={index} x="110" y={lineY + 3} textAnchor="end" fill="#64748b" fontSize="9px" fontFamily="ui-monospace, monospace">{formatNumber(value, axisTickPrecision)}</text>
              </g>
            )
          })}
          <line data-y-axis="true" x1={plot.left} x2={plot.left} y1={plot.top} y2={plot.bottom} stroke="#64748b" strokeWidth="1.4" />
          <text data-y-axis-unit="true" aria-label={`Y-axis units: THB/${unit}`} x={plot.left} y={plot.top - 10} textAnchor="middle" fill="#334155" fontSize="11px" fontWeight="700" fontFamily="ui-monospace, monospace">{`THB/${unit}`}</text>

          {stateStacks.map(state => {
            return (
              <g key={state.key} data-graph-state={state.key}>
                {state.stack.segments.map(({ part, value, before, after }) => {
                  const color = part.key === 'operatingProfitPerPiece'
                    ? value > 0 ? OPERATING_PROFIT_POSITIVE : OPERATING_PROFIT_NEGATIVE
                    : part.color
                  const tooltip = `${state.description} ${part.tooltipLabel}: ${formatValue(value)} THB/${unit}`
                  return (
                    <rect
                      {...tooltipProps(tooltip)}
                      key={part.key}
                      data-graph-part={part.key}
                      x={state.x - 27}
                      y={Math.min(y(before), y(after))}
                      width="54"
                      height={Math.max(Math.abs(y(before) - y(after)), 1)}
                      fill={color}
                      stroke="none"
                    />
                  )
                })}
                {standardCostValues.filter(value => value.key === state.key).map(({ value, stack }) => {
                  if (value === null) return null
                  const boundaryY = y(value)
                  const tooltip = `${state.description} Standard Cost · ${formatValue(value)} THB/${unit}`
                  return (
                    <g {...tooltipProps(tooltip)} key="standard-cost">
                      <rect
                        aria-hidden="true"
                        x={state.x - 30}
                        y={Math.min(y(stack.positive), y(stack.negative))}
                        width="60"
                        height={Math.max(Math.abs(y(stack.positive) - y(stack.negative)), 1)}
                        fill="none"
                        stroke={COST_ELEMENT_COLORS.standardCost}
                        strokeWidth="1"
                        pointerEvents="none"
                      />
                      <line data-graph-standard-cost={state.key} x1={state.x - 27} x2={state.x + 27}
                        y1={boundaryY} y2={boundaryY} stroke={COST_ELEMENT_COLORS.standardCost} strokeWidth="1.2" />
                    </g>
                  )
                })}
              </g>
            )
          })}

          {gapStacks.map(gap => {
            return (
              <g key={gap.key} data-graph-gap={gap.key}>
                {gap.stack.segments.map(({ part, value, before, after }) => {
                  const tooltip = `${gap.label} · ${gap.description} · ${part.tooltipLabel} Gap: ${signed(value)} THB/${unit}`
                  return (
                    <rect
                      {...tooltipProps(tooltip)}
                      key={part.key}
                      data-graph-part={part.key}
                      x={gap.x - 25}
                      y={Math.min(y(before), y(after))}
                      width="50"
                      height={Math.max(Math.abs(y(before) - y(after)), 1)}
                      fill={part.color}
                      stroke="none"
                    />
                  )
                })}
              </g>
            )
          })}

          {priceLines.map(line => (
            <g {...tooltipProps(line.tooltip)} key={line.label}>
              <path d={line.path} fill="none" stroke={SELLING_PRICE_COLOR} strokeWidth="2" pointerEvents="none" />
              <path d={line.path} fill="none" stroke="transparent" strokeWidth="12" pointerEvents="stroke" />
            </g>
          ))}
          {pricePoints.map(point => {
            const tooltip = `${point.label} Selling Price: ${formatValue(point.value)} THB/${unit}`
            return (
              <g {...tooltipProps(tooltip)} key={point.label} data-graph-series="sellingPrice">
                <circle cx={point.x} cy={point.y} r="3.5" fill={SELLING_PRICE_COLOR} stroke="white" strokeWidth="1" pointerEvents="none" />
                <circle cx={point.x} cy={point.y} r="8" fill="transparent" pointerEvents="all" />
              </g>
            )
          })}

          {stateStacks.map(state => {
            const standardCost = standardCostValues.find(value => value.key === state.key)?.value ?? null
            if (standardCost === null) return null
            const standardCostValueLevelY = y(standardCost)
            let standardCostY = standardCostValueLevelY + labelMetrics.ascent
            const visibleNet = state.stack.total
            const standardCostTooltip = `${state.description} Standard Cost · ${formatValue(standardCost)} THB/${unit}`
            if (visibleNet === null || visibleNetMatchesStandardCost(visibleNet, standardCost)) {
              return (
                <g key={`${state.key}-cost-value-labels`} data-graph-state-labels={state.key}>
                  <text
                    {...tooltipPointerProps(standardCostTooltip)}
                    aria-hidden="true"
                    data-graph-standard-cost-value={state.key}
                    data-graph-standard-cost-value-level-y={standardCostValueLevelY}
                    data-graph-standard-cost-text-top={standardCostValueLevelY}
                    x={state.x + 35}
                    y={standardCostY}
                    textAnchor="start"
                    fill={COST_ELEMENT_COLORS.standardCost}
                    fontSize="9px"
                    fontWeight="700"
                    fontFamily="ui-monospace, monospace"
                  >
                    {formatValue(standardCost)}
                  </text>
                </g>
              )
            }

            const visibleNetEndpointY = y(visibleNet)
            const defaultNetPosition = visibleNet < 0 ? 'below' : 'above'
            const defaultNetY = visibleNetEndpointY + (defaultNetPosition === 'above' ? -12 : 16)
            const defaultNetBounds = visibleNetTextBounds(visibleNet, state.x, defaultNetY, 'middle', labelMetrics)
            const stateSellingPricePoint = pricePoints.find(point => point.x === state.x) ?? null
            const stateSellingPriceSegments = priceLines.filter(line => line.x1 === state.x || line.x2 === state.x)
            const sellingPriceIsAboveNet = visibleLegend.sellingPrice &&
              state.values.sellingPrice !== null && Number.isFinite(state.values.sellingPrice) &&
              state.values.sellingPrice > visibleNet
            const crowdsSellingPrice = sellingPriceIsAboveNet && stateSellingPricePoint !== null &&
              visibleNetTextCrowdsSellingPrice(defaultNetBounds, [stateSellingPricePoint], stateSellingPriceSegments)
            const netPosition = crowdsSellingPrice ? 'side' : defaultNetPosition
            const netTextAnchor = netPosition === 'side' ? 'start' : 'middle'
            const netX = netPosition === 'side' ? state.x + 35 : state.x
            let visibleNetY = netPosition === 'side'
              ? visibleNetEndpointY + labelMetrics.ascent
              : defaultNetY
            let standardCostTextBounds = visibleNetTextBounds(standardCost, state.x + 35, standardCostY, 'start', labelMetrics)
            let visibleNetBounds = visibleNetTextBounds(visibleNet, netX, visibleNetY, netTextAnchor, labelMetrics)

            if (netPosition === 'side' && boundsOverlap(visibleNetBounds, standardCostTextBounds)) {
              const upperLevel = Math.min(visibleNetEndpointY, standardCostValueLevelY)
              const lowerLevel = Math.max(visibleNetEndpointY, standardCostValueLevelY)
              const midpoint = (upperLevel + lowerLevel) / 2
              if (visibleNetEndpointY < standardCostValueLevelY) {
                visibleNetY = midpoint - labelMetrics.descent
                standardCostY = midpoint + labelMetrics.ascent
              } else {
                standardCostY = midpoint - labelMetrics.descent
                visibleNetY = midpoint + labelMetrics.ascent
              }
              visibleNetBounds = visibleNetTextBounds(visibleNet, netX, visibleNetY, netTextAnchor, labelMetrics)
              standardCostTextBounds = visibleNetTextBounds(standardCost, state.x + 35, standardCostY, 'start', labelMetrics)
            }

            const standardCostLabel = (
              <text
                {...tooltipPointerProps(standardCostTooltip)}
                aria-hidden="true"
                data-graph-standard-cost-value={state.key}
                data-graph-standard-cost-value-level-y={standardCostValueLevelY}
                data-graph-standard-cost-text-top={standardCostTextBounds.top}
                data-graph-standard-cost-text-bottom={standardCostTextBounds.bottom}
                x={state.x + 35}
                y={standardCostY}
                textAnchor="start"
                fill={COST_ELEMENT_COLORS.standardCost}
                fontSize="9px"
                fontWeight="700"
                fontFamily="ui-monospace, monospace"
              >
                {formatValue(standardCost)}
              </text>
            )
            const visibleNetTooltip = `${state.description} Visible Net · ${formatValue(visibleNet)} THB/${unit}`
            return (
              <g key={`${state.key}-cost-value-labels`} data-graph-state-labels={state.key}>
                {standardCostLabel}
                <text
                  {...tooltipProps(visibleNetTooltip)}
                  data-graph-visible-net-value={state.key}
                  data-graph-visible-net-position={netPosition}
                  data-graph-visible-net-vertical-position={visibleNetY < visibleNetEndpointY ? 'above' : 'below'}
                  data-graph-visible-net-endpoint-y={visibleNetEndpointY}
                  data-graph-visible-net-value-level-y={visibleNetEndpointY}
                  data-graph-visible-net-default-y={defaultNetY}
                  data-graph-visible-net-text-top={visibleNetBounds.top}
                  data-graph-visible-net-text-bottom={visibleNetBounds.bottom}
                  x={netX}
                  y={visibleNetY}
                  textAnchor={netTextAnchor}
                  fill="#334155"
                  fontSize="9px"
                  fontWeight="700"
                  fontFamily="ui-monospace, monospace"
                >
                  {formatValue(visibleNet)}
                </text>
              </g>
            )
          })}

          {visibleLegend.ruler && (
            <>
              <line data-ruler-line="true" x1={plot.left} x2={plot.right} y1={rulerY} y2={rulerY} stroke={RULER_COLOR} strokeWidth="1.4" strokeDasharray="4 5" pointerEvents="none" />
              <text data-ruler-value="true" x={plot.right + 7} y={clamp(rulerY - 3, plot.top + 10, plot.bottom - 1)} textAnchor="start" fill={RULER_COLOR} fontSize="9px" fontWeight="600" fontFamily="ui-monospace, monospace" pointerEvents="none">{formatValue(rulerLevel)}</text>
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
                className="cursor-ns-resize touch-none outline-none focus:outline-none focus-visible:outline-none"
                style={{ outline: 'none' }}
              >
                <rect x={plot.left} y={rulerY - 5} width={plot.right - plot.left} height="10" fill="transparent" pointerEvents="all" />
              </g>
            </>
          )}

          {categoryLabels.map(category => (
            <g key={`${category.key}-labels`}>
              {category.isGap && (
                <text {...tooltipProps(`${category.description} total: ${signed(category.value ?? null)} THB/${unit}`)} data-graph-total={category.key} x={category.x} y={clamp(y(category.value ?? 0) + (category.value !== null && category.value < 0 ? 8 : -8), plot.top + 10, plot.bottom - 1)} textAnchor="middle" fill={gapTotalColor(category.value)} fontSize="9px" fontWeight="700" fontFamily="ui-monospace, monospace">
                  {signed(category.value)}
                </text>
              )}
              {category.isGap ? (
                <text {...tooltipProps(category.description)} x={category.x} y="306" textAnchor="middle" fill="#0f172a" fontSize="11px" fontWeight="700" fontFamily="ui-monospace, monospace">
                  {category.label}
                </text>
              ) : (
                <foreignObject x={category.x - 53} y="291" width="106" height="28">
                  <button
                    type="button"
                    aria-label={`Select ${category.label} as active dataset`}
                    aria-pressed={activeRole === category.role}
                    onClick={() => onSelectActiveDataset(category.role)}
                    className={`inline-flex h-7 w-full items-center justify-center rounded-sm px-1 text-[11px] leading-none transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700 ${activeRole === category.role ? 'font-semibold text-slate-950' : 'font-medium text-slate-700'}`}
                  >
                    <span className={`relative inline-block px-1 pb-1 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 ${activeRole === category.role ? 'after:bg-slate-950' : 'after:bg-transparent'}`}>
                      {category.label}
                    </span>
                  </button>
                </foreignObject>
              )}
            </g>
          ))}
          </g>
        </svg>
        {activeTooltip && (
          <div
            ref={tooltipRef}
            aria-hidden="true"
            className="pointer-events-none absolute z-20 break-words rounded-sm border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] leading-4 text-white shadow-sm"
            style={{ left: activeTooltip.x, top: activeTooltip.y, maxWidth: activeTooltip.maxWidth }}
          >
            {activeTooltip.text}
          </div>
        )}
      </div>
    </figure>
  )
}
