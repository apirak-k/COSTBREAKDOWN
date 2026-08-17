import * as XLSX from 'xlsx'
import { ProductMaster, WorkCenterRate, BOMItem, RoutingStep, ExcelImportResult } from './types'

/**
 * Parses a v2 Cost Model Excel workbook with the following sheet structure:
 *   1_MASTER_RATES  — Product Info (Row 5) + Work Center Rates (Rows 9–12)
 *   2_BOM_BREAKDOWN — BOM Input rows starting at Row 5 (A=No, B=Code, C=Desc, D=Q, E=UOM, F=P0, G=P1, H=Loss0, I=Loss1, J=Ref)
 *   3_ROUTING_BREAKDOWN — Routing Input rows starting at Row 5 (A=Seq, B=Section, C=Name, D=Dept, E=Manning, F=Cap0, G=Cap1, H=Y0, I=Y1, J=Ref)
 */
export async function parseExcelInputFile(file: File): Promise<ExcelImportResult> {
  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })

    const warnings: string[] = []

    // ── Detect workbook version ─────────────────────────────────────────────
    const hasV2Sheets =
      workbook.SheetNames.some(s => s === '1_MASTER_RATES') &&
      workbook.SheetNames.some(s => s === '2_BOM_BREAKDOWN') &&
      workbook.SheetNames.some(s => s === '3_ROUTING_BREAKDOWN')

    if (!hasV2Sheets) {
      return {
        success: false,
        message: 'Workbook format not recognized. Please upload a v2 Cost Model file (requires sheets: 1_MASTER_RATES, 2_BOM_BREAKDOWN, 3_ROUTING_BREAKDOWN).'
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
    // Row 5 (index 4): A5=ProductCode, B5=UOM, C5=Description, D5=CustomerRef, E5=BatchRef
    // Rows 9–12 (index 8–11): A=DeptName, B=LaborRate, C=BurdenRate, D=EffDate, E=SourceRef
    const masterRows = readSheet('1_MASTER_RATES')

    const product: ProductMaster = {
      productCode: str(masterRows[4]?.[0]) || 'IMPORTED',
      productDescription: str(masterRows[4]?.[2]) || 'Imported Cost Breakdown Model',
      uom: str(masterRows[4]?.[1]) || 'PC',
      customer: str(masterRows[4]?.[3]) || '',
      effectiveDate: str(masterRows[4]?.[4]) || new Date().toISOString().split('T')[0]
    }

    const rates: WorkCenterRate[] = []
    for (let r = 8; r <= 11; r++) {
      const row = masterRows[r]
      if (!row) continue
      const dept = str(row[0])
      const labor = num(row[1])
      const burden = num(row[2])
      const effDate = str(row[3]) || product.effectiveDate
      const sourceRef = str(row[4]) || 'Master Rates Sheet'
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
      warnings.push('No Work Center Rates found in 1_MASTER_RATES (Rows 9–12). Using default rates.')
    }

    // ── 2_BOM_BREAKDOWN ────────────────────────────────────────────────────
    // Rows 5–20 (index 4–19): A=No, B=Code, C=Desc, D=Q, E=UOM, F=P0, G=P1, H=Loss0, I=Loss1, J=Ref
    const bomRows = readSheet('2_BOM_BREAKDOWN')
    const bom: BOMItem[] = []

    for (let r = 4; r <= 19; r++) {
      const row = bomRows[r]
      if (!row) continue
      const code = str(row[1])
      const desc = str(row[2])
      const q    = num(row[3])
      const uom  = str(row[4]) || 'PC'
      const p0   = num(row[5])
      const p1   = num(row[6])
      let   l0   = num(row[7])
      let   l1   = num(row[8])
      const ref  = str(row[9])

      // Skip completely empty rows
      if (!code && !desc && q === 0 && p0 === 0 && p1 === 0) continue

      // Normalize loss % if stored as whole number (e.g., 30 → 0.30)
      if (l0 > 1) l0 = l0 / 100
      if (l1 > 1) l1 = l1 / 100

      bom.push({
        id: `bom-${bom.length + 1}`,
        itemCode: code || `MAT-${bom.length + 1}`,
        description: desc || code || `Material ${bom.length + 1}`,
        consumption: q,
        unit: uom,
        basePrice: p0,
        activePrice: p1,
        baseLoss: l0,
        activeLoss: l1,
        sourceRef: ref || 'BOM Sheet'
      })
    }

    if (bom.length === 0) {
      warnings.push('No BOM items found in 2_BOM_BREAKDOWN (Rows 5–20). Tables will be empty.')
    }

    // ── 3_ROUTING_BREAKDOWN ────────────────────────────────────────────────
    // Rows 5–43 (index 4–42): A=Seq, B=Section, C=Name, D=Dept(WC), E=Manning, F=Cap0, G=Cap1, H=Y0, I=Y1, J=Ref
    const routingRows = readSheet('3_ROUTING_BREAKDOWN')
    const routing: RoutingStep[] = []

    for (let r = 4; r <= 42; r++) {
      const row = routingRows[r]
      if (!row) continue
      const seq   = num(row[0]) || (routing.length + 1)
      const name  = str(row[2])
      const dept  = str(row[3])
      const man   = num(row[4]) || 1
      const cap0  = num(row[5])
      const cap1  = num(row[6])
      let   y0    = num(row[7])
      let   y1    = num(row[8])
      const ref   = str(row[9])

      // Skip completely empty rows
      if (!name && !dept && cap0 === 0 && cap1 === 0) continue

      // Normalize yield % if stored as whole number (e.g., 95 → 0.95)
      if (y0 > 1) y0 = y0 / 100
      if (y1 > 1) y1 = y1 / 100

      // Default yield to 1.0 if not set
      if (y0 === 0) y0 = 1.0
      if (y1 === 0) y1 = 1.0

      routing.push({
        id: `rt-${routing.length + 1}`,
        opSeq: seq,
        description: name || `Operation ${seq}`,
        wc: dept || (rates[0]?.wc ?? 'WC01'),
        manning: man,
        baseCap: cap0 || 1000,
        activeCap: cap1 || 1000,
        baseYield: y0,
        activeYield: y1,
        sourceRef: ref || 'Routing Sheet'
      })
    }

    if (routing.length === 0) {
      warnings.push('No Routing steps found in 3_ROUTING_BREAKDOWN (Rows 5–43). Tables will be empty.')
    }

    return {
      success: true,
      message: `Import successful: ${bom.length} BOM items, ${routing.length} Routing steps, ${rates.length} Work Center Rates.`,
      product,
      rates: rates.length > 0 ? rates : undefined,
      bom: bom.length > 0 ? bom : undefined,
      routing: routing.length > 0 ? routing : undefined,
      warnings
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to parse Excel file: ${err?.message ?? 'Unknown parsing error'}`
    }
  }
}
