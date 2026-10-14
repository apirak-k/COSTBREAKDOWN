import {
  calculateBOMParameterCostEffects,
  calculateSnapshotBOMDetail,
  formatNumber,
  formatPercent,
  formatVariance,
  getCanonicalComparisonStatus,
  getComparisonStatusLabels,
  getComparisonFindingKey
} from '../../../core'
import type { ComparisonFinding, ComparisonStatus, SnapshotBOMItem } from '../../../core'

export interface BOMItemizedRow {
  key: string
  finding?: ComparisonFinding
  reference?: SnapshotBOMItem
  current?: SnapshotBOMItem
  referenceCost: number | null
  currentCost: number | null
  gap: number | null
}

interface BOMRecordDetailsProps {
  row: BOMItemizedRow
  detailId?: string
}

const formatNullable = (value: number | null | undefined, format: (value: number) => string) =>
  value === null || value === undefined ? '—' : format(value)

export function getBOMComparisonLabel(finding: ComparisonFinding): ComparisonStatus | null {
  return getComparisonStatusLabels(finding)[0] ?? null
}

function comparisonValues(finding: ComparisonFinding | undefined, reference?: SnapshotBOMItem, current?: SnapshotBOMItem) {
  if (!finding) return calculateSnapshotBOMDetail({ reference, current })
  const effect = finding.costEffect
  return effect
    ? { referenceCost: effect.reference.material, currentCost: effect.current.material, costGap: effect.gap.material }
    : { referenceCost: null, currentCost: null, costGap: null }
}

export function buildBOMItemizedRows(
  referenceItems: SnapshotBOMItem[],
  currentItems: SnapshotBOMItem[],
  findings: ComparisonFinding[]
): BOMItemizedRow[] {
  const referenceById = new Map(referenceItems.map(item => [item.id, item]))
  const findingByCurrentId = new Map(
    findings.filter(finding => finding.currentId).map(finding => [finding.currentId as string, finding])
  )

  const currentRows = currentItems.map(current => {
    const finding = findingByCurrentId.get(current.id)
    const reference = finding?.referenceId ? referenceById.get(finding.referenceId) : undefined
    const detail = comparisonValues(finding, reference, current)
    return {
      key: finding ? getComparisonFindingKey('bom', finding) : `bom:${current.id}`,
      finding,
      reference,
      current,
      referenceCost: detail.referenceCost,
      currentCost: detail.currentCost,
      gap: detail.costGap
    }
  })
  const referenceOnlyRows = findings
    .filter(finding => !finding.currentId && finding.referenceId)
    .map(finding => {
      const reference = finding.referenceId ? referenceById.get(finding.referenceId) : undefined
      const detail = comparisonValues(finding, reference)
      return {
        key: getComparisonFindingKey('bom', finding),
        finding,
        reference,
        referenceCost: detail.referenceCost,
        currentCost: detail.currentCost,
        gap: detail.costGap
      }
    })

  return [...currentRows, ...referenceOnlyRows]
}

/**
 * Emits detail lines into the Candidate table's existing tbody. Keeping these
 * as rows (instead of a nested table) preserves the parent's shared column grid.
 */
export function BOMRecordDetails({ row, detailId }: BOMRecordDetailsProps) {
  const { reference, current, finding } = row
  const status = getCanonicalComparisonStatus(finding)
  const isMatchedChange = finding?.matchStatus === 'matched' && status === 'CHANGED'
  const effect = isMatchedChange
    ? calculateBOMParameterCostEffects(
        { usage: reference?.consumption ?? null, price: reference?.price ?? null, loss: reference?.loss ?? null },
        { usage: current?.consumption ?? null, price: current?.price ?? null, loss: current?.loss ?? null }
      )
    : null
  const effects = effect?.status === 'available' ? effect.effects : null
  const parameterRows = [
    {
      label: 'Reference',
      usage: reference?.consumption ?? null,
      price: reference?.price ?? null,
      loss: reference?.loss ?? null,
      cost: reference ? row.referenceCost : null
    },
    {
      label: 'Current',
      usage: current?.consumption ?? null,
      price: current?.price ?? null,
      loss: current?.loss ?? null,
      cost: current ? row.currentCost : null
    },
    {
      label: 'Parameter Effect',
      usage: effects?.usage ?? null,
      price: effects?.price ?? null,
      loss: effects?.loss ?? null,
      cost: row.gap,
      effect: true
    }
  ]

  return <>
    {parameterRows.map((item, index) => <tr
      key={item.label}
      id={index === 0 ? detailId : undefined}
      className={item.effect ? 'border-b border-slate-200 bg-slate-100 font-semibold' : index === 0 ? 'border-t border-slate-200 bg-slate-50/80' : 'bg-slate-50/80'}
    >
      <td aria-hidden="true" className="px-2 py-1.5" />
      <th scope="row" className={`truncate border-l-2 border-slate-300 px-2.5 py-1.5 text-left font-sans ${item.effect ? 'font-semibold text-slate-950' : 'font-medium text-slate-700'}`}>{item.label}</th>
      <td aria-hidden="true" className="px-2.5 py-1.5" />
      <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.usage, value => formatVariance(value, 4)) : formatNullable(item.usage, value => formatNumber(value, 4))}</td>
      <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.price, value => formatVariance(value, 4)) : formatNullable(item.price, value => formatNumber(value, 4))}</td>
      <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.loss, value => formatVariance(value, 4)) : formatNullable(item.loss, value => formatPercent(value, 2))}</td>
      <td className="px-2.5 py-1.5 text-right">{item.effect ? formatNullable(item.cost, value => formatVariance(value, 4)) : formatNullable(item.cost, value => formatNumber(value, 4))}</td>
      <td aria-hidden="true" className="px-2.5 py-1.5" />
      <td aria-hidden="true" className="px-1 py-1.5" />
      <td aria-hidden="true" className="px-1 py-1.5" />
    </tr>)}
  </>
}
