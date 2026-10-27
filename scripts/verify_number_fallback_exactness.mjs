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
  const {
    compareExactDecimals,
    exactDecimalInputValue,
    exactDecimalToString,
    resolveExactDecimalInputPair
  } = decimal

  const baseline = exactDecimalInputValue(1)
  const oneUlpTail = exactDecimalInputValue(1 + Number.EPSILON)
  assert.ok(baseline && oneUlpTail)
  assert.equal(exactDecimalToString(baseline), '1')
  assert.equal(exactDecimalToString(oneUlpTail), '1',
    'no-sidecar Number fallback removes only the current two-ULP representation tail')
  assert.equal(compareExactDecimals(baseline, oneUlpTail), 0,
    'a materially shorter decimal within two ULP remains the same business value')

  const meaningfulDifference = exactDecimalInputValue(1 + Number.EPSILON * 8)
  assert.ok(meaningfulDifference)
  assert.equal(exactDecimalToString(meaningfulDifference), String(1 + Number.EPSILON * 8),
    'a difference outside the narrow residue rule remains business precision')

  const threeUlpResidue = 0.09000000000000004
  assert.equal(exactDecimalToString(exactDecimalInputValue(threeUlpResidue)), String(threeUlpResidue),
    'single-value no-sidecar cleanup remains capped at the current two-ULP rule')
  const equivalentPair = resolveExactDecimalInputPair(0.09, undefined, threeUlpResidue, undefined)
  assert.equal(equivalentPair.equivalent, true,
    'the current pair comparison resolves the 0.09 regression representation case')
  assert.equal(exactDecimalToString(equivalentPair.current), '0.09',
    'the equivalent pair shares a canonical calculation operand without changing stored Numbers')

  const fourUlpDifference = 0.09000000000000005
  const outsidePairBoundary = resolveExactDecimalInputPair(0.09, undefined, fourUlpDifference, undefined)
  assert.equal(outsidePairBoundary.equivalent, false,
    'a no-sidecar pair outside the current bounded residue policy remains different')

  const noisyNine = 9.000000000000004
  assert.equal(exactDecimalToString(exactDecimalInputValue(noisyNine)), '9',
    'business calculation fallback uses the current no-sidecar machine-residue cleanup')

  const preciseSidecar = exactDecimalInputValue(1, '1.00000000000000001')
  assert.ok(preciseSidecar)
  assert.equal(exactDecimalToString(preciseSidecar), '1.00000000000000001',
    'valid exact-only precision remains authoritative when its Number projection is unchanged')

  console.log('Number fallback exactness verification passed.')
} finally {
  await vite.close()
}
