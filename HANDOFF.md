# Current Handoff — Spec-Aligned Product Implementation

**Updated:** 2026-10-06

## Active checkpoint

- Repository: E:\COSTBREAKDOWN.
- Working branch: codex/costbreakdown-spec-source.
- Remote target: origin/codex/costbreakdown-spec-source. The user authorized pushing this completed checkpoint. Do not merge to main.
- The design reference branch feature/taste-frontend-ui remains read-only. The current branch owns all implementation and design.md.
- This run’s local planning notes are in the untracked .planning/2026-10-06-cbd-autonomous-implementation/ folder; the active-plan pointer was restored and the notes are excluded from product commits.
- The eight pre-existing synthetic verification files remain untracked and untouched: .make-synthetic-verification.mjs, .synthetic-current.xlsx, .synthetic-mismatch.xlsx, .synthetic-reference.xlsx, .verify-cost-calc-sample.mjs, .verify-duplicate-calc.mjs, .verify-neutral-workbook-via-vite.mjs, and .verify-sizing-via-vite.mjs.

## Requirement and design contract

- Follow docs/REQUIREMENTS_INDEX.md, then canonical specs, then compatible finalized agreement/history detail. Source-crosswalk-80.md is traceability/status only; this file is a work checkpoint only.
- design.md was created using the HAWS DESIGN.md template. It extracts visual language from feature/taste-frontend-ui at f873540a6fa2bd1564c070a1164f457857762752 without importing its product behavior.
- docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md records reversible AI choices separately from user decisions. P-009 records the compact, full-width table work surface.
- Candidate monetary values remain at material-record level. THB is the cost unit; changed Price/Usage/Loss values remain explanatory Ref → Current details. No conversion or per-factor THB allocation was added.
- The Dashboard uses settled engineering calculations. Unresolved business metrics remain explicitly unavailable; MatVAR/LBVAR/BDVAR remain out of scope.

## Implemented

- Master Data opens on All Tables in BOM → Work Centers → Routing order and restores selected side, View/Edit mode, and table view during same-session navigation using transient application state.
- Removed CB, Product Cost Analysis, and bottom-left Workspace chrome while retaining useful totals/status.
- Master Data Undo/Redo now covers Working edits across the page and all tables. Spreadsheet paste and selected-row bulk operations are batched into one history action.
- Clone now copies the opposite Working dataset without a source-readiness gate and recalculates destination readiness from the copied content. P-010 records the reversible content-detection criterion; Clone never changes Last Saved.
- Candidate material rows show record-level cost Gap separately from changed input details.
- Dashboard now follows the 2026-10-06 user reference with a left-side stacked Standard Cost chart and Selling Price line. The current implementation compares Reference vs Current using Material/Labor/Burden; P-011 records this reversible adaptation. It does not fabricate monthly history or business metrics.
- Applied the compact full-width design direction: tighter page spacing, 36px target data rows, 32px edit controls, and table-local horizontal scrolling.
- Updated five stale verifier fixtures to current schema and identity contracts.
- Updated compatible lockfile patches for brace-expansion and source-map-js; no breaking dependency upgrades were applied.

## Verification

- Before the Clone-readiness follow-up, all 47 scripts/verify*.ts and scripts/verify*.mjs verifiers passed after the final implementation and lockfile patch.
- After the Clone readiness clarification, `npx jiti scripts/verify_master_data_clone_readiness.ts` passed all four focused cases, and `npm run build` passed. The focused check verifies the shared readiness helper; it does not exercise the React Clone actions interactively.
- A further 10 Master Data lifecycle/import/Sizing/workbook/Clone TypeScript verifiers plus the UI-state MJS verifier passed using `node node_modules/.cache/codex-cbd-verifiers-20261006-final/run-ts.cjs` (MJS used Node directly). Running the ExcelJS-dependent Sizing/Clone verifier with `npx jiti` failed because its lazy ExcelJS import resolved without `Workbook`; the same verifier passed with the repository CJS shim, so this was a runner incompatibility, not a product failure.
- Re-ran 10 focused Master Data verifiers on the current documentation checkpoint: selected-side import replacement/opposite-side isolation, export/workbook round-trip, Sizing, Clone, Clear, and UI-state model checks all passed. This verifies model/service paths; actual browser file selection/download and full interaction replay remain unverified and are still open in the crosswalk.
- Re-ran `verify_workflow_status.ts` and eight Candidate/RCA/Simulation verifiers on the current branch; all passed. The shared Selected Comparison banner is wired into Candidate, Dashboard, and RCA/Simulation. `npm run build` passed. Rendered browser interaction and human visual acceptance remain unverified.
- For the dashboard chart slice, `node scripts/verify_cost_breakdown_review_feedback.mjs`, `npm run build`, and `git diff --check` passed. The verifier covers chart rendering, available Reference/Current values, omitted out-of-scope variance series, and an unavailable-cost state. Browser visual inspection could not load localhost (`ERR_BLOCKED_BY_CLIENT`); no visual acceptance is claimed.
- The 80-topic crosswalk currently records 59 PASS, 12 OPEN/PARTIAL, 4 DEFERRED, 4 RECORDED, and 1 OUT OF SCOPE. PASS means evidence at the cited checkpoint; it does not mean all 59 checks were rerun in this audit or received human acceptance.
- npm run build passed: TypeScript and Vite production build; 2,036 modules transformed after the dashboard chart slice. Vite still reports ExcelJS browser externalization warnings for Node fs/crypto.
- git diff --check passed. The repository has no npm lint or generic test script.
- npm audit was run. A non-breaking npm audit fix removed the compatible findings; 5 high and 4 moderate transitive advisories remain around Tailwind/ExcelJS. The suggested force update crosses major versions and was not applied.
- Browser visual inspection and human visual acceptance remain unverified because local browser inspection is blocked by environment policy. No visual acceptance is claimed.

## Genuine pending product decisions

Three Master Data items remain open in docs/specs/MASTER_DATA.md and must not be resolved from existing implementation code:

1. Whether Import preserves the target side’s configured Sizing counts, resets them, or recalculates them.
2. Whether untouched generated blank Sizing rows contribute to general dataset readiness, cost calculation, or comparison. Clone readiness is separately settled; its reversible detection choice is P-010.
3. Whether an intentionally blank user-created row must survive Excel export/import round-trip; no agreed marker or policy distinguishes it from a blank template row.

The confirmed business concepts still lack approved formulas for COGS, GP, GP Margin, OP, OP Margin, Sales, and Volume/Quantity. The equations that were proposed/discussed are now recorded as not finalized in `docs/specs/CROSS_CUTTING.md` and review-context §81; they are not implementation requirements. Trial execution, validation, approval, and promotion also remain unspecified. The user-supplied chart shows monthly periods, but the current product has only Reference/Current snapshots and no historical monthly data source; the implemented chart is therefore a snapshot comparison, not a trend. The engineering-first dashboard continues to provide useful settled outputs without fabricating these values.

These are genuine product boundaries, not blockers for independent implementation. Do not infer their behavior from code or the historical September sizing proposal; escalate only when a concrete implementation depends on them.

## Next step

Continue implementation from the finalized canonical specs. The dashboard chart direction is recorded and implemented for current snapshots. If a monthly trend is required, first establish its source and period semantics from existing requirement discussions; do not ask the user to reconstruct them or fabricate history. If Import/Sizing preservation, generated-row calculation behavior, or blank user-row round-trip becomes necessary, bring that narrow question to “CBD Refactor #1”; Clone readiness no longer needs escalation. Keep browser visual acceptance separate from automated verification.
