import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scriptsDirectory = join(repository, 'scripts')

// Keep the verifier inventory explicit: a new script must be deliberately
// classified before it silently joins the default regression gate.
const verifierFiles = [
  'verify_bom_comparison_view.ts',
  'verify_business_value_integrity.mjs',
  'verify_cbd_audit_fixes.mjs',
  'verify_cbd_comparison_pair.mjs',
  'verify_cbd_numeric_integrity_browser.mjs',
  'verify_cbd_parameter_cost_effect.mjs',
  'verify_cbd_reorder_history.ts',
  'verify_cbd_selected_value_browser.mjs',
  'verify_cbd_summary_ux.ts',
  'verify_clone_lifecycle.mjs',
  'verify_comparison_export.ts',
  'verify_comparison_metadata_numeric_integrity.mjs',
  'verify_comparison_reconciliation.ts',
  'verify_comparison_status_additional_fields.mjs',
  'verify_cost_breakdown_review_feedback.mjs',
  'verify_cost_breakdown_sort.ts',
  'verify_cost_breakdown_view.ts',
  'verify_data_quality.ts',
  'verify_dataset_sizing_and_clone.ts',
  'verify_dataset_sizing_noop.ts',
  'verify_dataset_sizing_preservation.ts',
  'verify_direct_dataset_editing.ts',
  'verify_direct_edit_blue_browser.mjs',
  'verify_exact_decimal_lifecycle_browser.mjs',
  'verify_excel_models_v2.js',
  'verify_excel_validation_round.ts',
  'verify_excel_validation_browser.mjs',
  'verify_global_compact_overlays.mjs',
  'verify_global_header.ts',
  'verify_import_mismatch_export.ts',
  'verify_legacy_active_tab_migration.ts',
  'verify_master_data_clear_dataset.ts',
  'verify_master_data_clone_readiness.ts',
  'verify_master_data_custom_dataset.ts',
  'verify_master_data_direct_edits.ts',
  'verify_master_data_edit_history.ts',
  'verify_master_data_handoff.ts',
  'verify_master_data_issue_navigation_browser.mjs',
  'verify_master_data_mock_load.mjs',
  'verify_master_data_quality_navigation.ts',
  'verify_master_data_rename_and_empty_edit.ts',
  'verify_master_data_reorder_drop_preview.mjs',
  'verify_master_data_row_order.ts',
  'verify_master_data_selected_value.mjs',
  'verify_master_data_spreadsheet_batch.ts',
  'verify_master_data_toolbar_prepare_ux.ts',
  'verify_master_data_ui_state.mjs',
  'verify_missing_work_center_rate.ts',
  'verify_neutral_dataset_workbook.ts',
  'verify_number_fallback_exactness.mjs',
  'verify_numeric_input_browser.mjs',
  'verify_numeric_input.mjs',
  'verify_numeric_integrity.ts',
  'verify_numeric_pair_equivalence.mjs',
  'verify_numeric_value_integrity.ts',
  'verify_page_navigation_persistence.mjs',
  'verify_parameter_simulation_engine.ts',
  'verify_percentage_exact_boundary.mjs',
  'verify_rca_case_domain.ts',
  'verify_rca_handoff.ts',
  'verify_round5_cross_page_browser.mjs',
  'verify_routing_comparison_view.ts',
  'verify_row_drag_selection.ts',
  'verify_row_selection.ts',
  'verify_scenario_business_metrics.ts',
  'verify_scenario_cost_overrides.ts',
  'verify_scenario_input_mapping.ts',
  'verify_scenario_story.ts',
  'verify_scenario_variables.ts',
  'verify_selected_comparison_boundary.ts',
  'verify_selected_comparison_lifecycle.ts',
  'verify_simulation_context.ts',
  'verify_simulation_corrections.ts',
  'verify_simulation_dataset_overrides.ts',
  'verify_simulation_disclosure_browser.mjs',
  'verify_simulation_economics.ts',
  'verify_simulation_history.ts',
  'verify_simulation_override_sidecar_integrity.mjs',
  'verify_simulation_parameter_attribution.mjs',
  'verify_simulation_phase3.ts',
  'verify_simulation_phase4.ts',
  'verify_simulation_regression.mjs',
  'verify_simulation_result.ts',
  'verify_simulation_round4a_layout.mjs',
  'verify_simulation_send_all_history.ts',
  'verify_simulation_story_view.ts',
  'verify_simulation_workspace.ts',
  'verify_sizing_placeholders_ignored.ts',
  'verify_snapshot_bom_detail.ts',
  'verify_snapshot_bridge.ts',
  'verify_snapshot_comparison_dynamic_fields.ts',
  'verify_snapshot_comparison_view.ts',
  'verify_snapshot_full_flow.ts',
  'verify_snapshot_import.ts',
  'verify_snapshot_projection.ts',
  'verify_snapshot_quality.ts',
  'verify_snapshot_routing_detail.ts',
  'verify_snapshot_routing_identity.ts',
  'verify_source_groups.ts',
  'verify_synthetic_review_fixture.ts',
  'verify_ui_correction_pass.mjs',
  'verify_unavailable_added_removed_status.ts',
  'verify_work_center_comparison_view.ts',
  'verify_workflow_status.ts',
  'verify_workspace_initialization.ts'
]

