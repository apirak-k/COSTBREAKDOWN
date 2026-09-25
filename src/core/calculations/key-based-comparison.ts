import { WorkingDataset, StandardWCItem, StandardRoutingItem, StandardBOMItem } from '../types/dataset-standard.types'

export interface KeyComparisonResult<T> {
  matchStatus: 'UNCHANGED' | 'CHANGED' | 'ADDED' | 'REMOVED'
  key: string
  referenceItem?: T
  currentItem?: T
  fieldDiffs: Record<string, { reference: unknown; current: unknown }>
}

export interface DatasetComparisonSummary {
  wc: KeyComparisonResult<StandardWCItem>[]
  routing: KeyComparisonResult<StandardRoutingItem>[]
  bom: KeyComparisonResult<StandardBOMItem>[]
  warnings: string[]
}

export function compareWorkingDatasets(
  refDataset: WorkingDataset,
  currDataset: WorkingDataset
): DatasetComparisonSummary {
  const warnings: string[] = []

  // 1. Compare WC by Process
  const wcResults = compareByBusinessKey(
    refDataset.wc,
    currDataset.wc,
    item => item.process,
    (ref, curr) => {
      const diffs: Record<string, { reference: unknown; current: unknown }> = {}
      if (ref.labor !== curr.labor) diffs['labor'] = { reference: ref.labor, current: curr.labor }
      if (ref.burden !== curr.burden) diffs['burden'] = { reference: ref.burden, current: curr.burden }
      return diffs
    },
    'Work Center',
    warnings
  )

  // 2. Compare Routing by Process
  const routingResults = compareByBusinessKey(
    refDataset.routing,
    currDataset.routing,
    item => item.process,
    (ref, curr) => {
      const diffs: Record<string, { reference: unknown; current: unknown }> = {}
      if (ref.capacity !== curr.capacity) diffs['capacity'] = { reference: ref.capacity, current: curr.capacity }
      if (ref.number !== curr.number) diffs['number'] = { reference: ref.number, current: curr.number }
      if (ref.yieldRatio !== curr.yieldRatio) diffs['yieldRatio'] = { reference: ref.yieldRatio, current: curr.yieldRatio }
      return diffs
    },
    'Routing',
    warnings
  )

  // 3. Compare BOM by Code
  const bomResults = compareByBusinessKey(
    refDataset.bom,
    currDataset.bom,
    item => item.code,
    (ref, curr) => {
      const diffs: Record<string, { reference: unknown; current: unknown }> = {}
      if (ref.materialName !== curr.materialName) diffs['materialName'] = { reference: ref.materialName, current: curr.materialName }
      if (ref.lossRatio !== curr.lossRatio) diffs['lossRatio'] = { reference: ref.lossRatio, current: curr.lossRatio }
      if (ref.consumption !== curr.consumption) diffs['consumption'] = { reference: ref.consumption, current: curr.consumption }
      if (ref.unit !== curr.unit) diffs['unit'] = { reference: ref.unit, current: curr.unit }
      if (ref.price !== curr.price) diffs['price'] = { reference: ref.price, current: curr.price }
      return diffs
    },
    'BOM',
    warnings
  )

  return {
    wc: wcResults,
    routing: routingResults,
    bom: bomResults,
    warnings
  }
}

function compareByBusinessKey<T>(
  refList: T[],
  currList: T[],
  getKey: (item: T) => string,
  getDiffs: (ref: T, curr: T) => Record<string, { reference: unknown; current: unknown }>,
  sectionName: string,
  warnings: string[]
): KeyComparisonResult<T>[] {
  const refMap = new Map<string, T>()
  const currMap = new Map<string, T>()

  refList.forEach(item => {
    const key = getKey(item)
    if (key) {
      if (refMap.has(key)) warnings.push(`Duplicate key '${key}' in Reference ${sectionName}`)
      else refMap.set(key, item)
    }
  })

  currList.forEach(item => {
    const key = getKey(item)
    if (key) {
      if (currMap.has(key)) warnings.push(`Duplicate key '${key}' in Current ${sectionName}`)
      else currMap.set(key, item)
    }
  })

  const allKeys = new Set<string>([...refMap.keys(), ...currMap.keys()])
  const results: KeyComparisonResult<T>[] = []

  allKeys.forEach(key => {
    const refItem = refMap.get(key)
    const currItem = currMap.get(key)

    if (refItem && currItem) {
      const fieldDiffs = getDiffs(refItem, currItem)
      const hasDiffs = Object.keys(fieldDiffs).length > 0
      results.push({
        matchStatus: hasDiffs ? 'CHANGED' : 'UNCHANGED',
        key,
        referenceItem: refItem,
        currentItem: currItem,
        fieldDiffs
      })
    } else if (refItem && !currItem) {
      results.push({
        matchStatus: 'REMOVED',
        key,
        referenceItem: refItem,
        fieldDiffs: {}
      })
    } else if (!refItem && currItem) {
      results.push({
        matchStatus: 'ADDED',
        key,
        currentItem: currItem,
        fieldDiffs: {}
      })
    }
  })

  return results
}
