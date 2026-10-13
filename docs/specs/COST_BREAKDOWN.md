# Cost Breakdown Specification

**Status:** Core comparison, calculation, Gap, and Candidate selection behavior is `FINALIZED — USER DECISION`. The Cost Breakdown presentation described here is the finalized CBD UX/UI direction.

## Final Target State

Cost Breakdown compares the complete Reference and Current snapshots using approved business identities and the four applicable statuses. Gap is always Current minus Reference. BOM material and Routing Process records are the Candidates; Work Center totals remain full-snapshot context. The page has a Subheader, a full-snapshot Overview, and a Candidate Area.

The Subheader contains one Standard Cost Gap Bar split into Material, Labor, and Burden, `ALL` / `BOM` / `RTG` Candidate filters, and a Status dropdown. The full Standard Cost Gap remains the bar baseline. When Candidates are selected, their contribution is highlighted inside that same bar; do not add a second selected-scope bar.

The Overview always shows full-snapshot Material, Labor, Burden, and Standard Cost with REF / CUR / Gap. Its Work Center context shows Work Center / REF / CUR / Gap for Conversion Cost and a Total when available. It never follows Candidate selection.

Candidate selection is immediate from the `#` column. Selecting or deselecting a row updates the existing Selected Comparison state; deselecting all returns to Full state. Status and type filters do not remove hidden selections. Candidate `% Total` always uses Candidate Cost Gap divided by the full Standard Cost Gap. Preserve signed values and values above 100%; a zero or unavailable denominator displays `—`.

The BOM Candidate schema is `# | Bill of Material | Status | Usage | Price | Loss | Cost Gap | % Total | ▼`. The RTG Candidate schema is `# | Routing | Status | Manning | Capacity | Yield | Cost Gap | % Total | ▼`. Changed rows show deltas; Added rows show current-side values; Removed rows show reference-side values. BOM does not display Unit. Only Changed rows expand to aligned REF / CUR / EFFECT details. `% Parent` is not shown anywhere in the CBD UI.

The expanded BOM/RTG details do not repeat per-record Data quality, REF/CUR quality badges, Confidence labels, or Confidence badges. Missing or invalid calculation inputs remain unavailable and are never fabricated.

## Comparison Scope: Reference vs Current Only

Cost Breakdown answers: *“What changed between Reference and Current, and where does the Standard Cost gap come from?”*

The page presents the full cost result and cost-element causes first, then full-snapshot Work Center context, then BOM/RTG Candidates and changed-field detail. Candidate selection changes the selected contribution highlight while the full comparison remains visible.

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

Keep unchanged records available in the normal comparison data and for status filtering. The Status dropdown is multi-select (`All`, `Changed`, `Added`, `Removed`, `Unchanged`). `All` selects all statuses and is the default.

## Processing and Work Center Context

- Calculate processing cost independently on each side using Routing operations and Work Center rates.
- Routing `Process` is the primary process-level record and finding in Itemized Comparison. Match it by its approved Process identity; its Work Center assignment and the rate from that Work Center on each side are calculation inputs and explanatory details.
- If a Process moves to another Work Center, retain one matched RTG finding for that Process and classify the changed assignment as `CHANGED`; do not split the move into a removed/added pair. A Work Center rate change can also make an otherwise unchanged Routing record's calculated cost `CHANGED`.
- Aggregate processing by Work Center, then compare Reference and Current Work Center totals:
  $$\text{WC Net Gap} = \text{Current WC processing total} - \text{Reference WC processing total}$$
- Work Center processing is separate aggregate context, not a parent for the Process findings and not a Candidate. Display the full-snapshot Conversion Cost as Work Center / REF / CUR / Gap, with a compact Total when available. Candidate selection does not filter or recalculate this context.
- Detailed effects reconcile to their parent totals:
  $$\text{Material Gap} + \text{Labor Gap} + \text{Burden Gap} = \text{Total Gap}$$
  $$\text{Labor Gap} + \text{Burden Gap} = \text{Conversion Gap}$$
  $$\text{Changed effects} + \text{Added effects} + \text{Removed effects} = \text{Parent branch Gap}$$
- If detail cannot reconcile due to missing/invalid calculation inputs, display an unavailable or validation state instead of guessing.
- The expanded parameter detail uses the existing additive LMDI monetary attribution only for matched `CHANGED` BOM and RTG records. `UNCHANGED`, `ADDED`, and `REMOVED` rows do not expand.
- BOM cost is `Usage × Price × (1 + Loss)`. LMDI allocates the actual BOM record material gap across Usage, Price, and `(1 + Loss)`. The aligned REF / CUR / EFFECT detail ends with the actual record Cost Gap; do not derive it by summing display-rounded factor effects.
- For RTG, `Factor = Manning / (Capacity × Yield)`, `Labor = Factor × Labor Rate`, `Burden = Factor × Burden Rate`, and `Conversion = Labor + Burden`. Calculate additive LMDI independently for Labor and Burden using Manning, inverse Capacity, inverse Yield, and the corresponding Work Center rate; Conversion attribution is the sum of the Labor and Burden effects for each parameter. The aligned REF / CUR / EFFECT detail ends with the actual process Conversion Gap.
- Candidate `% Total` is the actual Candidate Cost Gap divided by the full Standard Cost Gap. A zero or unavailable denominator displays unavailable (`—`). Signed contributions, including negative values and values above 100%, remain visible. The CBD UI does not display `% Parent`.
- LMDI attribution requires every required input on both sides to be positive and finite. Missing, zero, or non-finite required inputs make that record's Parameter Cost Effect unavailable; do not coerce them to zero. This attribution availability rule does not replace the underlying cost calculation or validation rules.

## Full State and Selected Candidates

- Full state is the default comparison covering the complete Reference and Current snapshots.
- Selecting a BOM or RTG Candidate immediately adds it to the temporary Selected Comparison scope; matched `CHANGED` / `UNCHANGED` findings move as Reference / Current pairs, while `ADDED` and `REMOVED` findings are independently selectable.
- The full Standard Cost Gap, full Overview, full Candidate rows, and full Work Center context stay visible. The selected scope is highlighted within the single Gap Bar and can continue to feed the existing Candidate / RCA context.
- Deselecting all Candidates returns to Full state. Type and Status filters do not remove selected findings that are temporarily hidden.
- Selected Comparison does not mutate, save, or export either source dataset. It is an analysis scope, not a dataset and not an RCA Case.

## Candidate and RCA Boundary

The findings from CBD (whether Full or Selected) feed into [Candidate Prioritization and RCA](CANDIDATE.md).
- One RCA Case may contain one or multiple Candidates.
- RCA ends at Root Cause / Why? and Action.
- Simulation is optional and independent; it may start from Reference, Current, or Custom, and compares Current vs SIM.

## Warnings and Presentation Boundaries

- Validation warnings inform and direct without blocking navigation.
- Keep comparison statuses separate from data-quality validation warnings.
- Do not add duplicate top calculation-warning banners, a page-level Data Quality summary, or a separate Warning/Blocker disclosure in CBD. Warnings and blockers remain accessible through the shared Header Info (`I`) → Prepare Dataset path.
- This presentation boundary does not change validation or calculation behavior. Keep Confidence and data-quality badges out of CBD details as specified above.
- Do not add redundant review links to the Overview.
- Preserve the result → cause → detail direction.
