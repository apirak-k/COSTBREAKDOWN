import { DynamicTemplateOptions } from '../../core'
import { loadExcelJS } from './exceljs-runtime'
import { addMasterDataWorkbook } from './master-data-workbook'

export async function generateDynamicExcelTemplate(options: DynamicTemplateOptions): Promise<Blob> {
  const ExcelJS = await loadExcelJS()
  const { product, snapshot } = options
  const startingRows = {
    workCenters: Math.max(1, Math.floor(options.wcCount ?? snapshot?.rates.length ?? 4)),
    bom: Math.max(1, Math.floor(options.bomCount ?? snapshot?.bom.length ?? 16)),
    routing: Math.max(1, Math.floor(options.routingCount ?? snapshot?.routing.length ?? 10))
  }
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Cost Breakdown Analysis Platform'
  workbook.created = new Date()
  addMasterDataWorkbook(workbook, {
    product,
    remark: snapshot?.remark,
    rows: { bom: [], workCenters: [], routing: [] },
    startingRows
  })
  workbook.calcProperties = { fullCalcOnLoad: true }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
