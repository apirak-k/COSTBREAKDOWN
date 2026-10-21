export interface NumericDisplayOptions {
  integer?: boolean
  /** The value is already in percentage units; storage conversion belongs to the caller. */
  percent?: boolean
}

/** Presentation only: never feed this result back into stored/calculated values. */
export function formatBusinessNumber(
  value: number | null | undefined,
  { integer = false, percent = false }: NumericDisplayOptions = {}
): string {
  if (value == null || !Number.isFinite(value)) return '—'
  let text = integer ? String(Math.round(value)) : value.toFixed(2)
  if (!integer && Math.abs(value) >= 1e21) text = `${formatFullNumericValue(value)}.00`
  if (!integer && value !== 0 && Number(text) === 0) {
    text = value.toFixed(4)
    if (Number(text) === 0) text = value.toExponential(2)
  }
  return `${text}${percent ? '%' : ''}`
}

/** Header-only precision: round the presentation to eight decimals without changing the source value. */
export function formatHeaderNumericValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ''

  // Keep very large magnitudes in Number's scientific form, matching the existing full-value convention.
  if (Math.abs(value) >= 1e21) return String(value)

  const rounded = value.toFixed(8)
  if (value !== 0 && Number(rounded) === 0) return value.toExponential(2)
  const trimmed = rounded.includes('.')
    ? rounded.replace(/0+$/, '').replace(/\.$/, '')
    : rounded
  return trimmed === '-0' ? '0' : trimmed
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
