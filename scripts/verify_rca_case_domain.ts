import assert from 'node:assert/strict'
import type { ProductSession } from '../src/core/types'
import {
  createRcaCaseRecord,
  createRcaCaseForCandidates,
  isRcaCaseComplete,
  migrateLegacyCandidateRcaRecords,
  saveRcaCaseRecord
} from '../src/state/rca-cases.ts'

const candidates = ['bom:MAT-1', 'process:QA-1', 'process:QA-2']
const created = createRcaCaseRecord('rca-case-1', [candidates[0], candidates[1], candidates[1]], {
  rootCause: 'The inspection line was reorganized.',
  action: 'Balance cycle time across the new process steps.'
}, '2026-10-09T00:00:00.000Z')
assert.deepEqual(created.candidateKeys, candidates.slice(0, 2), 'A case accepts one or many unique Candidates in selected order')
assert.equal(created.id, 'rca-case-1', 'RCA Case identity is stable and explicit')
assert.equal(created.rootCause, 'The inspection line was reorganized.')
assert.equal(created.action, 'Balance cycle time across the new process steps.')
assert.equal(isRcaCaseComplete(created), true, 'Candidate membership plus Root Cause and Action completes RCA')
assert.equal(isRcaCaseComplete({ ...created, action: '  ' }), false)
assert.equal(isRcaCaseComplete({ ...created, candidateKeys: [] }), false)
assert.throws(() => createRcaCaseRecord('empty', [], { rootCause: '', action: '' }), /at least one Candidate/i)

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

const alreadyModeled = { ...migrated, rcaCases: { [created.id]: created } }
assert.strictEqual(migrateLegacyCandidateRcaRecords(alreadyModeled), alreadyModeled, 'Existing RCA Cases are preserved')

const newCaseSession = createRcaCaseForCandidates(
  legacySession,
  candidates,
  [candidates[0], candidates[1]],
  'new-case',
  '2026-10-09T01:00:00.000Z'
)
assert.deepEqual(newCaseSession.rcaCases?.['new-case']?.candidateKeys, candidates.slice(0, 2))
assert.equal(newCaseSession.activeRcaCaseId, 'new-case', 'Creating a Case makes that explicitly created Case active')
assert.throws(() => createRcaCaseForCandidates(legacySession, candidates, ['outside-pool'], 'bad-case'), /active Candidate pool/i)
assert.throws(() => createRcaCaseForCandidates(legacySession, candidates, [], 'empty-case'), /at least one Candidate/i)
assert.throws(() => createRcaCaseForCandidates(newCaseSession, candidates, [candidates[0]], 'new-case'), /identity already exists/i)

const savedCaseSession = saveRcaCaseRecord(newCaseSession, 'new-case', {
  rootCause: 'Shared cause',
  action: 'Shared action'
}, '2026-10-09T01:05:00.000Z')
assert.equal(savedCaseSession.rcaCases?.['new-case']?.rootCause, 'Shared cause')
assert.equal(savedCaseSession.rcaCases?.['new-case']?.action, 'Shared action')
assert.equal(savedCaseSession.rcaCases?.['new-case']?.candidateKeys.length, 2, 'Saving case-level fields preserves multi-Candidate membership')
assert.equal(savedCaseSession.rcaCases?.['new-case']?.updatedAt, '2026-10-09T01:05:00.000Z')
assert.equal(savedCaseSession.activeRcaCaseId, 'new-case')

console.log('RCA Case domain and legacy migration verification passed')
