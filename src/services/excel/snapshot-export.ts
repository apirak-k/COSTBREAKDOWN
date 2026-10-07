import { CostSnapshot } from '../../core'
import { loadExcelJS } from './exceljs-runtime'
import { addMasterDataWorkbook } from './master-data-workbook'

export async function exportSnapshotToExcel(snapshot: CostSnapshot): Promise<Blob> {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cost Breakdown Analysis Platform'
  workbook.created = new Date()

  addMasterDataWorkbook(workbook, {
    product: snapshot.product,
    remark: snapshot.remark,
    rows: {
      bom: snapshot.bom.map(item => [
        item.description || item.itemCode, item.consumption, item.unit, item.price, item.loss, item.note || ''
      ]),
      workCenters: snapshot.rates.map(rate => [
        rate.workCenterCode, rate.laborRate, rate.burdenRate, rate.note || ''
      ]),
      routing: snapshot.routing.map(step => [
        step.processName, step.workCenterId || '', step.manning, step.capacity, step.yield, step.note || ''
      ])
    }
  })
  workbook.calcProperties = { fullCalcOnLoad: true }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
