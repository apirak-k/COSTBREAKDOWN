import React from 'react'

interface KPIStatCardProps {
  title: string
  value: string
  badgeText: string
  delta?: {
    value: number
    formatted: string
    percent?: string
  }
}

export const KPIStatCard: React.FC<KPIStatCardProps> = ({
  title,
  value,
  badgeText,
  delta
}) => {
  const isPositiveDelta = delta && delta.value > 0
  const isZeroDelta = delta && Math.abs(delta.value) < 0.00005

  return (
    <section className="flex min-w-0 flex-col justify-between rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-1">
        <span className="min-w-0 truncate text-xs font-medium text-slate-600">{title}</span>
        <span className="shrink-0 rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700">
          {badgeText}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">{value}</span>
          <span className="text-xs text-slate-600">THB</span>
        </div>

        {delta && !isZeroDelta && (
          <div className="flex shrink-0 items-center gap-1 font-mono text-sm font-semibold">
            <span className={isPositiveDelta ? 'text-rose-600' : 'text-emerald-700'}>
              {delta.formatted}
            </span>
            {delta.percent && (
              <span className={`rounded-sm border px-1.5 py-0.5 text-xs font-mono font-medium ${
                isPositiveDelta ? 'text-rose-800 bg-rose-50 border-rose-200' : 'text-emerald-800 bg-emerald-50 border-emerald-200'
              }`}>
                {delta.percent}
              </span>
            )}
          </div>
        )}
      </div>
    </section>

  )
}
