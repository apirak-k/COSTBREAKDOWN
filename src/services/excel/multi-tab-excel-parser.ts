import ExcelJS from 'exceljs'
import { WorkingDataset, normalizeDataset, StandardWCItem, StandardRoutingItem, StandardBOMItem } from '../../core/types/dataset-standard.types'

export async function parseMultiTabDatasetExcel(file: File | ArrayBuffer): Promise<WorkingDataset> {
  const workbook = new ExcelJS.Workbook()
  const buffer = file instanceof File ? await file.arrayBuffer() : file
  await workbook.xlsx.load(buffer)

  const rawMetadata: Partial<WorkingDataset['metadata']> = {}
  const rawWC: Partial<StandardWCItem>[] = []
  const rawRouting: Partial<StandardRoutingItem>[] = []
  const rawBOM: Partial<StandardBOMItem>[] = []

  // 1. Read SUMMARY_META
  const metaSheet = workbook.getWorksheet('SUMMARY_META') || workbook.worksheets[0]
  if (metaSheet) {
    metaSheet.eachRow(row => {
      const label = String(row.getCell(1).value || '').trim().toLowerCase()
      const val = String(row.getCell(2).value || '').trim()
      if (label.includes('product code')) rawMetadata.productCode = val
      else if (label.includes('product name')) rawMetadata.productName = val
      else if (label.includes('uom')) rawMetadata.uom = val
      else if (label.includes('remark')) rawMetadata.remark = val
    })
  }

  // 2. Read WORK_CENTER
  const wcSheet = workbook.getWorksheet('WORK_CENTER')
  if (wcSheet) {
    wcSheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 5) {
        const process = String(row.getCell(1).value || '').trim()
        if (process) {
          rawWC.push({
            process,
            labor: parseNumeric(row.getCell(2).value),
            burden: parseNumeric(row.getCell(3).value),
            sourceReference: String(row.getCell(4).value || '').trim() || undefined
          })
        }
      }
    })
  }

  // 3. Read ROUTING
  const routingSheet = workbook.getWorksheet('ROUTING')
  if (routingSheet) {
    routingSheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 5) {
        const process = String(row.getCell(1).value || '').trim()
        if (process && !process.includes('Total')) {
          rawRouting.push({
            process,
            capacity: parseNumeric(row.getCell(2).value),
            number: parseNumeric(row.getCell(3).value),
            yieldRatio: parseNumeric(row.getCell(4).value),
            sourceReference: String(row.getCell(5).value || '').trim() || undefined
          })
        }
      }
    })
  }

  // 4. Read BOM
  const bomSheet = workbook.getWorksheet('BOM')
  if (bomSheet) {
    bomSheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 5) {
        const code = String(row.getCell(1).value || '').trim()
        if (code && !code.includes('Total')) {
          rawBOM.push({
            code,
            materialName: String(row.getCell(2).value || '').trim(),
            lossRatio: parseNumeric(row.getCell(3).value),
            consumption: parseNumeric(row.getCell(4).value),
            unit: String(row.getCell(5).value || '').trim(),
            price: parseNumeric(row.getCell(6).value),
            sourceReference: String(row.getCell(7).value || '').trim() || undefined
          })
        }
      }
    })
  }

  return normalizeDataset({
    metadata: {
      productCode: rawMetadata.productCode || '',
      productName: rawMetadata.productName || '',
      uom: rawMetadata.uom || '',
      remark: rawMetadata.remark
    },
    wc: rawWC as StandardWCItem[],
    routing: rawRouting as StandardRoutingItem[],
    bom: rawBOM as StandardBOMItem[]
  })
}

function parseNumeric(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return isNaN(val) ? null : val
  if (typeof val === 'object' && val !== null && 'result' in val) {
    const res = (val as { result: unknown }).result
    return parseNumeric(res)
  }
  const str = String(val).replace(/,/g, '').replace(/%/g, '').trim()
  const num = Number(str)
  if (isNaN(num)) return null
  return String(val).includes('%') ? num / 100 : num
}
