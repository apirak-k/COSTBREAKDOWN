import React from 'react'

interface KPIStatCardProps {
  title: string
  value: string
  unit?: string
  delta?: {
    value: number
    formatted: string
    percent?: string
  }
  description?: string
  badgeText?: string
}

export const KPIStatCard: React.FC<KPIStatCardProps> = ({
  title,
  value,
  unit = 'THB/pc',
  delta,
  description,
  badgeText
}) => {
  const hasDelta = delta !== undefined
  const isIncrease = hasDelta && delta.value > 0
  const isDecrease = hasDelta && delta.value < 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between hover:border-slate-300 transition-all">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase">
          {title}
        </span>
        {badgeText && (
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {badgeText}
          </span>
        )}
      </div>

      {/* Primary Value */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
          {value}
        </span>
        <span className="text-xs font-medium text-slate-400 font-sans">
          {unit}
        </span>
      </div>

      {/* Secondary Information / Delta Badge */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        {hasDelta ? (
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                isIncrease
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                  : isDecrease
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              Δ {delta.formatted}
            </span>
            {delta.percent && (
              <span className="text-slate-400 font-mono text-[10px]">
                ({delta.percent})
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">
            {description || 'Baseline reference'}
          </span>
        )}

        {description && hasDelta && (
          <span className="text-slate-400 text-[10px] truncate max-w-[110px]">
            {description}
          </span>
        )}
      </div>
    </div>
  )
}
