# Current Handoff — CBD Final Regression Recovery / UX Closure

**Updated:** 2026-10-15

**Repository:** `apirak-k/COSTBREAKDOWN`

**Worktree / branch:** `.worktrees/CBD-CANDIDATE-INTEGRATION` / `codex/cbd-candidate-integration`

**Starting baseline:** `d2654b58f0495a1f40f71de89a002fc3d2d8c1fc`; fetched `origin/codex/cbd-candidate-integration` matched before implementation.

**Implementation commit:** `c0079c4` (`fix(cbd): restore finalized Cost Breakdown workspace`).

## Current Product Flow

The visible product remains exactly three top-level pages: Master Data → Cost Breakdown → Simulation. Candidate/finding analysis and Selected Comparison remain inside Cost Breakdown. Simulation has no CBD selection handoff or shared selected state.

## CBD Closure

- The page remains **Cost Breakdown**; its upper summary table is named **Cost Element**.
- On desktop, the CBD Subheader and equal-height, bounded Cost Element / Work Center panels stay within the shell. Candidate Findings owns the remaining vertical scroll. Work Center rows scroll inside its panel while the table header and Total remain visible on the same aligned grid.
- Selected Comparison remains a temporary CBD-local analysis scope. The summary uses a fixed aligned `GAP | Selected` pair; Selected values are direct signed numbers in neutral secondary styling, without parentheses or red/green semantics.
- Candidate columns retain the recent compact Status / readable parameter balance. Reference → Current pairs remain on one line where the panel can reasonably fit them. Drag affordance follows the Master Data GripVertical pattern, while reorder remains temporary presentation order and reapplying Sort restores sorted order.
- Narrow screens stack the summary and use natural page scrolling. Candidate BOM/RTG tables may scroll horizontally within their own wrappers when their readable column tracks do not fit.
- CBD formulas, source snapshots, status/filter/sort semantics, selected-finding lifecycle, and Candidate calculations were not changed. No Simulation implementation or Master Data business logic changed.

## Documentation and Verification

- `docs/specs/COST_BREAKDOWN.md`, `docs/specs/CROSS_CUTTING.md`, and `design.md` now describe the bounded desktop CBD layout and neutral Selected presentation.
- `scripts/verify_cbd_summary_ux.ts` now requires Cost Element naming, stable Selected slots, bounded equal-height summaries, Work Center body scrolling, and Candidate-owned desktop scrolling. `scripts/verify_cbd_parameter_cost_effect.mjs` retains calculation coverage and expects the responsive local table-scroll fallback.
- `npm.cmd run build`, the CBD summary / parameter effect / view / sort / Candidate / Selected boundary and lifecycle verifiers, Master Data UI state and row-drag verifiers, and `git diff --check` passed. Build emitted the existing ExcelJS browser externalization warnings for `fs`, `crypto`, and `@fast-csv`.
- Populated local browser fixture: 16 Candidate findings, multiple BOM/Routing rows, and five Work Centers. At 1920×920, 1440×900, and 1366×768, document and Main scroll heights matched their viewport/workspace; Cost Element and Work Center each measured 176px high, and WC body measured 174px client / 197px scroll. Candidate region independently overflowed (886px content at 1366×768, 886px at 1440×900, and 886px at 1920×920 with current detail state). Scrolling Candidate left Subheader/summary/Footer in place; scrolling WC changed only its own scroll position and kept header/Total visible. Sparse and populated WC fixtures both kept the summary panels at equal height.
- At 900×900 and 390×844, panels stacked and Main allowed natural vertical scrolling. Candidate tables used local 1040px BOM / 1260px Routing presentation tracks to preserve legibility. A horizontal scroll attempt at the page stayed at `scrollX=0`; local table/toolbar scrolling remains available. The raw document `scrollWidth` includes nested responsive scrollport extents and is not used as the page-scroll owner measurement.
- Browser interactions verified Selected on/off alignment and neutral display, hidden selection retained across filters, whole-row Candidate details and outside-click dismissal, drag reorder and Sort restoration, unchanged Master Data BOM order after CBD reorder, and overview collapse/expand. No production fixture or source data was changed.

## Delivery Status

The implementation commit is `c0079c4`; this handoff follow-up records its populated-browser verification and corrected current status. Delivery target is `origin/codex/cbd-candidate-integration`. The unrelated untracked `tasks/master-data-cbd-final-audit.md` remains untouched and excluded. No branch switch, reset, merge, package/dependency change, or formula change was made.
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
