# Current Handoff — RCA & Simulation Agreement Work (2026-09-27)

> This checkpoint records the active implementation state. Earlier handoffs remain below as history.

## Repository and Git state

- Repository: `COSTBREAKDOWN`.
- Active worktree: `C:\Users\Boom\.codex\worktrees\rca-agreement\COSTBREAKDOWN`.
- Branch: `codex/rca-task-14`, created from `0d7079d`; later agreement-re-audit checkpoints are on this branch.
- The upstream tracking ref was `b81483f` at the start of this re-audit. Checkpoints `2c804d5` and `e83e092` contain the Comparison fixes; this handoff records the completed AI-side Agreement re-audit. The user authorized pushing after the re-audit and documentation closeout are complete.
- The original checkout at `E:\COSTBREAKDOWN` remains unchanged by this feature work.
- `origin/feature/taste-frontend-ui` remains a reference ancestor; this work does not switch to it.

## Goal and scope

The earlier implementation checklist records Tasks 1–18 as completed at their respective checkpoints. A later user-requested re-audit found Comparison gaps despite those checkboxes. This final AI-side re-audit checked the live code against all four current Agreement files; previous checkmarks and ChatGPT's review were treated as leads/evidence, not proof of full compliance. Human acceptance is tracked separately and remains pending.

The maintainability rule is recorded in `PROJECT_SPECIFIC.md`: shared behavior has one canonical implementation imported by consumers; reuse follows matching behavior and meaning; intentional local exceptions carry a nearby note; inspect callers before changing shared modules.

## Task status

- **Task 14 — implemented and verified:** RCA starts without a selected candidate; user chooses from the full candidate pool; optional Root Cause and Action notes are saved by candidate and excluded from numeric calculations. Removed the obsolete Ranking-driven selection path and dead UI/API. Deprecated persisted fields remain only for old-session compatibility.
- **Task 15 — implemented and verified:** independent A/B/C overrides for measurable BOM and Work Center inputs recalculate from the Current snapshot through the shared Standard Cost engine. Consumption is supported; structural edits remain excluded.
- **Task 16 — implemented and verified:** Gross Saving and improvement economics are calculated separately from Standard Cost; A/B/C remain comparable, with no automatic recommendation.
- **Task 17 — implemented and verified:** the user explicitly selects a scenario for handoff; Trial validation, actual-cost fields, baseline promotion, and their unused types are removed.
- **Task 18 — implementation verification complete and checkpointed locally:** synthetic browser workflow, focused checks, build, and final implementation review are recorded below.
- **Human acceptance — pending:** user review is still required; automated results do not establish acceptance.
- **HAWS security gate — cleared by automated audit:** SheetJS is on official 0.20.3 and Vite is on patched 6.4.3. `npm audit --audit-level=high` passes; two Moderate findings remain through ExcelJS/uuid.

## Task 14 verification

At Task 14 close, a fresh run in the active worktree passed all eight focused verifiers:

- `verify_candidate_prioritization`
- `verify_rca_record`
- `verify_rca_candidate_notes` — 8 checks
- `verify_simulation_context` (later refreshed to the Task 15 API and passed again in Task 18)
- `verify_scenario_draft`
- `verify_scenario_variables`
- `verify_snapshot_full_flow`
- `verify_snapshot_bridge`

`npm run build` passed: TypeScript and Vite completed; 1,689 modules transformed. Vite reports the existing large-chunk advisory (1,674.34 kB JavaScript output). `git diff --check` passed; Git reported line-ending normalization warnings only.

At Task 14 close, browser interaction remained unverified. Task 18 later covered the core flow in Chrome; keyboard, screen-reader, and human acceptance remain pending.

## Task 15 verification

Fresh checks in the active worktree passed:

- `verify_scenario_cost_overrides`
- `verify_scenario_input_mapping`
- `verify_scenario_draft`
- `verify_missing_work_center_rate`
- `verify_rca_candidate_notes` — 7 checks
- `npm run build` — TypeScript and Vite completed; 1,692 modules transformed
- `npm run excel` — generated workbook audit passed with zero errors
- `git diff --check` — passed; Git reported line-ending normalization warnings only

