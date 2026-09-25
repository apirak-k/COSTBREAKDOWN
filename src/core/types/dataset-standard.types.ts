export interface DatasetMetadata {
  productCode: string
  productName: string
  uom: string
  remark?: string
}

export interface StandardWCItem {
  id?: string
  process: string
  labor: number | null
  burden: number | null
  sourceReference?: string
}

export interface StandardRoutingItem {
  id?: string
  process: string
  capacity: number | null
  number: number | null
  yieldRatio: number | null
  sourceReference?: string
}

export interface StandardBOMItem {
  id?: string
  code: string
  materialName: string
  lossRatio: number | null
  consumption: number | null
  unit: string
  price: number | null
  sourceReference?: string
}

export interface WorkingDataset {
  metadata: DatasetMetadata
  wc: StandardWCItem[]
  routing: StandardRoutingItem[]
  bom: StandardBOMItem[]
}

export function normalizeDataset(dataset: Partial<WorkingDataset>): WorkingDataset {
  const metadata: DatasetMetadata = {
    productCode: (dataset.metadata?.productCode || '').trim(),
    productName: (dataset.metadata?.productName || '').trim(),
    uom: (dataset.metadata?.uom || '').trim(),
    remark: dataset.metadata?.remark ? dataset.metadata.remark.trim() : undefined,
  }

  const wc: StandardWCItem[] = (dataset.wc || [])
    .filter(item => item.process && item.process.trim() !== '')
    .map(item => ({
      id: item.id,
      process: item.process.trim(),
      labor: item.labor !== null && item.labor !== undefined && !isNaN(Number(item.labor)) ? Number(item.labor) : null,
      burden: item.burden !== null && item.burden !== undefined && !isNaN(Number(item.burden)) ? Number(item.burden) : null,
      sourceReference: item.sourceReference ? item.sourceReference.trim() : undefined,
    }))

  const routing: StandardRoutingItem[] = (dataset.routing || [])
    .filter(item => item.process && item.process.trim() !== '')
    .map(item => ({
      id: item.id,
      process: item.process.trim(),
      capacity: item.capacity !== null && item.capacity !== undefined && !isNaN(Number(item.capacity)) ? Number(item.capacity) : null,
      number: item.number !== null && item.number !== undefined && !isNaN(Number(item.number)) ? Number(item.number) : null,
      yieldRatio: item.yieldRatio !== null && item.yieldRatio !== undefined && !isNaN(Number(item.yieldRatio)) ? Number(item.yieldRatio) : null,
      sourceReference: item.sourceReference ? item.sourceReference.trim() : undefined,
    }))

  const bom: StandardBOMItem[] = (dataset.bom || [])
    .filter(item => item.code && item.code.trim() !== '')
    .map(item => ({
      id: item.id,
      code: item.code.trim(),
      materialName: (item.materialName || '').trim(),
      lossRatio: item.lossRatio !== null && item.lossRatio !== undefined && !isNaN(Number(item.lossRatio)) ? Number(item.lossRatio) : null,
      consumption: item.consumption !== null && item.consumption !== undefined && !isNaN(Number(item.consumption)) ? Number(item.consumption) : null,
      unit: (item.unit || '').trim(),
      price: item.price !== null && item.price !== undefined && !isNaN(Number(item.price)) ? Number(item.price) : null,
      sourceReference: item.sourceReference ? item.sourceReference.trim() : undefined,
    }))

  return {
    metadata,
    wc,
    routing,
    bom,
  }
}
