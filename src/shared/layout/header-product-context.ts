export interface HeaderProductContextSource {
  productName?: string | null
  uom?: string | null
}

export function resolveHeaderProductContext(
  reference: HeaderProductContextSource,
  current: HeaderProductContextSource
): string {
  const referenceName = reference.productName?.trim() ?? ''
  const currentName = current.productName?.trim() ?? ''
  const referenceUom = reference.uom?.trim() ?? ''
  const currentUom = current.uom?.trim() ?? ''

  if (!referenceName || !currentName || !referenceUom || !currentUom) return 'Product (Unit)'
  if (referenceName !== currentName || referenceUom !== currentUom) return 'Product (Unit)'

  return `${referenceName} (${referenceUom})`
}
