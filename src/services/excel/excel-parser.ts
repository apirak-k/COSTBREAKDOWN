import * as XLSX from 'xlsx'
import { ProductMaster, WorkCenterRate, BOMItem, RoutingStep, ExcelImportResult } from '../../core'

/**
 * Parses any Cost Model Excel workbook with dynamic header detection:
 *   1_MASTER_RATES      — Product Info + Work Center Rates
 *   2_BOM_BREAKDOWN     — BOM Items (Q, P0, P1, Loss0, Loss1, SourceRef)
 *   3_ROUTING_BREAKDOWN — Routing Steps (Manning, Cap0, Cap1, Y0, Y1, SourceRef)
 */
export async function parseExcelInputFile(file: File): Promise<ExcelImportResult> {
  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })

    const warnings: string[] = []

    // ── Detect workbook sheets ───────────────────────────────────────────────
    const hasRequiredSheets =
      workbook.SheetNames.some(s => s === '1_MASTER_RATES') &&
      workbook.SheetNames.some(s => s === '2_BOM_BREAKDOWN') &&
      workbook.SheetNames.some(s => s === '3_ROUTING_BREAKDOWN')

    if (!hasRequiredSheets) {
      return {
        success: false,
        message: 'Workbook format not recognized. Please upload a valid Cost Model file (requires sheets: 1_MASTER_RATES, 2_BOM_BREAKDOWN, 3_ROUTING_BREAKDOWN).'
      }
    }

    // ── Helper: read a sheet as 2D array ───────────────────────────────────
    function readSheet(name: string): (string | number | null)[][] {
      const ws = workbook.Sheets[name]
      if (!ws) return []
      return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as (string | number | null)[][]
    }

    function str(v: string | number | null | undefined): string {
      return v != null ? String(v).trim() : ''
    }

    function num(v: string | number | null | undefined): number {
      const n = parseFloat(str(v))
      return isNaN(n) ? 0 : n
    }

    // ── 1_MASTER_RATES ─────────────────────────────────────────────────────
    const masterRows = readSheet('1_MASTER_RATES')
    
    // Find Product Info header
    let prodHeaderIdx = -1
    for (let r = 0; r < masterRows.length; r++) {
      const rowStr = (masterRows[r] || []).map(str).join(' ').toLowerCase()
      if (rowStr.includes('product code') || rowStr.includes('product name')) {
        prodHeaderIdx = r
        break
      }
    }

    const prodDataRow = prodHeaderIdx >= 0 ? masterRows[prodHeaderIdx + 1] : masterRows[4]
    const product: ProductMaster = {
      productCode: str(prodDataRow?.[1]) || str(prodDataRow?.[0]) || 'RGOM-024-01',
      productDescription: str(prodDataRow?.[2]) || 'MEMBRANE SWITCH',
      uom: str(prodDataRow?.[3]) || 'PC',
      customer: str(prodDataRow?.[4]) || 'Cost declare 250331',
      effectiveDate: new Date().toISOString().split('T')[0]
    }

    // Find Rates header
    let ratesHeaderIdx = -1
    for (let r = (prodHeaderIdx >= 0 ? prodHeaderIdx + 2 : 5); r < masterRows.length; r++) {
      const rowStr = (masterRows[r] || []).map(str).join(' ').toLowerCase()
      if (rowStr.includes('labor rate') || rowStr.includes('burden rate') || rowStr.includes('department')) {
        ratesHeaderIdx = r
        break
      }
    }

    const rates: WorkCenterRate[] = []
    const startRatesIdx = ratesHeaderIdx >= 0 ? ratesHeaderIdx + 1 : 8
    for (let r = startRatesIdx; r < masterRows.length; r++) {
      const row = masterRows[r]
      if (!row) continue
      const dept = str(row[0])
      if (!dept || dept.toLowerCase().includes('table') || dept.toLowerCase().includes('total') || dept.toLowerCase().includes('note')) break
      
      const labor = num(row[1])
      const burden = num(row[2])
      const effDate = str(row[3]) || product.effectiveDate
      const sourceRef = str(row[4]) || 'Cost declare 250331'
      if (dept && (labor > 0 || burden > 0)) {
        rates.push({
          id: `rate-${rates.length + 1}`,
          wc: dept,
          description: dept,
          laborRate: labor,
          burdenRate: burden,
          effectiveDate: effDate,
          sourceRef
        })
      }
    }

    if (rates.length === 0) {
      warnings.push('No Work Center Rates found in 1_MASTER_RATES.')
    }

    // ── 2_BOM_BREAKDOWN ────────────────────────────────────────────────────
    const bomRows = readSheet('2_BOM_BREAKDOWN')
    const bom: BOMItem[] = []

    let bomHeaderIdx = -1
    for (let r = 0; r < Math.min(10, bomRows.length); r++) {
      const rowStr = (bomRows[r] || []).map(str).join(' ').toLowerCase()
      if (rowStr.includes('material code') || rowStr.includes('item no')) {
        bomHeaderIdx = r
        break
      }
    }

    const startBomIdx = bomHeaderIdx >= 0 ? bomHeaderIdx + 1 : 4
    for (let r = startBomIdx; r < bomRows.length; r++) {
      const row = bomRows[r]
      if (!row) continue
      const firstCol = str(row[0])
      const code = str(row[1])
      const desc = str(row[2])

      // Stop condition
      if (
        firstCol.toLowerCase() === 'total' ||
        firstCol.includes('Table 2') ||
        code.includes('Table 2') ||
        desc.includes('Table 2') ||
        firstCol.includes('CALCULATION') ||
        code.includes('CALCULATION') ||
        firstCol.includes('COST')
      ) {
        break
      }

      const q    = num(row[3])
      const uom  = str(row[4]) || 'PC'
      const p0   = num(row[5])
      const p1   = num(row[6])
      let   l0   = num(row[7])
      let   l1   = num(row[8])
      const ref  = str(row[9])

      if (!code && !desc && q === 0 && p0 === 0 && p1 === 0) continue

      if (l0 > 1) l0 = l0 / 100
      if (l1 > 1) l1 = l1 / 100

      bom.push({
        id: `bom-${bom.length + 1}`,
        itemCode: code || `MAT-${bom.length + 1}`,
        description: desc || code || `Material ${bom.length + 1}`,
        consumption: q,
        unit: uom,
        basePrice: p0,
        activePrice: p1 > 0 ? p1 : p0,
        baseLoss: l0,
        activeLoss: l1 > 0 ? l1 : l0,
        sourceRef: ref || 'Cost declare row 111'
      })
    }

    if (bom.length === 0) {
      warnings.push('No BOM items found in 2_BOM_BREAKDOWN.')
    }

    // ── 3_ROUTING_BREAKDOWN ────────────────────────────────────────────────
    const routingRows = readSheet('3_ROUTING_BREAKDOWN')
    const routing: RoutingStep[] = []

    let rtHeaderIdx = -1
    for (let r = 0; r < Math.min(10, routingRows.length); r++) {
      const rowStr = (routingRows[r] || []).map(str).join(' ').toLowerCase()
      if (rowStr.includes('operation description') || rowStr.includes('process name') || (rowStr.includes('seq') && rowStr.includes('manning'))) {
        rtHeaderIdx = r
        break
      }
    }

    const startRtIdx = rtHeaderIdx >= 0 ? rtHeaderIdx + 1 : 4
    for (let r = startRtIdx; r < routingRows.length; r++) {
      const row = routingRows[r]
      if (!row) continue
      const firstCol = str(row[0])
      const section = str(row[1])
      const name = str(row[2])

      // Stop condition
      if (
        firstCol.toLowerCase() === 'total' ||
        firstCol.includes('Table 2') ||
        section.includes('Table 2') ||
        name.includes('Table 2') ||
        firstCol.includes('CALCULATION') ||
        section.includes('CALCULATION') ||
        firstCol.includes('CONVERSION') ||
        section.includes('CONVERSION') ||
        name.includes('CONVERSION')
      ) {
        break
      }

      const seq   = num(row[0]) || (routing.length + 1)
      const dept  = str(row[3])
      const man   = num(row[4]) || 1
      const cap0  = num(row[5])
      const cap1  = num(row[6])
      let   y0    = num(row[7])
      let   y1    = num(row[8])
      const ref   = str(row[9])

      if (!name && !dept && cap0 === 0 && cap1 === 0) continue

      if (y0 > 1) y0 = y0 / 100
      if (y1 > 1) y1 = y1 / 100

      if (y0 === 0) y0 = 1.0
      if (y1 === 0) y1 = (y0 > 0 ? y0 : 1.0)

      routing.push({
        id: `rt-${routing.length + 1}`,
        opSeq: seq,
        description: name || `Operation ${seq}`,
        wc: dept || (rates[0]?.wc ?? 'Cutting'),
        manning: man,
        baseCap: cap0,
        activeCap: cap1 > 0 ? cap1 : cap0,
        baseYield: y0,
        activeYield: y1 > 0 ? y1 : y0,
        sourceRef: ref || 'Cost declare Row 28'
      })
    }

    if (routing.length === 0) {
      warnings.push('No Routing steps found in 3_ROUTING_BREAKDOWN.')
    }

    return {
      success: true,
      message: `Imported successfully: ${rates.length} Work Centers, ${bom.length} BOM Items, ${routing.length} Routing Steps.`,
      warnings,
      product,
      rates,
      bom,
      routing
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `Failed to parse Excel file: ${errorMsg}`
    }
  }
}
