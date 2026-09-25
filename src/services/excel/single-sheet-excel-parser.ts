import ExcelJS from 'exceljs'
import { WorkingDataset, normalizeDataset, StandardWCItem, StandardRoutingItem, StandardBOMItem } from '../../core/types/dataset-standard.types'

export async function parseSingleSheetDatasetExcel(file: File | ArrayBuffer): Promise<WorkingDataset> {
  const workbook = new ExcelJS.Workbook()
  const buffer = file instanceof File ? await file.arrayBuffer() : file
  await workbook.xlsx.load(buffer)

  const sheet = workbook.getWorksheet('Dataset') || workbook.worksheets[0]
  if (!sheet) {
    throw new Error('No valid worksheet found in dataset Excel file.')
  }

  const rawMetadata: Partial<WorkingDataset['metadata']> = {}
  const rawWC: Partial<StandardWCItem>[] = []
  const rawRouting: Partial<StandardRoutingItem>[] = []
  const rawBOM: Partial<StandardBOMItem>[] = []

  let currentSection: 'NONE' | 'META' | 'WC' | 'ROUTING' | 'BOM' | 'SUMMARY' = 'NONE'

  sheet.eachRow((row) => {
    const firstCellVal = String(row.getCell(1).value || '').trim()

    if (firstCellVal.includes('1. METADATA')) {
      currentSection = 'META'
      return
    } else if (firstCellVal.includes('2. WORK CENTER')) {
      currentSection = 'WC'
      return
    } else if (firstCellVal.includes('3. ROUTING')) {
      currentSection = 'ROUTING'
      return
    } else if (firstCellVal.includes('4. BILL OF MATERIALS')) {
      currentSection = 'BOM'
      return
    } else if (firstCellVal.includes('5. COST SUMMARY')) {
      currentSection = 'SUMMARY'
      return
    }

    if (currentSection === 'META') {
      const key = firstCellVal.toLowerCase()
      const val = String(row.getCell(2).value || '').trim()
      if (key.includes('product code')) rawMetadata.productCode = val
      else if (key.includes('product name')) rawMetadata.productName = val
      else if (key.includes('uom')) rawMetadata.uom = val
      else if (key.includes('remark')) rawMetadata.remark = val
    } else if (currentSection === 'WC') {
      if (firstCellVal && firstCellVal !== 'Process' && !firstCellVal.startsWith('2.')) {
        rawWC.push({
          process: firstCellVal,
          labor: parseNumeric(row.getCell(2).value),
          burden: parseNumeric(row.getCell(3).value),
          sourceReference: String(row.getCell(4).value || '').trim() || undefined
        })
      }
    } else if (currentSection === 'ROUTING') {
      if (firstCellVal && firstCellVal !== 'Process' && !firstCellVal.includes('Total') && !firstCellVal.startsWith('3.')) {
        rawRouting.push({
          process: firstCellVal,
          capacity: parseNumeric(row.getCell(2).value),
          number: parseNumeric(row.getCell(3).value),
          yieldRatio: parseNumeric(row.getCell(4).value),
          sourceReference: String(row.getCell(5).value || '').trim() || undefined
        })
      }
    } else if (currentSection === 'BOM') {
      if (firstCellVal && firstCellVal !== 'Code' && !firstCellVal.includes('Total') && !firstCellVal.startsWith('4.')) {
        rawBOM.push({
          code: firstCellVal,
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
