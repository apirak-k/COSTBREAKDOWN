import { isProductIdentityMismatch } from '../../core/utils/master-data-effective'

export interface HeaderProductContextSource {
  productName?: string | null
  uom?: string | null
}

export type ProductComparisonDisplayStatus = 'match' | 'mismatch' | 'not-set'

export function resolveProductComparisonDisplayStatus(
  reference: HeaderProductContextSource,
  current: HeaderProductContextSource
): ProductComparisonDisplayStatus {
  const hasCompleteIdentity = (product: HeaderProductContextSource) =>
    Boolean(product.productName?.trim() && product.uom?.trim())

  if (!hasCompleteIdentity(reference) || !hasCompleteIdentity(current)) return 'not-set'
  return isProductIdentityMismatch(reference, current) ? 'mismatch' : 'match'
}

export function formatProductIdentityForDisplay(product: HeaderProductContextSource): string {
  const productName = product.productName?.trim() ?? ''
  const uom = product.uom?.trim() ?? ''

  if (!productName && !uom) return 'Not set'
  if (!productName) return `Product name not set (${uom})`
  if (!uom) return `${productName} (UOM not set)`
  return `${productName} (${uom})`
}

export function resolveHeaderProductContext(
  current: HeaderProductContextSource
): string {
  const productName = current.productName?.trim() ?? ''
  const uom = current.uom?.trim() ?? ''
  if (!productName && !uom) return 'Product Not Set'
  return formatProductIdentityForDisplay(current)
}
