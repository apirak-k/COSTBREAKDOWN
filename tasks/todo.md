# Implementation Tasks — Current Cost Breakdown Agreement

Tasks are ordered by dependency. Keep each implementation slice focused and leave the application buildable before moving to the next task.

## Phase 1 — Temporary Reference/Current Workspace

### Task 1: Initialize empty Reference and Current Working Datasets

**Description:** Replace the seeded first-use data with two empty, independent Working Datasets stored only for the browser session.

**Acceptance criteria:**
- [x] A fresh browser session opens with empty Reference and Current sides; reset returns to that state.
- [x] Editing/copying either side cannot mutate the other; working data is cleared when the browser session ends.

**Verification:** Add/update a focused workspace verifier; confirm its runner before use. Check reset/session behavior in a browser and run `npm run build` at the phase checkpoint.

**Dependencies:** None.

**Files likely touched:** `src/state/store.tsx`, `src/state/seed-data.ts`, `src/services/storage/session-storage.ts`, focused `scripts/verify_*.ts`.

**Estimated scope:** Medium.

### Task 2: Remove lifecycle gating from direct Working Dataset editing

**Description:** Make both sides directly editable and remove Draft/Active/Archived and clone/activate requirements from the active Master Data workflow.

**Acceptance criteria:**
- [x] Product, Work Center, BOM, and Routing data can be added, edited, and deleted on either side without a version status gate.
- [x] Reference → Current creates an independent copy that can be edited without changing Reference.
- [x] No Product setup, save, or activation step is required before working on either side.

**Verification:** Extend focused Master Data checks for CRUD, side switching, and copy independence; manually inspect both sides.

**Dependencies:** Task 1.

**Files likely touched:** `src/features/master-data/MasterDataPage.tsx`, `src/features/master-data/components/DatasetRoleSelector.tsx`, `src/features/master-data/components/ProductMasterCard.tsx`, `src/state/store.tsx`, `src/core/types/product.types.ts`.

**Estimated scope:** Medium.

### Task 3: Replace the selected side on import and preserve post-import editing

**Description:** Make Excel import replace only the selected Working Dataset, without merging, and keep the imported side editable through the same model as manual input.

**Acceptance criteria:**
- [x] Import replaces all data on the selected side and leaves the opposite side unchanged.
- [x] Imported data can be edited, added to, and deleted from after import.
- [x] Copy Reference → Current continues to produce independent data.

**Verification:** Use a synthetic workbook plus pre-existing manual values to check replacement/no-merge and opposite-side preservation.

**Dependencies:** Tasks 1–2.

**Files likely touched:** `src/state/store.tsx`, `src/features/master-data/components/ExcelImportPanel.tsx`, `src/services/excel/snapshot-parser.ts`, focused `scripts/verify_*.ts`.

**Estimated scope:** Medium.

### Task 4: Make Product mismatch a non-blocking warning

**Description:** Remove the single Header Product import/comparison gate and allow Reference/Current comparison to proceed when their product identities differ.

**Acceptance criteria:**
- [x] A mismatch displays a warning and does not reject the import or disable comparison.
- [x] Missing or invalid required calculation inputs remain warnings and are not converted to zero.

**Verification:** Check matching and mismatching Product Code/Name fixtures through import and comparison readiness.

**Dependencies:** Tasks 1–3.

**Files likely touched:** `src/services/excel/snapshot-parser.ts`, `src/shared/ui/ExcelUploadDropzone.tsx`, `src/core/calculations/master-data-handoff.ts`, `src/features/master-data/MasterDataPage.tsx`, focused `scripts/verify_*.ts`.

**Estimated scope:** Medium.

### Task 5: Export either side's latest Working Dataset

**Description:** Add optional export for Reference and Current separately, using the same normalized model as import and comparison.

**Acceptance criteria:**
- [x] Each side can be exported independently after manual edits or import.
- [x] Export includes the latest additions, edits, and deletions and can restore that side through import.
- [x] Template download remains available using the shared data model.

**Verification:** Verify Reference and Current export/import round trips with independent synthetic datasets; run the build.

**Dependencies:** Tasks 1–4.

**Files likely touched:** `src/features/master-data/components/ExcelImportPanel.tsx`, new `src/services/excel/snapshot-export.ts`, `src/services/excel/index.ts`, focused `scripts/verify_*.ts`.

**Estimated scope:** Medium.

### Checkpoint: Master Data

- [x] Fresh session, edit, copy, replacement import, mismatch warning, compare, and export/re-import work in a browser.
- [x] Focused verification and `npm run build` pass; results are recorded before Comparison work begins.

## Phase 2 — Comparison Findings and Reconciliation

### Task 6: Validate business identity and standardize four comparison statuses

