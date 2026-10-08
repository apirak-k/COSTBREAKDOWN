import { formatNumber } from '../../core'
import type { ScenarioFinancialResult, ScenarioStory } from '../../core/types'

type MetricKey = keyof ScenarioFinancialResult

const METRICS: Array<{ key: MetricKey; label: string }> = [
  { key: 'material', label: 'MAT' },
  { key: 'labor', label: 'LB' },
  { key: 'burden', label: 'BD' },
  { key: 'standardCost', label: 'Standard Cost' },
  { key: 'sgaAmountPerPiece', label: 'SG&A' },
  { key: 'operatingProfitPerPiece', label: 'OP' },
  { key: 'sellingPrice', label: 'Selling Price' }
]

const COST_PARTS = [
  { key: 'material', label: 'MAT', color: '#5b91c8' },
  { key: 'labor', label: 'LB', color: '#e6b422' },
  { key: 'burden', label: 'BD', color: '#55964b' }
] as const

function formatValue(value: number | null, digits = 4): string {
  return value === null || !Number.isFinite(value) ? '—' : formatNumber(value, digits)
}

function formatMetricValue(key: MetricKey, value: number | null): string {
  const formatted = formatValue(value)
  return key === 'operatingProfitPerPiece' && value !== null && Number.isFinite(value) && value < 0
    ? `${formatted} · Operating loss`
    : formatted
}

