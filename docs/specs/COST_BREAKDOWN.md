# Cost Breakdown Specification

**Status:** Core comparison, calculation, Gap, and Candidate selection behavior is `FINALIZED — USER DECISION`. The Cost Breakdown presentation described here is the finalized CBD UX/UI direction.

## Final Target State

Cost Breakdown compares the complete Reference and Current snapshots using approved business identities and the four applicable statuses. Gap is always Current minus Reference. BOM material and Routing Process records are the Candidates/findings; Work Center totals remain full-snapshot calculation context. The visible upper structure is Subheader, Cost Element, and Work Center, followed by the existing findings tables. The page remains named Cost Breakdown. Collapse hides only Cost Element and Work Center.

The compact one-row Subheader contains the signed Standard Cost Gap, the MAT/LB/BD color legend, one continuous Gap Bar, equal-width `BOM (n)` / `RTG (n)` / `ALL (n)` filters, a Status count control, the selected Gap sort mode, and an icon-only Cost Element/Work Center collapse control. The left-side gap and legend use their content width, and the Gap Bar grows into the available space; the toolbar boundary is the only outer frame around it. Use the shared palette: Material `#4F7CAC`, Labor `#D89B45`, Burden `#8067B7`, and Standard Cost `#334155`; only the first three appear as Gap Bar segments. Type counts reflect current findings under the active status filter; ALL is BOM plus Routing. Sort modes are Gap High → Low, Gap Low → High, and |Gap| High → Low (default), with unavailable gaps last and BOM/RTG sorted separately. Drag reorder is temporary presentation order. A completed drag/drop records one reorder action; selected visible findings move as a stable group within their own BOM or Routing table, and selection membership is unchanged. The main segment of the split Sort control reapplies the current mode and restores sorted order; its adjacent chevron opens the menu. Changing or reapplying Sort clears both tables' manual orders and the shared CBD Undo/Redo reorder history, and closes all expanded Candidate Details. CBD reorder history includes only completed Candidate reorder actions and is one chronological history across BOM and Routing. Status and Sort popovers overlay the page, are mutually exclusive, and dismiss on outside click or Escape without changing filter/sort values. The full Standard Cost Gap remains the chart baseline. In a same-sign case, Material, Labor, and Burden widths reflect their contribution magnitudes; in an offset case, retain the single signed zero-baseline chart. Selected net magnitude is overlaid only within its owning element segment. Status and Sort options do not change Subheader height.

The Cost Element block has a header, Material / Labor / Burden rows, and a Standard Cost footer, with REF / CUR / GAP / %GAP. Its Selected header reads `Selected`; only the header label is positioned to start at the same visual point as the Selected numeric values, which remain in their existing positions. Selected values are direct signed numbers without parentheses, shown as quiet neutral secondary information in a fixed-width slot beside the primary Full Gap slot, so selection state, sign, or digit width does not move GAP, REF, CUR, or %GAP. The same presentation applies to Material, Labor, Burden, and Standard Cost. Material / Labor / Burden `%GAP` is element Gap divided by Standard Cost Gap; the Standard Cost footer is visibly identified as `%Total` and uses Standard Cost Gap divided by REF Standard Cost. The adjacent Work Center block shows full-snapshot REF / CUR / GAP / %GAP only, with a visibly identified `%Total` footer. On desktop, the shared Main region is the single primary CBD vertical scroll owner. The Subheader and bounded Cost Element / Work Center overview are sticky together at the top of Main; Candidate Findings remains in normal flow inside Main and does not create a competing vertical scroll region. Cost Element and Work Center are equal-height bounded peer panels in one shared frame, split by a single center divider. Their header, body, and footer rows use the same typography, density, and cell spacing, including aligned 38px desktop body rows. Work Center rows scroll internally when necessary; its header and Total stay visible on the same aligned five-column grid. The Work Center body measures its native scrollbar width and extends only its row grid beneath that scrollbar so the body columns stay aligned with the full-width header and Total, without private header/footer padding or hard-coded scrollbar-width compensation. The overview's plain triangle control toggles both panels, and safe blank space in the Subheader may trigger the same collapse/expand action. At narrower widths the summary blocks may stack and the page may scroll naturally.

