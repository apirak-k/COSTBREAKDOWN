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
    <div className="bg-white p-3.5 rounded border border-slate-300/80 shadow-2xs flex flex-col justify-between hover:border-slate-400 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
          {badgeText}
        </span>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-lg font-bold text-slate-900 tracking-tight">{value}</span>
          <span className="text-[10px] text-slate-400 font-sans">THB</span>
        </div>

        {delta && !isZeroDelta && (
          <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
            <span className={isPositiveDelta ? 'text-rose-600' : 'text-emerald-700'}>
              {delta.formatted}
            </span>
            {delta.percent && (
              <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                isPositiveDelta ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
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
