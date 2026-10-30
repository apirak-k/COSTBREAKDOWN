import type { DatasetSizing, ProductMaster } from '../../core/types'
import { DATASET_SIZING_LIMITS } from '../../core/utils/sizing'

export type DatasetSizingProductFields = Pick<ProductMaster, 'productName' | 'uom' | 'sellingPrice' | 'sgaPercent'>

export function parseDatasetSizingCounts(
  values: Partial<Record<keyof DatasetSizing, string>>
): DatasetSizing {
  const parsed: DatasetSizing = {}

  for (const field of sizingFields) {
    const value = values[field]?.trim() ?? ''
    if (!value) continue

    const count = Number(value)
    if (!Number.isFinite(count) || !Number.isInteger(count) || count < 1 || count > DATASET_SIZING_LIMITS[field]) {
      const label = field === 'wcCount' ? 'Work Center' : field === 'bomCount' ? 'BOM' : 'Routing'
      throw new RangeError(`${label} rows must be a whole number from 1 to ${DATASET_SIZING_LIMITS[field]}.`)
    }
    parsed[field] = count
  }

  return parsed
}

const sizingFields: (keyof DatasetSizing)[] = ['wcCount', 'bomCount', 'routingCount']

export function hasDatasetSizingChanged(previous: DatasetSizing, next: DatasetSizing): boolean {
  return sizingFields.some(field => previous[field] !== next[field])
}

export function hasDatasetMetadataChanged(
  previous: DatasetSizingProductFields,
  next: DatasetSizingProductFields
): boolean {
  return previous.productName !== next.productName ||
    previous.uom !== next.uom ||
    previous.sellingPrice !== next.sellingPrice ||
    previous.sgaPercent !== next.sgaPercent
}
