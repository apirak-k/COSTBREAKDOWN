# Cost Breakdown Specification

**Status:** Core comparison, calculation, Gap, and Candidate selection behavior is `FINALIZED — USER DECISION`. The Cost Breakdown presentation described here is the finalized CBD UX/UI direction.

## Final Target State

Cost Breakdown compares the complete Reference and Current snapshots using approved business identities and the four applicable statuses. Gap is always Current minus Reference. BOM material and Routing Process records are the Candidates/findings; Work Center totals remain full-snapshot calculation context. The visible upper structure is Subheader, Cost Breakdown, and Work Center, followed by the existing findings tables. Collapse hides only Cost Breakdown and Work Center.

The compact one-row Subheader contains the signed Standard Cost Gap, the MAT/LB/BD color legend, one continuous Gap Bar, equal-width `BOM (n)` / `RTG (n)` / `ALL (n)` filters, a Status count control, the selected Gap sort mode, and an icon-only Cost Breakdown/Work Center collapse control. The left-side gap and legend use their content width, and the Gap Bar grows into the available space; the toolbar boundary is the only outer frame around it. Type counts reflect current findings under the active status filter; ALL is BOM plus Routing. Sort modes are Gap High → Low, Gap Low → High, and |Gap| High → Low (default), with unavailable gaps last and BOM/RTG sorted separately. Drag reorder is temporary. The main segment of the split Sort control reapplies the current mode and restores sorted order; its adjacent chevron opens the menu. Reapplying or changing Sort closes all expanded Candidate Details. Status and Sort popovers overlay the page, are mutually exclusive, and dismiss on outside click or Escape without changing filter/sort values. The full Standard Cost Gap remains the chart baseline. In a same-sign case, Material, Labor, and Burden widths reflect their contribution magnitudes; in an offset case, retain the single signed zero-baseline chart. Selected net magnitude is overlaid only within its owning element segment. Status and Sort options do not change Subheader height.

The Cost Breakdown block has a header, Material / Labor / Burden rows, and a Standard Cost footer, with REF / CUR / GAP / %GAP. Selected values appear only as secondary parenthesized values inside the GAP cell. Its fixed Selected slot separates opening parenthesis, tabular number, and closing parenthesis so all rows align; the Full Gap slot never moves. Material / Labor / Burden `%GAP` is element Gap divided by Standard Cost Gap; the Standard Cost footer is visibly identified as `%Total` and uses Standard Cost Gap divided by REF Standard Cost. The adjacent Work Center block shows full-snapshot REF / CUR / GAP / %GAP only, with a visibly identified `%Total` footer. Work Center stays the Cost Breakdown height; only its body scrolls when needed.

The Candidate area remains the page's findings workspace. In `ALL`, exactly two actual tables appear in order: Bill of Material, then Routing, with no separate BOM/RTG headings. Both tables share the same column grid. Their main rows show parameter gaps, Candidate Cost Gap, and `%GAP`; the latter is Candidate Cost Gap divided by full Standard Cost Gap, preserving signed values and values above 100%. For `CHANGED`, main parameter cells show Current minus Reference. For `ADDED`, they show actual Current-side values prefixed `CUR`; for `REMOVED`, they show actual Reference-side values prefixed `REF`. A missing or invalid value on the present side remains unavailable (`—`). Status uses colored text without a badge background. The `#` column selects findings; the second-last handle reorders only visible rows temporarily. Only `CHANGED` rows expand, ordinary row cells toggle their aligned details, and multiple BOM/Routing details may stay open together. Status and type changes preserve hidden selections. Expanded Details collapse on outside click or Escape; interactions inside the Candidate region do not close them. BOM detail rows are Reference / Current / Parameter Effect; its Parameter Effect Gap equals the main Candidate Gap. Routing detail rows are Reference / Current / Parameter Effect / Rate Effect. The Parameter Effect Gap is the unrounded sum of Manning, Capacity, and Yield effects; the Rate Effect Gap is the unrounded sum of the existing Labor Rate and Burden Rate effects. Those rows reconcile to the main Candidate Gap within floating-point tolerance. Routing Rate Effect uses em dashes in the parameter cells; no Total Effect row is shown. Missing or invalid calculation inputs remain unavailable and are never fabricated.

