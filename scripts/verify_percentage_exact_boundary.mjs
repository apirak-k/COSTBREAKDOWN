import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

try {
  const decimal = await vite.ssrLoadModule('/src/core/utils/exact-decimal.ts')
  const masterData = await vite.ssrLoadModule('/src/core/utils/master-data-effective.ts')
  const { exactDecimalInputValue, exactDecimalSidecarValue, exactDecimalToString } = decimal
  const { normalizeMasterDataSnapshot } = masterData

  for (const text of ['10.1', '29.1', '33.3', '1.1', '16.7']) {
    const displayNumber = Number(text)
    const storedNumber = displayNumber / 100
    const exact = exactDecimalSidecarValue(storedNumber, text, true)
    assert.ok(exact, `${text}% exact sidecar must survive the JS percentage boundary`)
    assert.equal(
      exactDecimalToString(exactDecimalInputValue(storedNumber, text, true)),
      exactDecimalToString(exact),
      `${text}% calculation must use the entered exact percentage`
    )
  }

  const lossNumber = 10.1 / 100
  assert.notEqual(lossNumber, Number('0.101'), 'fixture must exercise adjacent IEEE-754 projections')
  assert.equal(
    exactDecimalToString(exactDecimalInputValue(lossNumber, '10.1', true)),
    '0.101',
    '10.1% resolves to exact stored business value 0.101'
  )

  const stale = exactDecimalSidecarValue(0.7, '99', true)
  assert.equal(stale, null, 'a genuinely stale percentage sidecar is still rejected')

  const snapshot = {
    id: 'percentage-boundary',
    comparisonRole: 'current',
    product: { productName: 'P', uom: 'PC', customer: '', effectiveDate: '' },
    effectiveDate: '',
    sourceRef: 'fixture',
    status: 'draft',
    rates: [],
    bom: [{
      id: 'bom-1', description: 'Material', consumption: 1, unit: 'PC', price: 1,
      loss: lossNumber, exactDecimalInputs: { loss: '10.1' }, confidence: {}
    }],
    routing: []
  }
  const normalized = normalizeMasterDataSnapshot(snapshot)
  assert.equal(normalized.bom[0].exactDecimalInputs?.loss, '10.1',
    'Master Data normalization must not discard a valid decimal percentage sidecar')

  console.log('Percentage exact boundary verification passed.')
} finally {
  await vite.close()
}