Scenario drafts are keyed by product and candidate. Each starts from Current, applies only supported numeric field overrides, and preserves missing values and structure. Scenario values were later browser-verified in Task 18.

## Task 16 verification

Fresh checks in the active worktree passed:

- `verify_scenario_variables` — economics formulas, missing inputs, zero volume, per-scenario isolation, and UI metric mapping
- Task 15 focused verifiers — scenario cost parity, input mapping, draft isolation, missing rate, and candidate-note separation
- `npm run build` — TypeScript and Vite completed; 1,691 modules transformed
- `npm run excel` — generated workbook audit passed with zero errors

Improvement economics reads only the scenario cost outputs and its own assumptions. It does not modify the Standard Cost calculation or inputs.

## Task 17 verification

- `verify_rca_handoff` passed. The Trial choice starts empty and requires a human selection.
- The Trial validation component, baseline-promotion store action, old what-if result types, and Trial validation record type have no remaining source callers and were removed.
- `npm run build` passed; TypeScript and Vite completed with 1,691 modules transformed.
- At Task 17 close, browser verification and human acceptance were pending; Task 18 later verified the core workflow, while human acceptance remains pending.

## Task 18 verification

- The xlsx skill read-only inspection confirmed the generated synthetic Reference and Current files use the canonical META, PRODUCT, WORK_CENTER, BOM, and ROUTING sheets, with one Product, four Work Centers, ten BOM rows, fifteen Routing rows, and no formula cells. The tracked mock workbook was not changed.
- Browser smoke covered Master Data, Cost Breakdown, Candidate Selection, and RCA & Simulation. Both imports reported four Work Centers, ten BOM rows, and fifteen Routing rows.
- Editing Current Product Code showed the mismatch warning while Compare remained available. Editing BOM item MAT-FILM-01 price to 60 produced a 7.5065 cost gap; Candidate Selection showed the same 7.5065 total.
- RCA opened with no selected candidate; a candidate was selected explicitly and notes were saved. Scenario A kept Current Standard Cost at 30.2215 and recalculated Scenario Standard Cost to 28.3465. Entering fixed investment did not change either Standard Cost. Trial handoff started blank and required an explicit choice; no Trial validation or actual-cost flow appeared.
- Browser reported no page errors or console errors. Synthetic workbook creation and browser fixtures stayed in the task visualization folder.

Fresh focused verification passed all 13 checks:

- `verify_simulation_context`
- `verify_rca_candidate_notes`
- `verify_rca_record`
- `verify_scenario_draft`
- `verify_scenario_cost_overrides`
- `verify_scenario_input_mapping`
- `verify_scenario_variables`
- `verify_missing_work_center_rate`
- `verify_rca_handoff`
- `verify_candidate_prioritization`
- `verify_snapshot_bridge`
- `verify_comparison_reconciliation`
- `verify_import_mismatch_export`

- The simulation-context verifier still uses current Task 15 scenario-draft APIs; it had become stale when that API changed and was repaired at this checkpoint.
- `npm run build` passed: TypeScript succeeded; Vite transformed 1,691 modules and built the application. The existing chunk-size advisory remains (1,670.44 kB JavaScript, 486.02 kB gzip).
- At Task 18 close, before the follow-up below, `npm audit --audit-level=high` reported five advisories (three Moderate, two High). The two High findings were prototype pollution and ReDoS in xlsx 0.18.5. The security remediation below closes that gate while preserving the import contract.
- Human acceptance remains pending. The automated browser pass and implementation review are evidence, not user acceptance.

## Agreement re-audit — 2026-09-28

### AI-side result

The four current files in `agreements/` were checked against the current implementation and available verification evidence. No confirmed Agreement mismatch remains in the AI-side review. This is implementation evidence, not human acceptance.

### Comparison

- Business-key matching uses the four agreed statuses. Missing or duplicate keys remain validation findings; they do not produce guessed matches or fabricated zero gaps.
- Row-level Material, Labor, and Burden effects reconcile to their branches; the branches reconcile to Total or surface an explicit unavailable/mismatch issue.
- Comparison tables and workbook rows use the shared finding effects. Material candidates consume comparison findings; processing candidates aggregate Routing detail by Work Center using the shared Routing cost calculator.
- Export read-back verifies row values and effect sums against the Summary gaps.

