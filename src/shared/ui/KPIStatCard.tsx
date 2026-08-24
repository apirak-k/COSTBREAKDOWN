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
    <div className="bg-white p-4 rounded-lg border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all duration-150">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider truncate">{title}</span>
        <span className="text-[10px] font-mono font-medium bg-slate-100/80 text-slate-600 px-2 py-0.5 rounded border border-slate-200/70 shrink-0">
          {badgeText}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-xl font-bold text-slate-900 tracking-tight tabular-nums">{value}</span>
          <span className="text-[11px] text-slate-400 font-sans">THB</span>
        </div>

        {delta && !isZeroDelta && (
          <div className="flex items-center gap-1 font-mono text-xs font-semibold shrink-0">
            <span className={isPositiveDelta ? 'text-rose-600' : 'text-emerald-700'}>
              {delta.formatted}
            </span>
            {delta.percent && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                isPositiveDelta ? 'text-rose-700 bg-slate-100 border border-slate-200' : 'text-emerald-700 bg-slate-100 border border-slate-200'
              }`}>
                {delta.percent}
              </span>
            )}
          </div>
        )}
      </div>
    </div>

  )
}
