# Candidate Prioritization Specification

**Status:** Candidate behavior is `FINALIZED — USER DECISION`. Its current row grouping and visual presentation are reversible AI choices recorded in [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md) and [`design.md`](../../design.md); human visual acceptance remains a review checkpoint.

## FINALIZED — USER DECISION

Candidate Prioritization receives findings from Cost Breakdown and has exactly two Candidate groups: BOM and Process/Routing. It shows `CHANGED`, `ADDED`, and `REMOVED` Candidates with Reference, Current, and Gap. Work Center owns rates and provides calculation/aggregation context, but is never a Candidate. Every Candidate starts marked Controllable; the user may uncheck a Candidate without hiding, deleting, or blocking it. Users can filter by status and sort by Gap, but ranking never chooses what to improve or sends a Candidate to RCA automatically. If Selected Comparison is active, Ranking is limited to that scope until the user chooses one Candidate for RCA.

## Candidate source and scope

Candidates come from [Cost Breakdown / Comparison findings](COST_BREAKDOWN.md). Do not recreate comparison logic from an older paired-row model. Selected Comparison may limit this page's Candidate pool as defined in [CROSS_CUTTING.md](CROSS_CUTTING.md#full-and-selected-comparison). When the human selects exactly one Candidate and it enters RCA, Selected Scope ends; Simulation uses full Current regardless of the Candidate's scope origin. See [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md).

## Material monetary Gap and factor details — FINALIZED — USER DECISION

Use material/BOM findings from the comparison layer. The material record's calculated Reference cost, Current cost, and `Gap = Current - Reference` may be used as its monetary/ranking value. Keep each changed input visible as Reference → Current explanatory detail so meaningful differences are not lost. A zero numeric Gap does not by itself remove a changed material finding.

There is **no user-agreed method** to allocate one material record's cost Gap into separate THB effects for Price, Usage, Loss, or any other input. Do not fabricate `Price effect`, `Usage effect`, or `Loss effect` amounts, and do not repeat the full record Gap as the monetary Gap of each changed factor. The Gap describes the material record's calculated cost; changed inputs explain what differs.

Meaningful factors may remain separate findings where that preserves useful distinctions; do not silently drop or collapse unrelated changed details merely because they belong to one material. Whether the current UI renders one record-level monetary candidate with its changed input details underneath is a `PROVISIONAL — AI CHOICE`, not a permanent grouping requirement; see the ledger.

## Processing Candidates

The processing Candidate is always the Process/Routing record. Calculate each Process's processing cost using its Work Center rates/master data for that Reference or Current dataset, then compare Reference and Current Process costs by Process identity. Use the Process-level `Gap = Current - Reference` for that Candidate. Keep each Process as one Candidate; do not split it into separate Labor and Burden Candidates.

Work Center is the rate owner and calculation context, not a Candidate. Cost Breakdown may aggregate Process costs by Work Center for a total or drill-down view:

```text
WC Net Gap = Current WC processing total - Reference WC processing total
```

That aggregate does not change Candidate identity. Routing operations do not need one-to-one matching merely to calculate the Cost Breakdown Work Center total; do not add new Routing IDs, manual mappings, or split/merge mapping for this purpose. Follow [the shared calculation and data-quality rules](CROSS_CUTTING.md).

### Work Center rate dependency

If a Work Center Labor Rate or Burden Rate change causes a Process's calculated Labor, Burden, Conversion, or total processing cost to change, that Process remains the Candidate. For a Process present in both Reference and Current, classify it as `CHANGED` when its calculated processing cost changes solely because of that rate dependency, even if Manning, Capacity, Yield, and WC assignment are unchanged. Show the Work Center rate change as explanatory dependency/context. If one Work Center rate affects multiple Processes, each affected Process may independently become a Candidate. Never create a Work Center Candidate. The detailed rule and example are in [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md#work-center-rate-dependency).

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

## Presentation and human review

The current presentation follows the provisional design contract in [`design.md`](../../design.md). Layout, grouping, and styling choices remain reversible and do not require individual user approval. No Candidate business behavior is pending in this spec. Final human visual acceptance is a review checkpoint, not an unsettled Candidate product decision.

## Traceability

The original finalized source is [`agreements/CANDIDATE_PRIORITIZATION_SPEC.md`](../../agreements/CANDIDATE_PRIORITIZATION_SPEC.md); its compatible status, Gap, controllability, filtering, and ranking decisions remain. Its older Work Center Candidate grouping was superseded by [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md); Work Center aggregation remains Cost Breakdown context, while Process/Routing is the Candidate. The later Master Data schema uses BOM `Name`, Work Center `WC`, and Routing `Process`; do not reintroduce superseded legacy keys. The 80-topic crosswalk tracks implementation/verification only.