### Master Data

- Empty Reference and Current datasets remain usable. Direct entry/editing is independent by side; bidirectional cloning creates independent data.
- Per-side sizing and blank-row preservation, selected-side import replacement, non-blocking Product mismatch warnings, and export/import round-trip behavior match the current Master Data agreement.
- Untouched rows allocated by sizing are excluded from cost, comparison, and processing-candidate calculations. User-created blank rows still report missing inputs.
- Current-branch verifiers passed: `verify_direct_dataset_editing`, `verify_dataset_sizing_and_clone`, `verify_dataset_sizing_preservation`, `verify_sizing_placeholders_ignored`, `verify_import_mismatch_export`, `verify_master_data_handoff`, `verify_snapshot_import`, and `verify_workspace_initialization`.

### Candidate Prioritization and RCA & Simulation

- Candidates preserve the agreed status and gap meaning; processing candidates aggregate by Work Center.
- RCA requires the user to choose a candidate. Root Cause and Action notes are optional and separate from calculations. A/B/C scenarios start from Current and use the shared Standard Cost calculation; improvement economics remain separate. Trial handoff requires an explicit user choice.
- Current-branch verifiers passed: `verify_candidate_prioritization`, `verify_missing_work_center_rate`, `verify_rca_candidate_notes`, `verify_rca_handoff`, `verify_rca_record`, `verify_scenario_cost_overrides`, `verify_scenario_draft`, `verify_scenario_input_mapping`, `verify_scenario_variables`, `verify_simulation_context`, `verify_snapshot_bridge`, and `verify_snapshot_full_flow`.

### Navigation and final verification

- With no Reference/Current data, Cost Breakdown, Candidate Selection, and RCA & Simulation were opened in the browser; unavailable values and explanations appeared while navigation remained available. No user data was entered.
- Current-branch Comparison verifiers passed: `verify_comparison_reconciliation`, `verify_candidate_prioritization`, `verify_bom_comparison_view`, `verify_routing_comparison_view`, `verify_work_center_comparison_view`, `verify_snapshot_comparison_view`, and `verify_comparison_export`.
- A fresh `npm run build` passed: TypeScript succeeded and Vite built 1,689 modules. The existing large-bundle advisory remains (1,715.61 kB JavaScript, 499.06 kB gzip).
- The representative-data Chrome workflow was repeated after the latest Comparison and sizing-placeholder fixes. All four pages passed; the exact comparison/candidate gap remained 7.5065, the manual BOM row gap was 0.4375, the scenario changed 30.2215 to 28.3465 while Current stayed 30.2215, and there were no browser or console errors.
- The affected calculation/comparison verifiers passed: `verify_snapshot_quality`, `verify_snapshot_comparison_dynamic_fields`, `verify_comparison_reconciliation`, `verify_candidate_prioritization`, `verify_dataset_sizing_preservation`, `verify_scenario_cost_overrides`, `verify_snapshot_full_flow`, `verify_comparison_export`, and `verify_sizing_placeholders_ignored`.

### Evidence limits and acceptance

- The representative-data browser workflow passed after the latest fixes. Automated verification remains implementation evidence, not human acceptance; page-by-page human review is pending.
- No confirmed implementation gap remains from this AI-side audit.
- Do not promote unapproved audit suggestions into requirements.

## HAWS dependency security remediation (2026-09-27)

