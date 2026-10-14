import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  formatProductIdentityForDisplay,
  resolveHeaderProductContext,
  resolveProductComparisonDisplayStatus
} from '../src/shared/layout/header-product-context.ts'

const matchingReference = { productName: ' RGOM024 ', uom: ' PC ' }
const matchingCurrent = { productName: 'RGOM024', uom: 'PC' }

assert.equal(resolveHeaderProductContext(matchingCurrent), 'RGOM024 (PC)')
assert.equal(
  resolveHeaderProductContext({ productName: 'RGOM025', uom: 'PC' }),
  'RGOM025 (PC)',
  'the Header shows Current identity even when Reference and Current differ'
)
assert.equal(
  resolveHeaderProductContext({ productName: 'RGOM024', uom: 'EA' }),
  'RGOM024 (EA)',
  'the Header shows Current UOM even when it differs from Reference'
)
assert.equal(
  resolveHeaderProductContext({ productName: 'rgom024', uom: 'pc' }),
  'rgom024 (pc)',
  'the Header preserves Current identity text as entered'
)
assert.equal(
  resolveHeaderProductContext({ productName: '', uom: 'PC' }),
  'Product name not set (PC)',
  'a missing name is described without fabricating a Product value'
)
assert.equal(
  resolveHeaderProductContext({ productName: 'RGOM024', uom: null }),
  'RGOM024 (UOM not set)',
  'a missing UOM is described without fabricating a UOM value'
)
assert.equal(resolveHeaderProductContext({ productName: '', uom: '' }), 'Product Not Set')
assert.equal(resolveProductComparisonDisplayStatus(matchingReference, matchingCurrent), 'match')
assert.equal(resolveProductComparisonDisplayStatus(matchingReference, { productName: 'RGOM025', uom: 'PC' }), 'mismatch')
assert.equal(resolveProductComparisonDisplayStatus({ productName: '', uom: '' }, { productName: '', uom: '' }), 'not-set')
assert.equal(formatProductIdentityForDisplay({ productName: '', uom: '' }), 'Not set')
assert.equal(formatProductIdentityForDisplay({ productName: 'RGOM024', uom: null }), 'RGOM024 (UOM not set)')

const navbar = readFileSync(resolve(process.cwd(), 'src/shared/layout/Navbar.tsx'), 'utf8')
assert.match(navbar, /COSTBREAKDOWN/)
assert.match(navbar, /text-base font-bold tracking-tight text-slate-100/)
assert.match(navbar, /aria-current=\{isActive \? 'page' : undefined\}/)
assert.match(navbar, /toggleMasterDataPrepareDataset/)
assert.match(navbar, /lg:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/)
assert.match(navbar, /Main navigation[\s\S]*justify-center[\s\S]*aria-label="Workspace utilities"[\s\S]*aria-label="Undo"[\s\S]*aria-label="Redo"[\s\S]*aria-label="Prepare Dataset"/)
assert.doesNotMatch(navbar, /role="search"|Search data|Search,/)
assert.doesNotMatch(navbar, /disabled:cursor-not-allowed/)
assert.doesNotMatch(navbar, /resolveWorkflowStatus|Candidate \/ RCA|workflowStatus|Selected Comparison/)
assert.equal((navbar.match(/label: '(?:Master Data|Cost Breakdown|Simulation)'/g) ?? []).length, 3,
  'Global Header exposes exactly three primary navigation tabs')

const headerZones = [
  navbar.indexOf('>COSTBREAKDOWN</span>'),
  navbar.indexOf('<nav aria-label="Main navigation"'),
  navbar.indexOf('aria-label="Workspace utilities"'),
  navbar.indexOf('aria-label="Undo"'),
  navbar.indexOf('aria-label="Redo"'),
  navbar.indexOf('aria-label="Prepare Dataset"')
]
assert.ok(headerZones.every((position, index) => position >= 0 && (index === 0 || position > headerZones[index - 1])),
  'Header keeps brand/context left, navigation centered, and Undo/Redo immediately before Info on the right')

console.log('Global Header contract verification passed')
