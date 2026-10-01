import type { DatasetSizing } from '../types/product.types'

export const DATASET_SIZING_LIMITS = {
  wcCount: 500,
  bomCount: 1000,
  routingCount: 500
} as const

const DATASET_SIZING_LABELS = {
  wcCount: 'Work Center rows',
  bomCount: 'BOM rows',
  routingCount: 'Routing rows'
} as const

/** Rejects invalid counts before the state layer can allocate generated rows. */
export function assertDatasetSizingCounts(
  sizing: DatasetSizing,
  options: { allowZero?: boolean } = {}
): void {
  const minimum = options.allowZero ? 0 : 1

  for (const field of Object.keys(DATASET_SIZING_LIMITS) as (keyof DatasetSizing)[]) {
    const count = sizing[field]
    if (count === undefined) continue

    if (
      typeof count !== 'number' ||
      !Number.isFinite(count) ||
      !Number.isInteger(count) ||
      count < minimum ||
      count > DATASET_SIZING_LIMITS[field]
    ) {
      throw new RangeError(
        `${DATASET_SIZING_LABELS[field]} must be a whole number between ${minimum} and ${DATASET_SIZING_LIMITS[field]}.`
      )
    }
  }
}

/** Excludes untouched rows allocated by dataset sizing from cost calculations and comparison. */
export function excludeGeneratedSizingPlaceholders<T extends { isGeneratedSizingPlaceholder?: boolean }>(
  rows: readonly T[]
): T[] {
  return rows.filter(row => row.isGeneratedSizingPlaceholder !== true)
}
