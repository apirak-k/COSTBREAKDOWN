## Current checkpoint — Round 4B final numeric-value integrity pass — 2026-10-24

- **Status:** Implementation and internal verification complete; **AWAITING EXTERNAL AUDIT**. Round 4B remains open. No merge occurred and Round 5 was not started. This checkpoint supersedes the prior current checkpoint for numeric-value integrity.
- **Branch / checkout:** `feat/selected-value-ux` / `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`.
- **Starting checkpoint:** local and fetched remote HEAD were `c10f5c4` (`docs: record Round 4B corrective push receipt`) before this pass; fetch and recheck the branch before delivery.
- **Root cause:** exact editor/import text was not consistently carried through the paired-model/snapshot/session bridge or consumed by downstream calculations. Several calculation paths operated on binary `Number` intermediates, model Loss/Yield fractions could be mistaken for percentage-point sidecars, and no-sidecar machine residue could be mistaken for intended precision. The exact decimal lifecycle browser verifier also selected a pre-focus formatted draft immediately after Save; its replacement helper now waits for editor hydration before typing.
- **Implementation:** base-10 `BigInt` decimal arithmetic uses exact decimal sidecars whenever present and keeps the existing `number` as the compatibility projection. No-sidecar values use only the narrow two-ULP cleanup already used by numeric editing; exact input/import lexemes take precedence, saved state is not rewritten, and tiny nonzero values remain distinct from zero. Loss/Yield editor sidecars are percentage points while model numbers are fractions; conversion occurs only for a present sidecar. Sidecars now survive paired-model/snapshot/session projection, CBD and Simulation consume exact inputs, and XLSX import/export reads/writes raw decimal lexemes while retaining numeric cell type and styles.
- **Required behavior preserved:** UI presentation remains display-only. Existing formulas, numeric domains, role/history ownership, keyboard behavior, CBD percentage spacing, and Selected Value behavior were not changed as part of the numeric correction.
- **Focused and existing verification:**
  - `node_modules/.bin/jiti scripts/verify_numeric_value_integrity.ts` — **PASS**.
  - `node scripts/verify_numeric_input.mjs` — **354/354 PASS**; `node scripts/verify_numeric_input_browser.mjs` — **2,367/2,367 PASS**.
  - `node scripts/verify_exact_decimal_lifecycle_browser.mjs` — **40 assertions PASS**, including direct entry, paste, blur/refocus, Save/Reset, sub-Number-precision stepping, Undo/Redo, session/product reconstruction, and presentation-only formatting.
  - `node scripts/verify_master_data_selected_value.mjs` — **168/168 PASS**, no browser warnings; `node scripts/verify_cbd_selected_value_browser.mjs` — **306/306 PASS** across 1440/1024/768/390/320px; `node scripts/verify_simulation_round4a_layout.mjs --selected-value-only` — **70/70 PASS**. The last command used the pre-existing user-edited verifier; that file is excluded from this pass's commit.
  - `npx tsx scripts/verify_snapshot_comparison_dynamic_fields.ts`, `npx tsx scripts/verify_simulation_story_view.ts`, and `git diff --check` — **PASS**.
  - `node_modules/.bin/jiti scripts/verify_master_data_edit_history.ts`, `node_modules/.bin/jiti scripts/verify_snapshot_bridge.ts`, `node_modules/.bin/jiti scripts/verify_dataset_sizing_and_clone.ts`, and `node_modules/.bin/jiti scripts/verify_parameter_simulation_engine.ts` — **PASS**.
  - `node_modules/.bin/jiti scripts/verify_snapshot_import.ts`, `node_modules/.bin/jiti scripts/verify_import_mismatch_export.ts`, `node_modules/.bin/jiti scripts/verify_master_data_spreadsheet_batch.ts`, `node_modules/.bin/jiti scripts/verify_scenario_business_metrics.ts`, `node_modules/.bin/jiti scripts/verify_scenario_cost_overrides.ts`, `npx tsx scripts/verify_snapshot_bom_detail.ts`, `npx tsx scripts/verify_snapshot_routing_detail.ts`, `npx tsx scripts/verify_simulation_economics.ts`, and `node --experimental-strip-types scripts/verify_simulation_history.ts` — **PASS**.
  - `npx tsc -p tsconfig.json --noEmit --pretty false` and `npm run build` — **PASS**. Build retains the existing ExcelJS / fast-csv browser-externalization notices and the >500 kB chunk warning. `node scripts/verify_simulation_regression.mjs` — **PASS**; its existing Vite WebSocket port `24678`-in-use messages did not prevent completion.
- **Known limitation:** calculations project back to the existing JavaScript `number` interface, so final persisted/output values cannot expose distinctions smaller than that projection unless the owning exact sidecar is retained. Non-terminating decimal divisions use 80 significant decimal digits before projection. No input digits are truncated. External human audit remains required before Round 4B can close.
- **Implementation commit / pushed remote receipt:** record the implementation SHA and fetched `origin/feat/selected-value-ux` SHA in the documentation-only receipt after the implementation commit is pushed.
- **Files in this pass:** `HANDOFF.md`; `docs/PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md`, `docs/REQUIREMENTS_INDEX.md`, `docs/specs/COST_BREAKDOWN.md`, `docs/specs/CROSS_CUTTING.md`, `docs/specs/MASTER_DATA.md`, `docs/specs/SIMULATION.md`; `scripts/fixtures/exact-decimal-browser.tsx`, `scripts/verify_dataset_sizing_and_clone.ts`, `scripts/verify_exact_decimal_lifecycle_browser.mjs`, `scripts/verify_master_data_edit_history.ts`, `scripts/verify_numeric_input_browser.mjs`, `scripts/verify_numeric_value_integrity.ts`, `scripts/verify_parameter_simulation_engine.ts`, `scripts/verify_snapshot_bridge.ts`; `src/core/calculations/parameter-cost-effect.ts`, `src/core/calculations/scenario-business.ts`, `src/core/calculations/snapshot-bom-detail.ts`, `src/core/calculations/snapshot-comparison.ts`, `src/core/calculations/snapshot-cost.ts`, `src/core/calculations/snapshot-routing-detail.ts`; `src/core/migrations/paired-model-to-snapshots.ts`, `src/core/migrations/snapshot-to-session.ts`; `src/core/types/cost.types.ts`, `src/core/types/product.types.ts`, `src/core/types/scenario.types.ts`, `src/core/types/snapshot.types.ts`; `src/core/utils/exact-decimal.ts`, `src/core/utils/index.ts`; `src/features/cost-breakdown/components/BOMDetailedTable.tsx`, `src/features/cost-breakdown/components/RoutingDetailedTable.tsx`, `src/features/simulation/SimulationPage.tsx`, `src/features/simulation/simulation-economics.ts`, `src/features/simulation/simulation-engine.ts`; `src/services/excel/exact-numeric-cells.ts`, `src/services/excel/excel-parser.ts`, `src/services/excel/snapshot-export.ts`, `src/services/excel/snapshot-parser.ts`; `src/shared/ui/numeric-display.ts`. The pre-existing dirty `scripts/verify_simulation_round4a_layout.mjs` is intentionally excluded.

## Current checkpoint — Round 4B numeric editor / keyboard / CBD spacing correction — 2026-10-24

- **Status:** `CORRECTIVE IMPLEMENTATION COMPLETE / VERIFICATION RESULTS RECORDED / AWAITING EXTERNAL AUDIT`. Round 4B remains open. No merge occurred and Round 5 was not started.
- **Branch / checkout:** `feat/selected-value-ux` / `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`.
- **Starting local and fetched remote HEAD:** `1e1bf2d7ca77ff223132c4ac8ee0af734fb11f91`; they matched before this pass.
- **User-approved requirements:** with an owning exact decimal string, focused editing preserves intentional precision; without one, Number-reconstructed editor drafts must not expose narrow floating-point residue as business precision, while meaningful precision and tiny nonzero values survive. Editable numeric fields own Left/Right caret movement and Up/Down caret-place stepping; Tab/Shift+Tab and supported grid Enter/Shift+Enter retain their navigation contract. Cost Breakdown BOM Loss and Routing Yield presentations use a consistent number-to-percent-suffix rhythm in the main rows and expanded Before/After details.
- **Implementation details:** `formatFocusedNumericValue` cleans a Number fallback only when a materially shorter decimal is within two representable Number steps; it does not write the cleaned draft on focus. Exact strings remain authoritative, and prop-only exact-value transition tracking lets removal of a sidecar rebuild the fallback without mistaking the component's own emitted draft for an external prop change. Editable NumericInput stops ArrowLeft/Right propagation while preserving native caret behavior; the Master Data grid hook also leaves editable numeric arrow keys to the editor. CBD Loss uses a centered narrower percentage slot in the existing cell; table columns, shared numeric axes, formatting, and calculations are unchanged. The slot ratio is an implementation choice, not a product measurement.
- **Verifier details:** the NumericInput unit verifier covers residue, exact strings, imported/no-sidecar values, tiny values, and stepping; browser verifiers cover exact prop removal, blur/refocus, percentage conversion, physical key input, Master Data price/loss and Simulation parameters. The CBD verifier accumulates failures through desktop and responsive viewports and checks main and expanded Loss/Yield suffix presentation. The pre-existing user-edited `scripts/verify_simulation_round4a_layout.mjs` was used for its requested selected-value-only run and is intentionally excluded from this commit.
- **Verification:** `node scripts/verify_numeric_input.mjs` **354/354 PASS**; `node scripts/verify_numeric_input_browser.mjs` **2367/2367 PASS**; `node scripts/verify_exact_decimal_lifecycle_browser.mjs` **38/38 PASS**; `node scripts/verify_master_data_selected_value.mjs` **168/168 PASS**, no browser warnings; `node scripts/verify_cbd_selected_value_browser.mjs` **306/306 PASS** across 1440/1024/768/390/320px; `node scripts/verify_simulation_round4a_layout.mjs --selected-value-only` **70/70 PASS**; `npx tsx scripts/verify_simulation_story_view.ts` **PASS**; `node scripts/verify_simulation_regression.mjs` **exit 0**; `node_modules/.bin/jiti scripts/verify_master_data_spreadsheet_batch.ts`, `npx tsx scripts/verify_master_data_edit_history.ts`, `node_modules/.bin/jiti scripts/verify_snapshot_import.ts`, `node_modules/.bin/jiti scripts/verify_import_mismatch_export.ts`, and `node --experimental-strip-types scripts/verify_simulation_history.ts` **PASS**; `npx tsc --noEmit --pretty false`, `npm run build`, and `git diff --check` **PASS**. Build retains existing ExcelJS / fast-csv browser-externalization notices and the >500 kB chunk warning. Simulation regression printed Vite WebSocket port `24678`-in-use messages but completed successfully. No intermittent React hook warning appeared in the final Master Data browser run.
- **CBD investigation:** the first complete post-change pass still failed the five Loss/Yield spacing comparisons (one at each viewport); continuing the verifier exposed no other failure. The measured cause was the wider Loss table cell giving its full-width numeric slot a farther suffix position than Routing Yield. The centered local Loss slot correction makes the full five-viewport run pass. No pixel gap was added as a requirement.
- **Final scope audit:** no formula, calculation, business domain, persistence semantics, dataset lifecycle, role behavior, or History ownership changed. Keyboard changes apply to editable numeric controls; nonnumeric text caret behavior, native select arrows, grid range behavior outside numeric editing, and existing wheel direction behavior remain. Accepted Round 4B graph/search fixes remain intact. No global direct-edit blue-value indicator or Round 5 work was started; wheel direction was not changed speculatively.
- **Files in this pass:** `src/shared/ui/numeric-display.ts`, `src/shared/ui/NumericInput.tsx`, `src/features/master-data/hooks/useTableKeyboardNav.ts`, `src/features/cost-breakdown/components/CandidateFindingsTable.tsx`, `src/features/cost-breakdown/components/BOMDetailedTable.tsx`; the directly related verifiers/fixture `scripts/verify_numeric_input.mjs`, `scripts/verify_numeric_input_browser.mjs`, `scripts/verify_exact_decimal_lifecycle_browser.mjs`, `scripts/fixtures/exact-decimal-browser.tsx`, `scripts/verify_master_data_selected_value.mjs`, and `scripts/verify_cbd_selected_value_browser.mjs`; `docs/specs/CROSS_CUTTING.md`, `docs/specs/MASTER_DATA.md`, `docs/specs/COST_BREAKDOWN.md`, this checkpoint, and the Phase 2 plan.
- **Implementation commit:** `67baf4b896c1d04d10c6c380e4249dd32eddf23f` (`fix: reconcile numeric editor precision and navigation`), pushed to `origin/feat/selected-value-ux`. Immediately after the implementation push, a fresh fetch confirmed that remote HEAD matched this commit; this documentation-only receipt records the verified delivery.
- **Not checked:** external human visual audit, Firefox/Safari, touch hardware, and assistive technology behavior. External audit remains required before closing Round 4B.

---

## Current checkpoint — Round 4B mouse-pin and Simulation Search focus correction — 2026-10-24

- **Status:** `IMPLEMENTED / TARGETED VERIFICATION PASSED / COMMITTED / PUSHED / AWAITING EXTERNAL AUDIT`. Round 4B remains open. No merge occurred and Round 5 was not started.
- **Branch / checkout:** `feat/selected-value-ux` / `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`.
- **Starting local and fetched remote HEAD:** `a2367651a13c0173bb9b32e80f8d04a742a2ae8e`; local and fetched remote matched before edits.
- **Implementation commit:** `896a84c58ecb785e3efdd8522427831da5a3ef86` (`fix: reconcile round 4b pointer and search focus`), pushed to `origin/feat/selected-value-ux`.
- **User-approved requirements:** after pointer pin, SVG numbers show the Pin fill without a mouse-induced outline; keyboard Tab focus remains visible and Enter/Space still Pin/Unpin. Simulation BOM/Routing footer Search uses the same blue-border/blue-ring family as Master Data while keeping its existing compact geometry, clear control, and footer/navigation layout.
- **Implementation details:** mouse pointer-down prevents the SVG text's native focus and blurs an existing mouse-target focus; keyboard focus handlers and key behavior remain. Simulation Search changes only the ring color from `blue-100` to `blue-700`. The 24px field and footer layout remain unchanged.
- **Verifier details:** `scripts/verify_simulation_round4a_layout.mjs --selected-value-only` now checks actual mouse-click computed focus/outline, pin fill/`aria-pressed`/SVG background stroke, mouse click after keyboard focus, and separately proves Tab/Space/Enter. It compares live Master Data and Simulation Search computed border/ring styles and measures input/footer/navigation geometry, clear hover hit-testing, text clearance, and clear-then-refocus. Those measurements and tolerances are verifier details, not additional product requirements.
- **Verification:** Round 4B browser checks **78/78 PASS**, including the unchanged desktop 50/50 upper split and divider alignment. `npx tsx scripts/verify_simulation_story_view.ts` **PASS**. `node scripts/verify_numeric_input.mjs` **344/344 PASS**. `node scripts/verify_simulation_regression.mjs` **exit 0** across Simulation, Cost Breakdown, Master Data, comparison, and history suites; it emitted existing nested Vite WebSocket port `24678`-in-use messages. `npx tsc --noEmit --pretty false`, `npm run build`, and `git diff --check` **PASS**. Build retains existing ExcelJS/fast-csv browser externalization notices and the >500 kB chunk warning.
- **Master Data browser variance:** one `node scripts/verify_master_data_selected_value.mjs` run completed 160 assertions and failed only its final browser-warning guard after collecting React `Invalid hook call` warnings in `AppProvider`; an immediate isolated rerun passed **161/161** with no warnings. No out-of-scope code was changed to suppress the intermittent warning. The separate NumericInput browser verifier was not rerun in this pass; its previous recorded result was one **2358/2358** pass and one rerun that reached all assertions but failed the same final warning guard.
- **Known CBD baseline failure:** `node scripts/verify_cbd_selected_value_browser.mjs` again stopped at the known 1440px Loss/Yield spacing check: BOM Loss gap **30.671875px** vs Routing Yield gap **29.103516px**. The same values were measured on the unchanged starting commit in the earlier baseline comparison; no Cost Breakdown files changed. The verifier fails fast, so later responsive assertions did not run. This is not a regression from this pass and the full CBD verifier is not green.
- **Files changed:** `src/features/simulation/SimulationStoryGraph.tsx`, `src/features/simulation/SimulationPage.tsx`, `scripts/verify_simulation_round4a_layout.mjs`, `docs/specs/SIMULATION.md`, and this checkpoint. The only requirement added to the spec is the user's new Search focus decision; CSS behavior and numeric checks remain implementation/verifier details.
- **Not checked:** human external visual audit, Firefox/Safari, touch hardware, and screen-reader behavior. External audit remains required before closing Round 4B.

---

## Previous Round 4B corrective checkpoint — historical and superseded by the audit — 2026-10-24

The following checkpoint records the prior pushed implementation. Its internal verifier checked the SVG background stroke but not the SVG text's computed/global outline; the subsequent external audit found the mouse focus ring still present. This is the specific gap corrected above.

- **Status at that checkpoint:** `IMPLEMENTED / TARGETED SIMULATION VERIFICATION PASSED / PUSHED / AWAITING EXTERNAL AUDIT`. Round 4B remained open.
- **Branch / checkout:** `feat/selected-value-ux` / `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`.
- **Starting local and fetched remote HEAD for that pass:** `25d0777f1682a382d50e1a6d92892bf9035af6d9`; both matched before edits.
- **Corrective scope:** Simulation Result and Economic outputs, editable BOM Price / Usage / Loss and Routing Manning / Capacity / Yield, read-only costs and Parameter Cost Effects (desktop and mobile), Footer Reference Standard Cost / Current Standard Cost / Net Gap, and visible Story Graph numeric labels and Y-axis ticks use shared Selected Value behavior. Editable sources keep the existing NumericInput writer, exact-value behavior, domain, percentage conversion, and Simulation history ownership.
- **Graph presentation:** selection identities include product/graph context and current values/scale; disappearing labels clear stale preview/pin state. SVG backgrounds hug measured text bounds, ignore pointer events, and retain semantic text colors. Numeric graph label tooltips show context only with a cancellable 350ms dwell; data-mark tooltips retain their existing content with the same dwell. GAP category text is not interactive and has no tooltip. Exact SVG coordinates, viewBox dimensions, and category spacing are implementation details, not finalized requirements.
- **Corrective presentation:** desktop `xl` upper workspace is split 50/50 between the Story Graph and the complete right workspace (Result/Break-even plus Business/Economic), aligned with the lower BOM/Routing divider. Graph bar widths and numeric label type size remain unchanged, and the desktop overlap check passes. Favorable Simulation outcomes use readable green, unfavorable use red, zero is neutral, and Selected Value states preserve semantic foreground. Footer dark surfaces retain contrasting hover/pin backgrounds; SG&A displays `%`; Outcome reads **Break-even Quantity**.
- **Boundaries:** calculation/business rules, data, role selection, persistence, writers, domains, and history semantics were unchanged. No merge or Round 5 work. Implementation commit `b796fcaf3280e4ec721786c9f27578ca78fa2275` was pushed; Round 4B remained open pending external audit.
- **Verification at that checkpoint:** Round 4B Selected Value browser checks **70/70 PASS**; visible-totals/graph fixture **67/67 PASS**; NumericInput unit **344/344 PASS**; Master Data selected-value browser **161/161 PASS**; Simulation regression, TypeScript, production build, and `git diff --check` passed. Its separate NumericInput browser warning variance and the known CBD spacing failure are recorded in that checkpoint's history.
- **Not checked then:** human external visual audit and cross-browser behavior outside the Chrome runs. That checkpoint did not close Round 4B.

---

# Phase 2 Round 4B Implementation — 2026-10-24

- **Status:** `IMPLEMENTED / INTERNAL VERIFICATION PASSED / AWAITING EXTERNAL AUDIT`.
- **Branch / worktree:** `feat/selected-value-ux` / `E:\COSTBREAKDOWN\.worktrees\SIMULATION-FINALIZED`.
- **Starting local and remote HEAD:** `bda01edddcef4d14b75ca318974a64570db32647`.
- **Gate:** the pre-Round-4B corrective pass is externally accepted and closed; human visual acceptance passed. This implementation is Round 4B only; it does not close Round 4.
- **Integration:** Simulation Result Before/After/Change/% finite values use shared read-only `SelectedNumber`; the five Economic inputs use shared `useSelectedValueSource`; Economic outcomes and Break-even Quantity use `SelectedNumber` when selectable; the native Break-even Batch Size marker shares the editable source with the Economic input.
- **Source identities:** Result identities include the active product, comparison roles and snapshot IDs, metric, and column. Economic identities include the active product, After role/snapshot, and input/outcome. This keeps sources scoped to the live Simulation context.
- **History:** the shared editable source contract gained optional begin/commit callbacks so Header Value edits enter and close the existing owning Simulation history transaction. Existing NumericInput and domain writers remain authoritative.
- **Preserved boundaries:** no calculation, formula, data, role, persistence, graph drawing, Story Graph, Simulation BOM/Routing parameter table, or global direct-edit blue-value behavior changed. Round 5 remains not started.
- **Verification:** Round 4B browser checks passed 41/41; NumericInput unit/browser checks passed 344/344 and 2365/2365; Master Data selected-value browser checks passed 161/161; CBD selected-value browser checks passed 306/306; Simulation regression script exited 0; TypeScript and production build passed; `git diff --check` and verifier syntax checks passed. The regression script emitted transient Vite WebSocket port-in-use messages while nested servers started, but exited successfully. Build retained existing ExcelJS/fast-csv browser-externalization and large-chunk warnings.
- **Delivery:** no merge; push to `feat/selected-value-ux` after final diff review.

# Final Narrow Corrective Pass After External Audit — 2026-10-24

- **Branch / worktree:** `feat/selected-value-ux` / `E:\COSTBREAKDOWN\.worktrees\SIMULATION-FINALIZED`
- **Starting local and remote HEAD:** `1010cc236bbb291deb36cff6dd3d824348908d2d`.
- **Scope:** the three remaining external-audit findings only. Previously passed corrective findings were preserved. No merge and no Round 4B work.
- **Corrections:**
  1. Master Data's page-level key route now handles Ctrl/Cmd+Z, Ctrl+Y, and Cmd+Shift+Z while focus remains on a button in Working dataset controls. It does not move focus to the grid; the grid-scoped route and toolbar Undo/Redo remain intact. Clear's mutation and structure semantics are unchanged.
  2. `NumericInput` retains the exact accepted editable string separately from the numeric value sent to existing calculations. Blur formats only the visible draft; refocus restores the retained string. Typing remains unsnapped, and the browser uses native horizontal scrolling for long values. No calculation type or formula changed.
  3. Simulation Outcome's visible `Break-even Quantity` copy now matches the active Simulation specification; calculation, graph, and result values are unchanged.
- **Verification:**
  - `node scripts/verify_master_data_selected_value.mjs`: **161 passed / 0 failed**. The verifier records the focused Clear toolbar button and asserts it is not a grid cell before Ctrl+Z; it checks full pre-Clear restoration, full redo, and the macOS Cmd+Z / Cmd+Shift+Z path. Snapshot matching ignores only trailing fractional zero padding and compares all significant digits as text. Toolbar Undo/Redo and dataset structure checks pass.
  - `node scripts/verify_numeric_input_browser.mjs`: **2365/2365 PASS**, including exact `123456789012345.123456789` blur/refocus, `12.3456789`, the 1e300 long-decimal case, and native horizontal scrolling.
  - `node scripts/verify_numeric_input.mjs`: **334/334 PASS**.
  - `npx tsx scripts/verify_simulation_economics.ts`: **PASS**, including visible Outcome copy.
  - `npm run build`: **PASS**, 2,060 modules. Existing ExcelJS/fast-csv browser externalization and large-chunk warnings remain.
- **External audit:** remains the final gate. Do not start Round 4B or merge.

# Previous Seven-Finding Follow-up Corrective Implementation — 2026-10-24

- **Branch / worktree:** `feat/selected-value-ux` / `E:\COSTBREAKDOWN\.worktrees\SIMULATION-FINALIZED`
- **Starting local and remote HEAD:** `f75eea95d320244f336f3b6a3d8b0a8a835e1082`, verified with `git rev-parse` and `git ls-remote` before implementation.
- **Required status:** `NEW FOLLOW-UP CORRECTIVE IMPLEMENTATION: IMPLEMENTED / INTERNAL VERIFICATION PASSED / AWAITING EXTERNAL AUDIT`.
- **Round 4B:** `NOT STARTED`. Human visual acceptance and external audit remain pending.
- **Scope:** the seven NEW follow-up findings from 2026-10-24. This pass is distinct from the historical 2026-10-23 correction set below; the old fixed 70/30 Simulation allocation does not satisfy this scope.
- **Corrections and evidence:**
  1. Business and Economic numeric editors now have a visible white, 1px neutral frame at true idle while retaining the existing hover/focus treatments and unchanged geometry. The browser verifier moves the pointer away and checks idle, hover, focus, and geometry.
  2. Clear semantics are unchanged. Browser verification confirms toolbar Undo/Redo and Ctrl+Z/Ctrl+Y restore and reapply Current Clear, including metadata and all editable table values. The verifier reads authoritative values without focusing empty fields, so the check does not create extra edits.
  3. `NumericInput` keeps compact blur text separate from its authoritative value. Refocus restores the full editable value; a `1e300` value with a long-decimal draft remains horizontally scrollable and editable through blur/refocus. The verifier covers the compact `1.00E+300` blur and the full value on refocus.
  4. Numeric wheel direction now follows the requested mapping: up increases and down decreases. The unit and browser checks cover both directions and confirm an unfocused input does not cancel the wheel event.
  5. Simulation now uses a natural content-sized upper row and lets the tables absorb remaining viewport height. The verifier checks row sizing/containment at 900px and 720px; no 70/30 target or tolerance remains.
  6. Break-even's SVG coordinate system tracks its rendered size and preserves aspect ratio. Plot coordinates and pointer dragging use the measured layout; calculations, keyboard operation, accessibility labels, and readability checks remain covered.
  7. **Standard Cost: PASS / NO CHANGE.** Runtime Reference and Current strokes, outline strokes, and label fills match. Source uses the same `COST_ELEMENT_COLORS.standardCost` token across the state rendering path. No reproducible Current-specific appearance issue was found, so no style fix was added.
- **Verification:**
  - `node scripts/verify_numeric_input.mjs`: **334/334 PASS**.
  - `node scripts/verify_numeric_input_browser.mjs`: **2366/2366 PASS**.
  - `node scripts/verify_master_data_selected_value.mjs`: **156/156 PASS**.
  - `npx tsx scripts/verify_simulation_economics.ts`: **PASS**.
  - `npx tsx scripts/verify_master_data_edit_history.ts`, `npx tsx scripts/verify_master_data_clear_dataset.ts`, and `npx tsx scripts/verify_master_data_custom_dataset.ts`: **PASS**.
  - `node scripts/verify_simulation_round4a_layout.mjs`: **252/257 PASS**. All seven NEW-scope checks pass. The same five pre-existing out-of-scope mobile Ruler assertions remain: at 390px, natural-width checks for `350.00` and `15,000.00` plus the `350.00` drag check; at 320px, natural-width and drag checks for `350.00`. No additional failure remains.
  - `npx tsc --noEmit --pretty false`, `npm run build`, changed `.mjs` syntax checks, and `git diff --check`: **PASS**. The build retains existing ExcelJS/fast-csv Node-module externalization and large-chunk warnings.
- **Browser evidence:** `C:\Users\Boom\AppData\Local\Temp\costbreakdown-simulation-round4a-evidence-6HsOzh\simulation-1440.png` and `simulation-break-even-1440.png` (same directory).
- **External review:** human visual acceptance and external audit are outstanding. Do not start Round 4B or mark this gate closed.

# Historical Follow-up Corrective Implementation — 2026-10-23 (previous scope)

> This is the OLD correction set. Its approximately 70/30 Simulation split and other checks do not satisfy the NEW 2026-10-24 follow-up findings above.