The Candidate area remains the page's findings workspace. In `ALL`, exactly two actual tables appear in order: Bill of Material, then Routing, with no separate BOM/RTG headings. BOM and Routing use separate type-specific grids for their different factor counts and the same table width. Their `#`, identity, Status, Gap, `%GAP`, reorder, and detail columns align; the parameter groups occupy equal total width, and each Detail uses the exact grid of its parent table. Their main rows show parameter gaps, Candidate Cost Gap, and `%GAP`; the latter is Candidate Cost Gap divided by full Standard Cost Gap, preserving signed values and values above 100%. BOM headers are `Δ Usage`, `Δ Price`, and `Δ Loss`; Routing headers are `Δ Manning`, `Δ Capacity`, `Δ Yield`, `Δ LB Rate`, and `Δ BD Rate`. For `CHANGED`, main parameter cells show Current minus Reference. For `ADDED`, they show actual Current-side values prefixed `CUR`; for `REMOVED`, they show actual Reference-side values prefixed `REF`. Routing rate values are resolved independently from each snapshot's unique Work Center match. Missing, invalid, ambiguous, or unavailable values on the present side remain unavailable (`—`). Status uses colored text without a badge background. The `#` column selects findings; the second-last handle reorders only visible rows temporarily. Only `CHANGED` rows expand, ordinary row cells toggle their aligned details, and multiple BOM/Routing details may stay open together. Status and type changes preserve hidden selections. Expanded Details collapse on outside click or Escape; interactions inside the Candidate region do not close them. BOM detail has exactly the rows Reference → Current and Parameter Cost Effect. Its first row shows an unchanged valid factor once or changed Reference → Current values; Parameter Cost Effect reuses the existing BOM LMDI effects and its Gap equals the main Candidate Gap. Routing detail has exactly the rows Reference → Current and Parameter Cost Effect, with Manning, Capacity, Yield, LB Rate, BD Rate, and Gap axes aligned to the main table. Parameter Cost Effect exposes all five existing LMDI factors, and its Gap equals the main Candidate Conversion Gap within floating-point tolerance. There is no separate Rate Effect or Total Effect row. Missing or invalid calculation inputs remain unavailable and are never fabricated.

At ordinary desktop widths, keep the existing Status column compact and give the parameter columns enough width for readable values. Expanded Reference → Current values remain on one line where the layout can reasonably fit; this is presentation only and does not change CBD selection or calculation behavior.

The Global Header and Footer stay outside the scrollable workspace in the viewport shell. On desktop, the shared Main region owns CBD vertical scrolling; the Subheader and bounded Cost Element / Work Center overview stay sticky together at the top of Main while Candidate Findings remains in normal flow within Main. Candidate Findings does not create a second vertical scroll region. Work Center rows are the only nested vertical scroller, inside the bounded panel; its header and Total footer stay outside that row body and aligned on the same column grid. At ordinary desktop widths, balance columns to avoid unnecessary horizontal scrolling when the table can fit. Narrow layouts may use natural Main scrolling, stack the summary blocks, and keep horizontal scrolling local to an individual table where needed.

Candidate selection is immediate from the `#` column. Selecting or deselecting a row updates the existing temporary Selected Comparison scope; deselecting the final selected finding returns to Full Comparison. Status and type filters do not remove hidden selections. The chart's selected element values sum existing selected-finding cost effects; an element with no selected findings contributes zero, while an unavailable selected effect remains unavailable. Candidate `%GAP` always uses Candidate Cost Gap divided by the full Standard Cost Gap. Preserve signed values and values above 100%; a zero or unavailable denominator displays `—`.

The findings table schemas are `# | Bill of Material | Status | Δ Usage | Δ Price | Δ Loss | Gap | %GAP | reorder | chevron` and `# | Routing | Status | Δ Manning | Δ Capacity | Δ Yield | Δ LB Rate | Δ BD Rate | Gap | %GAP | reorder | chevron`. Main parameter cells show parameter gaps for matched findings. BOM does not display Unit. BOM and Routing details each use Reference → Current / Parameter Cost Effect rows in their respective parent grid. For ADDED/REMOVED rows, the nonexistent side displays `—`; the present-side values are labeled `CUR` or `REF` and shown when valid, while only genuinely missing, invalid, or ambiguous present-side values display `—`. `% Parent` is not shown anywhere in the CBD UI. The global Header Undo/Redo controls route to this one CBD reorder history on Cost Breakdown; Master Data keeps its existing history and Simulation keeps Undo/Redo disabled. Reorder changes only CBD view order, never source snapshot order, Candidate identity, calculations, or Selected Comparison membership.

