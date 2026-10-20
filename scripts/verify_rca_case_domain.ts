import assert from 'node:assert/strict'
import type { ProductSession } from '../src/core/types'
import { migrateLegacyCandidateRcaRecords } from '../src/state/rca-cases.ts'

const candidates = ['bom:MAT-1', 'process:QA-1', 'process:QA-2']
const legacySession: ProductSession = {
  id: 'legacy-rca-session',
  product: { productCode: '', productDescription: '', uom: 'PC', customer: '', effectiveDate: '' },
  rates: [], bom: [], routing: [], savedDrivers: [], status: 'draft',
  createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
  candidateRcaRecords: {
    [candidates[0]]: { candidateKey: candidates[0], rootCause: 'Old cause', action: 'Old action', updatedAt: '2026-10-02T00:00:00.000Z' },
    [candidates[1]]: { candidateKey: candidates[1], rootCause: 'Second cause', action: 'Second action', updatedAt: '2026-10-03T00:00:00.000Z' }
  }
}
const migrated = migrateLegacyCandidateRcaRecords(legacySession)
assert.deepEqual(Object.values(migrated.rcaCases ?? {}).map(record => record.candidateKeys), [[candidates[0]], [candidates[1]]])
assert.equal(migrated.rcaCases?.[`legacy:${candidates[0]}`]?.rootCause, 'Old cause')
assert.equal(migrated.rcaCases?.[`legacy:${candidates[1]}`]?.action, 'Second action')
assert.equal(migrated.rcaCases?.[`legacy:${candidates[0]}`]?.updatedAt, '2026-10-02T00:00:00.000Z')
assert.strictEqual(migrateLegacyCandidateRcaRecords(migrated), migrated, 'Migration is idempotent')

const alreadyModeled = { ...migrated, rcaCases: { ...migrated.rcaCases } }
assert.strictEqual(migrateLegacyCandidateRcaRecords(alreadyModeled), alreadyModeled, 'Existing RCA Cases are preserved')

console.log('Legacy RCA session migration verification passed')