- Updated SheetJS to 0.20.3 from the official CDN tarball and Vite to 6.4.3, the first patched release listed by the reviewed Vite advisory. The existing React plugin supports Vite 6.
- Kept the existing parser modules, service API, and `.xls`/`.xlsx` upload contract. No application UI or agreement behavior changed.
- The package lock pins the official SheetJS URL and its SHA-512 integrity. The SheetJS CDN package is not an npm-registry package, so it is not represented in the registry-signature count.
- `npm audit --audit-level=high` passed with zero High/Critical findings. The full audit reports two Moderate findings through `uuid`/ExcelJS.
- `npm audit signatures` passed: 238 registry packages have verified signatures and 40 packages have verified attestations.
- `npm run build` passed with 1,688 modules transformed. Vite still reports the existing large-chunk warning (1,711.30 kB JavaScript, 498.13 kB gzip).
- `scripts/verify_snapshot_import.ts` passed with synthetic canonical `.xlsx` and `.xls` workbooks, legacy import, a non-blocking Product mismatch warning, and blank template rows ignored. The test's former blocking-mismatch and populated-template expectations were stale against the current agreement and template instructions; only those assertions were corrected.
- The verifier type-check passed, and `scripts/verify_import_mismatch_export.ts` passed export/import round-trip, non-blocking mismatch, comparison handoff, and replacement-side isolation.
- The operational RGOM workbook was not opened. Human acceptance remains pending for the user's page-by-page review.

## Resume point

The AI-side Agreement re-audit, implementation fixes, focused verification, browser replay, and evidence update are complete. The user authorized the normal push as the final repository action after this work is complete. Human acceptance remains pending.

---

# Historical Handoff — Master Data Sizing Preservation (2026-09-25)

> This was the current checkpoint at the time. The 2026-09-27 structure checkpoint above supersedes it; retain this record as history and verify its claims against the relevant commit.

## Repository and sync state

- Repository: `COSTBREAKDOWN`; remote `origin` is configured.
- Branch: `codex/snapshot-import-role-selector`.
- Base HEAD at task start: `f83d8d8`; the worktree was clean and the branch matched `origin`.
- The changes below are the current task's uncommitted work. No commit or push was made.

## Current task and scope

Implement the accepted Master Data rule in `agreements/MASTER_DATA_FLOW_SPEC.md` §7.2: reducing configured counts may remove only surplus unpopulated blank slots; populated records must remain.

## Implemented

- Replaced the `slice(0, target)` truncation for Rates, BOM, and Routing with `src/state/dataset-sizing.ts`. It removes only untouched generated placeholders and retains populated, manual, imported, zero-valued, and explicitly edited rows even when they exceed the configured target.
- Added a placeholder marker to snapshot and legacy row types, carried it through both session projection directions, and synchronized the projected legacy session when sizing changes. This preserves placeholder identity and blank BOM codes across reloads; generated null-to-zero defaults remain removable only while the marker is true.
- The three Master Data row update paths clear the marker. Editing then clearing a generated row therefore preserves that row on a later shrink.
- Updated `scripts/verify_master_data_handoff.ts` to match the current behavior: Product Code differences remain warnings, not comparison blockers; the header Product Code is not an independent gate.
- Updated this checkpoint. The detailed sizing design under `docs/superpowers/specs/` remains **Proposed**; its additional criteria were not implemented.

## Verification

- `scripts/verify_dataset_sizing_preservation.ts`, bundled with the installed esbuild runtime and executed with Node: **passed**. Covers all three sections, sparse and zero-valued inputs, user-edited blank rows, legacy IDs, generated defaults, session-projection round-trip, and growth.
- `node --experimental-strip-types scripts/verify_master_data_handoff.ts`: **passed**.
- `npm run build`: **passed**, 1,689 modules transformed. Vite still reports the existing bundle-size advisory (about 1.67 MB versus the 500 KB advisory threshold).
- Browser smoke on an isolated local session: set each count to 2, added one record per section (including a zero labor rate), reloaded, then reduced counts to 0. The generated rows disappeared; the user records remained and counts stayed synchronized after reload. A generated BOM row edited and cleared also remained blank and was retained after shrink and reload.
- [Unverified] Excel template/import/export round-trip was not exercised.

## Master Data status

- The confirmed data-loss defect on sizing reduction is fixed and verified through helper tests and browser interaction.
- This does not close all Master Data work. Older review items about blank-slot comparison/readiness and template count/max behavior remain outside this accepted fix; additional requirements in the **Proposed** sizing design still need review before implementation.
- Changes remain uncommitted and unpushed. The worktree is based on the current remote branch but only the base commit is available to another device.

