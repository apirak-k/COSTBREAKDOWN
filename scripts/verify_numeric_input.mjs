import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, entries: [] }
})

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : /\.[jt]sx?$/.test(entry.name) ? [path] : []
  })
}

try {
  const { formatCurrency, formatNumber, formatParam, formatPercent, formatVariance } = await vite.ssrLoadModule('/src/core/utils/formatters.ts')
  const { formatNumericInputValue, isNumericDraftSyntax, parseNumericDraft, stepNumericValue } = await vite.ssrLoadModule('/src/shared/ui/numeric-input-rules.ts')
  const {
    filterInvalidMasterDataNumericChanges,
    getMasterDataSnapshotValidationErrors,
    isMasterDataNumericInputValid,
    isMasterDataNumericValueValid
  } = await vite.ssrLoadModule('/src/core/utils/master-data-validation.ts')
  const { NumericInput } = await vite.ssrLoadModule('/src/shared/ui/NumericInput.tsx')
  const numericInputSource = readFileSync(resolve(process.cwd(), 'src/shared/ui/NumericInput.tsx'), 'utf8')

  assert.equal(formatNumber(12), '12.00')
  assert.equal(formatNumber(12.5), '12.50')
  assert.equal(formatNumber(12.34), '12.34')
  assert.equal(formatNumber(0), '0.00')
  assert.equal(formatPercent(0.981), '98.10%')
  assert.equal(formatCurrency(12.5), '12.50 THB')
  assert.equal(formatVariance(0), '0.00')
  assert.equal(formatVariance(-12.5), '-12.50')
  assert.equal(formatParam(12.5, false), '12.50')
  assert.equal(formatNumber(3, 0), '3', 'semantic integers retain zero decimal places')
  assert.equal(formatNumericInputValue(12), '12.00')
  assert.equal(formatNumericInputValue(12.5), '12.50')
  assert.equal(formatNumericInputValue(3, { integer: true }), '3')

  assert.equal(isNumericDraftSyntax('12.34'), true)
  assert.equal(isNumericDraftSyntax('12.345'), false, 'decimal input stops at two UI places')
  assert.equal(isNumericDraftSyntax('12abc'), false)
  assert.equal(isNumericDraftSyntax('-1', { min: 0 }), false)
  assert.deepEqual(parseNumericDraft(''), { kind: 'blank' })
  assert.deepEqual(parseNumericDraft('12.5'), { kind: 'valid', value: 12.5 })
  assert.equal(parseNumericDraft('12.345').kind, 'invalid')

  const positiveDecimal = { min: 0, minExclusive: true }
  assert.equal(parseNumericDraft('0', positiveDecimal, true).kind, 'transient')
  assert.equal(parseNumericDraft('0.', positiveDecimal, true).kind, 'transient')
  assert.deepEqual(parseNumericDraft('0.25', positiveDecimal, true), { kind: 'valid', value: 0.25 })
  assert.equal(parseNumericDraft('0.00', positiveDecimal, true).kind, 'transient', 'zero remains uncommitted in an exclusive-positive field')
  assert.equal(parseNumericDraft('0', { integer: true, min: 1 }).kind, 'out-of-domain', 'integer minimum rejects zero immediately')
  assert.equal(parseNumericDraft('100.01', { min: 0, minExclusive: true, max: 100 }).kind, 'out-of-domain')

  assert.equal(stepNumericValue(12.34, 1, 1), 13.34)
  assert.equal(stepNumericValue(12.34, -1, 1), 11.34)
  assert.equal(stepNumericValue(12.34, 1, 0.01), 12.35)
  assert.equal(stepNumericValue(12.34, -1, 0.01), 12.33)
  assert.equal(stepNumericValue(3, 1, 1, { integer: true }), 4)
  assert.equal(stepNumericValue(3, -1, 1, { integer: true }), 2)
  assert.equal(stepNumericValue(null, 1, 1, { integer: true, min: 1, max: 200 }), 1)
  assert.equal(stepNumericValue(1, -1, 1, { integer: true, min: 1, max: 200 }), null)
  assert.equal(stepNumericValue(0.25, -1, 1, positiveDecimal), null, 'decrementing across a positive-only lower boundary clears instead of coercing to 0.01')
  assert.equal(stepNumericValue(0.01, -1, 0.01, positiveDecimal), null)
  assert.equal(stepNumericValue(100, 1, 0.01, { min: 0, max: 100 }), 100)

  assert.equal(isMasterDataNumericValueValid('loss', 0.123456), true, 'canonical values may keep precision beyond display precision')
  assert.equal(isMasterDataNumericInputValid('loss', 0.1234), true, 'two decimal percentage input maps to four internal decimal places')
  assert.equal(isMasterDataNumericInputValid('loss', 0.12345), false)
  assert.equal(isMasterDataNumericInputValid('consumption', 0), true, 'zero remains valid where the domain permits it')
  assert.equal(isMasterDataNumericInputValid('capacity', 0), false)
  assert.equal(isMasterDataNumericInputValid('capacity', 0.25), true)
  assert.equal(isMasterDataNumericInputValid('capacity', -1), false)
  assert.equal(isMasterDataNumericInputValid('yield', 1), true)
  assert.equal(isMasterDataNumericInputValid('yield', 1.0001), false)
  assert.equal(isMasterDataNumericInputValid('price', 2.345), false, 'new direct edits stay within two UI decimals')

  const acceptedChanges = filterInvalidMasterDataNumericChanges({ price: -2, consumption: 0, loss: 0.1234, note: 'kept' })
  assert.deepEqual(acceptedChanges, { consumption: 0, loss: 0.1234, note: 'kept' }, 'Poka-Yoke drops only invalid numeric edits without replacing them')
  const importedPreciseSnapshot = {
    id: 'numeric-input-verifier',
    effectiveDate: '2026-10-11',
    sourceRef: 'numeric-input-verifier',
    status: 'active',
    product: { productCode: 'NUM', productName: 'Numeric fixture', productDescription: 'Numeric fixture', uom: 'pc', customer: '', effectiveDate: '2026-10-11', sellingPrice: null, sgaPercent: null },
    bom: [{ id: 'b1', itemCode: 'b1', description: 'Material', consumption: 1.23456, unit: 'pc', price: 2.34567, loss: 0.0123456, confidence: {} }],
    rates: [],
    routing: []
  }
  assert.deepEqual(getMasterDataSnapshotValidationErrors(importedPreciseSnapshot), [], 'import validation preserves valid source precision rather than rounding data')

  const { updateSimulationParameter } = await vite.ssrLoadModule('/src/features/simulation/simulation-engine.ts')
  const { createEmptySimulationState, simulationFactorId } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const simulationState = {
    ...createEmptySimulationState(),
    sourceRole: 'current',
    snapshot: structuredClone(importedPreciseSnapshot),
    selectedFactors: [simulationFactorId('bom', 'b1')]
  }
  assert.equal(updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.price', -1), simulationState, 'Simulation rejects an invalid negative edit without coercing it')
  assert.equal(updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.loss', 0.0123456), simulationState, 'Simulation rejects pasted precision outside the shared input contract')
  const validSimulationEdit = updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.price', 12.34)
  assert.equal(validSimulationEdit.snapshot.bom[0].price, 12.34, 'a valid two-place Simulation value is applied as entered')

  const decimalMarkup = renderToStaticMarkup(React.createElement(NumericInput, { value: 12.5, onValueChange() {}, 'aria-label': 'Price' }))
  const integerMarkup = renderToStaticMarkup(React.createElement(NumericInput, { value: 3, integer: true, onValueChange() {}, 'aria-label': 'Rows' }))
  assert.match(decimalMarkup, /type="text"[^>]*inputMode="decimal"[^>]*role="spinbutton"[^>]*value="12\.50"/)
  assert.match(integerMarkup, /type="text"[^>]*inputMode="numeric"[^>]*role="spinbutton"[^>]*value="3"/)
  assert.doesNotMatch(decimalMarkup + integerMarkup, /Increase Price|Decrease Price|Increase Rows|Decrease Rows/, 'focus-only spinners are not shown in the idle editor')
  assert.match(numericInputSource, /parsedPaste\.kind === 'transient'/, 'paste rejects incomplete/zero-prefix drafts instead of bypassing Poka-Yoke')

  const appSources = sourceFiles(resolve(process.cwd(), 'src'))
    .map(path => readFileSync(path, 'utf8'))
    .join('\n')
  assert.doesNotMatch(appSources, /<input\b[^>]*\btype\s*=\s*['"]number['"]/s, 'editable application numbers use the shared editor rather than native number inputs')
  assert.doesNotMatch(appSources, /type="number"/, 'no source component opts back into browser-native number controls')

  console.log('Numeric input verification passed')
} finally {
  await vite.close()
}
