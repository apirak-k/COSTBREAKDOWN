# Cost Breakdown Specification

**Status:** Core comparison, calculation, Gap, and Selected Comparison behavior is `FINALIZED — USER DECISION`. The result → cause → detail experience is a `CONFIRMED DIRECTION — USER DECISION`; its current visual composition is a reversible AI choice in [`design.md`](../../design.md).

## Final Target State

Cost Breakdown starts in Full Comparison. Reference and Current are calculated independently, then compared using business identities and the four applicable statuses. Gap is always Current minus Reference. Material costs are compared by BOM identity; processing uses each side's Routing and Work Center rates, aggregates by Work Center, and exposes Process as drill-down detail. Users can temporarily select BOM/Routing findings for analysis; while that scope is active, every result shows only the selected-scope Gap. Details explain and reconcile to the total without fabricating missing costs.

## Comparison Scope: Reference vs Current Only

Cost Breakdown answers: *“What changed between Reference and Current, and where does the Standard Cost gap come from?”*

Cost Breakdown compares strictly:

$$\text{Reference} \longleftrightarrow \text{Current}$$

- CBD consumes the independent Reference and Current Working datasets from [Master Data](MASTER_DATA.md).
- `Custom` is **not** a direct comparison state in CBD. If a user wishes to evaluate a Custom dataset within CBD, they must clone it into Reference or Current first.
- Different table sizes and structures are valid; each side calculates independently before comparison.
- Shared calculation formulas, business identities, and missing-input safeguards follow [CROSS_CUTTING.md](CROSS_CUTTING.md) and [FINAL_LOGIC_SPEC.md](FINAL_LOGIC_SPEC.md).

The signed cost difference is:

$$\text{Gap} = \text{Current Cost} - \text{Reference Cost}$$

- $\text{Gap} > 0$: Current cost is higher than Reference.
- $\text{Gap} < 0$: Current cost is lower than Reference.
- $\text{Gap} = 0$: No net monetary difference.
- `ADDED` records: Reference contribution is zero (record does not exist in Reference).
- `REMOVED` records: Current contribution is zero (record does not exist in Current).
- This absent-record rule does not convert a missing required input inside an existing record to zero; missing inputs leave calculations unavailable.

## Comparison Statuses

Use only:
- `UNCHANGED`
- `CHANGED`
- `ADDED`
- `REMOVED`

Status and Gap are independent:
- A `CHANGED` finding can have positive, negative, zero, or unavailable Gap.
- When a Work Center rate change causes a Process's calculated processing cost to change, that Process is `CHANGED` even if its own Routing-owned fields are unchanged. The Work Center remains rate owner and context, not a Candidate.
- Field differences are details under `CHANGED`, not separate statuses. Do not invent a `REPLACE` status or infer split/merge relationships.

Keep unchanged records available in the normal comparison data and for status filtering. The status filter is multi-select (`All`, `Changed`, `Added`, `Removed`, `Unchanged`). `All` selects all statuses and is the default.

## Processing and Drill-Down

- Calculate processing cost independently on each side using Routing operations and Work Center rates.
- Aggregate processing by Work Center, then compare Reference and Current Work Center totals:
  $$\text{WC Net Gap} = \text{Current WC processing total} - \text{Reference WC processing total}$$
- Routing `Process` remains drill-down detail under Work Center. One-to-one Routing matching is not required to calculate `WC Net Gap`.
- Detailed effects reconcile to their parent totals:
  $$\text{Material Gap} + \text{Labor Gap} + \text{Burden Gap} = \text{Total Gap}$$
  $$\text{Changed effects} + \text{Added effects} + \text{Removed effects} = \text{Parent branch Gap}$$
- If detail cannot reconcile due to missing/invalid calculation inputs, display an unavailable or validation state instead of guessing.
- Record-level and Work Center-level gaps are shown with changed inputs as Reference → Current explanatory details. Do not fabricate unsupported per-input monetary attribution in THB.

## Full Comparison and Selected Comparison

- **Full Comparison:** The default comparison covering all eligible BOM and Routing records.
- **Selected Comparison:** A temporary analysis scope/view of user-selected BOM and Routing findings:
  - Work Centers remain complete calculation context.
  - Matched `CHANGED`/`UNCHANGED` findings move as Reference/Current pairs.
  - `ADDED` and `REMOVED` findings are independently selectable.
  - While active, display only the selected findings and **only the selected-scope Gap**. Do not display the Full Gap beside or behind it.
  - Selected Comparison does not mutate, save, or export either source dataset.
  - Clearing scope or modifying source data clears the scope and returns to Full Comparison.
  - Selected Comparison is an analysis scope, **not** a dataset and **not** an RCA Case.
  - When active, Candidate / Ranking may be constrained to this selected subset.

## Candidate and RCA Boundary

The findings from CBD (whether Full or Selected) feed into [Candidate Prioritization and RCA](CANDIDATE.md).
- One RCA Case may contain one or multiple Candidates.
- RCA ends at Root Cause / Why? and Action.
- Simulation is optional and independent; it may start from Reference, Current, or Custom, and compares Current vs SIM.

## Warnings and Presentation Boundaries

- Validation warnings inform and direct without blocking navigation.
- Keep comparison statuses separate from data-quality validation warnings.
- Keep duplicate top calculation warning banners removed; display warnings in a collapsed disclosure labeled `Review warnings (N)`.
- Preserve the result → cause → detail direction.
