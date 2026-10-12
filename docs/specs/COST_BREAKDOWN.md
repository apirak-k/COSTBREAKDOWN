# Cost Breakdown Specification

**Status:** Core comparison, calculation, Gap, and Selected Comparison behavior is `FINALIZED — USER DECISION`. The result → cause → detail experience is a `CONFIRMED DIRECTION — USER DECISION`; its current visual composition is a reversible AI choice in [`design.md`](../../design.md).

## Final Target State

Cost Breakdown starts in Full Comparison. Reference and Current are calculated independently, then compared using business identities and the four applicable statuses. Gap is always Current minus Reference. BOM material and Routing Process records are the primary itemized findings; Work Center totals remain a separate full-snapshot context. Users can temporarily select BOM/Routing findings for analysis; while that scope is active, the comparison summary and itemized findings show only the selected-scope Gap, while Work Center context remains the complete Reference/Current snapshot pair. Details explain and reconcile to the total without fabricating missing costs.

Keep the current four-section page hierarchy and order:
1. Comparison scope control.
2. Standard Cost Summary and Cost Element Breakdown.
3. Work Center processing context for the complete Reference/Current snapshots.
4. Itemized Comparison for BOM and RTG records, with expandable record details.

The expanded BOM/RTG record details do not repeat per-record Data quality, REF/CUR quality badges, Confidence labels, or Confidence badges. Underlying validation, warnings, calculations, and reconciliation remain available through their existing review paths.

## Comparison Scope: Reference vs Current Only

Cost Breakdown answers: *“What changed between Reference and Current, and where does the Standard Cost gap come from?”*

The page presents the cost result and cost-element causes first, then full-snapshot Work Center context, then itemized BOM/RTG records and changed-field detail. Selected scope stays available as a compact context control.

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
- Routing `Process` is the primary process-level record and finding in Itemized Comparison. Match it by its approved Process identity; its Work Center assignment and the rate from that Work Center on each side are calculation inputs and explanatory details.
- If a Process moves to another Work Center, retain one matched RTG finding for that Process and classify the changed assignment as `CHANGED`; do not split the move into a removed/added pair. A Work Center rate change can also make an otherwise unchanged Routing record's calculated cost `CHANGED`.
- Aggregate processing by Work Center, then compare Reference and Current Work Center totals:
  $$\text{WC Net Gap} = \text{Current WC processing total} - \text{Reference WC processing total}$$
- Work Center processing is separate aggregate context, not a parent for the Process findings and not a Candidate. It always shows the complete Reference and Current snapshots, including while Selected Comparison is active; selected scope does not filter or recalculate this context.
- Detailed effects reconcile to their parent totals:
  $$\text{Material Gap} + \text{Labor Gap} + \text{Burden Gap} = \text{Total Gap}$$
  $$\text{Labor Gap} + \text{Burden Gap} = \text{Conversion Gap}$$
  $$\text{Changed effects} + \text{Added effects} + \text{Removed effects} = \text{Parent branch Gap}$$
- If detail cannot reconcile due to missing/invalid calculation inputs, display an unavailable or validation state instead of guessing.
- The expanded parameter table uses additive LMDI monetary attribution only for matched `CHANGED` BOM and RTG records. `UNCHANGED`, `ADDED`, and `REMOVED` records do not show Parameter Cost Effect attribution.
- BOM cost is `Usage × Price × (1 + Loss)`. LMDI allocates the actual BOM record material gap across Usage, Price, and `(1 + Loss)`; display the actual record gap as the Total row.
- For RTG, `Factor = Manning / (Capacity × Yield)`, `Labor = Factor × Labor Rate`, `Burden = Factor × Burden Rate`, and `Conversion = Labor + Burden`. Calculate additive LMDI independently for Labor and Burden using Manning, inverse Capacity, inverse Yield, and the corresponding Work Center rate; Conversion attribution is the sum of the Labor and Burden effects for each parameter. The RTG Total row uses the actual process Labor, Burden, and Conversion gaps.
- Do not derive Total rows by summing display-rounded factor effects. In the BOM Total row, `% Parent` is the actual record material gap divided by itself; in each RTG Total group, it is the actual process Labor, Burden, or Conversion gap divided by itself. Each is 100% for a valid nonzero gap. `% Total` is the corresponding actual gap divided by the Standard Cost Gap. A zero or unavailable denominator displays unavailable (`—`). Offset effects may be above 100% or negative while still reconciling to the actual gap.
- LMDI attribution requires every required input on both sides to be positive and finite. Missing, zero, or non-finite required inputs make that record's Parameter Cost Effect unavailable; do not coerce them to zero. This attribution availability rule does not replace the underlying cost calculation or validation rules.

## Full Comparison and Selected Comparison

- **Full Comparison:** The default comparison covering all eligible BOM and Routing records.
- **Selected Comparison:** A temporary analysis scope/view of user-selected BOM and Routing findings:
  - The Standard Cost Summary, Cost Element Breakdown, and BOM/RTG itemized comparison use only the selected scope and its Gap.
  - Work Centers remain the complete full-snapshot calculation context, unaffected by the selection.
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
- Keep duplicate top calculation warning banners and the page-level Data quality summary removed; display warnings in a collapsed disclosure labeled `Review warnings (N)`.
- Preserve the result → cause → detail direction.
