import assert from 'node:assert/strict'
import { resolveWorkflowStatus } from '../src/shared/layout/workflow-status.ts'

const defaultState = {
  selectedComparisonActive: false,
  productMismatch: false,
  missingData: false,
  datasetsPrepared: false
}

assert.deepEqual(
  resolveWorkflowStatus({ ...defaultState, selectedComparisonActive: true, productMismatch: true }),
  { label: 'Selected Comparison Mode', destination: 'breakdown', actionLabel: 'Review Cost Breakdown' },
  'Selected Comparison status takes priority and routes back to Cost Breakdown'
)

assert.deepEqual(
  resolveWorkflowStatus({ ...defaultState, productMismatch: true }),
  { label: 'Product Mismatch', destination: 'master', actionLabel: 'Review Master Data' },
  'Product mismatch routes to Master Data'
)

assert.deepEqual(
  resolveWorkflowStatus({ ...defaultState, missingData: true, datasetsPrepared: true }),
  { label: 'Missing Data', destination: 'master', actionLabel: 'Review Master Data' },
  'Missing comparison inputs route to Master Data even if both sides were marked prepared'
)

assert.deepEqual(
  resolveWorkflowStatus({ ...defaultState, datasetsPrepared: true }),
  { label: 'Ready for comparison', destination: 'breakdown', actionLabel: 'Open Cost Breakdown' },
  'Prepared datasets route to Cost Breakdown'
)

assert.deepEqual(
  resolveWorkflowStatus(defaultState),
  { label: 'Preparation Incomplete', destination: 'master', actionLabel: 'Review Master Data' },
  'Incomplete preparation routes to Master Data without blocking navigation'
)

console.log('Global workflow status verification passed.')
