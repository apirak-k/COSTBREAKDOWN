import { CostSnapshot } from '../../core'
import { loadExcelJS, writeExcelJSBuffer } from './exceljs-runtime'
import { addMasterDataWorkbook } from './master-data-workbook'
import { normalizeMasterDataSnapshot } from '../../core/utils/master-data-effective'
import { exactDecimalInputValue, exactDecimalToString } from '../../core/utils/exact-decimal'
import { writeExactNumericCells, type ExactNumericCellChanges } from './exact-numeric-cells'

function exactCellValue(value: number | null | undefined, exactInput?: string, percentEntry = false): string | undefined {
  const exact = exactDecimalInputValue(value, exactInput, percentEntry)
  return exact ? exactDecimalToString(exact) : undefined
}

function setExactCell(
  changes: ExactNumericCellChanges,
  sheet: string,
  address: string,
  value: number | null | undefined,
  exactInput?: string,
  percentEntry = false
): void {
  const exact = exactCellValue(value, exactInput, percentEntry)
  if (exact !== undefined) (changes[sheet] ??= {})[address] = exact
}

export async function exportSnapshotToExcel(snapshot: CostSnapshot): Promise<Blob> {
  const effective = normalizeMasterDataSnapshot(snapshot)
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cost Breakdown Analysis Platform'
  workbook.created = new Date()

  addMasterDataWorkbook(workbook, {
    product: effective.product,
    remark: effective.remark,
    rows: {
      bom: effective.bom.map(item => [
        item.description || item.itemCode, item.consumption, item.unit, item.price, item.loss, item.note || ''
      ]),
      workCenters: effective.rates.map(rate => [
        rate.workCenterCode, rate.laborRate, rate.burdenRate, rate.note || ''
      ]),
      routing: effective.routing.map(step => [
        step.processName, step.workCenterId || '', step.manning, step.capacity, step.yield, step.note || ''
      ])
    }
  })
  workbook.calcProperties = { fullCalcOnLoad: true }

  const exactCells: ExactNumericCellChanges = {}
  setExactCell(exactCells, 'META', 'B5', effective.product.sellingPrice, effective.product.exactDecimalInputs?.sellingPrice)
  setExactCell(exactCells, 'META', 'B6', effective.product.sgaPercent, effective.product.exactDecimalInputs?.sgaPercent)
  effective.bom.forEach((item, index) => {
    const row = index + 4
    setExactCell(exactCells, 'BOM', `B${row}`, item.consumption, item.exactDecimalInputs?.consumption)
    setExactCell(exactCells, 'BOM', `D${row}`, item.price, item.exactDecimalInputs?.price)
    setExactCell(exactCells, 'BOM', `E${row}`, item.loss, item.exactDecimalInputs?.loss, true)
  })
  effective.rates.forEach((rate, index) => {
    const row = index + 4
    setExactCell(exactCells, 'WORK_CENTER', `B${row}`, rate.laborRate, rate.exactDecimalInputs?.laborRate)
    setExactCell(exactCells, 'WORK_CENTER', `C${row}`, rate.burdenRate, rate.exactDecimalInputs?.burdenRate)
  })
  effective.routing.forEach((step, index) => {
    const row = index + 4
    setExactCell(exactCells, 'ROUTING', `C${row}`, step.manning, step.exactDecimalInputs?.manning)
    setExactCell(exactCells, 'ROUTING', `D${row}`, step.capacity, step.exactDecimalInputs?.capacity)
    setExactCell(exactCells, 'ROUTING', `E${row}`, step.yield, step.exactDecimalInputs?.yield, true)
  })

  const buffer = await writeExcelJSBuffer(workbook)
  const exactBuffer = await writeExactNumericCells(buffer as Uint8Array, exactCells)
  return new Blob([exactBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
