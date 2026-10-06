import { formatNumber } from '../../../core'
import type { ScenarioFinancialResult, ScenarioStory } from '../../../core'

type ScenarioLetter = 'A' | 'B'
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

interface ScenarioOutcomeReviewProps {
  scenarioA: ScenarioFinancialResult
  scenarioB: ScenarioFinancialResult
  selectedScenarioLetter: ScenarioLetter | null
  story: ScenarioStory | null
  onSelectScenario: (letter: ScenarioLetter) => void
}

function formatValue(value: number | null, digits = 2): string {
  return value === null ? 'N/A' : formatNumber(value, digits)
}

function formatMetricValue(key: MetricKey, value: number | null, digits = 4): string {
  const formatted = formatValue(value, digits)
  return key === 'operatingProfitPerPiece' && value !== null && value < 0
    ? `${formatted} · Operating loss`
    : formatted
}

function comparisonWidth(value: number | null, maximum: number, halfWidth: number): number {
  return value === null ? 0 : Math.min(Math.abs(value) / maximum, 1) * halfWidth
}

function ScenarioComparisonGraph({ scenarioA, scenarioB }: Pick<ScenarioOutcomeReviewProps, 'scenarioA' | 'scenarioB'>) {
  const values = METRICS.flatMap(({ key }) => [scenarioA[key], scenarioB[key]])
    .filter((value): value is number => value !== null && Number.isFinite(value))
  const maximum = Math.max(1, ...values.map(value => Math.abs(value)))
  const center = 362
  const halfWidth = 170
  const rowHeight = 40
  const height = 34 + METRICS.length * rowHeight

  return (
    <figure aria-labelledby="scenario-ab-graph-heading" className="border border-slate-300 bg-white px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-slate-500">Strategy comparison</p>
          <h3 id="scenario-ab-graph-heading" className="mt-0.5 text-xs font-semibold text-slate-900">A/B monetary outcomes · THB/pc</h3>
        </div>
        <div className="flex gap-3 font-mono text-[9px] font-semibold uppercase text-slate-600">
          <span><i className="mr-1 inline-block h-2 w-3 bg-blue-700" />Scenario A</span>
          <span><i className="mr-1 inline-block h-2 w-3 bg-amber-600" />Scenario B</span>
        </div>
      </div>
      <svg
        role="img"
        aria-label="Scenario A and B per-piece comparison for MAT, LB, BD, Standard Cost, SG&A, OP, and Selling Price. Negative values extend left of zero."
        viewBox={`0 0 760 ${height}`}
        className="mt-2 block w-full"
      >
        <title>Scenario A and B money comparison in THB per piece</title>
        <line x1={center} x2={center} y1="8" y2={height - 4} stroke="#94a3b8" strokeWidth="1" />
        <text x={center} y="9" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="ui-monospace, monospace">0</text>
        {METRICS.map(({ key, label }, index) => {
          const y = 23 + index * rowHeight
          const aValue = scenarioA[key]
          const bValue = scenarioB[key]
          const aWidth = comparisonWidth(aValue, maximum, halfWidth)
          const bWidth = comparisonWidth(bValue, maximum, halfWidth)
          return (
            <g key={key}>
              <text x="6" y={y + 9} fill="#334155" fontSize="10" fontWeight="600" fontFamily="ui-sans-serif, system-ui">{label}</text>
              {aValue !== null && <rect x={aValue < 0 ? center - aWidth : center} y={y - 1} width={Math.max(aWidth, 1)} height="7" fill="#1d4ed8"><title>{`Scenario A ${label}: ${formatValue(aValue)} THB/pc`}</title></rect>}
              {bValue !== null && <rect x={bValue < 0 ? center - bWidth : center} y={y + 8} width={Math.max(bWidth, 1)} height="7" fill="#d97706"><title>{`Scenario B ${label}: ${formatValue(bValue)} THB/pc`}</title></rect>}
              <text x="548" y={y + 4} fill="#1e3a8a" fontSize="9" fontFamily="ui-monospace, monospace">A {formatMetricValue(key, aValue, 2)}</text>
              <text x="645" y={y + 4} fill="#92400e" fontSize="9" fontFamily="ui-monospace, monospace">B {formatMetricValue(key, bValue, 2)}</text>
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-1 border-t border-slate-200 pt-2 text-[9px] leading-4 text-slate-600">
        The graph compares only per-piece money outcomes. Engineering changes and economics assumptions remain visible in each scenario card above; no scenario is ranked or selected automatically.
      </figcaption>
    </figure>
  )
}

function FinalStoryGraph({ story }: { story: ScenarioStory }) {
  const states = [
    { key: 'reference', label: 'Reference', values: story.reference, x: 160 },
    { key: 'current', label: 'Current', values: story.current, x: 350 },
    { key: 'simulated', label: 'Simulated', values: story.simulated, x: 540 }
  ] as const
  const plot = { top: 24, bottom: 204 }
  const rangeValues = states.flatMap(state => {
    const components = COST_PARTS.map(part => state.values[part.key])
    if (components.some(value => value === null || !Number.isFinite(value))) return [state.values.sellingPrice]
    const numeric = components as number[]
    const positive = numeric.filter(value => value > 0).reduce((sum, value) => sum + value, 0)
    const negative = numeric.filter(value => value < 0).reduce((sum, value) => sum + value, 0)
    return [positive, negative, state.values.sellingPrice]
  }).filter((value): value is number => value !== null && Number.isFinite(value))
  let minimum = Math.min(0, ...rangeValues)
  let maximum = Math.max(0, ...rangeValues)
  if (minimum === maximum) maximum = minimum + 1
  const y = (value: number) => plot.top + ((maximum - value) / (maximum - minimum)) * (plot.bottom - plot.top)
  const zeroY = y(0)
  const pricePoints = states.flatMap(state => state.values.sellingPrice === null
    ? []
    : [{ x: state.x, y: y(state.values.sellingPrice), value: state.values.sellingPrice, label: state.label }])
  const priceLine = pricePoints.length > 1
    ? pricePoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    : null

  return (
    <figure aria-labelledby="final-story-graph-heading" className="border border-slate-300 bg-white px-3 py-3">
      <div className="border-b border-slate-200 pb-2">
        <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-slate-500">Selected scenario result</p>
        <h3 id="final-story-graph-heading" className="mt-0.5 text-xs font-semibold text-slate-900">Reference → Current → Simulated</h3>
      </div>
      <div className="grid grid-cols-1 gap-2 border-b border-slate-200 py-2 text-[10px] sm:grid-cols-2">
        <p><span className="font-semibold text-slate-900">Reference → Current</span><br /><span className="text-slate-600">Gap 1 = Current − Reference</span></p>
        <p><span className="font-semibold text-slate-900">Current → Simulated</span><br /><span className="text-slate-600">Gap 2 = Simulated − Current</span></p>
      </div>
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
              <text x="48" y={lineY + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="ui-monospace, monospace">{formatNumber(value, 2)}</text>
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
                <text x={state.x} y={y(state.values.standardCost) - 7} textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="700" fontFamily="ui-monospace, monospace">
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
      <ul aria-label="Final story graph legend" className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-2 text-[9px] text-slate-600">
        {COST_PARTS.map(part => <li key={part.key} className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5" style={{ backgroundColor: part.color }} />{part.label}</li>)}
        <li className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 bg-blue-700" />Selling Price</li>
      </ul>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[680px] text-[10px]">
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
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">{formatValue(story.gap1[key], 4)}</td>
            <td className="py-1.5 pl-2 text-right font-mono tabular-nums">{formatValue(story.gap2[key], 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-2 text-[9px] leading-4 text-slate-600">
        Gap 2 is signed Simulated − Current; a negative Standard Cost movement means cost decreased. Negative OP values remain visible as operating losses.
      </figcaption>
    </figure>
  )
}

export function ScenarioOutcomeReview(props: ScenarioOutcomeReviewProps) {
  const { scenarioA, scenarioB, selectedScenarioLetter, story, onSelectScenario } = props
  return (
    <section aria-labelledby="scenario-outcome-heading" className="space-y-3">
      <h2 id="scenario-outcome-heading" className="font-mono text-xs font-bold uppercase text-slate-900">Scenario comparison and result</h2>
      <ScenarioComparisonGraph scenarioA={scenarioA} scenarioB={scenarioB} />
      <fieldset className="border border-slate-300 bg-white px-3 py-3">
        <legend className="px-1 font-mono text-[10px] font-bold uppercase text-slate-800">Choose the scenario to continue</legend>
        <p className="mb-2 text-[10px] leading-4 text-slate-600">Your choice becomes Simulated in the final story. The system does not select a winner.</p>
        <div className="flex flex-wrap gap-4 text-xs">
          {(['A', 'B'] as const).map(letter => (
            <label key={letter} className="inline-flex min-h-8 cursor-pointer items-center gap-2 font-medium text-slate-800">
              <input
                type="radio"
                name="selected-simulated-scenario"
                value={letter}
                checked={selectedScenarioLetter === letter}
                onChange={() => onSelectScenario(letter)}
                className="accent-blue-700"
              />
              Scenario {letter} → Simulated
            </label>
          ))}
        </div>
      </fieldset>
      {story ? (
        <FinalStoryGraph story={story} />
      ) : (
        <p role="status" className="border border-dashed border-slate-400 bg-white px-3 py-4 text-xs text-slate-600">
          Select Scenario A or B to show the Reference → Current → Simulated result and its two adjacent gaps.
        </p>
      )}
    </section>
  )
}
