/**
 * Poka-Yoke Guards and Safe Mathematical Operations.
 */

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (isNaN(numerator) || isNaN(denominator) || Math.abs(denominator) < 1e-9) {
    return fallback
  }
  const result = numerator / denominator
  return isFinite(result) ? result : fallback
}

export function parsePercentage(value: string | number): number {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num) || num <= 0) return 0
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
