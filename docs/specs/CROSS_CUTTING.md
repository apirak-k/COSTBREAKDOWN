# Cross-Cutting Product Rules

**Status:** Comparison, Selected Comparison lifecycle, warning, Standard Cost, Process Candidate dependency, and Selling Price/SG&A/OP rules are `FINALIZED — USER DECISION`. [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md) is the latest authority for product logic; this and the page-specific specs retain compatible requirements and UX/UI. Dashboard and visual outcomes remain `CONFIRMED DIRECTION — USER DECISION`; safe presentation details are reversible AI choices in [`design.md`](../../design.md) and [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md). Other business formulas and Trial workflow remain `PENDING — USER DECISION NEEDED`; Master Data lifecycle questions are listed in [MASTER_DATA.md](MASTER_DATA.md).

## Final Target State

Calculate Reference and Current independently from their own data, then compare the calculated results by business identity. Use `Gap = Current - Reference`; never pair by row position or turn missing required inputs into zero. Routing operations use their Work Center's rates; Cost Breakdown may aggregate processing cost by Work Center for calculation and context, while the processing Candidate is always Process/Routing. Full Comparison is the default. Selected Comparison is temporary, leaves source datasets intact, and shows only its selected-scope Gap. It may continue from Cost Breakdown into scoped Ranking; when one human-selected Candidate enters RCA, Selected Scope ends and Simulation uses full Current. An actual source-data change or cancellation at Cost Breakdown clears the scope and returns to Full Comparison.

## Source authority

Follow [REQUIREMENTS_INDEX.md](../REQUIREMENTS_INDEX.md). A newer summary cannot erase a prior finalized decision by omission. Existing code and workbook files are implementation evidence only. The 80-topic crosswalk records sources and implementation/verification status; it does not define requirements.

## Independent calculations and business identity

Reference and Current are independent snapshots and may have different row counts, table sizes, or structures. Calculate each dataset on its own first; compare the two results only after each side's Standard Cost calculation.

Match comparable records by the approved Master Data business identity, never by row position:

- BOM: `Name`
- Work Center: `WC`
- Routing: `Process`

Use the comparison statuses `UNCHANGED`, `CHANGED`, `ADDED`, and `REMOVED` where applicable. Status says what changed in the business record; Gap says the cost direction and amount. They are independent. Do not infer a status from Gap or invent a `REPLACE` status. Ambiguous identity is a data-quality warning; do not guess. A note-only difference is not a business change.

The earlier Cost Comparison agreement's Routing identity based on `Operation Code`/`Sequence`, and the still older Master Data keys based on item/code fields, were superseded by the later finalized Master Data schema. Do not reintroduce those fields as active requirements.

## Standard Cost calculation

Use this formula for the in-app Standard Cost and the separate Excel inspection view:

```text
Direct Material = Usage × Price × (1 + Loss)
Routing Factor = Manning / (Capacity × Yield)
Labor = Routing Factor × Labor Rate
Burden = Routing Factor × Burden Rate
Conversion Cost = Labor + Burden
Standard Cost = Direct Material + Labor + Burden
```

`Conversion Cost` is a subtotal of Labor and Burden. Do not add it again to Standard Cost. Calculate Standard Cost per piece. Routing rates come from the matching Work Center master data.

If a required input is missing or invalid, Capacity or Yield is non-positive, or a Work Center reference is missing/duplicated, keep the affected result unavailable and explain the issue. Do not silently substitute zero or another plausible value. An explicitly entered zero is valid.

## Processing cost and Work Center comparison

For each dataset, calculate each Routing operation using its referenced Work Center Labor and Burden rates. Aggregate the resulting processing costs by Work Center, then compare Reference and Current processing totals at that Work Center:

```text
WC Net Gap = Current WC processing total - Reference WC processing total
```

