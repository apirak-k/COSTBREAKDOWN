import {
  BOMItem,
  migratePairedModelToSnapshots,
  ProductMaster,
  RoutingStep,
  SnapshotPair,
  WorkCenterRate
} from '../core'

export const seedProductMaster: ProductMaster = {
  productCode: 'RGOM-024-01',
  productDescription: 'MEMBRANE SWITCH (AUTOMOTIVE DISPLAY)',
  uom: 'PC',
  customer: 'Cost declare 250331',
  effectiveDate: '2025-03-31'
}

export const seedWorkCenterRates: WorkCenterRate[] = [
  { wc: 'Cutting', description: 'Cutting', laborRate: 105.29, burdenRate: 138.48, effectiveDate: '2025-03-31', sourceRef: 'Cost declare 250331 row 17' },
  { wc: 'Printing-Digital RGOM', description: 'Printing-Digital RGOM', laborRate: 105.29, burdenRate: 97.69, effectiveDate: '2025-03-31', sourceRef: 'Cost declare 250331 row 18' },
  { wc: 'Assembly Digital RGOM', description: 'Assembly Digital RGOM', laborRate: 105.29, burdenRate: 90.93, effectiveDate: '2025-03-31', sourceRef: 'Cost declare 250331 row 19' },
  { wc: 'OQA-Digital', description: 'OQA-Digital', laborRate: 105.29, burdenRate: 82.74, effectiveDate: '2025-03-31', sourceRef: 'Cost declare 250331 row 20' }
]

