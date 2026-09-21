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
    <div className="factory-panel min-h-[108px] border-t-2 border-t-[var(--cb-ink)] p-4 flex flex-col justify-between transition-colors hover:border-t-[var(--cb-accent)]">
      <div className="flex items-center justify-between gap-1">
        <span className="factory-label truncate">{title}</span>
        <span className="factory-tag text-[var(--cb-muted)] bg-[var(--cb-muted-surface)] border-[var(--cb-border)] shrink-0">
          {badgeText}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1 font-mono factory-number">
          <span className="text-xl font-bold text-[var(--cb-ink)] tracking-tight">{value}</span>
          <span className="text-[11px] text-[var(--cb-muted)] font-sans">THB</span>
        </div>

        {delta && !isZeroDelta && (
          <div className="flex items-center gap-1 font-mono text-xs font-semibold shrink-0">
            <span className={isPositiveDelta ? 'text-[var(--cb-accent)]' : 'text-[var(--cb-ink)]'}>
              {delta.formatted}
            </span>
            {delta.percent && (
              <span className={`factory-tag font-mono font-medium ${
                isPositiveDelta ? 'text-[var(--cb-accent)] bg-[var(--cb-accent-soft)] border-[var(--cb-accent)]' : 'text-[var(--cb-ink)] bg-[var(--cb-muted-surface)] border-[var(--cb-border)]'
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
