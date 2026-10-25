import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ExcelJS from 'exceljs'
import { compareSnapshots, type CostSnapshot } from '../src/core'
import { createSyntheticReviewSnapshotPair } from '../src/features/master-data/fixtures/synthetic-review-data'
import { parseSnapshotExcelInputFile } from '../src/services/excel/snapshot-parser'
import { generateSnapshotComparisonExcel } from '../src/services/excel/comparison-export'
import { exportSnapshotToExcel } from '../src/services/excel/snapshot-export'

const fixture = (name: string): string => path.join(process.cwd(), 'public', name)

async function parseSnapshot(snapshot: CostSnapshot, role: 'reference' | 'current') {
  const blob = await exportSnapshotToExcel(snapshot)
  const file = new File([await blob.arrayBuffer()], `${role}-full-flow.xlsx`)
  const result = await parseSnapshotExcelInputFile(file, role)

  assert.equal(result.success, true, `${role} generated fixture should parse: ${result.message}`)
  assert.ok(result.snapshot, `${role} generated fixture should produce a snapshot`)
  assert.equal(result.snapshot.comparisonRole, role)
  assert.ok(result.snapshot.bom.length > 0, `${role} snapshot should contain BOM rows`)
  assert.ok(result.snapshot.routing.length > 0, `${role} snapshot should contain routing rows`)
  assert.ok(result.snapshot.rates.length > 0, `${role} snapshot should contain Work Center rates`)

  return result.snapshot
}

async function main(): Promise<void> {
  const incompleteReferenceFile = new File(
    [await readFile(fixture('CostModel_SYNTHETIC_MOCK_v2.xlsx'))],
    'CostModel_SYNTHETIC_MOCK_v2.xlsx'
  )
  const incompleteReference = await parseSnapshotExcelInputFile(incompleteReferenceFile, 'reference')
  assert.equal(incompleteReference.success, false, 'the legacy public review fixture is not a canonical dataset workbook')
  assert.equal(incompleteReference.format, undefined, 'unrecognized workbooks must not be classified as canonical')
  assert.equal(incompleteReference.snapshot, undefined, 'rejected workbooks must not produce an importable snapshot')
  assert.equal(incompleteReference.role, 'reference', 'recognition failure retains the requested destination role')
  assert.ok(incompleteReference.message.trim().length > 0, 'recognition failure explains the rejected workbook')
  assert.ok((incompleteReference.warnings ?? []).some(warning => warning.trim().length > 0), 'recognition failure includes a diagnostic')

  const pair = createSyntheticReviewSnapshotPair()
  const reference = await parseSnapshot(pair.reference, 'reference')
  const current = await parseSnapshot(pair.current, 'current')
  const comparison = compareSnapshots(reference, current)

  assert.equal(comparison.referenceSnapshotId, reference.id)
  assert.equal(comparison.currentSnapshotId, current.id)
  assert.ok(comparison.bomFindings.length > 0, 'comparison should contain BOM findings')
  assert.ok(comparison.routingFindings.length > 0, 'comparison should contain routing findings')
  assert.ok(comparison.workCenterFindings.length > 0, 'comparison should contain Work Center findings')

  const blob = await generateSnapshotComparisonExcel({
    product: current.product,
    snapshotPair: { reference, current },
    comparison
  })
  assert.ok(blob.size > 0, 'comparison export should produce bytes')

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await blob.arrayBuffer())
  assert.deepEqual(
    workbook.worksheets.map(sheet => sheet.name),
    ['Summary', 'BOM Comparison', 'Routing Comparison', 'Work Center Comparison']
  )

  console.log('Snapshot full-flow self-check: PASS')
  console.log(`Reference ${reference.id}: ${reference.bom.length} BOM / ${reference.routing.length} routing / ${reference.rates.length} WC`)
  console.log(`Current ${current.id}: ${current.bom.length} BOM / ${current.routing.length} routing / ${current.rates.length} WC`)
  console.log(`Findings: ${comparison.bomFindings.length} BOM / ${comparison.routingFindings.length} routing / ${comparison.workCenterFindings.length} WC`)
  console.log(`Export workbook: ${blob.size} bytes`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