## Resume point

Review the current diff and decide whether to continue with the separate Proposed sizing criteria or another accepted Master Data gap. Do not treat this sizing fix as overall Master Data acceptance, and do not push without explicit authorization.

---

# Historical Handoff — Adopt the New Cost Breakdown Agreement

**Updated:** 2026-09-24
**Repository:** E:\COSTBREAKDOWN
**Starting checkout:** branch codex/snapshot-import-role-selector, commit 161dc13

## Current agreement

The user designated all four documents under agreements/ as the current product agreement. See docs/REQUIREMENTS_INDEX.md for the authority order and summary.

The Comparison document retains its own “Working Specification” label. The user's instruction makes it part of the current agreement set for project work.

## Current implementation state

The repository contains code and documentation produced under earlier requirements. In particular, the previous Master Data plan recorded Tasks 1–6 as implemented and verified, including a Product context, role-aware Draft data, and a guarded handoff to Cost Breakdown. Those results describe the earlier behavior and are not acceptance of the new agreement.

The user designated all four agreement files as the current product contract. A static code-to-agreement audit is complete at `.planning/2569-09-24-agreement-gap-audit/findings.md`. The largest gaps are the Product-session Master Data flow, Comparison status/identity/reconciliation behavior, legacy Candidate Prioritization input, and RCA simulation's incomplete use of the agreed cost engine. Do not infer implementation completeness from old plans or test evidence.

The audit did not change application code and did not run tests or a build. The phased implementation roadmap is recorded at `.planning/2569-09-24-agreement-gap-audit/task_plan.md`; the implementation plan and 18-task checklist are in `tasks/plan.md` and `tasks/todo.md`.

## Documentation cleanup

The agreement set and requirements index are the active behavior references. Earlier conflicting page specifications, cross-page designs, task plans, analysis/review documents, old diagrams, and dated handoffs were removed from the working tree. Concise project context, safeguards, quality constraints, and this checkpoint remain.

## Prior verification evidence

The 2026-09-23 handoff recorded successful build, Excel model, focused verifier, and synthetic browser checks for the previous implementation. Those checks were not rerun during this documentation cleanup and do not verify the new agreement.

## Task 1 Completion Checkpoint (2026-09-24)

### Implemented Scope
- Replaced seeded first-use session data with empty initial workspace (`makeEmptySession`, `createEmptySnapshotPair`, `emptyProductMaster`).
- Fresh browser session starts with empty Reference and Current datasets; `resetToDefault` and `clearAllData` reset the active session back to independent empty Reference and Current datasets with `preparedSnapshotRoles: { reference: false, current: false }`.
- Session data is persisted exclusively in `sessionStorage` via `src/services/storage/session-storage.ts`, so closing the browser tab/session clears working data.
- Isolated mutation boundaries: modifying Reference does not mutate Current; cloning Reference to Current creates a deep independent copy, ensuring edits to Current do not mutate Reference.

### Verification Evidence
- Focused Verifier: `scripts/verify_workspace_initialization.ts` executed and passed (`npx tsx scripts/verify_workspace_initialization.ts`).
- Regression Verifier: `scripts/verify_master_data_handoff.ts` executed and passed (`npx tsx scripts/verify_master_data_handoff.ts`).
- Type check & Build: `npm run build` completed cleanly (0 errors, 1685 modules transformed).

### Noted Risks & Observations
- Master Data editing components still enforce `status === 'draft'` gating pending Task 2. Task 2 must remove version status gating (`status === 'draft'`, Draft/Active/Archived badges, clone/activate controls) from Master Data per Section 2 & 10 of `agreements/MASTER_DATA_FLOW_SPEC.md`.
- `evaluateMasterDataHandoff` currently enforces matching Header Product Code between Reference and Current; Task 4 will address turning product mismatch into a non-blocking warning.
- Scope boundaries were strictly observed: Task 2 was not started, and unrelated files/documentation were not modified.

## Task 2 Completion Checkpoint (2026-09-24)

