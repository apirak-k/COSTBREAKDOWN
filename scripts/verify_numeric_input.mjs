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
  const {
    formatNumericInputValue,
    isNumericDraftSyntax,
    numericCaretForPlace,
    parseNumericDraft,
    resolveNumericStepPlace,
    stepNumericValue
  } = await vite.ssrLoadModule('/src/shared/ui/numeric-input-rules.ts')
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
  assert.equal(formatNumericInputValue(12.3456, { precision: 4 }), '12.35', 'display remains two decimal places with a higher-precision input domain')
  assert.equal(formatNumericInputValue(0.123456, { precision: 4 }), '0.12', 'higher internal precision is not shown as extra display decimals')
  assert.equal(formatNumericInputValue(3, { integer: true }), '3')

  assert.equal(isNumericDraftSyntax('12.34'), true)
  assert.equal(isNumericDraftSyntax('12.345'), false, 'decimal input stops at two UI places')
  assert.equal(isNumericDraftSyntax('12.3456', { precision: 4 }), true, 'a higher-precision field still accepts its configured input precision')
  assert.equal(isNumericDraftSyntax('12abc'), false)
  assert.equal(isNumericDraftSyntax('-1', { min: 0 }), false)
  assert.deepEqual(parseNumericDraft(''), { kind: 'blank' })
  assert.deepEqual(parseNumericDraft('12.5'), { kind: 'valid', value: 12.5 })
  assert.deepEqual(parseNumericDraft('12.3456', { precision: 4 }), { kind: 'valid', value: 12.3456 }, 'accepted input keeps its exact model value')
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
  assert.equal(stepNumericValue(25, 1, 10, { integer: true }), 35, 'integer spinner steps preserve the active tens place')
  assert.equal(stepNumericValue(25, -1, 100, { integer: true }), -75, 'integer spinner steps preserve the active hundreds place')
  assert.equal(stepNumericValue(null, 1, 1, { integer: true, min: 1, max: 200 }), 1)
  assert.equal(stepNumericValue(1, -1, 1, { integer: true, min: 1, max: 200 }), null)
  assert.equal(stepNumericValue(0.25, -1, 1, positiveDecimal), null, 'decrementing across a positive-only lower boundary clears instead of coercing to 0.01')
  assert.equal(stepNumericValue(0.01, -1, 0.01, positiveDecimal), null)
  assert.equal(stepNumericValue(100, 1, 0.01, { min: 0, max: 100 }), 100)

  const decimalDraft = '123.45'
  assert.deepEqual(resolveNumericStepPlace(decimalDraft, 0), { exponent: 2, step: 100 }, 'caret on the first digit steps by hundreds')
  assert.deepEqual(resolveNumericStepPlace(decimalDraft, 1), { exponent: 1, step: 10 }, 'caret on the second digit steps by tens')
  assert.deepEqual(resolveNumericStepPlace(decimalDraft, 2), { exponent: 0, step: 1 }, 'caret on the integer units digit steps by units')
  assert.deepEqual(resolveNumericStepPlace(decimalDraft, 3), { exponent: 0, step: 1 }, 'caret on the decimal separator falls back to units')
  assert.deepEqual(resolveNumericStepPlace(decimalDraft, 4), { exponent: -1, step: 0.1 }, 'caret on tenths steps by tenths')
  assert.deepEqual(resolveNumericStepPlace(decimalDraft, 5), { exponent: -2, step: 0.01 }, 'caret on hundredths steps by hundredths')
  assert.deepEqual(resolveNumericStepPlace(decimalDraft, 6), { exponent: -2, step: 0.01 }, 'caret after the last decimal digit uses the last digit place')
  assert.deepEqual(resolveNumericStepPlace(decimalDraft, null), { exponent: 0, step: 1 }, 'a selected range has no single active digit and falls back to units')
  assert.deepEqual(resolveNumericStepPlace('125', 0, { integer: true }), { exponent: 2, step: 100 })
  assert.deepEqual(resolveNumericStepPlace('125', 1, { integer: true }), { exponent: 1, step: 10 })
  assert.deepEqual(resolveNumericStepPlace('125', 2, { integer: true }), { exponent: 0, step: 1 })
  assert.deepEqual(resolveNumericStepPlace('125', 3, { integer: true }), { exponent: 0, step: 1 })
  assert.deepEqual(resolveNumericStepPlace('', 0), { exponent: 0, step: 1 }, 'blank input uses the unit-step fallback')
  assert.deepEqual(resolveNumericStepPlace(decimalDraft, null), { exponent: 0, step: 1 }, 'an unavailable caret uses the unit-step fallback')
  assert.equal(numericCaretForPlace('109.00', 1), 1, 'caret restoration stays on tens after a new digit is added')
  assert.equal(numericCaretForPlace('123.45', -2), 5, 'caret restoration maps a decimal place to its new digit')
  assert.equal(stepNumericValue(190, 1, 100, { integer: true, min: 1, max: 200 }), 200, 'integer active-place increment respects the maximum')
  assert.equal(stepNumericValue(5, -1, 10, { integer: true, min: 1, max: 200 }), null, 'integer active-place decrement preserves lower-bound clear behavior')
  assert.equal(stepNumericValue(null, 1, 0.1, positiveDecimal), 0.1, 'blank positive decimals start at the active valid step')

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
  const { createEmptySimulationState } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const simulationState = {
    ...createEmptySimulationState(),
    sourceRole: 'current',
    snapshot: structuredClone(importedPreciseSnapshot)
  }
  assert.equal(updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.price', -1), simulationState, 'Simulation rejects an invalid negative edit without coercing it')
  assert.equal(updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.loss', 0.0123456), simulationState, 'Simulation rejects pasted precision outside the shared input contract')
  assert.equal(updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.loss', 1.01), simulationState, 'Simulation rejects Loss above 100%')
  assert.equal(updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.consumption', -0.1), simulationState, 'Simulation rejects negative Usage')
  const validSimulationEdit = updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.price', 12.34)
  assert.equal(validSimulationEdit.snapshot.bom[0].price, 12.34, 'a valid two-place Simulation value is applied as entered')

  const decimalMarkup = renderToStaticMarkup(React.createElement(NumericInput, { value: 12.5, onValueChange() {}, 'aria-label': 'Price' }))
  const integerMarkup = renderToStaticMarkup(React.createElement(NumericInput, { value: 3, integer: true, onValueChange() {}, 'aria-label': 'Rows' }))
  const preciseMarkup = renderToStaticMarkup(React.createElement(NumericInput, { value: 12.3456, precision: 4, onValueChange() {}, 'aria-label': 'Precise field' }))
  assert.match(decimalMarkup, /type="text"[^>]*inputMode="decimal"[^>]*role="spinbutton"[^>]*value="12\.50"/)
  assert.match(integerMarkup, /type="text"[^>]*inputMode="numeric"[^>]*role="spinbutton"[^>]*value="3"/)
  assert.match(preciseMarkup, /value="12\.35"/, 'a precise model value renders with two display decimals')
  assert.doesNotMatch(decimalMarkup + integerMarkup, /Increase Price|Decrease Price|Increase Rows|Decrease Rows/, 'focus-only spinners are not shown in the idle editor')
  assert.match(numericInputSource, /parsedPaste\.kind === 'transient'/, 'paste rejects incomplete/zero-prefix drafts instead of bypassing Poka-Yoke')
  assert.match(numericInputSource, /selectionStart[\s\S]*selectionEnd[\s\S]*hasSelection[\s\S]*resolveNumericStepPlace\(raw, hasSelection \? null : selectionStart, domain\)/, 'a non-collapsed selection falls back to the unit place')
  assert.match(numericInputSource, /numericCaretForPlace\(draft, exponent, Boolean\(integer\)\)[\s\S]*setSelectionRange\(caret, caret\)/, 'caret returns to the same place after a step changes digit count')
  assert.match(numericInputSource, /onClick=/, 'inset arrows remain clickable for a single step')
  assert.match(numericInputSource, /applyStep\(event\.deltaY < 0 \? 1 : -1\)/, 'focused wheel uses the shared active-place step')
  assert.match(numericInputSource, /applyStep\(event\.key === 'ArrowUp' \? 1 : -1\)/, 'ArrowUp/Down uses the shared active-place step')
  assert.match(numericInputSource, /className=\{`absolute[^`]*right-[^`]*`\}/, 'arrow controls are positioned inside the input wrapper')
  assert.match(numericInputSource, /onPointerDown=/, 'press-and-hold starts repeat stepping')
  assert.match(numericInputSource, /onPointerUp=/, 'repeat stepping stops on pointer release')
  assert.match(numericInputSource, /onPointerLeave=/, 'repeat stepping stops when the pointer leaves the arrow')
  assert.match(numericInputSource, /onPointerCancel=/, 'repeat stepping stops when pointer input is cancelled')
  assert.match(numericInputSource, /setInterval\(|setTimeout\(/, 'press-and-hold repeats through a timer')
  assert.doesNotMatch(numericInputSource, /spinnerStep|wheelStep|border-l/, 'no fixed spinner/wheel step props or heavy spinner rail remain')

  const appSources = sourceFiles(resolve(process.cwd(), 'src'))
    .map(path => readFileSync(path, 'utf8'))
    .join('\n')
  assert.doesNotMatch(appSources, /<input\b[^>]*\btype\s*=\s*['"]number['"]/s, 'editable application numbers use the shared editor rather than native number inputs')
  assert.doesNotMatch(appSources, /type="number"/, 'no source component opts back into browser-native number controls')

  console.log('Numeric input verification passed')
} finally {
  await vite.close()
}
