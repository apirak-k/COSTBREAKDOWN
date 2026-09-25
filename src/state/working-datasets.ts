import { WorkingDataset, normalizeDataset } from '../core/types/dataset-standard.types'


export interface SingleSheetWorkingDatasets {
  reference: WorkingDataset
  current: WorkingDataset
}

const STORAGE_KEY_SINGLE_SHEET_DATASETS = 'cost_breakdown_working_datasets_v2'

export const initialDataset: WorkingDataset = {
  metadata: {
    productCode: 'PROD-001',
    productName: 'Sample Product',
    uom: 'PC',
    remark: 'Initial working dataset'
  },
  wc: [
    { id: 'wc-1', process: 'Cutting', labor: 150, burden: 100, sourceReference: 'Standard Rate 2026' },
    { id: 'wc-2', process: 'Assembly', labor: 180, burden: 120, sourceReference: 'Standard Rate 2026' }
  ],
  routing: [
    { id: 'rt-1', process: 'Cutting', capacity: 100, number: 1, yieldRatio: 0.98, sourceReference: 'BOM Routing v1' },
    { id: 'rt-2', process: 'Assembly', capacity: 50, number: 2, yieldRatio: 0.95, sourceReference: 'BOM Routing v1' }
  ],
  bom: [
    { id: 'bm-1', code: 'RM-001', materialName: 'Raw Material A', lossRatio: 0.05, consumption: 1.2, unit: 'KG', price: 50, sourceReference: 'Supplier Quote A' },
    { id: 'bm-2', code: 'RM-002', materialName: 'Raw Material B', lossRatio: 0.02, consumption: 0.5, unit: 'PC', price: 120, sourceReference: 'Supplier Quote B' }
  ]
}

export function loadWorkingDatasetsFromStorage(): SingleSheetWorkingDatasets {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_SINGLE_SHEET_DATASETS)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        reference: normalizeDataset(parsed.reference || initialDataset),
        current: normalizeDataset(parsed.current || initialDataset)
      }
    }
  } catch (err) {
    console.warn('Failed to load working datasets from session storage', err)
  }
  return {
    reference: normalizeDataset(initialDataset),
    current: normalizeDataset(initialDataset)
  }
}

export function saveWorkingDatasetsToStorage(datasets: SingleSheetWorkingDatasets): void {
  try {
    sessionStorage.setItem(STORAGE_KEY_SINGLE_SHEET_DATASETS, JSON.stringify(datasets))
  } catch (err) {
    console.warn('Failed to save working datasets to session storage', err)
  }
}
