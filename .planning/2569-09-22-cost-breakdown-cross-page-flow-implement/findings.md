# Findings & Decisions

## Requirements

- The approved direction is a cross-page flow: Master Data -> Cost Breakdown -> Candidate Selection/Ranking -> RCA -> Simulation.
- Existing page shells are the baseline; the implementation must be incremental rather than a wholesale redesign.
- Cost Breakdown is a flexible analysis workspace with selectable views, sorting, filtering, grouping, changed/all views, and supported drilldowns.
- Candidate Selection is the existing Ranking page. Ranking must support the finest available driver granularity, every available category, category inspection, controllability classification, and selecting any number of drivers for RCA.
- RCA must capture the conceptual chain of what changed, why it changed, and what action should be taken, without freezing a driver-specific form prematurely.
- Simulation is separate and scenario-based. It must recalculate dependent values and distinguish source, calculated, and scenario-overridden values without mutating official data.
- Sale, COGS, Gross Profit, SG&A, OP, and Profit are mandatory future capability; exact formulas, units, and input/calculated roles are deferred.

## Current Implementation Findings

- `src/App.tsx` imports `AppProvider` and `useAppStore` from `src/state`, so `src/state` plus `src/core` is the active runtime path. `src/lib` contains a parallel legacy path and must not be changed by assumption.
- `src/core/calculations/top-drivers.ts` currently documents and returns only the Top 10 positive cost drivers. Its routing candidate construction also uses `MAX_ID = 55`; both are legacy constraints that conflict with the approved full-population Ranking direction.
- `src/core/types/cost.types.ts` and `src/lib/types.ts` contain similar `CostDriver` definitions. The active `src/core` type is the first implementation target; stable driver identity must not depend on display rank.
- `src/features/candidate-selection/CandidateSelectionPage.tsx` already provides the baseline Ranking surface and delegates the table to `DriversTable`/`DriverRow`.
- `src/features/candidate-selection/components/DriverRow.tsx` already exposes controllability and an Action input, but it does not provide multi-selection or a structured RCA record.
- `src/features/rca-simulation/RCASimulationPage.tsx` currently auto-selects the first controllable driver, contains the What-If UI, and uses `handleApplyTarget` to update the active BOM/routing value directly. This conflicts with the scenario-isolation requirement.
- The active Simulation path calls `src/core/calculations/whatif-simulator.ts`; the parallel `src/lib` simulation path is not the first implementation target.
- The current Simulation page also includes trial validation and a promotion callback. Promotion/adoption must remain a separately governed step rather than an implicit Simulation mutation.
- `package.json` exposes `npm run build`, `npm run excel`, and `npm run dev`; it does not currently expose a test or lint script. The implementation plan must use the existing checks and add focused verification without inventing a large test framework.
- The repository currently has both `src/state` and `src/lib` state/calculation paths. The active runtime path must be confirmed before changing shared interfaces to avoid fixing an unused legacy path or creating divergent calculation behavior.

## Technical Decisions

| Decision | Rationale |
|---|---|
| Preserve current page structure and add capabilities in vertical slices | Reduces rework while real-data usage reveals the right views and fields. |
| Introduce a stable driver identity before multi-selection or persistence changes | Rank is a view result and can change when filters/sorts change; it must not be the persistence key. |
| Keep RCA fields extensible and start with the three conceptual outputs | The user wants useful RCA without prematurely freezing a driver-specific schema. |
| Make scenario calculation a pure/isolated path from official state | Prevents `Apply Target` or trial actions from silently mutating Current/Active data. |
| Defer financial formulas until a domain decision exists | The capability is confirmed, but formula, unit, and source semantics are explicitly pending. |

## Issues Encountered

| Issue | Resolution |
|---|---|
| The existing active planning pointer referenced an unrelated Factory UI refinement task | Created a separate named plan and recorded the new plan ID in `.planning/.active_plan`. |

## Resources

- `docs/superpowers/specs/2026-09-22-costbreakdown-cross-page-flow-design.md`
- `docs/specs/master-data.md`
- `docs/specs/cost-breakdown.md`
- `docs/specs/cross-cutting-requirements.md`
- `HANDOFF_2026-09-22.md`
- `src/lib/cost-engine.ts`
- `src/features/candidate-selection/`
- `src/features/rca-simulation/`

## Implementation Outcome

- The active `src/state` + `src/core` path now implements the approved stable driver identity, complete Ranking findings, flexible Ranking views, multi-driver RCA selection, extensible RCA records, isolated Scenario Drafts, explicit Ranking/RCA context in Simulation, and Scenario value provenance.
- The parallel `src/lib` path remains untouched because no active runtime caller was found during discovery.
- The original discovery issues about Top 10 truncation, rank-based persistence, and direct What-If mutation are resolved in the active path. The exact commit trail and verification limitation are recorded in `HANDOFF_2026-09-22.md`.
- Human acceptance and the deferred domain decisions remain open; this outcome is not a substitute for the user's review.