Routing `Process` remains drill-down detail under its Work Center in Cost Breakdown. Matching Routing operations one-to-one is not required to calculate the Work Center processing total or `WC Net Gap`. This Work Center aggregation is calculation/context detail and does not create a Work Center Candidate; Candidate Prioritization uses Process/Routing as the processing Candidate. If a Work Center Labor Rate or Burden Rate change causes calculated cost to change for one or more Processes, each affected Process may independently be `CHANGED` and remain the Candidate even when its Routing-owned fields are unchanged. See [Candidate Prioritization](CANDIDATE.md#processing-candidates) and the [Work Center rate dependency rule](FINAL_LOGIC_SPEC.md#work-center-rate-dependency). Missing or invalid calculation inputs remain unavailable under the Standard Cost rules above.

## Full and Selected Comparison

- Full Comparison is the default.
- Selected Comparison is an optional, temporary analysis scope entered from Cost Breakdown. It applies to BOM and Routing; all Work Centers remain available as calculation context.
- For a matched `CHANGED` or `UNCHANGED` finding, select/exclude the Reference and Current pair together. `ADDED` and `REMOVED` findings are independently selectable.
- Selected mode recalculates from the selected scope and shows **only the selected-scope Gap**. Do not show the Full Gap beside or behind it.
- The scope is analysis state, not a dataset edit. It is not included in Save, export, or version history and does not persist across application restart. Unselected records remain in the source datasets.
- The selected analysis scope may continue through Cost Breakdown and scoped Candidate Ranking. The human selects exactly one Candidate; when it enters RCA, Selected Scope ends. Simulation then starts from the normal full Current dataset. A Candidate may retain its origin as context, but that must not restrict its RCA or Simulation calculations.
- Cancellation, or an actual change to Reference or Current source data, clears the selection and returns to Full Comparison immediately. Do not remap stale selections or ask recovery questions.

## Warnings and result integrity

Warnings inform and direct; they normally do not block navigation. Disable only operations that cannot be performed. Keep validation warnings separate from comparison statuses and never show fabricated cost values.

On Master Data, preserve cell-level invalid cues and show dataset notices outside tables; keep warning prose, row issue badges, and warning-count footers out of the tables. On Cost Breakdown, remove the duplicate top calculation-warning banner and keep details collapsed by default behind `Review warnings (N)`.

## Shared status and analysis context

`CONFIRMED DIRECTION — USER DECISION`: provide a shared status/context cue that helps users understand what is happening and where to review it. Relevant states may include Ready for comparison, Product Mismatch, Missing data, and active Selected Comparison. When a state has a useful review destination, provide a link or action to that page. Status is informational and normally does not block navigation; disable only an operation that is logically impossible.

Keep an active Selected Comparison recognizable while it applies in Cost Breakdown and scoped Candidate Ranking. At RCA entry the scope ends; subsequent RCA/Simulation may retain the selected Candidate's origin as context, but must not show or apply an active Selected Scope. Exact placement, wording, and control styling while the scope is active remain reversible UI choices; this direction does not require a specific persistent status-bar layout.

## Business analysis: confirmed direction and scope

`CONFIRMED DIRECTION — USER DECISION`: the dashboard is interactive/live with simulation, tells the result-to-cause story (`Result → Cause → Detail`), and gives executives an overview with details available on demand. The user-supplied dashboard reference confirms a left-side stacked vertical cost bar chart with Selling Price shown as a line. This fixes the chart's visual direction, not its time period or business formulas. The current product data is a Reference/Current snapshot pair; do not fabricate monthly history. The reversible adaptation to available snapshot data is recorded in [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md). Keep calculation/domain logic separate from UI presentation.

Confirmed business concepts include Selling Price, SG&A, Material, Processing, COGS, GP, GP Margin, OP, OP Margin, Sales, and Volume/Quantity. Selling Price and SG&A% are scenario-editable; each defaults to Current and clearing an override returns to Current. SG&A is a percentage of Selling Price, and the SG&A and OP formulas are finalized:

```text
SG&A amount / pc = Selling Price × SG&A %
OP / pc = Selling Price - Standard Cost - SG&A amount
OP = Selling Price - MAT - LB - BD - SG&A
```

OP may be positive, zero, or negative; negative OP represents a loss and must not be clamped or labeled unavailable solely because it is negative. Do not treat formulas for other business concepts as finalized unless another compatible finalized requirement explicitly does so. The chart's historical period/source remains pending; do not infer approval from labels, the reference image, or current code.

**MatVAR, LBVAR, and BDVAR are removed from current scope by the latest explicit user decision.** They are neither pending formulas nor deferred features. Do not add them to Standard Cost or the current dashboard scope.

### Dashboard with finalized outputs and remaining pending metrics

`CONFIRMED DIRECTION — USER DECISION`: the dashboard may provide a useful engineering-first view using settled calculations: Standard Cost; Material; Labor; Burden; Processing/Conversion; comparison Gap; scenario results; finalized Selling Price, SG&A, and OP; and relevant BOM, Work Center, and Process detail. For the confirmed left-side chart, the visual reference may be adapted to the available snapshots. After a scenario is selected, the main result story is Reference → Current → Simulated with only the two adjacent state gaps; the Scenario A/B comparison supports money series and scenario-change context as specified in [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md). Exact chart data mapping and layout details remain reversible AI choices; do not fabricate historical periods or unavailable values.

Do not fabricate numeric COGS, GP, GP Margin, OP Margin, Sales, or Volume/Quantity results from guessed formulas or inputs. OP and SG&A amount use the finalized formulas above when required inputs are available. Do not display numeric zero for a metric whose formula is unavailable; show an explicit unavailable state instead. The current dashboard composition is a `PROVISIONAL — AI CHOICE` recorded in [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md); its exact layout can change without reopening these boundaries.

The actual Trial execution, validation, approval, and promotion workflow remains unspecified. The agreed Candidate-to-scenario selection and scenario-to-Trial handoff are described in [RCA_SIMULATION.md](RCA_SIMULATION.md).

## PENDING — USER DECISION NEEDED

- Formulas for other business metrics such as COGS, GP, GP Margin, OP Margin, Sales, and Volume/Quantity, plus actual Trial execution/validation/approval/promotion. Selling Price, SG&A, and OP rules are finalized above.
- The following equations were proposed/discussed but have no explicit user approval as system formulas. Preserve them as discussion context; do not implement them as finalized requirements until approved:
  - `COGS = Material + Processing`
  - `GP = Selling Price - COGS`
  - `GP Margin = GP / Selling Price`
  - `OP Margin = OP / Selling Price`
  - `Sales = Selling Price × Volume`
  - `Total GP = GP per piece × Volume`
  - `Total OP = OP per piece × Volume`
- Historical dashboard periods, data sources, Reference/Current-to-period mapping, annual averages, and exact business-chart series have not been finalized. The supplied image is visual context, not historical data or formula approval.

## Human review checkpoint

Final visual acceptance after applying the provisional visual contract has not been recorded. This is a review checkpoint, not a pending product rule; reversible layout, styling, status wording, and disabled/error presentation choices may be implemented before review.

## Traceability

Key sources are [`agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md`](../../agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md), the finalized [Master Data source specification](../history/MASTER_DATA_SPEC_2026-10-05.md), the later [review-context decisions](../history/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md), and the user-directed workbook update recorded in commit `5a08907`. The 80-topic crosswalk links implementation and verification evidence without changing these requirements.
