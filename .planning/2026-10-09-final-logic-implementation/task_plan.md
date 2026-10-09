# Final Logic Implementation Plan

> This plan is an execution guide. Canonical product requirements remain under `docs/REQUIREMENTS_INDEX.md` and `docs/specs/`.

## Goal

Align the implementation with the user-finalized COSTBREAKDOWN logic while preserving compatible UX/UI requirements, then verify, commit each completed phase, update the handoff, and push `codex/final-logic-implementation`.

## Branch and baseline

- Target branch: `codex/final-logic-implementation`
- Baseline: `665099b71319ec98c537a0859336dc01b9acc118`
- Independent-review baseline: `e26f0b45d9a9b0b0835efe52fbec9c2f1a40ef34`
- Source documentation branch: `codex/costbreakdown-spec-source` (read-only for this task)
- Worktree: `.worktrees/codex-final-logic-implementation`

## Next Step

Independent review of HEAD `4a1968db841d97ff8d6c44b3aadf929f73e01be1` found two lifecycle/migration regressions. Both are corrected, verified, committed (`15379d92a2815fa6bea89f2b9cad56ec29347148`), and pushed with the planning/HANDOFF checkpoint. Next, wait for the independent ChatGPT reviewer to inspect the updated branch. Do not begin Footer/frontend styling or self-issue `FINAL LOGIC ALIGNED ✅`.

## Current Phase

Phase 16 — Complete; independent review pending

> Phase 11 completion is historical. Later independent reviews identified Simulation logic gaps and an RCA → Simulation handoff gap; Phases 12 and 13 record their corrections and preserve the approval gate.

## Phases

### Phase 0 — Baseline verification
- [x] Verify baseline SHA, source branch, remotes, and worktree state.
- [x] Read repository instructions and canonical specs.
- [x] Run baseline build and relevant verification/workbook checks.
- [x] Record pre-existing warnings/failures.
- [x] Commit planning/baseline setup only.
- **Status:** complete

### Phase 1 — Master Data domain model
- [x] Add an independent Custom snapshot, sizing, and Last Saved storage slot to the session model.
- [x] Initialize missing Custom state for both new and previously saved sessions without mutating Reference/Current.
- [x] Preserve Reference/Current comparison-role semantics and CBD readiness.
- [x] Verify compatibility and commit this phase.
- **Status:** complete

### Phase 2 — Complete Custom Master Data behavior
- [x] Support Save, Reset, Clear, Sizing, Import/Export, editing, ordering, and Undo/Redo for Custom through the shared Master Data behavior paths.
- [x] Keep Custom import, clear, and history changes independent from CBD preparation, comparison snapshots, and source revision.
- [x] Verify focused behavior and commit this phase.
- **Status:** complete

### Phase 3 — Master Data UI and generic Clone From
- [x] Expose Reference, Current, and Custom in the existing workspace selector.
- [x] Implement active destination / user-selected source Clone From behavior for all distinct dataset pairs.
- [x] Confirm only when the destination Working dataset already contains data; preserve Last Saved and recalculate comparison readiness from copied content.
- [x] Verify and commit this phase.
- **Status:** complete

### Phase 4 — CBD preservation gate
- [x] Verify Reference-vs-Current-only behavior and source fingerprint isolation from Custom.
- [x] Record verification evidence; no CBD code change was required.
- **Status:** complete (verification-only)

### Phase 5 — Multi-Candidate RCA domain
- [x] Add stable RCA Case identity and one-or-many Candidate membership with case-level Root Cause and Action.
- [x] Migrate compatible legacy Candidate RCA records one-for-one while preserving the source compatibility field.
- [x] Verify domain invariants and commit this phase.
- **Status:** complete (`368128b3543bf5520e35830cc7df275e95764022`)

### Phase 6 — Candidate and RCA workflow
- [x] Select one or multiple Candidates into an RCA Case; preserve advisory ranking and complete RCA without Simulation.
- [x] Verify the workflow and Candidate-pool/Case state invariants.
- [x] Commit this phase after final diff review.
- **Status:** complete (`74843ed5423d4e8a8d3bedc32a440a472753b7af`)

### Phase 7 — Independent Simulation module
- [x] Add independent temporary Simulation state, Start SIM From Reference/Current/Custom, and remove RCA/A-B dependencies from the active route.
- [x] Verify state isolation, basis invalidation, navigation, and Reset SIM behavior.
- [x] Commit this phase after final diff review.
- **Status:** complete (`f82a693c13569845a39d053ae16647a465a987be`)

### Phase 8 — Parameter Simulation engine
- [x] Reuse the shared full-snapshot calculation/comparison engine; lock structure and allow only finalized parameter factors.
- [x] Verify full recalculation, statuses, missing-cost behavior, and parameter saving; commit this phase.
- [x] Commit this phase after final diff review.
- **Status:** complete (`e770f8d72e9da9d9579b8bdc7c651c052c2b89f7`)

### Phase 9 — Parameter Simulation UI
- [x] Expose source, Current comparison, factors, editable values, live results, and statuses without WC-rate or structural editing.
- [x] Verify UI interaction, typecheck/build, and diff.
- [x] Commit this phase.
- **Status:** complete (`cca628e74ce920dcc6f5d436761f7e4e42bc8505`)

### Phase 10 — Independent Economic Simulation
- [x] Implement Action Cost, Evaluation Quantity, Required Saving/pc, and advisory combined Economic Margin without changing Standard Cost.
- [x] Preserve Selling Price, SG&A, and negative OP formulas.
- [x] Verify calculations, state migration, UI behavior, typecheck/build, and diff.
- [x] Commit this phase after final diff review.
- **Status:** complete (`fd559a0d4beb6014a282d51dc76790a5caf3e7cc`; `feat: implement independent economic simulation`)