const browserFiles = new Set([
  'verify_cbd_numeric_integrity_browser.mjs',
  'verify_cbd_selected_value_browser.mjs',
  'verify_direct_edit_blue_browser.mjs',
  'verify_exact_decimal_lifecycle_browser.mjs',
  'verify_excel_validation_browser.mjs',
  'verify_master_data_issue_navigation_browser.mjs',
  'verify_master_data_reorder_drop_preview.mjs',
  'verify_master_data_selected_value.mjs',
  'verify_numeric_input_browser.mjs',
  'verify_round5_cross_page_browser.mjs',
  'verify_simulation_disclosure_browser.mjs',
  'verify_simulation_round4a_layout.mjs'
])

const unclassified = readdirSync(scriptsDirectory)
  .filter(name => /^verify_.*\.(?:mjs|ts|js)$/.test(name))
  .filter(name => !verifierFiles.includes(name) && name !== 'verify_excel_models.js' && name !== 'verify_regression_suite.mjs')
assert.deepEqual(unclassified, [], `Classify new verification scripts before running the regression gate: ${unclassified.join(', ')}`)

const missing = verifierFiles.filter(name => !readdirSync(scriptsDirectory).includes(name))
assert.deepEqual(missing, [], `Regression manifest references missing files: ${missing.join(', ')}`)
assert.equal(browserFiles.size, verifierFiles.filter(name => browserFiles.has(name)).length, 'Browser manifest contains a verifier not in the main inventory')

const coreOnly = process.argv.includes('--core-only')
const onlyIndex = process.argv.indexOf('--files')
const onlyFiles = onlyIndex < 0 ? [] : process.argv.slice(onlyIndex + 1).filter(argument => !argument.startsWith('--'))
assert.deepEqual(onlyFiles.filter(name => !verifierFiles.includes(name)), [], `Unknown verifier requested with --files: ${onlyFiles.join(', ')}`)
const selectedFiles = verifierFiles.filter(name =>
  (onlyFiles.length === 0 || onlyFiles.includes(name)) && (!coreOnly || !browserFiles.has(name))
)
const temporaryArtifacts = mkdtempSync(join(tmpdir(), 'costbreakdown-regression-'))
const windowsChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const environment = {
  ...process.env,
  ...(process.env.CHROME_BIN || !existsSync(windowsChrome) ? {} : { CHROME_BIN: windowsChrome }),
  COSTBREAKDOWN_EXCEL_VALIDATION_DIR: join(temporaryArtifacts, 'excel-validation')
}
const results = []
const jiti = join(repository, 'node_modules', 'jiti', 'bin', 'jiti.js')

function commandFor(file) {
  const script = join(scriptsDirectory, file)
  if (file === 'verify_workspace_initialization.ts') {
    return viteSsrCommand(file)
  }
  if (file === 'verify_simulation_economics.ts') {
    return [process.execPath, ['--experimental-strip-types', script]]
  }
  if (file.endsWith('.ts')) {
    return [process.execPath, [jiti, script]]
  }
  return [process.execPath, [script]]
}

