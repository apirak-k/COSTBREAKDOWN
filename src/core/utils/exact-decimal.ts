/** A base-10 decimal represented without binary floating-point rounding. */
export interface ExactDecimal {
  coefficient: bigint
  scale: number
}

const MAX_SCALE = 10000
const DECIMAL_PATTERN = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/

function powerOfTen(exponent: number): bigint {
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > MAX_SCALE) {
    throw new RangeError('Decimal scale is outside the supported range')
  }
  return 10n ** BigInt(exponent)
}

function normalize(coefficient: bigint, scale: number): ExactDecimal {
  if (coefficient === 0n) return { coefficient: 0n, scale: 0 }
  let normalizedCoefficient = coefficient
  let normalizedScale = scale
  while (normalizedScale > 0 && normalizedCoefficient % 10n === 0n) {
    normalizedCoefficient /= 10n
    normalizedScale -= 1
  }
  return { coefficient: normalizedCoefficient, scale: normalizedScale }
}

function fullNumberText(value: number): string {
  const text = String(value)
  if (!/[eE]/.test(text)) return text
  const [significand, exponentText] = text.split(/[eE]/)
  const sign = value < 0 ? '-' : ''
  const [whole, fraction = ''] = significand.replace('-', '').split('.')
  const digits = whole + fraction
  const point = whole.length + Number(exponentText)
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`
  if (point >= digits.length) return `${sign}${digits}${'0'.repeat(point - digits.length)}`
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`
}

function numberSpacing(value: number): number {
  const absolute = Math.abs(value)
  if (absolute === 0 || absolute < 2 ** -1022) return Number.MIN_VALUE
  return 2 ** (Math.floor(Math.log2(absolute)) - 52)
}

/** Removes only a narrow floating representation tail that is within two ULP of a shorter decimal. */
export function cleanMachineFloatingPointResidue(value: number, text = fullNumberText(value)): string {
  if (!Number.isFinite(value)) return text
  const decimalIndex = text.indexOf('.')
  if (decimalIndex < 0) return text

  const fractionDigits = text.length - decimalIndex - 1
  if (fractionDigits < 3) return text

  for (let digits = 0; digits <= Math.min(100, fractionDigits - 3); digits += 1) {
    const candidate = value.toFixed(digits)
    if (/[eE]/.test(candidate)) continue
    const candidateValue = Number(candidate)
    if (value !== 0 && candidateValue === 0) continue
    const tolerance = 2 * Math.max(numberSpacing(value), numberSpacing(candidateValue))
    if (Math.abs(candidateValue - value) <= tolerance) return candidate
  }

  return text
}

/** Uses the shared narrow noise rule when only a legacy/model Number is available. */
export function exactDecimalNumberText(value: number): string | null {
  return Number.isFinite(value) ? cleanMachineFloatingPointResidue(value) : null
}

/** Parses ordinary and scientific decimal text exactly. */
export function parseExactDecimal(value: string | number): ExactDecimal | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    value = String(value)
  }
  const text = value.trim()
  const match = DECIMAL_PATTERN.exec(text)
  if (!match) return null

  const sign = match[1] === '-' ? -1n : 1n
  const integerPart = match[2] ?? '0'
  const fractionalPart = match[2] === undefined ? match[4] ?? '' : match[3] ?? ''
  const exponentText = match[5] ?? '0'
  const exponent = Number(exponentText)
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > MAX_SCALE) return null

  let coefficient: bigint
  try {
    coefficient = sign * BigInt(`${integerPart}${fractionalPart}` || '0')
  } catch {
    return null
  }
  let scale = fractionalPart.length - exponent
  if (scale < 0) {
    if (-scale > MAX_SCALE) return null
    coefficient *= powerOfTen(-scale)
    scale = 0
  }
  if (scale > MAX_SCALE) return null
  return normalize(coefficient, scale)
}

function aligned(left: ExactDecimal, right: ExactDecimal): [bigint, bigint, number] {
  const scale = Math.max(left.scale, right.scale)
  return [
    left.coefficient * powerOfTen(scale - left.scale),
    right.coefficient * powerOfTen(scale - right.scale),
    scale
  ]
}

export function addExactDecimals(...values: ExactDecimal[]): ExactDecimal {
  if (values.length === 0) return { coefficient: 0n, scale: 0 }
  return values.slice(1).reduce((sum, value) => {
    const [left, right, scale] = aligned(sum, value)
    return normalize(left + right, scale)
  }, values[0])
}

export function subtractExactDecimals(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const [alignedLeft, alignedRight, scale] = aligned(left, right)
  return normalize(alignedLeft - alignedRight, scale)
}

