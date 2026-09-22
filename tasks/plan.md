# Implementation Plan: Cost Breakdown Cross-Page Flow

## Overview

Implement the approved cross-page contract in small vertical slices while keeping the existing page shells. The first delivery makes the active `src/state` + `src/core` path truthful and usable for complete Ranking, multi-driver RCA selection, and isolated Simulation scenarios. Financial formulas and detailed status vocabulary remain gated follow-up work until their page/domain decisions are written.

## Source of Truth

- Cross-page contract: [`docs/superpowers/specs/2026-09-22-costbreakdown-cross-page-flow-design.md`](../docs/superpowers/specs/2026-09-22-costbreakdown-cross-page-flow-design.md)
- Page contracts: `docs/specs/master-data.md`, `docs/specs/cost-breakdown.md`, and `docs/specs/cross-cutting-requirements.md`
- Active runtime path: `src/App.tsx` -> `src/state` -> `src/core` -> `src/features`
- Legacy path: `src/lib`; do not modify it unless a dependency check proves it is still a runtime consumer

## Architecture Decisions

1. Candidate Selection remains the Ranking surface; no new top-level page is introduced.
2. Driver rank is presentation state, not a persistence key. Driver identity must remain stable when sorting, filtering, or category views change.
3. Ranking exposes the full available driver population. Any default focus on unfavorable/positive impact must be a view choice, not a permanent calculation truncation.
4. RCA selection is persisted independently from display rank and can contain multiple selected drivers. The first usable RCA record remains extensible rather than forcing a final driver-specific schema.
5. Simulation receives selected driver/RCA context and applies scenario overrides to a draft calculation input. It must not call the existing Active-data mutation path for What-If changes.
6. Additional variables use metadata and provenance (`source`, `calculated`, `override`) so the model can grow without silently dropping unknown values.
7. No new dependency or test framework is introduced without an explicit review. The existing build and verification scripts remain regression gates.

## Implementation Order

### Phase 1: Active-path foundation

#### Task 1: Establish the active driver contract and stable identity

**Description:** Confirm and formalize the `src/core` `CostDriver` contract used by `src/state`. Add or derive a stable driver identity based on source kind and source record identity, not the display rank or driver label. Preserve existing saved controllability/action data during the identity transition.

**Acceptance criteria:**

- [ ] The active path has one documented driver identity used for selection and persistence.
- [ ] Changing sort/filter/order does not reassign a saved annotation to a different driver.
- [ ] The legacy `src/lib` path is not changed unless a verified runtime caller requires it.

**Verification:**

- [ ] `npm run build` succeeds.
- [ ] Manual state reload confirms an annotation remains attached to the same source driver after ranking order changes.

**Dependencies:** None

**Files likely touched:**

- `src/core/types/cost.types.ts`
- `src/core/types/product.types.ts`
- `src/state/store.tsx`

**Estimated scope:** Medium (3 files)

#### Task 2: Return the complete driver finding population

**Description:** Update the active driver calculation so all available BOM and Routing findings are available to the Ranking view at the supported granularity. Remove the permanent Top 10/legacy candidate cap from the active calculation, retain deterministic default ordering, and make the treatment of zero/negative gaps explicit rather than silently discarding them.

**Acceptance criteria:**

- [ ] All supported BOM and Routing driver findings are available to the view.
- [ ] The default ordering remains deterministic and explainable by cost impact.
- [ ] The UI can focus on unfavorable findings without making lower-ranked findings inaccessible.
- [ ] Missing/invalid rate inputs do not create fabricated drivers or fabricated costs.

**Verification:**

- [ ] `npm run build` succeeds.
- [ ] Existing missing-work-center and cost-calculation verification scripts remain passing where applicable.
- [ ] A focused fixture/manual check demonstrates more than ten available findings remain inspectable.

**Dependencies:** Task 1

**Files likely touched:**

- `src/core/calculations/top-drivers.ts`
- `src/core/types/cost.types.ts`
- `src/core/utils/confidence.ts`

**Estimated scope:** Medium (3 files)