**Description:** Match rows by stable business identity, separate invalid matching from status, and use exactly `UNCHANGED`, `CHANGED`, `ADDED`, and `REMOVED`.

**Acceptance criteria:**
- [x] Reordering rows or changing Routing sequence never creates a false match.
- [x] Missing/duplicate/invalid keys produce validation warnings without guessed matches or extra comparison statuses.
- [x] Field differences such as price, yield, capacity, sequence, and Work Center remain details under `CHANGED`.

**Verification:** Check unchanged/changed/added/removed, row reorder, sequence change, duplicate key, and missing key fixtures.

**Dependencies:** Master Data checkpoint.

**Files likely touched:** `src/core/types/snapshot.types.ts`, `src/services/excel/snapshot-parser.ts`, `src/core/calculations/snapshot-comparison.ts`, `src/core/calculations/comparison-status.ts`, focused `scripts/verify_*.ts`.

**Estimated scope:** Medium.

### Task 7: Calculate record-level effects with absent-side zero

**Description:** Calculate signed BOM and Routing record effects from Reference and Current while distinguishing a missing record from missing required values.

**Acceptance criteria:**
- [x] Added records calculate `0 → Current`; removed records calculate `Reference → 0`.
- [x] Missing required Price, Usage, Yield, Capacity, Manning, or Rate remains unavailable with a data-quality warning.
- [x] Record effect uses `Current - Reference` consistently.

**Verification:** Check changed/added/removed BOM and Routing fixtures plus each required-input warning case.

**Dependencies:** Task 6.

**Files likely touched:** `src/core/calculations/snapshot-bom-detail.ts`, `src/core/calculations/snapshot-routing-detail.ts`, `src/core/calculations/snapshot-comparison.ts`, `src/core/types/snapshot.types.ts`, focused `scripts/verify_*.ts`.

**Estimated scope:** Medium.

### Task 8: Return explicit reconciliation results from Comparison

**Description:** Aggregate detailed record effects into Material, Labor, Burden, and Total gaps and report any mismatch as a calculation/validation issue.

**Acceptance criteria:**
- [x] Each comparable record effect is part of the Comparison result.
- [x] Branch totals and `Material + Labor + Burden = Total` reconcile, or return an explicit issue.
- [x] UI/export consumers do not independently invent record cost gaps.

**Verification:** Assert row-to-branch and branch-to-total equality on mixed changed/added/removed fixtures, including invalid-input cases.

**Dependencies:** Task 7.

**Files likely touched:** `src/core/types/snapshot.types.ts`, `src/core/calculations/snapshot-comparison.ts`, new/updated reconciliation calculation, focused `scripts/verify_*.ts`.

**Estimated scope:** Medium.

### Task 9: Render Comparison details from the shared result

**Description:** Update Cost Breakdown tables to render field changes, four statuses, record costs, and reconciliation from the Comparison result.

**Acceptance criteria:**
- [x] Default view includes unchanged records and shows summary-to-record detail.
- [x] Added/removed rows display their zero-side contributions and signed cost effects.
- [x] Table totals agree with the Comparison result; missing required values remain visibly unavailable.

**Verification:** Compare table rows and footers against the calculation fixtures from Tasks 7–8.

**Dependencies:** Task 8.

**Files likely touched:** `src/features/cost-breakdown/CostBreakdownPage.tsx`, `src/features/cost-breakdown/components/BOMDetailedTable.tsx`, `src/features/cost-breakdown/components/RoutingDetailedTable.tsx`, `src/features/cost-breakdown/components/WorkCenterComparisonTable.tsx`, focused `scripts/verify_*.ts`.

**Estimated scope:** Medium.

### Task 10: Add status filters and align comparison export

**Description:** Replace All/Changed-only filtering with the agreed status filters and export the same statuses and reconciled cost effects as the page.

**Acceptance criteria:**
- [x] All, Changed, Added, Removed, and Unchanged filters return the expected records; combinations can show all changed records together.
- [x] Export status labels/counts use only the four contract statuses; validation warnings remain separate.
- [x] Exported record effects reconcile to exported branch/total gaps.

**Verification:** Check filter membership and workbook output against the same fixture results; run `npm run build`.

**Dependencies:** Task 9.

**Files likely touched:** `src/features/cost-breakdown/CostBreakdownPage.tsx`, `src/features/cost-breakdown/components/comparison-view.ts`, `src/services/excel/comparison-export.ts`, focused `scripts/verify_snapshot_comparison_view.ts`.

**Estimated scope:** Medium.

### Checkpoint: Comparison

- [x] Identity, statuses, detail effects, filters, export, and reconciliation agree on the same synthetic cases.
- [x] Focused checks and `npm run build` pass before candidate work begins.

