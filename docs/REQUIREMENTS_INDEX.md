# Cost Breakdown Requirements Index

**Current requirements set:** the four documents in agreements, designated by the user as the current agreement on 2026-09-24.

## Governing behavior specifications

| Area | Current agreement | Scope |
|---|---|---|
| Master Data | [MASTER_DATA_FLOW_SPEC.md](../agreements/MASTER_DATA_FLOW_SPEC.md) | Temporary Reference and Current workspaces, data entry, import, copy, comparison handoff, and optional Excel export |
| Cost Breakdown / Comparison | [COSTBREAKDOWN_COMPARISON_PRINCIPLES.md](../agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md) | Independent snapshot calculation, business-identity matching, comparison statuses, cost gaps, drill-down, and reconciliation |
| Candidate Prioritization | [CANDIDATE_PRIORITIZATION_SPEC.md](../agreements/CANDIDATE_PRIORITIZATION_SPEC.md) | Candidate findings, Work Center processing aggregation, controllability, filtering, and ranking |
| RCA & Simulation | [RCA_SIMULATION_SPEC.md](../agreements/RCA_SIMULATION_SPEC.md) | Human candidate selection, optional RCA notes, parameter scenarios, improvement economics, and handoff to Trial |

The user designated all four files as the current product agreement. The Comparison document retains its internal “Working Specification” label; this index records that it is part of the current agreement set.

## Agreed flow

Master Data → Cost Breakdown / Comparison → Candidate Prioritization → RCA & Simulation → Trial.

Candidate selection happens in RCA & Simulation. Ranking does not select a candidate or scenario automatically.

## Rules that apply across the flow

- Calculate Reference and Current independently, then compare them.
- Match comparable records by business identity, never by row position.
- Comparison statuses are UNCHANGED, CHANGED, ADDED, and REMOVED. Validation and data-quality warnings are separate.
- Gap is Current cost minus Reference cost. Detailed cost effects must reconcile to the total.
- Status filters are multi-select. In Cost Breakdown, unchanged rows remain visible by default while their status labels are omitted; `All` selects every comparison status.
- Candidate Prioritization receives comparison findings and does not perform a second comparison.
- Simulation uses the existing verified Cost Engine, starts from Current, and must not mutate it.
- Root Cause and Action are optional notes, not calculation inputs.
- Trial is a later stage. Its detailed behavior is not specified in the current agreement set.

## Supporting project documents

- [README.md](../README.md) — project overview and local commands.
- [PROJECT.md](../PROJECT.md) — implementation context; it does not define target behavior.
- [PROJECT_SPECIFIC.md](../PROJECT_SPECIFIC.md) — project safeguards.
- [CONSTRAINTS.md](../CONSTRAINTS.md) — implementation quality and verification requirements.
- [HANDOFF.md](../HANDOFF.md) — current checkpoint and next work. It is not a requirements source.
- excel_models/ and the current Cost Engine — existing calculation references. Do not invent or silently change formulas.

Prior specifications, implementation plans, redesign proposals, dated handoffs, and review reports were removed after this consolidation. Their old verification evidence does not establish that the current implementation satisfies the new agreement.