### Checkpoint 1: Calculation foundation

- [ ] Tasks 1-2 are complete.
- [ ] `npm run build` passes.
- [ ] Existing snapshot/cost calculation checks still pass.
- [ ] Human review confirms the full-population Ranking behavior before UI work continues.

### Phase 2: Ranking and RCA vertical slice

#### Task 3: Add flexible Ranking views while preserving the old table shell

**Description:** Extend the existing Candidate Selection surface with view state for all findings, category grouping/filtering, and user-selected sort direction/field. Keep current comparison fields and visual density as the baseline; do not redesign the page.

**Acceptance criteria:**

- [ ] The user can view all available drivers or narrow the view by category.
- [ ] Sorting/filtering changes presentation order without changing driver identity or saved annotations.
- [ ] Existing Base/Active, gap, contribution, source, confidence, and controllability context remains visible or reachable.
- [ ] Empty, missing, and no-positive-gap states remain understandable.

**Verification:**

- [ ] `npm run build` succeeds.
- [ ] Manual browser check covers All Categories, one category, changed ordering, empty results, and a missing-data finding.

**Dependencies:** Tasks 1-2

**Files likely touched:**

- `src/features/candidate-selection/CandidateSelectionPage.tsx`
- `src/features/candidate-selection/components/DriversTable.tsx`
- `src/features/candidate-selection/components/DriverRow.tsx`
- `src/state/store.tsx`

**Estimated scope:** Medium (4 files)

#### Task 4: Add multi-driver selection and controllability persistence

**Description:** Add selection state keyed by stable driver identity. Preserve the existing controllability/action annotation behavior, but let the user mark any number of drivers for RCA without coupling selection to rank position.

**Acceptance criteria:**

- [ ] The user can select, deselect, and review multiple drivers.
- [ ] Selection survives sorting and category filtering during the session.
- [ ] Controllable/Uncontrollable remains an explicit human classification and is not inferred as a final RCA result.
- [ ] Selection and annotations are not lost on a normal state reload if the current app persistence contract supports them.

**Verification:**

- [ ] `npm run build` succeeds.
- [ ] Manual browser check selects three drivers, changes sort/category, and confirms the same three remain selected.

**Dependencies:** Tasks 1-3

**Files likely touched:**

- `src/state/store.tsx`
- `src/features/candidate-selection/CandidateSelectionPage.tsx`
- `src/features/candidate-selection/components/DriversTable.tsx`
- `src/features/candidate-selection/components/DriverRow.tsx`

**Estimated scope:** Medium (4 files)

#### Task 5: Add an extensible RCA detail path for selected drivers

**Description:** Add the smallest useful RCA record/detail interaction for selected drivers. Capture the conceptual Factor/Root Cause/Action chain with source/context visibility, while keeping fields optional and extensible until realistic data review determines driver-specific details.

**Acceptance criteria:**

- [ ] A selected driver can be opened for RCA without losing the multi-selection set.
- [ ] The user can record what changed, why it changed, and the proposed action.
- [ ] RCA context retains the selected driver's stable identity and source values.
- [ ] No final status taxonomy or automatic RCA of unselected findings is introduced by this task.

**Verification:**

- [ ] `npm run build` succeeds.
- [ ] Manual browser check records RCA for two selected drivers and returns to the Ranking view without losing selection.

**Dependencies:** Task 4

**Files likely touched:**

- `src/core/types/cost.types.ts`
- `src/core/types/product.types.ts`
- `src/state/store.tsx`
- `src/features/candidate-selection/CandidateSelectionPage.tsx`
- `src/features/candidate-selection/components/` (new focused RCA detail component)

**Estimated scope:** Medium (5 files/areas)

### Checkpoint 2: Ranking/RCA behavior

- [ ] Tasks 3-5 are complete.
- [ ] `npm run build` passes.
- [ ] Manual flow works with multiple categories and multiple selected drivers.
- [ ] Human review confirms the interaction is usable before Simulation changes begin.

### Phase 3: Isolated Simulation vertical slice

