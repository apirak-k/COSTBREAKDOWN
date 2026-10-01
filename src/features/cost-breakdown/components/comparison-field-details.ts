export interface ComparisonFieldChange {
  field: string
  label: string
  reference: string
  current: string
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

function displayField(field: string): string {
  const name = field.replace(/^additionalFields\./, '')
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, character => character.toUpperCase())
}

export function formatComparisonFieldDiffs(
  fieldDiffs: Record<string, { reference: unknown; current: unknown }>
): ComparisonFieldChange[] {
  return Object.entries(fieldDiffs).map(([field, values]) => ({
    field,
    label: displayField(field),
    reference: displayValue(values.reference),
    current: displayValue(values.current)
  }))
}
