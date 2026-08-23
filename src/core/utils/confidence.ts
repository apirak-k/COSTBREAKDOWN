import { WorkCenterRate, BOMItem, RoutingStep, DataConfidence } from '../types'

/**
 * Determines data confidence status for an individual field or row.
 * - 'missing': Value is null, undefined, empty, or NaN.
 * - 'verified': Value exists and is backed by a valid, explicit Source Reference.
 * - 'estimated': Value exists but has no Source Reference, or Source Reference explicitly marks it as Estimated / Assumption.
 */
export function getFieldConfidence(value: any, sourceRef?: string): DataConfidence {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'number' && (isNaN(value) || !isFinite(value)))
  ) {
    return 'missing'
  }

  if (sourceRef && typeof sourceRef === 'string' && sourceRef.trim().length > 0) {
    const s = sourceRef.toLowerCase()
    if (s.includes('est') || s.includes('placeholder') || s.includes('assumption') || s.includes('unverified')) {
      return 'estimated'
    }
    return 'verified'
  }

  return 'estimated'
}

export interface DataConfidenceSummary {
  verifiedCount: number
  estimatedCount: number
  missingCount: number
  totalFields: number
  verifiedPercentage: number
}

/**
 * Computes global data confidence roll-up metrics across the active dataset.
 */
export function calculateDataConfidenceSummary(
  rates: WorkCenterRate[],
  bom: BOMItem[],
  routing: RoutingStep[]
): DataConfidenceSummary {
  let verifiedCount = 0
  let estimatedCount = 0
  let missingCount = 0

  // 1. Work Center Rates (Labor & Burden per WC)
  rates.forEach(r => {
    const laborConf = getFieldConfidence(r.laborRate, r.sourceRef)
    const burdenConf = getFieldConfidence(r.burdenRate, r.sourceRef)
    ;[laborConf, burdenConf].forEach(c => {
      if (c === 'verified') verifiedCount++
      else if (c === 'estimated') estimatedCount++
      else missingCount++
    })
  })

  // 2. BOM Items (Usage Q, P0, P1, Loss L0, Loss L1)
  bom.forEach(b => {
    const qConf = getFieldConfidence(b.consumption, b.sourceRef)
    const p0Conf = getFieldConfidence(b.basePrice, b.sourceRef)
    const p1Conf = getFieldConfidence(b.activePrice, b.sourceRef)
    const l0Conf = getFieldConfidence(b.baseLoss, b.sourceRef)
    const l1Conf = getFieldConfidence(b.activeLoss, b.sourceRef)
    ;[qConf, p0Conf, p1Conf, l0Conf, l1Conf].forEach(c => {
      if (c === 'verified') verifiedCount++
      else if (c === 'estimated') estimatedCount++
      else missingCount++
    })
  })

  // 3. Routing Steps (Manning M, C0, C1, Y0, Y1)
  routing.forEach(rt => {
    const mConf = getFieldConfidence(rt.manning, rt.sourceRef)
    const c0Conf = getFieldConfidence(rt.baseCap, rt.sourceRef)
    const c1Conf = getFieldConfidence(rt.activeCap, rt.sourceRef)
    const y0Conf = getFieldConfidence(rt.baseYield, rt.sourceRef)
    const y1Conf = getFieldConfidence(rt.activeYield, rt.sourceRef)
    ;[mConf, c0Conf, c1Conf, y0Conf, y1Conf].forEach(c => {
      if (c === 'verified') verifiedCount++
      else if (c === 'estimated') estimatedCount++
      else missingCount++
    })
  })

  const totalFields = verifiedCount + estimatedCount + missingCount
  const verifiedPercentage = totalFields > 0 ? (verifiedCount / totalFields) * 100 : 0

  return {
    verifiedCount,
    estimatedCount,
    missingCount,
    totalFields,
    verifiedPercentage
  }
}
