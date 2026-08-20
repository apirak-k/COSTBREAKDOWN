/**
 * Reusable string and number formatting utilities.
 */

export function formatCurrency(v: number, dp = 4, suffix = 'THB'): string {
  if (isNaN(v)) return `0.${'0'.repeat(dp)} ${suffix}`
  return `${v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })} ${suffix}`
}

export function formatNumber(v: number, dp = 4): string {
  if (isNaN(v)) return `0.${'0'.repeat(dp)}`
  return v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

export function formatVariance(v: number, dp = 4): string {
  if (isNaN(v) || Math.abs(v) < 0.00005) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(dp)}`
}

export function formatPercent(v: number, dp = 1): string {
  if (isNaN(v)) return '0.0%'
  return `${(v * 100).toFixed(dp)}%`
}

export function formatParam(param: number | null, isYield: boolean): string {
  if (param === null || isNaN(param)) return '—'
  if (isYield) return `${(param * 100).toFixed(1)}%`
  return param.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getVarianceClass(v: number): string {
  if (isNaN(v) || Math.abs(v) < 0.00005) return 'text-slate-400'
  return v > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'
}
