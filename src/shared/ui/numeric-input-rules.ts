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
  return deltaY > 0 ? 1 : -1
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

function decimalParts(value: number): { coefficient: bigint; exponent: number } {
  const [significand, exponentText] = value.toString().toLowerCase().split('e')
  const [whole, fraction = ''] = significand.split('.')
  return {
    coefficient: BigInt(`${whole}${fraction}`),
    exponent: Number(exponentText ?? 0) - fraction.length
  }
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

export function formatNumericInputValue(
  value: number | null | undefined,
  domain: NumericInputDomain & Pick<NumericDisplayOptions, 'integerDigits'> = {}
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  // Display precision is independent of the value accepted by the editor.
  return formatBusinessNumber(value, { integer: domain.integer, integerDigits: domain.integerDigits })
}
