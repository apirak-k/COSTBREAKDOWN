import { createServer } from 'vite'

// Legacy suites import extensionless TypeScript modules through the application's Vite resolver.
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, entries: [] } })
try {
  for (const suite of [
    'verify_row_selection',
    'verify_row_drag_selection',
    'verify_simulation_corrections',
    'verify_simulation_phase4',
    'verify_simulation_phase3',
    'verify_simulation_result',
    'verify_simulation_story_view',
    'verify_cbd_summary_ux',
    'verify_cbd_reorder_history',
    'verify_cost_breakdown_sort',
    'verify_cost_breakdown_view',
    'verify_simulation_dataset_overrides',
    'verify_simulation_economics',
    'verify_simulation_history',
    'verify_simulation_workspace',
    'verify_simulation_context',
    'verify_parameter_simulation_engine',
    'verify_scenario_cost_overrides',
    'verify_master_data_edit_history',
    'verify_global_header'
  ]) {
    await vite.ssrLoadModule(`/scripts/${suite}.ts`)
  }
} finally {
  await vite.close()
}