- **Branch / worktree:** `feat/selected-value-ux` / `E:\COSTBREAKDOWN\.worktrees\SIMULATION-FINALIZED`
- **Actual starting remote HEAD:** `bf5f7d9885170f6a16d3d5529a1225554ef9cf7f`, verified with `git ls-remote` before implementation and again before delivery.
- **Required status:** `PRE-ROUND-4B FOLLOW-UP CORRECTIVE IMPLEMENTATION: IMPLEMENTED / INTERNAL VERIFICATION PASSED / AWAITING EXTERNAL AUDIT`.
- **Round 4B:** `NOT STARTED / BLOCKED`. Human visual acceptance remains pending; this is not a gate closure or user acceptance.
- **Scope:** the seven narrow follow-up corrections only. No Round 4B feature or blue changed-value indicator was started.
- **Corrections:**
  1. NumericInput keeps its decimal anchor through focus when possible, preserves the fixed frame, resets native horizontal scroll on focus/refocus, and allows user navigation to scroll long drafts.
  2. Cost Breakdown BOM Loss `%` spacing matches unchanged Routing Yield geometry in the main row and expanded Reference/Current values; monetary effect rows have no `%`.
  3. Business/Economic inputs use the Simulation Parameter hover/focus treatment without changing their dimensions.
  4. Simulation expanded rows persist through scrolling, scrollbar use, viewport resizing, and footer actions; explicit toggles still close them and multiple rows may remain open.
  5. Simulation parameter effect sign and color follow the raw semantic sign for every nonzero value; exact zero stays neutral.
  6. Desktop Simulation uses an approximately 70/30 upper/lower height allocation; table bodies fill and scroll within the lower area without a fixed four-row height.
  7. BOM Loss accepts finite values from 0 through 1 inclusive for LMDI attribution; negative and over-100% Loss remain invalid, and Price/Usage/Routing domains are unchanged.
- **Preserved:** the accepted `bf5f7d9` behavior and calculations outside those seven points, including authoritative values, stored precision, business formulas, graph behavior, Result/Break-even containment, existing column geometry, and Master Data/CBD behavior outside the BOM Loss spacing correction.
- **Verification:**
  - `node scripts/verify_numeric_input.mjs`: **334/334 PASS**.
  - `node scripts/verify_numeric_input_browser.mjs`: **2346/2346 PASS**.
  - `node scripts/verify_master_data_selected_value.mjs`: **148/148 PASS**.
  - `node scripts/verify_cbd_selected_value_browser.mjs`: **306/306 PASS**.
  - `node scripts/verify_cbd_parameter_cost_effect.mjs`: **PASS**, including zero Loss reconciliation and invalid-domain cases.
  - `npx tsx scripts/verify_comparison_reconciliation.ts`: **PASS**.
  - `node --experimental-strip-types scripts/verify_simulation_story_view.ts`: **PASS**, including small signed effect presentation.
  - `node scripts/verify_simulation_round4a_layout.mjs --final-corrections-only`: **49/49 PASS**.
  - `node scripts/verify_simulation_round4a_layout.mjs --numeric-layout-only`: **157/157 PASS**.
  - `node scripts/verify_simulation_regression.mjs`: **PASS / exit 0** across its Simulation, CBD, Master Data, comparison, and history suites. The nested runner logs repeated WebSocket port `24678`-in-use messages; these did not fail a suite assertion.
  - Full `node scripts/verify_simulation_round4a_layout.mjs`: **259/264 PASS**. The same five out-of-scope mobile Ruler checks remain as the recorded `231/236` baseline: 390px natural-width checks for `350.00` and `15,000.00`, 390px `350.00` drag, 320px natural-width check for `350.00`, and 320px `350.00` drag. No additional failure remains. The mobile viewport scroll test reaches `scrollTop=3216` while both disclosures remain open.
  - `npx tsc --noEmit --pretty false`, `npm run build`, six changed `.mjs` `node --check` checks, and `git diff --check`: **PASS**. The build retains existing ExcelJS/fast-csv Node-module externalization and large-chunk warnings. No lint script is defined.
- **Browser evidence:** Master Data desktop `C:\Users\Boom\AppData\Local\Temp\costbreakdown-master-selected-evidence-2MoCR3\master-data-final-desktop.png`; CBD desktop `C:\Users\Boom\AppData\Local\Temp\costbreakdown-cbd-selected-evidence-3C0YmS\cbd-selected-value-1440.png`; Simulation height cases `C:\Users\Boom\AppData\Local\Temp\costbreakdown-simulation-round4a-evidence-ilnAdA\simulation-layout-1440x900.png` and `...\simulation-layout-1440x720.png`; expanded-row screenshots are in the same `ilnAdA` directory; final-corrections evidence is under `C:\Users\Boom\AppData\Local\Temp\costbreakdown-simulation-round4a-evidence-JmbFkb`.
- **External review:** human visual acceptance and external audit are outstanding. Do not start Round 4B or mark this gate closed.

# Previous Pre-Round-4B Corrective Implementation — 2026-10-23 (historical)

- **Branch:** `feat/selected-value-ux`
- **Audited Starting Remote HEAD:** `170699bfcecb0f726d489e3111617f51f8d649de`
- **Status:** **IMPLEMENTED / INTERNAL CORRECTIVE CHECKS PASSED / AWAITING EXTERNAL AUDIT**
- **Round 4B:** **NOT STARTED / BLOCKED** until this corrective pass is externally audited and accepted.
- **Scope:** Final corrective implementation only. No Round 4B work was started.
- **Corrections completed:**
  1. Focused NumericInput drafts preserve the authoritative full value and use the fixed frame's full interior with native horizontal scrolling; compact unfocused decimal alignment and outer geometry remain stable.
  2. Cost Breakdown BOM Loss `%` suffix uses the compact shared axis/gap in both the main row and expanded Reference/Current values. Monetary Parameter Cost Effect rows keep no `%` suffix; Routing behavior is unchanged.
  3. Simulation Result metrics stay on one visual row at desktop/tablet widths and reflow only below a 768px viewport. Result/Break-even vertical containment remains `xl:grid-rows-[auto_minmax(0,1fr)]`; narrow-panel container-query reflow was removed.
  4. Simulation BOM/Routing Usage, Price, and Loss tracks are equal at 14.5%; the calculated-cost track is 19.4%, preserving existing User/Status gutters and hierarchy.
  5. LMDI rounding residue is assigned only to a changed factor; untouched trailing Loss/Yield effects remain exact zero. If no changed factor can own unreconciled residue, effects are unavailable instead of fabricated.
  6. Simulation Parameter Cost Effect Total places a neutral `Total` annotation and signed semantic value on one baseline. Its browser verifier targets the actual expanded `bom-effect-*` / `routing-effect-*` row.
  7. Global numeric normalization was removed. Stored and calculated values retain full precision; comparison tolerance is limited to a few ULPs between nonzero values, while zero remains distinct from every nonzero value. Tiny finite values retain scientific presentation and survive editing/reload.
- **Verification results:**
  - `node scripts/verify_numeric_input.mjs`: 334/334 PASS.
  - `node scripts/verify_numeric_input_browser.mjs`: 2342/2342 PASS.
  - `node scripts/verify_master_data_selected_value.mjs`: 148/148 PASS.
  - `node scripts/verify_cbd_selected_value_browser.mjs`: 301/301 PASS.
  - `node scripts/verify_cbd_parameter_cost_effect.mjs`: PASS.
  - `npx tsx scripts/verify_comparison_reconciliation.ts`: PASS, including ULP-equivalent and meaningful-precision comparisons.
  - `node scripts/verify_simulation_round4a_layout.mjs --final-corrections-only`: 41/41 PASS.
  - `node scripts/verify_simulation_round4a_layout.mjs --numeric-layout-only`: 149/149 PASS.
  - `node scripts/verify_simulation_regression.mjs`: PASS; its Simulation, CBD, Master Data, comparison, and history suites passed.
  - `node scripts/verify_simulation_round4a_layout.mjs`: 231/236 PASS. The five remaining failures are out-of-scope mobile Ruler checks at 390px / 320px: natural label width for 350.00 and 15,000.00, plus the 350.00 drag assertion at each width. The focused correction and numeric-layout suites pass independently; Ruler and graph code was not changed.
  - `npm run build`: TypeScript and production build PASS. Vite reports ExcelJS Node built-in externalization and the existing large-bundle warning; build completes successfully.
  - `git diff --check` and changed `.mjs` syntax checks: PASS. No lint script is defined in `package.json`.

# Historical Pre-Round-4B Regression Audit & Status Reconciliation — 2026-10-23 (Superseded Operationally)

- **Branch:** `feat/selected-value-ux`
- **Audited remote HEAD:** `3af57b05e8518d7777d921f6b31ef50bce6ebf76`
- **Status:** **PRE-4B EXTERNAL AUDIT FAILED / CORRECTION REQUIRED**
- **Round 4B:** **NOT STARTED / BLOCKED** (strictly gated until this pre-4B cleanup is corrected, verified, and accepted)
- **External Audit Classification:**
  - **PRESERVE:**
    * SG&A duplicate `%` removal (unit indicated in label "SG&A %").
    * One-line "Bill of Materials" and "Routing Process" identity-header target.
    * CBD footer Total localization approach (same-baseline annotation outside numeric fit/suffix geometry).
    * Accepted numeric centerline principles (header text center = numeric slot/frame center = ordinary decimal anchor).
    * Existing formulas, business logic, and dataset lifecycle.
    * Master `#` visual-weight intent, subject to CBD/Simulation caller preservation.
  - **PARTIAL / REPAIR:**
    * Result scrollbar removal: Keep no-scroll goal, but repair vertical containment so Result NEVER overflows vertically into or overlaps the Break-even panel; removing scrollbars and letting content spill over into Break-even is unacceptable.
    * Numeric noise concept: Keep semantic-equivalence goal, but replace unsafe implementation with sound precision handling; do not write rounded presentation back to storage or collapse real user differences.
    * Ordinary/scientific fit: Repair actual fit behavior; ensure values like `4.00`, `5.00`, `8.00`, `12.00`, `15.00`, `5.00 %`, `84.00 %`, `90.00 %`, `97.00 %`, `98.00 %` remain ordinary whenever they fit without premature scientific fallback.
    * CBD Δ Loss suffix change: Implementation changed but visual outcome still fails external audit; `%` must sit naturally adjacent (`5.00 %`) rather than appearing detached in a separate distant column.
  - **REVERT / REVIEW COLLATERAL:**
    * Unrequested Economic Outcome green shade change (`text-emerald-700` back to standard semantic treatment).
    * Any shared `RowSelectionButton` visual regression in CBD or Simulation callers from the shared `font-mono font-semibold` class.
  - **KNOWN VERIFIER GAPS:**
    * Result verifier did not detect vertical overlap with Break-even.
    * Numeric checks allowed short ordinary values to become scientific in real presentation paths.
    * CBD Δ Loss verifier became too weak: non-overlap is insufficient to prove acceptable visual gap.
    * Floating-noise coverage did not catch decomposition residual `-8.88E-16`.
- **Note on Historical Verification:** Tests passed in the previous test run, but test coverage was insufficient for the externally observed regressions. Corrective implementation and tightened verifiers are required before Round 4B can proceed.

# Historical Pre-Round-4B Regression Cleanup Attempt — 2026-10-23 (Superseded Operationally)

- **Status:** Historical attempt superseded operationally by the audit checkpoint above (**PRE-4B EXTERNAL AUDIT FAILED / CORRECTION REQUIRED**); Round 4B **NOT STARTED / BLOCKED**; Round 5 **NOT STARTED**.
- **Scope & Invariants:** Strictly scoped pre-4B cleanup. No feature additions, no global blue changed-value indicators, no arbitrary refactoring. Restores historical good behavior and addresses root causes.
- **WP1 — Simulation Result Container & Scroll:** Restored card padding `xl:px-1` (from `xl:px-0.5`) to give comparison selectors comfortable breathing room; removed `overflow-y-auto` and `min-h-0` on `[data-simulation-result-body]` eliminating internal vertical scrollbars.
- **WP2 — Simulation BOM/RTG Header Geometry & Identity Track Width:** Balanced column tracks to `5% | 16.5% | 10.6% | 13.5% | 13.5% | 17% | 18.9% | 5%`. "Bill of Materials" and "Routing Process" fit on a single line (`whitespace-nowrap`); Status gutter preserves `>= 8px` and container gutter `>= 5.5px`; Percentage inputs retain `>= 76.5px` width avoiding scientific fallback; Calculated-cost headers stay on one line at 1280px without clipping or horizontal page overflow, and expanded Total preserves full supported scientific floor.
- **WP3 — Floating-Point Precision Noise & False CHANGED:** Implemented `normalizeNumericNoise` and `areNumericValuesEquivalent` in `numeric-display.ts`. Strips IEEE 754 15-17 digit noise (e.g., `9.000000000000004`, `19.999999999999996`) while preserving intentional business precision (`12.3456789`, `110.123456`, extreme scientific numbers, and exact integers). Editors hydrate without noise on focus; Simulation parameters and overrides compare equivalent values to eliminate false "CHANGED" badges on untouched parameters.
- **WP4 — Simulation Business/Economic Inputs & Outcome Metrics:** Removed duplicate `%` suffix on SG&A % input in `EconomicSimulationPanel.tsx` (unit indicated in label "SG&A %"); input frame geometry matches sibling economic inputs. Restored positive outcome metric green to `text-emerald-700` (from `text-emerald-800`) for Parameter Saving, Economic Margin, and Operating Profit for clean readability on white backgrounds.
- **WP5 — CBD Summary Table Layout & Total Annotation:** Removed `CBD_SUMMARY_PERCENTAGE_CLASS` (`relative pl-9`) from header, body, and footer cells. Added `leadingAnnotation` directly into `BusinessNumber` / `SelectedNumber` positioned immediately before the numeric token inside the centerline-anchored span without moving the decimal anchor. Restored column proportions (`20% 18% 18% 26% 18%` for SnapshotComparisonCard; `24% 19% 19% 20% 18%` for WorkCenterProcessingTable) and table minimum width `min-w-[624px]` with local panel scroll. Header, body, and footer centerlines align exactly.
- **WP6 — CBD BOM Candidate Findings Δ Loss %:** Removed `compactPercentSuffix={parameter.field === 'loss'}` in `CandidateFindingsTable.tsx`. Loss and Yield now both use the standard shared percentage slot pattern.
- **WP7 — CBD Candidate BOM Width & Sizing:** Audited and preserved `min-w-[1240px]` for BOM candidate table and `min-w-[1260px]` for Routing candidate table to prevent column compression and premature scientific fallback at 1024px.
- **WP8 — Master Data Visual Weight & Geometry Audit:** Aligned visual weight and font geometry of column header `#` in `RowSelectionButton.tsx` (`font-mono font-semibold`) with row selector buttons `[1]`, `[2]`. Audited 136px / 81rem Master Data table width; verified it is required for warning/blocker star clearance outside the stable numeric axis without shifting decimal centerlines.
- **WP9 — Verifier Suite Reconciled:** Updated `round4a-correction-geometry.mjs`, `verify_cbd_selected_value_browser.mjs`, and `verify_numeric_input_browser.mjs` to test verified invariants (coexisting Total annotation without 36px column padding shift, standard percentage slot for Loss, and no duplicate % suffix on SG&A).
- **Verification Results (Previous run — note verifier gaps above):**
  - `node scripts/verify_numeric_input.mjs`: 313/313 assertions PASS.
  - `npx tsx scripts/verify_simulation_result.ts`: PASS.
  - `npx tsx scripts/verify_simulation_economics.ts`: PASS.
  - `npx tsx scripts/verify_cbd_summary_ux.ts`: PASS.
  - `npx tsx scripts/verify_row_selection.ts`: PASS.
  - `node scripts/verify_simulation_regression.mjs`: PASS.
  - `node scripts/verify_master_data_selected_value.mjs`: 148/148 browser checks PASS.
  - `node scripts/verify_simulation_round4a_layout.mjs`: 219/219 browser checks PASS.
  - `node scripts/verify_cbd_selected_value_browser.mjs`: 296/296 browser checks PASS.
  - `node scripts/verify_numeric_input_browser.mjs`: PASS.
  - `npm run build`: Production build passes cleanly with 0 TypeScript errors.
  *(Note: tests passed, but coverage was insufficient for the externally observed regressions.)*

# Final Round 4A / pre-Round-4B correction — 2026-10-23

- **Status:** Round 1 CLOSED; Round 2 CLOSED; Round 3 CLOSED; Round 4A + pre-4B correction **IMPLEMENTED / AWAITING EXTERNAL USER AUDIT**; Round 4B **NOT STARTED / BLOCKED**; global changed-value blue text **NOT STARTED**; Round 5 **NOT STARTED**. No Round 4 closure or new numbered round.
- **Baseline / delivery:** freshly fetched `origin/feat/selected-value-ux` and clean local HEAD both matched `d6a589cb652a18227fd6d6690123ba5da39972a8`. Checkout `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`, branch `feat/selected-value-ux`. This pass creates a local implementation commit only; **nothing pushed**. No merge, rebase, force-push, history rewrite, dependency/lockfile changes, or unrelated edits.
- **Shared percentage fit:** `NumericColumnSlot` allocates the numeric child and external suffix once for shared inputs/read-only values and Simulation header/body/effects. Numeric-fit measurement belongs to the child and never includes suffix text. Equivalent 136px numeric regions with/without `%` choose identical notation for 5, 98, 1234, 0.0045, negative and extreme values. Actual baseline Loss/Yield at 1366px (71.59px frame) and 1280px (65.36px) showed `5.00E+0` / `9.80E+1`; final 1280px frame 76.56px clears the 76.24px four-fraction reserve. No hardcoded value/field formatting exception.
- **Fixed Simulation geometry repair:** final tracks `6 | 13.65 | 10.6 | 14.5 | 14.5 | 16.75 | 18.5 | 5.5` percent. Identity funds the percentage +2.25 points and calculated-cost +1.5 points; full identity headers wrap at tight desktop widths. Table width, Status, other parameter tracks, font sizes, pointer/frame geometry and Parameter Cost Effect hierarchy remain. The original 17% calculated-cost track also clipped real `Total +2.10E+300` by 2.83px per edge at 1280; final 99.73px region contains that token and its supported scientific floor. No text-driven outer movement.
- **Economic Outcome:** adds full **Operating Profit** between Economic Margin and Break-even Qty with separators, canonical `result.operatingProfitPerPiece`, existing sign/color/formatting, and shared resolved UOM. No new formula; economics remains separate from Standard Cost.
- **Result:** removes 464px minimum/local horizontal scrolling. Below 464px card width, each row label precedes four aligned Before/After/Change/% columns; balanced tracks and mirrored insets preserve existing fonts, ordinary/scientific token bounds and centerlines. Constrained desktop cards use vertical scrolling. No new Selected Value integration.
- **CBD:** Total is a same-line 28px annotation outside numeric fit/suffix geometry. Header/body/footer reserve matching space; summary minimum 624→652 preserves prior numeric widths. BOM Δ Loss uses a separate 4px adjacent suffix through shared opt-in rendering; Routing and other axes/interactions remain. Real summary components also test scientific footer totals.
- **Header:** decimal Exact Value retains normal minimum 2dp (`98.00`, `55.00`, `8.00 %`), preserving max 8 decimal cleanup, scientific tiny values, integer sources, and authoritative full-value editing. No arbitrary typed formatting strings or body/storage changes. This supersedes old `.00` trimming only.
- **Selection:** Master/CBD Select-All now matches their 32px row squares, including radius/center; Master light all-state has comparable inset border weight. Simulation retains 28px geometry. Existing none/mixed/all, aria, scope, drag/focus, highlights and selection semantics remain.
- **Preserved:** formulas, stored precision, numeric domains/conversions, lifecycle, comparison/role/basis ownership, spreadsheet and clipboard behavior, Undo/Redo/history, Send/Reset, Candidate hover/Pin/selection/expansion/reorder, Status, Parameter Cost Effect calculations/hierarchy, graph/Ruler/Visible Net/story, and navigation persistence. No blue text/marker/dot/badge/icon feature.
- **Verifier maintenance:** superseded Header 20→20.00 and Outcome 4→5 expectations updated; old preexisting SSR parsers/source contracts updated for nested numeric spans, accepted 65px centered Selected slots, existing minimum-height summary, current signed Total accessible name, and ungrouped integer Outcome quantity. Exact numeric/semantic assertions remain. CBD summary async completion is now awaited by the regression runner. Geometry probes filter hidden retained page tables and measure numeric tokens separately from suffixes; no assertion suppression.
- **Final verification (all exit 0):** `node scripts/verify_numeric_input.mjs` **313/313**; `node scripts/verify_numeric_input_browser.mjs` **2309/2309**; `node scripts/verify_master_data_selected_value.mjs` **148/148**; `node scripts/verify_cbd_selected_value_browser.mjs` **296/296**; `node scripts/verify_simulation_round4a_layout.mjs --final-corrections-only` **41/41**; full `node scripts/verify_simulation_round4a_layout.mjs` **219/219**, including unchanged Ruler/graph/row boundaries and five-point frame hit tests. `node scripts/verify_simulation_regression.mjs`, `node_modules/.bin/tsc -p tsconfig.json --noEmit --pretty false`, `npm run build`, `node --check` on all eight changed/new `.mjs` scripts, and `git diff --check` pass. Browser checks use actual isolated Chrome at 1440/1024/768/390/320; real percentage sweeps also cover 1366/1280. Operating Profit tests cover positive/negative/unavailable canonical results; Result includes all 32 numeric centerlines and extreme finite values at 320px. Shared suffix fonts and prior decorative/input versus accessible/read-only suffix semantics are preserved and asserted.
- **Final evidence inspected:** Master `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-master-selected-evidence-yagSUb/master-data-final-desktop.png`; CBD `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-cbd-selected-evidence-2fNDC7/cbd-selected-value-1440.png`; Simulation `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-simulation-round4a-evidence-jvRFTR/final-corrections-result-320.png` and its 1440px counterpart; numeric `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-selected-value-evidence-UZ6Dlz/numeric-expanded-total-scientific-1280.png`. Final full Simulation evidence path is recorded in `/tmp/final-correction-simulation-layout.log`. Logs: `/tmp/final-correction-{source,numeric-browser,master,cbd,simulation-final,simulation-layout,simulation-regression,build,audit}.log`.
- **Additional verifier diagnosis:** full legacy Simulation browser checks still encoded obsolete right-edge axes from before the accepted centerline contract. They now measure actual header text/region/decimal centers with explicit column counts, read-only checks, effect axes and token bounds. A first concurrent SSR/browser run also captured mixed Vite React cache chunks at startup; final runs were sequential with the console-error assertion intact and no browser errors. No application hook changes or error suppression.
- **Known limits:** `npm audit --audit-level=high` exits1 with existing 10 advisories (6 high,4 moderate,0 critical); dependencies were not changed. Build retains existing ExcelJS/fast-csv browser externalization and >500kB chunk advisories. **[Unverified]** Safari, Firefox, Windows, physical touch devices, screen readers (including responsive CSS table semantics), and unrelated Excel/distribution work. External visual audit still required.

### Exact changed files (36)

```text
HANDOFF.md
docs/PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md
docs/REQUIREMENTS_INDEX.md
docs/specs/COST_BREAKDOWN.md
docs/specs/CROSS_CUTTING.md
docs/specs/MASTER_DATA.md
docs/specs/SIMULATION.md
scripts/fixtures/numeric-column-browser.tsx
scripts/numeric-browser-geometry.mjs
scripts/round4a-correction-geometry.mjs
scripts/verify_cbd_selected_value_browser.mjs
scripts/verify_cbd_summary_ux.ts
scripts/verify_master_data_selected_value.mjs
scripts/verify_numeric_input.mjs
scripts/verify_numeric_input_browser.mjs
scripts/verify_simulation_economics.ts
scripts/verify_simulation_phase4.ts
scripts/verify_simulation_regression.mjs
scripts/verify_simulation_round4a_layout.mjs
scripts/verify_simulation_story_view.ts
src/features/cost-breakdown/components/CandidateFindingsTable.tsx
src/features/cost-breakdown/components/SnapshotComparisonCard.tsx
src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx
src/features/cost-breakdown/components/summary-table-styles.ts
src/features/master-data/components/BOMTable.tsx
src/features/master-data/components/RoutingTable.tsx
src/features/master-data/components/WorkCenterRatesTable.tsx
src/features/simulation/EconomicSimulationPanel.tsx
src/features/simulation/SimulationPage.tsx
src/shared/layout/HeaderValue.tsx
src/shared/ui/BusinessNumber.tsx
src/shared/ui/NumericColumnSlot.tsx
src/shared/ui/NumericInput.tsx
src/shared/ui/RowSelectionButton.tsx
src/shared/ui/numeric-display.ts
src/shared/ui/selected-value.tsx
```

# Current numeric centerline correction — 2026-10-23

- **Status: IMPLEMENTED / AWAITING EXTERNAL USER AUDIT.** This remains inside the open pre-Round-4B gate. Round 4B is NOT STARTED / BLOCKED; global direct-edit blue indication and Round 5 are NOT STARTED. No new round/sub-phase was created.
- **Starting remote:** fetched `origin/feat/selected-value-ux` and clean local HEAD both matched `0e733d95d3878e330b377820efee1045eeb2c869`. Reused the existing feature checkout; no branch change, merge, rebase, or force-push.
- **Root cause and authority:** independent right-aligned headers, compensating padding, provisional digit capacities, and body decimal anchors did not express one shared visual rule. A new browser probe reproduced Master Usage Header center 474.40625 vs frame center 447.65625 (26.75px error), and decimal 454.521459 vs center (6.865px error). The latest user direction supersedes those provisional implementation details.
- **Shared implementation:** `NumericColumnHeader`, measured column presentation, and opt-in NumericInput/BusinessNumber regions make actual header text center = fixed numeric region/frame center = ordinary decimal anchor. Actual computed-font measurements, including signs and actual fractional glyphs, select ordinary-first or scientific fallback; 2dp reserves four fractional positions. Scientific whole-token mode never changes the region. ResizeObserver measures existing fixed geometry; text measurement never resizes/repositions frames/columns. Font loading invalidates cached widths. Native inputs retain full authoritative hydration/minimum-two-decimal committed drafts, natural manual typing, caret stepping, and internal overflow scrolling.
- **Cross-system coverage:** active Master Data BOM/Work Center/Routing numeric columns; Cost Breakdown Cost Element and Work Center overviews, Full/Selected Gap subregions, Candidate BOM/Routing, and expanded details; Simulation six parameters, read-only/effect/calculated columns, Result, and mobile parameter regions. Text/identity columns, inline metadata labels, global Header Value, graph/Ruler/toolbar tokens, and unmounted legacy comparison components retain their distinct existing contracts. SelectedNumber wraps only positioned tokens, preserving content-sized hit/hover/pin surfaces and Candidate whitespace behavior.
- **Minimal static exceptions proven necessary:** retained Simulation tracks `6 | 17.4 | 10.6 | 14.5 | 14.5 | 14.5 | 17 | 5.5` and existing left gutters. A 70px percentage region could not reserve the measured 36.12px four-fraction width on its right half, so 7px was recovered from right-side spacing (77px frame, existing 4px suffix gap). Result's measured ~50px percentage region could not fit scientific/four-fraction requirements: its already locally scrollable table minimum is 464px instead of 408px. Cost Breakdown audit found ~41px Full Gap/~55px percentage regions overflowing scientific tokens at 1024px: shared overview minimum is 624px with local horizontal scroll, Full/Selected secondary slot is a common 65px in header/body, and BOM findings minimum is 1240px instead of 1040px (Routing remains 1260px). Column proportions remain unchanged. Overview footer Total annotation remains visible without taking horizontal space from the numeric axis. Master Data retains 136px shells, 112px percentage groups, and 1296px table minimum; the actual existing marker footprint reserves 8px rather than the rejected excess 24px.
- **Completed checks:** shared numeric verifier **307/307**; Master Data Selected Value browser **147/147**; Cost Breakdown Selected Value browser **285/285**; TypeScript and production build passed, with existing ExcelJS/fast-csv externalization and >500kB bundle advisories. Final `node scripts/verify_numeric_input_browser.mjs` passed **1688/1688** (exit 0), including 66 actual editable/read-only shared-component ordinary/extreme scientific cases. Final `node scripts/verify_simulation_round4a_layout.mjs --numeric-layout-only` passed **132/132** (exit 0), including all five viewport inventories and existing frame/hit/Status/row checks. Source checks include unequal integer/fraction glyph widths, actual fit independent of integerDigits, tiny values, negative zero, and scientific floor.
- **Verifier corrections:** replaced rejected digit/right-edge assertions with actual Range header centers, native input/mirrored fractional glyph positions, fixed region centers, and independent actual-font fit. Existing pointer/status/gutter/selection/history-facing checks remain. Old Master verifier expectations for compact focused drafts, Header focused precision, and copied focused drafts were stale against already accepted authoritative editing; expectations now assert that existing full-value behavior, without changing clipboard code. An old CBD long-metadata fixture expected nine ordinary digits despite the unchanged accepted eight-digit non-column formatter; it now uses an eight-digit ordinary value while retaining exact precision/content-growth/pin checks. Suffix instrumentation follows owning groups rather than an arbitrary ancestor depth; Blur measurements observe painted state, not an intermediate React update.
- **Evidence inspected:** `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-master-selected-evidence-AB8SYl/master-data-final-desktop.png` and `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-cbd-selected-evidence-FtAEj8/cbd-selected-value-1440.png`. Final numeric evidence: `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-selected-value-evidence-35o4LO`; final Simulation evidence: `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-simulation-round4a-evidence-ynSZd8`. Root inspected focused Labor 110, focused Price 110, the 77/96/136px extreme token fixture, focused Manning beside UNCHANGED, and focused Loss with its separate suffix. The new shared-component browser fixture supplements real-caller coverage with signed extreme finite scientific values at 77/96/136px.
- **Preserved scope:** formulas, model/stored/calculation precision, numeric domains, percentage conversion, comparison, spreadsheet handlers, dataset lifecycle, history/Undo/Redo, Reset/Send, row selection/expansion/reorder, Candidate compatibility, and graph/Ruler/Visible Net/Selling Price graph behavior are unchanged. No dependencies changed or unrelated broad suites/Excel checks ran.
- **Exact validation commands:** `node scripts/verify_numeric_input.mjs`; `node scripts/verify_numeric_input_browser.mjs`; `node scripts/verify_master_data_selected_value.mjs`; `node scripts/verify_cbd_selected_value_browser.mjs`; `node scripts/verify_simulation_round4a_layout.mjs --numeric-layout-only`; `node_modules/.bin/tsc -p tsconfig.json --noEmit --pretty false`; `npm run build`; `node --check` on all six changed/new `.mjs` files; `git diff --check`.
- **[Unverified]:** Safari, Firefox, Windows, physical touch devices, and screen readers. External user visual audit remains required before closure. Historical entries below remain unchanged.

