# Current Handoff — Cross-Device Checkpoint (2026-09-25)

> This is the current checkpoint and supersedes older status/verification notes below. Historical notes remain for context only; verify them against the current checkout before relying on them.

## Repository and sync state

- Repository: `COSTBREAKDOWN`; remote `origin` is configured.
- Branch: `codex/snapshot-import-role-selector`.
- Checkout HEAD when this checkpoint was written: `abf47171ba40c1d20cee54e32bbf7c330a6c68e8`.
- The working tree contains substantial **uncommitted user changes** (modified agreement/spec, Master Data UI/state/Excel files, and new files including a mock workbook). They were not created by this handoff task. Preserve them; do not reset, restore, or overwrite them.
- This checkpoint has **not been committed or pushed**. Another device will see only changes that are already on the remote; it will not automatically receive this handoff or the dirty working-tree changes. Before continuing implementation on another device, verify branch/HEAD/worktree and arrange an authorized sync of the intended changes.

## Current task and scope

The user asked for a code-to-spec check of the Master Data page. Review scope is the active runtime page and its state/calculation/Excel paths. No implementation changes were made during the review.

- Runtime route: `src/App.tsx` renders `MasterDataPage` from `src/features/master-data/` for the `master` tab. `src/pages/DataMasterPage.tsx` is not the active route.
- Requirements source: `agreements/MASTER_DATA_FLOW_SPEC.md`, indexed in `docs/REQUIREMENTS_INDEX.md`. `PROJECT_SPECIFIC.md` applies. The detailed sizing document under `docs/superpowers/specs/` labels itself **Proposed**; keep that status distinct from the agreed spec unless the user confirms it.

## Confirmed Master Data findings

1. **Data loss on sizing reduction:** `src/state/store.tsx` truncates `rates`, `bom`, and `routing` with `slice(0, target)` when configured counts decrease (around lines 761–822). This conflicts with the agreed rule that only surplus blank slots may be removed and populated records must remain.
2. **Blank sizing slots act like real records:** sizing creates snapshot rows with generated IDs and empty business fields. Cost calculation reports missing-input warnings for them, and comparison falls back to row IDs as keys, so Reference/Current blank slots can show as added/removed findings. The detailed Proposed design explicitly says blank slots must not create cost, findings, or false readiness.
3. **Readiness can be set by Product-only edits:** `updateMasterDataProduct` marks the selected side prepared. Handoff readiness checks those flags, so entering Product information alone can make the comparison action ready even when the data sections are empty. This appears inconsistent with the agreed “enough information for the intended calculation” flow and the Proposed design's no-false-readiness criterion.
4. **Template sizing edge cases:** the modal treats a configured count of zero as unset and falls back to existing rows or 1; the generator also enforces at least one row. The detailed Proposed design says templates use that side's configured count. The current generator pre-fills Product values, while the Proposed design says Product/template business-input values start blank.
5. **Displayed sizing maxima are not enforced:** `max` attributes are present, but the Apply handler does not clamp/validate values before the store allocates rows. Very large values may cause a long freeze or allocation failure.

Behavior that appears aligned with the agreed flow: fresh sessions use empty Reference/Current snapshots; imports update only the selected side; clone actions exist in both directions; Product mismatch is a warning and does not block comparison; export uses the selected snapshot; working session data uses `sessionStorage`.

## Verification record for this review

- `npm run build`: **passed** when run outside the filesystem sandbox; TypeScript and Vite completed, 1,688 modules transformed. Vite reported the JS bundle at about 1.67 MB, above its 500 KB advisory threshold.
- `node --experimental-strip-types scripts/verify_master_data_handoff.ts`: **failed** at the old assertion expecting Product mismatch to block comparison. That expectation conflicts with the current agreement, which says the mismatch warning must not block.
- `npx tsx scripts/verify_dataset_sizing_and_clone.ts`: could not run because `tsx` is not installed and npm registry access failed (`EHOSTUNREACH`). Native Node execution also could not resolve an extensionless import. The script's populated-record-preservation section mutates a plain fixture directly instead of exercising the store sizing function.
- [Unverified] Browser rendering and end-to-end Excel template/import/export round-trip were not exercised in this review.

## Resume point

Start by verifying the actual checkout and syncing the intended dirty changes safely. Then, if the user authorizes implementation, fix the sizing/data-record semantics first and add verification that calls the production store path. Update the stale handoff verifier to assert that Product mismatch warns but remains non-blocking. Re-run focused checks and `npm run build`; report any remaining browser/Excel checks as unverified until executed.

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

## Next work

1. Phase 4 — RCA & Simulation (Tasks 14–17):
   - **Task 14:** Move candidate selection and Root Cause/Action notes to RCA & Simulation; permit selection from the full Candidate pool.
   - **Task 15:** Adopt the shared snapshot cost engine for baseline and simulation.
   - **Task 16:** Remove hardcoded Routing/rate assumptions from simulation.
   - **Task 17:** Align simulation outputs and Trial handoff.
2. Phase 5 — Handoff & Governance (Task 18).
3. Run focused verifiers, `npm run build`, commit per phase, and push to remote.

## Open specification boundary

The current agreements hand off to Trial but do not define its validation or baseline-promotion workflow. The stable Routing business key for rows without Operation Code or Process Code also needs agreement. Keep Trial behavior and future financial metrics out of scope until specified.
