# Current Handoff — Simulation graph tooltip positioning — 2026-10-18

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`.
- Starting local HEAD and fetched remote HEAD: `1ef8f35e90bb00ddc5ee82a733e76d0996c105b7`.
- Pre-existing local-only change: `vite.config.ts`; inspected, preserved exactly, and excluded from this round.
- Scope: Simulation Graph tooltip positioning only.

## Tooltip placement

- Anchored each tooltip to the rendered bounds of the hovered SVG element, centered horizontally with a consistent gap.
- Tooltips prefer above the target and move below only when there is insufficient room above. Their rendered bounds are clamped inside the graph host on both axes.
- Pointer movement within the same target no longer changes tooltip position. Removed the old category-label-specific placement exception.
- Kept tooltip content, immediate show/hide behavior, wrapping, GAP category explanations, data-mark labels, and keyboard stop behavior unchanged. Bottom Reference, Current, and Simulation labels remain without tooltips.
- Added focused geometry and source checks in the Simulation graph verifier and documented the placement contract in `docs/specs/SIMULATION.md`.
- Graph calculations, Visible Net placement, all twelve existing Visible Net cases, Result/Economic/Business behavior, and `vite.config.ts` were not changed.

## Verification

- **PASS — Simulation graph verifier:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts --graph-only`; includes above/below placement and left/right host-edge geometry.
- **PASS — Simulation story/page verifier:** `node --experimental-strip-types scripts/verify_simulation_story_view.ts`.
- **PASS — Simulation regression:** `node scripts/verify_simulation_regression.mjs`.
- **PASS — Economics verifier:** `node --experimental-strip-types scripts/verify_simulation_economics.ts`.
- **PASS — Result verifier:** `node --experimental-strip-types scripts/verify_simulation_result.ts`.
- **PASS — production build:** `npm run build`; existing ExcelJS browser externalization and >500 KB chunk warnings remain.
- **PASS — isolated headless Chrome:** 1440×1000 and 390×844. Hovering GAP 2 total produced a centered tooltip at desktop; it stayed fixed after moving within the same target. At narrow width it clamped inside the graph's right edge and remained fixed. Both screenshots showed the tooltip above the target with no horizontal page overflow.
- **PASS — `git diff --check`**.

## Limits and delivery

- **[Unverified]** Physical-device rendering, screen-reader behavior, and browsers other than the isolated Chrome session.
- One focused commit is pushed to `origin/logic/simulation-finalized-implementation`; the exact SHA is in the completion report. `vite.config.ts` remains excluded.

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

## Current Work Focus

The CBD overview UX refinement is the active bounded pass on `codex/cbd-candidate-integration`, starting at `97fe2e36edc4fbea6aea7d2f8b315da50b6b5138`. The latest delivery report and Git HEAD on that branch are authoritative for its commit and push status. Address any external-audit findings as a separate bounded pass.