### Implemented Scope
- Removed version lifecycle gating (`activeSession.status !== 'draft'`) from store mutation methods: `updateMasterDataDataset`, `updateMasterDataProduct`, and `cloneReferenceToCurrent`.
- Enabled direct adding, editing, and deleting of Product, Work Center, BOM, and Routing data on either side (Reference and Current) at any time.
- Removed lifecycle UI artifacts from Master Data: Draft/Active/Archived badges, "Clone to Draft" and "Activate Draft" buttons, draft warning alert banners, and dataset status displays.
- Made Product Code directly editable in Edit Mode within `ProductMasterCard.tsx` so users can enter or modify product codes manually without wizard setup.
- Maintained independent copy semantics in `cloneReferenceToCurrent`: cloning Reference creates an isolated deep copy on Current that can be edited, added to, or deleted from without mutating Reference.

### Verification Evidence
- Focused Verifier: `scripts/verify_direct_dataset_editing.ts` created and executed successfully via `npx tsx`:
  - Verified manual entry on Reference works without status gate and does not mutate Current.
  - Verified Reference -> Current produces independent copy; editing Current preserves Reference.
  - Verified adding and deleting rows on Current works independently of Reference.
  - Verified lifecycle gating removed: direct dataset editing does not require draft status.
- Regressions check: `scripts/verify_workspace_initialization.ts` executed and passed.
- Type check & Build: `npm run build` completed cleanly (0 errors, 1685 modules transformed).

## Phase 1 Completion Checkpoint (Tasks 1–5, Master Data) (2026-09-24)

### Implemented Scope
- **Task 1:** Replaced seeded demo data with clean empty initial state (`makeEmptySession`, `createEmptySnapshotPair`, `emptyProductMaster`). Browser tab session storage isolation via `sessionStorage`.
- **Task 2:** Removed lifecycle status gating (`status === 'draft'`) from store mutations (`updateMasterDataDataset`, `updateMasterDataProduct`, `cloneReferenceToCurrent`). Removed obsolete badges/buttons/banners from UI and made Product Code editable.
- **Task 3:** Implemented full Working Dataset replacement on Excel import. Importing into Reference replaces only Reference; importing into Current replaces only Current; manual data is not merged.
- **Task 4:** Converted Product Code/Name mismatch during import and comparison handoff from blocking errors to non-blocking advisory warnings. Comparison can proceed even with differing product codes per agreement Section 9. Missing calculation inputs remain warnings and are not coerced to zero.
- **Task 5:** Added full dataset export (`exportSnapshotToExcel` in `src/services/excel/snapshot-export.ts`) via "Export Dataset" button on Master Data page. Round-trip export/import verified.

### Verification Evidence
- `scripts/verify_workspace_initialization.ts` passed.
- `scripts/verify_direct_dataset_editing.ts` passed.
- `scripts/verify_import_mismatch_export.ts` passed:
  - Verified Export -> Import round-trip preserves Product, Rates, BOM, and Routing.
  - Verified Product mismatch is a non-blocking warning for both import and comparison handoff.
  - Verified import replaces selected side without affecting opposite side.
- Build: `npm run build` passed cleanly (0 errors, 1686 modules transformed).

## Phase 2 Completion Checkpoint (Tasks 6–10, Comparison & Reconciliation) (2026-09-24)

### Implemented Scope
- **Task 6 (Canonical 4 Statuses):** Standardized exact comparison statuses `UNCHANGED`, `CHANGED`, `ADDED`, `REMOVED` via `CanonicalComparisonStatus` in `src/core/calculations/comparison-status.ts`. Reordering rows or sequence changes remain details under `CHANGED`. Ambiguous/duplicate keys produce validation warnings without guessing matches.
- **Task 7 (Absent-side zero & Record-level effects):** Updated `src/core/calculations/snapshot-bom-detail.ts`, `src/core/calculations/snapshot-routing-detail.ts`, and `snapshot-comparison.ts` to compute record effects as `Current - Reference` with absent-side zero (`0 → Current` for ADDED, `Reference → 0` for REMOVED) without coercing missing required calculation values (null remains null).
- **Task 8 (Explicit Reconciliation):** Implemented `ComparisonReconciliation` in `src/core/calculations/snapshot-comparison.ts` checking `totalGap === materialGap + laborGap + burdenGap` within 0.0001 tolerance, emitting `RECONCILIATION_MISMATCH` warning when violated.
- **Task 9 & 10 (Comparison view, status filters, and export alignment):**
  - Updated `comparison-view.ts` and `CostBreakdownPage.tsx` to support canonical status filters (`all`, `changed`, `added`, `removed`, `unchanged`) with real-time record counts.
  - Aligned `src/services/excel/comparison-export.ts` with canonical 4 statuses and verified export model generation.

