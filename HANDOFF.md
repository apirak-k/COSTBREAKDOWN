# Current Handoff — Reference / Current / Custom Simulation final polish — 2026-10-20

## Checkpoint and delivery

- Repository: `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign` (`apirak-k/COSTBREAKDOWN`). Branch: `feat/ref-current-custom-flow-redesign`.
- Verified starting local and fetched remote baseline: `0ff54c9537888f004570ad263eabd2a0002febc1`.
- This is one combined, focused Simulation final-polish round. One commit and push to this branch are authorized. Do not merge or start Phase 5.

## Implemented

- Fresh Simulation opens with Custom active and Current → Custom in Result. Main Reset resets only the active role: parameter overrides return to its Master Working values, Fixed / Variable / Batch clear, and Selling Price / SG&A return to that role's Master values. It preserves active role, pair, other roles, Master Data, and same-basis row selection within one role-local history change. Reset All applies that reset to all roles and returns the workspace to Custom / Current → Custom.
- CBD and Simulation use one canonical 96×32 Before/After selector with trigger-width minimum, intrinsic popup growth, the own-role option filtered, visible-option keyboard navigation, viewport clamp/flip, side tooltip, and accessible side plus selected role. CBD Status and Sort retain their prior behavior and now share the exclusive-popover manager.
- Result uses one visible `Cost / Unit | Before | After | Change | %` header row, with selected roles in selector accessibility labels. The Business Outcome / Unit divider and sr-only Result title remain.
- The fixed graph uses one widened X coordinate system (`plotLeft=88`, `plotRight=780`, width 692; centers 155 / 294 / 433 / 572 / 710) without the former global shift or outer translate. The Custom labels stay inside the SVG viewBox.
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

## Current Work Focus

The CBD overview UX refinement is the active bounded pass on `codex/cbd-candidate-integration`, starting at `97fe2e36edc4fbea6aea7d2f8b315da50b6b5138`. The latest delivery report and Git HEAD on that branch are authoritative for its commit and push status. Address any external-audit findings as a separate bounded pass.
