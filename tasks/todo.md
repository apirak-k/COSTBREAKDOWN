# Cost Breakdown Cross-Page Flow Task List

Plan: [`tasks/plan.md`](plan.md)
Spec: [`docs/superpowers/specs/2026-09-22-costbreakdown-cross-page-flow-design.md`](../docs/superpowers/specs/2026-09-22-costbreakdown-cross-page-flow-design.md)

## Phase 1: Active-path foundation

- [x] Task 1: Establish the active driver contract and stable identity
  - Acceptance: Selection and annotations use stable source identity, not rank.
  - Verify: `npm run build` and state-reload/manual identity check.
  - Depends on: None
- [x] Task 2: Return the complete driver finding population
  - Acceptance: All supported findings remain inspectable; Top 10 is not a permanent limit.
  - Verify: `npm run build`, existing calculation checks, and a >10-finding fixture/manual check.
  - Depends on: Task 1

## Checkpoint 1: Calculation foundation

- [x] Build passes
- [x] Existing missing-work-center/cost calculation checks pass
- [ ] Human review confirms full-population Ranking behavior

## Phase 2: Ranking and RCA

- [x] Task 3: Add flexible Ranking views while preserving the old table shell
  - Acceptance: All/category views, sorting, filtering, and existing context work.
  - Verify: `npm run build` and manual browser view checks.
  - Depends on: Tasks 1-2
- [x] Task 4: Add multi-driver selection and controllability persistence
  - Acceptance: Multiple stable selections survive sort/filter changes.
  - Verify: `npm run build` and manual multi-selection check.
  - Depends on: Tasks 1-3
- [x] Task 5: Add an extensible RCA detail path for selected drivers
  - Acceptance: Factor/Root Cause/Action can be recorded for selected drivers.
  - Verify: `npm run build` and manual two-driver RCA check.
  - Depends on: Task 4

## Checkpoint 2: Ranking/RCA behavior

- [x] Build passes
- [x] Multiple categories and multiple selected drivers work
- [ ] Human review confirms the interaction before Simulation work

## Phase 3: Isolated Simulation

- [x] Task 6: Separate Scenario Draft inputs from official Active data
  - Acceptance: What-If edits cannot mutate official source values.
  - Verify: `npm run build`, safety checks, and manual source-immutability check.
  - Depends on: Tasks 1-2
- [x] Task 7: Carry selected Ranking/RCA context into Simulation
  - Acceptance: Simulation uses explicit selection context and preserves scenario drafts.
  - Verify: `npm run build` and manual multi-selection-to-Simulation check.
  - Depends on: Tasks 4-6
- [x] Task 8: Add variable provenance and extensible scenario inputs
  - Acceptance: Supported variables identify source/calculated/override and recalculate dependents.
  - Verify: `npm run build` and manual variable/provenance check.
  - Depends on: Tasks 6-7

## Checkpoint 3: Simulation safety

- [x] Build passes
- [x] Existing Excel/model checks pass
- [x] Scenario immutability and recalculation are demonstrated
- [x] Financial formula decisions are recorded or explicitly deferred

## Phase 4: Regression and handoff

- [x] Task 9: Run end-to-end regression and browser verification
  - Acceptance: Existing flows do not regress and the cross-page flow is evidenced.
  - Verify: `npm run build`, `npm run excel`, relevant verification scripts, and browser walkthrough.
  - Depends on: Tasks 1-8
- [x] Task 10: Update documentation and handoff
  - Acceptance: Docs distinguish implemented, verified, deferred, and human-accepted states.
  - Verify: link/placeholder scan and `git diff --check`.
  - Depends on: Task 9

## Final Checkpoint

- [x] All acceptance criteria are evidenced
- [x] All deferred items and unverified areas are recorded
- [ ] Human acceptance is obtained
