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
    resolveNumericWheelStepDirection,
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
  const { formatBusinessNumber, formatFullNumericValue } = await vite.ssrLoadModule('/src/shared/ui/numeric-display.ts')
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
  assert.equal(formatNumericInputValue(12.3456), '12.35', 'display remains two decimal places regardless of stored precision')
  assert.equal(formatNumericInputValue(0.123456), '0.12', 'higher internal precision is not shown as extra display decimals')
  assert.equal(formatNumericInputValue(0.0001), '0.0001', 'small domain-valid Capacity values stay visibly positive')
  assert.equal(formatNumericInputValue(0.25), '0.25', 'adaptive precision does not pad ordinary values')
  assert.equal(formatNumericInputValue(0.0001), '0.0001', 'all shared editors use adaptive display without a field-specific precision exception')
  assert.equal(formatNumericInputValue(3, { integer: true }), '3')

  for (const value of [null, undefined, NaN, Infinity, -Infinity]) {
    assert.equal(formatBusinessNumber(value), '—', 'missing or non-finite values stay unavailable')
    assert.equal(formatFullNumericValue(value), '', 'missing or non-finite values never become Header numbers')
    assert.equal(formatNumericInputValue(value), '', 'unavailable numeric editors stay blank rather than becoming zero')
  }
  const adaptiveExamples = [
    [12.345678, '12.35'], [0.03456, '0.03'], [0.004567, '0.0046'],
    [0.000123, '0.0001'], [0.00003, '3.00e-5'], [0.000001, '1.00e-6'],
    [0, '0.00'], [-0, '0.00'], [-0.004567, '-0.0046'],
    [-0.00003, '-3.00e-5'], [Number.MIN_VALUE, '4.94e-324']
  ]
  for (const [value, expected] of adaptiveExamples) {
    assert.equal(formatBusinessNumber(value), expected, `adaptive presentation of ${value}`)
    assert.equal(formatNumericInputValue(value), expected, 'NumericInput shares the canonical adaptive formatter')
  }
  assert.equal(formatBusinessNumber(0.004567, { percent: true }), '0.0046%')
  assert.equal(formatBusinessNumber(-0.00003, { percent: true }), '-3.00e-5%')
  assert.equal(formatBusinessNumber(0, { percent: true }), '0.00%')
  assert.equal(formatBusinessNumber(3, { integer: true }), '3', 'semantic counts remain whole')
  assert.equal(formatBusinessNumber(0, { integer: true }), '0')
  assert.equal(formatBusinessNumber(1000, { integer: true }), '1000')
  assert.equal(formatBusinessNumber(1e21), '1000000000000000000000.00', 'large ordinary decimal presentation retains two fractional places')
  assert.equal(formatBusinessNumber(Number.MAX_VALUE), `${formatFullNumericValue(Number.MAX_VALUE)}.00`, 'large finite values do not silently change the default decimal policy')
  for (const value of [12.3456789123, 0.00456789123, 1e-7, -1e-7, 1e21, Number.MIN_VALUE, Number.MAX_VALUE]) {
    assert.equal(Number(formatFullNumericValue(value)), value, 'full-value text round trips to exactly the current numeric model')
  }

  assert.equal(isNumericDraftSyntax('12.34'), true)
  assert.equal(isNumericDraftSyntax('12.345'), true, 'decimal input is not limited by display precision')
  assert.equal(isNumericDraftSyntax('12.3456789'), true, 'high-precision decimal input is accepted')
  assert.equal(isNumericDraftSyntax('0.000000123'), true, 'small high-precision decimal input is accepted')
  assert.equal(isNumericDraftSyntax('99.123456789'), true, 'long decimal input is accepted')
  assert.equal(isNumericDraftSyntax('12.3456789', { integer: true }), false, 'semantic integer input remains whole')
  assert.equal(isNumericDraftSyntax('12abc'), false)
  assert.equal(isNumericDraftSyntax('-1', { min: 0 }), false)
  assert.deepEqual(parseNumericDraft(''), { kind: 'blank' })
  assert.deepEqual(parseNumericDraft('12.5'), { kind: 'valid', value: 12.5 })
  assert.deepEqual(parseNumericDraft('12.3456789'), { kind: 'valid', value: 12.3456789 }, 'accepted input keeps its exact model value')
  assert.deepEqual(parseNumericDraft('0.000000123'), { kind: 'valid', value: 0.000000123 }, 'small decimal input keeps its actual value')
  const smallestPositiveDraft = `0.${'0'.repeat(323)}5`
  assert.deepEqual(parseNumericDraft(smallestPositiveDraft, { min: 0, minExclusive: true }), { kind: 'valid', value: Number.MIN_VALUE },
    'smallest positive representable decimal remains valid')

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
  assert.equal(resolveNumericWheelStepDirection(1), 1, 'upward wheel adjustment increments')
  assert.equal(resolveNumericWheelStepDirection(-1), -1, 'downward wheel adjustment decrements')
  assert.equal(stepNumericValue(3, 1, 1, { integer: true }), 4)
  assert.equal(stepNumericValue(3, -1, 1, { integer: true }), 2)
  assert.equal(stepNumericValue(25, 1, 10, { integer: true }), 35, 'integer spinner steps preserve the active tens place')
  assert.equal(stepNumericValue(25, -1, 100, { integer: true }), -75, 'integer spinner steps preserve the active hundreds place')
  assert.equal(stepNumericValue(null, 1, 1, { integer: true, min: 1, max: 200 }), 1)
  assert.equal(stepNumericValue(1, -1, 1, { integer: true, min: 1, max: 200 }), null)
  assert.equal(stepNumericValue(0.25, -1, 1, positiveDecimal), null, 'decrementing across a positive-only lower boundary clears instead of coercing to 0.01')
  assert.equal(stepNumericValue(0.01, -1, 0.01, positiveDecimal), null)
  assert.equal(stepNumericValue(0.0001, -1, 0.0001, positiveDecimal, { stopAtMinimum: true }), 0.0001,
    'Simulation spinner preserves an arbitrarily small positive value at the zero boundary')
  assert.equal(stepNumericValue(Number.MIN_VALUE, -1, 1, positiveDecimal, { stopAtMinimum: true }), Number.MIN_VALUE,
    'Simulation spinner preserves the smallest representable positive value')
  assert.equal(stepNumericValue(0.01, -1, 1, positiveDecimal, { stopAtMinimum: true }), 0.01,
    'Simulation spinner stops before a decrement would cross zero')
  assert.equal(stepNumericValue(null, -1, 0.01, positiveDecimal, { stopAtMinimum: true }), null,
    'an unavailable positive-only value remains unavailable when decreasing')
  assert.equal(stepNumericValue(100, 1, 0.01, { min: 0, max: 100 }), 100)

  for (const [parameter, domain, minimum] of [
    ['Price', { min: 0 }, 0],
    ['Usage', { min: 0 }, 0],
    ['Loss', { min: 0, max: 100 }, 0],
    ['Manning', { min: 0 }, 0],
    ['Capacity', positiveDecimal, 0.01],
    ['Yield', { ...positiveDecimal, max: 100 }, 0.01]
  ]) {
    let value = minimum + 0.02
    for (let count = 0; count < 10; count += 1) {
      value = stepNumericValue(value, -1, 0.01, domain, { stopAtMinimum: true })
      assert.ok(value !== null && value >= minimum, `${parameter} repeated decrement remains calculable`)
    }
    assert.equal(value, minimum, `${parameter} repeated decrement stops at its valid minimum`)
  }

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
  assert.equal(isMasterDataNumericInputValid('loss', 0.12345), true, 'Loss input validation does not impose a decimal-count limit')
  assert.equal(isMasterDataNumericInputValid('consumption', 0), true, 'zero remains valid where the domain permits it')
  assert.equal(isMasterDataNumericInputValid('capacity', 0), false)
  assert.equal(isMasterDataNumericInputValid('capacity', 0.25), true)
  assert.equal(isMasterDataNumericInputValid('capacity', -1), false)
  assert.equal(isMasterDataNumericInputValid('yield', 1), true)
  assert.equal(isMasterDataNumericInputValid('yield', 1.0001), false)
  assert.equal(isMasterDataNumericInputValid('price', 12.3456789), true, 'Price accepts high precision within its domain')
  assert.equal(isMasterDataNumericInputValid('price', -2), false, 'negative Price remains outside its domain')

  const acceptedChanges = filterInvalidMasterDataNumericChanges({ price: -2, consumption: 1.23456789, loss: 0.01234567, note: 'kept' })
  assert.deepEqual(acceptedChanges, { consumption: 1.23456789, loss: 0.01234567, note: 'kept' }, 'paste drops out-of-domain edits while retaining valid high-precision values')
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
  const { createEmptySimulationState, getEffectiveSimulationDataset, setSimulationActiveDataset } = await vite.ssrLoadModule('/src/features/simulation/simulation-state.ts')
  const simulationSources = {
    reference: importedPreciseSnapshot,
    current: importedPreciseSnapshot,
    custom: importedPreciseSnapshot
  }
  const simulationState = createEmptySimulationState(simulationSources)
  assert.equal(updateSimulationParameter(simulationState, simulationSources, 'b1', 'bom.price', -1), simulationState, 'Simulation rejects an invalid negative edit without coercing it')
  assert.equal(updateSimulationParameter(simulationState, simulationSources, 'b1', 'bom.loss', 1.01), simulationState, 'Simulation rejects Loss above 100%')
  assert.equal(updateSimulationParameter(simulationState, simulationSources, 'b1', 'bom.consumption', -0.1), simulationState, 'Simulation rejects negative Usage')
  const currentSimulationState = setSimulationActiveDataset(simulationState, 'current')
  const validSimulationEdit = updateSimulationParameter(currentSimulationState, simulationSources, 'b1', 'bom.price', 12.34)
  assert.equal(getEffectiveSimulationDataset(simulationSources, validSimulationEdit, 'current').snapshot.bom[0].price, 12.34,
    'a valid two-place Current Simulation override is applied as entered')
  const preciseSimulationEdit = updateSimulationParameter(currentSimulationState, simulationSources, 'b1', 'bom.price', 12.3456789)
  assert.equal(getEffectiveSimulationDataset(simulationSources, preciseSimulationEdit, 'current').snapshot.bom[0].price, 12.3456789,
    'Current Simulation stores the full high-precision Price value')
  const preciseUsageEdit = updateSimulationParameter(currentSimulationState, simulationSources, 'b1', 'bom.consumption', 1.23456789)
  assert.equal(getEffectiveSimulationDataset(simulationSources, preciseUsageEdit, 'current').snapshot.bom[0].consumption, 1.23456789,
    'Current Simulation stores high-precision Usage')

  const decimalMarkup = renderToStaticMarkup(React.createElement(NumericInput, { value: 12.5, onValueChange() {}, 'aria-label': 'Price' }))
  const integerMarkup = renderToStaticMarkup(React.createElement(NumericInput, { value: 3, integer: true, onValueChange() {}, 'aria-label': 'Rows' }))
  const preciseMarkup = renderToStaticMarkup(React.createElement(NumericInput, { value: 12.3456789, onValueChange() {}, 'aria-label': 'Precise field' }))
  assert.match(decimalMarkup, /type="text"[^>]*inputMode="decimal"[^>]*role="spinbutton"[^>]*value="12\.50"/)
  assert.match(integerMarkup, /type="text"[^>]*inputMode="numeric"[^>]*role="spinbutton"[^>]*value="3"/)
  assert.match(preciseMarkup, /value="12\.35"/, 'a precise model value renders with two display decimals')
  assert.doesNotMatch(numericInputSource, /precision\s*=\s*2/, 'shared numeric editor has no decimal-place acceptance default')
  assert.doesNotMatch(decimalMarkup + integerMarkup, /data-numeric-stepper|Increase Price|Decrease Price|Increase Rows|Decrease Rows/, 'ordinary numeric editors have no inline visible spinner')
  const headerMarkup = renderToStaticMarkup(React.createElement(NumericInput, {
    value: 12.3456789, onValueChange() {}, showStepper: true, displayMode: 'full', 'aria-label': 'Selected value'
  }))
  assert.match(headerMarkup, /value="12\.3456789"/, 'full Header mode never uses body display rounding')
  assert.match(headerMarkup, /Increase Selected value/, 'editable Header mode exposes its spinner')
  assert.match(headerMarkup, /Decrease Selected value/, 'editable Header mode exposes both stepping directions')
  assert.match(numericInputSource, /parsedPaste\.kind === 'transient'/, 'paste rejects incomplete/zero-prefix drafts instead of bypassing Poka-Yoke')
  assert.match(numericInputSource, /selectionStart[\s\S]*selectionEnd[\s\S]*hasSelection[\s\S]*resolveNumericStepPlace\(raw, hasSelection \? null : selectionStart, domain\)/, 'a non-collapsed selection falls back to the unit place')
  assert.match(numericInputSource, /numericCaretForPlace\(draft, exponent, Boolean\(integer\)\)[\s\S]*setSelectionRange\(caret, caret\)/, 'caret returns to the same place after a step changes digit count')
  assert.match(numericInputSource, /onClick=/, 'inset arrows remain clickable for a single step')
  assert.match(numericInputSource, /if \(document\.activeElement !== input \|\| event\.deltaY === 0 \|\| !canStepRef\.current\) return[\s\S]*event\.preventDefault\(\)[\s\S]*applyStep\(resolveNumericWheelStepDirection\(event\.deltaY\)\)/,
    'focused wheel uses the shared active-place direction and leaves unfocused scrolling alone')
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
