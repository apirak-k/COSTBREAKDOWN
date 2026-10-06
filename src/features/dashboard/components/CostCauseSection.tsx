import type { CostComparison } from '../../../core'
import { formatNumber, formatVariance } from '../../../core'

function sumCostParts(first: number | null, second: number | null): number | null {
  return first === null || second === null ? null : first + second
}

function formatCost(value: number | null): string {
  return value === null ? '—' : formatNumber(value, 4)
}

function gapColor(gap: number | null): string {
  if (gap === null || gap === 0) return 'text-slate-700'
  return gap > 0 ? 'text-rose-700' : 'text-emerald-700'
}

function GapBar({ label, gap, maximum }: { label: string; gap: number | null; maximum: number }) {
  const width = gap === null || maximum === 0 ? 0 : Math.min(Math.abs(gap) / maximum * 100, 100)
  const tone = gap === null || gap === 0 ? 'bg-slate-400' : gap > 0 ? 'bg-rose-600' : 'bg-emerald-700'
  return (
    <div
      role="img"
      aria-label={`${label} Gap ${gap === null ? 'unavailable' : `${formatVariance(gap, 4)} THB per piece`}; bar shows magnitude relative to the largest cause`}
      className="mt-2 h-1.5 overflow-hidden bg-slate-100"
    >
      <div className={`h-full ${tone}`} style={{ width: `${width}%` }} />
    </div>
  )
}

function CauseCard({
  label,
  reference,
  current,
  gap,
  maximum
}: {
  label: string
  reference: number | null
  current: number | null
  gap: number | null
  maximum: number
}) {
  return (
    <article className="border border-slate-300 bg-white px-3 py-3">
      <h3 className="font-mono text-[10px] font-bold uppercase tracking-wide text-slate-700">{label}</h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
        <div><dt className="font-mono text-[9px] uppercase text-slate-500">Reference · THB/pc</dt><dd className="font-mono text-xs tabular-nums text-slate-600">{formatCost(reference)}</dd></div>
        <div><dt className="font-mono text-[9px] uppercase text-slate-500">Current · THB/pc</dt><dd className="font-mono text-xs tabular-nums text-slate-900">{formatCost(current)}</dd></div>
        <div className="col-span-2 flex items-baseline justify-between gap-2 border-t border-slate-200 pt-2">
          <dt className="font-mono text-[9px] font-semibold uppercase text-slate-500">Gap · THB/pc · Current − Reference</dt>
          <dd className={`font-mono text-xs font-bold tabular-nums ${gapColor(gap)}`}>{gap === null ? '—' : formatVariance(gap, 4)}</dd>
        </div>
      </dl>
      <GapBar label={label} gap={gap} maximum={maximum} />
    </article>
  )
}

export function CostCauseSection({ comparison }: { comparison: CostComparison }) {
  const referenceProcessing = sumCostParts(comparison.referenceCost.labor, comparison.referenceCost.burden)
  const currentProcessing = sumCostParts(comparison.currentCost.labor, comparison.currentCost.burden)
  const processingGap = sumCostParts(comparison.elementGaps.labor, comparison.elementGaps.burden)
  const causes = [
    { label: 'Material', reference: comparison.referenceCost.material, current: comparison.currentCost.material, gap: comparison.elementGaps.material },
    { label: 'Processing · Labor + Burden', reference: referenceProcessing, current: currentProcessing, gap: processingGap }
  ]
  const maximumGap = Math.max(0, ...causes.flatMap(cause => cause.gap === null ? [] : [Math.abs(cause.gap)]))

  return (
    <section aria-labelledby="overview-causes-heading" className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-300 pb-2">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-slate-500">Cause</p>
          <h2 id="overview-causes-heading" className="mt-0.5 text-xs font-semibold text-slate-900">Where the cost Gap comes from</h2>
        </div>
        <p className="font-mono text-[9px] text-slate-500">Bar length shows relative Gap magnitude; signed values show direction.</p>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {causes.map(cause => <CauseCard key={cause.label} {...cause} maximum={maximumGap} />)}
      </div>
    </section>
  )
}