### Scoped file inventory (31)

```text
HANDOFF.md
docs/PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md
docs/REQUIREMENTS_INDEX.md
docs/specs/COST_BREAKDOWN.md
docs/specs/CROSS_CUTTING.md
docs/specs/MASTER_DATA.md
docs/specs/SIMULATION.md
scripts/fixtures/numeric-column-browser.html
scripts/fixtures/numeric-column-browser.tsx
scripts/numeric-browser-geometry.mjs
scripts/verify_cbd_selected_value_browser.mjs
scripts/verify_master_data_selected_value.mjs
scripts/verify_numeric_input.mjs
scripts/verify_numeric_input_browser.mjs
scripts/verify_simulation_round4a_layout.mjs
src/features/cost-breakdown/components/BOMDetailedTable.tsx
src/features/cost-breakdown/components/CandidateFindingsTable.tsx
src/features/cost-breakdown/components/RoutingDetailedTable.tsx
src/features/cost-breakdown/components/SnapshotComparisonCard.tsx
src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx
src/features/cost-breakdown/components/summary-table-styles.ts
src/features/master-data/components/BOMTable.tsx
src/features/master-data/components/MasterDataNumericValue.tsx
src/features/master-data/components/RoutingTable.tsx
src/features/master-data/components/WorkCenterRatesTable.tsx
src/features/simulation/SimulationPage.tsx
src/shared/ui/BusinessNumber.tsx
src/shared/ui/NumericColumnHeader.tsx
src/shared/ui/NumericInput.tsx
src/shared/ui/numeric-column-layout.ts
src/shared/ui/selected-value.tsx
```

# Numeric Display-Fit narrow correction — 2026-10-22

- **Status: IMPLEMENTED / AWAITING EXTERNAL USER AUDIT.** This correction is not externally accepted or closed. Round 4B and the direct-edit blue-value indicator remain NOT STARTED.
- **Baseline:** freshly fetched `origin/feat/selected-value-ux` and the clean existing feature checkout both matched `656842623f6a825dac4473c56c8bfe264f1a0502`. Reused `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`; the separate checkout's existing `vite.config.ts` modification was preserved. No merge, rebase, or force-push.
- **Focus correction:** previously a committed decimal `110` hydrated as `110` and lost compact decimal padding. Shared committed hydration now produces `110.00`, `110.50`, and full `110.123456` without rounding. Focus, focused committed external synchronization, and stepped drafts share this helper. Integer fields remain integer; active manual drafts `1`, `11`, `110` are not padded while typing. Deterministic internal text padding holds the decimal axis while fitting; long authoritative drafts scroll inside the fixed native input.
- **Simulation geometry:** declared desktop column percentages are `6 | 17.4 | 10.6 | 14.5 | 14.5 | 14.5 | 17 | 5.5` in existing column order. Three ordinary integer digits for desktop parameters/effects leave room for stable editing; scientific fallback handles larger compact tokens. Static per-set insets keep frames inside owning columns, preserve Status gutters, and align read-only values/effects/headers. These are provisional implementation choices awaiting user audit, replacing the rejected `16 / 9 / 15.5` redistribution. Mobile parameter capacity remains eight.
- **Master Data:** kept the 136px non-percentage shells, nine-digit capacity, and 1296px table minimum. Rendered Labor Rate Focus/Blur and Edit/View checks preserve the numeric anchor and fixed geometry; there was no evidence requiring another width change.
- **Percentage spacing:** Simulation desktop uses a dedicated external suffix with a 4px gap; shared percentage callers use a fixed grid suffix slot. Master Data retains its established external suffix/marker structure. Rendered Master Loss, Simulation Loss/Yield, and SG&A checks cover `100`, `5`, `2`, `1`, 4dp, and scientific tiny values, including focused precision, clipped visible text, frame separation, stationary suffixes, and owning-group containment.
- **Targeted verification:** `node scripts/verify_numeric_input.mjs` exited 0 (**298/298** assertions); `node scripts/verify_numeric_input_browser.mjs` exited 0 (**1394/1394** assertions). `node scripts/verify_simulation_round4a_layout.mjs --numeric-layout-only` exited 0 (**127/127**) including real CHANGED and UNCHANGED fixture rows. At 1440px the measured text gutters were 24.125px (CHANGED) and 8.609375px (UNCHANGED). Checks cover 1440 / 1024 / 768 / 390 / 320px, decimal X tolerance 0.6px, natural drafts, Edit/View, fixed ordinary/scientific frames, all six desktop parameter containment/hit probes, Status gutters, suffix spacing, mobile cards, and no accidental page overflow. `node_modules/.bin/tsc -p tsconfig.json --noEmit --pretty false`, syntax checks for all three changed scripts, and `git diff --check` exited 0.
- **Diagnosis:** new checks reproduced baseline Focus `110` vs expected `110.00`, and negative Status-to-frame gutters at 1440/1024. Verification caught a real 2px Edit/View anchor discrepancy during implementation; border compensation corrected it. Other intermediate browser failures were stale focus expectations or suffix instrumentation, corrected to assert the requested minimum-two-decimal hydration and real DOM geometry. No assertions were suppressed.
- **Evidence inspected:** numeric screenshots `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-selected-value-evidence-QMmhwN` include Labor Rate 110 and 12.345678 Focus/Blur. Layout screenshots `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-simulation-round4a-evidence-5L2vA9` include focused Routing Manning beside UNCHANGED and focused BOM Loss with separate `%`. Root and tester visually inspected these cases. Final layout rerun evidence: `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-simulation-round4a-evidence-P5pWWA`. Labor Rate and Simulation Price decimal X remained identical before/after Focus for both 110 and 12.345678 (under 0.01px drift across ordinary integer growth).
- **Scope:** compact 2dp/4dp/scientific formatting logic, calculations, stored values/precision, domains, percentage conversions, history/save/undo, graph logic, selection, and expand/collapse behavior were not changed. No broad build/regression, dependency audit, unrelated CBD/graph, or Excel validation ran.
- **[Unverified]:** Safari, Firefox, Windows, physical touch devices, and screen readers. External user audit remains required before acceptance. Historical entries below remain unchanged.

## Numeric Display-Fit / Alignment / Fixed Sizing — 2026-10-22

- **Status:** **IMPLEMENTED / AWAITING EXTERNAL USER AUDIT**. This pass does not accept/close Round 4B. Authoritative-full-value focus and full-precision stepping were already externally accepted; direct-edit blue-value work and Round 5 remain not started.
- **Baseline:** branch `feat/selected-value-ux`, clean worktree `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`, freshly fetched remote/local `590b9a1f84a8e95b62c07a060161f32c16645da1`. Implementation: `b4756cfb05f0297d59e5ffb87466a0156d3350d1` (`fix: stabilize compact numeric display`).
- **Implemented:** shared compact 2dp → 4dp → normalized uppercase scientific presentation, post-rounding integer capacities, decimal anchors, scientific/integer right alignment, separate percentage slots, and shared read-only rendering. Focus/edit retains authoritative full values. Simulation frames no longer measure or shift around text. Formulas, storage, domains, history, graph/Ruler/Visible +/- behavior, and Selected Value ownership are unchanged.
- **Static audit:** Master Data non-percentage shells 80/96→136px, capacity nine, table minimum 1232→1296px; whole sets share Edit/View geometry and percentage shells remain 112px. Simulation parameter columns 14.5→15.5%, desktop capacity six (mobile eight), funded by identity 18→16% and Status 10→9%; calculated cost remains 17%. Actual Chrome measurements and screenshots showed adjacent columns remained readable. Result keeps eight-digit money/four-digit percentage capacity with a 408px table minimum and local horizontal scrolling; this fixes reproduced 8-digit cell overlap at 390px. Business/Economic widths are unchanged. No per-value resizing or font squeezing.
- **Verification:** `node scripts/verify_numeric_input.mjs` PASS; `node scripts/verify_numeric_input_browser.mjs` PASS (exit 0), including real Master Data Edit/View, all six non-percentage sets, Simulation ordinary/large/tiny/scientific values, full authoritative focus/stepping, Business/Economic fields, Batch Size integer rejection, SG&A maximum/suffix, and Result token containment at 1440/1024/768/390/320px. `node scripts/verify_simulation_round4a_layout.mjs --numeric-layout-only` **121/121 PASS**, exit 0, including all six desktop fields' five hit probes, identical Hover/Focus bounds, expanded-effect/calculated column anchors, and mobile cards. No browser errors. All three changed verifier syntax checks, `tsc -p tsconfig.json --noEmit --pretty false`, and `git diff --check` PASS. TypeScript was justified by the changed shared props/interfaces.
- **Chrome evidence inspected:** decimal/scientific Master Data View, desktop static sizing, scientific Simulation input, expanded effects, and narrow Result/local-scroll presentation. Numeric evidence: `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-selected-value-evidence-hpT6Oe`; layout evidence: `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-simulation-round4a-evidence-4eLgvy`.
- **Scope / limits:** no build, broad Simulation/CBD/Master Data suites, dependency audit, or Excel checks were needed/run. Safari, Firefox, Windows, and physical mobile devices remain **[Unverified]**. Canonical presentation is in `CROSS_CUTTING.md`; the operational next work remains external audit before the existing Round 4B gate, then the previously agreed later work. Historical handoff entries below are unchanged.

## Cost Breakdown semantic color and detail-separator correction — 2026-10-22

- **Status:** **IMPLEMENTED / AWAITING EXTERNAL USER AUDIT**. This targeted correction is not accepted or closed.
- **Repository / branch:** `https://github.com/apirak-k/COSTBREAKDOWN.git`, worktree `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`, branch `feat/selected-value-ux`.
- **Starting point:** freshly fetched remote and local HEAD both matched `34d4ed8070e0d767e9d5c842d71f1c4258d0268c`; the worktree was clean. Implementation commit: `560d699` (`fix(cbd): restore gap color and widen detail insets`), a direct child of that checkpoint.
- **Standard Cost Gap:** positive values retain the existing rose/red `getVarianceClass()` treatment, negative values emerald/green, and zero/unavailable neutral. Chrome showed that the `SelectedNumber` button's `text-inherit` overrode the caller's emerald utility, yielding slate text for negative values. The existing semantic class now sits on an inline parent so `SelectedNumber` still owns Hover, the 350ms Header Preview, Pin/Unpin, keyboard focus, and its existing geometry.
- **Detail separators:** expanded Cost Breakdown BOM and Routing retain FULL main→first-detail and final-detail→next-main boundaries. The two Detail→Detail dividers now use symmetric gutters matching the historical first selection-column width (about 4% of rendered table width per side). White detail rows, indentation, vertical guide, and interactions remain unchanged. Simulation separators were not changed.
- **Chrome evidence:** `node scripts/verify_cbd_selected_value_browser.mjs` exited 0 with **280/280 PASS** at 1440 / 1024 / 768 / 390 / 320px, including positive rose, negative emerald, zero neutral, existing SelectedNumber interactions, and BOM/Routing separator geometry. No browser errors or warnings. Expanded BOM and BOM+Routing screenshots were visually inspected. Evidence: `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-cbd-selected-evidence-7qSUi9`.
- **Other required checks:** `npm run build` exited 0 with existing ExcelJS / fast-csv browser externalization and >500 kB chunk warnings; `node --check scripts/verify_cbd_selected_value_browser.mjs` and `git diff --check` passed.
- **Files changed by the implementation:** `src/features/cost-breakdown/CostBreakdownPage.tsx`, `src/features/cost-breakdown/components/BOMDetailedTable.tsx`, `src/features/cost-breakdown/components/RoutingDetailedTable.tsx`, and `scripts/verify_cbd_selected_value_browser.mjs`. No calculations, business rules, Simulation, Master Data, numeric precision, or later-round work changed.
- **[Unverified]** The browser fixture checks exact zero but does not construct a near-zero nonzero or unavailable full Standard Cost Gap. Those values still use the existing neutral helper/branch.

## Pre-Round-4B Simulation input / expandable-row correction — 2026-10-22

- **Status:** Round 1 CLOSED; Round 2 — Master Data CLOSED; Round 3 — Cost Breakdown CLOSED; the original five-item Round 4A — Simulation UI Polish CLOSED; this pre-Round-4B correction is **IMPLEMENTED / AWAITING EXTERNAL USER AUDIT**; Global authoritative-full-value-on-edit is **NOT STARTED**; Round 4B is **NOT STARTED / BLOCKED UNTIL FRAME ACCEPTANCE**; Global direct-edit blue-value indicator is **NOT STARTED**; Round 5 is **NOT STARTED**. This pass does not accept or close the correction.
- **Repository / branch:** `https://github.com/apirak-k/COSTBREAKDOWN.git`, worktree `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`, branch `feat/selected-value-ux`.
- **Actual starting point:** freshly fetched `origin/feat/selected-value-ux` and local HEAD both matched `6dc0098b921a3f115d54413acfb6fa59fa1ac94a`. The worktree contained one pre-existing partial change to the Simulation browser verifier from this correction; no unrelated files were present. The remote did not move during implementation.
- **Simulation Focus and hit-area result:** retained the accepted pre-`9307fc` 2px blue inset Focus appearance (`#1d4ed8`, `outline-offset: -2px`, established 2px radius). All six desktop editable inputs now move with their geometry-derived visible frame; equal padding compensation keeps the numeric text axis fixed. Chrome had rounded the input's native hit-test beyond the fractional visible left edge, so an outside-left press could target and focus the input even when Hover was false. Clipping the transparent input by 0.5px removes that overshoot without changing rendered input/frame dimensions or mobile-card layout. The verifier checks Hover, click/focus, blur, and unchanged value at inside-left, center, inside-right, outside-left, and outside-right for each field at 1440 / 1024 / 768px.
- **Separator result at that pass (superseded for Cost Breakdown by the correction above):** Cost Breakdown BOM/Routing used a full main→first-detail boundary, two symmetric 6px-inset detail→detail rules, and a full final-detail→next-main boundary. Simulation BOM/Routing have one detail row each, with full boundaries above and below and no inset rule. White detail surfaces, no independent hover, indentation, vertical guides, selection, expansion, drag/reorder, formulas, domains, and mobile structure remained unchanged.
- **Actual Simulation Chrome evidence:** `node scripts/verify_simulation_round4a_layout.mjs` exited 0 with **160/160 PASS** at 1440 / 1024 / 768 / 390 / 320px. All six desktop fields passed the five pointer probes; Hover/Focus rectangles and historical Focus styling, axes, dimensions, mobile behavior, and Simulation row boundaries passed. Hover, Focus, inside-left pointer, BOM-expanded, and Routing-expanded screenshots were captured and visually inspected. Evidence: `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-simulation-round4a-evidence-NCMuYC`.
- **Cross-page Chrome evidence:** the CBD verifier printed **277/277 passed**, including symmetric separator geometry for BOM and Routing; Master Data printed **151 passed, 0 failed**. CBD BOM-expanded and BOM-plus-Routing-expanded screenshots were visually inspected. Evidence: `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-cbd-selected-evidence-mTA5xB`; Master Data evidence: `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-master-selected-evidence-M2nG1n`. Both browser harnesses printed their complete pass summaries with no browser errors, but their Node processes remained open during post-run cleanup and were stopped manually; assertion exit codes were not captured.
- **Regression / build / source checks:** `node scripts/verify_simulation_regression.mjs` exited 0 with all nested suites passing; it printed existing Vite SSR WebSocket port `24678 is already in use` notices. `npm run build` exited 0 with existing ExcelJS / fast-csv `fs` / `crypto` externalization notices and the main-chunk-over-500-kB advisory. Both changed browser verifiers passed `node --check`; `git diff --check` passed before implementation commit.
- **First-run diagnosis:** before adding the input clip, the browser verifier failed five outside-left probes (155/160); event traces showed Chrome delivered those presses to the native input despite the pointer being one CSS pixel outside its fractional frame. I reproduced the event target, corrected the hit geometry, and reran the full verifier successfully. This was a real hit-test issue, not a timing assertion; no waits were loosened to hide it.
- **Implementation commit:** `bd30cd3628738733a51b91aee796fc094ae5aca4` (`fix: align simulation hit area and row separators`), a direct child of the actual starting SHA. It changes only `src/features/simulation/SimulationPage.tsx`, `src/features/cost-breakdown/components/CandidateFindingsTable.tsx`, `src/features/cost-breakdown/components/BOMDetailedTable.tsx`, `src/features/cost-breakdown/components/RoutingDetailedTable.tsx`, `scripts/verify_simulation_round4a_layout.mjs`, and `scripts/verify_cbd_selected_value_browser.mjs`.
- **Agreed next-work order after this correction is externally accepted:** (1) Global authoritative-full-value-on-edit; (2) audit / accept; (3) Round 4B — Simulation Selected Value / Decimal UX; (4) audit / accept / close Round 4; (5) Global direct-edit blue-value indicator; (6) audit / accept; (7) Round 5 — Final Cross-page Regression; (8) after Phase 2: Excel validation → real-world usage test → portable distribution. These items remain NOT STARTED; Round 4B remains blocked until frame acceptance.
- No merge, rebase, force-push, branch change, dependency change, Global A, Round 4B, Global B, or Round 5 implementation occurred. Documentation is recorded in a separate commit; pushed HEAD is reported in the final delivery because this file cannot embed the SHA of the commit that contains itself.
- **[Unverified]** Firefox, Safari, physical touch hardware, and screen-reader behavior were not tested. Browser evidence came from the project's isolated local Chrome/CDP harness.

## Simulation input-frame correction — 2026-10-22

- **Status:** Round 1 CLOSED; Round 2 — Master Data CLOSED; Round 3 — Cost Breakdown CLOSED; the original five-item Round 4A — Simulation UI Polish CLOSED; the later targeted input-frame correction is **IMPLEMENTED / AWAITING EXTERNAL USER AUDIT**; Round 4B — Simulation Selected Value / Decimal UX is **NOT STARTED / BLOCKED UNTIL FRAME ACCEPTANCE**; Round 5 is **NOT STARTED**. This correction has not been accepted or closed by this implementation pass.
- **Repository / branch:** `https://github.com/apirak-k/COSTBREAKDOWN.git`, worktree `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`, branch `feat/selected-value-ux`.
- **Actual starting point:** local and freshly fetched `origin/feat/selected-value-ux` both matched `100ee3fc7c1d432e356609e05bbb09f7eb826b8f`; the worktree was clean. This was the actual remote SHA and matched the expected latest external-audit checkpoint.
- **Reopened work and audit result:** previous implementation `e9fe4fa46d5bd418d77fd569620de353e367e158` and its documentation receipt / starting checkpoint `100ee3fc7c1d432e356609e05bbb09f7eb826b8f` were externally audited and **NOT ACCEPTED**. The two confirmed problems were different visible frame geometry for Hover and Focus, and the exact 4px shift failing to achieve the intended visual balance. Root cause: the shifted overlay drew Hover, but Focus reverted to the original input outline; the verifier asserted the chosen 4px offset instead of the visual contract.
- **Corrected behavior:** all six desktop BOM / Routing editable parameter fields now use one canonical overlay frame for Hover and Focus. The frame's rightward translation is derived from the input width, measured current draft text width (Canvas using the computed input font), and right inset: `max(0px, 50% - textWidth / 2 - rightInset)`. This rebalances the frame around the unchanged numeric value axis. Hover and Focus change only the frame style; their visible rectangles stay the same. Input text axis, input width and height, table columns, expanded-effect/calculated axes, and mobile-card editors remain unchanged. No formulas, domains, precision/storage, calculations, histories, role/basis ownership, or other page behavior changed.
- **Actual Chrome evidence:** the isolated local Chrome/CDP run of `node scripts/verify_simulation_round4a_layout.mjs` exited 0 with **138/138 PASS** at 1440, 1024, 768, 390, and 320px, with no browser errors or uncaught exceptions. It typed `4.00`, `8.00`, and `15.00` into representative fields; checked all six desktop fields, value axes, unchanged input/frame dimensions, canvas-derived balance, identical Hover/Focus rectangles and transitions, mobile geometry, overflow, and existing axes. Captured Hover and Focus screenshots at 1440 / 1024 / 768 were visually inspected and showed the same frame rectangle in each state, with clear space on both sides of the fixed value. Evidence directory: `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-simulation-round4a-evidence-6Ls30M`.
- **Regression / build / checks:** `node scripts/verify_simulation_regression.mjs` exited 0 with all nested suites passing; it printed the existing Vite SSR WebSocket port `24678 is already in use` notices. `npm run build` (`tsc -b && vite build`) exited 0; it printed existing ExcelJS / fast-csv `fs` / `crypto` externalization notices and the large main-chunk advisory. `node --check scripts/verify_simulation_round4a_layout.mjs` and `git diff --check` passed. The final browser verifier completed normally. `npm audit` found 10 existing advisories (6 high, 4 moderate, 0 critical); no dependency or lockfile was changed.
- **Implementation commit:** `9307fcdead2ffa06fe0523dbbccbc4701ee72c06` (`fix: align simulation input frame states`), a direct child of the actual starting checkpoint. Changed files: `src/features/simulation/SimulationPage.tsx` and `scripts/verify_simulation_round4a_layout.mjs`.
- **Agreed next-work order:** (1) external audit and acceptance of this frame correction; (2) implement the global authoritative-full-value-on-edit correction; (3) audit and accept that global numeric correction; (4) implement Round 4B — Simulation Selected Value / Decimal UX; (5) audit / accept and close Round 4; (6) implement the global direct-edit blue-value indicator; (7) audit / accept that global UX item; (8) run Round 5 — Final Cross-page Regression; (9) after Phase 2, Excel validation → real-world usage test → portable distribution. These are workflow steps, not additional Phase 2 rounds. Global A, Round 4B, Global B, and Round 5 remain NOT STARTED.
- No merge, rebase, force-push, branch change, dependency change, Round 4B, Global A, or Global B implementation occurred. The final documentation commit and pushed HEAD are recorded in the final delivery; this file cannot embed the SHA of the commit that contains itself.
- **[Unverified]** Firefox, Safari, physical touch hardware, and screen-reader behavior were not tested. Chrome was run in the project’s isolated local CDP harness; no user-attached Chrome session was available. Repository-wide dependency advisories remain as listed above.

## Previous Round 4A Simulation UI Polish closure — 2026-10-22

- **Status:** Round 1 CLOSED; Round 2 — Master Data CLOSED; Round 3 — Cost Breakdown CLOSED; Round 4A — Simulation UI Polish CLOSED; Round 4B — Simulation Selected Value / Decimal UX NOT STARTED / NEXT; Round 5 NOT STARTED.
- **Repository / branch:** `https://github.com/apirak-k/COSTBREAKDOWN.git`, worktree `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`, branch `feat/selected-value-ux`.
- **Starting checkpoint:** local HEAD and freshly fetched `origin/feat/selected-value-ux` both matched `9c852a8a56b94145ad7ce0415956c9670230f716`; the target worktree was clean before implementation. No unexpected remote movement or unrelated target changes were found.
- **Scope:** only the five requested Round 4A presentation corrections were implemented: desktop BOM / Routing numeric-axis alignment; Cost Structure `Show all` at the graph-card top-right, separate from the eight-item Legend group; modest Result-row spacing; a larger internal Break-even plot; and a better-fitted Cost Structure plot using one canonical coordinate system. Narrow card layout and existing graph/viewBox scaling remain in place.
- **Result:** header, input/read-only value, expanded effect, calculated cost, and expanded Total axes now use consistent numeric cell geometry. `Show all` remains in the Cost Structure card and retains its disabled / restore-all behavior. Result rows gain one pixel of vertical padding while subtotal styling stays unchanged. Break-even bounds are `x=52..544`, `y=12..117`. Cost Structure bounds are `x=74..784`, `y=32..280`, with role / GAP centers derived from the same coordinates; the graph has no outer translate.
- **Actual Chrome:** `node scripts/verify_simulation_round4a_layout.mjs` passed **49/49** at 1440 / 1024 / 768 / 390 / 320px in isolated Chrome. It inspected actual editable and read-only table values, expanded effects and totals, Show all location/semantics, Result spacing, graph bounds and labels, ruler and Selling Price tooltip, Break-even markers/QTY/Batch control, responsive card behavior, and no page overflow. The browser run reported no console errors or uncaught exceptions. Screenshots were captured at all five widths under `/var/folders/4p/ks_ctbg136sd7q36d00xgnfm0000gn/T/costbreakdown-simulation-round4a-evidence-xK075U`.
- **Regression:** `node scripts/verify_simulation_regression.mjs` passed all nested Simulation, Result, Economic / Break-even, graph, role/history, and shared regressions. It printed existing Vite SSR WebSocket port `24678 is already in use` notices and exited 0. Master Data Selected Value browser regression passed **151/151**; Cost Breakdown Selected Value browser regression passed **271/271**, both at 1440 / 1024 / 768 / 390 / 320px.
- **Build and checks:** `npm run build` (`tsc -b && vite build`) passed; `node --check scripts/verify_simulation_round4a_layout.mjs` and `git diff --check` passed. The build emitted existing ExcelJS / fast-csv `fs` / `crypto` browser-externalization notices and the main-chunk-over-500-kB advisory. No dependencies or lockfiles changed.
- **Specification / verification updates:** `docs/specs/SIMULATION.md` now documents desktop numeric-axis alignment, the fitted canonical Cost Structure geometry, and `Show all` as a separate card-level action at the top-right. Simulation story/economics assertions were updated to match; a focused browser verifier was added.
- **Implementation commit:** `be91fb5` (`fix: polish simulation layout and graph geometry`), a direct child of the starting checkpoint.
- No formulas, business-domain validation, state ownership, persistence, precision behavior, or Selected Value integration changed. Round 4B was not started. No merge, rebase, or force-push was performed.
- **[Unverified]** Firefox, Safari, physical touch hardware, and screen-reader behavior were not tested. At 320px, dense SVG labels remain small at the existing viewBox scale, but browser bounds checks found no clipping or distortion.

