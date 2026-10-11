export interface NumericInputDomain {
  integer?: boolean
  precision?: number
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

function precisionOf(domain: NumericInputDomain): number {
  return domain.integer ? 0 : Math.max(0, Math.min(6, Math.trunc(domain.precision ?? 2)))
}

export function isNumericDraftSyntax(raw: string, domain: NumericInputDomain = {}): boolean {
  const precision = precisionOf(domain)
  const allowNegative = domain.min === undefined || domain.min < 0
  const sign = allowNegative ? '-?' : ''
  if (domain.integer) return new RegExp(`^${sign}\\d*$`).test(raw)
  return new RegExp(`^${sign}(?:\\d+)?(?:\\.\\d{0,${precision}})?$`).test(raw)
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
  if (!domain.minExclusive) return domain.integer ? Math.ceil(domain.min) : domain.min
  if (domain.integer) return Math.floor(domain.min) + 1
  return domain.min + (10 ** -precisionOf(domain))
}

function firstAllowedAtOrBelowMax(domain: NumericInputDomain): number | undefined {
  if (domain.max === undefined) return undefined
  return domain.integer ? Math.floor(domain.max) : domain.max
}

function preciseStep(value: number, delta: number, integer: boolean): number {
  const result = value + delta
  return integer ? Math.round(result) : Number(result.toPrecision(12))
}

/** Returns null when decrementing at the lower boundary intentionally clears the field. */
export function stepNumericValue(
  current: number | null | undefined,
  direction: 1 | -1,
  step: number,
  domain: NumericInputDomain = {}
): number | null {
  const increment = domain.integer ? 1 : Math.abs(step)
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

  if (direction < 0 && lower !== undefined && current <= lower + 1e-10) return null
  if (direction < 0 && lower !== undefined && candidate < lower) return null
  if (candidate > (upper ?? Number.POSITIVE_INFINITY) && upper !== undefined) return upper
  return current
}

export function formatNumericInputValue(
  value: number | null | undefined,
  domain: NumericInputDomain = {}
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  if (domain.integer) return String(Math.round(value))
  return value.toFixed(precisionOf(domain))
}