### Phase 11 — Retire superseded active logic and final verification
- [x] Keep the finalized Reference → Current → Simulated story graph, using the active SIM as Simulated, without requiring A/B choice.
- [x] Remove unused active A/B, Trial, single-Candidate RCA, WC-rate Simulation, and categorized economics paths after caller inspection.
- [x] Run complete relevant verification, workbook checks, build, diff review, and `git diff --check`.
- [x] Verify Simulation navigation and state retention after reload in a browser.
- [x] Update HANDOFF with evidence, phase commits, limitations, and final alignment status; keep it separate from application changes.
- [x] Confirm branch/worktree/history and push normally; do not merge to main or force-push.
- **Status:** complete

### Phase 12 — Resolve independent review findings and await approval
- [x] Change Factors to Simulate from six global parameter types to selectable Material/Process records; reveal the selected record's permitted parameters while retaining full-SIM recalculation and excluding Work Center rates.
- [x] Expose Economic Simulation before Parameter SIM starts; calculate Required Saving from Action Cost / Evaluation Quantity and retain those inputs when Parameter SIM starts.
- [x] Keep Parameter Saving and Economic Margin in the combined mode only; preserve the finalized Selling Price, SG&A, OP, and Standard Cost calculation paths.
- [x] Add/update targeted verifiers for record-based selection, per-record editing, Economic-only rendering/calculation, and transition into combined mode.
- [x] Run all TypeScript verifiers, both MJS verifiers, explicit typecheck, production build, and `git diff --check`; inspect the implementation diff.
- [x] Update this plan and HANDOFF with the review findings and actual verification evidence.
- [x] Commit the correction as `fd870f8` and push it with the checkpoint documentation to `codex/final-logic-implementation`.
- [ ] Obtain explicit independent reviewer confirmation: `FINAL LOGIC ALIGNED ✅`.
- [ ] Begin Footer/frontend styling only after that confirmation.
- **Status:** fixes pushed; independent review pending

### Phase 13 — Add the RCA → Simulation handoff and await approval
- [x] Read the canonical Candidate handoff and corresponding Final Logic sections before implementation.
- [x] Add an explicit Simulation handoff from any active RCA Case, save/carry the latest Case context, and leave RCA complete without requiring Simulation.
- [x] Put Current first for a new SIM entered from RCA while leaving Reference, Custom, standalone Simulation, and unrestricted Material/Process Factor selection available.
- [x] Add targeted checks for incomplete one-Candidate and multi-Candidate Cases, context propagation, source choices, open Factor scope, standalone entry, and RCA completion without Simulation.
- [x] Run the nine relevant TypeScript verifiers, both MJS verifiers, explicit typecheck, production build, `git diff --check`, and inspect the actual implementation diff.
- [x] Commit the implementation separately as `56935a9` (`fix: add RCA to Simulation handoff`).
- [x] Commit this plan/HANDOFF checkpoint separately, push it to `origin/codex/final-logic-implementation`, and verify the remote branch matches local HEAD.
- [ ] Obtain explicit independent reviewer confirmation: `FINAL LOGIC ALIGNED ✅`.
- [ ] Begin Footer/frontend styling only after that confirmation.
- **Status:** implementation and checkpoint are pushed; independent review pending

### Phase 14 — Audit and consolidate the Frozen Final Requirement Checklist
- [x] Audit every applicable requirement from A-01 through W-33 against canonical spec, code, and test evidence before changing application code.
- [x] Record a per-ID Spec / Code / Test / Status matrix and all confirmed findings in the existing `findings.md`.
- [x] Consolidate cross-section duplicate findings and identify stale noncanonical review guidance without changing canonical specs.
- [x] Verify checklist matrix coverage: 475 unique IDs, no duplicate IDs, and section totals reconciled against per-ID rows.
- **Initial audit status after full-audit reconciliation:** 351 PASS, 26 FINDING, 96 NOT VERIFIED, 2 N/A — PROVISIONAL/UI ONLY.
- **Status:** complete; no application source or test files were changed during the initial audit.

### Phase 15 — Implement all findings and complete the final re-audit
- [x] Fix all confirmed logic conflicts and verification gaps listed in the Phase 1 matrix and Phase 2 consolidation in `findings.md`.
- [x] Update stale review guidance in `docs/testing/REVIEW_FIXTURES.md` without changing canonical specification source files.
- [x] Add targeted regression tests for every initial FINDING and testable verification gap; directly verify manual-only requirements in the browser where automation does not exercise real interaction.
- [x] Re-run the full A-01 through W-33 checklist and record final Spec / Code / Test / Status evidence for every ID; no finalized item remains FINDING or NOT VERIFIED.
- [x] Run every TypeScript verifier, all relevant MJS verifiers, typecheck, production build, stale/superseded source scans, cross-flow regression tests, `git diff --check`, and baseline-to-HEAD diff review.
- [x] Update `task_plan.md`, `findings.md`, `progress.md`, and `HANDOFF.md` with verified results and remaining limitations.
- [x] Commit the implementation and planning checkpoints, push normally to `origin/codex/final-logic-implementation`, and verify remote HEAD.
- [x] Wait for explicit independent reviewer approval; do not self-issue `FINAL LOGIC ALIGNED ✅` and do not begin Footer/frontend styling before that approval.
- **Status:** complete; implementation and checklist evidence are pushed; independent review pending. R-10 and R-11 remain N/A only because optional scenario UI is not required. Human visual acceptance and Footer/frontend styling remain deferred.

### Phase 16 — Correct RCA handoff reset and legacy active-tab migration
- [x] Read the two independent-review findings and confirm their affected checklist IDs against the frozen checklist without editing its wording or IDs.
- [x] Make explicit RCA → Simulation handoff clear any existing Parameter SIM source, snapshot, factors, fingerprint, and start time while preserving the already validated Economic inputs deterministically.
- [x] Keep Current first on RCA handoff; leave Reference and Custom available and keep Candidate context informational with unrestricted Material/Process Factors.
- [x] Normalize legacy `dashboard` to `simulation` and legacy `rca` to `candidate`; preserve valid current tabs and fall back safely to `master` for incompatible values.
- [x] Add behavioral fresh-start and legacy-tab regression verifiers; replace static-only RCA context lifecycle assertions with direct lifecycle transition checks.
- [x] Re-run all 62 TypeScript verifiers, both MJS verifiers, typecheck, production build, stale-source scan, targeted lifecycle verifiers, `git diff --check`, and baseline-to-HEAD diff review.
- [x] Record final results in findings/progress/task_plan/HANDOFF, commit the correction, push normally, and verify the remote branch head.
- [ ] Wait for independent review; do not self-issue `FINAL LOGIC ALIGNED ✅` or begin Footer/frontend styling without that exact approval.
- **Status:** implementation, verification, planning checkpoint, commit, and push complete; independent reviewer approval pending.