## Round 3 targeted correction and reclosure — 2026-10-22

- **Status:** Round 1 CLOSED; Round 2 — Master Data CLOSED; Round 3 — Cost Breakdown CLOSED; Round 4 — Simulation NOT STARTED / NEXT; Round 5 NOT STARTED.
- **Starting checkpoint:** the local branch and freshly fetched `origin/feat/selected-value-ux` matched `5a2ec42d456bc3c9ebece35ba162ea89b5c902de`. The worktree was clean before this correction; no remote divergence or unrelated changes were present.
- **Scope and root cause:** this pass reopened Round 3 only for three corrections. `CandidateFindingsTable` stopped click bubbling on entire `td` cells, preventing their unused whitespace from reaching the CHANGED row. Shared `SelectedNumber` used `group-hover`, so an ancestor Candidate row could activate Number Hover, and its color was weaker than the finalized `#E9EEF4`.
- **Candidate interaction result:** the row owns Expand / Collapse for eligible CHANGED rows. Unused whitespace in ordinary row areas and numeric, `#`, and reorder cells expands/collapses while preserving Pin. The actual SelectedNumber pins/unpins only; the `#` button selects/deselects only; the reorder button keeps drag/reorder behavior only. ADDED, REMOVED, and UNCHANGED rows remain non-expandable. The decorative chevron and expanded detail order remain unchanged.
- **Shared visual result:** every active no-focus `SelectedNumber` remains transparent at rest, uses `#E9EEF4` on direct pointer hover only, and keeps the existing `blue-100` Pin. Row hover leaves all Candidate SelectedNumbers transparent; hovering one number fills only that number, and leaving it while remaining in the row restores transparency. Keyboard focus keeps its visible ring. Content sizing, no-pointer-ring behavior, geometry, and the 350ms Header Preview remain unchanged.
- **Caller inventory:** active `SelectedNumber` call sites are in Master Data and Cost Breakdown; the Simulation feature has no active `SelectedNumber` caller.
- **Actual Chrome:** `node scripts/verify_cbd_selected_value_browser.mjs` passed **271/271** in isolated Chrome at 1440 / 1024 / 768 / 390 / 320px. It explicitly exercised ordinary row whitespace, numeric-cell whitespace, `#`-cell whitespace, reorder-cell whitespace, actual numeric Pin / Unpin, actual `#` selection / deselection, blank workspace Pin dismissal, and real drag-and-drop from a CHANGED row with an active Pin. The drag verification observed React dragstart, target dragover and drop, a changed row order, and preserved Pin, selection, and collapsed state. It also checked all three non-CHANGED statuses remain closed, row-versus-number hover, exact computed colors, keyboard focus, 350ms Preview, Candidate detail ordering, and responsive geometry. One attempt timed out on `Input.dispatchMouseEvent` during Work Center checks; another reached the new status checks but Chrome closed its DevTools connection before the remaining checks. A fresh isolated Chrome run then completed all 271 checks. No uncaught exceptions, console errors, or warnings were recorded in the passing run.
- **Round 2 browser regression:** `node scripts/verify_master_data_selected_value.mjs` passed **151/151** at 1440 / 1024 / 768 / 390 / 320px, with no browser errors or warnings.
- **Regression, build, and checks:** `node scripts/verify_numeric_input.mjs`, `node_modules/.bin/jiti scripts/verify_numeric_integrity.ts`, `node scripts/verify_page_navigation_persistence.mjs`, and `node scripts/verify_simulation_regression.mjs` passed. The Simulation regression printed existing Vite SSR WebSocket port `24678` in-use notices but exited successfully with all suites passing. `npm run build` (`tsc -b && vite build`) passed; it printed the existing ExcelJS / fast-csv `fs` / `crypto` browser-externalization notices and main-chunk-over-500-kB advisory. `node --check scripts/verify_cbd_selected_value_browser.mjs` and `git diff --check` passed.
- **Implementation commit:** `9536da7edec07d29e808bec8af8c45a16e8be621` (`fix: correct selected value interaction boundaries`), a direct child of the starting remote SHA.
- **Implementation files:** `src/shared/ui/selected-value.tsx`, `src/features/cost-breakdown/components/CandidateFindingsTable.tsx`, and `scripts/verify_cbd_selected_value_browser.mjs`.
- **Closure documentation:** `docs/specs/CROSS_CUTTING.md`, `docs/specs/COST_BREAKDOWN.md`, `docs/REQUIREMENTS_INDEX.md`, this plan, and this handoff record the corrected current behavior and closure.
- No formulas, business logic, numeric validation/domain rules, stored/calculation precision, or Round 4 implementation changed. No merge, rebase, or force-push was performed.
- **[Unverified]** Firefox, Safari, physical touch hardware, and screen-reader behavior were not tested.

## Previous Round 3 post-implementation UX polish and closure — 2026-10-22

- **Status:** Round 1 CLOSED; Round 2 — Master Data CLOSED; Round 3 — Cost Breakdown CLOSED; Round 4 — Simulation NOT STARTED / NEXT; Round 5 NOT STARTED.
- Repository: `https://github.com/apirak-k/COSTBREAKDOWN.git`; active worktree `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`; branch `feat/selected-value-ux`.
- **Starting checkpoint:** local and freshly fetched `origin/feat/selected-value-ux` both pointed to `fe0bb59280bbc739d21218672846a1c68ba536d2`; the worktree was clean and no divergence was present.
- **Scope:** only the three finalized polish items were changed: Candidate chevron becomes decorative, active no-focus `SelectedNumber` visuals hug the rendered number, and Pin can be discarded by same-value activation or a safe blank/background click. The accepted Round 3 implementation at `fe0bb592...`, Rounds 1–2 history, formulas, domains, calculations, comparison semantics, and data/history behavior remain intact.
- **SelectedNumber result:** immediate pointer hover applies a light background to a content-sized inner wrapper; Header Preview keeps the 350ms dwell. Pin uses a stronger content-sized fill without a pointer ring or geometry movement. Keyboard focus retains its visible ring. Same-value activation toggles Pin off; blank/background click clears it; a different value moves Pin. Buttons, inputs, selectors, filters, popovers/menus, Candidate `#`, Sizing, and drag/reorder controls retain their behavior and preserve Pin.
- **Candidate result:** a CHANGED row remains the only expansion owner and retains `aria-expanded`, click, Enter, and Space behavior. The decorative `aria-hidden` chevron has no independent button, focus target, tooltip/title, hover surface, or accessibility entry. Numeric values, `#`, and drag/reorder remain excluded from row expansion; ADDED / REMOVED rows remain non-expandable.
- **Actual Chrome:** `node scripts/verify_cbd_selected_value_browser.mjs` passed **257 / 257** in isolated Chrome at 1440 / 1024 / 768 / 390 / 320px. This exercised Master Data Selling Price and SG&A plus active Cost Breakdown summary, Candidate, and detail sources; Preview timing/restoration; Pin/move/unpin/click-away; preserved control actions; Candidate keyboard/pointer/chevron behavior; #/numeric/reorder exclusions; actual drag/drop; short and long content; negative and percentage values; alignment; local horizontal scrolling; no page overflow; and main/detail axes. No browser exceptions, console errors, or warnings were recorded. `node scripts/verify_master_data_selected_value.mjs` also passed **151 / 151** at those viewports. `node scripts/verify_numeric_input_browser.mjs` verified actual `12.3456789` entry in Master Data, Simulation, Business, and Economic inputs.
- **Regression/build PASS:** `node scripts/verify_numeric_input.mjs`; `scripts/verify_selected_comparison_boundary.ts`, `scripts/verify_selected_comparison_lifecycle.ts`, and `scripts/verify_numeric_integrity.ts` loaded through Vite SSR; `scripts/verify_cbd_summary_ux.ts` within `node scripts/verify_simulation_regression.mjs`; `npm run build` (`tsc -b && vite build`); `node --check scripts/verify_cbd_selected_value_browser.mjs`; `node --check scripts/verify_numeric_input_browser.mjs`; and `git diff --check` passed. Simulation regression emits Vite SSR WebSocket port `24678` in-use warnings but exits 0. Production build emits existing `fs` / `crypto` externalization notices and the 564.64 kB main-chunk advisory but exits 0. No dependency or lockfile changes were made. `npm audit` was not used as a gate.
- **Active no-focus caller audit:** Master Data Selling Price / SG&A and Cost Breakdown summaries, Candidate main values, and expanded BOM / Routing details. Simulation has no active `SelectedNumber` callers; its numeric input regression still passed.
- **Unverified:** Firefox, Safari, physical touch hardware, and screen-reader behavior.
- **Implementation commit:** `a770d7ee12d0022a195ee8458f02b35cb476de41` (`fix: polish selected value and cost breakdown interactions`), a direct child of the starting SHA.
- **Implementation files:** `src/shared/ui/selected-value.tsx`, `src/features/master-data/components/MasterDataNumericValue.tsx`, `src/features/cost-breakdown/components/BOMDetailedTable.tsx`, `src/features/cost-breakdown/components/CandidateFindingsTable.tsx`, `src/features/cost-breakdown/components/RoutingDetailedTable.tsx`, `src/features/cost-breakdown/components/SnapshotComparisonCard.tsx`, `src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx`, `scripts/verify_cbd_selected_value_browser.mjs`, `scripts/verify_cbd_summary_ux.ts`, and `scripts/verify_numeric_input_browser.mjs`.
- **Closure documentation files:** `docs/specs/CROSS_CUTTING.md`, `docs/specs/COST_BREAKDOWN.md`, `docs/specs/MASTER_DATA.md`, `docs/specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md`, `docs/REQUIREMENTS_INDEX.md`, `docs/PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md`, and this handoff.
- No Round 4 or Round 5 implementation, dependency change, merge, rebase, or force-push was performed.

## Previous Round 2 UX polish and closure — 2026-10-21

- **Status at that checkpoint:** Round 1 CLOSED; Round 2 — Master Data CLOSED after final polish and its acceptance gate; Round 3 — Cost Breakdown NOT STARTED / NEXT; Rounds 4–5 NOT STARTED.
- Repository: `https://github.com/apirak-k/COSTBREAKDOWN.git`; active worktree `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`; branch `feat/selected-value-ux`.
- **Starting checkpoint:** local and freshly fetched `origin/feat/selected-value-ux` both pointed to `ae304f6f7a0d289e2e1ba77e49d3dc5e149efd1c`; no unexpected divergence was present. The worktree was clean before this task's implementation edits.
- **Chronology:** the previous Round 2 correction already passed its requested acceptance gate. This task applies only the later-finalized 350ms Hover Preview dwell and stable Header geometry / calm editable affordance. The prior correction and its history remain valid.
- **Root cause:** source pointer-enter published Preview immediately, so moving across numeric cells switched Header values without a dwell. Header `%` and spinner elements were conditional siblings, and editable/read-only states used different internal spacing and visible border treatments; those transitions could move the numeric axis or make the Header look like an input merely because a body source was hovered.
- **Dwell fix:** `SelectedValueProvider` keeps one pending source and a 350ms timer. Pointer leave/source cleanup cancels the matching timer; a new target or focus/pin action cancels the old target; provider scope changes/unmount cancel pending work; the timer also checks pending-object identity and the latest scope before publishing. Once Preview is active, pointer leave clears it promptly and restores Focus/Pin or `Value —`.
- **Header geometry:** global Header Value is bounded to 96–192px with a 28vw preferred width. It reserves a 32px `Value` label, a flexible right-aligned numeric zone, a fixed 10px `%` slot, and a fixed 12px spinner slot. `%` is visually absent when not needed. Editable, read-only, Preview, Focus, Pin, and empty states keep the numeric axis and slots in place. Narrow text scrolls inside its output without page-level overflow.
- **Editable affordance:** an editable Focus anchor is visually calm when the pointer is outside Header Value; the reserved real spinner is hidden. Direct Header hover reveals the subtle boundary and spinner. Actual Header input focus shows the clear blue focus treatment and keeps the spinner usable. Source hover cannot expose an editable frame. Read-only Header values reserve identical geometry without an interactive spinner/frame; Preview remains non-owning and actual editable Focus remains the sole writer.
- **Real Chrome evidence:** isolated Chrome browser verifiers exercised actual app UI at 1440, 1024, 768, 390, and 320px. `verify_numeric_input_browser.mjs` passed actual Master Data, Simulation, Business, and Economic entry of `12.3456789`; fast pass/dwell behavior, cancellation, races, source unmount/scope invalidation, Focus/Pin restoration, stable numeric / `%` / spinner zones, direct hover/focus affordance, internal narrow-value scrolling, and page-overflow checks passed. `verify_master_data_selected_value.mjs` passed **151 passed / 0 failed**, including Master Data editable and native read-only source fast pass/dwell behavior, anchored Focus restoration, non-owning Preview, and existing grid focus/navigation behavior.
- **Regression and build PASS:** `node scripts/verify_numeric_input.mjs`; `node scripts/verify_numeric_input_browser.mjs`; `node scripts/verify_master_data_selected_value.mjs`; `node scripts/verify_master_data_ui_state.mjs`; `node_modules/.bin/jiti scripts/verify_numeric_integrity.ts`; `node_modules/.bin/jiti scripts/verify_master_data_spreadsheet_batch.ts`; Dataset Sizing / Clone, toolbar / Prepare, quality navigation, edit history, sizing no-op / preservation, row order, Clear, Custom, Clone readiness, rename / empty-edit, and Handoff verifiers; `node scripts/verify_global_compact_overlays.mjs`; `node scripts/verify_page_navigation_persistence.mjs`; `node scripts/verify_simulation_regression.mjs`; `node_modules/.bin/tsc -p tsconfig.json --noEmit --pretty false`; `npm run build`; browser-script `node --check`; and `git diff --check` all passed. Global compact-overlay and navigation-persistence scripts are source-contract checks; browser evidence is supplied by the two isolated Chrome verifiers.
- Simulation regression exits 0 with the existing nested Vite SSR WebSocket port `24678` in-use warning. Production build passes with the existing ExcelJS / fast-csv browser externalization warnings (`fs`, `crypto`) and main chunk advisory at 558.62 kB (>500 kB). No dependency or lockfile changes were made.
- **[Unverified]** Firefox, Safari, touch hardware, and screen-reader behavior were not tested. The browser harness does not expose the raw stored BOM Loss fraction directly; the existing edit/reselect path exercises its unchanged conversion callsites. No formulas, domain validation, percentage conversion, history, dataset lifecycle, spreadsheet behavior, or stored/calculated precision changed.
- **Changed files (implementation commit):** `src/shared/ui/selected-value.tsx`, `src/shared/layout/HeaderValue.tsx`, `src/shared/ui/NumericInput.tsx`, `scripts/verify_numeric_input_browser.mjs`, `scripts/verify_master_data_selected_value.mjs`, `scripts/verify_master_data_ui_state.mjs`.
- **Changed files (closure documentation commit):** `docs/specs/CROSS_CUTTING.md`, `docs/specs/MASTER_DATA.md`, `docs/specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md`, `docs/REQUIREMENTS_INDEX.md`, `docs/PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md`, `HANDOFF.md`.
- **Implementation commit:** `2fcf86857bce76927a7bb8312057069d3b2cf4bf` (`fix: stabilize selected value hover and header layout`), a direct child of the starting checkpoint. The separate documentation receipt records final Round 2 closure; the final delivery report records its SHA and the pushed remote SHA.
- No Round 3+ implementation was introduced. No merge, rebase, or force-push was performed.

---

# Previous Handoff — Phase 2 Selected Value / Decimal UX — 2026-10-21

## Prior accepted Round 2 correction — before final UX polish

- **Status at that checkpoint:** Round 1 CLOSED; the prior Round 2 correction passed its verify / audit / accept gate; Round 3 — Cost Breakdown NOT STARTED / NEXT; Rounds 4–5 NOT STARTED.
- Repository: `https://github.com/apirak-k/COSTBREAKDOWN.git`; worktree `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`; branch `feat/selected-value-ux`.
- This correction started at local HEAD `4df905927ee9237a5e7a9e335e1bee9f8ce73825`; a fresh fetch confirmed `origin/feat/selected-value-ux` matched and the worktree was clean before this task's edits. The earlier Round 2 recovery commit and documentation were already on that branch.
- **Root cause corrected:** the provider displayed Focus before Preview and rejected editable-source previews; active Master Data editable and native-focus value wrappers did not publish pointer previews. Header writer eligibility followed the displayed selection, and replacing the Header editor with another source's preview could clear the Focus anchor on blur. Writer ownership now follows the actual focused editable source while preview temporarily controls display. Header blur retains the anchor across preview-driven editor replacement.
- **Accepted interaction:** Hover is a temporary, read-only preview above anchored Focus/Pin; leaving restores the anchor or `Value —`. Focus remains the sole owner of an editable writer. Hovering an editable peer cannot inherit a writer; same-source hover preserves the editable Header. Master Data native View cells retain their native grid target and neutral gray hover while previewing Header. No-focus `SelectedNumber` keeps its thin blue hover ring and stronger pinned styling.
- **Accepted precision:** Header presentation is capped at 8 decimal places, trims trailing zeros, removes floating-point display noise, and uses scientific notation for tiny nonzero values. Editable drafts and stored/calculated values retain their full underlying precision. Body/table formatting remains 2 → 4 → scientific fallback. Header width is bounded at 80–192px with a 17vw preferred width; `-123.12345678` fits at 1440 / 1024 / 768px and scrolls within the value output at 390 / 320px without page overflow.
- **Master Data source audit:** BOM (3), Work Center (2), and Routing (3) grid values use native Focus + gray preview in View and editable Focus + writer in Edit. Metadata Selling Price / SG&A use no-focus `SelectedNumber` inspection in View. Reachable Dataset Sizing sources retain their existing focused editable behavior. Unreachable legacy AddBOMModal / AddRateModal / AddRoutingModal / ProductSetupModal files were not integrated.
- **Real Chrome evidence:** isolated browser verification passed `verify_master_data_selected_value.mjs` at **147 passed / 0 failed**. It covers no-anchor hover/leave, focused read-only A → preview B → restore A, focused editable A → non-owning editable/read-only B preview → restore A and writer, same-source hover, Pin/preview/restore, native gray View-cell focus/navigation without `SelectedNumber`, Master Data percentage Header normalization (`20.000000000000004` → `20 %`), and compact / responsive behavior at 1440 / 1024 / 768 / 390 / 320px. No-focus inspection visuals and source cleanup are checked in Chrome.
- `verify_numeric_input_browser.mjs` passed in isolated Chrome: actual Master Data, Simulation, Business, and Economic inputs each accepted and retained `12.3456789`; body presentation after blur was `12.35`. Shared Header precision cases, non-mutating focus/blur, percentage noise cleanup, body-format regression, and responsive bounded width passed. At 1440 / 1024 / 768px the typical negative 8-decimal value fits; at 390 / 320px it remains contained and internally scrollable without page overflow.
- **PASS:** `node scripts/verify_numeric_input.mjs`; `node scripts/verify_numeric_input_browser.mjs`; `node scripts/verify_master_data_selected_value.mjs`; `node scripts/verify_master_data_ui_state.mjs`; `node_modules/.bin/jiti scripts/verify_numeric_integrity.ts`; `node scripts/verify_global_compact_overlays.mjs`; `node scripts/verify_page_navigation_persistence.mjs`; `node scripts/verify_simulation_regression.mjs`; spreadsheet batch, Dataset Sizing / Clone, toolbar / Prepare, quality navigation, edit history, sizing no-op / preservation, row order, Clear, Custom, Clone readiness, rename / empty-edit verifiers; `npx tsc -p tsconfig.json --noEmit --pretty false`; `npm run build`; browser-script `node --check`; and `git diff --check`.
- Simulation regression exits 0 with existing nested Vite SSR “port 24678 already in use” warnings. Build passes with existing ExcelJS / fast-csv browser externalization warnings and the >500 kB main-chunk advisory. A combined verifier invocation once emitted transient React hook warnings; its standalone rerun passed with no browser warnings. `npm audit --audit-level=high` exits 1 with the same pre-existing 10 advisories (6 high, 4 moderate, 0 critical); no dependency or lockfile changed.
- **[Unverified]** Chrome's app harness does not expose the raw stored BOM Loss fraction for direct browser inspection. The real edit / reselect / Edit-preview / View-preview path exercises the unchanged fraction `/ 100` writer and `* 100` reader; those conversion callsites were not changed. Firefox, Safari, touch hardware, and screen-reader behavior were not tested.
- The previous Round 2 implementation at `b89c283522e37a9d9e59535a81e3e0a3c8016053` remains valid for the requirements finalized at that time. This post-close correction records requirements finalized afterward; it does not rewrite or invalidate that history. No Cost Breakdown Round 3, Simulation Round 4, formulas, domains, calculations, lifecycle/history semantics, merge, rebase, or force-push are part of this closeout.
- **Final correction implementation commit:** `1c7f18092c5989f05a7eef371beef95bee083f44` (`fix: finalize master data hover preview and header precision`), a direct child of the verified starting SHA above. This Handoff and the execution-plan update form the separate closure-documentation commit.
- **Files changed in this final correction:** `src/shared/ui/selected-value.tsx`, `src/shared/ui/numeric-display.ts`, `src/shared/ui/NumericInput.tsx`, `src/shared/layout/HeaderValue.tsx`, `src/features/master-data/components/MasterDataNumericValue.tsx`, `scripts/fixtures/selected-value-browser.tsx`, `scripts/verify_numeric_input.mjs`, `scripts/verify_numeric_input_browser.mjs`, `scripts/verify_master_data_selected_value.mjs`, `docs/REQUIREMENTS_INDEX.md`, `docs/PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md`, `docs/specs/CROSS_CUTTING.md`, `docs/specs/MASTER_DATA.md`, `docs/specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md`, and `HANDOFF.md`.

## Previous checkpoint — Round 1 acceptance (historical)

- Repository: `https://github.com/apirak-k/COSTBREAKDOWN.git` (`apirak-k/COSTBREAKDOWN`). Worktree: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`. Branch: `feat/selected-value-ux`.
- Final acceptance correction starting local HEAD and freshly fetched `origin/feat/selected-value-ux`: `4b841c4a8198d996bee1a0a785c7518756a7620b`; they matched and the worktree was clean before edits. Vite PID `96264` on port 5173 was verified by process cwd as this worktree. After the correction is committed and pushed, the branch HEAD is the final Round 1 acceptance correction; its exact SHA is in the delivery report.
- At that historical checkpoint, Round 1 shared foundation was **CLOSED** by the final acceptance correction commit (`fix: finalize selected number hover contract`, then the branch-tip commit). `76df692fce196d436a55f2e73be2bae5589e58ca` remains the first closure implementation, but browser/runtime acceptance was not complete until that correction. Round 2 — Master Data was still **OPEN at that checkpoint**; it is closed by the current correction recorded above. Rounds 3–5 were **NOT STARTED**. Follow [`docs/PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md`](docs/PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md) for the exact five-round order and gate.
- Historical sequence: `3b3880f79891293662aeb5e622d11941bcf3ea64` initial foundation; `66f8b83f21a4b6590fe974b7935ae97569ac7cef` premature Round 2 start; `3ec9bbebebb01db65b3d8096082680a5e7b18aec` Header correction; `76df692fce196d436a55f2e73be2bae5589e58ca` first closure implementation; `4b841c4a8198d996bee1a0a785c7518756a7620b` documentation receipt. The Header correction is preserved and is not a separate roadmap round.

## Round 1 result

- Round 1 initially closed with Focus ahead of Preview; the post-close Round 2 correction finalized and supersedes that priority with hover preview → anchored Focus/Pin → `Value —`. Read-only values with an existing focus interaction publish to Header without a `SelectedNumber` wrapper or spinner. `SelectedNumber` is reserved for read-only inspection values with no existing focus interaction.
- `SelectedNumber` now keeps the idle background during unpinned pointer hover and keyboard focus. Hover uses only a thin blue ring; keyboard focus retains a clear ring; neither uses the pinned fill or changes `aria-pressed`. Pin uses the stronger dark-blue ring with the existing subtle blue fill. All states retain identical geometry.
- Source/Header transfer keeps the same source identity and writer. A preview may temporarily replace the displayed Header while leaving the focused editable source as the sole writer owner; leaving preview restores that anchor or the pinned value. Source unmount, identity change, and page scope continue to reject stale writes.
- Existing full finite-value handling, adaptive body display, Header styling/geometry, keyboard/caret/wheel/stepper behavior, source domains, conversions, and business formulas were preserved. No Round 2 View-cell recovery or Cost Breakdown / Simulation page integration was implemented.

## Verification performed

- **Before correction — real Chrome reproduction:** the live shared fixture computed idle background `rgba(0, 0, 0, 0)`, pointer-hover background `rgba(239, 246, 255, 0.6)`, and keyboard-focus background `rgb(239, 246, 255)`. The newly added browser assertion failed on the hover fill, confirming the runtime defect.
- **After correction — real Chrome:** the existing isolated-CDP browser verifier reports idle, hover, and keyboard-focus backgrounds all `rgba(0, 0, 0, 0)`; both hover and keyboard focus change the ring, pointer hover leaves `aria-pressed=false`, pin retains `rgb(239, 246, 255)`, and pinned ring differs from hover. Hover geometry remains unchanged. Full Header preview/pin/focus priority, source lifecycle, Enter/Space activation, and responsive Header checks pass.
- **PASS:** `node scripts/verify_numeric_input.mjs` — numeric input/parser and display contracts.
- **PASS:** `COSTBREAKDOWN_BROWSER_BASE_URL=http://localhost:5173/ node scripts/verify_numeric_input_browser.mjs` in isolated Chrome against the running worktree — Master Data, Simulation, Business, and Economic each accepted `12.3456789` while focused and displayed `12.35` after blur; shared focus/preview/pin, keyboard, stale-source, exact-value, and responsive Header checks passed at 1440/1024/768/390/320px.
- **PASS:** `node scripts/verify_master_data_selected_value.mjs` — 125 checks, 0 failures. One cold standalone run timed out at initial Header readiness while Vite optimized dependencies and reloaded; the subsequent direct rerun and a run against the verified live server both passed. The verifier moves the pointer away before keyboard navigation so hover preview does not mask the keyboard-pinned value. This suite does not close Round 2; its Master Data View values still use the wrong shared interaction category.
- **PASS:** `node scripts/verify_master_data_ui_state.mjs`, `node scripts/verify_global_compact_overlays.mjs`, `node scripts/verify_page_navigation_persistence.mjs`, and `node_modules/.bin/jiti scripts/verify_numeric_integrity.ts`.
- **PASS:** `node scripts/verify_simulation_regression.mjs` — Simulation, CBD, Master Data history, shared Header, page navigation, and existing business-state contracts. Existing nested Vite SSR runners report port `24678` already in use but exit 0 and all suites pass.
- **PASS:** `npx tsc --noEmit --pretty false` and `npm run build`. Build retains the existing ExcelJS/fast-csv browser externalization warnings and the 555.01 kB main-chunk advisory.
- **PASS:** `node --check scripts/verify_numeric_input_browser.mjs`, `node --check scripts/verify_master_data_selected_value.mjs`, and final `git diff --check`.

## Final Round 1 acceptance correction

