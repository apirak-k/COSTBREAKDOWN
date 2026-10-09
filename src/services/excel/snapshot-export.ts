import { CostSnapshot } from '../../core'
import { loadExcelJS } from './exceljs-runtime'
import { addMasterDataWorkbook } from './master-data-workbook'
import { normalizeMasterDataSnapshot } from '../../core/utils/master-data-effective'

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

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