export function SimulationStoryGraph({ story }: { story: ScenarioStory }) {
  const states = [
    { key: 'reference', label: 'Reference', values: story.reference, x: 160 },
    { key: 'current', label: 'Current', values: story.current, x: 350 },
    { key: 'simulated', label: 'Simulated', values: story.simulated, x: 540 }
  ] as const
  const plot = { top: 24, bottom: 204 }
  const rangeValues = states.flatMap(state => {
    const components = COST_PARTS.map(part => state.values[part.key])
    if (components.some(value => value === null || !Number.isFinite(value))) return [state.values.sellingPrice]
    const positive = components.filter((value): value is number => value !== null && value > 0).reduce((sum, value) => sum + value, 0)
    const negative = components.filter((value): value is number => value !== null && value < 0).reduce((sum, value) => sum + value, 0)
    return [positive, negative, state.values.sellingPrice]
  }).filter((value): value is number => value !== null && Number.isFinite(value))
  let minimum = Math.min(0, ...rangeValues)
  let maximum = Math.max(0, ...rangeValues)
  if (minimum === maximum) maximum = minimum + 1
  const y = (value: number) => plot.top + ((maximum - value) / (maximum - minimum)) * (plot.bottom - plot.top)
  const zeroY = y(0)
  const pricePoints = states.flatMap(state => state.values.sellingPrice === null || !Number.isFinite(state.values.sellingPrice)
    ? []
    : [{ x: state.x, y: y(state.values.sellingPrice), value: state.values.sellingPrice, label: state.label }])
  const priceLine = pricePoints.length > 1
    ? pricePoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    : null

  return (
    <figure aria-labelledby="simulation-story-title" className="border border-slate-300 bg-white px-3 py-3">
      <div className="border-b border-slate-200 pb-2">
        <p className="font-sans text-[11px] font-semibold text-slate-500">Cost story</p>
        <h2 id="simulation-story-title" className="mt-0.5 text-xs font-semibold text-slate-900">Reference → Current → Simulated</h2>
      </div>
      <div className="grid grid-cols-1 gap-2 border-b border-slate-200 py-2 text-[11px] sm:grid-cols-2">
        <p><span className="font-semibold text-slate-900">Reference → Current</span><br /><span className="text-slate-600">Gap 1 = Current − Reference</span></p>
        <p><span className="font-semibold text-slate-900">Current → Simulated</span><br /><span className="text-slate-600">Gap 2 = Simulated − Current</span></p>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-start">
        <div className="min-w-0">
          <svg
            role="img"
            aria-label="Reference, Current, and Simulated stacked Standard Cost by MAT, LB, and BD, with Selling Price shown as a line."
            viewBox="0 0 700 246"
            className="mt-2 block w-full"
          >
            <title>Reference to Current to Simulated cost composition</title>
            {[0, 1, 2, 3, 4].map(step => {
              const value = minimum + ((maximum - minimum) * step) / 4
              const lineY = y(value)
              return (
                <g key={step}>
                  <line x1="55" x2="650" y1={lineY} y2={lineY} stroke={step === 2 ? '#94a3b8' : '#e2e8f0'} strokeWidth="1" />
                  <text x="48" y={lineY + 3} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="ui-monospace, monospace">{formatNumber(value, 2)}</text>
                </g>
              )
            })}
            {states.map(state => {
              const values = COST_PARTS.map(part => state.values[part.key])
              const complete = values.every(value => value !== null && Number.isFinite(value))
              let positiveBase = 0
              let negativeBase = 0
              return (
                <g key={state.key}>
                  {complete ? COST_PARTS.map(part => {
                    const value = state.values[part.key]
                    if (value === null) return null
                    const before = value >= 0 ? positiveBase : negativeBase
                    const after = before + value
                    if (value >= 0) positiveBase = after
                    else negativeBase = after
                    const top = Math.min(y(before), y(after))
                    const height = Math.abs(y(before) - y(after))
                    return <rect key={part.key} x={state.x - 29} y={top} width="58" height={Math.max(height, 1)} fill={part.color}><title>{`${state.label} ${part.label}: ${formatValue(value)} THB/pc`}</title></rect>
                  }) : <text x={state.x} y={zeroY - 8} textAnchor="middle" fill="#92400e" fontSize="9">Cost unavailable</text>}
                  {complete && state.values.standardCost !== null && Number.isFinite(state.values.standardCost) && (
                    <text x={state.x} y={y(state.values.standardCost) - 7} textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="700" fontFamily="ui-monospace, monospace">
                      {`STD ${formatValue(state.values.standardCost)}`}
                    </text>
                  )}
                  <text x={state.x} y="228" textAnchor="middle" fill="#334155" fontSize="10" fontWeight="600">{state.label}</text>
                </g>
              )
            })}
            {priceLine && <path d={priceLine} fill="none" stroke="#1d4ed8" strokeWidth="2" />}
            {pricePoints.map(point => (
              <g key={point.label}>
                <circle cx={point.x} cy={point.y} r="3.5" fill="#1d4ed8" stroke="white" strokeWidth="1" />
                <title>{`${point.label} Selling Price: ${formatValue(point.value)} THB/pc`}</title>
              </g>
            ))}
          </svg>
          <ul aria-label="Simulation story graph legend" className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
            {COST_PARTS.map(part => <li key={part.key} className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5" style={{ backgroundColor: part.color }} />{part.label}</li>)}
            <li className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 bg-blue-700" />Selling Price</li>
          </ul>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[680px] text-[11px]">
            <thead>
              <tr className="border-b border-slate-300 text-left font-mono uppercase text-slate-600">
                <th scope="col" className="py-2 pr-2">THB/pc</th>
                <th scope="col" className="px-2 py-2 text-right">Reference</th>
                <th scope="col" className="px-2 py-2 text-right">Current</th>
                <th scope="col" className="px-2 py-2 text-right">Simulated</th>
                <th scope="col" className="px-2 py-2 text-right">Gap 1<br />Current − Reference</th>
                <th scope="col" className="py-2 pl-2 text-right">Gap 2<br />Simulated − Current</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map(({ key, label }) => (
                <tr key={key} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="py-1.5 pr-2 text-left font-medium text-slate-700">{label}</th>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">{formatMetricValue(key, story.reference[key])}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">{formatMetricValue(key, story.current[key])}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">{formatMetricValue(key, story.simulated[key])}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">{formatValue(story.gap1[key])}</td>
                  <td className="py-1.5 pl-2 text-right font-mono tabular-nums">{formatValue(story.gap2[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <figcaption className="mt-2 text-[11px] leading-4 text-slate-600">
        Gap 2 is signed Simulated − Current; a negative Standard Cost movement means cost decreased. Negative OP remains visible as an operating loss.
      </figcaption>
    </figure>
  )
}
