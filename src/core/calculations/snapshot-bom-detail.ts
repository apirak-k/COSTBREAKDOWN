import { SnapshotBOMItem } from '../types'
import {
  exactDecimalInputValue,
  exactDecimalToNumber,
  exactDecimalToString,
  multiplyExactDecimals,
  parseExactDecimal,
  addExactDecimals,
  subtractExactDecimals,
  resolveExactDecimalInputPair,
  type ExactDecimal,
  type ExactDecimalInputPairOptions
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

type BOMExactInputs = Record<'consumption' | 'price' | 'loss', ExactDecimal | null>

function costOf(item: SnapshotBOMItem | undefined, exactInputs?: BOMExactInputs): PreciseCost | null {
  if (!item
    || item.consumption == null || !isMasterDataNumericValueValid('consumption', item.consumption)
    || item.price == null || !isMasterDataNumericValueValid('price', item.price)
    || item.loss == null || !isMasterDataNumericValueValid('loss', item.loss)) return null
  const consumption = exactInputs
    ? exactInputs.consumption
    : exactDecimalInputValue(item.consumption, item.exactDecimalInputs?.consumption)
  const price = exactInputs
    ? exactInputs.price
    : exactDecimalInputValue(item.price, item.exactDecimalInputs?.price)
  const loss = exactInputs
    ? exactInputs.loss
    : exactDecimalInputValue(item.loss, item.exactDecimalInputs?.loss, true)
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
export function calculateSnapshotBOMDetail(
  pair: SnapshotBOMPair,
  pairOptions: ExactDecimalInputPairOptions = {}
): SnapshotBOMDetail {
  let referenceExactInputs: BOMExactInputs | undefined
  let currentExactInputs: BOMExactInputs | undefined
  if (pair.reference && pair.current) {
    const consumption = resolveExactDecimalInputPair(
      pair.reference.consumption,
      pair.reference.exactDecimalInputs?.consumption,
      pair.current.consumption,
      pair.current.exactDecimalInputs?.consumption,
      false,
      pairOptions
    )
    const price = resolveExactDecimalInputPair(
      pair.reference.price,
      pair.reference.exactDecimalInputs?.price,
      pair.current.price,
      pair.current.exactDecimalInputs?.price,
      false,
      pairOptions
    )
    const loss = resolveExactDecimalInputPair(
      pair.reference.loss,
      pair.reference.exactDecimalInputs?.loss,
      pair.current.loss,
      pair.current.exactDecimalInputs?.loss,
      true,
      pairOptions
    )
    referenceExactInputs = { consumption: consumption.reference, price: price.reference, loss: loss.reference }
    currentExactInputs = { consumption: consumption.current, price: price.current, loss: loss.current }
  }
  // If record does not exist on reference side (ADDED), referenceCost is 0
  const reference = pair.reference ? costOf(pair.reference, referenceExactInputs) : { value: 0, exact: '0' }
  // If record does not exist on current side (REMOVED), currentCost is 0
  const current = pair.current ? costOf(pair.current, currentExactInputs) : { value: 0, exact: '0' }
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
