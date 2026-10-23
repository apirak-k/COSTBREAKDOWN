import { formatBusinessNumber } from '../../shared/ui/numeric-display'

export function parameterEffectPresentation(value: number | null | undefined): { text: string; className: string } {
  if (value === null || value === undefined || !Number.isFinite(value)) return { text: '—', className: 'text-slate-400' }
  if (value > 0) return { text: formatBusinessNumber(value, { signPositive: true, integerDigits: Infinity }), className: 'text-rose-700' }
  if (value < 0) return { text: formatBusinessNumber(value, { integerDigits: Infinity }), className: 'text-emerald-700' }
  return { text: formatBusinessNumber(0), className: 'text-slate-700' }
}
