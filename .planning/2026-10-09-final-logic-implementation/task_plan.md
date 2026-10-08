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

Wait for the independent ChatGPT reviewer; if it reports another finding, fix and re-verify that finding before pushing again. Do not begin Footer/frontend styling until the reviewer explicitly says `FINAL LOGIC ALIGNED ✅`.

## Current Phase

Phase 13 — Add the RCA → Simulation handoff and await approval

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