The Candidate area is the only vertical scroll owner on the CBD page. The shared shell's main region does not also scroll vertically for CBD; the Global Header and Footer stay in the viewport shell. Other pages keep their existing main-region scroll behavior. Wide tables keep horizontal scrolling inside their own table region.

Candidate selection is immediate from the `#` column. Selecting or deselecting a row updates the existing temporary Selected Comparison scope; deselecting the final selected finding returns to Full Comparison. Status and type filters do not remove hidden selections. The chart's selected element values sum existing selected-finding cost effects; an element with no selected findings contributes zero, while an unavailable selected effect remains unavailable. Candidate `%GAP` always uses Candidate Cost Gap divided by the full Standard Cost Gap. Preserve signed values and values above 100%; a zero or unavailable denominator displays `—`.

The findings table schemas are `# | Bill of Material/Routing | Status | 3 parameters | Gap | %GAP | reorder | chevron`; BOM uses Usage / Price / Loss and RTG uses Manning / Capacity / Yield. The same column grid is used by both tables. Main parameter cells show parameter gaps for matched findings. BOM does not display Unit. BOM detail rows are Reference / Current / Parameter Effect; Routing detail rows are Reference / Current / Parameter Effect / Rate Effect in the same grid. For ADDED/REMOVED rows, the nonexistent side displays `—`; the present-side values are labeled `CUR` or `REF` and shown when valid, while only genuinely missing or invalid present-side values display `—`. `% Parent` is not shown anywhere in the CBD UI.

The expanded BOM/RTG details do not repeat Candidate identity, Status, selection, reorder controls, RCA content, per-record Data quality, REF/CUR quality badges, Confidence labels, or Confidence badges. Missing or invalid calculation inputs remain unavailable and are never fabricated.

## Comparison Scope: Reference vs Current Only

Cost Breakdown answers: *“What changed between Reference and Current, and where does the Standard Cost gap come from?”*

The page presents the full cost result and cost-element causes in the Subheader, Cost Breakdown, and Work Center blocks, then BOM/RTG findings and their details. Candidate selection changes the selected contribution overlay while the full comparison remains visible.

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

Keep unchanged records available in the normal comparison data and for status filtering. The Status dropdown is multi-select (`Changed`, `Added`, `Removed`, `Unchanged`) and starts with all four selected. Its closed label is `Status (All)` for all four, otherwise `Status (1)`, `Status (2)`, or `Status (3)`; `Status (4)` is not shown. At least one status remains selected, so `Status (0)` cannot be reached. “All statuses” restores the four-status default.

## Processing and Work Center Context

- Calculate processing cost independently on each side using Routing operations and Work Center rates.
- Routing `Process` is the primary process-level record and finding in Itemized Comparison. Match it by its approved Process identity; its Work Center assignment and the rate from that Work Center on each side are calculation inputs and explanatory details.
- If a Process moves to another Work Center, retain one matched RTG finding for that Process and classify the changed assignment as `CHANGED`; do not split the move into a removed/added pair. A Work Center rate change can also make an otherwise unchanged Routing record's calculated cost `CHANGED`.
- Aggregate processing by Work Center, then compare Reference and Current Work Center totals:
  $$\text{WC Net Gap} = \text{Current WC processing total} - \text{Reference WC processing total}$$
- Work Center processing is separate aggregate context, not a parent for the Process findings and not a Candidate. Display full-snapshot Conversion Cost by Work Center / REF / CUR / Gap, with a compact Total when available. Candidate selection does not filter or recalculate this context.
- Detailed effects reconcile to their parent totals:
  $$\text{Material Gap} + \text{Labor Gap} + \text{Burden Gap} = \text{Total Gap}$$
  $$\text{Labor Gap} + \text{Burden Gap} = \text{Conversion Gap}$$
  $$\text{Changed effects} + \text{Added effects} + \text{Removed effects} = \text{Parent branch Gap}$$