export function multiplyExactDecimals(...values: ExactDecimal[]): ExactDecimal {
  return values.reduce(
    (product, value) => normalize(product.coefficient * value.coefficient, product.scale + value.scale),
    { coefficient: 1n, scale: 0 }
  )
}

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left
  let b = right < 0n ? -right : right
  while (b !== 0n) [a, b] = [b, a % b]
  return a
}

function terminatingQuotient(numerator: bigint, denominator: bigint): ExactDecimal | null {
  const common = gcd(numerator, denominator)
  let reducedNumerator = numerator / common
  let reducedDenominator = denominator / common
  let twos = 0
  let fives = 0
  while (reducedDenominator % 2n === 0n) {
    reducedDenominator /= 2n
    twos += 1
  }
  while (reducedDenominator % 5n === 0n) {
    reducedDenominator /= 5n
    fives += 1
  }
  if (reducedDenominator !== 1n) return null

  const scale = Math.max(twos, fives)
  reducedNumerator *= 2n ** BigInt(scale - twos) * 5n ** BigInt(scale - fives)
  return normalize(reducedNumerator, scale)
}

function decimalOrder(numerator: bigint, denominator: bigint): number {
  const positiveNumerator = numerator < 0n ? -numerator : numerator
  const digits = (value: bigint) => value.toString().length
  let order = digits(positiveNumerator) - digits(denominator)
  if (order >= 0) {
    if (positiveNumerator < denominator * powerOfTen(order)) order -= 1
  } else if (positiveNumerator * powerOfTen(-order) < denominator) {
    order -= 1
  }
  return order
}

/** Divides exactly when the decimal terminates; otherwise keeps 80 significant digits. */
export function divideExactDecimals(
  dividend: ExactDecimal,
  divisor: ExactDecimal,
  significantDigits = 80
): ExactDecimal | null {
  if (divisor.coefficient === 0n) return null
  if (dividend.coefficient === 0n) return { coefficient: 0n, scale: 0 }

  let numerator = dividend.coefficient
  let denominator = divisor.coefficient
  if (denominator < 0n) {
    numerator = -numerator
    denominator = -denominator
  }
  const exponentShift = divisor.scale - dividend.scale
  if (exponentShift > 0) numerator *= powerOfTen(exponentShift)
  else if (exponentShift < 0) denominator *= powerOfTen(-exponentShift)

  const exact = terminatingQuotient(numerator, denominator)
  if (exact) return exact

  const common = gcd(numerator, denominator)
  numerator /= common
  denominator /= common
  const order = decimalOrder(numerator, denominator)
  const scale = Math.max(0, significantDigits - 1 - order)
  if (scale > MAX_SCALE) return null
  const coefficient = numerator * powerOfTen(scale) / denominator
  return normalize(coefficient, scale)
}

export function compareExactDecimals(left: ExactDecimal, right: ExactDecimal): -1 | 0 | 1 {
  const [alignedLeft, alignedRight] = aligned(left, right)
  return alignedLeft < alignedRight ? -1 : alignedLeft > alignedRight ? 1 : 0
}

export function exactDecimalToString(value: ExactDecimal): string {
  const normalized = normalize(value.coefficient, value.scale)
  const negative = normalized.coefficient < 0n
  const digits = (negative ? -normalized.coefficient : normalized.coefficient).toString()
  if (normalized.scale === 0) return `${negative ? '-' : ''}${digits}`
  const padded = digits.padStart(normalized.scale + 1, '0')
  const decimalIndex = padded.length - normalized.scale
  return `${negative ? '-' : ''}${padded.slice(0, decimalIndex)}.${padded.slice(decimalIndex)}`
}

export function exactDecimalToNumber(value: ExactDecimal): number | null {
  const number = Number(exactDecimalToString(value))
  return Number.isFinite(number) ? number : null
}

/** Resolves editor text when available and converts percentage-entry fields to stored fractions. */
export function exactDecimalInputValue(
  numericValue: number | null | undefined,
  exactInput?: string,
  percentageInput = false
): ExactDecimal | null {
  if (numericValue == null || !Number.isFinite(numericValue)) return null

  const exactText = exactInput?.trim()
  if (exactText) {
    const entered = parseExactDecimal(exactText)
    if (entered) {
      // The sidecar is authoritative only while it still represents the same
      // stored business value. This preserves intentional precision that maps
      // to the same Number projection, while preventing an old sidecar from
      // overriding a later numeric-only mutation.
      const storedExact = percentageInput
        ? divideExactDecimals(entered, { coefficient: 100n, scale: 0 })
        : entered
      const projected = storedExact ? exactDecimalToNumber(storedExact) : null
      if (storedExact && projected !== null && Object.is(projected, numericValue)) return storedExact
    }
  }

  return parseExactDecimal(exactDecimalNumberText(numericValue) ?? numericValue)
}
