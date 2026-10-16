import { formatNumber } from '../../core'

export function parameterEffectPresentation(value: number | null | undefined): { text: string; className: string } {
  if (value === null || value === undefined || !Number.isFinite(value)) return { text: '—', className: 'text-slate-400' }
  const formattedValue = formatNumber(value, 2)
  const roundedValue = Number(formattedValue.replace(/,/g, ''))
  if (roundedValue > 0) return { text: `+${formattedValue}`, className: 'text-emerald-700' }
  if (roundedValue < 0) return { text: formattedValue, className: 'text-rose-700' }
  return { text: formatNumber(0, 2), className: 'text-slate-700' }
}
