import { ProductMaster, WorkCenterRate, BOMItem, RoutingStep } from './types'

export const seedProductMaster: ProductMaster = {
  productCode: 'RGOM-024',
  productDescription: 'Automotive Touch & Display Switch Panel (RGOM-024)',
  uom: 'PC',
  customer: 'Automotive Digital Cluster',
  effectiveDate: '2026-07-01'
}

export const seedWorkCenterRates: WorkCenterRate[] = [
  { wc: 'Cutting', description: 'Cutting', laborRate: 105.29, burdenRate: 138.48, effectiveDate: '2025-03-31', sourceRef: 'Cost declare 250331 row 17' },
  { wc: 'Printing-Digital RGOM', description: 'Printing-Digital RGOM', laborRate: 105.29, burdenRate: 97.69, effectiveDate: '2025-03-31', sourceRef: 'Cost declare 250331 row 18' },
  { wc: 'Assembly Digital RGOM', description: 'Assembly Digital RGOM', laborRate: 105.29, burdenRate: 90.93, effectiveDate: '2025-03-31', sourceRef: 'Cost declare 250331 row 19' },
  { wc: 'OQA-Digital', description: 'OQA-Digital', laborRate: 105.29, burdenRate: 82.74, effectiveDate: '2025-03-31', sourceRef: 'Cost declare 250331 row 20' }
]

