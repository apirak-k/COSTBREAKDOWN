import type { DatasetSizing, ProductMaster } from '../../core/types'

export type DatasetSizingProductFields = Pick<ProductMaster, 'productCode' | 'productDescription' | 'uom'>

const sizingFields: (keyof DatasetSizing)[] = ['wcCount', 'bomCount', 'routingCount']

export function hasDatasetSizingChanged(previous: DatasetSizing, next: DatasetSizing): boolean {
  return sizingFields.some(field => previous[field] !== next[field])
}

export function hasProductSizingFieldsChanged(
  previous: DatasetSizingProductFields,
  next: DatasetSizingProductFields
): boolean {
  return previous.productCode !== next.productCode ||
    previous.productDescription !== next.productDescription ||
    previous.uom !== next.uom
}
