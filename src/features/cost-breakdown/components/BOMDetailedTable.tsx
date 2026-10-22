import {
  calculateBOMParameterCostEffects,
  calculateSnapshotBOMDetail,
  formatNumber,
  formatPercent,
  formatVariance,
  getCanonicalComparisonStatus,
  getComparisonStatusLabels,
  getComparisonFindingKey,
  isMasterDataNumericValueValid
} from '../../../core'
import type { ComparisonFinding, ComparisonStatus, SnapshotBOMItem } from '../../../core'
import { SelectedNumber } from '../../../shared/ui/selected-value'

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
  beforeRoleLabel?: string
  afterRoleLabel?: string
  selectionIdPrefix?: string
  detailId?: string
}

function validFactorValue(field: 'consumption' | 'price' | 'loss', value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && isMasterDataNumericValueValid(field, value)
    ? value
    : null
}

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
export function BOMRecordDetails({
  row,
  beforeRoleLabel = 'Reference',
  afterRoleLabel = 'Current',
  selectionIdPrefix = `cbd:detail:${row.key}`,
  detailId
}: BOMRecordDetailsProps) {
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
  const parameterValues = [
    {
      field: 'consumption' as const,
      reference: reference?.consumption,
      current: current?.consumption,
      effect: effects?.usage,
      format: (value: number) => formatNumber(value, 2)
    },
    {
      field: 'price' as const,
      reference: reference?.price,
      current: current?.price,
      effect: effects?.price,
      format: (value: number) => formatNumber(value, 2)
    },
    {
      field: 'loss' as const,
      reference: reference?.loss,
      current: current?.loss,
      effect: effects?.loss,
      format: (value: number) => formatPercent(value, 2)
    }
  ]

  const renderNumericValue = (
    value: number | null | undefined,
    label: string,
    side: 'before' | 'after' | 'effect',
    field: string,
    format: (value: number) => string,
    percentage = false
  ) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—'
    const visible = format(value)
    return <SelectedNumber
      value={percentage ? value * 100 : value}
      percentage={percentage}
      selectionId={`${selectionIdPrefix}:${side}:${field}`}
      aria-label={`${label} ${field} ${visible}`}
      className="text-right"
    >{visible}</SelectedNumber>
  }

  const renderDetailRow = (label: string, side: 'before' | 'after' | 'effect', id?: string) => {
    const effectRow = side === 'effect'
    const separatorClass = effectRow ? 'border-t border-b border-slate-200' : 'border-t border-slate-200'
    return <tr
    key={label}
    id={id}
    className={effectRow
      ? 'bg-white font-bold text-slate-950'
      : 'bg-white font-normal text-slate-600'}
  >
    <td aria-hidden="true" className={`px-1 py-1.5 ${effectRow ? 'border-b border-slate-200' : ''}`} />
    <th scope="row" className={`truncate px-2.5 py-1.5 text-left font-sans ${separatorClass} ${effectRow ? 'font-bold' : 'font-normal'}`}><span className="ml-2 inline-block whitespace-nowrap border-l-2 border-slate-300 pl-3">{label}</span></th>
    <td aria-hidden="true" className={`px-2 py-1.5 ${separatorClass}`} />
    {parameterValues.map(item => <td key={item.field} className={`${separatorClass} whitespace-nowrap px-1 py-1.5 text-right`}>
      {effectRow
        ? renderNumericValue(item.effect, label, side, item.field, value => formatVariance(value, 2))
        : renderNumericValue(
            validFactorValue(item.field, side === 'before' ? item.reference : item.current),
            label,
            side,
            item.field,
            item.format,
            item.field === 'loss'
          )}
    </td>)}
    <td className={`${separatorClass} whitespace-nowrap px-1 py-1.5 text-right ${effectRow ? 'font-mono tabular-nums' : ''}`}>
      {effectRow ? renderNumericValue(row.gap, label, side, 'gap', value => formatVariance(value, 2)) : ''}
    </td>
    <td aria-hidden="true" className={`px-2 py-1.5 ${separatorClass}`} />
    <td aria-hidden="true" className={`px-1 py-1.5 ${separatorClass}`} />
    <td aria-hidden="true" className={`px-1 py-1.5 ${separatorClass}`} />
    </tr>
  }

  return <>
    {renderDetailRow(beforeRoleLabel, 'before', detailId)}
    {renderDetailRow(afterRoleLabel, 'after')}
    {renderDetailRow('Parameter Cost Effect', 'effect')}
  </>
}
