import { ProductMaster, WorkCenterRate, BOMItem, RoutingStep, KaizenOption } from './types'

export const seedProductMaster: ProductMaster = {
  productCode: 'RGOM-024',
  productDescription: 'RGOM-024',
  uom: 'PC',
  customer: 'Automotive Display Panel',
  effectiveDate: '2026-07-01'
}

export const seedWorkCenterRates: WorkCenterRate[] = [
  { wc: 'Cutting', description: 'Cutting', laborRate: 105.29, burdenRate: 138.48, effectiveDate: '2025-03-31', sourceRef: 'Cost declare 250331' },
  { wc: 'Printing-Digital RGOM', description: 'Printing-Digital RGOM', laborRate: 105.29, burdenRate: 97.69, effectiveDate: '2025-03-31', sourceRef: 'Cost declare 250331' },
  { wc: 'Assembly Digital RGOM', description: 'Assembly Digital RGOM', laborRate: 105.29, burdenRate: 90.93, effectiveDate: '2025-03-31', sourceRef: 'Cost declare 250331' },
  { wc: 'OQA-Digital', description: 'OQA-Digital', laborRate: 105.29, burdenRate: 82.74, effectiveDate: '2025-03-31', sourceRef: 'Cost declare 250331' }
]

export const seedBOM: BOMItem[] = [
  { id: '1', itemCode: 'RMMBA1020', description: 'DOTITE XA-3645 Conductive Silver Paste Ink', consumption: 0.0035, unit: 'GM', basePrice: 150.00, activePrice: 545.60, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Price List 07-26' },
  { id: '2', itemCode: 'RMMBA1030', description: 'FEC-4023 Carbon Resistive Paste Ink', consumption: 0.0020, unit: 'GM', basePrice: 85.00, activePrice: 85.00, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Price List 07-26' },
  { id: '3', itemCode: 'RMMBA1040', description: 'PTF-3201N UV Dielectric Insulating Paste', consumption: 0.0050, unit: 'GM', basePrice: 45.00, activePrice: 45.00, baseLoss: 0.30, activeLoss: 0.30, sourceRef: 'Price List 07-26' },
  { id: '4', itemCode: 'RMPET1010', description: 'PET Film FPE-1100 (25um Base Film)', consumption: 0.0125, unit: 'SM', basePrice: 380.00, activePrice: 380.00, baseLoss: 0.15, activeLoss: 0.15, sourceRef: 'Price List 07-26' },
  { id: '5', itemCode: 'RMCVR2010', description: 'Front Graphic Overlay Hardcoat Film', consumption: 0.0125, unit: 'SM', basePrice: 420.00, activePrice: 420.00, baseLoss: 0.15, activeLoss: 0.15, sourceRef: 'Price List 07-26' },
  { id: '6', itemCode: 'RMADH3010', description: 'High-Tack Acrylic Spacer Tape 3M', consumption: 0.0125, unit: 'SM', basePrice: 280.00, activePrice: 280.00, baseLoss: 0.15, activeLoss: 0.15, sourceRef: 'Price List 07-26' },
  { id: '7', itemCode: 'RMPCK4010', description: 'Conductive Anti-Static Shield Bag', consumption: 1.0000, unit: 'PC', basePrice: 0.85, activePrice: 0.85, baseLoss: 0.05, activeLoss: 0.05, sourceRef: 'Price List 07-26' },
  { id: '8', itemCode: 'RMPCK4020', description: 'Silica Gel Desiccant 5g Pack', consumption: 1.0000, unit: 'PC', basePrice: 0.35, activePrice: 0.35, baseLoss: 0.02, activeLoss: 0.02, sourceRef: 'Price List 07-26' },
  { id: '9', itemCode: 'RMPCK4030', description: 'Export Corrugated Shipping Carton', consumption: 0.0100, unit: 'PC', basePrice: 42.00, activePrice: 42.00, baseLoss: 0.00, activeLoss: 0.00, sourceRef: 'Price List 07-26' },
  { id: '10', itemCode: 'RMMBA1050', description: 'Terminal Pin Connector Clip (Ag Plated)', consumption: 4.0000, unit: 'PC', basePrice: 0.1180, activePrice: 0.1180, baseLoss: 0.01, activeLoss: 0.01, sourceRef: 'Price List 07-26' }
]

export const seedRouting: RoutingStep[] = [
  { id: '1', opSeq: 10, description: 'PET Film Precision Sheet Cutting', wc: 'Cutting', manning: 1, baseCap: 1200, activeCap: 1200, baseYield: 0.98, activeYield: 0.98, sourceRef: 'Cost declare 250331' },
  { id: '2', opSeq: 20, description: 'Optical Surface Cleaning & De-ion', wc: 'Printing-Digital RGOM', manning: 1, baseCap: 1200, activeCap: 1200, baseYield: 0.98, activeYield: 0.98, sourceRef: 'Cost declare 250331' },
  { id: '3', opSeq: 30, description: 'Alignment Guide Punching', wc: 'Printing-Digital RGOM', manning: 1, baseCap: 1000, activeCap: 1000, baseYield: 0.98, activeYield: 0.98, sourceRef: 'Cost declare 250331' },
  { id: '4', opSeq: 40, description: 'Silver Conductor Circuit Screen Print', wc: 'Printing-Digital RGOM', manning: 2, baseCap: 600, activeCap: 600, baseYield: 0.95, activeYield: 0.90, sourceRef: 'QCF-LPN-MB-MRGOM-0024-1' },
  { id: '5', opSeq: 50, description: 'Continuous Hot Air Curing', wc: 'Printing-Digital RGOM', manning: 1, baseCap: 800, activeCap: 800, baseYield: 0.98, activeYield: 0.98, sourceRef: 'Cost declare 250331' },
  { id: '6', opSeq: 60, description: 'Carbon Overcoat Screen Print', wc: 'Printing-Digital RGOM', manning: 2, baseCap: 600, activeCap: 600, baseYield: 0.95, activeYield: 0.90, sourceRef: 'QCF-LPN-MB-MRGOM-0024-1' },
  { id: '7', opSeq: 70, description: 'Electrical Function Test & AOI', wc: 'Printing-Digital RGOM', manning: 1, baseCap: 900, activeCap: 900, baseYield: 0.98, activeYield: 0.98, sourceRef: 'Cost declare 250331' },
  { id: '8', opSeq: 80, description: 'Graphic Overlay Silk Screen Print', wc: 'Assembly Digital RGOM', manning: 2, baseCap: 550, activeCap: 550, baseYield: 0.96, activeYield: 0.96, sourceRef: 'Cost declare 250331' },
  { id: '9', opSeq: 90, description: 'Spacer Tape Die-Cutting & Punch', wc: 'Cutting', manning: 1, baseCap: 800, activeCap: 800, baseYield: 0.97, activeYield: 0.97, sourceRef: 'Cost declare 250331' },
  { id: '10', opSeq: 100, description: 'Automated Sheet Lamination', wc: 'Assembly Digital RGOM', manning: 2, baseCap: 450, activeCap: 450, baseYield: 0.97, activeYield: 0.97, sourceRef: 'Cost declare 250331' },
  { id: '11', opSeq: 110, description: 'Actuation Force & Function QA', wc: 'Assembly Digital RGOM', manning: 1, baseCap: 600, activeCap: 600, baseYield: 0.98, activeYield: 0.98, sourceRef: 'Cost declare 250331' },
  { id: '12', opSeq: 120, description: 'Poly-bagging & Carton Packing', wc: 'OQA-Digital', manning: 1, baseCap: 750, activeCap: 750, baseYield: 0.99, activeYield: 0.99, sourceRef: 'Cost declare 250331' }
]

export const seedKaizenOptions: KaizenOption[] = [
  {
    id: 'opt-a',
    optionLetter: 'A',
    actionName: 'Shift-start Calibration Jig & Checklist',
    targetYield: 0.95,
    investmentCost: 500,
    lotSize: 5000,
    addedCostPerUnit: 0.10,
    grossSavingPerUnit: 0.4647,
    netSavingPerUnit: 0.3647,
    predictedTotalStdCost: 36.3453,
    isProfitable: true
  },
  {
    id: 'opt-b',
    optionLetter: 'B',
    actionName: 'Automated Squeegee Digital Pressure Lock',
    targetYield: 0.98,
    investmentCost: 3000,
    lotSize: 5000,
    addedCostPerUnit: 0.60,
    grossSavingPerUnit: 0.8294,
    netSavingPerUnit: 0.2294,
    predictedTotalStdCost: 36.4806,
    isProfitable: true
  },
  {
    id: 'opt-c',
    optionLetter: 'C',
    actionName: 'Manual Hourly Inspection Routine',
    targetYield: 0.92,
    investmentCost: 1500,
    lotSize: 1000,
    addedCostPerUnit: 1.50,
    grossSavingPerUnit: 0.1859,
    netSavingPerUnit: -1.3141,
    predictedTotalStdCost: 38.0241,
    isProfitable: false
  }
]
