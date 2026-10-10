import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveHeaderProductContext } from '../src/shared/layout/header-product-context'

const matchingReference = { productName: ' RGOM024 ', uom: ' PC ' }
const matchingCurrent = { productName: 'RGOM024', uom: 'PC' }

assert.equal(resolveHeaderProductContext(matchingReference, matchingCurrent), 'RGOM024 (PC)')
assert.equal(
  resolveHeaderProductContext(matchingReference, { productName: 'RGOM025', uom: 'PC' }),
  'Product (Unit)',
  'a product mismatch uses the neutral header fallback'
)
assert.equal(
  resolveHeaderProductContext(matchingReference, { productName: 'RGOM024', uom: 'EA' }),
  'Product (Unit)',
  'a unit mismatch uses the neutral header fallback'
)
assert.equal(
  resolveHeaderProductContext(matchingReference, { productName: 'rgom024', uom: 'pc' }),
  'RGOM024 (PC)',
  'normalized matching product details can safely share the Header context'
)
assert.equal(
  resolveHeaderProductContext({ productName: '', uom: 'PC' }, { productName: '', uom: 'PC' }),
  'Product (Unit)',
  'blank metadata never displays a fabricated Product or UOM value'
)
assert.equal(
  resolveHeaderProductContext({ productName: 'RGOM024', uom: null }, { productName: 'RGOM024', uom: null }),
  'Product (Unit)',
  'missing UOM uses the neutral header fallback'
)

const navbar = readFileSync(resolve(process.cwd(), 'src/shared/layout/Navbar.tsx'), 'utf8')
assert.match(navbar, /COSTBREAKDOWN/)
assert.match(navbar, /text-sm font-semibold tracking-wide text-slate-100/)
assert.match(navbar, /aria-current=\{isActive \? 'page' : undefined\}/)
assert.match(navbar, /requestMasterDataPrepareDataset/)
assert.match(navbar, /lg:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/)
assert.match(navbar, /Main navigation[\s\S]*justify-center[\s\S]*aria-label="Workspace utilities"[\s\S]*aria-label="Undo"[\s\S]*aria-label="Redo"[\s\S]*aria-label="Prepare Dataset"/)
assert.doesNotMatch(navbar, /role="search"|Search data|Search,/)
assert.doesNotMatch(navbar, /disabled:cursor-not-allowed/)
assert.doesNotMatch(navbar, /resolveWorkflowStatus|Candidate \/ RCA|workflowStatus|Selected Comparison/)
assert.equal((navbar.match(/label: '(?:Master Data|Cost Breakdown|Candidate|Simulation)'/g) ?? []).length, 4,
  'Global Header exposes exactly four primary navigation tabs')

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
