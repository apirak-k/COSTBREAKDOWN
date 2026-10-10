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
assert.match(navbar, /placeholder="Search data\.\.\."/)
assert.match(navbar, /aria-current=\{isActive \? 'page' : undefined\}/)
assert.match(navbar, /requestMasterDataPrepareDataset/)
assert.doesNotMatch(navbar, /resolveWorkflowStatus|Candidate \/ RCA|workflowStatus|Selected Comparison/)

console.log('Global Header contract verification passed')
