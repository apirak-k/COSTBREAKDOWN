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
  assert.equal(formatNumericInputValue(12.3456), '12.35', 'display remains two decimals regardless of stored precision')
  assert.equal(formatNumericInputValue(0.123456), '0.12', 'higher internal precision is not shown as extra display decimals')
  assert.equal(formatNumericInputValue(0.0001, {}, 4), '0.0001', 'Simulation Capacity minimum stays visibly positive')
  assert.equal(formatNumericInputValue(0.25, {}, 4), '0.25', 'minimum display precision does not pad ordinary values')
  assert.equal(formatNumericInputValue(0.0001), '0.00', 'other NumericInput users keep the existing display rule')
  assert.equal(formatNumericInputValue(3, { integer: true }), '3')

  assert.equal(isNumericDraftSyntax('12.34'), true)
  assert.equal(isNumericDraftSyntax('12.345'), true, 'decimal input is not limited by display precision')
  assert.equal(isNumericDraftSyntax('12.3456789'), true, 'high-precision input is not limited by display precision')
  assert.equal(isNumericDraftSyntax('0.000000123'), true, 'small high-precision decimal input is accepted')
  assert.equal(isNumericDraftSyntax('99.123456789'), true, 'long decimal input is accepted')
  assert.equal(isNumericDraftSyntax('12.3456789', { integer: true }), false, 'semantic integer input remains whole')
  assert.equal(isNumericDraftSyntax('12abc'), false)
  assert.equal(isNumericDraftSyntax('-1', { min: 0 }), false)
  assert.deepEqual(parseNumericDraft(''), { kind: 'blank' })
  assert.deepEqual(parseNumericDraft('12.5'), { kind: 'valid', value: 12.5 })
  assert.deepEqual(parseNumericDraft('12.3456789'), { kind: 'valid', value: 12.3456789 }, 'accepted input keeps its exact model value')
  assert.deepEqual(parseNumericDraft('0.000000123'), { kind: 'valid', value: 0.000000123 }, 'small positive decimal input keeps its actual value')
  const smallestPositiveDraft = `0.${'0'.repeat(323)}5`
  assert.deepEqual(parseNumericDraft(smallestPositiveDraft, { min: 0, minExclusive: true }), { kind: 'valid', value: Number.MIN_VALUE },
    'the smallest positive decimal representable by the number model remains valid')

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
  assert.equal(stepNumericValue(0.3, -1, 0.1), 0.2, 'place steps avoid binary addition artifacts')
  assert.equal(stepNumericValue(12.3456789012345, 1, 0.01), 12.3556789012345,
    'place stepping preserves higher precision digits beyond the stepped decimal place')
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
  assert.equal(stepNumericValue(0.0000001, -1, 1, positiveDecimal, { stopAtMinimum: true }), 0.0000001,
    'Simulation Capacity keeps an arbitrarily small positive value when a decrement would cross zero')
  assert.equal(stepNumericValue(Number.MIN_VALUE, -1, 1, positiveDecimal, { stopAtMinimum: true }), Number.MIN_VALUE,
    'Simulation Capacity preserves the smallest representable positive number at the step boundary')
  assert.equal(stepNumericValue(0.0002, -1, 1, positiveDecimal, { stopAtMinimum: true }), 0.0002,
    'Simulation Capacity does not clamp to a precision-based artificial minimum')
  assert.equal(stepNumericValue(0.01, -1, 1, { ...positiveDecimal, max: 100 }, { stopAtMinimum: true }), 0.01,
    'Simulation Yield preserves the current positive value when a decrement would cross zero')
  assert.equal(stepNumericValue(null, -1, 0.01, positiveDecimal, { stopAtMinimum: true }), null,
    'an unavailable positive-only value remains unavailable when decreasing')
  assert.equal(stepNumericValue(100, 1, 0.01, { min: 0, max: 100 }), 100)

  for (const [parameter, domain, minimum] of [
    ['Price', { min: 0 }, 0],
    ['Usage', { min: 0 }, 0],
    ['Loss', { min: 0, max: 100 }, 0],
    ['Manning', { min: 0 }, 0],
    ['Capacity', { min: 0, minExclusive: true }, 0],
    ['Yield', { min: 0, minExclusive: true, max: 100 }, 0]
  ]) {
    let value = minimum + 0.02
    for (let count = 0; count < 10; count += 1) {
      value = stepNumericValue(value, -1, 0.01, domain, { stopAtMinimum: true })
      assert.ok(value !== null && (minimum === 0 ? value >= minimum : value > minimum), `${parameter} repeated decrement remains calculable`)
    }
    if (parameter === 'Capacity' || parameter === 'Yield') {
      assert.ok(value > 0, `${parameter} decrement stops before crossing its positive-only domain`)
    } else {
      assert.equal(value, minimum, `${parameter} repeated decrement stops at its inclusive minimum`)
    }
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
  const lossPercentInput = parseNumericDraft('1.234567')
  assert.equal(lossPercentInput.kind, 'valid')
  assert.equal(isMasterDataNumericInputValid('loss', lossPercentInput.value / 100), true,
    '1.234567% is stored as the full canonical fraction 0.01234567')
  assert.equal(isMasterDataNumericInputValid('loss', 0.01234567), true, 'high-precision percentage input maps to the canonical stored fraction')
  assert.equal(isMasterDataNumericInputValid('loss', 1.0001), false, 'Loss above 100% remains invalid')
  assert.equal(isMasterDataNumericInputValid('consumption', 0), true, 'zero remains valid where the domain permits it')
  assert.equal(isMasterDataNumericInputValid('capacity', 0), false)
  assert.equal(isMasterDataNumericInputValid('capacity', 0.25), true)
  assert.equal(isMasterDataNumericInputValid('capacity', Number.MIN_VALUE), true, 'the smallest positive Capacity is domain-valid')
  assert.equal(isMasterDataNumericInputValid('capacity', -1), false)
  assert.equal(isMasterDataNumericInputValid('yield', 1), true)
  assert.equal(isMasterDataNumericInputValid('yield', 1.0001), false)
  assert.equal(isMasterDataNumericInputValid('price', 12.3456789), true, 'direct Price edits preserve higher precision')
  assert.equal(isMasterDataNumericInputValid('price', -0.01), false, 'negative Price remains invalid')
  assert.equal(isMasterDataNumericInputValid('yield', 0.000000001), true, 'arbitrarily small positive Yield remains valid in the number model')
  assert.equal(isMasterDataNumericInputValid('yield', 0), false, 'zero Yield remains invalid')

  const acceptedChanges = filterInvalidMasterDataNumericChanges({
    price: -2, consumption: 1.23456789, loss: 0.01234567, yield: 0.99123456789, note: 'kept'
  })
  assert.deepEqual(acceptedChanges, {
    consumption: 1.23456789, loss: 0.01234567, yield: 0.99123456789, note: 'kept'
  }, 'paste keeps high-precision values while dropping only out-of-domain numeric edits')
  const importedPreciseSnapshot = {
    id: 'numeric-input-verifier',
    effectiveDate: '2026-10-11',
    sourceRef: 'numeric-input-verifier',
    status: 'active',
    product: { productCode: 'NUM', productName: 'Numeric fixture', productDescription: 'Numeric fixture', uom: 'pc', customer: '', effectiveDate: '2026-10-11', sellingPrice: null, sgaPercent: null },
    bom: [{ id: 'b1', itemCode: 'b1', description: 'Material', consumption: 1.23456789, unit: 'pc', price: 12.3456789, loss: 0.01234567, confidence: {} }],
    rates: [{ id: 'w1', workCenterCode: 'WC-1', description: 'Work Center', laborRate: 0, burdenRate: 0, effectiveDate: '', confidence: {} }],
    routing: [{ id: 'r1', processName: 'Process', workCenterId: 'WC-1', manning: 1, capacity: 1, yield: 0.9, confidence: {} }]
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
  assert.equal(updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.loss', 1.01), simulationState, 'Simulation rejects Loss above 100%')
  assert.equal(updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.consumption', -0.1), simulationState, 'Simulation rejects negative Usage')
  const validSimulationEdit = updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.price', 12.34)
  assert.equal(validSimulationEdit.snapshot.bom[0].price, 12.34, 'a valid two-place Simulation value is applied as entered')
  const preciseSimulationEdit = updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.price', 12.3456789)
  assert.equal(preciseSimulationEdit.snapshot.bom[0].price, 12.3456789, 'Simulation stores the actual high-precision value')
  const preciseUsageEdit = updateSimulationParameter(simulationState, importedPreciseSnapshot, 'b1', 'bom.consumption', 1.23456789)
  assert.equal(preciseUsageEdit.snapshot.bom[0].consumption, 1.23456789, 'Simulation Usage accepts precision beyond its former four-place gate')
  const tinyCapacityEdit = updateSimulationParameter(simulationState, importedPreciseSnapshot, 'r1', 'routing.capacity', 0.0000001)
  assert.equal(tinyCapacityEdit.snapshot.routing[0].capacity, 0.0000001, 'Simulation accepts an arbitrarily small positive Capacity')

  const decimalMarkup = renderToStaticMarkup(React.createElement(NumericInput, { value: 12.5, onValueChange() {}, 'aria-label': 'Price' }))
  const integerMarkup = renderToStaticMarkup(React.createElement(NumericInput, { value: 3, integer: true, onValueChange() {}, 'aria-label': 'Rows' }))
  const preciseMarkup = renderToStaticMarkup(React.createElement(NumericInput, { value: 12.3456789, onValueChange() {}, 'aria-label': 'Precise field' }))
  assert.match(decimalMarkup, /type="text"[^>]*inputMode="decimal"[^>]*role="spinbutton"[^>]*value="12\.50"/)
  assert.match(integerMarkup, /type="text"[^>]*inputMode="numeric"[^>]*role="spinbutton"[^>]*value="3"/)
  assert.match(preciseMarkup, /value="12\.35"/, 'a precise model value renders with two display decimals')
  assert.doesNotMatch(decimalMarkup + integerMarkup, /Increase Price|Decrease Price|Increase Rows|Decrease Rows/, 'focus-only spinners are not shown in the idle editor')
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