## Decisions

| Decision | Rationale |
|---|---|
| Work in a separate worktree on `codex/final-logic-implementation` at the exact supplied baseline. | Protects the documentation branch and pre-existing untracked local materials. |
| Canonical specs override conflicting implementation-plan wording. | `docs/REQUIREMENTS_INDEX.md` and `FINAL_LOGIC_SPEC.md` define product behavior; this plan only orders execution. |
| A phase with no necessary code change may be verification-only. | Avoids artificial source changes while retaining phase-level evidence. |
| An independent review is the completion gate for final logic alignment. | The implementation agent must not declare alignment or begin deferred Footer/frontend styling before the exact reviewer confirmation is received. |

## Errors Encountered

| Error | Attempt | Resolution |
|---|---:|---|
| Initial PowerShell parsing of an unquoted Git revision expression failed. | 1 | Quoted the revision expression; verified the baseline SHA and branch state successfully. |
| An initial local preview command forwarded host/port values as positional arguments, so its root responded with 404 or was unreachable at IPv4. | 1 | Stopped the misconfigured preview, used Vite's available localhost listener on port 5175, and confirmed HTTP 200 plus the application UI in-browser. |

## Frozen Final Requirement Traceability Checklist v1.0

**Version:** 1.0
**Status:** FROZEN FOR FINAL LOGIC AUDIT
**Purpose:** Completion gate for final implementation review before Footer / frontend styling work.

The phase checkboxes above are historical execution records. This checklist is the single final completion gate for the implementation.

### Audit Result Labels

Every requirement must eventually have:

- Spec Evidence
- Code Evidence
- Test Evidence
- Status

During the audit, record those four fields for every requirement ID in this checklist. No evidence or audit status is assigned by this planning-only update.

Allowed status:

- PASS
- FINDING
- NOT VERIFIED
- N/A — PROVISIONAL/UI ONLY

FINAL LOGIC ALIGNED ✅ may be issued only when:

- every finalized requirement is PASS,
- no finalized item remains NOT VERIFIED,
- all prohibited/superseded behavior is confirmed absent,
- and no unresolved blocking regression remains.

### A. Authority and Architecture

- [ ] A-01 FINAL_LOGIC_SPEC.md is the highest current authority for product logic.
- [ ] A-02 Compatible finalized requirements from other canonical specs remain valid when not superseded.
- [ ] A-03 Existing code is implementation evidence, not requirements authority.
- [ ] A-04 Provisional AI choices do not become user-finalized requirements merely because they are implemented.
- [ ] A-05 No implementation invents formulas, identities, lifecycle states, destructive behavior, persistence, or approval flows absent from requirements.
- [ ] A-06 Reference, Current, and Custom use one canonical dataset shape: META / BOM / WORK_CENTER / ROUTING.
- [ ] A-07 One shared Standard Cost engine is used across Master Data, CBD, and Parameter Simulation.
- [ ] A-08 No parallel/competing calculation engine is introduced.
- [ ] A-09 Comparison semantics remain distinct from Master Data workspace semantics: CBD is Ref/Cur; Custom is a Master Data workspace, not a CBD side.

### B. Shared Calculation and Identity Rules

- [ ] B-01 BOM identity = Name.
- [ ] B-02 Work Center identity = WC.
- [ ] B-03 Routing identity = Process.
- [ ] B-04 Display #, row position, array index, sequence, and visual order are never business identities.
- [ ] B-05 Duplicate identity creates a warning; no guessed match.
- [ ] B-06 Missing identity creates a warning; no guessed match.
- [ ] B-07 Note-only differences do not make a record CHANGED.
- [ ] B-08 Only comparison statuses are UNCHANGED, CHANGED, ADDED, REMOVED.
- [ ] B-09 No MODIFIED, REPLACE, NEED REVIEW, or equivalent comparison status.
- [ ] B-10 Status and Gap remain independent.
- [ ] B-11 A CHANGED record may have positive, zero, negative, or unavailable Gap.
- [ ] B-12 Material row cost = Usage × Price × (1 + Loss).
- [ ] B-13 Direct Material = sum of valid material row costs.
- [ ] B-14 Routing Factor = Manning / (Capacity × Yield).
- [ ] B-15 Labor = Routing Factor × Work Center Labor Rate.
- [ ] B-16 Burden = Routing Factor × Work Center Burden Rate.
- [ ] B-17 Conversion = Labor + Burden.
- [ ] B-18 Standard Cost = Material + Labor + Burden.
- [ ] B-19 Conversion is a subtotal and is never double-counted.
- [ ] B-20 Missing/invalid required input makes affected result unavailable.
- [ ] B-21 Missing input is never silently converted to zero.
- [ ] B-22 Explicit numeric zero remains valid when logically/mathematically valid.
- [ ] B-23 Capacity ≤ 0 produces unavailable affected calculation.
- [ ] B-24 Yield ≤ 0 produces unavailable affected calculation.
- [ ] B-25 Missing/duplicate Work Center reference produces unavailable affected processing calculation.
- [ ] B-26 Material/Labor/Burden reconcile to Standard Cost.
- [ ] B-27 Record-level effects reconcile to parent/total Gap where calculation is available.

### C. Master Data Workspace Model

