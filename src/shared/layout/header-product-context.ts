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
  reference: HeaderProductContextSource,
  current: HeaderProductContextSource
): string {
  const referenceName = reference.productName?.trim() ?? ''
  const referenceUom = reference.uom?.trim() ?? ''

  const status = resolveProductComparisonDisplayStatus(reference, current)
  if (status === 'not-set') return 'Product Not Set'
  if (status === 'mismatch') return 'Product Mismatch'

  return `${referenceName} (${referenceUom})`
}