### Verification Evidence
- `scripts/verify_comparison_reconciliation.ts` passed:
  - Verified 4 canonical statuses.
  - Verified absent-side zero calculation for ADDED ($0 \to \text{Cur}$) and REMOVED ($\text{Ref} \to 0$).
  - Verified exact reconciliation (`Material + Labor + Burden = Total Gap`).
  - Verified status filtering logic in `comparison-view.ts`.
- `scripts/verify_snapshot_comparison_view.ts` passed.
- `scripts/verify_import_mismatch_export.ts` passed.
- Build: `npm run build` completed cleanly (0 errors, 1686 modules transformed).

## Phase 3 Completion Checkpoint (Tasks 11–13, Candidate Prioritization) (2026-09-24)

### Implemented Scope
- **Task 11 (Material Candidates):** Implemented `buildMaterialCandidates` in `src/core/calculations/material-candidates.ts`. Converts meaningful material comparison findings into candidates with `CHANGED/ADDED/REMOVED` statuses. Unchanged materials do not become candidates. Multiple changed factors (Price, Loss, Usage) are exposed as distinct factor candidates. Added items calculate Reference = 0; Removed items calculate Current = 0.
- **Task 12 (Processing Candidates aggregated by Work Center):** Implemented `buildProcessingCandidates` in `src/core/calculations/processing-candidates.ts`. Aggregates Reference and Current processing costs by Work Center. Uses `Current - Reference` gap without requiring 1:1 Routing step matching or manual split/merge mapping. Different Routing structures still aggregate to clean Work Center candidates.
- **Task 13 (Consolidated candidates, ranking, and controllability):**
  - Implemented `buildPrioritizationCandidates` in `src/core/calculations/candidate-prioritization.ts` sorting candidates descending by Gap (+Gap -> -Gap) while keeping zero and negative gaps visible.
  - All candidates start with `controllable = true` by default. Unchecking `Controllable` updates the state without removing or hiding the row.
  - Simplified `CandidateSelectionPage.tsx` and created `CandidatesTable.tsx` & `CandidateRow.tsx` displaying only agreed fields: Rank, Candidate / Finding, Status (`CHANGED/ADDED/REMOVED`), Reference, Current, Gap (THB), and Controllable.
  - Removed all Action, Root Cause, Requirement Fit, and Feasibility controls from Candidate Prioritization.

### Verification Evidence
- `scripts/verify_candidate_prioritization.ts` created and passed:
  - Verified Material candidate generation, factor breakdown, and absence of unchanged items.
  - Verified Processing candidates aggregated by Work Center without 1:1 Routing match.
  - Verified default `controllable: true` and descending Gap sort.
  - Verified status filtering (`all`, `CHANGED`, `ADDED`, `REMOVED`).
- Regressions check: `scripts/verify_import_mismatch_export.ts` and `scripts/verify_comparison_reconciliation.ts` both passed.
- Build: `npm run build` completed cleanly (0 errors, 1687 modules transformed).

## Current status (2026-09-28)

- Tasks 1–18 and the Agreement re-audit are implemented and verified on `codex/rca-task-14`.
- The final sizing-placeholder regression, affected focused verifiers, production build, and representative-data browser workflow passed.
- The user asked for the push after all work is complete; human acceptance remains pending their review.

## Open specification boundary

The current agreements hand off to Trial but do not define its validation or baseline-promotion workflow. The stable Routing business key for rows without Operation Code or Process Code also needs agreement. Keep Trial behavior and future financial metrics out of scope until specified.