- [ ] C-01 Three independent datasets exist: Reference / Current / Custom.
- [ ] C-02 Reference is CBD reference state.
- [ ] C-03 Current is CBD operational/current state.
- [ ] C-04 Custom has no hard-coded semantic meaning.
- [ ] C-05 Custom is not inherently Trial.
- [ ] C-06 Custom is not inherently Simulation.
- [ ] C-07 Custom is not inherently Proposal/Future/Approved.
- [ ] C-08 All three datasets use the same canonical schema.
- [ ] C-09 Each dataset has independent Working state.
- [ ] C-10 Each dataset has independent Last Saved state.
- [ ] C-11 Dataset Working states do not leak into each other.
- [ ] C-12 Fresh session opens an empty Master Data workspace.
- [ ] C-13 No mandatory startup wizard.
- [ ] C-14 No separate mandatory Product selector.
- [ ] C-15 First Master Data entry defaults to All Tables.
- [ ] C-16 All Tables order is BOM → Work Centers → Routing.
- [ ] C-17 Dataset preparation order itself is unrestricted.
- [ ] C-18 Master Data Working data may be used for comparison without requiring Save/Export/activation.
- [ ] C-19 Master Data data does not persist as permanent DB/history/version state across application restart.

### D. Master Data Actions

- [ ] D-01 Save affects only viewed dataset.
- [ ] D-02 Save copies Working → Last Saved.
- [ ] D-03 Save does not alter other datasets.
- [ ] D-04 Reset affects only viewed dataset.
- [ ] D-05 Reset restores Working ← Last Saved.
- [ ] D-06 Import affects only viewed dataset Working.
- [ ] D-07 Import does not automatically overwrite Last Saved.
- [ ] D-08 Import initializes Sizing counts from imported row counts.
- [ ] D-09 Export uses Last Saved only.
- [ ] D-10 Unsaved Working edits are not exported.
- [ ] D-11 Clear affects only viewed Working dataset.
- [ ] D-12 Clear removes Working metadata, Dataset Remark, rows, and Sizing.
- [ ] D-13 Clear retains Last Saved.
- [ ] D-14 Clear leaves other datasets untouched.

### E. Generic Clone From

- [ ] E-01 Action wording/concept is generic Clone From.
- [ ] E-02 Viewed/active dataset is destination.
- [ ] E-03 User chooses source.
- [ ] E-04 Source Working is copied into destination Working.
- [ ] E-05 Destination Last Saved is not overwritten.
- [ ] E-06 Source dataset is not mutated.
- [ ] E-07 Source sizing/structure is copied appropriately.
- [ ] E-08 Destination readiness is recalculated from copied content.
- [ ] E-09 Readiness is not blindly inherited from source flag.
- [ ] E-10 Populated destination replacement requires confirmation.
- [ ] E-11 Reference ← Current works.
- [ ] E-12 Reference ← Custom works.
- [ ] E-13 Current ← Reference works.
- [ ] E-14 Current ← Custom works.
- [ ] E-15 Custom ← Reference works.
- [ ] E-16 Custom ← Current works.
- [ ] E-17 Source = destination is not offered/performed.
- [ ] E-18 No Promote Trial action.
- [ ] E-19 No Approve Trial action.
- [ ] E-20 No Set Scenario as Current action.
- [ ] E-21 Making Custom become Current is done by viewing Current → Clone From Custom.

### F. Master Data Structural Editing and Sizing

- [ ] F-01 Structural additions belong to Master Data.
- [ ] F-02 Structural deletions belong to Master Data.
- [ ] F-03 Row-count changes belong to Master Data Sizing.
- [ ] F-04 Reordering belongs to Master Data.
- [ ] F-05 Custom can be used to prepare structural alternatives.
- [ ] F-06 Sizing covers BOM / WC / Routing independently.
- [ ] F-07 Fresh workspace counts are unset.
- [ ] F-08 Explicit Sizing minimum is 1 per configured table.
- [ ] F-09 Applying a count produces exactly that row count.
- [ ] F-10 Increasing appends blank rows.
- [ ] F-11 Decreasing truncates from end.
- [ ] F-12 Truncated populated data is actually removed.
- [ ] F-13 Direct row add/delete keeps configured count synchronized.
- [ ] F-14 Deleting all rows returns count to unset.
- [ ] F-15 Blank identity rows receive blank-placeholder ordinal behavior.
- [ ] F-16 Placeholder ordinal is distinct from display #.
- [ ] F-17 Placeholder ordinal is not business identity.
- [ ] F-18 Blank placeholder row remains incomplete/missing.
- [ ] F-19 Blank placeholder rows are excluded from cost calculation.

### G. Workbook / Excel Round-Trip

- [ ] G-01 Workbook has exactly four sheets.
- [ ] G-02 Sheet order = META / BOM / WORK_CENTER / ROUTING.
- [ ] G-03 No separate calculation sheet.
- [ ] G-04 META inputs: Product Name / UOM / Selling Price / SG&A % / Dataset Remark.
- [ ] G-05 META outputs: MAT / Labor / Burden / Standard Cost / SG&A Amount / OP.
- [ ] G-06 META output cells use Excel formulas.
- [ ] G-07 Formula cells contain explanatory Excel Notes.
- [ ] G-08 Incomplete/invalid required sources make workbook calculated output blank, not fabricated zero.
- [ ] G-09 Explicit zero remains valid.
- [ ] G-10 SG&A percentage workbook semantics preserve entered percentage points (8 = 8%).
- [ ] G-11 SG&A formula divides percentage points by 100 correctly.
- [ ] G-12 Negative OP remains valid in workbook.
- [ ] G-13 Import reads META inputs only.
- [ ] G-14 Imported formula outputs are not trusted as source values.
- [ ] G-15 Application recalculates imported data through shared engine.
- [ ] G-16 BOM columns = Name / Usage / Unit / Price / Loss / Note.
- [ ] G-17 WC columns = WC / Labor / Burden / Note.
- [ ] G-18 Routing columns = Process / WC / Manning / Cap / Yield / Note.
- [ ] G-19 Note round-trips.
- [ ] G-20 Dataset Remark round-trips.
- [ ] G-21 Note/Remark are not identities.
- [ ] G-22 Note/Remark are not calculation inputs.
- [ ] G-23 Workbook headers use agreed dark/bold-white presentation.
- [ ] G-24 Editable workbook cells use yellow.
- [ ] G-25 META calculated cells use light gray.
- [ ] G-26 Unused cells remain white.
- [ ] G-27 No workbook color legend/instruction prose/example rows/extra source columns.

