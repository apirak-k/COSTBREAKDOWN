import { formatBusinessNumber, type NumericDisplayOptions } from './numeric-display'

export interface NumericInputDomain {
  integer?: boolean
  min?: number
  max?: number
  minExclusive?: boolean
}

export type NumericDraftResult =
  | { kind: 'blank' }
  | { kind: 'transient' }
  | { kind: 'valid'; value: number }
  | { kind: 'out-of-domain'; value: number }
  | { kind: 'invalid' }

export interface NumericStepPlace {
  exponent: number
  step: number
}

export function resolveNumericWheelStepDirection(deltaY: number): 1 | -1 {
  return deltaY < 0 ? 1 : -1
}

export function isNumericDraftSyntax(raw: string, domain: NumericInputDomain = {}): boolean {
  const allowNegative = domain.min === undefined || domain.min < 0
  const sign = allowNegative ? '-?' : ''
  if (domain.integer) return new RegExp(`^${sign}\\d*$`).test(raw)
  return new RegExp(`^${sign}(?:\\d+)?(?:\\.\\d*)?$`).test(raw)
}

export function isNumericValueAllowed(value: number, domain: NumericInputDomain = {}): boolean {
  if (!Number.isFinite(value)) return false
  if (domain.integer && !Number.isInteger(value)) return false
  if (domain.min !== undefined && (domain.minExclusive ? value <= domain.min : value < domain.min)) return false
  if (domain.max !== undefined && value > domain.max) return false
  return true
}

export function parseNumericDraft(
  raw: string,
  domain: NumericInputDomain = {},
  allowSubMinimumDraft = false
): NumericDraftResult {
  if (!isNumericDraftSyntax(raw, domain)) return { kind: 'invalid' }
  if (raw === '') return { kind: 'blank' }
  if (raw === '-' || raw === '.' || raw === '-.') return { kind: 'transient' }

  const value = Number(raw)
  if (isNumericValueAllowed(value, domain)) return { kind: 'valid', value }
  if (!Number.isFinite(value)) return { kind: 'invalid' }

  const canContinueIntoValidDecimal = allowSubMinimumDraft
    && !domain.integer
    && domain.minExclusive === true
    && domain.min === 0
    && value === 0
    && /^0(?:\.0*)?$/.test(raw)

  return canContinueIntoValidDecimal
    ? { kind: 'transient' }
    : { kind: 'out-of-domain', value }
}

function firstAllowedAtOrAboveMin(domain: NumericInputDomain): number | undefined {
  if (domain.min === undefined) return undefined
  if (domain.minExclusive) return domain.integer ? Math.floor(domain.min) + 1 : undefined
  return domain.integer ? Math.ceil(domain.min) : domain.min
}

function firstAllowedAtOrBelowMax(domain: NumericInputDomain): number | undefined {
  if (domain.max === undefined) return undefined
  return domain.integer ? Math.floor(domain.max) : domain.max
}

function decimalParts(value: number | string): { coefficient: bigint; exponent: number } {
  const [significand, exponentText] = String(value).toLowerCase().split('e')
  const [whole, fraction = ''] = significand.split('.')
  return {
    coefficient: BigInt(`${whole}${fraction}` || '0'),
    exponent: Number(exponentText ?? 0) - fraction.length
  }
}

function formatDecimalParts({ coefficient, exponent }: { coefficient: bigint; exponent: number }): string {
  const negative = coefficient < 0n
  let digits = (negative ? -coefficient : coefficient).toString()
  if (exponent >= 0) return `${negative ? '-' : ''}${digits}${'0'.repeat(exponent)}`
  digits = `${'0'.repeat(Math.max(0, -exponent - digits.length + 1))}${digits}`
  const decimalIndex = digits.length + exponent
  return `${negative ? '-' : ''}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`
}

function compareDecimalParts(
  left: { coefficient: bigint; exponent: number },
  right: { coefficient: bigint; exponent: number }
): -1 | 0 | 1 {
  const exponent = Math.min(left.exponent, right.exponent)
  const leftValue = left.coefficient * 10n ** BigInt(left.exponent - exponent)
  const rightValue = right.coefficient * 10n ** BigInt(right.exponent - exponent)
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
}

function addDecimals(left: number, right: number): number {
  const leftParts = decimalParts(left)
  const rightParts = decimalParts(right)
  const exponent = Math.min(leftParts.exponent, rightParts.exponent)
  const leftCoefficient = leftParts.coefficient * 10n ** BigInt(leftParts.exponent - exponent)
  const rightCoefficient = rightParts.coefficient * 10n ** BigInt(rightParts.exponent - exponent)
  return Number(`${leftCoefficient + rightCoefficient}e${exponent}`)
}

function preciseStep(value: number, delta: number, integer: boolean): number {
  return integer ? Math.round(value + delta) : addDecimals(value, delta)
}

