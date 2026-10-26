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
  const { compareExactDecimals, exactDecimalInputValue, exactDecimalToString } = decimal

  const baseline = exactDecimalInputValue(1)
  const nextRepresentable = exactDecimalInputValue(1 + Number.EPSILON)
  assert.ok(baseline && nextRepresentable)
  assert.equal(exactDecimalToString(baseline), '1')
  assert.equal(exactDecimalToString(nextRepresentable), String(1 + Number.EPSILON))
  assert.notEqual(compareExactDecimals(baseline, nextRepresentable), 0,
    'no-sidecar stored Numbers that differ by one representable step remain different business values')

  const noisyNine = 9.000000000000004
  assert.equal(exactDecimalToString(exactDecimalInputValue(noisyNine)), String(noisyNine),
    'business calculation fallback keeps the stored Number instead of presentation cleanup')

  const preciseSidecar = exactDecimalInputValue(1, '1.00000000000000001')
  assert.ok(preciseSidecar)
  assert.equal(exactDecimalToString(preciseSidecar), '1.00000000000000001',
    'valid exact-only precision remains authoritative when its Number projection is unchanged')

  console.log('Number fallback exactness verification passed.')
} finally {
  await vite.close()
}
