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
assert.match(navbar, /placeholder="Search data\.\.\."/)
assert.match(navbar, /aria-current=\{isActive \? 'page' : undefined\}/)
assert.match(navbar, /requestMasterDataPrepareDataset/)
assert.match(navbar, /lg:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/)
assert.match(navbar, /Main navigation[\s\S]*justify-center[\s\S]*role="search"[\s\S]*aria-label="Prepare Dataset"/)
assert.doesNotMatch(navbar, /disabled:cursor-not-allowed/)
assert.doesNotMatch(navbar, /resolveWorkflowStatus|Candidate \/ RCA|workflowStatus|Selected Comparison/)

const headerZones = [
  navbar.indexOf('aria-label="Page edit tools"'),
  navbar.indexOf('>COSTBREAKDOWN</span>'),
  navbar.indexOf('<nav aria-label="Main navigation"'),
  navbar.indexOf('role="search"'),
  navbar.indexOf('aria-label="Prepare Dataset"')
]
assert.ok(headerZones.every((position, index) => position >= 0 && (index === 0 || position > headerZones[index - 1])),
  'desktop Header regions follow left utilities, centered navigation, and right search/info order')

console.log('Global Header contract verification passed')