### H. Master Data Spreadsheet Interaction

- [ ] H-01 View Mode is read-only.
- [ ] H-02 Edit Mode supports direct cell editing.
- [ ] H-03 Arrow-key navigation works.
- [ ] H-04 Enter moves down.
- [ ] H-05 Shift+Enter moves up.
- [ ] H-06 Tab moves right.
- [ ] H-07 Shift+Tab moves left.
- [ ] H-08 Escape cancels/exits editing appropriately.
- [ ] H-09 Ctrl/Cmd+C copy works.
- [ ] H-10 Ctrl/Cmd+V paste works.
- [ ] H-11 Tabular/multi-cell spreadsheet paste works.
- [ ] H-12 Invalid pasted cells are identified locally rather than failing whole page.
- [ ] H-13 Undo works at page-level Working-state scope.
- [ ] H-14 Redo works.
- [ ] H-15 Undo/Redo spans all Master Data tables.
- [ ] H-16 Same-column bulk editing works for selected rows.
- [ ] H-17 # selects rows.
- [ ] H-18 Shift+click contiguous selection works.
- [ ] H-19 Ctrl/Cmd+click non-contiguous selection works.
- [ ] H-20 Drag row-header selection works if current accepted behavior implements it.
- [ ] H-21 Selection and reorder are separate interactions.
- [ ] H-22 Reorder handle is separate/rightmost after Actions.
- [ ] H-23 Selected rows reorder together preserving source order.
- [ ] H-24 Reordering does not itself make record CHANGED.
- [ ] H-25 Search is the only Master Data query/filter control.
- [ ] H-26 Search affects presentation only.
- [ ] H-27 Routing WC input assists typo prevention.
- [ ] H-28 Validation is local/non-blocking.
- [ ] H-29 Cell-level invalid cues remain available.
- [ ] H-30 Warning prose/count badges stay out of dense Master Data rows.
- [ ] H-31 Dataset-level notices appear outside tables.
- [ ] H-32 Same-session navigation preserves selected dataset / View-Edit mode / table view.

### I. Cost Breakdown Core

- [ ] I-01 CBD compares Reference vs Current only.
- [ ] I-02 Custom cannot be selected directly as CBD side.
- [ ] I-03 Ref and Cur are calculated independently before comparison.
- [ ] I-04 Different structures/row counts are supported.
- [ ] I-05 Gap = Current − Reference.
- [ ] I-06 Positive Gap means Current higher cost.
- [ ] I-07 Negative Gap means Current lower cost.
- [ ] I-08 Zero Gap remains valid.
- [ ] I-09 ADDED absent Reference contribution = 0.
- [ ] I-10 REMOVED absent Current contribution = 0.
- [ ] I-11 Absent-record zero never converts missing input inside existing row to zero.
- [ ] I-12 UNCHANGED records remain available in normal comparison data.
- [ ] I-13 CBD status filter supports All / Changed / Added / Removed / Unchanged.
- [ ] I-14 All is default.
- [ ] I-15 Processing calculates each side using that side’s Routing + WC rates.
- [ ] I-16 Processing aggregates by Work Center for context.
- [ ] I-17 WC Net Gap = Current WC total − Reference WC total.
- [ ] I-18 One-to-one Process matching is not required to compute WC aggregate.
- [ ] I-19 Process remains drill-down detail.
- [ ] I-20 WC remains calculation/rate context, not Candidate.
- [ ] I-21 WC rate changes can make dependent Process CHANGED.
- [ ] I-22 Record/WC details show Reference → Current explanatory changes.
- [ ] I-23 No unsupported field-level monetary attribution.
- [ ] I-24 Unreconcilable/missing calculation detail shows unavailable/validation instead of guessing.
- [ ] I-25 Result → Cause → Detail direction is preserved.
- [ ] I-26 Duplicate top warning banner remains removed.
- [ ] I-27 CBD warnings use collapsed Review warnings (N) disclosure.

### J. Selected Comparison

- [ ] J-01 Full Comparison is default.
- [ ] J-02 Selected Comparison is temporary analysis scope.
- [ ] J-03 Selection applies to BOM and Routing.
- [ ] J-04 All WCs remain available as calculation context.
- [ ] J-05 Matched CHANGED/UNCHANGED records are selected as Ref/Cur pair.
- [ ] J-06 ADDED records can be selected independently.
- [ ] J-07 REMOVED records can be selected independently.
- [ ] J-08 Selected mode shows only selected findings.
- [ ] J-09 Selected mode shows only selected-scope Gap.
- [ ] J-10 Full Gap is not displayed as competing active result while selected scope is active.
- [ ] J-11 Selected Comparison does not mutate Ref/Cur.
- [ ] J-12 Selected Comparison is not saved.
- [ ] J-13 Selected Comparison is not exported.
- [ ] J-14 Selected Comparison is not versioned.
- [ ] J-15 Selected Comparison does not persist across app restart.
- [ ] J-16 Clearing scope returns Full Comparison.
- [ ] J-17 Actual Ref/Cur source change invalidates Selected Comparison.
- [ ] J-18 Selected Comparison may constrain Candidate pool.
- [ ] J-19 Selected Comparison is not a dataset.
- [ ] J-20 Selected Comparison is not an RCA Case.
- [ ] J-21 Selected Comparison does not lock RCA.
- [ ] J-22 Selected Comparison does not lock Simulation.
- [ ] J-23 Active Selected Scope ends when entering RCA or Simulation.
- [ ] J-24 RCA/SIM may retain origin context only, never active selected-scope behavior.

### K. Candidate Prioritization