function viteSsrCommand(file) {
  const source = `
    import { createServer } from 'vite';
    const vite = await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error',optimizeDeps:{noDiscovery:true,entries:[]}});
    try { await vite.ssrLoadModule('/scripts/${file}'); }
    finally { await vite.close(); }
  `
  return [process.execPath, ['--input-type=module', '-e', source]]
}

function isTypeScriptLoaderFailure(output) {
  return /await is only valid in async functions and the top level bodies of modules|Cannot use 'import\.meta' outside a module|Unexpected token '\{'|Unknown file extension "\.tsx"|ERR_MODULE_NOT_FOUND/.test(output.stderr ?? '')
}

function execute(executable, args) {
  return spawnSync(executable, args, {
    cwd: repository,
    env: environment,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024
  })
}

function statusFor(output) {
  if (output.error) return 'FAIL'
  return output.status === 0 ? 'PASS' : output.status === 2 ? 'BLOCKED' : 'FAIL'
}

function printFailureOutput(result) {
  const diagnostic = [result.stdout, result.stderr].filter(Boolean).join('\n').trimEnd()
  if (!diagnostic) return
  const limit = 1800
  if (diagnostic.length <= limit) {
    console.error(diagnostic)
    return
  }
  console.error(`${diagnostic.slice(0, 1300)}\n... ${diagnostic.length - limit} characters omitted ...\n${diagnostic.slice(-500)}`)
}

try {
  console.log(`Running ${selectedFiles.length} verification scripts sequentially${coreOnly ? ' (core only)' : ' (core + browser)'}.`)
  console.log('The legacy v1 workbook verifier is excluded: its generated root workbooks are absent and no current app path references them.')

  for (const file of selectedFiles) {
    const [executable, args] = commandFor(file)
    let output = execute(executable, args)
    let retriedWithNativeTypeStripping = false
    if (file.endsWith('.ts') && output.status !== 0 && /await is only valid in async functions and the top level bodies of modules|Cannot use 'import\.meta' outside a module/.test(output.stderr ?? '')) {
      output = execute(process.execPath, ['--experimental-strip-types', join(scriptsDirectory, file)])
      retriedWithNativeTypeStripping = true
    }
    if (file.endsWith('.ts') && output.status !== 0 && isTypeScriptLoaderFailure(output)) {
      const [viteExecutable, viteArgs] = viteSsrCommand(file)
      output = execute(viteExecutable, viteArgs)
      retriedWithNativeTypeStripping = true
    }
    const status = statusFor(output)
    const result = {
      file,
      status,
      code: output.status,
      error: output.error,
      stdout: output.stdout ?? '',
      stderr: output.stderr ?? '',
      retriedWithNativeTypeStripping
    }
    results.push(result)
    console.log(`[${status}] ${file}${retriedWithNativeTypeStripping ? ' (native TS fallback)' : ''}${output.status === null && output.error ? `: ${output.error.message}` : ''}`)
  }
} finally {
  rmSync(temporaryArtifacts, { recursive: true, force: true })
}

const passed = results.filter(result => result.status === 'PASS').length
const blocked = results.filter(result => result.status === 'BLOCKED').length
const failed = results.filter(result => result.status === 'FAIL').length
console.log(`Regression summary: ${passed} passed, ${failed} failed, ${blocked} environment-blocked, ${results.length} run.`)

for (const result of results.filter(result => result.status !== 'PASS')) {
  console.error(`\n--- ${result.status}: ${result.file} (exit ${result.code ?? 'spawn error'}) ---`)
  if (result.error) console.error(result.error.stack ?? result.error.message)
  printFailureOutput(result)
}

const failedFiles = results.filter(result => result.status !== 'PASS').map(result => result.file)
if (failedFiles.length > 0) console.error(`Non-passing verifiers: ${failedFiles.join(', ')}`)

if (failed > 0 || blocked > 0) process.exitCode = 1