- Only `src/shared/ui/selected-value.tsx` changed in the shared runtime: removed the unpinned hover and keyboard-focus background utilities while keeping their distinct blue rings and the existing pinned fill.
- Updated `scripts/verify_numeric_input_browser.mjs` to assert idle/hover/focus background equality, ring changes, unpinned ARIA state, pin contrast, and unchanged geometry; it saves a dedicated hover screenshot.
- Updated the SelectedNumber contract in `docs/specs/CROSS_CUTTING.md`, the Round 1 close condition/history in `docs/PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md`, and this handoff. The duplicate horizontal separator below this current section was removed.
- No Round 2 Master Data recovery was performed. Master Data View values still use `SelectedNumber` as a known Round 2 issue. No Cost Breakdown / Simulation integration, formulas, numeric domains, calculations, lifecycle/history semantics, or display-format behavior changed.

## Files changed in first shared-foundation closeout

- Shared implementation: `src/shared/ui/selected-value.tsx`, `src/shared/layout/HeaderValue.tsx`, `src/features/master-data/components/MasterDataNumericValue.tsx`.
- Browser fixture and verification: `scripts/fixtures/selected-value-browser.tsx`, `scripts/verify_numeric_input_browser.mjs`, `scripts/verify_master_data_selected_value.mjs`.
- Canonical/operational documentation: `docs/specs/CROSS_CUTTING.md`, `docs/specs/MASTER_DATA.md`, `docs/specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md`, `docs/REQUIREMENTS_INDEX.md`, `docs/PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md`, and this `HANDOFF.md`.

## Files changed in final acceptance correction

- `src/shared/ui/selected-value.tsx` — final acceptance correction in the current branch-tip commit (`fix: finalize selected number hover contract`)
- `scripts/verify_numeric_input_browser.mjs`
- `docs/specs/CROSS_CUTTING.md`
- `docs/PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md`
- `HANDOFF.md`

## Round 2 open issue before recovery (historical)

- The early Round 2 implementation wraps Master Data View-mode numeric grid cells in `SelectedNumber`; their existing grid focus/navigation should instead own a read-only Header value without a second hover/pin frame. This is the known recovery target; do not treat the early integration as accepted.
- Start **Round 2 — Master Data recovery** only after Round 1 is committed and pushed. Compare actual pre-integration history around `3b3880f` and `66f8b83` and restore only affected behavior. Do not reset the branch, revert all of the early integration, or undo the `3ec9bbe` Header correction. Do not start Round 3 before Round 2 passes its own verify/audit/accept/close gate.
- This final correction changes the shared visual state and its browser verifier plus operational/canonical Selected Value documentation only. No formulas, validation domains, dataset lifecycle, comparison semantics, history semantics, or display formatting changed.

## Limits and risks

- `[Unverified]` Firefox/Safari, touch hardware, and assistive-technology screen-reader behavior; browser evidence is isolated Chrome via the repository's CDP verifier.
- **OPEN DEPENDENCY RISK:** `npm audit --audit-level=high` previously reported 10 advisories (6 high, 4 moderate, 0 critical). No dependency or lockfile changes are in this closeout; the audit was not rerun.
- No merge, rebase, force-push, or new branch is part of this closeout.

---

# Historical Handoff — Phase 1 closure — 2026-10-20

## Current checkpoint

- Repository: `https://github.com/apirak-k/COSTBREAKDOWN`. Source-of-truth branch: `feat/ref-current-custom-flow-redesign`. Worktree: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`.
- At the start of this closeout, local HEAD and fetched `origin/feat/ref-current-custom-flow-redesign` both resolved to `55c7be2eb956da7e6102b0b58ace3bca2ee7640c`.
- The existing Vite dev server is PID `96264`, listening on `[::1]:5173`, and its working directory is this same worktree. The served app therefore matches the verified branch and HEAD.
- The Phase 1 runtime correction was committed and pushed on `feat/ref-current-custom-flow-redesign` as `3fe5c7bf8945f1bce5b49b686837aaa841d90d3c`, and is present in the fetched origin branch history. The branch has advanced through `4b1a9fe` to `55c7be2`; retain those later commits and do not reset to the Phase 1 commit.
- The separate `logic/simulation-finalized-implementation` checkout is historical/reference material. No merge, cherry-pick, or port from that branch is required or intended.
- Current-source audit confirms Phase 1 remains intact: numeric inputs accept unrestricted fractional digits within finite JavaScript-number representation; shared and caller validation retain finite-number and canonical field-domain checks; integer fields remain whole numbers; accepted values flow into stored/calculated state without precision-based rounding; regular decimal formatting remains presentation-only; Capacity and Yield have no precision-derived minimum; formulas and business-domain rules are unchanged.
- This closeout changes documentation only. It introduces no Phase 2 decimal-formatting behavior and changes no product code. The SG&A statement in the Master Data spec now agrees with the canonical 0–100% inclusive domain.
- Verification for this closeout: source and active-spec audit, final diff inspection, and `git diff --check`. No broad regression suite was run because the changes are documentation-only; the prior real-browser Phase 1 verification remains recorded in the historical checkpoint below.
- This documentation-only closeout is committed as a direct child of the verified starting HEAD.

---

# Historical Handoff — Phase 1 decimal input runtime correction — 2026-10-20

This checkpoint records the state at served HEAD `0b4e0ac7a27d0173bbe0fc14a10c26dbd99eb851`. Its runtime and uncommitted-change statements are historical; the current checkpoint above supersedes them.

## Runtime checkpoint

- The existing Vite dev server is PID `96264`, listening on `[::1]:5173`. Its executable path resolves to `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign/node_modules/.bin/vite`.
- The server is serving `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`, branch `feat/ref-current-custom-flow-redesign`, HEAD `0b4e0ac7a27d0173bbe0fc14a10c26dbd99eb851`. All changes below are uncommitted in that served checkout; no commit, push, or merge was made.
- The separate Phase 1 checkout `/Users/bubu/COSTBREAKDOWN` is on `logic/simulation-finalized-implementation` at `94a1d90135033797375463f5f0073079848e39ac`; it was not the checkout serving port 5173.

## Root cause and correction

- Before this correction, real-browser typing on the served checkout truncated Master Data Selling Price, Simulation Price, Business Selling Price, and Economic Variable Action Cost from `12.3456789` to `12.34`.
- The served source still had multiple independent acceptance gates: `NumericInput` defaulted to precision 2 and its shared draft regex capped digits; Master Data validation enforced scaled hundredths; Simulation parameter validation enforced per-field precision counts; Economic validation used a one-to-two-decimal regex.
- Removed decimal-count acceptance limits at those shared and caller validation boundaries while retaining finite-number and business-domain checks. Capacity/Yield remain strictly positive with no precision-derived minimum. Integer fields such as Batch Size remain whole numbers. Display formatting and formulas remain unchanged.
- Added a real-browser verifier that can run its own isolated Vite server or target the existing server with `COSTBREAKDOWN_BROWSER_BASE_URL`.

## Verification

- **PASS:** `COSTBREAKDOWN_BROWSER_BASE_URL=http://localhost:5173/ node scripts/verify_numeric_input_browser.mjs` in isolated Chrome at 1440×1800. Master Data, Simulation, Business, and Economic each accepted the complete focused value `12.3456789`; after blur each displayed `12.35`.
- **BEFORE reproduction:** the same four live UI inputs truncated the typed value to `12.34`.
- **PASS:** `node scripts/verify_numeric_input.mjs`, `node scripts/verify_master_data_ui_state.mjs`, `node_modules/.bin/jiti scripts/verify_master_data_toolbar_prepare_ux.ts`, `node_modules/.bin/jiti scripts/verify_master_data_spreadsheet_batch.ts`, `node_modules/.bin/jiti scripts/verify_parameter_simulation_engine.ts`, `node_modules/.bin/jiti scripts/verify_snapshot_import.ts`, `node_modules/.bin/jiti scripts/verify_import_mismatch_export.ts`, and `node scripts/verify_simulation_regression.mjs`.
- **PASS:** `npm run build` and `git diff --check`. Build retains existing ExcelJS browser externalization and >500 kB chunk advisories. The Simulation regression runner prints existing Vite WebSocket port-24678-in-use warnings but exits 0.
- The browser check exercised the actual UI on the server's current worktree. It verifies typing/state retention through blur and normal display formatting; it is not a narrow-screen, accessibility, or manual visual review.

---

# Previous Handoff — Phase 5 Final Closure — 2026-10-20

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Approved starting baseline: `07a2c86a15d8716beacc20e9761a8073feadf914`; the checkout and fetched branch matched this clean baseline before Phase 5 edits.
- Phase 5 closes the Reference / Current / Custom redesign through Phases 1–4 and the user-accepted UI corrections. No product behavior or accepted UI geometry changed.

## Audit and cleanup

- Removed unreferenced legacy candidate-prioritization/material/processing builders, the retired RCA utility and its exports, and retired RCA write helpers. Kept the legacy session migration still used by persistence.
- Removed the unused legacy RCA storage key and deleted verifiers that only asserted retired Candidate/RCA pages, fourth-snapshot simulation behavior, or obsolete candidate builders.
- Updated active verifiers to the current Master Data clone action, role-local missing-rate flow, CBD comparison statuses, migration-only RCA compatibility, and sticky-header/body table structure.
- Cross-page audit found no conflicting active behavior in Master Data, CBD, or Simulation. Role ownership, all nine CBD/Result pairs, Selected Comparison boundaries, graph gaps, role-local Simulation overrides/economics, reset/send semantics, and search/page-state boundaries remain consistent with the finalized specs.
- Updated `FINAL_LOGIC_SPEC.md`, `HANDOFF.md`, `SIMULATION.md`, `CROSS_CUTTING.md`, the Master Data toolbar spec, `SYSTEM_LOGIC_DIAGRAM.md`, and the Requirements Index to close current-state wording and link the final architecture artifact.
- Final Archify artifact: [costbreakdown-architecture.html](.archify/architecture-costbreakdown-20261020-160711/costbreakdown-architecture.html). Its finalize and Chrome visual-check receipts are in the same directory.

## Verification and known limits

- **PASS:** `npm run build`; the build retains ExcelJS/fast-csv browser externalization warnings and a main bundle over Vite's 500 kB advisory threshold.
- **PASS:** Phase 5 regression sweep, including Simulation, Master Data lifecycle/UI, navigation persistence, CBD pair/audit/cost-effect/reorder/summary/sort/view, Selected Comparison, graph/story/result/economics/history, row selection, global header, compact overlays, and numeric input. Current verifier contracts pass; the Simulation SSR runner prints the existing WebSocket port-in-use warning and exits 0, and the mixed CBD review-feedback SSR test prints React `useLayoutEffect` server-render warnings.
- **PASS:** `git diff --check`.
- **OPEN RISK:** `npm audit --audit-level=high` reports 9 dependency advisories (5 high, 4 moderate), including `braces` in the Tailwind dependency tree and `uuid` through ExcelJS. Available automated fixes require breaking dependency changes; dependencies and lockfiles were left unchanged.
- **ENVIRONMENT LIMIT:** workbook structural checks pass, but the optional external Excel recalculation step could not run because Windows PowerShell/Excel COM is unavailable in this macOS environment.
- **Browser/manual:** the accepted application UI was not re-exercised in an app browser during Phase 5. The generated architecture artifact passed Archify's Chrome browser and visual checks; this is not application interaction evidence.
- **Readiness:** ready for final independent code audit, with the dependency advisories and Excel COM limitation above recorded for review. No merge or PR is included.

---

# Previous Handoff — final pre-Phase-5 UI correction — 2026-10-20

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Verified starting local and remote baseline: `726dad66be8f3b0b538278add392669c63917a57`.
- One focused commit is delivered and pushed to this branch. Do not merge or start Phase 5.

## Implemented in this pass

- Raised the CBD sticky controls and overview shell to `lg:z-40`, above its Candidate sticky column header at `z-30` and unstacked body rows. The shared header helper remains `z-30`; Master Data workspace header remains `z-40`, table headers `z-30`, and row-index cells `z-20`.
- Preserved the measured CBD shell-height offset with no added 8px, the separate `h-2` normal-flow spacer, and bounded BOM-to-Routing sticky handoff.
- Moved the Simulation visible range to column 7 with a 24px right reservation, placing it beside the adjacent Previous/Next pair in column 8. Next remains centered on the Details column axis; icons remain 16px and move one row through native scrolling.
- Enabled Simulation chevron hover now uses `hover:bg-slate-200 hover:text-slate-950`; disabled buttons retain muted text, transparent hover, and the default cursor.
- Updated only the focused UI correction verifier for the new hierarchy, range cluster, and hover treatment.

## Verification and limits

- **PASS:** `npm run build`.
- **PASS:** `node scripts/verify_simulation_regression.mjs`, `node scripts/verify_master_data_ui_state.mjs`, `node scripts/verify_page_navigation_persistence.mjs`, `node scripts/verify_ui_correction_pass.mjs`, `node scripts/verify_cbd_comparison_pair.mjs`, and `node scripts/verify_cbd_audit_fixes.mjs`.
- **PASS:** `git diff --check`.
- Vite SSR regression suites print `WebSocket server error: Port 24678 is already in use` and exit 0. The build retains ExcelJS browser externalization warnings and a 544.63 kB main-bundle warning.
- `npm audit --audit-level=high` reports 9 dependency advisories (5 high, 4 moderate), including `braces` via Tailwind's current dependency tree and `uuid` via ExcelJS. npm recommends a breaking Tailwind upgrade or ExcelJS downgrade; no dependency changes were made in this UI-only pass.
- [Unverified] browser/visual behavior not independently verified. No browser executable, Playwright package, or browser DevTools tool is available; source checks do not establish rendered stacking, footer spacing, or hover appearance.
- This correction pass closes its requested UI scope. The repo-wide dependency security gate remains open; Phase 5 is unstarted and no merge is included.

---

# Previous Handoff — Final row-selection and Simulation proportions — 2026-10-20

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Starting baseline for that preceding pass: `29b47f5b50d7b91636a0e1a7e1b8da7e828e2be6`.
- One focused commit and push to this branch were authorized. No merge or Phase 5 work was included.

That preceding pass is recorded here for history. Its gold Master Data palette and `2.82:1.48:1` Simulation proportions were corrected by the current handoff above.

---

# Previous Handoff — Reference / Current / Custom Simulation final polish — 2026-10-20

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Verified starting local and fetched remote baseline: `0ff54c9537888f004570ad263eabd2a0002febc1`.
- This is one combined, focused Simulation final-polish round. One commit and push to this branch are authorized. Do not merge or start Phase 5.

## Implemented

- Fresh Simulation opens with Custom active and Current → Custom in Result. Main Reset resets only the active role: parameter overrides return to its Master Working values, Fixed / Variable / Batch clear, and Selling Price / SG&A return to that role's Master values. It preserves active role, pair, other roles, Master Data, and same-basis row selection within one role-local history change. Reset All applies that reset to all roles and returns the workspace to Custom / Current → Custom.
- CBD and Simulation use one canonical 96×32 Before/After selector with trigger-width minimum, intrinsic popup growth, the own-role option filtered, visible-option keyboard navigation, viewport clamp/flip, side tooltip, and accessible side plus selected role. CBD Status and Sort retain their prior behavior and now share the exclusive-popover manager.
- Result uses one visible `Cost / Unit | Before | After | Change | %` header row, with selected roles in selector accessibility labels. The Business Outcome / Unit divider and sr-only Result title remain.
- Historical implementation measurement (not a finalized requirement): the fixed graph used one widened X coordinate system (`plotLeft=88`, `plotRight=780`, width 692; centers 155 / 294 / 433 / 572 / 710) without the former global shift or outer translate. The Custom labels stayed inside the SVG viewBox.
- Desktop BOM and Routing bodies use a 160px internal scroll viewport; all rows continue to render and narrow screens retain the responsive card / natural-flow layout. The freed vertical space is assigned to the upper workspace.
- Updated the current requirements, Simulation and cross-cutting specs, current system logic diagram, directly affected Candidate / CBD / Master Data UI notes, implementation decision summary, design note, and current handoff. Replaced obsolete Simulation Result and Story verifier contracts and repaired the Simulation corrections verifier to use the current state API.

## Verification and limits

- **PASS:** final `npm run build` and `git diff --check` after implementation.
- **PASS:** `node scripts/verify_simulation_regression.mjs`.
- **PASS:** shared compact-overlay, CBD nine-pair comparison, CBD audit fixes, CBD parameter cost effect, Simulation Result, Simulation Story graph and page, Simulation corrections, comparison reconciliation, Selected Comparison boundary/lifecycle, CBD reorder and summary UX, page-navigation persistence, Master Data edit-history, and Global Header verifiers.
- Some Vite SSR suites emit `WebSocket server error: Port 24678 is already in use` while exiting successfully. The direct raw Node invocation of `verify_simulation_phase3.ts` does not resolve the repo's extensionless imports; it passes through the supported Vite SSR regression runner.
- NOT VISUALLY VERIFIED: browser/manual visual environment unavailable. No browser automation package or Chrome/Chromium executable is installed; SSR and source checks do not establish rendered visual geometry.
- This handoff is part of the focused delivery. No merge or Phase 5 work is included.

---

# Previous Handoff — final focused Simulation UI follow-up — 2026-10-19

- Starting baseline: `afe56d4984a6cedd2c423b55d33ec31a9da4b23a`; delivered as commit `c835278511cd6172d8e98e070d5ca95d4df28144` on this branch.
- That pass closed the Result toolbar, full-width selectors, selected-role filtering, Send tooltip, and dark graph underline. Phase 3/4 regressions passed; browser geometry remained unverified.

---

# Previous Handoff — Post-Phase-4 Simulation UI consistency polish — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Starting baseline: `b691d98da35e2e88ee0f94947f681b21bf9766f2`.
- That pass consolidated the Result controls and used 96×32px selectors; this handoff records its original outcome. The current handoff above supersedes its visual details.

---

# Previous Handoff — Phase 4 Simulation graph + UI integration — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Approved Phase 4 baseline: `3c581198ba464f94e92db9bf951577c7d48ffbbe`, confirmed locally and at `origin` before edits.
- The user authorized one focused commit and push to this branch. Do not merge or start Phase 5. The delivery SHA and fetched remote equality are reported in the task completion message.

## Final UI and behavior

- The fixed graph story is Reference | GAP 1 | Current | GAP 2 | Custom. GAP 1 is Current − Reference; GAP 2 is Custom − Current. Each role's graph state uses its effective role dataset, own Work Center rates, and role-local Business/Economic draft. Gap bars show only signed Material, Labor, and Burden differences.
- Semantic Reference/Current/Custom graph buttons select only `activeDataset`, with a visible selected state and keyboard focus treatment. They do not change the independent Result pair. The separate `Edit dataset` control is removed.
- Result has compact independent Before/After role selectors and dynamic Reference/Current/Custom columns for every ordered pair, including self-pairs. Change remains After − Before and percent retains the existing unavailable/zero-denominator behavior. Business/Economic ownership remains with `comparisonAfter`; BOM/RTG tables, parameter cost effects, Send, and Reset remain owned by `activeDataset`.
- Send and Reset are icon-only primary actions with exact tooltips `Send` and `Reset`; their compact split menus expose `Send all datasets` and `Reset all datasets`. Send All retains the existing atomic same-role mapping and Last Saved boundary. Reset All clears parameter overrides across roles and keeps valid role-local economics; it is not a single cross-role Undo transaction under the existing role-scoped history model.
- No Master Data, Cost Breakdown, CBD calculation, Standard Cost formula, or Phase 3 state primitive redesign is included.

## Verification and limits

- **PASS:** `npm run build` and `git diff --check`. Existing Vite warnings remain for ExcelJS/fast-csv browser externalization and the 531.75 kB app chunk.
- **PASS:** `node scripts/verify_simulation_regression.mjs`. This includes focused Phase 4 graph/Result/economics coverage, Phase 3 state/history/actions, role-local overrides, Simulation context/workspace/engine/economics/history, Master Data edit history, and Global Header routing. Two nested Vite SSR suites report the existing WebSocket port-in-use warning; the runner exits 0.
- **PASS:** CBD generic nine-pair comparison; Selected Comparison boundary and lifecycle; comparison reconciliation; Master Data UI state; page-navigation persistence; global compact-overlay contracts; Simulation graph rendering (`--graph-only`); scenario story; and CBD review-feedback graph.
- The focused Phase 4 verifier exercises state/calculation fixtures and React SSR for all nine Result pairs, fixed gap values, role rates, active-state semantics, and role-local economics. Source-contract assertions specifically cover App callback wiring and action destinations. Overlay and navigation verifiers are source contracts.
- No browser or manual interaction/visual verification was run. Keyboard interactions, viewport clamping, small-screen layout, and assistive-technology behavior remain unverified. The build and SSR suites do not verify rendered browser geometry.
- Do not merge or begin Phase 5.

---

# Previous Handoff — Phase 3 Simulation logic + actions — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Approved starting local and fetched remote HEAD: `bb9357124b141b06a55a130c6b59cb000a8731aa`.
- This is the focused Phase 3 state/action pass. The user authorized one commit and push to this branch, with no merge. Phase 4 graph/comparison UI remains deferred.

## Implementation

- Kept exactly three persistent Simulation roles, with parameter edits, Reset, same-role Send, and parameter history owned by `activeDataset`; the independent Before/After pair continues to own Result and Economic calculations.
- Replaced the misleading `Clone from` control with `Edit dataset`, a role selector that does not copy data. Replaced arbitrary `Send to` destinations with a direct Send to the active role's matching Master Data Working dataset.
- Corrected Simulation parameter editor rows/status and BOM/Routing Parameter Cost Effect calculations to use the active role's own Working baseline and Work Center rates. The compatibility Current/SIM Result and graph presentation remains in Phase 3.
- Added focused Phase 3 state/calculation/SSR contracts and included existing economics/history verifiers in the Simulation regression runner. Updated the active Simulation, Cross-Cutting, Final Logic, and Requirements Index contracts.
- Store/state primitives retain Reset All and atomic Send All semantics; no additional UI controls were introduced for those actions. Master Working Send preserves Last Saved and reconciles only affected role state/history.

## Verification and limits

- **PASS:** `npm run build` and `git diff --check`. The build keeps the existing ExcelJS/fast-csv browser externalization and 526 kB app-chunk warnings.
- **PASS:** `node scripts/verify_simulation_regression.mjs` (Phase 3 state/calculation/SSR contracts, role-local overrides, economics, history, workspace send boundary, Master Data edit history, and Global Header). It exits 0 with two nonfatal Vite WebSocket port-in-use warnings from nested SSR suites.
- **PASS:** CBD generic nine-pair comparison, audit fixes, parameter cost effect, summary UX, Selected Comparison boundary/lifecycle, comparison reconciliation, Master Data UI state, global compact overlays, and page-navigation persistence verifiers. Compact-overlay and navigation checks are source contracts; the audit verifier also renders chart cases with SSR.
- No browser or manual interaction testing was run. Menu interaction, keyboard behavior, and visual viewport fit remain unverified.
- Delivery commit SHA and pushed remote SHA will be recorded after branch delivery.
- Do not merge or start Phase 4.

---

# Previous Handoff — final CBD selector affordance closure — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Starting local HEAD and fetched/verified remote branch HEAD: `073e0f1a678c9c7bbe8702359c9b402328fc13e8`.
- This is the final focused Before/After selector polish before UI closure. The user authorized one commit and push to this branch, with no merge. No Simulation Phase 3/4 work is included.

## Corrections

- Restore a compact boxed Before/After value selector: equal 96×32px semantic buttons with thin border, white surface, subtle radius, visible role and ChevronDown, a clear hover state, visible keyboard focus, and exact `Before` / `After` Tooltip and accessible names.
- Give only the Before/After role menus a minimum width equal to their trigger. Intrinsic option content can grow the panel when needed. Keep centering, viewport clamping, vertical placement, and existing interaction behavior.
- Keep the global compact-overlay default intrinsic. CBD Status/Sort, Master Data Clone, Simulation role menus, and other compact overlays do not inherit this local value-selector exception.
- Keep Overview wording and chevrons at `Collapse` / `Expand` and Down / Right, with the same button state and collapse scope.
- Update active CBD and Cross-Cutting specs plus focused verifiers. No business logic, calculations, dataset semantics, or comparison semantics changed.

## Verification and limits

- `npm run build` passed. Existing Vite warnings remain for ExcelJS `fs` / `crypto` browser externalization and the 526 kB app chunk.
- All requested CBD, comparison, reorder/history, sort, selected-comparison, reconciliation, Global Header, Master Data, navigation, compact-overlay, and Simulation regression verifiers passed; `git diff --check` passed. The reconciliation verifier was rerun directly and exited 0 after an earlier Vite SSR invocation reported a port warning.
- No browser or manual visual pass was run. Rendered viewport fit, menu clamping, keyboard/focus behavior, and screen-reader behavior remain unverified.
- One focused commit and push are authorized. Do not merge or start Simulation Phase 3/4.

---

# Previous Handoff — compact CBD selector polish — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Starting local HEAD and verified remote branch HEAD: `64ed5da9dd7d07dbd2f3dafaf5859594255fc576`.
- This is one additional focused polish pass after the prior UI refinement. The user authorized one commit and push to this branch, with no merge. No Simulation Phase 3/4 work is included.

## Corrections

- Present Before and After as bare semantic buttons with equal stable compact sizing for `Reference`, chevron, spacing, and padding; retain hover, visible focus, and the selected role. Tooltip and accessible names are exactly `Before` and `After`.
- Size CBD role menus to their intrinsic option content. A menu may be narrower than its trigger; remove the JavaScript trigger-width floor and fallback while keeping centering, viewport clamping, vertical placement, and keyboard/focus behavior.
- Apply the compact overlay rule across CBD, Master Data, and Simulation: trigger width is not a universal menu minimum. Keep alignment only when a component has a specific layout reason. The Clone and Simulation role menus no longer carry an unnecessary 32px width floor.
- Overview labels are `Collapse` and `Expand`; ChevronDown/Right directions, button state, and overview-only collapse scope remain unchanged.
- Update the active CBD, Cross-Cutting, Master Data toolbar, and Simulation specs and focused source-contract verifiers. No business rules, calculations, or dataset/comparison semantics changed.

## Verification and limits

- **PASS:** `npm run build` (TypeScript and Vite; existing ExcelJS/fast-csv browser-externalization and large-chunk warnings remain).
- **PASS:** `git diff --check`.
- **PASS:** CBD comparison pair, audit fixes, summary UX, parameter cost effect, reorder history, sort, Selected Comparison boundary/lifecycle, comparison reconciliation, Master Data UI state, global compact overlays, page navigation persistence, Simulation regression, and Global Header contracts. The Global Header verifier used Vite SSR; the remaining checks passed sequentially with no Vite port warnings.
- No browser interaction or visual viewport test was run, so the visual result across viewport sizes remains unverified.
- One focused commit and push are authorized; no merge or Simulation Phase 3/4 work.

---

# Previous Handoff — final cross-page UI refinement correction — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Starting local HEAD and verified remote branch HEAD: `0db4c7622ebb8baf38625eaa5939373a69f97fc1`.
- This is the focused post-Phase-2 UI refinement correction. The user authorized one commit and push to this branch, with no merge. Do not start Simulation Phase 3/4.

## Corrections

- Keep Before/After selectors fixed at 108×32; each dropdown now sizes to its actual alternative labels, has a 32px trigger-width floor, and remains centered and viewport-clamped.
- Apply the compact overlay rule across CBD, Master Data, Simulation, shared tooltips, and the small ConfirmModal; retain the structured Prepare Dataset panel and real form/modal widths.
- Match CBD Status and Sort triggers to Master Data’s transparent 32×32 icon actions, use shared Tooltip and popover behavior, retain Status multi-select, and present Sort as the three requested commands in order.
- Match the CBD BOM/RTG/All selector to the Master Data inset segmented selector; use `All` casing and live counts. Overview disclosure uses ChevronDown when expanded and ChevronRight when collapsed.
- Keep visited Master Data, CBD, and Simulation pages mounted while hidden so valid local state survives all six navigation directions. Preserve existing context-dependent reconciliation/reset behavior and Header Undo/Redo routing. Close CBD’s transient portal on navigation and Master Data dialogs when hidden or product context changes.
- Update active CBD, Cross-Cutting, Master Data toolbar, and Simulation specs plus focused source-contract verifiers. No calculation or dataset business rules changed.