- [ ] K-01 Candidate pool derives from active Full/Selected CBD scope.
- [ ] K-02 Candidate statuses are CHANGED / ADDED / REMOVED only.
- [ ] K-03 UNCHANGED does not become Candidate.
- [ ] K-04 Material Candidate = BOM record.
- [ ] K-05 Processing Candidate = Process/Routing record.
- [ ] K-06 Work Center is never a Candidate.
- [ ] K-07 Each Process is one processing Candidate.
- [ ] K-08 Process is not split into Labor Candidate + Burden Candidate.
- [ ] K-09 Material Candidate exposes record-level Ref / Current / Gap.
- [ ] K-10 Changed Price/Usage/Loss remain explanatory details.
- [ ] K-11 No fabricated per-factor THB allocation.
- [ ] K-12 Whole record Gap is not repeated as fake Price/Usage/Loss contribution.
- [ ] K-13 Zero-gap CHANGED remains visible.
- [ ] K-14 Positive Gap Candidate remains visible.
- [ ] K-15 Negative Gap Candidate remains visible.
- [ ] K-16 Ranking uses signed Gap descending.
- [ ] K-17 Ranking does not use absolute Gap.
- [ ] K-18 Rank #1 is never auto-selected.
- [ ] K-19 Ranking is advisory only.
- [ ] K-20 Controllable defaults true.
- [ ] K-21 Unchecking Controllable does not hide/delete Candidate.
- [ ] K-22 Candidate filtering is by status only.
- [ ] K-23 All status filter is default.
- [ ] K-24 CHANGED/ADDED/REMOVED combinations are selectable.
- [ ] K-25 No material/processing filter is introduced as business requirement.
- [ ] K-26 No controllability filter is introduced.
- [ ] K-27 No cost-direction filter is introduced.
- [ ] K-28 No requirement-fit/feasibility filter is introduced.
- [ ] K-29 ADDED is not automatically labeled bad.
- [ ] K-30 REMOVED is not automatically labeled good.

### L. RCA Case

- [ ] L-01 RCA Case supports exactly 1 or multiple Candidates.
- [ ] L-02 Multi-Candidate structural event can be one RCA Case.
- [ ] L-03 Root Cause / Why? is stored at Case level.
- [ ] L-04 Action is stored at Case level.
- [ ] L-05 Root Cause/Action are not duplicated per Candidate.
- [ ] L-06 No new Candidate Note system.
- [ ] L-07 No new RCA Note system.
- [ ] L-08 No new Bulk Note system.
- [ ] L-09 Master Data Note/Remark remains separate.
- [ ] L-10 RCA completion = Candidate(s) + Root Cause + Action.
- [ ] L-11 Simulation is not required to complete RCA.
- [ ] L-12 Trial is not required to complete RCA.
- [ ] L-13 Approval/promotion is not required to complete RCA.
- [ ] L-14 RCA Case is not a dataset.
- [ ] L-15 Selected Comparison is not converted into RCA Case.
- [ ] L-16 Legacy single-Candidate RCA data is handled without inventing new business semantics.

### M. RCA → Simulation Handoff

- [ ] M-01 Simulation can still be opened independently without RCA.
- [ ] M-02 User can explicitly proceed from active RCA Case to Simulation.
- [ ] M-03 RCA Case context is carried on this handoff.
- [ ] M-04 One-Candidate Case context is supported.
- [ ] M-05 Multi-Candidate Case context is supported.
- [ ] M-06 Latest Root Cause/Action draft is not silently lost during handoff.
- [ ] M-07 Current is natural/default source when entering from Ref-vs-Cur RCA.
- [ ] M-08 Reference remains available.
- [ ] M-09 Custom remains available.
- [ ] M-10 RCA Candidate context is not a hard Simulation scope.
- [ ] M-11 Additional Material factors remain selectable.
- [ ] M-12 Additional Process factors remain selectable.
- [ ] M-13 Candidate preselection/highlight is optional, not mandatory.
- [ ] M-14 If Candidate→Factor mapping is used, ambiguous mapping must not be guessed.
- [ ] M-15 Proceeding to Simulation does not retroactively make Simulation mandatory for RCA.
- [ ] M-16 Entering Simulation directly must not incorrectly inherit stale RCA context from an unrelated prior handoff.
- [ ] M-17 RCA context must not leak across different product sessions.
- [ ] M-18 Leaving/re-entering Simulation follows a deterministic RCA-context lifecycle.

### N. Parameter Simulation Core

- [ ] N-01 Simulation is an independent module.
- [ ] N-02 Parameter Simulation can be used without RCA.
- [ ] N-03 Start SIM From Reference works.
- [ ] N-04 Start SIM From Current works.
- [ ] N-05 Start SIM From Custom works.
- [ ] N-06 Starting SIM copies selected source into isolated temporary SIM state.
- [ ] N-07 Parameter edits never mutate source Master Data.
- [ ] N-08 SIM structure is locked.
- [ ] N-09 SIM cannot Add rows.
- [ ] N-10 SIM cannot Delete rows.
- [ ] N-11 SIM cannot Resize tables.
- [ ] N-12 SIM cannot perform split/merge structural operations.
- [ ] N-13 Structural alternatives must be prepared in Master Data/Custom first.
- [ ] N-14 Primary Parameter comparison is Current vs SIM regardless of source.
- [ ] N-15 Saving / pc = Current Standard Cost − SIM Standard Cost.
- [ ] N-16 Gap / pc = SIM Standard Cost − Current Standard Cost.
- [ ] N-17 Missing Current or SIM Standard Cost makes saving unavailable.
- [ ] N-18 Missing values are not converted to zero.
- [ ] N-19 Source/current changes invalidate/reconcile SIM deterministically.
- [ ] N-20 SIM is temporary/session-oriented; no mandatory permanent promotion state.

### O. Current-vs-SIM Record Status and Factors

