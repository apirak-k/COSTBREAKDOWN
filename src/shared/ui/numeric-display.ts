export interface NumericDisplayOptions {
  integer?: boolean
  /** Stable capacity of the numeric set, excluding the sign. */
  integerDigits?: number
  signPositive?: boolean
  /** The value is already in percentage units; storage conversion belongs to the caller. */
  percent?: boolean
}

export function businessNumberPresentation(
  value: number | null | undefined,
  { integer = false, percent = false, integerDigits = 8, signPositive = false }: NumericDisplayOptions = {}
): { text: string; notation: 'ordinary' | 'scientific' | 'unavailable'; fractionDigits: number } {
  const normalized = normalizeNumericNoise(value)
  if (normalized == null || !Number.isFinite(normalized)) return { text: '—', notation: 'unavailable', fractionDigits: 0 }
  let fractionDigits = integer ? 0 : 2
  let text = integer ? String(Math.round(normalized)) : normalized.toFixed(2)
  if (!integer && normalized !== 0 && Number(text) === 0) {
    fractionDigits = 4
    text = normalized.toFixed(4)
  }
  const scientific = /[eE]/.test(text)
    || text.replace(/^-/, '').split('.')[0].length > integerDigits
    || (!integer && normalized !== 0 && Number(text) === 0)
  if (scientific) text = normalized.toExponential(2).toUpperCase()
  else if (Number(text) === 0) text = integer ? '0' : (0).toFixed(fractionDigits)
  return { text: `${signPositive && normalized > 0 ? '+' : ''}${text}${percent ? '%' : ''}`, notation: scientific ? 'scientific' : 'ordinary', fractionDigits: scientific ? 0 : fractionDigits }
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

/** Normalize IEEE 754 machine representation noise while preserving intentional business precision. */
export function normalizeNumericNoise<T extends number | null | undefined>(value: T): T {
  if (value == null || !Number.isFinite(value as number)) return value
  const num = value as number
  if (num === 0 || (Math.abs(num) >= 1e-300 && Math.abs(num) < 1e-12)) return 0 as T
  // Do not alter extreme scientific numbers or exact integers
  if (Math.abs(num) >= 1e15 || Number.isInteger(num)) {
    return value
  }
  // Check if string representation contains 5+ consecutive zeros or nines near machine precision (e.g. 9.000000000000004, 19.999999999999996)
  const str = num.toString()
  if (/(?:0{5,}\d{1,2}|9{5,}\d{1,2})$/.test(str)) {
    const normalized = Number(num.toPrecision(12))
    return (Object.is(normalized, -0) ? 0 : normalized) as T
  }
  return value
}

/** Semantic equivalence for numbers: equivalent if they only differ by floating-point representation noise. */
export function areNumericValuesEquivalent(a: number | null | undefined, b: number | null | undefined): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'number' || typeof b !== 'number') return false
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b
  return normalizeNumericNoise(a) === normalizeNumericNoise(b)
}

/** Hydrate a committed editor without rounding away authoritative precision. */
export function formatFocusedNumericValue(value: number | null | undefined, integer = false): string {
  const normalized = normalizeNumericNoise(value)
  const full = formatFullNumericValue(normalized)
  if (!full || integer) return full
  const [whole, fraction = ''] = full.split('.')
  return `${whole}.${fraction.padEnd(2, '0')}`
}
