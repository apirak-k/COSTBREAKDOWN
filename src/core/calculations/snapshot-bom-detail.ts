import { SnapshotBOMItem } from '../types'
import {
  exactDecimalInputValue,
  exactDecimalToNumber,
  exactDecimalToString,
  multiplyExactDecimals,
  parseExactDecimal,
  addExactDecimals,
  subtractExactDecimals
} from '../utils/exact-decimal'
import { isMasterDataNumericValueValid } from '../utils/master-data-validation'

export interface SnapshotBOMPair {
  reference?: SnapshotBOMItem
  current?: SnapshotBOMItem
}

export interface SnapshotBOMDetail {
  pair: SnapshotBOMPair
  referenceCost: number | null
  currentCost: number | null
  costGap: number | null
  exactValues?: { referenceCost: string | null; currentCost: string | null; costGap: string | null }
}

interface PreciseCost {
  value: number
  exact: string
}

function costOf(item: SnapshotBOMItem | undefined): PreciseCost | null {
  if (!item
    || item.consumption == null || !isMasterDataNumericValueValid('consumption', item.consumption)
    || item.price == null || !isMasterDataNumericValueValid('price', item.price)
    || item.loss == null || !isMasterDataNumericValueValid('loss', item.loss)) return null
  const consumption = exactDecimalInputValue(item.consumption, item.exactDecimalInputs?.consumption)
  const price = exactDecimalInputValue(item.price, item.exactDecimalInputs?.price)
  const loss = exactDecimalInputValue(item.loss, item.exactDecimalInputs?.loss, true)
  const one = parseExactDecimal(1)!
  if (!consumption || !price || !loss) return null
  const exactCost = multiplyExactDecimals(
    consumption,
    price,
    addExactDecimals(one, loss)
  )
  const value = exactDecimalToNumber(exactCost)
  return value === null ? null : { value, exact: exactDecimalToString(exactCost) }
}

/** Calculates BOM costs with absent-side zero for added/removed records without converting missing inputs to zero. */
export function calculateSnapshotBOMDetail(pair: SnapshotBOMPair): SnapshotBOMDetail {
  // If record does not exist on reference side (ADDED), referenceCost is 0
  const reference = pair.reference ? costOf(pair.reference) : { value: 0, exact: '0' }
  // If record does not exist on current side (REMOVED), currentCost is 0
  const current = pair.current ? costOf(pair.current) : { value: 0, exact: '0' }
  const costGap = reference === null || current === null
    ? null
    : subtractExactDecimals(parseExactDecimal(current.exact)!, parseExactDecimal(reference.exact)!)
  const numericGap = costGap ? exactDecimalToNumber(costGap) : null

  return {
    pair,
    referenceCost: reference?.value ?? null,
    currentCost: current?.value ?? null,
    costGap: numericGap,
    exactValues: {
      referenceCost: reference?.exact ?? null,
      currentCost: current?.exact ?? null,
      costGap: costGap ? exactDecimalToString(costGap) : null
    }
  }
}
