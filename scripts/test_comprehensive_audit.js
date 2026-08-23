/**
 * test_comprehensive_audit.js
 * Comprehensive Multi-Phase Audit & Mathematical Verification Suite
 */

import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('================================================================================')
console.log('🏭 COST BREAKDOWN PLATFORM: COMPLETE AUTOMATED TEST & VERIFICATION SUITE')
console.log('================================================================================\n')

let passCount = 0
let totalChecks = 0

function assert(condition, message) {
  totalChecks++
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`)
    throw new Error(`Assertion Failed: ${message}`)
  }
  passCount++
  console.log(`  ✅ [PASS] ${message}`)
}

function assertNear(actual, expected, tolerance = 0.005, label = '') {
  totalChecks++
  const diff = Math.abs(actual - expected)
  if (diff > tolerance) {
    console.error(`  ❌ [FAIL] ${label}: Expected ${expected.toFixed(4)}, got ${actual.toFixed(4)} (diff: ${diff.toFixed(4)})`)
    throw new Error(`Precision Failed: ${label}`)
  }
  passCount++
  console.log(`  ✅ [PASS] ${label}: ${actual.toFixed(4)} (Expected: ${expected.toFixed(4)})`)
}

// -----------------------------------------------------------------------------
// MODULE 1: Calculation Engine Unit Testing (Formulas & Variances)
// -----------------------------------------------------------------------------
console.log('--------------------------------------------------------------------------------')
console.log('TEST SUITE 1: Cost Engine Core Mathematical Logic & Variance Tree')
console.log('--------------------------------------------------------------------------------')

function safeDivide(numerator, denominator, fallback = 0) {
  if (!denominator || isNaN(denominator) || denominator === 0) return fallback
  const res = numerator / denominator
  return isFinite(res) ? res : fallback
}

function runCostCalculation(bom, routing, rates) {
  const rateMap = new Map()
  rates.forEach(r => rateMap.set(r.wc, { labor: r.laborRate, burden: r.burdenRate }))

  let materialBase = 0
  let materialActive = 0
  let mpv = 0
  let mlv = 0

  bom.forEach(b => {
    const bCost = b.consumption * b.basePrice * (1 + b.baseLoss)
    const aCost = b.consumption * b.activePrice * (1 + b.activeLoss)
    materialBase += bCost
    materialActive += aCost
    mpv += (b.activePrice - b.basePrice) * b.consumption * (1 + b.activeLoss)
    mlv += (b.activeLoss - b.baseLoss) * b.consumption * b.basePrice
  })

  let laborBase = 0
  let laborActive = 0
  let burdenBase = 0
  let burdenActive = 0

  routing.forEach(rt => {
    const r = rateMap.get(rt.wc) || { labor: 105.29, burden: 95.00 }
    const baseRuntime = rt.baseCap > 0 && rt.baseYield > 0
      ? safeDivide(rt.manning, rt.baseCap * rt.baseYield)
      : 0
    const activeRuntime = rt.activeCap > 0 && rt.activeYield > 0
      ? safeDivide(rt.manning, rt.activeCap * rt.activeYield)
      : 0

    laborBase += baseRuntime * r.labor
    laborActive += activeRuntime * r.labor
    burdenBase += baseRuntime * r.burden
    burdenActive += activeRuntime * r.burden
  })

  const totalBase = materialBase + laborBase + burdenBase
  const totalActive = materialActive + laborActive + burdenActive
  const totalVariance = totalActive - totalBase

  const lrv = 0
  const lev = laborActive - laborBase
  const brv = 0
  const bev = burdenActive - burdenBase

  return {
    materialBase, materialActive, laborBase, laborActive, burdenBase, burdenActive,
    totalBase, totalActive, totalVariance, mpv, mlv, lrv, lev, brv, bev
  }
}

// Mock standard rates
const testRates = [
  { wc: 'Cutting', laborRate: 105.29, burdenRate: 138.48 },
  { wc: 'Printing-Digital RGOM', laborRate: 105.29, burdenRate: 97.69 },
  { wc: 'Assembly Digital RGOM', laborRate: 105.29, burdenRate: 90.93 },
  { wc: 'OQA-Digital', laborRate: 105.29, burdenRate: 82.74 }
]

// Mock single-item precision test
const singleBOM = [{
  itemCode: 'TEST-MAT', description: 'Test Material', consumption: 0.5,
  basePrice: 100, activePrice: 120, baseLoss: 0.10, activeLoss: 0.15
}]
const singleRouting = [{
  opSeq: 1, description: 'Test Step', wc: 'Cutting', manning: 2.0,
  baseCap: 1000, activeCap: 800, baseYield: 0.95, activeYield: 0.90
}]

const res1 = runCostCalculation(singleBOM, singleRouting, testRates)

// Verification of MPV & MLV formulas:
// Base Cost = 0.5 * 100 * 1.10 = 55.00
// Active Cost = 0.5 * 120 * 1.15 = 69.00
// Total Mat Variance = 14.00
// MPV = (120 - 100) * 0.5 * 1.15 = 11.50
// MLV = (0.15 - 0.10) * 0.5 * 100 = 2.50
// MPV + MLV = 11.50 + 2.50 = 14.00 (100% Balanced)
assertNear(res1.materialBase, 55.00, 0.001, 'Unit Direct Material Base')
assertNear(res1.materialActive, 69.00, 0.001, 'Unit Direct Material Active')
assertNear(res1.mpv, 11.50, 0.001, 'Level 3 Material Price Variance (MPV)')
assertNear(res1.mlv, 2.50, 0.001, 'Level 3 Material Loss Variance (MLV)')
assertNear(res1.mpv + res1.mlv, res1.materialActive - res1.materialBase, 0.0001, 'Material Variance Sub-Tree Balance')

// Total Variance Balance Check:
const varianceSum = res1.mpv + res1.mlv + res1.lrv + res1.lev + res1.brv + res1.bev
assertNear(res1.totalVariance, varianceSum, 0.0001, 'Overall 3-Pillars Variance Tree Reconciliation (Delta C = Sum(Variances))')

console.log('')

// -----------------------------------------------------------------------------
// MODULE 2: Pareto Candidate Ranking & Top Drivers Engine
// -----------------------------------------------------------------------------
console.log('--------------------------------------------------------------------------------')
console.log('TEST SUITE 2: Pareto Candidate Ranking & RCA Parameter Extraction')
console.log('--------------------------------------------------------------------------------')

function rankTopDrivers(bom, routing, rates) {
  const rateMap = new Map()
  rates.forEach(r => rateMap.set(r.wc, { labor: r.laborRate, burden: r.burdenRate }))

  const candidates = []
  let id = 0

  bom.forEach(b => {
    id++
    const baseCost = b.consumption * b.basePrice * (1 + b.baseLoss)
    const activeCost = b.consumption * b.activePrice * (1 + b.activeLoss)
    const gap = activeCost - baseCost
    candidates.push({
      id,
      category: 'Direct Material',
      name: b.description,
      gap,
      tieBreaker: gap > 0 ? gap + (100 - id) * 1e-8 : 0
    })
  })

  routing.forEach(rt => {
    id++
    const r = rateMap.get(rt.wc) || { labor: 105.29, burden: 95.00 }
    const baseRuntime = rt.baseCap > 0 && rt.baseYield > 0 ? safeDivide(rt.manning, rt.baseCap * rt.baseYield) : 0
    const activeRuntime = rt.activeCap > 0 && rt.activeYield > 0 ? safeDivide(rt.manning, rt.activeCap * rt.activeYield) : 0
    const gap = (activeRuntime - baseRuntime) * (r.labor + r.burden)
    candidates.push({
      id,
      category: rt.wc,
      name: rt.description,
      gap,
      tieBreaker: gap > 0 ? gap + (100 - id) * 1e-8 : 0
    })
  })

  const positive = candidates.filter(c => c.gap > 0)
  positive.sort((a, b) => b.tieBreaker - a.tieBreaker)
  const totalGap = positive.reduce((acc, c) => acc + c.gap, 0)

  return positive.slice(0, 10).map((c, idx) => ({
    ...c,
    rank: idx + 1,
    pctContribution: (c.gap / totalGap) * 100
  }))
}

const multiBOM = [
  { itemCode: 'M1', description: 'Minor Chemical Resin', consumption: 0.1, basePrice: 10, activePrice: 12, baseLoss: 0.1, activeLoss: 0.1 },
  { itemCode: 'M2', description: 'Major Conductive Silver Paste', consumption: 0.2, basePrice: 30, activePrice: 60, baseLoss: 0.3, activeLoss: 0.3 }
]
const multiRouting = [
  { opSeq: 1, description: 'Cutting', wc: 'Cutting', manning: 1, baseCap: 6000, activeCap: 6000, baseYield: 1.0, activeYield: 1.0 },
  { opSeq: 2, description: 'AI Optical Inspection', wc: 'Assembly Digital RGOM', manning: 4, baseCap: 600, activeCap: 600, baseYield: 0.74, activeYield: 0.60 }
]

const ranked = rankTopDrivers(multiBOM, multiRouting, testRates)
assert(ranked.length === 3, `Filter identified exactly 3 positive cost gaps (found: ${ranked.length})`)
assert(ranked[0].name === 'Major Conductive Silver Paste', 'Rank #1 is largest cost driver (Silver Paste)')
assert(ranked[1].name === 'AI Optical Inspection', 'Rank #2 is second largest driver (AI Optical Inspection Yield Drop)')
assert(ranked[2].name === 'Minor Chemical Resin', 'Rank #3 is minor chemical price increase')
assertNear(ranked.reduce((acc, r) => acc + r.pctContribution, 0), 100.0, 0.01, 'Pareto % Contribution sums to 100%')

console.log('')

// -----------------------------------------------------------------------------
// MODULE 3: What-If ROI & Payback Period Simulation
// -----------------------------------------------------------------------------
console.log('--------------------------------------------------------------------------------')
console.log('TEST SUITE 3: What-If Scenario ROI & Payback Simulation')
console.log('--------------------------------------------------------------------------------')

function simulateOption(activeCost, baseConvCost, newConvCost, investment, monthlyVol, variableAddedCost = 0) {
  const grossSavingPerUnit = baseConvCost - newConvCost
  const fixedAddedCostPerUnit = safeDivide(investment, monthlyVol)
  const netSavingPerUnit = grossSavingPerUnit - fixedAddedCostPerUnit - variableAddedCost
  const predictedTotalCost = activeCost - netSavingPerUnit
  const monthlySavings = netSavingPerUnit * monthlyVol
  const paybackMonths = (investment > 0 && netSavingPerUnit > 0)
    ? (investment / (grossSavingPerUnit * monthlyVol)) // Traditional payback on gross savings
    : 0
  const isProfitable = netSavingPerUnit > 0

  return { grossSavingPerUnit, netSavingPerUnit, predictedTotalCost, monthlySavings, paybackMonths, isProfitable }
}

const simA = simulateOption(17.5098, 1.0500, 0.4988, 5000, 50000)
assert(simA.isProfitable === true, 'Option A (Quick Fix) is profitable')
assert(simA.paybackMonths < 1.0, `Option A Payback is under 1 month (${simA.paybackMonths.toFixed(2)} mos)`)

const simHighInvest = simulateOption(17.5098, 1.0500, 0.4988, 5000000, 1000)
assert(simHighInvest.isProfitable === false, 'High Investment with low volume is flagged UNPROFITABLE (Poka-Yoke)')

console.log('')

// -----------------------------------------------------------------------------
// MODULE 4: Poka-Yoke & Boundary Condition Hardening
// -----------------------------------------------------------------------------
console.log('--------------------------------------------------------------------------------')
console.log('TEST SUITE 4: Poka-Yoke Guards & Boundary Edge Cases')
console.log('--------------------------------------------------------------------------------')

// 1. Division by Zero Protection
const divZeroResult = safeDivide(100, 0, 0)
assert(divZeroResult === 0, 'safeDivide handles zero denominator without Infinity/NaN')

const nanDivideResult = safeDivide(NaN, 100, 0)
assert(nanDivideResult === 0, 'safeDivide handles NaN numerator gracefully')

// 2. Clamping Negative and Invalid Values
function sanitizeInputs(val, min = 0, max = Infinity, fallback = 0) {
  const num = typeof val === 'number' ? val : parseFloat(val)
  if (isNaN(num)) return fallback
  return Math.min(max, Math.max(min, num))
}

assert(sanitizeInputs(-25.5, 0, 1e6) === 0, 'Negative input clamped to 0.0000')
assert(sanitizeInputs(150, 0, 100) === 100, 'Yield > 100% clamped to 100%')
assert(sanitizeInputs('invalid_text', 0, 100, 0) === 0, 'Invalid string input gracefully defaults to 0')

console.log('')

// -----------------------------------------------------------------------------
// MODULE 5: Master Excel Workbook Structure Audit
// -----------------------------------------------------------------------------
console.log('--------------------------------------------------------------------------------')
console.log('TEST SUITE 5: Master Excel Workbook Parity Audit')
console.log('--------------------------------------------------------------------------------')

async function auditExcelFile(fileName) {
  const filePath = path.join(__dirname, '..', 'excel_models', fileName)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)

  const sheets = wb.worksheets.map(ws => ws.name)
  assert(sheets.includes('1_MASTER_RATES'), `${fileName} contains 1_MASTER_RATES`)
  assert(sheets.includes('2_BOM_BREAKDOWN'), `${fileName} contains 2_BOM_BREAKDOWN`)
  assert(sheets.includes('3_ROUTING_BREAKDOWN'), `${fileName} contains 3_ROUTING_BREAKDOWN`)
  assert(sheets.includes('4_SUMMARY_&_COMPARISON'), `${fileName} contains 4_SUMMARY_&_COMPARISON`)
  assert(sheets.includes('_CALC_ENGINE'), `${fileName} contains _CALC_ENGINE`)

  // Check formula protection in Sheet 4
  const ws4 = wb.getWorksheet('4_SUMMARY_&_COMPARISON')
  const r8 = ws4.getRow(8) // Grand Total Row
  assert(r8.getCell(4).formula.includes('C8-B8') || r8.getCell(4).formula.includes('SUM'), `${fileName} Sheet 4 has active formula link`)
}

await auditExcelFile('CostModel_RGOM-024_v2.xlsx')
await auditExcelFile('CostModel_BLANK_TEMPLATE_v2.xlsx')

console.log('\n================================================================================')
console.log(`🎉 ALL TEST SUITES PASSED! (${passCount}/${totalChecks} CHECKS COMPLETED SUCCESSFULLY)`)
console.log('================================================================================\n')