export const seedBOM: BOMItem[] = [
  { id: 'bom-1', itemCode: 'RMMAA2590', description: 'CT75B/LUMIRROR 25T60 (0.525M x 500M/RL)', consumption: 0.027125, unit: 'SM', basePrice: 70.13217342857142, activePrice: 70.13217342857142, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 111' },
  { id: 'bom-2', itemCode: 'RMMBA1020', description: 'DOTITE XA-3645', consumption: 0.212500, unit: 'GM', basePrice: 31.6956068, activePrice: 60.1000000, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 112 & Price List row 122' },
  { id: 'bom-3', itemCode: 'RMMBA760', description: 'XC-3018 (1KG/CN)', consumption: 0.069400, unit: 'GM', basePrice: 1.7292561, activePrice: 1.7292561, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 113' },
  { id: 'bom-4', itemCode: 'RMMBA920', description: 'PAF-27F', consumption: 0.074700, unit: 'GM', basePrice: 29.8917150, activePrice: 29.8917150, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 114' },
  { id: 'bom-5', itemCode: 'RMMCD01B', description: 'P-THINNER', consumption: 0.002000, unit: 'GM', basePrice: 0.3092375, activePrice: 0.3092375, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 115' },
  { id: 'bom-6', itemCode: 'RMMCD140', description: 'SOLVENT PAF-100', consumption: 0.003100, unit: 'GM', basePrice: 0.8395770, activePrice: 0.8395770, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 116' },
  { id: 'bom-7', itemCode: 'RMMCD200', description: 'PTF-300 DILUENT', consumption: 0.055500, unit: 'GM', basePrice: 1.2136380, activePrice: 1.2136380, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 117 (Op 110+170)' },
  { id: 'bom-8', itemCode: 'RMMCD260', description: 'DOTITE SC-0030', consumption: 0.003400, unit: 'GM', basePrice: 0.3141853, activePrice: 0.3141853, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 118' },
  { id: 'bom-9', itemCode: 'RMMBB630', description: 'PTF-3201N', consumption: 1.152500, unit: 'GM', basePrice: 1.1949450, activePrice: 1.1949450, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 119 (Op 90+110+170)' },
  { id: 'bom-10', itemCode: 'RMMBB480', description: 'PTF-3101N', consumption: 0.025000, unit: 'GM', basePrice: 1.0793700, activePrice: 1.0793700, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 120' },
  { id: 'bom-11', itemCode: 'RMMLAA2650', description: 'TF100 100um', consumption: 0.001422, unit: 'SM', basePrice: 14.8357143, activePrice: 14.8357143, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 121' },
  { id: 'bom-12', itemCode: 'RMMLAA2630', description: 'PET75-Y210(10)K (0.5Mx500M)', consumption: 0.025416666666666664, unit: 'SM', basePrice: 44.2200000, activePrice: 44.2200000, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 122' },
  { id: 'bom-13', itemCode: 'RMMLEE225', description: 'BLANK LABEL B423 (9x8 mm)', consumption: 1.000000, unit: 'PC', basePrice: 0.1200000, activePrice: 0.1200000, baseLoss: 0.10, activeLoss: 0.10, sourceRef: 'Cost declare row 123' },
  { id: 'bom-14', itemCode: 'RMMLAA2640', description: 'PET White 75 Uncoated', consumption: 0.020625, unit: 'SM', basePrice: 43.2150000, activePrice: 43.2150000, baseLoss: 0.10, activeLoss: 0.10, sourceRef: 'Cost declare row 124' },
  { id: 'bom-15', itemCode: 'RMMLRA340', description: 'MAKE UP-A188-4X0.8L (STAMPING INK)', consumption: 0.014035, unit: 'GM', basePrice: 2.437171875, activePrice: 2.437171875, baseLoss: 0.10, activeLoss: 0.10, sourceRef: 'Cost declare row 125' },
  { id: 'bom-16', itemCode: 'RMMLRA360', description: 'INK-MB175-4X0.8L INKJET 2D BARCODE (NON-BOI)', consumption: 0.001780, unit: 'GM', basePrice: 9.80653125, activePrice: 9.80653125, baseLoss: 0.10, activeLoss: 0.10, sourceRef: 'Cost declare row 126' }
]

export const seedRouting: RoutingStep[] = [
  { id: 'rt-1', opSeq: 1, description: 'Cutting', wc: 'Cutting', manning: 1.0, baseCap: 6180, activeCap: 6180, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 28' },
  { id: 'rt-2', opSeq: 2, description: 'Annealing', wc: 'Cutting', manning: 1.0, baseCap: 2520, activeCap: 2520, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 29' },
  { id: 'rt-3', opSeq: 3, description: 'Re-anneal#1', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 2340, activeCap: 2340, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 30' },
  { id: 'rt-4', opSeq: 4, description: 'Cleaning M/C(Back side)', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 31' },
  { id: 'rt-5', opSeq: 5, description: 'Printing-BAg', wc: 'Printing-Digital RGOM', manning: 4.0, baseCap: 1884, activeCap: 1884, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 32' },
  { id: 'rt-6', opSeq: 6, description: 'Cleaning M/C(Back side)', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 33' },
  { id: 'rt-7', opSeq: 7, description: 'Printing-BC', wc: 'Printing-Digital RGOM', manning: 4.0, baseCap: 1944, activeCap: 1944, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 34' },
  { id: 'rt-8', opSeq: 8, description: 'Cleaning M/C(Back side)', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 35' },
  { id: 'rt-9', opSeq: 9, description: 'Printing-BUR1', wc: 'Printing-Digital RGOM', manning: 3.0, baseCap: 1836, activeCap: 1836, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 36' },
  { id: 'rt-10', opSeq: 10, description: 'Cleaning M/C(Back side)', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 37' },
  { id: 'rt-11', opSeq: 11, description: 'Printing-BUR2', wc: 'Printing-Digital RGOM', manning: 3.0, baseCap: 2004, activeCap: 2004, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 38' },
  { id: 'rt-12', opSeq: 12, description: 'Cleaning M/C(Back side)', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 39' },
  { id: 'rt-13', opSeq: 13, description: 'Re-anneal#2', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 3420, activeCap: 3420, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 40' },
  { id: 'rt-14', opSeq: 14, description: 'Cleaning M/C(Back side)', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 41' },
  { id: 'rt-15', opSeq: 15, description: 'Printing-BAg.J', wc: 'Printing-Digital RGOM', manning: 8.0, baseCap: 1572, activeCap: 1572, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 42' },
  { id: 'rt-16', opSeq: 16, description: 'Cleaning M/C(Back side)', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 43' },
  { id: 'rt-17', opSeq: 17, description: 'Printing-BOR', wc: 'Printing-Digital RGOM', manning: 2.0, baseCap: 2040, activeCap: 2040, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 44' },
  { id: 'rt-18', opSeq: 18, description: 'Cleaning M/C(Back side)', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 45' },
  { id: 'rt-19', opSeq: 19, description: 'Re-anneal#3', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 3420, activeCap: 3420, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 46' },
  { id: 'rt-20', opSeq: 20, description: 'Cleaning M/C(Back side)', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 47' },
  { id: 'rt-21', opSeq: 21, description: 'Laminate Carrier film', wc: 'Printing-Digital RGOM', manning: 8.0, baseCap: 2640, activeCap: 2640, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 48' },
  { id: 'rt-22', opSeq: 22, description: 'Re-anneal#4', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 5040, activeCap: 5040, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 49' },
  { id: 'rt-23', opSeq: 23, description: 'PET support: Cutting', wc: 'Cutting', manning: 1.0, baseCap: 14400, activeCap: 14400, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 52' },
  { id: 'rt-24', opSeq: 24, description: 'Packing sheet: Cutting', wc: 'Cutting', manning: 1.0, baseCap: 11200, activeCap: 11200, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 54' },
  { id: 'rt-25', opSeq: 25, description: 'Packing sheet: Half cut', wc: 'Assembly Digital RGOM', manning: 0.5, baseCap: 4800, activeCap: 4800, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 55' },
  { id: 'rt-26', opSeq: 26, description: 'Packing sheet: Blanking', wc: 'Assembly Digital RGOM', manning: 1.0, baseCap: 1894, activeCap: 1894, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 56' },
  { id: 'rt-27', opSeq: 27, description: 'Carrier Film: Cutting', wc: 'Cutting', manning: 1.0, baseCap: 8400, activeCap: 8400, baseYield: 0.064506, activeYield: 0.064506, sourceRef: 'Cost declare Row 58' },
  { id: 'rt-28', opSeq: 28, description: 'AI-Ins', wc: 'Assembly Digital RGOM', manning: 4.0, baseCap: 600, activeCap: 600, baseYield: 0.74, activeYield: 0.60, sourceRef: 'Cost declare Row 60 [Simulated Demo: Yield 60%]' },
  { id: 'rt-29', opSeq: 29, description: 'P-ins', wc: 'Assembly Digital RGOM', manning: 2.0, baseCap: 600, activeCap: 600, baseYield: 0.84, activeYield: 0.84, sourceRef: 'Cost declare Row 61' },
  { id: 'rt-30', opSeq: 30, description: 'VDO-ins I', wc: 'Assembly Digital RGOM', manning: 4.0, baseCap: 600, activeCap: 600, baseYield: 0.84, activeYield: 0.84, sourceRef: 'Cost declare Row 62' },
  { id: 'rt-31', opSeq: 31, description: 'Outline Blanking', wc: 'Assembly Digital RGOM', manning: 1.0, baseCap: 600, activeCap: 600, baseYield: 0.84, activeYield: 0.84, sourceRef: 'Cost declare Row 63' },
  { id: 'rt-32', opSeq: 32, description: 'Blanking-ins', wc: 'Assembly Digital RGOM', manning: 1.0, baseCap: 600, activeCap: 600, baseYield: 0.90, activeYield: 0.90, sourceRef: 'Cost declare Row 64' },
  { id: 'rt-33', opSeq: 33, description: 'E-ins I (Insulation)', wc: 'Assembly Digital RGOM', manning: 2.0, baseCap: 600, activeCap: 600, baseYield: 0.90, activeYield: 0.90, sourceRef: 'Cost declare Row 65' },
  { id: 'rt-34', opSeq: 34, description: 'E-ins II (Capacitive)', wc: 'Assembly Digital RGOM', manning: 4.0, baseCap: 600, activeCap: 600, baseYield: 0.90, activeYield: 0.90, sourceRef: 'Cost declare Row 66' },
  { id: 'rt-35', opSeq: 35, description: 'VDO-ins II (SN code & C peel off)', wc: 'Assembly Digital RGOM', manning: 1.0, baseCap: 600, activeCap: 600, baseYield: 0.90, activeYield: 0.90, sourceRef: 'Cost declare Row 67' },
  { id: 'rt-36', opSeq: 36, description: 'V-Ins', wc: 'Assembly Digital RGOM', manning: 2.0, baseCap: 600, activeCap: 600, baseYield: 0.90, activeYield: 0.90, sourceRef: 'Cost declare Row 68' },
  { id: 'rt-37', opSeq: 37, description: 'Support (Film puncher)', wc: 'Assembly Digital RGOM', manning: 1.0, baseCap: 480, activeCap: 480, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 72' },
  { id: 'rt-38', opSeq: 38, description: 'Support (Half cut)', wc: 'Assembly Digital RGOM', manning: 0.5, baseCap: 4800, activeCap: 4800, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 73' },
  { id: 'rt-39', opSeq: 39, description: 'QA & Packing (VDO-Ins 1/2, QA Ins, Packing carton, Leader)', wc: 'OQA-Digital', manning: 5.0, baseCap: 560, activeCap: 560, baseYield: 0.9975, activeYield: 0.9975, sourceRef: 'Cost declare Rows 74-79' }
]

/**
 * Deterministic Reference/Current fixture used by Reset Default and the
 * initial product session. The paired seed fields intentionally contain
 * visible price and yield variance for acceptance testing.
 */
export const seedSnapshotPair: SnapshotPair = migratePairedModelToSnapshots({
  id: 'ps-seed-rgom024',
  product: seedProductMaster,
  rates: seedWorkCenterRates,
  bom: seedBOM,
  routing: seedRouting,
  status: 'active',
  sourceRef: 'seed:rgom024'
})

export const emptyProductMaster: ProductMaster = {
  productCode: '',
  productDescription: '',
  uom: 'PC',
  note: '',
  customer: '',
  effectiveDate: ''
}

export function createEmptySnapshotPair(sessionId: string): SnapshotPair {
  return {
    reference: {
      id: `${sessionId}:reference`,
      product: { ...emptyProductMaster },
      effectiveDate: '',
      sourceRef: 'empty:reference',
      comparisonRole: 'reference',
      status: 'draft',
      rates: [],
      bom: [],
      routing: []
    },
    current: {
      id: `${sessionId}:current`,
      product: { ...emptyProductMaster },
      effectiveDate: '',
      sourceRef: 'empty:current',
      comparisonRole: 'current',
      status: 'draft',
      rates: [],
      bom: [],
      routing: []
    }
  }
}