#### Task 6: Separate Scenario Draft inputs from official Active data

**Description:** Refactor the active Simulation flow so target changes are held in scenario-local draft state and passed to a pure calculation path. Existing `handleApplyTarget` behavior must no longer write What-If targets into official BOM/Routing Active values.

**Acceptance criteria:**

- [ ] Editing a Scenario does not mutate Product, Reference, Current, Active, or Master Data source values.
- [ ] Scenario results recalculate from the selected driver and draft override.
- [ ] Invalid or missing target values remain visibly invalid instead of becoming invented defaults.
- [ ] Trial validation/promotion is not silently triggered by editing a scenario.

**Verification:**

- [ ] `npm run build` succeeds.
- [ ] Existing missing-work-center and What-If safety checks remain passing where applicable.
- [ ] Manual browser check compares source values before and after editing a scenario and confirms official values are unchanged.

**Dependencies:** Tasks 1-2

**Files likely touched:**

- `src/core/calculations/whatif-simulator.ts`
- `src/state/store.tsx`
- `src/features/rca-simulation/RCASimulationPage.tsx`
- `src/features/rca-simulation/components/SimulationGrid.tsx`

**Estimated scope:** Medium (4 files)

#### Task 7: Carry selected Ranking/RCA context into Simulation

**Description:** Replace the Simulation page's implicit "first controllable driver" default with explicit context from the user's selected driver/RCA set. Retain the existing scenario shell as a starting point and allow the user to review selected drivers without forcing a single-driver requirement at Ranking level.

**Acceptance criteria:**

- [ ] Simulation opens from an explicit selected driver/RCA context or shows a clear empty-selection state.
- [ ] The user can switch among selected drivers without losing scenario drafts unexpectedly.
- [ ] The Simulation view identifies which driver/action the scenario is evaluating.
- [ ] No automatic RCA or automatic promotion is introduced.

**Verification:**

- [ ] `npm run build` succeeds.
- [ ] Manual browser check selects multiple Ranking drivers, enters Simulation, switches context, and verifies the selected action remains understandable.

**Dependencies:** Tasks 4-6

**Files likely touched:**

- `src/state/store.tsx`
- `src/features/rca-simulation/RCASimulationPage.tsx`
- `src/features/rca-simulation/components/DriverSelector.tsx`
- `src/features/rca-simulation/components/ProblemStatementCard.tsx`

**Estimated scope:** Medium (4 files)

#### Task 8: Add variable provenance and extensible scenario inputs

**Description:** Introduce a minimal scenario-variable contract that can represent supported additional variables with stable key, label, type/unit, dependency/formula metadata, and origin. Display source, calculated, and override origins in Simulation. Do not finalize financial formulas that are still deferred.

**Acceptance criteria:**

- [ ] Supported scenario variables have stable identity and user-facing labels.
- [ ] Values identify whether they are source, calculated, or scenario-overridden.
- [ ] Dependent calculations update after a supported override.
- [ ] Unknown/unmapped variables remain visible and reviewable rather than being silently dropped.
- [ ] Sale, COGS, Gross Profit, SG&A, OP, and Profit remain represented as a required capability, but their formulas are gated until the domain decision is written.

**Verification:**

- [ ] `npm run build` succeeds.
- [ ] Manual browser check changes one supported variable and observes the dependent result and origin labels.
- [ ] Formula and unit decisions are recorded before any financial metric calculation is claimed complete.

**Dependencies:** Tasks 6-7

**Files likely touched:**

- `src/core/types/cost.types.ts`
- `src/core/calculations/whatif-simulator.ts`
- `src/features/rca-simulation/components/SimulationGrid.tsx`
- `src/features/rca-simulation/components/ScenarioCard.tsx`

**Estimated scope:** Medium (4 files)

### Checkpoint 3: Simulation safety

- [ ] Tasks 6-8 are complete.
- [ ] `npm run build` passes.
- [ ] Existing Excel/model verification remains passing.
- [ ] Manual source-immutability and scenario-recalculation checks pass.
- [ ] Financial formula decisions are either written into a follow-up spec or explicitly left deferred.

