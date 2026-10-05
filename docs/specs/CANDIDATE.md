# Candidate Prioritization Specification

**Status:** Candidate behavior is finalized by the Candidate agreement. Exact page layout and visual design remain open; that does not reopen the agreed behavior.

## Final Target State

Candidate Prioritization receives findings from Cost Breakdown, shows `CHANGED`, `ADDED`, and `REMOVED` candidates with Reference, Current, and Gap, and aggregates processing candidates by Work Center. Every candidate starts marked Controllable; the user may uncheck a candidate without hiding, deleting, or blocking it. Users can filter by status and sort by Gap, but ranking never chooses what to improve or sends a candidate to RCA automatically. If Selected Comparison is active, the candidate pool uses that selected analysis scope.

## Candidate source and scope

Candidates come from [Cost Breakdown / Comparison findings](COST_BREAKDOWN.md). Do not recreate comparison logic from an older paired-row model. Carry the active Selected Comparison scope through this page as defined in [CROSS_CUTTING.md](CROSS_CUTTING.md#full-and-selected-comparison).

## Material candidates

Use material/BOM findings from the comparison layer. Do not suppress a `CHANGED` material finding merely because its changed field is not Price, Loss, or Usage. Keep its changed-field details and calculated Gap available so the user can judge relevance. A zero numeric Gap does not by itself remove a changed material finding. Separate meaningful factors may remain separate findings; do not collapse unrelated changes just because they belong to one material.

## Processing candidates

Calculate each Routing operation cost using the Work Center rates/master data for that Reference or Current dataset. Aggregate the Routing processing costs by Work Center, then compare the two Work Center totals:

```text
WC Net Gap = Current WC processing total - Reference WC processing total
```

Show the processing candidate at Work Center level with Reference cost, Current cost, and Gap. Routing `Process` is drill-down detail under its Work Center. Routing operations do not need one-to-one matching merely to calculate the Work Center `WC Net Gap`; do not add new Routing IDs, manual mappings, or split/merge mapping for this purpose. Follow [the shared calculation and data-quality rules](CROSS_CUTTING.md).

## Status and Gap

Candidate Prioritization uses only:

- `CHANGED`: the comparable candidate exists on both sides and its relevant value/cost changed.
- `ADDED`: the candidate exists only in Current.
- `REMOVED`: the candidate exists only in Reference.

`UNCHANGED` is not a Candidate. Status describes change/structure; Gap describes cost direction and magnitude. Use:

```text
Gap = Current - Reference
```

Keep zero-gap changed candidates visible. Do not infer that `ADDED` is necessarily an adverse cost increase or that `REMOVED` is necessarily an improvement.

Each candidate exposes its finding/candidate identity, Status, Reference, Current, Gap, and Controllable mark.

## Controllable, filtering, and ranking

Every candidate defaults to **Controllable** (`true`). This is a human mark, not an automated feasibility judgment. If the user unchecks it, the candidate remains visible and in the candidate pool; it is not deleted, blocked, or excluded from analysis.

Filtering is by status only. `All` selects `CHANGED`, `ADDED`, and `REMOVED` and is the default. Any combination of the three statuses may be selected. Do not add material/processing, controllability, cost-direction, requirement-fit, or feasibility filters without a later explicit decision.

The default ranking sorts Gap descending (highest to lowest). Keep positive, zero, and negative Gap candidates visible. Ranking is only a prioritization aid; it does not select a candidate for improvement or RCA.

## Page boundary

Candidate Prioritization ends with reviewing findings, filtering/ranking, and marking controllability. It does not contain candidate-for-RCA selection, Root Cause, Action, Requirement Fit, a feasibility checklist, or Simulation. Human candidate selection takes place in [RCA & Simulation](RCA_SIMULATION.md).

## PENDING/TBD

The source agreement does not lock the exact page hierarchy, visual layout, or visual styling. Preserve the behavior above while leaving those presentation choices for later page review. No later user decision has been found that supersedes the agreement's candidate behavior.

## Traceability

The full finalized source is [`agreements/CANDIDATE_PRIORITIZATION_SPEC.md`](../../agreements/CANDIDATE_PRIORITIZATION_SPEC.md). Its Work Center processing aggregation, status, Gap, controllability, filtering, and ranking decisions are retained here. The later Master Data schema changes comparison identity to BOM `Name`, Work Center `WC`, and Routing `Process`; do not reintroduce superseded legacy keys. The 80-topic crosswalk tracks implementation/verification only.
