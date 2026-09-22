# Cost Breakdown Cross-Page Flow Design

## Document Status

- **Status:** Draft for human review
- **Reviewed in discussion:** 2026-09-22
- **Scope:** Cross-page product flow and shared contracts only
- **Implementation authority:** This document does not authorize code changes by itself
- **Detail source of truth:** Page-specific specifications remain authoritative for page-level behavior

This document consolidates the agreed direction for the product-cost analysis flow. It is intentionally a thin cross-page contract: it defines responsibilities, handoffs, boundaries, and success criteria without copying every field or UI rule from the page specifications.

## 1. Objective

The web application must let a user prepare product cost datasets, understand the difference between two valid datasets, identify and rank cost drivers, record RCA for any selected drivers, and evaluate improvement scenarios without mutating official source data.

The intended user outcome is a traceable path from source data to decision:

```text
Master Data
    -> Cost Breakdown
    -> Candidate Selection / Ranking
    -> RCA
    -> Simulation
```

The flow is navigable rather than a forced one-way wizard. A user may return to an earlier analysis view while retaining the selected Product and dataset context.

## 2. Capability Map and Build Direction

| Module ID | Responsibility | Depends on |
|---|---|---|
| `master-data` | Prepare and validate Product, Reference, Current, and related source datasets | — |
| `cost-breakdown` | Explore and explain the comparison between valid datasets | `master-data` |
| `ranking-rca` | Rank available drivers, classify controllability, select drivers, and record RCA | `cost-breakdown` |
| `simulation` | Create isolated scenarios, adjust supported inputs, and recalculate dependent results | `ranking-rca`, `master-data`, `cost-breakdown` |

Recommended delivery direction:

```text
master-data -> cost-breakdown -> ranking-rca -> simulation
```

The existing page shells and navigation are the baseline. The product should be improved incrementally instead of being redesigned as a new application.

## 3. Confirmed Cross-Page Decisions

### 3.1 Master Data

Master Data remains the source-preparation page. It prepares the Product context and separate Reference and Current datasets for downstream analysis.

The detailed contract remains in [`docs/specs/master-data.md`](../../specs/master-data.md).

### 3.2 Cost Breakdown

Cost Breakdown is an analysis workspace, not a single fixed report. It must allow the user to choose how to inspect the comparison, including sorting, filtering, grouping, changed/all views, and supported drilldowns.

It remains responsible for explaining the comparison and exposing useful findings. It does not become the owner of RCA records or Simulation scenario state.

The detailed core contract remains in [`docs/specs/cost-breakdown.md`](../../specs/cost-breakdown.md). Financial extensions and scenario variables remain outside the fixed Core Cost Breakdown contract unless a later page decision explicitly changes that boundary.

### 3.3 Candidate Selection as Ranking

The existing Candidate Selection page is the baseline Ranking page. A new top-level page is not required merely because the concept is now called Ranking.

Ranking must:

- expose drivers at the finest level supported by the available data;
- include every available category rather than hard-coding a small category list;
- allow the user to view the complete set, or group/filter it by category;
- retain a useful default ordering such as cost impact while allowing flexible inspection;
- let the user classify a driver as controllable or uncontrollable;
- let the user select any number of drivers for RCA;
- preserve the existing useful comparison context, such as Reference/Base, Current/Active, gap, contribution, source, and data quality where available.

The current implementation's Top 10 behavior is a legacy implementation constraint, not the final product requirement. The final Ranking contract must not permanently hide lower-ranked available drivers.

### 3.4 RCA

RCA is performed for the driver or drivers selected by the user. The user is not required to RCA every finding, and the system must not automatically RCA every difference.

At the baseline level, RCA must allow the user to explain:

1. **What changed** — the relevant factor or observed variance;
2. **Why it changed** — the root cause or explanation supported by the available evidence;
3. **What should be done** — the action or countermeasure.

These are conceptual responsibilities, not a final rigid form schema. The final RCA fields should follow the data available for each driver type and should remain extensible.

### 3.5 Simulation

Simulation remains separate from Ranking and RCA. It consumes the selected driver/RCA context and evaluates a scenario without changing official Product, Reference, Current, Active, or Master Data values.

Simulation must support:

- scenario-specific overrides for supported driver inputs and assumptions;
- additional supported variables as the model grows;
- recalculation of dependent outputs after an override;
- clear distinction between source values, calculated values, and scenario overrides;
- comparison of the current/reference position with one or more scenario results;
- visible missing, invalid, or unmapped inputs.

The existing scenario layout may be retained as the initial working shell, but its values must be treated as scenario drafts rather than direct edits to official data.

The mandatory financial capability includes Sale, COGS, Gross Profit, SG&A, OP, and Profit. Their exact formulas, units, input/calculated roles, and final placement remain deferred to the Simulation and domain specifications. See [`docs/specs/cross-cutting-requirements.md`](../../specs/cross-cutting-requirements.md).

## 4. Cross-Page Data Handoff

The downstream page must receive enough context to explain where a value came from and what the user selected:

