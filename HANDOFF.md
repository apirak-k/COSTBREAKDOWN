# Current Handoff — CBD and Simulation UX Correction / Polish

**Updated:** 2026-10-15

**Repository:** `apirak-k/COSTBREAKDOWN`

**Worktree / branch:** `.worktrees/CBD-CANDIDATE-INTEGRATION` / `codex/cbd-candidate-integration`

**Starting baseline:** `23a9a5a4a644cae0bead68dae5d07d32f34d94ff`; fetched `origin/codex/cbd-candidate-integration` matched before implementation.

**Implementation commit:** `d0cd515e06d66f23d9052e0a23f2e237bb6795a6` (`fix(ux): tighten CBD and Simulation workspace`). The unrelated untracked `tasks/master-data-cbd-final-audit.md` remains untouched and excluded.

## Current Product Flow

The visible product remains exactly three top-level pages: Master Data → Cost Breakdown → Simulation. Candidate/finding analysis and Selected Comparison remain inside Cost Breakdown. Simulation has no CBD selection handoff or shared selected state.

## Correction / Polish Delivery

- **CBD:** Rebalanced existing BOM/Routing table columns, kept Status compact, widened parameter tracks, kept Reference → Current parameter values on one line where practical, and changed continuous displayed gaps/values to two decimals. CBD comparison, filters, sort, selected findings, and calculations were not changed.
- **Simulation selection:** Replaced the separate row checkbox with the `#` row-number control and header select/clear action. Selected rows move to the top of the view in stable order while the SIM snapshot order and full-snapshot calculation remain unchanged. State-level validation and reconciliation reject/prune removed, ambiguous, unmatched, and unknown targets.
- **Reset / clone:** Each clone/start captures both the SIM parameter snapshot and Economic draft as a Reset baseline. Reset restores both while retaining the Current Work Center rate context, local selection, and source datasets. Blank Selling Price and SG&A overrides visibly resolve to valid Current values while keeping blank fallback semantics.
- **Workspace / transient UI:** Desktop Simulation uses a roughly 2:1 Graph-to-Result/Economic upper row and equal-width BOM/RTG lower panels. The shell's main area is fixed at desktop; only BOM/RTG table bodies own internal vertical scrolling. Narrow layouts stack and scroll naturally. Blank workspace clicks close Clone/Send menus and effect disclosures without changing selection or values.
- **Graph / Result / Economic:** Graph uses a slightly softened fill of the same CBD MAT/LB/BD colors, draws the ruler line over bars, and shows numeric-only bar totals with state names below. Result Change and % are red for cost increases, green for decreases, neutral at zero, and gray when unavailable. Economic Calculation Notes were removed; formula tooltips and Parameter Saving sign colors remain.
- **Parameter Cost Effect:** Effects remain aligned under parameter columns; the numeric Total remains and effect percentages are removed. Protected and removed rows can expand to explain unavailable attribution but cannot be edited or selected.
- **Numeric display:** Continuous visible values use two decimals while higher stored/input precision remains intact where already supported. No calculation formula or calculation precision was changed.

## Documentation

- `docs/specs/SIMULATION.md` — Reset includes Economic inputs; graph labels/ruler; `#` selector, selected-first view order, protected rows, compact effects, and desktop workspace.
- `docs/specs/CROSS_CUTTING.md` — two-decimal display guidance and Simulation's higher-precision Usage/Capacity input exception.
- `docs/specs/COST_BREAKDOWN.md` — compact Status, wider parameter presentation, and one-line Reference → Current display.
- `design.md` — graph, workspace, selection, Reset, and result color decisions.

## Verification Evidence

- **Build:** `npm run build` passed (`tsc -b && vite build`, 2,043 modules). Vite emitted the existing ExcelJS browser-externalization warnings for `fs`, `crypto`, and `@fast-csv`; the build completed successfully.
- **Automated:** The Vite SSR verifier suite passed for Simulation workspace, graph/story, economics, parameter engine, context, numeric integrity, CBD view/sort/summary, candidate prioritization, Selected Comparison boundary/lifecycle, Master Data toolbar/custom dataset/clone readiness, and legacy tab migration. The MJS verifiers for CBD parameter cost effect, shared NumericInput, and Master Data UI state passed. `git diff --check` passed before the implementation commit.
- **Browser — isolated local Vite origin:** At 1920×920, 1440×900, and 1366×768, document/body dimensions matched the viewport and `main` dimensions matched its scroll dimensions. At 1366×768, Graph measured about 873×428px; Result 437×237px; Economic 437×183px; BOM and RTG were each 655px wide and 238px tall. BOM/RTG scroll bodies had matching client/scroll widths (653px) and computed vertical `overflow-y:auto`. At 1920×920 and 1440×900, BOM and RTG panel widths also matched (692px); both table bodies had no horizontal overflow. At 900×900 and 390×844, panels stacked, the main area allowed natural vertical scrolling, and document width matched viewport width. Clone from and Send to menus both closed after clicking blank workspace; Result/Economic remained present and local selection indicators remained unchanged. Browser console had no errors.
- **Browser limitation:** The isolated app had an empty dataset. Therefore populated long-table internal scrolling, actual row selector/expansion clicks, ruler motion with real bars, and Reset against populated data were not visually exercised in the browser. The matching state/render verifiers cover selection guards, selected-first order, Reset/re-clone baselines, graph labels/layer order, and result colors. Press-and-hold repetition was source-checked but not manually verified in this browser run.

## Delivery Status

The implementation commit is `d0cd515e06d66f23d9052e0a23f2e237bb6795a6`. The documentation handoff follow-up and push are completed on `codex/cbd-candidate-integration`; final local and remote branch heads were checked to match after delivery. No branch switch, reset, force push, merge, package/dependency change, or change to the unrelated audit file was made.
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