## Verification and limits

- **PASS:** `npm run build` and `git diff --check`.
- **PASS:** CBD comparison-pair, audit-fixes, summary UX, parameter-cost-effect, reorder-history, and sort verifiers.
- **PASS:** Selected Comparison lifecycle and boundary verifiers; comparison reconciliation verifier (run through Vite SSR due extensionless TypeScript imports); Global Header verifier (run through Vite SSR); Master Data UI-state verifier; Simulation regression verifier.
- **PASS:** `scripts/verify_global_compact_overlays.mjs` and `scripts/verify_page_navigation_persistence.mjs`. These are source contracts; they cover compact overlay sizing exceptions, all six navigation directions, persisted page state, and context invalidation wiring.
- No browser interaction or visual viewport testing was run; the repository has no installed DOM/browser test harness. Navigation/menu behavior beyond existing logic verifiers is source-contract checked.
- Build retains existing ExcelJS/fast-csv browser externalization and large-chunk warnings. Comparison reconciliation emitted a Vite WebSocket port-in-use warning but exited 0 and completed all assertions.
- Before delivery, rerun `git diff --check`, commit the scoped UI correction once, push the branch, and verify `git ls-remote` equals local HEAD.

---

# Previous Handoff — Phase 2 Reference / Current / Custom audit closure — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Starting local HEAD and fetched remote HEAD: `f98470bc90690e03c2bdaeffa39b1f347ce54596`.
- This is a focused audit-fix pass on Phase 2. The user authorized one commit and push to this branch, with no merge. No later UI refinement is included.

## Fixes

- Keep Cost Breakdown mounted after its first visit and hide it during navigation. Its pair, type/status filters, sort, Candidate selection and manual ordering/history, overview collapse, and expanded details remain in memory. Main navigation does not clear Selected Comparison or collapse expanded details. Pair/source/product changes still invalidate dependent analysis state and reset stale reorder/detail state. No page state is written to session storage.
- Render a neutral gray empty track when all three available element gaps are exactly zero, with the same bar footprint and no colored segments. Nonzero signed components that net to zero keep their signed visualization; unavailable-value behavior is unchanged.
- Clarify the `MasterDataRole` comment so Reference, Current, and Custom are documented as valid generic CBD roles; runtime semantics are unchanged.
- Update the active Cost Breakdown and Cross-Cutting requirements for the new navigation lifecycle and zero-gap behavior.

## Verification and limits

- **PASS:** `npm run build` (TypeScript and Vite production build; existing ExcelJS browser-externalization and large-chunk warnings remain).
- **PASS:** `git diff --check`.
- **PASS:** `node scripts/verify_cbd_audit_fixes.mjs` (navigation/stale-context source contracts and rendered zero-gap, offsetting, and unavailable chart cases). Navigation persistence is source-contract checked; this repository has no DOM interaction harness.
- **PASS:** CBD pair, summary UX, reorder history, Selected Comparison lifecycle/boundary, comparison reconciliation, BOM/Routing/Work Center comparison views and details, Routing Process identity, CBD parameter cost effect, and Simulation regression verifiers.
- No browser interaction run was available. The Routing Process identity verifier was run through Vite SSR because direct Node 24 execution cannot resolve the repository's extensionless TypeScript directory import.

---

# Previous Handoff — Cost Breakdown generic Before / After comparison — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Previous fetched remote HEAD and approved Phase 1 baseline: `3ec2dc3325e287e50a08b644f66a02a45b10f47f`; the fetched branch and `git ls-remote` agreed before Phase 2 edits.
- Phase 2 only. The user authorized one focused commit and push to this branch, with no merge. Commit message: `feat(cbd): support generic dataset comparison`. Exact delivery SHA and post-push remote equality are reported in the completion message.

## Ownership and behavior

- `src/state/store.tsx` owns one in-memory `comparisonBefore` / `comparisonAfter` pair, defaulting to Reference → Current. It derives all three source snapshots from the latest Master Data Working values; Custom comes from `getMasterDataSnapshot(..., 'custom')`. Selector changes do not write Master Data or persist a fourth dataset.
- `src/state/cost-breakdown-comparison.ts` owns the CBD boundary type and explicit adapter: Before maps to the existing comparison engine's first (`reference`) argument; After maps to its second (`current`) argument. The calculation engine remains unchanged and therefore calculates After − Before with each snapshot's own Work Center rates.
- All nine ordered role pairs are accepted, including same-role pairs. Available self-comparisons produce zero gaps and unchanged matched findings; zero full Gap percentages remain unavailable, with no non-finite display values.
- Selected Comparison uses the selected pair's role/value fingerprint. A pair change deactivates and clears stale membership, resets manual Candidate order/history, and remounts the itemized table to discard expanded details. Type, Status, and Sort state remain outside that keyed table and are preserved across pair changes.
- The existing one-row CBD Subheader now begins with equal 108px, 32px Before/After selectors using the shared CBD popover behavior (120ms hover preview, 150ms leave grace, pinning, outside/Escape dismissal, viewport positioning, and mutual exclusion). The arrow is passive. The Gap Bar remains flexible with a 96px minimum.
- CBD overview, Candidate details, statuses, parameter deltas, present-side labels, Work Center processing, and accessibility copy use Before/After semantics. ADDED is After-only; REMOVED is Before-only. The global workspace Header/Footer retains its separate Reference/Current summary.
- No Master Data source semantics or Simulation UI/behavior were changed. The mixed review verifier's Simulation story assertion now checks the existing Phase 1 Reference / Current / Simulation labels.

## Files and verification

- Source changes are limited to the CBD comparison boundary, pair-aware store context, pair-change lifecycle, and generic CBD presentation. `AppLayout` continues to show its global Reference/Current summary.
- Active requirements in `docs/REQUIREMENTS_INDEX.md`, `docs/specs/COST_BREAKDOWN.md`, `docs/specs/CROSS_CUTTING.md`, and `docs/specs/FINAL_LOGIC_SPEC.md` now describe Phase 2; this handoff records the implementation and checks. Earlier Phase 1 handoffs remain below as history.
- **PASS:** `npm run build` (TypeScript and Vite). Existing ExcelJS browser-externalization and large-chunk warnings remain.
- **PASS:** `node scripts/verify_cbd_comparison_pair.mjs` (all nine pairs, direction, rate ownership, statuses, self-comparison, selected scope, selectors, labels, and pair-bound context).
- **PASS:** CBD summary, parameter-cost-effect, Cost Breakdown view, sort, reorder-history, Candidate prioritization, Selected Comparison lifecycle/boundary, comparison reconciliation, Cost Element view, Work Center view, BOM/Routing comparison labels and detail verifiers, dynamic comparison fields, and mixed Cost Breakdown review-feedback verifier.
- **PASS:** `node scripts/verify_simulation_regression.mjs` (Phase 1 dataset overrides, context routing, role rates, Master Data edit history, and Global Header).
- **PASS:** `git diff --check`.
- No browser interaction run was available in this session. Selector behavior was checked through the existing shared-popover contract and rendered/source-level verifiers. The mixed review-feedback SSR run emits existing React `useLayoutEffect` server-render warnings from Master Data tables.

---

# Previous Handoff — Phase 1 comparison-context audit fix — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Audit-fix base and previous fetched remote HEAD: `46eecf971dcfa80b926c88d2bd45b17d04a12238`.
- The focused audit fix is delivered as a new commit on this branch and pushed; it was not amended or merged. The final commit SHA and remote equality are reported in the completion message.
- Scope: fix the Phase 1 ownership split only. No Phase 2 selectors, visible graph redesign, Result layout redesign, Send/Reset menu redesign, or unrelated cleanup.

## Ownership and behavior

- `activeDataset` owns parameter edits, parameter editor rows, and Reset scope. Send still targets the selected active Simulation role and its matching Master Working role.
- `comparisonBefore → comparisonAfter` owns Result and Economic calculations. The After role owns Selling Price, SG&A, action-cost, and batch-size drafts/defaults; blank commercial inputs fall back to the effective After dataset.
- Parameter history is recorded under `activeDataset`; Business/Economic history is recorded under `comparisonAfter`. Global Undo/Redo follows the role of the last committed history entry and is not reinterpreted when only `activeDataset` changes. A Master basis change clears only that role's stale history and pending edit.
- Existing Current/SIM labels and graph presentation remain compatible UI. The visible comparison selectors and graph redesign remain deferred.

## Verification

- **PASS:** `npm run build` (existing ExcelJS browser externalization and large-chunk warnings remain).
- **PASS:** `node scripts/verify_simulation_regression.mjs`, including the dataset override verifier through Vite, focused context routing assertions, and role-rate regressions.
- **PASS:** `node --experimental-strip-types scripts/verify_simulation_history.ts`.
- **PASS:** `node --experimental-strip-types scripts/verify_simulation_economics.ts`.
- **PASS:** `node scripts/verify_numeric_input.mjs`.
- **PASS:** `git diff --check`.
- No browser or mounted React App integration run was performed. The direct Node invocation of the dataset verifier is unsupported because its extensionless TypeScript imports require Vite; the verifier passes inside the regression suite.

---

# Historical Handoff — Reference / Current / Custom Simulation foundation — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`).
- Feature branch: `feat/ref-current-custom-flow-redesign`; base branch: `logic/simulation-finalized-implementation`; base commit: `94a1d90135033797375463f5f0073079848e39ac`.
- Work is isolated in a feature worktree. The original checkout's pre-existing `vite.config.ts` edit remains untouched; its SHA-256 is `673d2cbb093b910a1640bac84b7e16425e4f08bd3d7be7f4e435848ab2eb6796`.
- Scope is Phase 1 foundation only. No visible Simulation redesign, Cost Breakdown behavior change, merge, or Phase 2 work is included. The feature branch is intended for one focused commit and push; delivery SHA and remote equality are reported with the completion message.

## Scope

- Replaced the persisted single SIM snapshot with schema-v2, product-scoped Reference / Current / Custom parameter overrides over the corresponding latest Master Data Working snapshots. Effective datasets are derived and retain their own Work Center rates. A Working basis change resets only that role's overrides.
- Added independent `activeDataset`, `comparisonBefore`, and `comparisonAfter` state, defaulting to active Current and Reference → Current; all nine ordered pairs are accepted by the generic calculation API.
- Added active-role and Reset All state operations, same-role and atomic Send All payload preparation, defensive legacy migration, product pruning, and per-product/per-role ephemeral history.
- Updated the Master Data store boundary so Simulation sends to matching Working roles only, validates all requested roles before mutation, and keeps Last Saved and the Master Data Reset baseline untouched.
- Kept the visible Simulation page in its existing Current/SIM presentation. Existing Clone from selects the active role without copying structure; existing Send to selects and sends the matching role. Broader comparison selectors, labels, and graph changes remain later UI work.
- Updated `docs/REQUIREMENTS_INDEX.md` and the Simulation, final logic, cross-cutting, Candidate, Master Data, and Cost Breakdown specs to record the Phase 1 decision while preserving the deferred UI scope.
- Reworked the Simulation workspace, context, engine, history, scenario, and numeric verifiers; added `scripts/verify_simulation_dataset_overrides.ts` and included it in regression coverage.

## Verification and limits

- **PASS:** `npm run build` (TypeScript project build and Vite production build). Existing ExcelJS browser externalization and large-chunk warnings remain.
- **PASS:** `node scripts/verify_simulation_regression.mjs` (seven suites: role-local state, store Send boundary source assertions, role reconciliation/product retention, generic calculations, Master Data edit history, and Global Header contract).
- **PASS:** `node scripts/verify_simulation_history.ts`.
- **PASS:** `node scripts/verify_numeric_input.mjs`.
- **PASS:** `git diff --check`.
- Store Send assertions inspect source structure; they do not mount the React provider for a runtime integration test. No browser flow or visible UI redesign was performed because the visible UI is intentionally deferred.
- No Phase 2 implementation has started. Final commit and push evidence belongs in the completion report.

---

# Current Handoff — Role menu alignment correction — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN` (`apirak-k/COSTBREAKDOWN`). Branch: `logic/simulation-finalized-implementation`.
- Starting local and fetched remote HEAD: `50dea66fcd50236f3626efde953f892e3c9fd6fc`. This matches the previous delivery; no newer commit was present.
- Only `vite.config.ts` was dirty before this pass. Starting/ending SHA-256: `673d2cbb093b910a1640bac84b7e16425e4f08bd3d7be7f4e435848ab2eb6796`. Its diff is preserved and excluded from this commit.
- The user authorized one focused implementation commit and push to this branch. No merge. The resulting commit SHA and post-push remote equality are recorded in the delivery report rather than embedded in this checkpoint.

## Scope

- Master Data Clone keeps its centered, viewport-clamped menu box and `Clone from` label. Menu width is stable across destinations, sized for `Reference`, and the role text is left aligned. Destination exclusion and existing interactions remain.
- Simulation Clone and Send now center the menu box under the trigger before applying viewport clamping. Both use the same stable compact width and left-aligned role text as Master Data. Role choices, callbacks, semantics, and interactions remain.
- Updated `scripts/verify_master_data_ui_state.mjs` and `scripts/verify_simulation_story_view.ts` for the box-position / item-alignment distinction.
- Updated `docs/specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md` and `docs/specs/SIMULATION.md`. Exact menu width remains a reversible implementation detail.
- NumericInput and numeric verifiers were not changed. The user physically verified after the prior fix that mouse wheel and MacBook trackpad upward motion increments and downward motion decrements; this is user-reported evidence, not a test performed by the agent.

## Verification and limits

- Browser verification passed 72/72 checks in isolated Chrome at 1440×857, 1280×768, and 390×844. Master Data Clone stayed 96px wide across Reference, Current, and Custom destinations at all three viewports; Simulation Clone and Send also measured 96px. In normal, unclamped positions, each menu center matched its trigger center (0px delta). Items were left aligned with 8px horizontal padding and 32px row height. No horizontal page overflow or browser console errors were found.
- Browser interaction checks passed for trigger-to-menu hover movement, hover-only dismissal, click pin/unpin, outside click, Escape and focus restoration, keyboard navigation (Arrow keys, Home, End), and Tab dismissal. At the required 390px viewport all three menu types remained within the viewport. A supplementary 275×844 stress viewport forced Simulation Send to clamp at an 8px right gutter (96px menu, trigger center 235px, menu center 219px); the document measured 320px scroll width at this below-requested width.
- Automated verification passed: `node scripts/verify_master_data_ui_state.mjs`; `node --experimental-strip-types scripts/verify_simulation_story_view.ts`; `node --experimental-strip-types scripts/verify_simulation_result.ts`; `node --experimental-strip-types scripts/verify_simulation_history.ts`; `node --experimental-strip-types scripts/verify_simulation_corrections.ts`; `node scripts/verify_simulation_regression.mjs`; `npm run build`; and `git diff --check`.
- The production build completed successfully with the existing ExcelJS externalization and large-chunk warnings.
- [Unverified] Windows physical mouse, Safari, Firefox, screen-reader runtime, and CI for the new commit.

---

# Historical Handoff — NumericInput, toolbar, and divider UX correction — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN` (`apirak-k/COSTBREAKDOWN`). Branch: `logic/simulation-finalized-implementation`.
- Starting local HEAD: `ed67bb2af93eaf201efbf750fe13acb856722c5b`. The GitHub branch ref was independently read at the same SHA; it had not moved beyond the supplied audit baseline. `git fetch origin` could not resolve `github.com` in this environment, so the GitHub connector was used to confirm the branch tip.
- Only `vite.config.ts` was dirty before this pass. Its starting/ending SHA-256 is `673d2cbb093b910a1640bac84b7e16425e4f08bd3d7be7f4e435848ab2eb6796`; contents and diff are byte-for-byte unchanged and it is excluded from the commit.
- The user authorized this focused implementation, relevant verifiers/build/browser checks, spec/HANDOFF updates, one commit, and push to this branch. No merge.
- The focused commit SHA, push result, and verified remote equality are recorded in the delivery report; they are not embedded here because this checkpoint is part of that same commit.

## Scope

- `src/shared/ui/numeric-input-rules.ts`, `src/shared/ui/NumericInput.tsx`: focused wheel direction now maps positive/upward delta to increment and negative/downward delta to decrement. Keyboard, spinner, active-place stepping, bounds, validation, and unfocused scrolling paths are unchanged.
- `src/features/master-data/components/MasterDataWorkspaceHeader.tsx`: Clone tooltip/accessibility name is `Clone from`; menu labels are centered role names with the existing destination exclusion; Warning tooltip/accessibility wording is `Show warnings` / `Hide warnings`. State and interactions are unchanged.
- `src/features/simulation/SimulationPage.tsx`: the shared Clone/Send role menu is 96px minimum width with centered labels; role choices, callbacks, and interactions are unchanged.
- `src/features/simulation/EconomicSimulationPanel.tsx`: the Business row has a min-content height floor within the existing `.95fr:2.45fr` allocation, keeping the main divider in whitespace after SG&A. Outcome remains inset.
- Focused verifier expectations were updated in `scripts/verify_numeric_input.mjs`, `scripts/verify_master_data_ui_state.mjs`, `scripts/verify_simulation_story_view.ts`, and `scripts/verify_simulation_economics.ts`.
- `docs/specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md` and `docs/specs/SIMULATION.md` record the accepted presentation/interaction contract. `docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md` was not changed because its recorded ratios do not conflict with this adjustment.

## Verification and limits

- **PASS:** `node scripts/verify_numeric_input.mjs`, `node scripts/verify_master_data_ui_state.mjs`, `node --experimental-strip-types scripts/verify_simulation_story_view.ts`, `node --experimental-strip-types scripts/verify_simulation_economics.ts`, `node --experimental-strip-types scripts/verify_simulation_result.ts`, `node --experimental-strip-types scripts/verify_simulation_history.ts`, `node --experimental-strip-types scripts/verify_simulation_corrections.ts`, `node scripts/verify_simulation_regression.mjs`, and `npm run build`.
- **PASS:** isolated Chrome/CDP browser verification, 72 checks at 1440×857, 1280×768, and 390×844. Menus, wording, sizing, keyboard/pointer dismissal, focus restoration, divider spacing, viewport overflow, NumericInput synthetic wheel direction, arrows/spinners, and unfocused container scrolling passed; no browser console errors.
- Screenshots are outside Git: `/tmp/cbd-ux-pass-masterdata-1440x857.png`, `/tmp/cbd-ux-pass-masterdata-1280x768.png`, `/tmp/cbd-ux-pass-masterdata-390x844.png`, `/tmp/cbd-ux-pass-simulation-1440x857.png`, `/tmp/cbd-ux-pass-simulation-1280x768.png`, `/tmp/cbd-ux-pass-simulation-390x844.png`.
- `npm audit --omit=dev --audit-level=high` exited 0 and reported two moderate transitive `uuid` findings through ExcelJS. No dependency files were changed.
- **[Unverified]** Direct post-fix physical mouse and MacBook trackpad input, Windows hardware, other browsers, screen-reader runtime, and CI for the new commit. The browser check dispatched synthetic WheelEvents; it is not physical-device evidence. The user's pre-fix hardware report is preserved as the issue evidence.
- No cost/business/economic/Break-even formulas, Clone/Send/Reset semantics, numeric precision, validation, lifecycle, or data behavior were changed.

---

# Historical Handoff — Simulation Economic and Result presentation — 2026-10-19

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN` (`apirak-k/COSTBREAKDOWN`). Branch: `logic/simulation-finalized-implementation`.
- Starting local and fetched remote HEAD: `2ee2aa61c55a5bd94e22bd45cad95a6b34066410`, matching the supplied audit. Only `vite.config.ts` was dirty before work.
- Finishing HEAD is the focused commit containing this checkpoint; resolve with `git log -1 --format=%H -- HANDOFF.md`. Its exact SHA and post-push remote equality are recorded in the delivery response. This avoids a self-referential commit hash inside its own contents.
- The user authorized implementation, tests, documentation, one focused commit, and push to the same branch. No merge. Delivery uses `style(simulation): refine economic and result presentation`.
- Protected `vite.config.ts` starting/ending SHA-256: `673d2cbb093b910a1640bac84b7e16425e4f08bd3d7be7f4e435848ab2eb6796`. Its bytes and diff remain unchanged; it is excluded from staging and delivery.

## Scope and files

- `src/features/simulation/EconomicSimulationPanel.tsx`: two main headings Business/Economic, inset subordinate Outcome, shared dynamic THB/UOM, three short numeric-only rows, whole Break-even result in graph heading, right-end QTY. Existing formula tooltips and accessible descriptions remain.
- `src/features/simulation/SimulationPage.tsx`: Material/Labor/Burden/Conversion/Standard Cost labels; Copy/Send/RotateCcw 32px icon actions with shared Tooltip. Clone/Send use 120ms hover preview, 150ms leave delay, unified trigger/menu region, click pin/close, outside/Escape/blur dismissal, keyboard navigation and viewport-safe positioning. Existing role choices and callbacks remain.
- `src/features/simulation/SimulationStoryGraph.tsx`: whole-plot translation -16 SVG units (previously -8); Show all adds an 8px margin to the existing 4px gap, giving 12px separation after Ruler. Header remains one row at desktop.
- `scripts/verify_simulation_economics.ts`, `scripts/verify_simulation_result.ts`, `scripts/verify_simulation_story_view.ts`: updated intentional copy/structure assertions and retained calculation, geometry and accessibility coverage.
- `docs/specs/SIMULATION.md`, `docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md`: latest user presentation decisions and reversible pixel details. `HANDOFF.md`: this checkpoint; earlier records remain historical.
- Existing outer ratios remain 1.5:1 Graph/right, .7:1.3 middle/Result, 1.2:.8 Result/Break-even, 1.25:1 upper/lower, 1:1 BOM/RTG. Business/combined Economic use .95:2.45, preserving the former total allocation.

## Acceptance evidence

- [x] One outer card, exactly Business and Economic main headings. Selling Price/SG&A and all three Economic inputs retain their order and handlers.
- [x] Outcome has a light inset divider and subordinate heading; shared dynamic THB/UOM at right; exactly Parameter Saving, Required Saving, Economic Margin. Values have no repeated units. Full per-unit accessible names, formula descriptions, unavailable display and colors remain.
- [x] No Economic Break-even row; graph heading uses whole displayed quantity (`2,326 PC` fixture), Not achievable or unavailable truthfully. Fractional precise intersection retained and verified independently.
- [x] QTY dynamic label at right axis end, no text collision/clipping; final SVG type 10px. Y-axis, ticks, ranges and geometry unchanged.
- [x] Result labels simplified, Standard Cost retained, subtotal/final emphasis and all numeric columns preserved. BOM/RTG Material Cost/Conversion Cost headers unchanged.
- [x] Three icon-only 32px accessible actions with tooltips. Clone/Send hover, pin/close, pointer transition, outside click, Escape, arrows/Home/End/Tab/Shift+Tab and focus checked. Reset directly resets Simulation with no all-dataset menu.
- [x] Main Graph all eight legends, Show all enabled/disabled restoration, tooltip, desktop single-row header, whole-plot shift and readable axes checked.
- [x] No Break-even popup for saving/action/intersection/batch marks; slider roles/values/focus/keyboard/drag and pointer-down stability checked.
- [x] 1440×857, 1280×768 and 390×844: no document horizontal overflow. Mobile stacking, action reachability, menu bounds, Outcome and QTY checked.

## Automated verification

All final commands exited 0:

| Exact command | Result |
| --- | --- |
| `node --experimental-strip-types scripts/verify_simulation_story_view.ts` | PASS: graph/page contracts, including all finalized label-placement cases |
| `node --experimental-strip-types scripts/verify_simulation_economics.ts` | PASS: economics, precision/intersection, dynamic units, unavailable and heading states |
| `node --experimental-strip-types scripts/verify_simulation_result.ts` | PASS: numbers, hierarchy, icons and actions |
| `node --experimental-strip-types scripts/verify_simulation_history.ts` | PASS: editable history, Reset, cloning and product isolation |
| `node --experimental-strip-types scripts/verify_simulation_corrections.ts` | PASS: validation, baseline/selection, Undo/Reset and dynamic UOM |
| `node scripts/verify_simulation_regression.mjs` | PASS: workspace/context/engine, Master Data history, Global Header |
| `npm run build` | PASS: TypeScript + Vite production build |
| `git diff --check` | PASS |

The first build failed because ChevronDown was removed from imports while table expansion still used it. Restored that import; the complete suite/build then passed. After the final QTY font-only adjustment, economics and production build passed again. Existing ExcelJS browser-externalization and >500kB chunk warnings remain. Local results do not establish CI success.

## Browser and interaction verification

- Isolated Chrome/CDP with synthetic Complete Mock and actual UI input. Existing development server/profile data outside this test session were not altered.
- 1440×857 and 1280×768: full title + eight Legend controls + Show all share one row; no clipping/overlap. Graph width remains about830/734px; Result/Break-even width355/313px. Outcome rows, BE quantity and graph legend fit.
- 390×844: natural stacking, no horizontal page overflow; 32px actions and role menus fit; Outcome and final QTY remain visible.
- Clone/Send: delayed hover closed at early sample and open after delay; transition into menu retains it; click pins, second click closes, outside closes, Escape restores trigger; arrows/Home/End work. Three options exactly Reference/Current/Custom. Tab moves Clone→Send and Send→Reset; Shift+Tab returns to the corresponding trigger; no body-focus loss.
- Reset: synthetic MAT-A usage1.50→2.00 and Fixed Action Cost10000→blank, no menu. Batch5000→5001→5000 via keyboard; pointer-down retains5000 and intentional drag reaches5601.
- All four BE mark types have zero popup; accessible names/slider attributes remain. Main Graph tooltip appears; Legend toggle enables Show all; restoring returns all eight pressed and disables Show all.
- UOM changed through UI to KG: Outcome THB/KG, QTY(KG), heading2,326KG; conflicting UOM uses Unit. Missing assumptions show Break-even · —. Automated cases also cover Not achievable and zero/fractional thresholds.
- 1280 percentage text extends1.83px beyond its cell with visible overflow but remains7.17px inside the panel: no visual clipping or overlap. No layout change was needed.
- Evidence: `/tmp/cbd-final-browser-evidence.json`, `/tmp/cbd-tab-evidence.json`; helpers `node /tmp/cbd-final-browser.mjs`, `node /tmp/cbd-supplement.mjs`, `node /tmp/cbd-extra.mjs`, `node /tmp/cbd-last.mjs`, `node /tmp/cbd-mobile.mjs`, `node /tmp/cbd-tab-check.mjs`, `node /tmp/cbd-final-qty.mjs` all exit0. Browser JSON retains the correction of a helper's mistaken four-role assumption to the actual three-role contract.
- Final screenshots: `/tmp/cbd-final-1440x857.png`, `/tmp/cbd-final-1280x768.png`, `/tmp/cbd-final-390x844.png`, `/tmp/cbd-mobile-outcome-break-even.png`. Additional menu/tooltip images: `/tmp/cbd-mobile-menu.png`, `/tmp/cbd-main-tooltip.png`. Artifacts stay outside Git.

## Preservation audit and limits

- No formula, Current→SIM, Clone/Send/Reset data semantics, state/persistence/history, numeric precision, validation, BOM/RTG editing or dependency changes. Calculation/state modules and package files are unchanged. Main Graph internal label-placement and tooltip algorithms are unchanged; only whole-plot translation and action spacing changed.
- Agents: frontend-engineer for Economic and Result presentation; tester for browser evidence. Skills actually read/used: Ponytail, frontend-ui-engineering, browser-testing-with-devtools (isolated CDP fallback), and git-workflow-and-versioning for delivery.
- [Unverified] Physical MacBook Neo, other browsers, screen-reader runtime, exhaustive numeric extremes and new-commit CI. Browser Clone/Send data transfer was not invoked; callback preservation was inspected and existing history/regression checks passed.

---

# Historical Handoff — Simulation layout and display-copy polish — 2026-10-19

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`.
- Starting local HEAD and remote-tracking HEAD: `723e72ec9c44bdf457eb29e45cf65a120328925f`.
- `vite.config.ts` was already modified before this pass; it remains excluded and has the same SHA-256: `673d2cbb093b910a1640bac84b7e16425e4f08bd3d7be7f4e435848ab2eb6796`.

