import type { CostComparison } from '../../../core'
import { formatNumber, formatVariance } from '../../../core'

function sumGaps(first: number | null, second: number | null): number | null {
  return first === null || second === null ? null : first + second
}

function formatCost(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 4)
}

function formatGap(value: number): string {
  return Math.abs(value) < 0.00005 ? formatNumber(0, 4) : formatVariance(value, 4)
}

function statusText(status: string): string {
  return status === 'complete' ? 'Complete' : status === 'estimated' ? 'Estimated' : 'Missing inputs'
}

function gapColor(gap: number | null): string {
  if (gap === null || Math.abs(gap) < 0.00005) return 'text-slate-700'
  return gap > 0 ? 'text-rose-700' : 'text-emerald-700'
}

export function ResultSummary({ comparison }: { comparison: CostComparison }) {
  const gap = comparison.totalGap
  const displayedGap = gap !== null && Math.abs(gap) < 0.00005 ? 0 : gap
  const componentGaps = [
    { label: 'Material', gap: comparison.elementGaps.material },
    { label: 'Processing · Labor + Burden', gap: sumGaps(comparison.elementGaps.labor, comparison.elementGaps.burden) }
  ]
  const knownGaps = componentGaps.filter((item): item is { label: string; gap: number } => item.gap !== null)
  const largestMovement = knownGaps.reduce<{ label: string; gap: number } | null>((largest, item) => (
    largest === null || Math.abs(item.gap) > Math.abs(largest.gap) ? item : largest
  ), null)
  const allMovementsKnown = componentGaps.every(item => item.gap !== null)
  const resultLabel = displayedGap === null
    ? 'Standard Cost comparison unavailable'
    : displayedGap > 0
      ? 'Current Standard Cost is higher'
      : displayedGap < 0
        ? 'Current Standard Cost is lower'
        : 'No net Standard Cost difference'
  const movementLabel = largestMovement === null
    ? 'Component movement unavailable until the required inputs are complete.'
    : !allMovementsKnown
      ? `Known component movement: ${largestMovement.label} ${formatGap(largestMovement.gap)} THB/pc. Another component Gap is unavailable.`
      : Math.abs(largestMovement.gap) < 0.00005
        ? 'No Material or Processing movement at displayed precision.'
        : `Largest component movement: ${largestMovement.label} ${formatGap(largestMovement.gap)} THB/pc`

  return (
    <section aria-labelledby="overview-result-heading" className="grid min-w-0 border border-slate-400 bg-white md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col justify-center border-b border-slate-200 px-3 py-3 md:border-b-0 md:border-r">
        <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-slate-500">Result · Standard Cost / pc</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 id="overview-result-heading" className="text-sm font-bold text-slate-950">{resultLabel}</h2>
          {displayedGap !== null && <span className={`font-mono text-base font-bold tabular-nums ${gapColor(displayedGap)}`}>{formatGap(displayedGap)} THB/pc</span>}
        </div>
        <p className="mt-1 text-[10px] leading-4 text-slate-600">Gap = Current − Reference. Positive means Current costs more; negative means it costs less.</p>
        <p className="mt-2 border-t border-slate-200 pt-2 text-[10px] font-semibold leading-4 text-slate-800">{movementLabel}</p>
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-3">
        <div className="min-w-0 border-b border-r border-slate-200 px-2 py-3 sm:px-3 md:border-b-0">
          <dt className="font-mono text-[9px] font-semibold uppercase text-slate-500">Reference</dt>
          <dd className="mt-1 break-words font-mono text-sm font-bold tabular-nums text-slate-700">{formatCost(comparison.referenceCost.total)}</dd>
          <dd className="mt-0.5 text-[9px] text-slate-500">{statusText(comparison.referenceCost.status)} · THB/pc</dd>
        </div>
        <div className="min-w-0 border-b border-slate-200 px-2 py-3 sm:px-3 md:border-r md:border-b-0">
          <dt className="font-mono text-[9px] font-semibold uppercase text-slate-500">Current</dt>
          <dd className="mt-1 break-words font-mono text-sm font-bold tabular-nums text-slate-950">{formatCost(comparison.currentCost.total)}</dd>
          <dd className="mt-0.5 text-[9px] text-slate-500">{statusText(comparison.currentCost.status)} · THB/pc</dd>
        </div>
        <div className="col-span-2 min-w-0 bg-slate-50 px-2 py-3 sm:px-3 md:col-span-1">
          <dt className="font-mono text-[9px] font-semibold uppercase text-slate-500">Gap</dt>
          <dd className={`mt-1 break-words font-mono text-sm font-bold tabular-nums ${gapColor(displayedGap)}`}>{displayedGap === null ? '—' : formatGap(displayedGap)}</dd>
          <dd className="mt-0.5 text-[9px] text-slate-500">Current − Reference · THB/pc</dd>
        </div>
      </dl>
    </section>
  )
}