## Phase 3 — Candidate Prioritization

### Task 11: Build material candidates from Comparison findings

**Description:** Convert meaningful material findings into factor-level candidates without collapsing unrelated changes.

**Acceptance criteria:**
- [x] Price, Loss, and supported Usage/Consumption changes can appear as separate factor candidates.
- [x] Added and Removed material findings retain their structural status and Reference/Current costs.
- [x] Unchanged material rows do not become candidates.

**Verification:** Check separate-factor and structural material fixtures, including a structurally changed candidate with zero net gap.

**Dependencies:** Comparison checkpoint.

**Files likely touched:** new `src/core/calculations/material-candidates.ts`, `src/core/types/cost.types.ts`, `src/core/index.ts`, focused `scripts/verify_*.ts`.

**Estimated scope:** Medium.

### Task 12: Aggregate processing candidates by Work Center

**Description:** Aggregate Routing cost effects by Work Center on each side and derive processing candidates without one-to-one Routing matching.

**Acceptance criteria:**
- [x] Reference and Current processing costs aggregate by Work Center and use `Current - Reference`.
- [x] Different Routing structures can still produce one Work Center candidate with operation detail.
- [x] Candidate identity does not require new Routing IDs or split/merge mappings.

**Verification:** Check one-to-many and many-to-one Routing fixtures whose Work Center totals reconcile.

**Dependencies:** Task 11.

**Files likely touched:** new `src/core/calculations/processing-candidates.ts`, `src/core/types/cost.types.ts`, `src/core/calculations/snapshot-comparison.ts`, focused `scripts/verify_*.ts`.

**Estimated scope:** Medium.

### Task 13: Simplify Candidate Prioritization to ranking and controllability

**Description:** Feed the page from Comparison-derived candidates, show agreed fields, and remove RCA/action responsibilities.

**Acceptance criteria:**
- [x] Each row shows Candidate, `CHANGED/ADDED/REMOVED`, Reference, Current, Gap, and Controllable.
- [x] Controllable starts explicitly `true`; unchecking never removes/hides a candidate; zero/negative gaps remain visible and Gap sorts descending by default.
- [x] Only status filtering remains; no RCA selection, Action, Root Cause, Requirement Fit, or Feasibility controls appear here.

**Verification:** Check default state, status filtering, ranking, candidate visibility, and absence of RCA controls in a browser.

**Dependencies:** Tasks 11–12.

**Files likely touched:** `src/state/store.tsx`, `src/features/candidate-selection/CandidateSelectionPage.tsx`, `src/features/candidate-selection/components/DriverRow.tsx`, `src/features/candidate-selection/components/DriversTable.tsx`, `src/features/candidate-selection/ranking-view.ts`.

**Estimated scope:** Medium.

### Checkpoint: Candidate Prioritization

- [x] Material and Work Center candidates trace back to Comparison, preserve status/gap meaning, and rank/filter as agreed.
- [x] Focused checks and `npm run build` pass before RCA work begins.

## Phase 4 — RCA & Simulation

### Task 14: Select candidates and edit optional notes on the RCA page

**Description:** Move candidate selection and Root Cause/Action notes to RCA & Simulation; permit selection from the full Candidate pool.

**Acceptance criteria:**
- [x] The user can choose any candidate on the RCA page without preselecting it on Candidate Prioritization.
- [x] No candidate is auto-selected by rank; Root Cause and Action are optional descriptive notes.
- [x] Notes do not feed numeric calculations.

**Verification:** Check an unselected candidate, blank notes, saved notes, and formula results with/without note text.

**Implementation evidence:** `verify_rca_candidate_notes` passed 8 checks; `verify_simulation_context` and six related regression verifiers passed; `npm run build` passed. At Task 14 close, browser and human review remained pending; Task 18 later covered the core browser flow, with human acceptance still pending.

**Dependencies:** Candidate checkpoint.

**Files likely touched:** `src/features/rca-simulation/RCASimulationPage.tsx`, `src/features/rca-simulation/components/DriverSelector.tsx`, `src/features/rca-simulation/components/ProblemStatementCard.tsx`, `src/features/candidate-selection/components/RcaDetailPanel.tsx`, `src/state/store.tsx`.

**Estimated scope:** Medium.

### Task 15: Recalculate scenario overrides with the Standard Cost engine

**Description:** Build independent A/B/C drafts from Current and calculate each scenario's per-piece Material + Labor + Burden through the shared cost logic.

**Acceptance criteria:**
- [x] Supported measurable overrides include the verified input fields, including Usage/Consumption where supported by the engine.
- [x] Each scenario starts from Current, is isolated from the other scenarios, and does not mutate Current.
- [x] Structural add/remove/split/merge changes are not simulated.