## Changes

- Widened the Main Graph allocation to `1.5fr:1fr`; the right-side block now divides at `.7fr:1.3fr`. In isolated Chrome this measured Graph / middle / Result widths of `830 / 191 / 355px` at 1440px, and `734 / 169 / 313px` at 1280px. The middle Business/Economic column is about 14% of the workspace and Result about 26%.
- Kept the Main Graph title, all eight legend controls, Ruler, and Show all on one row. Show all follows Ruler with a 4px gap. Shifted the plot's SVG marks 8 units left without changing their calculations or relative placement.
- Combined Business Inputs, Economic Inputs, and Economic Outputs inside one bordered card with three clear internal section dividers. The existing `Selling Price` then `SG&A %` order and all Result fields/actions remain.
- Changed only visible copy for the variable input to `Variable Action Cost`; its unit remains adjacent and its accessible name remains `Variable Action Cost / Unit`.
- Changed the visible Economic Outputs label from `Break-even Quantity` to `Break-even`. At 1280px it stays on one line and the unchanged quantity value and UOM are legible as `2,326 PC`. The group retains the accessible name `Break-even Quantity`.
- Removed visible popup tooltips from the Break-even graph while preserving accessible labels, Batch Size slider semantics, focus styling, pointer dragging, and keyboard adjustment. Main Graph tooltips remain active.
- Updated the Simulation spec, provisional P-013 layout record, and focused verifiers. The calculation and history modules are unchanged.

## Verification

- **PASS:** Simulation Story, Economic/Break-even, Result, History, Corrections, and Regression verifiers.
- **PASS:** `npm run build`; TypeScript and Vite build succeeded. Existing ExcelJS browser externalization and large-chunk warnings remain.
- **PASS:** `git diff --check`.
- **PASS — isolated headless Chrome:** 1440×857, 1280×768, and 390×844. At both desktop sizes the graph header is a single row; text is visible with no overlap or clipping, and the document has no horizontal overflow. The 1280 screenshot shows `Break-even` and `2,326 PC` clearly on one row. The mobile layout remains stacked and horizontally contained.
- **PASS — interaction and tooltip checks:** Break-even graph has no popup on hover; Main Graph tooltip still appears. ArrowRight/ArrowLeft changed and restored Batch Size. Pointer-down on the marker did not change its value; dragging moved it. Focus styling remained visible.
- For the positive Break-even visual case, the isolated Complete Mock browser session temporarily changed MAT-A Simulation Usage from 2.00 to 1.50. This was test data in the isolated browser profile only, not a repository or persisted application change.
- Screenshots: `/tmp/cbd-simulation-polish-1440x857.png`, `/tmp/cbd-simulation-polish-1280x768.png`, and `/tmp/cbd-simulation-polish-390x844.png`.

## Review notes

- Physical MacBook Neo rendering, other browsers, and screen-reader behavior are **[Unverified]**. Layout weights remain provisional and can be adjusted after visual review.

---

# Historical Handoff — Simulation Result subtotal and Business labels — 2026-10-18

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`.
- Starting local HEAD and fetched remote HEAD: `306d70ed71b20d68b50bb6cb0234eeefde1a10cc`.
- Pre-existing local-only change: `vite.config.ts`; inspected, preserved exactly, and excluded from this round.
- Scope: Result hierarchy and Business output-label presentation only.

## Changes

- Conversion Cost still calculates Labor + Burden. Its top separator uses slate-300 against ordinary slate-100 dividers; all five cells receive 2px additional top/bottom padding, and the row is semibold with slate-800 text. Standard Cost retains semibold darkest slate-950 text as the final total. No explanatory formula text was added.
- In the Business panel, output labels changed from `SG&A / Unit` to `SG&A` and `Operating Profit / Unit` to `Operating Profit`. Values continue to display `THB/<UOM>` separately.
- SIM Standard Cost, Selling Price and SG&A % inputs, all Result actions, Result calculations, Business calculations, Economic behavior, and Graph behavior remain unchanged.
- Updated `docs/specs/SIMULATION.md` to record the Result hierarchy and exact Business output labels.

## Verification

- **PASS — Result verifier:** `node --experimental-strip-types scripts/verify_simulation_result.ts`; checks non-zero Current/SIM Conversion Cost equals Labor + Burden, subtotal styling/padding, Standard Cost hierarchy, unchanged Result actions/calculations, and no Result subtitle.
- **PASS — Economics verifier:** `node --experimental-strip-types scripts/verify_simulation_economics.ts`; checks exact Business output labels, retained SIM Standard Cost, Selling Price and SG&A % inputs, and existing calculations.
- **PASS — Simulation story/page verifier:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts`.
- **PASS — Simulation regression:** `node scripts/verify_simulation_regression.mjs`.
- **PASS — production build:** `npm run build`; existing ExcelJS browser externalization and >500 KB chunk warnings remain.
- **PASS — isolated headless Chrome with populated Result fixture:** actual viewport sizes 1440×1000 and 390×844. Confirmed Conversion Cost row padding is 2px per side versus 0px on ordinary rows, semibold versus normal weight, slate-300 separator versus ordinary slate-100 divider, and Standard Cost darkest text. Confirmed Business labels and inputs, Result actions, subtitle absence, and no horizontal overflow. Scrolled the narrow view to inspect Business outputs.
- **PASS — `git diff --check`**.

## Limits and delivery

- **[Unverified]** Physical-device rendering, screen-reader behavior, and browsers other than the isolated Chrome session.
- The pre-commit remote check and delivery SHA are recorded in the completion report. `vite.config.ts` remains excluded.

---

# Historical Handoff — Simulation graph tooltip positioning — 2026-10-18

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`.
- Starting local and fetched remote HEAD: `1ef8f35e90bb00ddc5ee82a733e76d0996c105b7`.
- Focused commit: `306d70ed71b20d68b50bb6cb0234eeefde1a10cc`.
- Anchored tooltips to rendered SVG target bounds, centered horizontally, preferred above with below fallback, and clamped within the graph host. Pointer movement within one target no longer shifts the tooltip; category-specific placement was removed.
- Preserved tooltip content, wrapping, show/hide timing, GAP/data-mark tooltip scope, Graph calculations, and all twelve Visible Net placement cases.
- **PASS:** graph and page verifiers, Simulation regression, Economics and Result verifiers, production build, and `git diff --check`.
- **PASS — isolated headless Chrome:** 1440×1000 and 390×844; checked centered desktop placement, narrow right-edge clamping, above-target placement, and stable position while moving within the target.
- **[Unverified]** Physical-device rendering, screen-reader behavior, and other browsers.

---

# Historical Handoff — Simulation Result hierarchy polish — 2026-10-18

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`.
- Starting local HEAD and fetched remote HEAD: `a81cdfa875fee89ecd42d1f927fe2791af37068b`.
- Pre-existing local-only change: `vite.config.ts`; inspected, preserved, and excluded from that round.
- Scope: the Simulation Result panel only.

## Result presentation

- Removed the `Current → SIM · THB/<UOM>` subtitle. Result heading and the existing Clone from, Send to, and Reset actions remain in place and order.
- Conversion Cost now has a subtle top separator and medium weight. Standard Cost retains the stronger divider, weight, and text color.
- Result table values, calculations, Change and percentage behavior, Business Outcome rows, and read-only behavior are unchanged.
- Updated `docs/specs/SIMULATION.md` to clarify that Result has no separate UOM subtitle while retaining the resolved product UOM basis.

## Verification

- **PASS — Result verifier:** `node --experimental-strip-types scripts/verify_simulation_result.ts`.
- **PASS — Simulation story/page verifier:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts`.
- **PASS — Simulation regression:** `node scripts/verify_simulation_regression.mjs`.
- **PASS — production build:** `npm run build`; existing ExcelJS browser-externalization and >500 KB chunk warnings remained.
- **PASS — isolated headless Chrome:** 1440×1000 and 390×844; confirmed Result subtitle absence, action order, row emphasis, and no horizontal page overflow.
- **PASS — `git diff --check`**.

## Limits

- **[Unverified]** Physical-device rendering, screen-reader behavior, and browsers other than the isolated Chrome session.
- Result polish was delivered in its focused commit; `vite.config.ts` was excluded.

---

# Historical Handoff — Simulation graph Legend Show all — 2026-10-18

This records the completed Legend Show all round immediately before the current graph placement correction.

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`.
- Starting local HEAD and fetched remote HEAD: `1692c8b9b76b77e9e9b71c4e24c22f0db4a5b1a4`.
- Pre-existing local-only change: `vite.config.ts`; preserved, unstaged, and excluded from that round.
- Scope: implement only the Simulation graph Legend **Show all** action. Visible Net placement, Selling Price graph behavior, Economic/Business inputs, Reset, Result, formulas, and calculations were untouched.

## Changes

- Added a small, always-visible **Show all** action after Ruler, at the far right on desktop. It derives its disabled state from all eight existing Legend values and restores them through the existing visibility state.
- Kept individual Legend toggles, graph calculations, and graph-only filtering unchanged. Added focused verifier assertions and documented the action in `docs/specs/SIMULATION.md`.

## Verification

- **PASS — Simulation graph:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts --graph-only`.
- **PASS — Simulation page contract:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts`.
- **PASS — Simulation regression:** `node scripts/verify_simulation_regression.mjs` (workspace, context, parameter engine, Master Data edit history, and Global Header suites).
- **PASS — build:** `npm run build` (`tsc -b` and Vite production build). Existing `fs`/`crypto` browser externalization and >500 KB chunk warnings remain.
- **PASS — isolated headless Chrome 155:** desktop 1440×1000 and narrow 390×844. Verified initial disabled state, one and multiple hidden Legend items, restoration of all eight items, disabled non-activation, individual toggle behavior, Visible Net changing with filters and restoring afterward, keyboard Tab/focus-visible/Enter behavior, far-right desktop placement, and no horizontal page overflow at either width.
- **PASS — `git diff --check`**.

## Limits

- **[Unverified]** Physical-device rendering, screen-reader behavior, and browsers other than isolated Chrome.
- **Existing dependency-audit finding:** `npm audit --audit-level=high` reports 5 high and 4 moderate transitive vulnerabilities. The suggested automatic fixes require breaking Tailwind/ExcelJS version changes, so dependencies were left unchanged in that graph-only round.

## Delivery

One focused commit was pushed to `origin/logic/simulation-finalized-implementation`; its exact SHA is in that round's completion report. The pre-existing `vite.config.ts` change was not included.

---

# Historical Handoff — Simulation Visible Net side fallback — 2026-10-18

This records the earlier Simulation graph placement implementation. The current handoff at the top of this file supersedes the placement behavior described here.

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`.
- Starting local HEAD and fetched remote HEAD: `4f7ede7c8392106e919045a3b9555b7c96ee031c`.
- Pre-existing local-only change: `vite.config.ts`; preserved and excluded from that round.
- Scope: Simulation graph Visible Net placement only. Reset, costing/business formulas, data, Clone/Send, Master Data, and Cost Breakdown were untouched.

## Changes

- Visible Net still uses the signed total from the same Legend-filtered REF/CUR/SIM state stack that draws each bar. Positive and zero totals default to 12 SVG units above their own stack endpoint; negative totals default to 16 units below it.
- Removed the prior side-label search that based Y on Standard Cost and tried multiple 12/24-unit offsets. The side fallback now uses the Standard Cost value's horizontal column (`x = state.x + 35`, start-aligned) while retaining the Visible Net endpoint baseline. It triggers only when rendered text bounds crowd the connected Selling Price point/line or plot boundary. If a local Selling Price visual still collides at the side X, one measured downward clearance is applied; top/bottom clipping switches to the other side of that same endpoint, followed by a minimal clip guard.
- The collision check uses rendered geometry, with no numeric Selling Price-versus-Net gate. Net equal to Selling Price does not trigger fallback on its own. GAP labels, duplicate suppression when Net equals displayed Standard Cost, Standard Cost, Selling Price, and all formulas remain unchanged.
- Updated the focused graph verifier and graph placement rule in `docs/specs/SIMULATION.md`.

## Verification

- **PASS — Simulation graph:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts --graph-only`.
- **PASS — Simulation page contract:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts`.
- **PASS — Simulation regression:** `node scripts/verify_simulation_regression.mjs` (workspace, context, parameter engine, Master Data edit history, and Global Header suites).
- **PASS — build:** `npm run build` (`tsc -b` and Vite production build). Existing `fs`/`crypto` browser externalization and >500 KB chunk warnings remain.
- **PASS — isolated headless Chrome:** desktop 1440×1000 and narrow 390×844. Loaded Complete Mock and Simulation; verified default endpoint labels and a SIM side-fallback case after a temporary Selling Price edit plus Profit+ filtering. The fallback used the side column and retained endpoint-based Y at both widths; neither viewport had horizontal page overflow.
- **PASS — `git diff --check`**.

## Limits

- **[Unverified]** Physical-device rendering, touch behavior, screen-reader behavior, and browsers other than isolated Chrome.
- SVG text collision checks use estimated bounds for the graph's 9px monospace labels. The current graph scale keeps finite stack endpoints far enough below the top edge that a runtime top-clipping fixture was not reached; the verifier checks the top-edge guard and endpoint-relative flip in source, and the browser run checked the side fallback at both widths.

## Delivery

One focused commit is pushed to `origin/logic/simulation-finalized-implementation`; its exact SHA is in the completion report. The pre-existing `vite.config.ts` change is not included.

---

# Historical Handoff — Simulation obsolete Economic reset baseline cleanup — 2026-10-18

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`.
- Starting local HEAD and fetched remote HEAD: `e2a941dd6e619e965d6a3fd063c240d1302d9cb3`.
- Pre-existing local-only change: `vite.config.ts`; preserved and excluded from this round.
- Scope: remove the obsolete `resetBaselineEconomicInputs` field from active Simulation state and normalize legacy persisted state. No graph, formula, UI, Master Data, or Cost Breakdown work.

## Changes

- Removed the redundant Economic reset baseline from the active state model, empty state, Clone output, and normal reconciliation/equality path. Clone continues to preserve the current `economicInputs` draft.
- Reconciliation recognizes the legacy persisted key, removes it without reading its value, preserves current Economic inputs and the BOM/Routing parameter reset baseline, and returns a stable state after the one-time normalization.
- Reset continues to restore BOM/Routing parameters and locked Current Work Center rates, preserve working selection, and clear all five Economic/Business inputs. Undo and Redo behavior remains unchanged.
- No current Simulation documentation described `resetBaselineEconomicInputs` as an active concept, so the Simulation spec was left unchanged.

## Verification

- **PASS — Simulation workspace/regression:** `node scripts/verify_simulation_regression.mjs`.
- **PASS — Simulation history:** `node --experimental-strip-types scripts/verify_simulation_history.ts`.
- **PASS — Simulation corrections:** `node --experimental-strip-types scripts/verify_simulation_corrections.ts`.
- **PASS — Simulation story/page:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts`.
- **PASS — Simulation economics:** `node --experimental-strip-types scripts/verify_simulation_economics.ts`.
- **PASS — Simulation Result:** `node --experimental-strip-types scripts/verify_simulation_result.ts`.
- **PASS — build:** `npm run build` (`tsc -b` and Vite production build).
- **PASS — `git diff --check`**.
- Existing build warnings remain for browser-externalized ExcelJS Node modules and a minified chunk over 500 KB.

## Limits

- Browser verification was not run; this is an internal state normalization with focused reconciliation and regression coverage.

## Delivery

One focused commit is pushed to `origin/logic/simulation-finalized-implementation`; its exact SHA is in the completion report. The pre-existing `vite.config.ts` change is not included.

---

# Historical Handoff — Simulation Reset correction — 2026-10-18

This records the completed immediately preceding Reset round. The obsolete baseline cleanup above supersedes its current-task status.

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`.
- Starting local HEAD and fetched remote HEAD: `a34be2b10498c63616f837b39b87ecbdeb71474b`.
- Pre-existing local-only change: `vite.config.ts`; original hash `6cb12f71f406f9b83ad0e54fabf194b284de455a`. It remains untouched and excluded.
- Scope: finalized Simulation Reset behavior and Reset action placement only.

## Changes

- Reset restores editable BOM Price/Usage/Loss and Routing Manning/Capacity/Yield to the active Simulation parameter baseline, preserves live Current Work Center rates and the working selection, and clears all five Economic/Business draft inputs.
- Blank Selling Price and SG&A override inputs render empty with the `Current` placeholder. Existing calculations continue to fall back to Current values. Initialization, Clone, Send, economic/business formulas, and parameter calculations remain unchanged.
- Removed Reset from the Global Header. The Simulation Result action line now places Reset immediately to the right of Send To. Reset remains local to Simulation.
- Reset remains one history transaction; Undo restores the complete pre-Reset state and Redo reapplies Reset. Updated focused Simulation specs and verifiers.
- No Simulation graph, Visible Net, Selling Price graph styling, GAP, or unrelated UI code was changed.

## Verification

- **PASS — Simulation workspace/regression:** `node scripts/verify_simulation_regression.mjs`.
- **PASS — Simulation history:** `node --experimental-strip-types scripts/verify_simulation_history.ts`.
- **PASS — Simulation corrections:** `node --experimental-strip-types scripts/verify_simulation_corrections.ts`.
- **PASS — Simulation story/page:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts`.
- **PASS — Simulation Result:** `node --experimental-strip-types scripts/verify_simulation_result.ts`.
- **PASS — Simulation economics:** `node --experimental-strip-types scripts/verify_simulation_economics.ts`.
- **PASS — build:** `npm run build` (`tsc -b` and Vite production build).
- **PASS — isolated headless Chrome 155:** desktop 1440×900 and narrow 390×844. Verified all five Economic inputs stay blank after Reset, Selling Price/SG&A show `Current`, a BOM and Routing edit return to baseline, one Undo restores pre-Reset edits, Redo reapplies Reset, Reset is right of Send To, and neither viewport has horizontal overflow.
- **PASS — `git diff --check`.**
- **DEPENDENCY AUDIT:** `npm audit --audit-level=high` reports 5 High and 4 Moderate vulnerabilities in the existing dependency tree. No dependency manifests or lockfiles were changed in this Reset task.
- Existing build warnings remain: ExcelJS browser-externalized Node modules and a minified chunk over 500 KB.

## Limits

- **[Unverified]** Physical-device display scaling, touch behavior, screen-reader behavior, and browsers other than the isolated Chrome session.
- Dependency audit findings remain outside this Reset scope.

## Delivery

One focused commit is pushed to `origin/logic/simulation-finalized-implementation`; its exact SHA is in the completion report. The pre-existing `vite.config.ts` change is not included.

---

# Historical Handoff — Simulation Graph Visible Net — 2026-10-18

This records the completed immediately preceding round. The Simulation Reset handoff above supersedes its current-task status.

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`.
- Starting local HEAD and fetched remote HEAD: `b583110c65dfe3370beda34ed347e7cd5d20c63d`.
- Pre-existing local change: `vite.config.ts` remains untouched and excluded from this round.
- Scope: show each REF/CUR/SIM state’s signed Visible Net from the current Legend-filtered stack, position it relative to the unchanged Standard Cost label, and slightly lighten Selling Price blue. No formula, source data, Result, or business calculation changes.

## Changes

- Visible Net reads `state.stack.total`, the same filtered stack used to draw each state bar. It excludes Selling Price and is not added to GAP labels.
- Visible Net shares the Standard Cost number column, appears above/below its existing label as its value is higher/lower, and is omitted at the existing two-decimal display precision when equal. Standard Cost remains at its prior position and value.
- Selling Price uses the slightly lighter `#2563eb`; its calculation, path, points, Legend toggle, tooltip, and interactions remain unchanged. The price line and points render behind both numeric labels.
- Updated the focused Simulation verifier and `docs/specs/SIMULATION.md` to describe and cover this graph-only behavior.

## Verification

- **PASS — Simulation graph:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts --graph-only`.
- **PASS — Simulation page and regression:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts`; `node scripts/verify_simulation_regression.mjs`.
- **PASS — browser, isolated Chrome 155:** desktop 1440px and mobile 390px. All Legend filters were restored to ON; Visible Net followed filters, hid when equal to Standard Cost, and a negative Simulation Visible Net rendered below the zero Standard Cost anchor. At 390px the graph and page had no horizontal overflow.
- **PASS — build:** `npm run build` (`tsc -b` and Vite production build).
- **PASS — `git diff --check`**.

## Limits

- Browser checks used the isolated headless Chrome session and local Vite server, not a physical mobile device or screen reader.
- Existing build warnings remain: ExcelJS browser-externalized Node modules and a minified chunk over 500 KB.

## Delivery

One focused commit is pushed to `origin/logic/simulation-finalized-implementation`; the exact SHA is recorded in the completion report. The pre-existing `vite.config.ts` change is not included.

---

# Historical Handoff — Simulation Parameter Cost Effect cleanup — 2026-10-18

This records the completed previous round. The active 2026-10-18 Visible Net handoff above supersedes its delivery state.

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`.
- Starting local HEAD and fetched remote HEAD: `123152cbbe7c27570a8cff6c83b7940dfadee073`.
- Pre-existing local change: `vite.config.ts` remains untouched and excluded from this round.
- Scope: remove explanatory unavailable-effect copy from Simulation BOM/RTG details and reconcile only the relevant Simulation and delivery documentation. Calculation logic, attribution checks, protected-row behavior, and other accepted UX remain unchanged.

## Changes

- Removed the `effectUnavailableReason` helper and its two desktop/mobile text renderings. The `Parameter Cost Effect` heading, expansion, effect/Total values, `—` formatter, and underlying availability checks remain.
- Updated the Simulation spec so unavailable values use `—` without explanatory/helper prose.
- Corrected stale 2026-10-17 delivery and checklist claims in `MASTER_DATA_TOOLBAR_PREPARE_UX.md`; retained only verification items that remain unverified and recorded the real `src/state/store.tsx` mock-load navigation change.
- Marked the previous 2026-10-17 eight-item handoff as historical below.

## Verification

- **PASS — Simulation:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts`; `node scripts/verify_simulation_regression.mjs`.
- **PASS — Master Data:** `node scripts/verify_master_data_ui_state.mjs`; `node scripts/verify_master_data_mock_load.mjs`.
- **PASS — build:** `npm run build` (`tsc -b` and Vite production build).
- **PASS — docs/diff:** stale Git delivery claims checked; `git diff --check`.
- **PASS — isolated headless Chrome 155 via CDP:** desktop 1440px and narrow 390px. Available BOM/RTG effects remained numeric; a temporary isolated Mock price edit rendered BOM Price/Total `-4.20`. Unavailable BOM/RTG effects rendered `—` under the retained heading with no diagnostic text. Enter expanded/collapsed a BOM row. No page-width overflow or runtime error was observed.

## Remaining limits

- **[Unverified]** Physical-device display scaling, screen-reader behavior, and browsers other than the isolated Chrome session.
- The Chrome DevTools MCP was not configured in this session; browser checks used an isolated temporary Chrome profile against the local Vite server.
- Existing build warnings remain: ExcelJS browser-externalized Node modules and a minified chunk over 500 KB.

## Delivery

This handoff and the focused changes are contained in one commit pushed to `origin/logic/simulation-finalized-implementation`; the exact commit is the branch HEAD recorded in the completion report.

---

# Historical Handoff — Cost Breakdown / Simulation / Master Data follow-up — 2026-10-17

This records the completed 2026-10-17 follow-up. The active 2026-10-18 handoff above supersedes its delivery state.

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`.
- Starting local HEAD and fetched remote HEAD: `f293f1bd67b479b99ba2a4c0aab3432c6e905c82`.
- Pre-existing local change: `vite.config.ts` remains untouched and is excluded from this follow-up.
- Scope: eight post-audit UX and interaction items covering CBD sticky spacing, Simulation graph header grouping, Clone geometry, per-table Warning/Blocker traversal, mock-load navigation, issue-location labels, shared first-focus input selection, and focused specs/verifiers. Business calculations, formulas, dependency versions, and unrelated workflows were not changed.

## Changes

- Cost Breakdown's 8px resting gap now sits in normal flow outside the sticky Summary; scrolling carries the gap away so Candidate content can reach the Summary's own lower border.
- Simulation Graph title and legend form one compact responsive group with the divider changing orientation at the same 720px breakpoint.
- The Clone menu now sizes to its source labels and remains centered on its 32px trigger; hover, click pinning, dismissal, keyboard access, and copy behavior are unchanged.
- BOM, Work Center, and Routing Warning/Blocker traversal uses stable semantic issue IDs. Equivalent re-renders, View/Edit, search clearing, and focus changes continue the cursor; removed issues are skipped forward; product, role, or table changes reset it. Warning and Blocker cursors remain independent per table.
- Complete and Incomplete Mock loads no longer navigate away from the active Master Data, Cost Breakdown, or Simulation page. Warning/Blocker detail navigation still leads to its Master Data target.
- Prepare Dataset detail rows show `REF/CUR/CUS · BOM/WC/RTG · Row N · Field`, while their accessible labels retain the full semantic names and issue identity.
- Shared editable text inputs, textareas, and `NumericInput` select their full value on each new focus. The first pointer click keeps the selection after native caret placement; later clicks reposition the caret. Text caret movement and partial editing take priority over spreadsheet arrows until an input edge, where grid navigation resumes.
- Relevant specs, static verifiers, focused navigation coverage, and this handoff now describe the same behavior. The `vite.config.ts` local diff is not part of the follow-up.

## Verification

- **PASS — build:** `npm run build` (`tsc -b` and Vite production build). Existing ExcelJS browser-externalization and >500 KB chunk warnings remain.
- **PASS — CBD:** `node --experimental-strip-types scripts/verify_cbd_summary_ux.ts`; `node scripts/verify_cbd_parameter_cost_effect.mjs`.
- **PASS — Simulation:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts`; `node scripts/verify_simulation_regression.mjs`.
- **PASS — Master Data:** `node scripts/verify_master_data_ui_state.mjs`; `node scripts/verify_master_data_mock_load.mjs`; `node --experimental-strip-types scripts/verify_master_data_quality_navigation.ts`; `verify_master_data_custom_dataset.ts` through Vite SSR.
- **PASS — CBD review regression:** `node scripts/verify_cost_breakdown_review_feedback.mjs`; it emitted the existing React SSR `useLayoutEffect` warnings for the Master Data table components.
- **PASS — isolated Chrome browser:** CBD sticky gap at rest/scroll; Graph compact title/legend at desktop/narrow widths and legend toggle; Clone pointer/pin/Escape/outside behavior and measured trigger/menu centers; all six mock/page combinations; Prepare Dataset abbreviations; first-focus mouse/Tab selection, replacement and deletion, second-click caret, arrows, partial selection, select-all, clipboard paste, numeric stepper, spreadsheet navigation, Simulation parameter/Economic/Business input behavior, and narrow-page overflow. No runtime exceptions were observed. The mock browser fixture was restored after temporary interaction probes.
- **PASS — `git diff --check`.**

## Remaining limits

- The running Chrome was an isolated headless browser on the local development server, not the user's physical MacBook Neo display or a real touch device.
- The existing dependency tree and build warnings were not changed by this UX follow-up.

---

# Historical Handoff — Simulation Graph / CBD final visual cleanup — 2026-10-17

