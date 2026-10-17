# Current Handoff — Simulation Graph / CBD final visual cleanup — 2026-10-17

- Repository: `/Users/bubu/COSTBREAKDOWN`, `apirak-k/COSTBREAKDOWN`.
- Branch: `logic/simulation-finalized-implementation`. Starting local HEAD, fetched remote HEAD, and verified `origin/logic/simulation-finalized-implementation` all matched at `26560a41392b6b3d5c3023d56aeda8415b684144`.
- New local commit SHA: `HEAD` (the exact object ID is included in the completion report and is available from `git rev-parse HEAD`). **NOT PUSHED.**
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
