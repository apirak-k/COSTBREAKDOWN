# Final Logic Implementation Plan

> This plan is an execution guide. Canonical product requirements remain under `docs/REQUIREMENTS_INDEX.md` and `docs/specs/`.

## Goal

Align the implementation with the user-finalized COSTBREAKDOWN logic while preserving compatible UX/UI requirements, then verify, commit each completed phase, update the handoff, and push `codex/final-logic-implementation`.

## Branch and baseline

- Target branch: `codex/final-logic-implementation`
- Baseline: `665099b71319ec98c537a0859336dc01b9acc118`
- Source documentation branch: `codex/costbreakdown-spec-source` (read-only for this task)
- Worktree: `.worktrees/codex-final-logic-implementation`

## Next Step

Inspect the Master Data model, state, actions, and callers for Phase 1.

## Current Phase

Phase 1 — Master Data domain model

## Phases

### Phase 0 — Baseline verification
- [x] Verify baseline SHA, source branch, remotes, and worktree state.
- [x] Read repository instructions and canonical specs.
- [x] Run baseline build and relevant verification/workbook checks.
- [x] Record pre-existing warnings/failures.
- [x] Commit planning/baseline setup only.
- **Status:** complete

### Phase 1 — Master Data domain model
- [ ] Add independent Custom Working/Last Saved/sizing/history/import-export support.
- [ ] Preserve Reference/Current comparison-role semantics and CBD readiness.
- [ ] Verify compatibility and commit this phase.
- **Status:** in_progress

### Phase 2 — Complete Custom Master Data behavior
- [ ] Support Save, Reset, Clear, Sizing, Import/Export, editing, ordering, and Undo/Redo for Custom.
- [ ] Verify and commit this phase.
- **Status:** pending

### Phase 3 — Master Data UI and generic Clone From
- [ ] Expose Reference, Current, and Custom.
- [ ] Implement active destination / user-selected source Clone From behavior for valid pairs.
- [ ] Verify and commit this phase.
- **Status:** pending

### Phase 4 — CBD preservation gate
- [ ] Verify Reference-vs-Current-only behavior and source fingerprint isolation from Custom.
- [ ] Commit only if a required code change is needed; otherwise record verification evidence.
- **Status:** pending

### Phase 5 — Multi-Candidate RCA domain
- [ ] Add stable RCA Case identity and one-or-many Candidate membership with case-level Root Cause and Action.
- [ ] Migrate compatible legacy RCA records when safe.
- [ ] Verify and commit this phase.
- **Status:** pending

### Phase 6 — Candidate and RCA workflow
- [ ] Select one or multiple Candidates into an RCA Case; preserve advisory ranking and complete RCA without Simulation.
- [ ] Verify and commit this phase.
- **Status:** pending

### Phase 7 — Independent Simulation module
- [ ] Add independent temporary Simulation state, Start SIM From Reference/Current/Custom, and remove RCA/A-B dependencies.
- [ ] Verify isolation and commit this phase.
- **Status:** pending

### Phase 8 — Parameter Simulation engine
- [ ] Reuse the shared full-snapshot calculation/comparison engine; lock structure and allow only finalized parameter factors.
- [ ] Verify full recalculation, statuses, and saving; commit this phase.
- **Status:** pending

### Phase 9 — Parameter Simulation UI
- [ ] Expose source, Current comparison, factors, editable values, live results, and statuses without WC-rate or structural editing.
- [ ] Verify and commit this phase.
- **Status:** pending

### Phase 10 — Independent Economic Simulation
- [ ] Implement Action Cost, Evaluation Quantity, Required Saving/pc, and advisory combined Economic Margin without changing Standard Cost.
- [ ] Preserve Selling Price, SG&A, and negative OP formulas.
- [ ] Verify and commit this phase.
- **Status:** pending

### Phase 11 — Retire superseded active logic and final verification
- [ ] Remove unused active A/B, Trial, single-Candidate RCA, WC-rate Simulation, and categorized economics paths after caller inspection.
- [ ] Run complete relevant verification, workbook checks, build, diff review, and `git diff --check`.
- [ ] Update HANDOFF with evidence, phase commits, limitations, and final alignment status; commit separately.
- [ ] Confirm branch/worktree/history and push normally; do not merge to main or force-push.
- **Status:** pending

## Decisions

| Decision | Rationale |
|---|---|
| Work in a separate worktree on `codex/final-logic-implementation` at the exact supplied baseline. | Protects the documentation branch and pre-existing untracked local materials. |
| Canonical specs override conflicting implementation-plan wording. | `docs/REQUIREMENTS_INDEX.md` and `FINAL_LOGIC_SPEC.md` define product behavior; this plan only orders execution. |
| A phase with no necessary code change may be verification-only. | Avoids artificial source changes while retaining phase-level evidence. |

## Errors Encountered

| Error | Attempt | Resolution |
|---|---:|---|
| Initial PowerShell parsing of an unquoted Git revision expression failed. | 1 | Quoted the revision expression; verified the baseline SHA and branch state successfully. |
