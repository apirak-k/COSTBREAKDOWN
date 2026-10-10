/**
 * Reusable string and number formatting utilities.
 */

function displayDigits(dp: number): number {
  return Number.isFinite(dp) ? Math.max(0, Math.min(2, Math.trunc(dp))) : 2
}

export function formatCurrency(v: number, dp = 2, suffix = 'THB'): string {
  if (!Number.isFinite(v)) return '—'
  return `${formatNumber(v, dp)} ${suffix}`
}

export function formatNumber(v: number, dp = 2): string {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDigits(dp)
  })
}

export function formatVariance(v: number, dp = 2): string {
  if (!Number.isFinite(v) || Math.abs(v) < 0.00005) return '—'
  const sign = v >= 0 ? '+' : '-'
  return `${sign}${formatNumber(Math.abs(v), dp)}`
}

export function formatPercent(v: number, dp = 2): string {
  if (!Number.isFinite(v)) return '—'
  return `${formatNumber(v * 100, dp)}%`
}

export function formatParam(param: number | null, isYield: boolean): string {
  if (param === null || isNaN(param)) return '—'
  if (isYield) return formatPercent(param, 2)
  return formatNumber(param, 2)
}

export function getVarianceClass(v: number): string {
  if (isNaN(v) || Math.abs(v) < 0.00005) return 'text-slate-400'
  return v > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'
}
