/** Excludes untouched rows allocated by dataset sizing from cost calculations and comparison. */
export function excludeGeneratedSizingPlaceholders<T extends { isGeneratedSizingPlaceholder?: boolean }>(
  rows: readonly T[]
): T[] {
  return rows.filter(row => row.isGeneratedSizingPlaceholder !== true)
}