- If detail cannot reconcile due to missing/invalid calculation inputs, display an unavailable or validation state instead of guessing.
- Expanded parameter details use the existing additive LMDI monetary attribution for matched `CHANGED` BOM and RTG records; other statuses keep their existing one-sided or unavailable values without invented attribution.
- Expanded BOM detail uses Reference / Current / Parameter Effect as rows and Usage / Price / Loss / Gap as columns. BOM cost is `Usage × Price × (1 + Loss)`. LMDI allocates the actual BOM record material gap across Usage, Price, and `(1 + Loss)`. Parameter Effect Gap is the actual record Candidate Cost Gap; do not derive it by summing display-rounded factor effects. Unit is omitted.
- Expanded Routing detail uses Reference / Current / Parameter Effect / Rate Effect as rows and Manning / Capacity / Yield / Gap as columns. For RTG, `Factor = Manning / (Capacity × Yield)`, `Labor = Factor × Labor Rate`, `Burden = Factor × Burden Rate`, and `Conversion = Labor + Burden`. Calculate additive LMDI independently for Labor and Burden using Manning, inverse Capacity, inverse Yield, and the corresponding Work Center rate; Conversion attribution is the sum of the Labor and Burden effects for each parameter. Parameter Effect Gap is the unrounded sum of Manning, Capacity, and Yield effects. Rate Effect Gap is the unrounded sum of Labor Rate and Burden Rate effects. Parameter Effect Gap plus Rate Effect Gap reconciles to the existing process Candidate Gap; do not add a Total Effect row or promote rate effects into parameter columns.
- Candidate `%GAP` is the actual Candidate Cost Gap divided by the full Standard Cost Gap. A zero or unavailable denominator displays unavailable (`—`). Signed contributions, including negative values and values above 100%, remain visible. The CBD UI does not display `% Parent`.
- LMDI attribution requires every required input on both sides to be positive and finite. Missing, zero, or non-finite required inputs make that record's Parameter Cost Effect unavailable; do not coerce them to zero. This attribution availability rule does not replace the underlying cost calculation or validation rules.

## Full State and Selected Candidates

- Full state is the default comparison covering the complete Reference and Current snapshots.
- Selecting a BOM or RTG Candidate immediately adds it to the temporary Selected Comparison scope; matched `CHANGED` / `UNCHANGED` findings move as Reference / Current pairs, while `ADDED` and `REMOVED` findings are independently selectable.
- The full Standard Cost Gap, full Cost Breakdown and Work Center blocks, full finding rows, and full Work Center context stay visible. The selected scope is overlaid within the single Gap Bar and appears as secondary information only in Cost Breakdown.
- Deselecting all Candidates returns to Full state. Type and Status filters do not remove selected findings that are temporarily hidden.
- Selected Comparison does not mutate, save, or export either source dataset. It is an analysis scope, not a dataset and not an RCA Case.

## Candidate and Simulation Boundary

Candidate/finding analysis remains inside CBD; there is no standalone Candidate, Ranking, or RCA page in the current visible product. Legacy RCA domain/session compatibility is documented separately and is not an active CBD workflow. Simulation remains directly accessible as a separate What-If analysis and may start from Reference, Current, or Custom, comparing Current vs SIM.

## Warnings and Presentation Boundaries

- Validation warnings inform and direct without blocking navigation.
- Keep comparison statuses separate from data-quality validation warnings.
- Do not add duplicate top calculation-warning banners, a page-level Data Quality summary, or a separate Warning/Blocker disclosure in CBD. Warnings and blockers remain accessible through the shared Header Info (`I`) → Prepare Dataset path.
- This presentation boundary does not change validation or calculation behavior. Keep Confidence and data-quality badges out of CBD details as specified above.
- Do not add redundant review links to the Overview.
- Preserve the result → cause → detail direction.