**Verification:** `verify_scenario_cost_overrides`, `verify_scenario_input_mapping`, `verify_scenario_draft`, `verify_missing_work_center_rate`, and `verify_rca_candidate_notes` passed; `npm run build` and `npm run excel` passed. Browser interaction was verified in Task 18; human acceptance remains pending.

**Dependencies:** Task 14.

**Files likely touched:** `src/core/calculations/whatif-simulator.ts`, `src/core/calculations/snapshot-cost.ts`, `src/features/rca-simulation/scenario-draft.ts`, `src/core/types/snapshot.types.ts`, focused `scripts/verify_*.ts`.

**Estimated scope:** Medium.

### Task 16: Separate Standard Cost from improvement economics

**Description:** Show Current and Scenario Standard Cost plus Gross Saving separately from fixed investment, variable added cost, volume, and net benefit.

**Acceptance criteria:**
- [x] Gross Saving per piece equals Current Standard Cost minus Scenario Standard Cost.
- [x] Fixed and variable improvement costs affect economics only, not either Standard Cost result.
- [x] Scenario A/B/C results remain comparable without auto-selecting a recommended solution.

**Verification:** `verify_scenario_variables` passed formula, missing-input, zero-volume, scenario-isolation, and displayed-metric checks; Task 15 focused verifiers passed; `npm run build` and `npm run excel` passed.

**Dependencies:** Task 15.

**Files likely touched:** `src/core/calculations/whatif-simulator.ts`, `src/core/calculations/scenario-variables.ts`, `src/features/rca-simulation/components/ScenarioCard.tsx`, `src/features/rca-simulation/components/SimulationGrid.tsx`, focused `scripts/verify_*.ts`.

**Estimated scope:** Medium.

### Task 17: End RCA at the human-selected Trial handoff

**Description:** Remove embedded Trial validation and baseline promotion; leave an explicit human-selected scenario handoff only.

**Acceptance criteria:**
- [x] A person chooses which scenario proceeds; the UI does not preselect one as the answer.
- [x] Measured actual cost, Trial validation, and baseline promotion are absent until a separate agreement defines them.
- [x] Deferred financial parameters remain out of the RCA & Simulation flow.

**Verification:** `verify_rca_handoff` passed; `npm run build` passed. Caller search confirmed the baseline-promotion action had no consumer beyond the deleted Trial card.

**Dependencies:** Task 16.

**Files likely touched:** `src/features/rca-simulation/RCASimulationPage.tsx`, `src/features/rca-simulation/components/TrialValidationCard.tsx`, focused `scripts/verify_*.ts`.

**Estimated scope:** Small.

### Checkpoint: RCA & Simulation

- [x] Candidate choice, notes, A/B/C results, economics, and Trial handoff follow the agreement.
- [x] Focused checks, `npm run build`, and the Task 18 end-to-end browser review pass. Human acceptance remains pending.

## Phase 5 — Cross-Flow Acceptance

### Task 18: Verify the complete agreed workflow

**Description:** Run synthetic import/manual-entry workflows through all four pages, review the integration, and record implementation evidence separately from human acceptance.

**Acceptance criteria:**
- [x] Identity warnings, statuses, record gaps, candidate totals, and scenario results remain consistent end to end.
- [x] No Trial workflow or future financial model was added without a new agreement.
- [x] Build/focused verification evidence and human acceptance status are recorded in `HANDOFF.md`.

**Implementation evidence:** The xlsx skill read-only inspection confirmed canonical synthetic workbooks with one Product, four Work Centers, ten BOM rows, fifteen Routing rows, and no formula cells. Browser smoke covered all four pages, mismatch warning, comparison gap 7.5065, matching candidate total, explicit candidate/Trial choices, saved notes, and Scenario A cost 30.2215 → 28.3465 while Current remained 30.2215. No browser page or console errors were reported.

**Verification:** All 13 focused verifiers passed; `npm run build` passed (1,691 modules). The synthetic Chrome workflow passed. `npm audit --audit-level=high` found five advisories including two High in xlsx with no fix; the HAWS security gate is recorded open in `HANDOFF.md`.

**Human acceptance:** Pending user review; automated verification is not acceptance.

**Dependencies:** Tasks 1–17.

**Files touched:** `scripts/verify_simulation_context.ts`, `tasks/todo.md`, `HANDOFF.md`.

**Estimated scope:** Medium.

### Checkpoint: Complete

- [x] Implementation acceptance criteria are satisfied, the application builds, and the integrated flow has been reviewed.
- [x] Automated verification is recorded separately from human acceptance.
- [ ] Human acceptance has been recorded as accepted.
- [ ] HAWS dependency audit has zero High/Critical vulnerabilities.