The expanded BOM/RTG details do not repeat Candidate identity, Status, selection, reorder controls, RCA content, per-record Data quality, REF/CUR quality badges, Confidence labels, or Confidence badges. Missing or invalid calculation inputs remain unavailable and are never fabricated.

## Comparison Scope: Reference vs Current Only

Cost Breakdown answers: *“What changed between Reference and Current, and where does the Standard Cost gap come from?”*

The page presents the full cost result and cost-element causes in the Subheader, Cost Element, and Work Center blocks, then BOM/RTG findings and their details. Candidate selection changes the selected contribution overlay while the full comparison remains visible.

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
- Expanded BOM detail uses Reference → Current / Parameter Cost Effect rows and Usage / Price / Loss / Gap columns. BOM cost is `Usage × Price × (1 + Loss)`. LMDI allocates the actual BOM record material gap across Usage, Price, and `(1 + Loss)`. Parameter Cost Effect Gap is the actual record Candidate Cost Gap; do not derive it by summing display-rounded factor effects. Unit is omitted.
- Expanded Routing detail uses Reference → Current / Parameter Cost Effect rows and Manning / Capacity / Yield / LB Rate / BD Rate / Gap columns. For RTG, `Factor = Manning / (Capacity × Yield)`, `Labor = Factor × Labor Rate`, `Burden = Factor × Burden Rate`, and `Conversion = Labor + Burden`. Calculate additive LMDI independently for Labor and Burden using Manning, inverse Capacity, inverse Yield, and the corresponding Work Center rate; Conversion attribution for each factor is the sum of its Labor and Burden effects. The Parameter Cost Effect row exposes all five existing factor effects; their unrounded sum reconciles to the actual process Candidate Conversion Gap in the Gap cell. Rates are resolved against each snapshot's unique Work Center match. Do not add separate Rate Effect or Total Effect rows. Missing or invalid factor inputs remain unavailable.
- Candidate `%GAP` is the actual Candidate Cost Gap divided by the full Standard Cost Gap. A zero or unavailable denominator displays unavailable (`—`). Signed contributions, including negative values and values above 100%, remain visible. The CBD UI does not display `% Parent`.
- LMDI attribution requires every required input on both sides to be positive and finite. Missing, zero, or non-finite required inputs make that record's Parameter Cost Effect unavailable; do not coerce them to zero. This attribution availability rule does not replace the underlying cost calculation or validation rules.

## Full State and Selected Candidates

- Full state is the default comparison covering the complete Reference and Current snapshots.
- Selecting a BOM or RTG Candidate immediately adds it to the temporary Selected Comparison scope; matched `CHANGED` / `UNCHANGED` findings move as Reference / Current pairs, while `ADDED` and `REMOVED` findings are independently selectable.
- The full Standard Cost Gap, full Cost Element and Work Center blocks, full finding rows, and full Work Center context stay visible. The selected scope is overlaid within the single Gap Bar and appears as secondary information only in Cost Element.
- Deselecting all Candidates returns to Full state. Type and Status filters do not remove selected findings that are temporarily hidden.
- Selected Comparison does not mutate, save, or export either source dataset. It is an analysis scope, not a dataset and not an RCA Case.

## Candidate and Simulation Boundary

Finding analysis remains inside CBD; there is no standalone Candidate, Ranking, or RCA page in the current visible product. Legacy RCA domain/session compatibility is documented separately and is not an active CBD workflow. Simulation is directly accessible; `Clone from` may copy Reference, Current, or Custom into SIM, while the analytical comparison always remains Current → SIM.

## Warnings and Presentation Boundaries

- Validation warnings inform and direct without blocking navigation.
- Keep comparison statuses separate from data-quality validation warnings.
- Do not add duplicate top calculation-warning banners, a page-level Data Quality summary, or a separate Warning/Blocker disclosure in CBD. Warnings and blockers remain accessible through the shared Header Info (`I`) → Prepare Dataset path.
- This presentation boundary does not change validation or calculation behavior. Keep Confidence and data-quality badges out of CBD details as specified above.
- Do not add redundant review links to the Overview.
- Preserve the result → cause → detail direction.