export function resolveNumericStepPlace(
  raw: string,
  caret: number | null,
  domain: NumericInputDomain = {}
): NumericStepPlace {
  const unitPlace = { exponent: 0, step: 1 }
  if (caret === null || raw === '') return unitPlace

  const position = Math.max(0, Math.min(raw.length, caret))
  const activeIndex = /\d/.test(raw[position] ?? '')
    ? position
    : position === raw.length && position > 0 && /\d/.test(raw[position - 1])
      ? position - 1
      : -1
  if (activeIndex < 0) return unitPlace

  const decimalIndex = domain.integer ? -1 : raw.indexOf('.')
  const integerEnd = decimalIndex < 0 ? raw.length : decimalIndex
  const exponent = activeIndex < integerEnd
    ? integerEnd - activeIndex - 1
    : decimalIndex - activeIndex
  const step = 10 ** exponent
  return Number.isFinite(step) && step > 0 ? { exponent, step } : unitPlace
}

/** Steps an editable decimal string without round-tripping through its Number value. */
export function stepNumericDraftValue(
  raw: string,
  direction: 1 | -1,
  exponent: number,
  domain: NumericInputDomain = {}
): { draft: string; value: number } | null {
  if (!Number.isSafeInteger(exponent) || parseNumericDraft(raw, domain).kind !== 'valid') return null

  const current = decimalParts(raw)
  const resultExponent = Math.min(current.exponent, exponent)
  const currentCoefficient = current.coefficient * 10n ** BigInt(current.exponent - resultExponent)
  const increment = 10n ** BigInt(exponent - resultExponent)
  const result = {
    coefficient: currentCoefficient + BigInt(direction) * increment,
    exponent: resultExponent
  }
  const draft = formatDecimalParts(result)
  const value = Number(draft)
  if (!Number.isFinite(value) || !isNumericValueAllowed(value, domain)) return null
  if (domain.integer && result.exponent < 0
    && result.coefficient % (10n ** BigInt(-result.exponent)) !== 0n) return null
  if (Number.isFinite(domain.min)) {
    const comparison = compareDecimalParts(result, decimalParts(domain.min!))
    if (comparison < 0 || (domain.minExclusive && comparison === 0)) return null
  }
  if (Number.isFinite(domain.max) && compareDecimalParts(result, decimalParts(domain.max!)) > 0) return null
  return { draft, value }
}

export function numericCaretForPlace(raw: string, exponent: number, integer = false): number {
  const firstDigit = raw.search(/\d/)
  if (firstDigit < 0) return raw.length

  const decimalIndex = integer ? -1 : raw.indexOf('.')
  const integerEnd = decimalIndex < 0 ? raw.length : decimalIndex
  const lastDigit = raw.length - 1 - [...raw].reverse().findIndex(character => /\d/.test(character))
  const target = exponent >= 0
    ? integerEnd - exponent - 1
    : decimalIndex < 0
      ? lastDigit
      : decimalIndex - exponent
  return Math.max(firstDigit, Math.min(lastDigit, target))
}

/** Returns null when decrementing at the lower boundary intentionally clears the field. */
export function stepNumericValue(
  current: number | null | undefined,
  direction: 1 | -1,
  step: number,
  domain: NumericInputDomain = {},
  options: { stopAtMinimum?: boolean } = {}
): number | null {
  const increment = domain.integer ? Math.max(1, Math.round(Math.abs(step))) : Math.abs(step)
  if (!Number.isFinite(increment) || increment <= 0) return current ?? null
  const lower = firstAllowedAtOrAboveMin(domain)
  const upper = firstAllowedAtOrBelowMax(domain)

  if (current === null || current === undefined || !Number.isFinite(current)) {
    if (direction < 0) {
      if (domain.min !== undefined && domain.min >= 0) return null
      const candidate = -increment
      return isNumericValueAllowed(candidate, domain) ? candidate : null
    }
    let candidate = lower === undefined ? increment : Math.max(increment, lower)
    if (upper !== undefined) candidate = Math.min(candidate, upper)
    return isNumericValueAllowed(candidate, domain) ? candidate : null
  }

  const candidate = preciseStep(current, direction * increment, Boolean(domain.integer))
  if (isNumericValueAllowed(candidate, domain)) return candidate

  if (direction < 0 && lower === undefined && domain.minExclusive && domain.min !== undefined && candidate <= domain.min) {
    return options.stopAtMinimum ? current : null
  }
  if (direction < 0 && lower !== undefined && current <= lower + 1e-10) return options.stopAtMinimum ? current : null
  if (direction < 0 && lower !== undefined && candidate < lower) return options.stopAtMinimum ? lower : null
  if (candidate > (upper ?? Number.POSITIVE_INFINITY) && upper !== undefined) return upper
  return current
}

/** Removes only one trailing spreadsheet cell delimiter; multi-cell payloads stay intact for rejection or table handling. */
export function normalizeSingleCellNumericPaste(clipboardText: string): string | null {
  if (!/[\t\r\n]/.test(clipboardText)) return clipboardText
  const singleCell = /^([^\t\r\n]*)(?:\r\n|\r|\n)$/.exec(clipboardText)
  return singleCell ? singleCell[1] : null
}

export function formatNumericInputValue(
  value: number | null | undefined,
  domain: NumericInputDomain & Pick<NumericDisplayOptions, 'integerDigits'> = {}
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  // Display precision is independent of the value accepted by the editor.
  return formatBusinessNumber(value, { integer: domain.integer, integerDigits: domain.integerDigits })
}