This records the state before the current follow-up above. Its opaque sticky-gap implementation and delivery status are historical and superseded.

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`. Starting local HEAD, fetched remote HEAD, and verified `origin/logic/simulation-finalized-implementation` all matched at `26560a41392b6b3d5c3023d56aeda8415b684144`.
- Commit `26560a4` was created during this historical follow-up and is now an ancestor of `123152c`, which was pushed to `origin/logic/simulation-finalized-implementation`.
- Pre-existing local change: `vite.config.ts` remains untouched and excluded from this task's commit.
- Scope: six Simulation Graph visual/interaction fixes, one CBD sticky-gap background fix, plus requirements/verifier/docs synchronization. No formulas, business logic, accepted graph semantics, or numeric precision policy changed.

## Changes

- Simulation Graph: moved dynamic `THB/<UOM>` horizontally above the Y-axis; moved only Standard Cost values to leave a small gap after the outline; changed informational tooltip cursors to the default cursor while retaining the ruler's `ns-resize`; added custom tooltips to REF/GAP 1/CUR/GAP 2/SIM labels; kept bar-series OFF swatches hollow with their series-colored borders while line-series OFF samples turn neutral gray; aligned the title/legend divider and row layout at the same 720px breakpoint.
- Cost Breakdown: kept the existing `pb-2` (8px) desktop sticky gap and changed its background to opaque workspace `bg-slate-100`, preserving sticky behavior and preventing the lower dark table header from showing through.
- Updated `docs/161069/Simulation_Graph_Final_Requirements.md`, `docs/specs/SIMULATION.md`, `docs/specs/COST_BREAKDOWN.md`, and the focused Simulation/CBD verifier expectations for the final behavior.

## Verification

- **PASS — build:** `npm run build`.
- **PASS — Simulation:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts`; `node scripts/verify_simulation_regression.mjs`.
- **PASS — Cost Breakdown:** `node scripts/verify_cbd_parameter_cost_effect.mjs`; `node --experimental-strip-types scripts/verify_cbd_summary_ux.ts`; `node --experimental-strip-types scripts/verify_cost_breakdown_view.ts`.
- **PASS — browser, synthetic Complete Mock / headless Chrome:** graph at 1440×900, 1280×900, 768×900, 390×844; CBD at 1280×900 and 390×844. All requested checks 1–24 passed: horizontal dynamic axis label and Standard Cost spacing; default/ruler cursors; all five immediate category tooltips; bar and line OFF states; matching row/divider behavior at desktop/tablet and stacked mobile layout; retained opaque 8px CBD gap without header bleed; no horizontal overflow or browser runtime errors.
- **PASS — `git diff --check`.**
- **DEPENDENCY AUDIT:** `npm audit --audit-level=high` reports 5 High and 4 Moderate vulnerabilities in the unchanged dependency tree. `npm audit --omit=dev --audit-level=high` reports no High and 2 Moderate. No dependency or lockfile changes are part of this visual task.
- Build reports existing ExcelJS browser-externalization and large-chunk warnings.

## Remaining limits

- **NOT VERIFIED:** physical MacBook Neo display scaling/zoom, physical touch behavior, screen-reader behavior, and browsers other than the tested Chrome environment.
- **DEFERRED from the prior round:** combined Routing minima Manning=`0`, Capacity=`0.0001`, Yield=`0.01%` can produce long valid Parameter Cost Effect values that overlap; this task does not introduce truncation, scientific notation, or a new precision policy.
- Keep historical checkpoints below for context; this current section supersedes their status for the active round.

---

The following sections are historical checkpoints and do not supersede the current handoff above.

# Current Simulation Timeline — 2026-10-16

## A. Pre-layout large correction
- Commit: 62608b5e65ab37217afca955be8c1b8bc01483f1
- Status: IMPLEMENTED + PUSHED; previous verification mostly PASS.
- NOT VERIFIED: physical finger/touch page swipe; physical touch-origin ruler drag.

## B. BOM / RTG refinement
- Commit: ae502d8278289f0d647b940f043c312821d643a9
- Status: IMPLEMENTED + PUSHED; AWAITING SEPARATE USER/VISUAL AUDIT. Not CLOSED.
- Scope: row expand/collapse and chevrons; drag select/deselect from #; stable selected-first identity; Total formatting/alignment.
- Audit still needs to confirm sticky header behavior and Material Cost / Conversion Cost alignment.

## C. Graph requirement discussion
- Status: REQUIREMENT CLOSED / FINALIZED.
- Legend is a graph-view filter only; it does not change Result or underlying Simulation data.

## D. Graph implementation
- Starting commit: ae502d8278289f0d647b940f043c312821d643a9.
- Status: IMPLEMENTED + PUSHED; AWAITING GRAPH AUDIT. Do not mark CLOSED until the separate audit/review.

## E. Current next steps
1. Separately audit BOM / RTG refinement.
2. Separately audit Graph.
3. Decide closure/status for each area only after its audit.
# Historical Handoff — Simulation Pre-layout Functional Correction

**Updated:** 2026-10-16

**Repository / worktree:** apirak-k/COSTBREAKDOWN / `.worktrees/SIMULATION-FINALIZED`.

**Branch:** `logic/simulation-finalized-implementation` (user-renamed remote; local branch renamed and upstream corrected). Starting local and remote HEAD: `4932e8386aaf4e0c9f6ebc0c90eafd7f559fda7b`.

**Status:** Corrections implemented; confirm commit/push from live Git and the final delivery report. Functional closure remains pending direct touch-swipe verification. Do not start the separate large Simulation UI/Layout polish pass automatically.

## Changes and preserved boundaries

- Simulation selection updates use functional per-product state, so select-all does not overwrite preceding toggles. Existing displayed numbers and selected-first ordering are preserved. Header controls expose false/mixed/true checkbox state; row controls toggle stable records.
- Number controls share the header axis. Individual opaque sticky header cells own the boundary above scrolling body rows. Parameter Cost Effect labels align with row names on desktop and mobile; parameter/value column geometry is unchanged.
- Normal editable Status is CHANGED/UNCHANGED against the start/clone/reset parameter baseline, independent of the Current-to-SIM comparison used for calculations. Compact bold amber/slate styling matches CBD. Structural/protected matching is retained safely.
- Persistent Clone/Send/Reset messages and obsolete local feedback state are removed. Existing data-layer Send validation remains intact as an invariant safeguard.
- Only the two CBD Status/Gap Sort popover Tooltip wrappers were removed; their filtering/sorting, hover/click menus, and keyboard handlers remain.
- Ordinary story graph space uses pan-y; the narrow ruler retains touch-none and pointer capture. Overall panel composition, proportions, formulas, NumericInput, Master Data implementation, and CBD business logic were not changed.
- SIMULATION.md records the latest supplied corrections, including dynamic resolved UOM. Stale verifier assertions were updated for the current contract; CBD source matching now accepts CRLF, and Master Data checks distinguish the onUndo identifier from simulationUndoRedo.

## Browser evidence

Isolated in-app browser at `http://127.0.0.1:5176/`, using the development Complete Mock (five BOM rows, seven Routing rows) and valid temporary edits. No real workbook or user dataset was used. Temporary viewport overrides, tab, and dev server were cleaned up.

- Viewed 1920x920, 1440x900, 1366x768, 900x900, and 390x844. No Simulation document/table horizontal overflow. Header/number center error measured 0px. Desktop expanded label text starts exactly matched identity text; mobile both started at x=61px.
- BOM/RTG middle-row selection, repeat deselection, stable selected-first identity, false/mixed/true headers, mouse select-all, Space deselect-all, and Enter select-all passed. Individual selection also passed at 900px and 390px.
- Viewed opaque headers during top/first movement/middle/bottom scroll, including selected-first and expanded details. At 1366px, first movement was 8px; intermediate/bottom states reached 46px and 112px/192px. At 1920px and 1440px, both tables also retained clear headers through scrolling.
- BOM/RTG edits produced CHANGED; Undo and Reset restored UNCHANGED. One Undo after Reset restored both edited BOM parameters together. Typed Capacity=0 retained the authoritative 100. Clone Reference/Current/Custom worked; clone baselines started UNCHANGED even when different from Current.
- Send Custom updated Working, Master Data Undo restored empty Custom, Redo restored the sent data. Send Reference left Current and SIM intact. Send Current updated Working and recreated SIM with UNCHANGED values while retaining Economic inputs. No persistent action status text appeared.
- CBD Status filtering hid/restored CHANGED findings; Gap Low-to-High sorted correctly. Both popovers opened without tooltips. Actual Candidate drag onto a row body reordered findings; Undo restored order and Redo reapplied it. Master Data BOM row selection and Working history passed. Navigation remained exactly three pages.
- Economics example: Saving 2.10, Required Saving 2.20, Margin -0.10, Break-even 53 PC; Result/GAP 2 were -2.10. No NaN/Infinity was rendered.
- At 390x844, wheel scrolling over ordinary graph space moved Main from 0 to 295px. Ruler pointer drag changed its value from 80.13 to 167.42; ArrowDown changed it to 164.37. MAT legend toggled off/on and hidden series count became zero. Computed graph/ruler touch-action values were pan-y/none.
- **NOT VERIFIED:** actual finger/touch-swipe page scrolling and touch-origin ruler drag. Available browser capabilities expose viewport sizing and mouse/pointer input, not touch-swipe emulation. Pointer/wheel evidence is not claimed as a physical touch PASS. Therefore PRE-LAYOUT FUNCTIONAL CORRECTION is not yet CLOSED.

## Automated verification

Final runs passed:

```text
node --experimental-strip-types scripts/verify_simulation_corrections.ts
node --experimental-strip-types scripts/verify_simulation_history.ts
node --experimental-strip-types scripts/verify_simulation_story_view.ts
node --experimental-strip-types scripts/verify_simulation_result.ts
node --experimental-strip-types scripts/verify_simulation_economics.ts
node scripts/verify_simulation_regression.mjs
node --experimental-strip-types scripts/verify_cbd_reorder_history.ts
node --experimental-strip-types scripts/verify_cost_breakdown_sort.ts
node --experimental-strip-types scripts/verify_cbd_summary_ux.ts
node scripts/verify_master_data_ui_state.mjs
npm.cmd run build
git diff --check
```

The regression runner executes Simulation workspace/context/engine, Master Data edit history, and Global Header suites through Vite SSR. There is no dedicated package.json lint/test command.

Warnings: Node experimental type stripping; existing ExcelJS fs/crypto browser externalization; Vite >500KB chunk warning; Git LF-to-CRLF notice. `npm.cmd audit --audit-level=high` returned 5 High/4 Moderate existing findings; `npm.cmd audit --omit=dev --audit-level=high` returned zero High and two Moderate production findings. Dependencies were not changed.

# Historical Handoff — CBD Sticky Summary and Selection Alignment

**Updated:** 2026-10-15

**Repository:** apirak-k/COSTBREAKDOWN

**Worktree / branch:** .worktrees/CBD-CANDIDATE-INTEGRATION / codex/cbd-candidate-integration

**Starting baseline:** 8bbc4d0069a51fb714a3707b8f391a9e8546db73; local and fetched origin matched before work.

**Implementation commit:** 4684c5a (fix(cbd): restore finalized sticky summary behavior).

## Current Product Flow

The visible product remains exactly three top-level pages: Master Data → Cost Breakdown → Simulation. Candidate findings and Selected Comparison remain inside Cost Breakdown. There is no Selected Comparison handoff into Simulation.

## CBD Contract and Changes

- The page remains Cost Breakdown; the upper summary table and its accessible name are Cost Element.
- On desktop, the shared Main is the single primary CBD vertical scroll owner. The Subheader and bounded Cost Element / Work Center overview are sticky together at the top of Main. Candidate findings remain normal-flow content and do not create a second vertical scroll region.
- Cost Element and Work Center are equal-height bounded panels. The Work Center row body scrolls internally when needed; its header and Total stay fixed on the same grid.
- On narrow layouts, the summary panels stack, natural Main scrolling remains available, and candidate table overflow is locally contained.
- The Selected header alone receives the alignment adjustment. Numeric Selected values remain in their existing fixed-width slots. In the populated browser fixture, header text and value start positions differed by less than 0.5px.
- Work Center typography now matches Cost Element. Header and footer background colors also cover the body scrollbar gutter.
- CBD formulas, source snapshots, candidate identities, and Selected Comparison semantics are unchanged. No Simulation, Master Data, AppLayout, formula, or dependency files changed.

## Populated Browser Verification

The local preview at 127.0.0.1:5191 used the Complete Mock fixture: six BOM findings, ten Routing findings, five Work Centers, multiple CHANGED details, selected BOM findings, and enough Candidate rows to scroll. Browser was Microsoft Edge 155.0.4283.45 in an isolated task tab.

| Viewport | Main and overview | Work Center body | Overflow |
|---|---|---|---|
| 1920×920 | Main 826px client / 1120px content; overview 1392×176px; Cost Element and Work Center each 692×176px | 116px client / 145px content | No document overflow; Main scrolls Candidate; WC body scrolls internally |
| 1440×900 | Main 806px client / 1120px content; overview 1386×176px; each panel 689×176px | 116px / 145px | No document overflow; Main scrolls Candidate; WC body scrolls internally |
| 1366×768 | Main 674px client / 1120px content; overview 1312×176px; each panel 652×176px | 116px / 145px | No document overflow; Main scrolls Candidate; WC body scrolls internally |
| 900×900 | Summary panels stack; Main 736.5px client / 1325px content | Stacked Work Center | No document overflow; natural vertical Main scroll and local table horizontal scrolling |
| 390×844 | Summary panels stack; Main 658px client / 1337px content | Stacked Work Center | Document width remains 390px; table horizontal scrolling is local |

At desktop, scrolling Main moved Candidate content while the Header, Footer, Subheader, and summary remained in their shell/sticky positions. Scrolling the Work Center body changed only its scrollTop; the header, Total, Cost Element, and Candidate position stayed fixed. The two summary panels remained equal height with few or many rows.

Browser interactions verified Candidate drag reorder, selected-group drag, chronological cross-table Undo/Redo, and Reapply Sort. Reapplying Sort restored sorted BOM and Routing orders and disabled both history controls. Hiding CHANGED findings with the Status filter preserved the selected contribution (+8.24); restoring the filter returned the findings. Enter expanded a CHANGED detail; clicking the header area outside Candidate collapsed it while preserving the selected contribution. The overview collapse/expand control hid/restored only the two summary panels while leaving the Subheader and Candidate available.

## Documentation and Verification

Updated docs: docs/specs/COST_BREAKDOWN.md, docs/specs/CROSS_CUTTING.md, docs/specs/FINAL_LOGIC_SPEC.md, and design.md. These specify sticky summary ownership, Main-owned CBD scrolling, normal-flow Candidate content, equal-height summaries, internal Work Center scrolling, and the Selected/full comparison presentation.

Passing focused verifiers:
- node --experimental-strip-types scripts/verify_cbd_summary_ux.ts
- node scripts/verify_cbd_parameter_cost_effect.mjs
- node --experimental-strip-types scripts/verify_cbd_reorder_history.ts
- node --experimental-strip-types scripts/verify_cost_breakdown_sort.ts
- node --experimental-strip-types scripts/verify_cost_breakdown_view.ts
- node --experimental-strip-types scripts/verify_selected_comparison_boundary.ts
- node --experimental-strip-types scripts/verify_selected_comparison_lifecycle.ts
- node --experimental-strip-types scripts/verify_row_drag_selection.ts
- node --experimental-strip-types scripts/verify_snapshot_comparison_view.ts
- Vite SSR verifier: scripts/verify_work_center_comparison_view.ts
- Vite SSR verifier: scripts/verify_global_header.ts
- node scripts/verify_master_data_ui_state.mjs
- npm.cmd run build
- git diff --check

The build passed with the existing ExcelJS browser externalization warnings for fs, crypto, and @fast-csv. The unrelated untracked tasks/master-data-cbd-final-audit.md was present before work and remains untouched and unstaged.

## Delivery Status

The implementation commit is 4684c5a on codex/cbd-candidate-integration. The documentation is recorded in a subsequent docs commit on the same branch. No reset, branch switch, merge, force push, dependency change, formula change, or source dataset edit was made.

## Historical Final Logic Checklist Evidence — 2026-10-09

The following evidence belongs to the earlier `codex/final-logic-implementation` checkpoint. It is retained for traceability and does not prove that the current post-merge integration branch has re-passed these checks.

- **Historical repository:** `apirak-k/COSTBREAKDOWN`
- **Historical implementation branch / delivery target:** `codex/final-logic-implementation` → `origin/codex/final-logic-implementation`.
- **Historical worktree:** `.worktrees/codex-final-logic-implementation`.
- **Independent review correction base:** `4a1968db841d97ff8d6c44b3aadf929f73e01be1`.
- **Latest application source commit in that checkpoint:** `15379d92a2815fa6bea89f2b9cad56ec29347148` (`fix: reset Parameter SIM on RCA handoff`).
- **Full implementation baseline:** `665099b71319ec98c537a0859336dc01b9acc118`.
- **User-reported approval:** The user reported that Final Logic implementation commit `9c25906435ed14eee6b67692e3bfd8d1a43695de` was independently approved at that time.
- The Frozen Final Requirement Traceability Checklist v1.0 and implementation re-audit are recorded in `.planning/2026-10-09-final-logic-implementation/findings.md`. That audit reported 473 PASS, 2 N/A — PROVISIONAL/UI ONLY (R-10 and R-11), 0 open FINDING, and 0 NOT VERIFIED for its checkpoint.

## Historical Frozen Checklist Completion Evidence

- All initially confirmed implementation findings and applicable evidence gaps were addressed. The complete per-ID final matrix is in `findings.md`; the frozen requirement wording and IDs in `task_plan.md` are unchanged.
- The active review fixture and system logic diagram were corrected. Superseded agreement/history documents remain retained and are called out in the audit ledger rather than rewritten as current requirements.
- TypeScript verifiers: 62/62 effective PASS (60 through the cached CJS runner; 2 SSR verifiers through Vite). MJS verifiers: 2/2 PASS.
- `npx tsc --noEmit --pretty false`: PASS. `npm run build`: PASS, 2,028 modules. Active-source superseded-logic scan: PASS. Baseline-to-HEAD review and `git diff --check`: PASS.
- Isolated browser checks covered the Master Data spreadsheet interactions, including Shift/Ctrl row selection, and the RCA/Simulation, Selected Comparison, Economic-only, standalone Simulation, and context lifecycle flows. The original user tab was not modified.

## Independent Review Findings Corrected

This section records the earlier review loop and remains historical implementation evidence. The full frozen checklist audit below supersedes its narrower completion checkpoint; it does not invalidate these individual fixes.

1. **Factors to Simulate are business records.** The selector now lists eligible Material and Process/Routing records. Selecting a record exposes all three applicable BOM or Routing parameter inputs on that record. The calculation still recalculates the full SIM snapshot, and Work Center rates remain excluded. Existing stored parameter-type selections are discarded during state reconciliation.
2. **Economic-only Simulation is independent.** Action Cost and Evaluation Quantity are available before Parameter SIM starts; Required Saving is calculated without a SIM snapshot. Starting Parameter SIM preserves those inputs. Economic Margin is shown only when Parameter Simulation exists, alongside the Parameter Saving result. Action Cost remains outside Standard Cost.
3. **RCA Case can proceed to Simulation.** The active Case ID, Candidate keys, and latest Root Cause/Action draft are carried into Simulation. RCA remains complete without Simulation, and no completion gate is added. For a new SIM after this handoff, Current is the first/default source choice while Reference and Custom stay available. Candidate context does not lock or preselect Factors; all Material and Process records remain selectable.
4. **RCA handoff always starts a fresh Parameter SIM state.** An explicit handoff now clears any pre-existing Current, Reference, or Custom Parameter snapshot, selected Factors, source, fingerprint, and start time rather than reusing them. Reconciled Economic inputs are preserved. The legacy `activeTab='rca'` value now returns to the Candidate/RCA workflow; `dashboard` still maps to Simulation.

## Historical Verification

- All 62 TypeScript verifiers pass effectively; 60 use the cached CJS runner and two SSR verifiers pass through Vite. Both MJS verifiers pass (2/2).
- `npx tsc --noEmit --pretty false` passes. `npm run build` passes with 2,028 modules transformed. The build continues to report ExcelJS browser externalization warnings for `fs`, `crypto`, and `fast-csv`.
- The final A-01 through W-33 matrix contains 475 unique IDs with no missing or duplicate IDs. Status is 473 PASS, 2 N/A (R-10/R-11), 0 FINDING, 0 NOT VERIFIED.
- `git diff --check`, stale/superseded active-source scan, and full baseline-to-HEAD diff review pass.
- Targeted tests cover Master Data lifecycle and all six Clone From directions; workbook formulas/round-trip; CBD identity/status/reconciliation; Selected Comparison lifecycle; candidate ranking; single/multi-Candidate RCA; RCA completion without SIM; RCA→SIM handoff; standalone and three-source Simulation; record-based factors/full-dataset recalculation; Economic-only and combined modes; Action Cost isolation; commercial formulas; state migration and cross-flow context.
- Isolated browser checks confirmed Master Data editing/navigation/paste/bulk actions and Shift/Ctrl row selection; one-/multi-Candidate RCA handoff; Current-first with Reference/Custom available; additional Factor selection; Economic-only inputs before Parameter SIM and their persistence into combined mode; direct Simulation without stale RCA context.
- Phase 16 targeted regressions directly exercise resetting pre-existing Current/Reference/Custom Parameter SIM states before RCA handoff, clearing old Factors, retaining Economic inputs, showing Current first with Reference/Custom available, unrestricted Material/Process Factor selection, RCA-context expiry, and legacy active-tab migration. The exact old-SIM→RCA→Proceed integration was not separately clicked through in a browser during this correction batch.

## Historical Verification Limits and Build Notes

- Native Excel was not launched; generated workbook formulas, notes, styles, and round-trip behavior were checked by the workbook verifiers. Human visual acceptance remains a later checkpoint and was not represented as complete.
- Phase 16 exercised the handoff state transition and server-rendered controls; no browser click-through of each old-SIM source sequence was performed in this correction batch.
- Vite reports the existing ExcelJS `fs` / `crypto` browser-externalization warnings during build; the production build completes successfully.
- `npm audit --audit-level=high` reports 5 High development-dependency findings and 4 Moderate findings overall. The production-only audit has no High findings but reports 2 Moderate ExcelJS/uuid findings. npm's full automatic remediation proposes breaking dependency changes, so no dependency update was included in the frozen logic scope.
- The worktree contains an unrelated untracked `src/graphify-out/` directory generated by tooling. It was preserved and excluded from commits.

## Historical Final Logic Baseline Summary

This summary describes the finalized logic baseline represented by the historical audit above. The current canonical product specifications remain the authority for behavior.

1. **Master Data:** Reference, Current, and independent Custom workspaces. The active dataset is the destination for Clone From; structural edits stay in Master Data.
2. **Cost Breakdown:** Reference vs Current only. Selected Comparison remains a temporary analysis scope and does not carry into Simulation.
3. **RCA:** One Case can include one or multiple Candidates. Root Cause and Action complete RCA; Simulation is optional. An active Case can pass context into Simulation without locking scope; a new SIM naturally starts from Current, with Reference and Custom still selectable. Existing Master Data notes remain separate.
4. **Simulation:** One independent module starts from Reference, Current, or Custom; its structure is locked and Current vs SIM is the parameter comparison. Factors to Simulate are Material/Process records; selection controls visibility of that record's editable parameters. The six parameter types are BOM Price/Usage/Loss and Routing Manning/Capacity/Yield. The full SIM recalculates; Work Center rates are not editable.
5. **Economics:** Economic-only mode calculates Required Saving from Action Cost / Evaluation Quantity without a Parameter SIM snapshot. Combined mode also shows Parameter Saving and Economic Margin (`Parameter Saving - Required Saving`); results remain advisory and Action Cost does not enter Standard Cost.
6. **Business formulas:** SG&A amount = Selling Price × SG&A%; OP = Selling Price − Standard Cost − SG&A amount. Negative OP remains visible. The Reference → Current → Simulated graph stays active and shows adjacent signed gaps.
7. **Superseded workflows:** Scenario A/B is not mandatory. The dedicated Trial lifecycle and old combined A/B simulation flow are retired; Custom remains a general-purpose workspace.

## Historical Implementation Commit Map

- `19303af` — Custom workspace state
- `b2b4be3` — Custom Master Data actions and isolation
- `eadc775` — Generic Clone From
- `368128b` — Multi-Candidate RCA Case domain
- `74843ed` — Candidate selection and RCA Case workflow
- `f82a693` — Independent Simulation state and navigation
- `4910176`, `e770f8d` — Parameter Simulation engine and nullable inputs
- `cca628e` — Parameter Simulation UI
- `fd559a0` — Independent Economic Simulation
- `a72570a`, `8e0944c` — Retire superseded active paths; final fixture/verifier correction
- `c907efd` — Phase documentation correction
- `fd870f8` — Correct record-based Factors to Simulate and independent Economic-only mode
- `56935a9` — Add optional RCA Case context handoff to Simulation
- `3abb6f8` — Close frozen final logic audit findings; add regression evidence and remove disconnected competing state/engines
- `15379d9` — Fresh Parameter SIM reset on RCA handoff and legacy active-tab migration

## Round 2 Selected Value / Decimal UX — 2026-10-21

- **Repository/worktree:** `apirak-k/COSTBREAKDOWN`, `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`.
- **Branch and starting point:** `feat/selected-value-ux`, starting local and fetched remote HEAD `3b3880f79891293662aeb5e622d11941bcf3ea64`.
- Round 2 is limited to Master Data. Numeric source identities distinguish Reference, Current, Custom, section/table, record or draft, and field. Editable and read-only values use the Selected Value behavior; compact body formatting remains separate from the exact selected Header Value. The sizing dialog exposes the same selected value control inside its focus scope, and Master Data grid keyboard navigation remains available.
- Product/spec notes and isolated browser verifiers were updated. No formulas, dataset lifecycle/history, Cost Breakdown, or Simulation Round 3+ implementation was changed.
- **Verification:** `npx tsc --noEmit --pretty false`; `npm run build`; `git diff --check`; `node scripts/verify_master_data_ui_state.mjs`; `node scripts/verify_master_data_selected_value.mjs` (110 passed, 0 failed in isolated headless Chrome); `node scripts/verify_numeric_input.mjs`; the dataset sizing, edit history, spreadsheet batch, quality navigation, row order, clear dataset, sizing no-op, rename/empty edit, snapshot import, direct dataset editing, custom dataset, clone readiness, handoff, preservation, mock-load, and toolbar-preparation verifiers all passed. `node --check scripts/verify_master_data_selected_value.mjs` passed. The live app browser regression also typed `12.3456789` in Master Data, Simulation, Business, and Economic numeric inputs and accepted the full value before compact blur display.
- Browser coverage used Chromium at desktop and responsive viewport widths. Reference-specific numeric sources and save/reload persistence were not exercised; the focused Selected Value flow used Custom and Current in-memory workspaces.
- **Known follow-up risk:** applying changed row counts and changed metadata together in Dataset Sizing previously caused metadata to disappear from the main header, consistent with existing session callbacks replacing the same session from stale render state. Round 2 intentionally leaves dataset lifecycle/store behavior untouched. The browser verification applied count changes and metadata changes separately; combined Apply remains unverified and the observed behavior should be fixed in a separate lifecycle task.
- The build succeeds with existing ExcelJS browser externalization warnings (`fs`, `crypto`, and `@fast-csv`) and the existing large-chunk warning. `npm audit --audit-level=high` exits 1 for existing dependencies (6 High and 4 Moderate findings); no dependency changes were made because remediation would require breaking or force upgrades.
- The intended delivery is one Round 2 commit on this existing branch, pushed normally to `origin/feat/selected-value-ux`; no merge or force-push is authorized or planned.

## Current Work Focus

The CBD overview UX refinement is the active bounded pass on `codex/cbd-candidate-integration`, starting at `97fe2e36edc4fbea6aea7d2f8b315da50b6b5138`. The latest delivery report and Git HEAD on that branch are authoritative for its commit and push status. Address any external-audit findings as a separate bounded pass.
