# Current Handoff — Adopt the New Cost Breakdown Agreement

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

## Next work

1. Begin Phase 2 — Comparison Findings and Reconciliation:
   - **Task 6:** Validate business identity and standardize four comparison statuses (`UNCHANGED`, `CHANGED`, `ADDED`, `REMOVED`).
   - **Task 7:** Calculate record-level effects with absent-side zero.
   - **Task 8:** Reconcile item-level effects to element-level cost gaps.
   - **Task 9:** Retain unmapped imported fields for comparison and display.
   - **Task 10:** Separate calculation failure from data warning.
2. Verify each phase against its acceptance criteria before proceeding.
3. Commit and push progress as requested.

## Open specification boundary

The current agreements hand off to Trial but do not define its validation or baseline-promotion workflow. The stable Routing business key for rows without Operation Code or Process Code also needs agreement. Keep Trial behavior and future financial metrics out of scope until specified.