export const seedBOM: BOMItem[] = [
  { id: '1', itemCode: 'RMMAA2590', description: 'CT75B/LUMIRROR 25T60 (0.525M x 500M/RL)', consumption: 0.027125, unit: 'SM', basePrice: 70.13217342857142, activePrice: 70.13217342857142, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 111' },
  { id: '2', itemCode: 'RMMBA1020', description: 'DOTITE XA-3645 Conductive Silver Paste', consumption: 0.212500, unit: 'GM', basePrice: 31.6956068, activePrice: 60.1000000, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 112 & Price List row 122' },
  { id: '3', itemCode: 'RMMBA760', description: 'XC-3018 Carbon Paste (1KG/CN)', consumption: 0.069400, unit: 'GM', basePrice: 1.7292561, activePrice: 1.7292561, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 113' },
  { id: '4', itemCode: 'RMMBA920', description: 'PAF-27F Insulating Paste', consumption: 0.074700, unit: 'GM', basePrice: 29.8917150, activePrice: 29.8917150, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 114' },
  { id: '5', itemCode: 'RMMCD01B', description: 'P-THINNER Diluent', consumption: 0.002000, unit: 'GM', basePrice: 0.3092375, activePrice: 0.3092375, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 115' },
  { id: '6', itemCode: 'RMMCD140', description: 'SOLVENT PAF-100', consumption: 0.003100, unit: 'GM', basePrice: 0.8395770, activePrice: 0.8395770, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 116' },
  { id: '7', itemCode: 'RMMCD200', description: 'PTF-300 DILUENT', consumption: 0.055500, unit: 'GM', basePrice: 1.2136380, activePrice: 1.2136380, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 117 (Op 110+170)' },
  { id: '8', itemCode: 'RMMCD260', description: 'DOTITE SC-0030', consumption: 0.003400, unit: 'GM', basePrice: 0.3141853, activePrice: 0.3141853, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 118' },
  { id: '9', itemCode: 'RMMBB630', description: 'PTF-3201N UV Dielectric Paste', consumption: 1.152500, unit: 'GM', basePrice: 1.1949450, activePrice: 1.1949450, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 119 (Op 90+110+170)' },
  { id: '10', itemCode: 'RMMBB480', description: 'PTF-3101N Overcoat Paste', consumption: 0.025000, unit: 'GM', basePrice: 1.0793700, activePrice: 1.0793700, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 120' },
  { id: '11', itemCode: 'RMMLAA2650', description: 'TF100 100um Adhesive Spacer', consumption: 0.001422, unit: 'SM', basePrice: 14.8357143, activePrice: 14.8357143, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 121' },
  { id: '12', itemCode: 'RMMLAA2630', description: 'PET75-Y210(10)K (0.5Mx500M)', consumption: 0.02541667, unit: 'SM', basePrice: 44.2200000, activePrice: 44.2200000, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Cost declare row 122' },
  { id: '13', itemCode: 'RMMLEE225', description: 'BLANK LABEL B423 (9x8 mm)', consumption: 1.000000, unit: 'PC', basePrice: 0.1200000, activePrice: 0.1200000, baseLoss: 0.10, activeLoss: 0.10, sourceRef: 'Cost declare row 123' },
  { id: '14', itemCode: 'RMMLAA2640', description: 'PET White 75 Uncoated Film', consumption: 0.020625, unit: 'SM', basePrice: 43.2150000, activePrice: 43.2150000, baseLoss: 0.10, activeLoss: 0.10, sourceRef: 'Cost declare row 124' },
  { id: '15', itemCode: 'RMMLRA340', description: 'MAKE UP-A188-4X0.8L (STAMPING INK)', consumption: 0.014035, unit: 'GM', basePrice: 2.437171875, activePrice: 2.437171875, baseLoss: 0.10, activeLoss: 0.10, sourceRef: 'Cost declare row 125' },
  { id: '16', itemCode: 'RMMLRA360', description: 'INK-MB175-4X0.8L INKJET 2D BARCODE', consumption: 0.001780, unit: 'GM', basePrice: 9.80653125, activePrice: 9.80653125, baseLoss: 0.10, activeLoss: 0.10, sourceRef: 'Cost declare row 126' }
]

export const seedRouting: RoutingStep[] = [
  // PRINTING Line (22 steps)
  { id: '1', opSeq: 1, description: 'Cutting', wc: 'Cutting', manning: 1.0, baseCap: 6180, activeCap: 6180, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 28' },
  { id: '2', opSeq: 2, description: 'Annealing', wc: 'Cutting', manning: 1.0, baseCap: 2520, activeCap: 2520, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 29' },
  { id: '3', opSeq: 3, description: 'Re-anneal#1', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 2340, activeCap: 2340, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 30' },
  { id: '4', opSeq: 4, description: 'Cleaning M/C(Back side) #1', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 31' },
  { id: '5', opSeq: 5, description: 'Printing-BAg (Silver Paste)', wc: 'Printing-Digital RGOM', manning: 4.0, baseCap: 1884, activeCap: 1884, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 32' },
  { id: '6', opSeq: 6, description: 'Cleaning M/C(Back side) #2', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 33' },
  { id: '7', opSeq: 7, description: 'Printing-BC (Carbon Paste)', wc: 'Printing-Digital RGOM', manning: 4.0, baseCap: 1944, activeCap: 1944, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 34' },
  { id: '8', opSeq: 8, description: 'Cleaning M/C(Back side) #3', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 35' },
  { id: '9', opSeq: 9, description: 'Printing-BUR1 (Resist 1)', wc: 'Printing-Digital RGOM', manning: 3.0, baseCap: 1836, activeCap: 1836, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 36' },
  { id: '10', opSeq: 10, description: 'Cleaning M/C(Back side) #4', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 37' },
  { id: '11', opSeq: 11, description: 'Printing-BUR2 (Resist 2)', wc: 'Printing-Digital RGOM', manning: 3.0, baseCap: 2004, activeCap: 2004, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 38' },
  { id: '12', opSeq: 12, description: 'Cleaning M/C(Back side) #5', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 39' },
  { id: '13', opSeq: 13, description: 'Re-anneal#2', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 3420, activeCap: 3420, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 40' },
  { id: '14', opSeq: 14, description: 'Cleaning M/C(Back side) #6', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 41' },
  { id: '15', opSeq: 15, description: 'Printing-BAg.J (Jump Silver)', wc: 'Printing-Digital RGOM', manning: 8.0, baseCap: 1572, activeCap: 1572, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 42' },
  { id: '16', opSeq: 16, description: 'Cleaning M/C(Back side) #7', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 43' },
  { id: '17', opSeq: 17, description: 'Printing-BOR (Overcoat)', wc: 'Printing-Digital RGOM', manning: 2.0, baseCap: 2040, activeCap: 2040, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 44' },
  { id: '18', opSeq: 18, description: 'Cleaning M/C(Back side) #8', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 45' },
  { id: '19', opSeq: 19, description: 'Re-anneal#3', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 3420, activeCap: 3420, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 46' },
  { id: '20', opSeq: 20, description: 'Cleaning M/C(Back side) #9', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 6900, activeCap: 6900, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 47' },
  { id: '21', opSeq: 21, description: 'Laminate Carrier film', wc: 'Printing-Digital RGOM', manning: 8.0, baseCap: 2640, activeCap: 2640, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 48' },
  { id: '22', opSeq: 22, description: 'Re-anneal#4', wc: 'Printing-Digital RGOM', manning: 1.0, baseCap: 5040, activeCap: 5040, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 49' },

  // Material Prep & Cutting (5 steps)
  { id: '23', opSeq: 23, description: 'PET support: Cutting', wc: 'Cutting', manning: 1.0, baseCap: 14400, activeCap: 14400, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 52' },
  { id: '24', opSeq: 24, description: 'Packing sheet: Cutting', wc: 'Cutting', manning: 1.0, baseCap: 11200, activeCap: 11200, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 54' },
  { id: '25', opSeq: 25, description: 'Packing sheet: Half cut', wc: 'Assembly Digital RGOM', manning: 0.5, baseCap: 4800, activeCap: 4800, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 55' },
  { id: '26', opSeq: 26, description: 'Packing sheet: Blanking', wc: 'Assembly Digital RGOM', manning: 1.0, baseCap: 1894, activeCap: 1894, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 56' },
  { id: '27', opSeq: 27, description: 'Carrier Film: Cutting', wc: 'Cutting', manning: 1.0, baseCap: 8400, activeCap: 8400, baseYield: 0.064506, activeYield: 0.064506, sourceRef: 'Cost declare Row 58' },

  // Digital Assembly Line (9 steps)
  { id: '28', opSeq: 28, description: 'AI-Ins (Automated Inspection)', wc: 'Assembly Digital RGOM', manning: 4.0, baseCap: 600, activeCap: 600, baseYield: 0.74, activeYield: 0.60, sourceRef: 'Cost declare Row 60 [Active Demo: Yield 60%]' },
  { id: '29', opSeq: 29, description: 'P-ins (Pin Insertion)', wc: 'Assembly Digital RGOM', manning: 2.0, baseCap: 600, activeCap: 600, baseYield: 0.84, activeYield: 0.84, sourceRef: 'Cost declare Row 61' },
  { id: '30', opSeq: 30, description: 'VDO-ins I (Visual Inspection 1)', wc: 'Assembly Digital RGOM', manning: 4.0, baseCap: 600, activeCap: 600, baseYield: 0.84, activeYield: 0.84, sourceRef: 'Cost declare Row 62' },
  { id: '31', opSeq: 31, description: 'Outline Blanking', wc: 'Assembly Digital RGOM', manning: 1.0, baseCap: 600, activeCap: 600, baseYield: 0.84, activeYield: 0.84, sourceRef: 'Cost declare Row 63' },
  { id: '32', opSeq: 32, description: 'Blanking-ins', wc: 'Assembly Digital RGOM', manning: 1.0, baseCap: 600, activeCap: 600, baseYield: 0.90, activeYield: 0.90, sourceRef: 'Cost declare Row 64' },
  { id: '33', opSeq: 33, description: 'E-ins I (Insulation Test)', wc: 'Assembly Digital RGOM', manning: 2.0, baseCap: 600, activeCap: 600, baseYield: 0.90, activeYield: 0.90, sourceRef: 'Cost declare Row 65' },
  { id: '34', opSeq: 34, description: 'E-ins II (Capacitive Test)', wc: 'Assembly Digital RGOM', manning: 4.0, baseCap: 600, activeCap: 600, baseYield: 0.90, activeYield: 0.90, sourceRef: 'Cost declare Row 66' },
  { id: '35', opSeq: 35, description: 'VDO-ins II (SN code & C peel off)', wc: 'Assembly Digital RGOM', manning: 1.0, baseCap: 600, activeCap: 600, baseYield: 0.90, activeYield: 0.90, sourceRef: 'Cost declare Row 67' },
  { id: '36', opSeq: 36, description: 'V-Ins (Final Visual Inspection)', wc: 'Assembly Digital RGOM', manning: 2.0, baseCap: 600, activeCap: 600, baseYield: 0.90, activeYield: 0.90, sourceRef: 'Cost declare Row 68' },

  // Supporting Line (2 steps)
  { id: '37', opSeq: 37, description: 'Support (Film puncher)', wc: 'Assembly Digital RGOM', manning: 1.0, baseCap: 480, activeCap: 480, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 72' },
  { id: '38', opSeq: 38, description: 'Support (Half cut)', wc: 'Assembly Digital RGOM', manning: 0.5, baseCap: 4800, activeCap: 4800, baseYield: 1.00, activeYield: 1.00, sourceRef: 'Cost declare Row 73' },

  // QA & Packing Line (1 step)
  { id: '39', opSeq: 39, description: 'QA & Packing (VDO-Ins, QA, Packing carton)', wc: 'OQA-Digital', manning: 5.0, baseCap: 560, activeCap: 560, baseYield: 0.9975, activeYield: 0.9975, sourceRef: 'Cost declare Rows 74-79' }
]
