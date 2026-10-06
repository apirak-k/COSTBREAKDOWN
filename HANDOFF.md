# Current Handoff — Spec-Aligned Product Implementation

**Updated:** 2026-10-06

## Active checkpoint

- Repository: E:\COSTBREAKDOWN.
- Working branch: codex/costbreakdown-spec-source.
- Remote target: origin/codex/costbreakdown-spec-source. This documentation-migration task explicitly prohibits pushing; create only its authorized local documentation commit. Do not merge to main.
- The design reference branch feature/taste-frontend-ui remains read-only. The current branch owns all implementation and design.md.
- This run’s local planning notes are in the untracked .planning/2026-10-06-cbd-autonomous-implementation/ folder; the active-plan pointer was restored and the notes are excluded from product commits.
- The eight pre-existing synthetic verification files remain untracked and untouched: .make-synthetic-verification.mjs, .synthetic-current.xlsx, .synthetic-mismatch.xlsx, .synthetic-reference.xlsx, .verify-cost-calc-sample.mjs, .verify-duplicate-calc.mjs, .verify-neutral-workbook-via-vite.mjs, and .verify-sizing-via-vite.mjs.

## Requirement and design contract

- `docs/specs/FINAL_LOGIC_SPEC.md` is the latest authority for product logic and behavior only. Compatible finalized UX/UI, layout, wording, keyboard, editing, navigation, workbook, and other requirements remain valid; older documents are superseded only on conflicting logic. Code and this handoff are implementation evidence/status, not requirements authority.
- Follow docs/REQUIREMENTS_INDEX.md, then canonical specs, then compatible finalized agreement/history detail. Source-crosswalk-80.md is traceability/status only; this file is a work checkpoint only.
- design.md was created using the HAWS DESIGN.md template. It extracts visual language from feature/taste-frontend-ui at f873540a6fa2bd1564c070a1164f457857762752 without importing its product behavior.
- docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md records reversible AI choices separately from user decisions. P-009 records the compact, full-width table work surface.
- Candidate monetary values remain at material-record level. THB is the cost unit; changed Price/Usage/Loss values remain explanatory Ref → Current details. No conversion or per-factor THB allocation was added.
- At the prior implementation checkpoint, the Dashboard used settled engineering calculations and left then-unresolved business metrics unavailable; MatVAR/LBVAR/BDVAR remain out of scope. Final Logic now requires Selling Price/SG&A/OP calculations and the specified scenario/result graphs; the prior snapshot composition does not establish conformance to them.

## Implementation logic audit — documentation migration only

The 2026-10-06 static audit found that the current application still conflicts with Final Logic in these areas: Work Center rather than Process/Routing as the processing Candidate; Selected Scope continuing into RCA/Simulation and constraining the baseline; three scenarios rather than exactly A/B; improvement economics composition; finalized Selling Price/SG&A/OP calculation; and Scenario A/B plus Reference → Current → Simulated graph behavior. Application code was intentionally not changed. The implementation evidence below records prior behavior/checkpoints and must not be read as the current product contract.

## Implementation evidence from prior checkpoints

- Master Data opens on All Tables in BOM → Work Centers → Routing order and restores selected side, View/Edit mode, and table view during same-session navigation using transient application state.
- Removed CB, Product Cost Analysis, and bottom-left Workspace chrome while retaining useful totals/status.
- Master Data Undo/Redo now covers Working edits across the page and all tables. Spreadsheet paste and selected-row bulk operations are batched into one history action.
- Clone now copies the opposite Working dataset without a source-readiness gate and recalculates destination readiness from the copied content. P-010 records the reversible content-detection criterion; Clone never changes Last Saved.
- Candidate material rows show record-level cost Gap separately from changed input details.
- The prior Dashboard implementation followed the 2026-10-06 visual reference with a left-side stacked Standard Cost chart and Selling Price line, comparing Reference vs Current with Material/Labor/Burden. P-011 records that snapshot adaptation as visual implementation evidence; it does not satisfy the finalized Scenario A/B monetary comparison or Reference → Current → Simulated story. No monthly history was fabricated.
- The development-only review mock at that checkpoint offered complete-comparison and data-quality pairs in a dedicated session. Its earlier Selected Comparison return behavior is implementation evidence only; current lifecycle is in `FINAL_LOGIC_SPEC.md`. See `docs/testing/REVIEW_FIXTURES.md` for the updated review flow.
- Applied the compact full-width design direction: tighter page spacing, 36px target data rows, 32px edit controls, and table-local horizontal scrolling.
- Updated five stale verifier fixtures to current schema and identity contracts.
- Updated compatible lockfile patches for brace-expansion and source-map-js; no breaking dependency upgrades were applied.

## Verification

