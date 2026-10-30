import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

try {
  const { getCanonicalComparisonStatus } = await vite.ssrLoadModule('/src/core/calculations/comparison-status.ts')

  const baseFinding = {
    referenceId: 'ref',
    currentId: 'cur',
    matchStatus: 'matched',
    changeFlags: {},
    fieldDiffs: {},
    costGap: 0,
    confidence: 'verified',
    reviewRequired: false
  }

  assert.equal(
    getCanonicalComparisonStatus({
      ...baseFinding,
      fieldDiffs: {
        'additionalFields.Hidden Excel Column': { reference: 'A', current: 'B' }
      },
      reviewRequired: true
    }),
    'UNCHANGED',
    'non-canonical additionalFields must not create CHANGED'
  )

  assert.equal(
    getCanonicalComparisonStatus({
      ...baseFinding,
      fieldDiffs: {
        price: { reference: '10.00', current: '10.01' },
        'additionalFields.Hidden Excel Column': { reference: 'A', current: 'B' }
      },
      reviewRequired: true
    }),
    'CHANGED',
    'real canonical business field changes must remain CHANGED'
  )

  assert.equal(
    getCanonicalComparisonStatus({
      ...baseFinding,
      changeFlags: { changedInputs: true },
      fieldDiffs: {
        'additionalFields.Hidden Excel Column': { reference: 'A', current: 'B' }
      },
      reviewRequired: true
    }),
    'CHANGED',
    'real business change flags must remain CHANGED'
  )

  console.log('Comparison status additional-fields verification passed.')
} finally {
  await vite.close()
}