- [ ] O-01 CHANGED rows are visible.
- [ ] O-02 CHANGED rows are parameter-editable when present in SIM.
- [ ] O-03 UNCHANGED rows are visible.
- [ ] O-04 UNCHANGED rows are parameter-editable.
- [ ] O-05 ADDED rows are visible.
- [ ] O-06 ADDED rows are parameter-editable.
- [ ] O-07 REMOVED rows remain visible.
- [ ] O-08 REMOVED rows are not editable.
- [ ] O-09 REMOVED rows still affect Current-vs-SIM Gap.
- [ ] O-10 Factor = Material/Process business record, not global parameter type.
- [ ] O-11 Multiple Material/Process Factors may be selected.
- [ ] O-12 Selected Factor controls edit-control visibility only.
- [ ] O-13 Factor selection does not reduce calculation scope.
- [ ] O-14 Every edit recalculates the full SIM dataset.
- [ ] O-15 Selected BOM Factor exposes Price.
- [ ] O-16 Selected BOM Factor exposes Usage/Consumption.
- [ ] O-17 Selected BOM Factor exposes Loss.
- [ ] O-18 Selected Routing Factor exposes Manning.
- [ ] O-19 Selected Routing Factor exposes Capacity.
- [ ] O-20 Selected Routing Factor exposes Yield.
- [ ] O-21 Work Center Labor Rate is not SIM-editable.
- [ ] O-22 Work Center Burden Rate is not SIM-editable.
- [ ] O-23 Selling Price is not a BOM/Routing Factor.
- [ ] O-24 SG&A is not a BOM/Routing Factor.
- [ ] O-25 Legacy parameter-type factor selection is not misinterpreted as record selection.

### P. Economic Simulation

- [ ] P-01 Simulation supports Parameter-only mode.
- [ ] P-02 Simulation supports Economic-only mode.
- [ ] P-03 Simulation supports combined mode.
- [ ] P-04 Economic-only works without starting Parameter SIM.
- [ ] P-05 Economic input = Action Cost.
- [ ] P-06 Economic input = Evaluation Quantity.
- [ ] P-07 Required Saving / pc = Action Cost / Evaluation Quantity.
- [ ] P-08 Invalid/non-finite Action Cost does not fabricate output.
- [ ] P-09 Invalid/non-finite Quantity does not fabricate output.
- [ ] P-10 Quantity ≤ 0 cannot be used for division and yields warning/unavailable result.
- [ ] P-11 Economic Simulation has no duplicate Manning/Price/etc. parameter editor.
- [ ] P-12 Action Cost does not alter Material.
- [ ] P-13 Action Cost does not alter Labor.
- [ ] P-14 Action Cost does not alter Burden.
- [ ] P-15 Action Cost does not alter Conversion.
- [ ] P-16 Action Cost does not alter Standard Cost.
- [ ] P-17 Economic-only mode does not fabricate Parameter Saving.
- [ ] P-18 Economic-only mode does not fabricate Economic Margin requiring Parameter Saving.
- [ ] P-19 Starting Parameter SIM after Economic-only preserves Economic inputs unless explicit reset semantics say otherwise.
- [ ] P-20 Combined Parameter Saving = Current STD − SIM STD.
- [ ] P-21 Combined Economic Margin = Parameter Saving − Required Saving.
- [ ] P-22 Positive margin remains visible.
- [ ] P-23 Zero margin remains visible.
- [ ] P-24 Negative margin remains visible.
- [ ] P-25 Economic result is advisory only.
- [ ] P-26 Below-break-even does not disable/block scenario.
- [ ] P-27 No approval gate is inferred from Economic Margin.
- [ ] P-28 UI/copy does not encourage double-counting an already-modeled Parameter effect as Action Cost.

### Q. Selling Price / SG&A / OP

- [ ] Q-01 Selling Price override is supported in Simulation.
- [ ] Q-02 SG&A % override is supported in Simulation.
- [ ] Q-03 Blank Selling Price override falls back to Current.
- [ ] Q-04 Blank SG&A override falls back to Current.
- [ ] Q-05 SG&A Amount / pc = Selling Price × SG&A %.
- [ ] Q-06 Percentage representation is converted correctly.
- [ ] Q-07 OP / pc = Selling Price − Standard Cost − SG&A Amount.
- [ ] Q-08 Negative OP is valid and displayed.
- [ ] Q-09 Zero OP is valid.
- [ ] Q-10 Commercial overrides do not alter Standard Cost.
- [ ] Q-11 Commercial fields remain conceptually separate from physical Parameter factors.

### R. Simulation Story / Result Presentation Requirements

- [ ] R-01 Result overview is integrated into Simulation rather than separate mandatory Dashboard workflow.
- [ ] R-02 Result → Cause → Detail direction is preserved.
- [ ] R-03 Simulation story supports Reference → Current → Simulated.
- [ ] R-04 Story uses settled Material/Labor/Burden data only.
- [ ] R-05 Selling Price may be shown as agreed graph/business context when available.
- [ ] R-06 No invented monthly/history interpretation.
- [ ] R-07 No invented variance categories.
- [ ] R-08 Exact scenario count is not forced to A/B.
- [ ] R-09 Single scenario is allowed.
- [ ] R-10 A/B may be supported as optional UI choice.
- [ ] R-11 Multiple scenarios may be supported if implementation chooses, but are not required.
- [ ] R-12 Story/result does not imply Trial/approval/promotion.

### S. Shared Status / Context

- [ ] S-01 Ready for comparison state is represented.
- [ ] S-02 Product Mismatch is informational/non-blocking.
- [ ] S-03 Missing data state is represented.
- [ ] S-04 Active Selected Comparison is recognizable while it applies.
- [ ] S-05 Status cue links/actions may direct user to useful review page.
- [ ] S-06 Status normally does not block navigation.
- [ ] S-07 Only logically impossible operations are disabled.
- [ ] S-08 Active Selected Comparison status ends at RCA/Simulation boundary.
- [ ] S-09 Validation warning and comparison status remain separate concepts.

### T. Navigation and Cross-Flow State