```text
Product + Reference/Current context
    -> comparison findings
    -> ranked driver(s)
    -> selected driver(s) + RCA context
    -> scenario override(s)
    -> recalculated scenario results
```

The application must preserve the selected Product and dataset context while moving between these views. A Simulation result is a scenario result, not a replacement for the source comparison.

Conceptual target contract example (not an implementation API):

```ts
type ScenarioValue = {
  key: string
  value: number | string | null
  unit?: string
  origin: 'source' | 'calculated' | 'override'
}
```

## 5. Deferred Decisions

The following are intentionally not locked by this baseline specification. They may be resolved through data review, prototype use, or a later page-specific specification:

- exact Ranking columns, default view, sort options, and grouping presentation;
- the final category taxonomy when new data categories appear;
- whether RCA is shown inline, in an expandable detail area, or in a linked detail view;
- the exact minimum RCA fields and evidence model for each driver type;
- the workflow status vocabulary for drivers and RCA records;
- whether multiple selected drivers can be combined in one Simulation scenario or evaluated separately first;
- the exact variable registry, units, dependencies, and controlled formula templates;
- the formulas and input/calculated roles for Sale, COGS, Gross Profit, SG&A, OP, and Profit;
- scenario save, compare, trial validation, and any later promotion/adoption workflow.

Deferred does not mean rejected. These decisions can change without changing the core direction, provided the shared boundaries in this document remain true.

## 6. Non-Goals for the Initial Implementation Direction

- Do not redesign all pages from scratch.
- Do not turn Cost Breakdown into an editing or scenario-mutation surface.
- Do not permanently restrict Ranking to Top 10 or to one category.
- Do not force the user to select only one driver for RCA.
- Do not auto-run RCA for every finding.
- Do not mutate official source datasets from Simulation.
- Do not invent defaults for missing or unmapped inputs.
- Do not freeze detailed formulas, statuses, or layouts before realistic data review.

## 7. Technology and Project Context

The existing application is a React 18 / TypeScript / Vite web application with feature-oriented source organization and shared calculation modules.

Relevant project areas:

```text
src/features/master-data/          Master Data UI
src/features/cost-breakdown/        Cost Breakdown UI
src/features/candidate-selection/   Ranking baseline UI
src/features/rca-simulation/        RCA and Simulation baseline UI
src/core/                           Shared domain types and calculations
src/state/                          Application state and cross-page context
docs/specs/                         Page-specific requirements
docs/superpowers/specs/             Cross-page design artifacts
```

Existing verification commands:

```powershell
npm run build
npm run excel
npm run dev
```

The implementation plan must add or identify focused automated and manual checks for the behavior changed by each implementation slice. No new dependency is required by this cross-page contract.

## 8. Engineering Boundaries

### Always

- Preserve the existing page structure unless a later approved design says otherwise.
- Keep official source values separate from scenario overrides.
- Make missing, invalid, estimated, and unmapped data visible and reviewable.
- Keep shared calculations consistent across application and spreadsheet-related paths.
- Trace every implementation slice to a requirement and a verification check.

### Ask First

- Changing the official Reference/Current/Active data model.
- Introducing user-authored formulas instead of controlled formula definitions.
- Adding a new external dependency.
- Changing the page responsibilities or making a destructive migration.
- Adding an automatic promotion from Simulation into official data.

### Never

- Silently discard unknown variables or invalid source values.
- Present a scenario override as an official Current or Active value.
- Claim a requirement is implemented without execution evidence.
- Treat AI verification as human acceptance.

## 9. Success Criteria

The cross-page design is satisfied when the implemented application can demonstrate that:

1. A user can prepare and select a Product context with separate Reference and Current datasets.
2. A user can inspect the comparison through selectable Cost Breakdown views without changing official source data.
3. Ranking exposes the available driver population at the supported granularity and permits category-based inspection.
4. A user can mark controllability and select any number of drivers for RCA.
5. RCA can capture an explanation of change, cause, and action without requiring one fixed schema for every driver type.
6. Simulation can evaluate supported overrides and additional variables in an isolated scenario.
7. Dependent calculations update visibly and distinguish source, calculated, and overridden values.
8. Official source datasets remain unchanged during analysis and Simulation.
9. Missing, invalid, estimated, and unmapped values remain visible rather than becoming misleading defaults.
10. Detailed formulas, statuses, and visual layouts can evolve through later page-specific review without breaking the cross-page responsibilities.

## 10. Review and Approval State

This artifact is the written version of the baseline direction discussed with the user. It is ready for human review of fidelity, not yet an implementation plan.

After human approval of this written spec:

1. create a reviewable implementation plan with ordered slices and verification gates;
2. obtain approval of that plan;
3. implement incrementally;
4. run verification and report evidence;
5. obtain human acceptance before treating the feature as complete.

## Related Documents

- [`docs/specs/master-data.md`](../../specs/master-data.md)
- [`docs/specs/cost-breakdown.md`](../../specs/cost-breakdown.md)
- [`docs/specs/cross-cutting-requirements.md`](../../specs/cross-cutting-requirements.md)
- [`HANDOFF_2026-09-22.md`](../../../HANDOFF_2026-09-22.md)