### Phase 4: Regression, acceptance, and handoff

#### Task 9: Run end-to-end regression and browser verification

**Description:** Verify the full flow from Master Data through Cost Breakdown, Ranking/RCA, and isolated Simulation with representative data, including missing/invalid inputs and a multi-category dataset.

**Acceptance criteria:**

- [ ] Existing snapshot import, comparison, export, and missing-rate behavior do not regress.
- [ ] The new flow preserves Product and Reference/Current context between pages.
- [ ] Ranking, RCA, and Simulation success criteria are demonstrated with evidence.
- [ ] Any remaining unverified browser or formula cases are explicitly recorded.

**Verification:**

- [ ] `npm run build`
- [ ] `npm run excel`
- [ ] Relevant existing `scripts/verify_*.ts`/`.js` checks using the repository's available runner
- [ ] Manual browser walkthrough using `npm run dev`

**Dependencies:** Tasks 1-8

**Files likely touched:**

- Focused verification scripts under `scripts/`
- `.planning/2569-09-22-cost-breakdown-cross-page-flow-implement/progress.md`

**Estimated scope:** Medium (verification-focused)

#### Task 10: Update documentation and handoff

**Description:** Update the page-specific specs and Handoff only where implementation changed the confirmed contract. Record test evidence, deferred decisions, risks, and the exact resume point. Do not duplicate the cross-page contract.

**Acceptance criteria:**

- [ ] Cross-page Spec links to the implemented page contracts and remains accurate.
- [ ] Handoff distinguishes implemented, verified, deferred, and human-accepted items.
- [ ] No AI `DONE`/`Verified` statement is used as a substitute for human acceptance.
- [ ] Worktree and commit contents are reviewed before delivery.

**Verification:**

- [ ] Documentation link and placeholder scan passes.
- [ ] `git diff --check` passes.
- [ ] Final status, commit, test outputs, and unverified items are reported.

**Dependencies:** Task 9

**Files likely touched:**

- `docs/superpowers/specs/2026-09-22-costbreakdown-cross-page-flow-design.md`
- Relevant `docs/specs/*.md`
- `HANDOFF_2026-09-22.md`
- `.planning/2569-09-22-cost-breakdown-cross-page-flow-implement/progress.md`

**Estimated scope:** Small/Medium (documentation and handoff)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Two parallel state/calculation paths drift | High | Verify `src/App.tsx` consumers first; implement active `src/state` + `src/core` path; change legacy path only when a verified caller requires it. |
| Removing Top 10 changes percentage and default-view semantics | Medium | Keep default cost-impact ordering, expose full data, and make any positive/unfavorable filter explicit in the view. |
| Rank-based persistence loses annotations after sorting | High | Introduce stable source identity before multi-selection and RCA persistence. |
| Scenario edits mutate Active data | High | Use isolated draft inputs and pure recalculation; add an immutability verification before UI polish. |
| Financial formulas are implemented before definitions are agreed | High | Keep the capability in the contract, but gate formulas/units/input roles behind a later domain decision. |
| Lack of a configured test runner hides logic regressions | Medium | Use `npm run build`, existing verification scripts, focused no-new-dependency checks, and manual browser evidence; ask before adding a runner. |

## Open Questions / Explicit Gates

- Confirm the exact treatment and display of zero/negative driver gaps during Task 2 data review.
- Confirm the minimum RCA persistence shape after the first Ranking/RCA manual checkpoint.
- Decide whether multi-selected drivers can be combined in a single scenario or must be evaluated separately first.
- Define financial metric formulas, units, and input/calculated roles before implementing those calculations.
- Approve this plan before Phase 3 implementation starts.

## Definition of Done for This Plan

- All tasks have explicit acceptance and verification evidence.
- The active cross-page flow works without mutating official source data.
- Existing import/comparison/calculation behavior remains verified.
- Deferred decisions and unverified areas are recorded.
- Human acceptance is obtained before the feature is called complete.