- [ ] T-01 Master Data → CBD uses current Ref/Cur Working state.
- [ ] T-02 CBD → Candidate preserves correct Full/Selected Candidate pool.
- [ ] T-03 Candidate → RCA preserves selected Candidate identities.
- [ ] T-04 RCA → Simulation follows Section M.
- [ ] T-05 Direct navigation → Simulation remains standalone.
- [ ] T-06 Economic-only → Parameter+Economic transition is valid.
- [ ] T-07 Parameter-only mode remains valid.
- [ ] T-08 Navigation away from and back to active SIM follows explicit temporary-session behavior.
- [ ] T-09 Reload behavior matches chosen session-memory implementation without creating permanent persistence.
- [ ] T-10 Product switching does not leak Simulation state/context to another product.
- [ ] T-11 Product switching does not leak RCA context.
- [ ] T-12 Master Data source changes invalidate dependent Selected Comparison correctly.
- [ ] T-13 Master Data source changes reconcile/invalidate dependent Simulation correctly.
- [ ] T-14 SIM Reset clears intended Simulation state without mutating Master Data.
- [ ] T-15 Direct Simulation entry after a previous RCA handoff does not unintentionally reuse stale RCA-only context.
- [ ] T-16 Old legacy stored state is safely sanitized/migrated when incompatible.

### U. Explicitly Superseded / Forbidden Active Behavior

The following must be absent from active product logic:

- [ ] U-01 No dedicated Trial tab.
- [ ] U-02 No formal Trial lifecycle.
- [ ] U-03 No Scenario → Trial → Approve → Promote flow.
- [ ] U-04 No Promote Trial.
- [ ] U-05 No Mark Scenario for Trial.
- [ ] U-06 No forced Ref → Cur → SIM → Trial lifecycle.
- [ ] U-07 No mandatory RCA → Simulation.
- [ ] U-08 No Simulation auto-becoming Master Data.
- [ ] U-09 No RCA Case treated as dataset.
- [ ] U-10 No Selected Comparison treated as RCA Case.
- [ ] U-11 No Candidate/RCA duplicate note systems.
- [ ] U-12 No structural Add/Delete/Resize in SIM.
- [ ] U-13 No SIM Labor Rate editing.
- [ ] U-14 No SIM Burden Rate editing.
- [ ] U-15 No Action Cost allocation into MAT/LB/BD/STD.
- [ ] U-16 No duplicate Economic parameter editor.
- [ ] U-17 No requirement that Economic Simulation exists outside the Simulation module.
- [ ] U-18 No special save/set/promote scenario lifecycle.
- [ ] U-19 No generic arbitrary CBD pairwise comparator.
- [ ] U-20 No use of Dataset Remark as dataset display name.
- [ ] U-21 No forced Reference as ultimate optimization target.
- [ ] U-22 No exactly-one-Candidate RCA restriction.
- [ ] U-23 No mandatory exactly-A/B scenario architecture.
- [ ] U-24 No absolute-Gap Candidate ranking.
- [ ] U-25 No MatVAR.
- [ ] U-26 No LBVAR.
- [ ] U-27 No BDVAR.
- [ ] U-28 No unapproved COGS / GP / GP Margin / OP Margin / Sales / historical time-series formulas as active product logic.

### V. Compatible UI/Interaction Preservation Gate

These are preserved behaviors/directions, but exact styling remains outside the logic-completion decision unless behavior regresses.

- [ ] V-01 Engineering/industrial-console information-density direction is preserved.
- [ ] V-02 Existing accepted layout/interaction behavior is not unnecessarily redesigned during logic fixes.
- [ ] V-03 Master Data toolbar + metadata remain logically grouped.
- [ ] V-04 Footer remains part of shared application frame.
- [ ] V-05 Footer styling/viewport behavior is deferred to dedicated frontend/UI pass.
- [ ] V-06 Old CB, Product Cost Analysis, and Workspace chrome is not reintroduced.
- [ ] V-07 Numeric values retain units and tabular/readable presentation.
- [ ] V-08 Comparison status is not communicated by color alone.
- [ ] V-09 Web editable cells do not copy Excel-yellow convention.
- [ ] V-10 Human visual acceptance remains a later checkpoint and is not falsely treated as completed logic verification.

### W. Final Verification / Evidence Gate

Before issuing FINAL LOGIC ALIGNED ✅:

- [ ] W-01 Every finalized requirement above has explicit Spec Evidence.
- [ ] W-02 Every implemented requirement has Code Evidence.
- [ ] W-03 Every critical requirement has automated Test Evidence where reasonably testable.
- [ ] W-04 Any manual-only requirement is explicitly labeled and manually verified rather than silently assumed.
- [ ] W-05 Core calculation engine tests pass.
- [ ] W-06 Master Data lifecycle tests pass.
- [ ] W-07 Clone From all-direction tests pass.
- [ ] W-08 Workbook round-trip/formula tests pass.
- [ ] W-09 CBD identity/status/reconciliation tests pass.
- [ ] W-10 Selected Comparison lifecycle tests pass.
- [ ] W-11 Candidate ranking/filter/controllability tests pass.
- [ ] W-12 Single- and multi-Candidate RCA tests pass.
- [ ] W-13 RCA completion-without-SIM test passes.
- [ ] W-14 RCA→SIM handoff tests pass.
- [ ] W-15 Standalone SIM tests pass.
- [ ] W-16 Ref/Cur/Custom Start SIM tests pass.
- [ ] W-17 Current-vs-SIM status/editability tests pass.
- [ ] W-18 Factor-record selection tests pass.
- [ ] W-19 Full-dataset recalculation tests pass.
- [ ] W-20 Economic-only tests pass.
- [ ] W-21 Combined Economic Margin tests pass.
- [ ] W-22 Action Cost isolation-from-Standard-Cost test passes.
- [ ] W-23 Selling Price / SG&A / OP tests pass.
- [ ] W-24 Cross-navigation/state-leak tests pass.
- [ ] W-25 Legacy/superseded active-string/code scan passes.
- [ ] W-26 TypeScript typecheck passes.
- [ ] W-27 Production build passes.
- [ ] W-28 git diff --check passes.
- [ ] W-29 Full baseline→HEAD diff is reviewed for unrelated/regressive changes.
- [ ] W-30 Known warnings/limitations are documented honestly.
- [ ] W-31 No finalized requirement remains NOT VERIFIED.
- [ ] W-32 No open finding remains.
- [ ] W-33 Only after W-01…W-32 are satisfied may reviewer issue FINAL LOGIC ALIGNED ✅.
