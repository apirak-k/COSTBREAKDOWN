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
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
          {badgeText}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="text-xl font-bold text-slate-900 tracking-tight">{value}</span>
          <span className="text-xs text-slate-500 font-sans">THB/pc</span>
        </div>

        {delta && !isZeroDelta && (
          <div className="flex items-center gap-1 font-mono text-xs font-bold">
            <span className={isPositiveDelta ? 'text-rose-600' : 'text-emerald-600'}>
              {delta.formatted}
            </span>
            {delta.percent && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                isPositiveDelta ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
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
