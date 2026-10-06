import type { CostComparison } from '../../../core'
import { formatNumber } from '../../../core'

interface CostComparisonChartProps {
  comparison: CostComparison
  referenceSellingPrice: number | null
  currentSellingPrice: number | null
}

const chartSides = [
  { key: 'reference', label: 'Reference', x: 212 },
  { key: 'current', label: 'Current', x: 432 }
] as const

const costParts = [
  { key: 'material', label: 'Material', color: '#5b91c8' },
  { key: 'labor', label: 'Labor', color: '#e6b422' },
  { key: 'burden', label: 'Burden', color: '#55964b' }
] as const

const plot = { left: 58, right: 584, top: 20, bottom: 242 }
const plotHeight = plot.bottom - plot.top
const barWidth = 72

function chartCeiling(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil((value * 1.08) / magnitude) * magnitude
}

function formatTick(value: number): string {
  return formatNumber(value, value < 10 && value % 1 !== 0 ? 2 : 0)
}

export function CostComparisonChart({
  comparison,
  referenceSellingPrice,
  currentSellingPrice
}: CostComparisonChartProps) {
  const costs = {
    reference: comparison.referenceCost,
    current: comparison.currentCost
  }
  const prices = {
    reference: referenceSellingPrice,
    current: currentSellingPrice
  }

  const visibleValues = [
    ...chartSides.flatMap(side => {
      const cost = costs[side.key]
      return [cost.total, prices[side.key]].filter((value): value is number => value !== null)
    })
  ]
  const maximum = chartCeiling(Math.max(0, ...visibleValues))
  const y = (value: number) => plot.bottom - (value / maximum) * plotHeight
  const pricePoints = chartSides.flatMap(side => {
    const price = prices[side.key]
    return price === null ? [] : [{ ...side, value: price, y: y(price) }]
  })
  const priceLine = pricePoints.length === 2
    ? `M ${pricePoints[0].x} ${pricePoints[0].y} L ${pricePoints[1].x} ${pricePoints[1].y}`
    : null

  return (
    <figure aria-labelledby="cost-comparison-chart-title" className="min-w-0 border border-slate-300 bg-white px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <p className="font-sans text-[11px] font-semibold text-slate-600">Cost structure</p>
          <h2 id="cost-comparison-chart-title" className="mt-0.5 text-sm font-semibold text-slate-900">Standard Cost by component</h2>
        </div>
        <p className="font-sans text-[11px] font-medium text-slate-600">Reference vs Current · THB/pc</p>
      </div>

      <svg
        role="img"
        aria-label="Reference and Current stacked Standard Cost bars for Material, Labor, and Burden, with Selling Price shown as a line when available."
        viewBox="0 0 620 286"
        className="mt-2 block w-full"
      >
        <title>Reference and Current Standard Cost comparison</title>

        {[0, 1, 2, 3, 4].map(step => {
          const fraction = step / 4
          const value = maximum * fraction
          const lineY = y(value)
          return (
            <g key={step}>
              <line x1={plot.left} x2={plot.right} y1={lineY} y2={lineY} stroke="#e2e8f0" strokeWidth="1" />
              <text x={plot.left - 8} y={lineY + 3} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="ui-monospace, monospace">
                {formatTick(value)}
              </text>
            </g>
          )
        })}

        {chartSides.map(side => {
          const cost = costs[side.key]
          const hasCompleteCost = cost.material !== null && cost.labor !== null && cost.burden !== null && cost.total !== null
          let accumulated = 0

          return (
            <g key={side.key}>
              {hasCompleteCost ? costParts.map(part => {
                const value = cost[part.key]
                if (value === null) return null
                const top = y(accumulated + value)
                const height = y(accumulated) - top
                accumulated += value
                return (
                  <rect key={part.key} x={side.x - barWidth / 2} y={top} width={barWidth} height={Math.max(height, 0)} fill={part.color}>
                    <title>{`${side.label} ${part.label}: ${formatNumber(value, 4)} THB per piece`}</title>
                  </rect>
                )
              }) : (
                <text x={side.x} y={plot.bottom - 12} textAnchor="middle" fill="#92400e" fontSize="10" fontFamily="ui-sans-serif, system-ui">
                  Unavailable
                </text>
              )}

              {hasCompleteCost && cost.total !== null && (
                <text x={side.x} y={Math.max(y(cost.total) - 7, plot.top + 10)} textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="700" fontFamily="ui-monospace, monospace">
                  {formatNumber(cost.total, 2)}
                </text>
              )}
              <text x={side.x} y={plot.bottom + 20} textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600" fontFamily="ui-sans-serif, system-ui">
                {side.label}
              </text>
            </g>
          )
        })}

        {priceLine && <path d={priceLine} fill="none" stroke="#1d4ed8" strokeWidth="2.5" />}
        {pricePoints.map(point => (
          <g key={point.key}>
            <circle cx={point.x} cy={point.y} r="4" fill="#1d4ed8" stroke="white" strokeWidth="1.5">
              <title>{`${point.label} Selling Price: ${formatNumber(point.value, 4)} THB per piece`}</title>
            </circle>
            <text x={point.x} y={Math.max(point.y - 8, plot.top + 9)} textAnchor="middle" fill="#1d4ed8" fontSize="9" fontWeight="700" fontFamily="ui-monospace, monospace">
              {formatNumber(point.value, 2)}
            </text>
          </g>
        ))}
      </svg>

      <ul aria-label="Chart legend" className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
        {costParts.map(part => (
          <li key={part.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5" style={{ backgroundColor: part.color }} />
            {part.label}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 bg-blue-700" />
          Selling Price
        </li>
      </ul>
      <figcaption className="mt-1 text-[11px] leading-4 text-slate-500">
        Stacked bars show Standard Cost; the line shows the entered Selling Price. This view compares the two datasets and does not imply monthly history.
      </figcaption>
    </figure>
  )
}