- Before the Clone-readiness follow-up, all 47 scripts/verify*.ts and scripts/verify*.mjs verifiers passed after the final implementation and lockfile patch.
- After the Clone readiness clarification, `npx jiti scripts/verify_master_data_clone_readiness.ts` passed all four focused cases, and `npm run build` passed. The focused check verifies the shared readiness helper; it does not exercise the React Clone actions interactively.
- A further 10 Master Data lifecycle/import/Sizing/workbook/Clone TypeScript verifiers plus the UI-state MJS verifier passed using `node node_modules/.cache/codex-cbd-verifiers-20261006-final/run-ts.cjs` (MJS used Node directly). Running the ExcelJS-dependent Sizing/Clone verifier with `npx jiti` failed because its lazy ExcelJS import resolved without `Workbook`; the same verifier passed with the repository CJS shim, so this was a runner incompatibility, not a product failure.
- Re-ran 10 focused Master Data verifiers on the current documentation checkpoint: selected-side import replacement/opposite-side isolation, export/workbook round-trip, Sizing, Clone, Clear, and UI-state model checks all passed. This verifies model/service paths; actual browser file selection/download and full interaction replay remain unverified and are still open in the crosswalk.
- Re-ran `verify_workflow_status.ts` and eight Candidate/RCA/Simulation verifiers at the prior checkpoint; all passed for the then-current behavior. The shared Selected Comparison banner was wired into Candidate, Dashboard, and RCA/Simulation, which conflicts with the finalized scope ending at RCA entry. Those checks do not verify the new lifecycle. `npm run build` passed. Rendered browser interaction and human visual acceptance remain unverified.
- After expanding the synthetic review fixtures, `npx jiti scripts/verify_synthetic_review_fixture.ts` passed for complete status/input coverage, non-1:1 Work Center aggregation, reconciliation, missing/ambiguous data, and clean fixture-session reset. `npm run build` passed with the existing ExcelJS `fs`/`crypto` externalization warnings.
- For the dashboard chart slice, `node scripts/verify_cost_breakdown_review_feedback.mjs`, `npm run build`, and `git diff --check` passed. The verifier covers chart rendering, available Reference/Current values, omitted out-of-scope variance series, and an unavailable-cost state. Browser visual inspection could not load localhost (`ERR_BLOCKED_BY_CLIENT`); no visual acceptance is claimed.
- At the prior checkpoint, the Dashboard led with net Standard Cost and Material/Processing movement, then a Reference/Current chart, cause breakdown, and details. OP was labeled uncalculated because the formula was treated as pending; this is a known implementation conflict since Final Logic now defines the formula and requires negative OP to remain visible. The prior SSR verifier covers only that earlier output; it passed with `npm run build` and `git diff --check`. Browser visual acceptance remains unverified.
- On 2026-10-06, reran every current `scripts/verify*.ts` and `scripts/verify*.mjs` verifier using the repository CJS shim for TypeScript and Node for MJS: 48/48 passed. `git diff --check` passed and the local branch tip matched `origin/codex/costbreakdown-spec-source`.
- After Final Logic reconciliation, the 80-topic crosswalk records 53 PASS, 13 PARTIAL, 2 OPEN, 5 FAIL, 2 DEFERRED, 4 RECORDED, and 1 OUT OF SCOPE. PASS means evidence at the cited checkpoint; it does not mean a check was rerun in this documentation task or received human acceptance.
- npm run build passed: TypeScript and Vite production build; 2,036 modules transformed after the dashboard chart slice. Vite still reports ExcelJS browser externalization warnings for Node fs/crypto.
- git diff --check passed. The repository has no npm lint or generic test script.
- npm audit was run. A non-breaking npm audit fix removed the compatible findings; 5 high and 4 moderate transitive advisories remain around Tailwind/ExcelJS. The suggested force update crosses major versions and was not applied.
- Browser visual inspection and human visual acceptance remain unverified because local browser inspection is blocked by environment policy. No visual acceptance is claimed.

## Genuine pending product decisions

Three Master Data items remain open in docs/specs/MASTER_DATA.md and must not be resolved from existing implementation code:

1. Whether Import preserves the target side’s configured Sizing counts, resets them, or recalculates them.
2. Whether untouched generated blank Sizing rows contribute to general dataset readiness, cost calculation, or comparison. Clone readiness is separately settled; its reversible detection choice is P-010.
3. Whether an intentionally blank user-created row must survive Excel export/import round-trip; no agreed marker or policy distinguishes it from a blank template row.

Final Logic now finalizes Selling Price overrides, SG&A%, SG&A amount, and OP formulas. The current implementation still calls OP uncalculated; that is a known logic gap, not a pending product decision. Other concepts such as COGS, GP, GP Margin, OP Margin, Sales, and Volume/Quantity remain unfinalized where listed in `docs/specs/CROSS_CUTTING.md`; the old formula candidates are discussion only. Trial execution, validation, approval, and promotion also remain unspecified. The user-supplied chart shows monthly periods, but the current product has only Reference/Current snapshots and no historical monthly data source; do not fabricate monthly periods.

A 2026-10-06 readback from “CBD Refactor #1” confirmed that it supplied no new finalized behavior: business formulas, Import/Sizing policy, blank-row round-trip, Trial lifecycle, and hidden ProductSession architecture remain unresolved; it found no decision there on monthly source/period/AVG or generated blank-row calculation semantics. The existing rule that relevant source changes invalidate stale Selected Comparison remains in force. Whether editing a non-selected hidden ProductSession must invalidate active Candidate/Scenario/Trial state remains unresolved and is tracked as DEFERRED in source-crosswalk item 4.

These are genuine product boundaries, not blockers for independent implementation. Do not infer their behavior from code or the historical September sizing proposal; escalate only when a concrete implementation depends on them.

## Next step

The documentation-migration commit is the end of this task. Wait for user review before beginning runtime implementation. For later work, use `docs/specs/FINAL_LOGIC_SPEC.md` as the logic checklist; retain compatible Master Data UX/UI and interaction requirements, and keep browser interaction and human visual acceptance separate from static or automated evidence.
