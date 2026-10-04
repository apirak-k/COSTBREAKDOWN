# Cost Breakdown Requirements Index

**Current requirements set (updated 2026-10-04):** the four agreements below remain authoritative for behavior they cover unless the user's later shared-chat decisions or the two newer Master Data documents explicitly replace that behavior. For Master Data workflow/schema and the confirmed Selected Comparison additions, the newer sources take precedence where they conflict with an older agreement.

## Governing behavior specifications

| Area | Current agreement | Scope |
|---|---|---|
| Master Data | [MASTER_DATA_FLOW_SPEC.md](../agreements/MASTER_DATA_FLOW_SPEC.md) | Temporary Reference and Current workspaces, data entry, import, copy, comparison handoff, and optional Excel export |
| Cost Breakdown / Comparison | [COSTBREAKDOWN_COMPARISON_PRINCIPLES.md](../agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md) | Independent snapshot calculation, business-identity matching, comparison statuses, cost gaps, drill-down, and reconciliation |
| Candidate Prioritization | [CANDIDATE_PRIORITIZATION_SPEC.md](../agreements/CANDIDATE_PRIORITIZATION_SPEC.md) | Candidate findings, Work Center processing aggregation, controllability, filtering, and ranking |
| RCA & Simulation | [RCA_SIMULATION_SPEC.md](../agreements/RCA_SIMULATION_SPEC.md) | Human candidate selection, optional RCA notes, parameter scenarios, improvement economics, and handoff to Trial |

The user designated all four files as the current product agreement on 2026-09-24. On 2026-10-04, the user supplied a later shared-chat discussion and two newer Master Data documents. Apply those newer sources to the Master Data and Selected Comparison scope they cover; retain the older agreements for unaffected Cost Breakdown, Candidate, RCA, Simulation, and Trial behavior.

## Later sources that supersede covered behavior

| Source | Applies to |
|---|---|
| [MASTER_DATA_SPEC.md](MASTER_DATA_SPEC.md) | Finalized Master Data workflow, dataset fields, table schemas, editing interactions, validation direction, and the confirmed Selected Comparison decisions in Appendix A |
| [COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md](COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md) | Full review context and source-chat decisions, including finalized, confirmed, directional, and deferred topics |
| Shared ChatGPT conversation “CBD Refactor #1” (2026-10-04) | User's source conversation; use it to interpret the two documents and their order of decisions |
| [Follow-up 80-topic checklist conversation](https://chatgpt.com/s/t_6ac26aba193481918961c062fca76357) (2026-10-04) | Cross-check source for context coverage, not an 80-feature backlog. Its Full-vs-Selected Gap item predates the later user decision below. |

Examples of superseded older details include the Master Data product fields and the Routing comparison identity: the newer schema matches Routing by `Process`, not the older agreement's `Operation Code`. The cost engine formulas and other older agreements remain in force unless a later source explicitly changes them.

## Agreed flow

Master Data → Cost Breakdown / Comparison → Candidate Prioritization → RCA & Simulation → Trial.

Candidate selection happens in RCA & Simulation. Ranking does not select a candidate or scenario automatically.

## Rules that apply across the flow

- Calculate Reference and Current independently, then compare them.
- Match comparable records by business identity, never by row position.
- Comparison statuses are UNCHANGED, CHANGED, ADDED, and REMOVED. Validation and data-quality warnings are separate.
- Gap is Current cost minus Reference cost. Detailed cost effects must reconcile to the total.
- Full Comparison is the default. In Selected Comparison mode, show only the selected-scope Gap; do not show the Full Gap alongside it. This later explicit user decision supersedes the older checklist's “pending” label for that presentation detail.
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
- [source-crosswalk-80.md](../tasks/source-crosswalk-80.md) — the single per-topic source coverage, implementation status, evidence, and next-action ledger; it does not add requirements.
- [todo.md](../tasks/todo.md) and [plan.md](../tasks/plan.md) — task-level implementation plan and verification details, not a second copy of the per-topic status ledger.
- [HANDOFF.md](../HANDOFF.md) — current checkpoint and next work. It is not a requirements source.
- excel_models/ and the current Cost Engine — existing calculation references. Do not invent or silently change formulas.

Prior specifications, implementation plans, redesign proposals, dated handoffs, and review reports were removed after this consolidation. Their old verification evidence does not establish that the current implementation satisfies the new agreement.
