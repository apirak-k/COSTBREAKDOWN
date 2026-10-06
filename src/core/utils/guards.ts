/**
 * Poka-Yoke Guards and Safe Mathematical Operations.
 */

export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null
  const result = numerator / denominator
  return Number.isFinite(result) ? result : null
}

export function safeMultiply(...values: number[]): number | null {
  let result = 1
  for (const value of values) {
    if (!Number.isFinite(value)) return null
    result *= value
    if (!Number.isFinite(result)) return null
  }
  return result
}

export function safeAdd(...values: number[]): number | null {
  let result = 0
  for (const value of values) {
    if (!Number.isFinite(value)) return null
    result += value
    if (!Number.isFinite(result)) return null
  }
  return result
}

export function parsePercentage(value: string | number): number | null {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (!Number.isFinite(num)) return null
  return num > 1 ? num / 100 : num
}

export function isYieldDriver(rcaParameter: string): boolean {
  return rcaParameter.toLowerCase().includes('yield')
}

export function isPriceDriver(rcaParameter: string): boolean {
  return rcaParameter.toLowerCase().includes('price')
}

export function isLossDriver(rcaParameter: string): boolean {
  return rcaParameter.toLowerCase().includes('loss')
}

export function isCapacityDriver(rcaParameter: string): boolean {
  return rcaParameter.toLowerCase().includes('cap') || rcaParameter.toLowerCase().includes('capacity')
}
