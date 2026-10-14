import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { COMPARISON_SORT_OPTIONS, DEFAULT_COMPARISON_SORT_MODE, sortComparisonRows } = await vite.ssrLoadModule('/src/features/cost-breakdown/components/comparison-view.ts')
  assert.deepEqual(COMPARISON_SORT_OPTIONS.map(option => option.label), ['Gap High → Low', 'Gap Low → High', '|Gap| High → Low'])
  assert.equal(DEFAULT_COMPARISON_SORT_MODE, 'absolute-gap-desc', 'absolute descending remains the default')
  const rows = [
    { key: 'negative-eight', gap: -8 },
    { key: 'positive-five-b', gap: 5 },
    { key: 'unavailable-null', gap: null },
    { key: 'positive-ten', gap: 10 },
    { key: 'negative-two', gap: -2 },
    { key: 'positive-five-a', gap: 5 },
    { key: 'positive-infinity', gap: Number.POSITIVE_INFINITY }
  ]

  assert.deepEqual(sortComparisonRows(rows, 'gap-desc').map(row => row.key), [
    'positive-ten', 'positive-five-a', 'positive-five-b', 'negative-two', 'negative-eight', 'positive-infinity', 'unavailable-null'
  ], 'signed descending keeps the largest positive gaps first and uses identity for ties')
  assert.deepEqual(sortComparisonRows(rows, 'gap-asc').map(row => row.key), [
    'negative-eight', 'negative-two', 'positive-five-a', 'positive-five-b', 'positive-ten', 'positive-infinity', 'unavailable-null'
  ], 'signed ascending keeps the most negative gaps first and uses identity for ties')
  assert.deepEqual(sortComparisonRows(rows, 'absolute-gap-desc').map(row => row.key), [
    'positive-ten', 'negative-eight', 'positive-five-a', 'positive-five-b', 'negative-two', 'positive-infinity', 'unavailable-null'
  ], 'absolute descending preserves the default magnitude ordering')

  const bom = sortComparisonRows([{ key: 'bom:b', gap: -9 }, { key: 'bom:a', gap: 3 }], 'gap-desc')
  const routing = sortComparisonRows([{ key: 'routing:b', gap: 8 }, { key: 'routing:a', gap: 1 }], 'gap-desc')
  assert.deepEqual([...bom, ...routing].map(row => row.key), ['bom:a', 'bom:b', 'routing:b', 'routing:a'],
    'callers can keep the existing BOM then Routing sections while sorting within each section')

  console.log('Cost Breakdown sort verification passed.')
} finally {
  await vite.close()
}
