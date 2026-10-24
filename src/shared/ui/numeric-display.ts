import { cleanMachineFloatingPointResidue } from '../../core/utils/exact-decimal'

export interface NumericDisplayOptions {
  integer?: boolean
  /** Stable capacity of the numeric set, excluding the sign. */
  integerDigits?: number
  signPositive?: boolean
  /** The value is already in percentage units; storage conversion belongs to the caller. */
  percent?: boolean
}

export { areNumericValuesEquivalent } from '../../core/utils/guards'

export function businessNumberPresentation(
  value: number | null | undefined,
  { integer = false, percent = false, integerDigits = 8, signPositive = false }: NumericDisplayOptions = {}
): { text: string; notation: 'ordinary' | 'scientific' | 'unavailable'; fractionDigits: number } {
  if (value == null || !Number.isFinite(value)) return { text: '—', notation: 'unavailable', fractionDigits: 0 }
  let fractionDigits = integer ? 0 : 2
  let text = integer ? String(Math.round(value)) : value.toFixed(2)
  if (!integer && value !== 0 && Number(text) === 0) {
    fractionDigits = 4
    text = value.toFixed(4)
  }
  const scientific = /[eE]/.test(text)
    || text.replace(/^-/, '').split('.')[0].length > integerDigits
    || (!integer && value !== 0 && Number(text) === 0)
  if (scientific) text = value.toExponential(2).toUpperCase()
  else if (Number(text) === 0) text = integer ? '0' : (0).toFixed(fractionDigits)
  return { text: `${signPositive && value > 0 ? '+' : ''}${text}${percent ? '%' : ''}`, notation: scientific ? 'scientific' : 'ordinary', fractionDigits: scientific ? 0 : fractionDigits }
}

/** Presentation only: never feed this result back into stored/calculated values. */
export function formatBusinessNumber(value: number | null | undefined, options: NumericDisplayOptions = {}): string {
  return businessNumberPresentation(value, options).text
}

/** Header-only precision: round the presentation to eight decimals without changing the source value. */
export function formatHeaderNumericValue(value: number | null | undefined, integer = false): string {
  if (value == null || !Number.isFinite(value)) return ''
  if (integer) return String(Math.round(value))

  // Keep very large magnitudes in Number's scientific form, matching the existing full-value convention.
  if (Math.abs(value) >= 1e21) return String(value)

  const rounded = value.toFixed(8)
  if (value !== 0 && Number(rounded) === 0) return value.toExponential(2)
  const trimmed = rounded.includes('.')
    ? rounded.replace(/0+$/, '').replace(/\.$/, '')
    : rounded
  const [whole, fraction = ''] = (trimmed === '-0' ? '0' : trimmed).split('.')
  return `${whole}.${fraction.padEnd(2, '0')}`
}

/** Expand Number's own representation so a text editor can retain decimal caret stepping. */
export function formatFullNumericValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ''
  const text = String(value)
  if (!text.includes('e')) return text
  const [significand, exponentText] = text.split('e')
  const sign = value < 0 ? '-' : ''
  const [whole, fraction = ''] = significand.replace('-', '').split('.')
  const digits = whole + fraction
  const point = whole.length + Number(exponentText)
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`
  if (point >= digits.length) return `${sign}${digits}${'0'.repeat(point - digits.length)}`
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`
}

/** Format a Number fallback draft without exposing a narrow binary residue tail. */
export function formatFocusedNumericValue(value: number | null | undefined, integer = false): string {
  const full = formatFullNumericValue(value)
  if (!full) return full
  const clean = cleanMachineFloatingPointResidue(value as number, full)
  if (integer) return clean
  const [whole, fraction = ''] = clean.split('.')
  return `${whole}.${fraction.padEnd(2, '0')}`
}
