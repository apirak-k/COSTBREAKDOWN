import * as XLSX from 'xlsx'
import { ProductMaster, WorkCenterRate, BOMItem, RoutingStep, ExcelImportResult } from './types'

export async function parseExcelInputFile(file: File): Promise<ExcelImportResult> {
  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })

    // Find input sheet (default to '1_INPUT_DATA' or first sheet)
    const sheetName = workbook.SheetNames.find(s => s.includes('INPUT') || s.includes('1_')) || workbook.SheetNames[0]
    if (!sheetName) {
      return { success: false, message: 'No valid sheets found in the uploaded workbook.' }
    }

    const worksheet = workbook.Sheets[sheetName]
    const rows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    if (!rows || rows.length < 5) {
      return { success: false, message: 'The selected sheet contains insufficient data rows.' }
    }

    // Default structure containers
    let product: ProductMaster = {
      productCode: 'IMPORTED-ITEM',
      productDescription: 'Imported Cost Breakdown Model',
      uom: 'PC',
      customer: 'Custom Manufacturing',
      effectiveDate: new Date().toISOString().split('T')[0]
    }
    const rates: WorkCenterRate[] = []
    const bom: BOMItem[] = []
    const routing: RoutingStep[] = []
    const warnings: string[] = []

    let currentSection: 'NONE' | 'RATES' | 'BOM' | 'ROUTING' = 'NONE'

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]
      if (!row || row.length === 0) continue

      const firstCell = String(row[0] || '').trim()
      const secondCell = String(row[1] || '').trim()

      // 1. Detect Product Info
      if (firstCell.includes('Product Code:') || secondCell.includes('Product Code:')) {
        const val = String(row[2] || row[3] || '').trim()
        if (val) product.productCode = val
      }
      if (firstCell.includes('Product Description:') || secondCell.includes('Product Description:')) {
        const val = String(row[2] || row[3] || '').trim()
        if (val) product.productDescription = val
      }
      if (firstCell.includes('UOM:') || secondCell.includes('UOM:')) {
        const val = String(row[2] || row[3] || '').trim()
        if (val) product.uom = val
      }
      if (firstCell.includes('Customer') || secondCell.includes('Customer')) {
        const val = String(row[2] || row[3] || '').trim()
        if (val) product.customer = val
      }

      // 2. Section Header Detection
      if (firstCell.includes('SECTION B:') || firstCell.includes('Work Center Rates')) {
        currentSection = 'RATES'
        continue
      }
      if (firstCell.includes('SECTION C:') || firstCell.includes('BOM') || firstCell.includes('Bill of Materials')) {
        currentSection = 'BOM'
        continue
      }
      if (firstCell.includes('SECTION D:') || firstCell.includes('Routing') || firstCell.includes('Process Routing')) {
        currentSection = 'ROUTING'
        continue
      }

      // Skip Table Header rows
      if (firstCell.includes('Item Code') || firstCell.includes('WC') || firstCell.includes('Op #') || firstCell.includes('Seq')) {
        continue
      }

      // Parse Section Rows
      if (currentSection === 'RATES') {
        const wc = String(row[0] || '').trim()
        const desc = String(row[1] || '').trim()
        const laborRate = parseFloat(String(row[2] || '0'))
        const burdenRate = parseFloat(String(row[3] || '0'))
        const effDate = String(row[4] || product.effectiveDate).trim()
        const sourceRef = String(row[5] || 'Finance Rate Table').trim()

        if (wc && (laborRate > 0 || burdenRate > 0 || desc)) {
          rates.push({
            id: `rate-${rates.length + 1}`,
            wc,
            description: desc,
            laborRate: isNaN(laborRate) ? 0 : laborRate,
            burdenRate: isNaN(burdenRate) ? 0 : burdenRate,
            effectiveDate: effDate,
            sourceRef
          })
        }
      } else if (currentSection === 'BOM') {
        const itemCode = String(row[0] || '').trim()
        const desc = String(row[1] || '').trim()
        const consumption = parseFloat(String(row[2] || '0'))
        const unit = String(row[3] || 'PC').trim()
        const basePrice = parseFloat(String(row[4] || '0'))
        const activePrice = parseFloat(String(row[5] || '0'))
        let baseLoss = parseFloat(String(row[6] || '0'))
        let activeLoss = parseFloat(String(row[7] || '0'))
        const sourceRef = String(row[8] || 'Price List').trim()

        // Normalize percentage if given as > 1 (e.g., 30 instead of 0.30)
        if (baseLoss > 1) baseLoss = baseLoss / 100
        if (activeLoss > 1) activeLoss = activeLoss / 100

        if (itemCode && (consumption > 0 || activePrice > 0 || desc)) {
          bom.push({
            id: `bom-${bom.length + 1}`,
            itemCode,
            description: desc || itemCode,
            consumption: isNaN(consumption) ? 0 : consumption,
            unit,
            basePrice: isNaN(basePrice) ? 0 : basePrice,
            activePrice: isNaN(activePrice) ? 0 : activePrice,
            baseLoss: isNaN(baseLoss) ? 0 : baseLoss,
            activeLoss: isNaN(activeLoss) ? 0 : activeLoss,
            sourceRef
          })
        }
      } else if (currentSection === 'ROUTING') {
        const opRaw = String(row[0] || '').replace(/[^0-9]/g, '')
        const opSeq = parseInt(opRaw, 10) || (routing.length + 1) * 10
        const desc = String(row[1] || '').trim()
        const wc = String(row[2] || '').trim()
        const manning = parseFloat(String(row[3] || '1'))
        const baseCap = parseFloat(String(row[4] || '1000'))
        const activeCap = parseFloat(String(row[5] || '1000'))
        let baseYield = parseFloat(String(row[6] || '1.0'))
        let activeYield = parseFloat(String(row[7] || '1.0'))
        const sourceRef = String(row[8] || 'Routing Log').trim()

        if (baseYield > 1) baseYield = baseYield / 100
        if (activeYield > 1) activeYield = activeYield / 100

        if (desc || wc) {
          routing.push({
            id: `rt-${routing.length + 1}`,
            opSeq,
            description: desc || `Operation ${opSeq}`,
            wc: wc || 'WC01',
            manning: isNaN(manning) ? 1 : manning,
            baseCap: isNaN(baseCap) ? 1000 : baseCap,
            activeCap: isNaN(activeCap) ? 1000 : activeCap,
            baseYield: isNaN(baseYield) ? 1 : baseYield,
            activeYield: isNaN(activeYield) ? 1 : activeYield,
            sourceRef
          })
        }
      }
    }

    if (bom.length === 0 && routing.length === 0) {
      warnings.push('No BOM or Routing rows could be detected in the standard layout. Initialized with empty tables.')
    }

    return {
      success: true,
      message: `Parsed successfully: ${bom.length} BOM items, ${routing.length} Routing operations, and ${rates.length} Work Center Rates.`,
      product,
      rates: rates.length > 0 ? rates : undefined,
      bom: bom.length > 0 ? bom : undefined,
      routing: routing.length > 0 ? routing : undefined,
      warnings
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to parse Excel file: ${err?.message || 'Unknown parsing error'}`
    }
  }
}
