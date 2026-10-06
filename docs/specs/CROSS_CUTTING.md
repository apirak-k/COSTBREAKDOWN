# Cross-Cutting Product Rules

**Status:** Comparison, Selected Comparison, warning, and Standard Cost rules are `FINALIZED — USER DECISION`. Dashboard and visual outcomes are `CONFIRMED DIRECTION — USER DECISION`; safe presentation details are reversible AI choices in [`design.md`](../../design.md) and [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md). Only the stated business formulas and Trial workflow remain `PENDING — USER DECISION NEEDED`.

## Final Target State

Calculate Reference and Current independently from their own data, then compare the calculated results by business identity. Use `Gap = Current - Reference`; never pair by row position or turn missing required inputs into zero. Routing operations use their Work Center's rates; processing cost is aggregated and compared at Work Center level, with Process available as detail. Full Comparison is the default. Selected Comparison is temporary, leaves source datasets intact, and shows only its selected-scope Gap until a real source-data change or cancellation returns the user to Full Comparison.

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

Routing `Process` remains drill-down detail under its Work Center. Matching Routing operations one-to-one is not required to calculate the Work Center processing total or `WC Net Gap`. Missing or invalid calculation inputs remain unavailable under the Standard Cost rules above.

## Full and Selected Comparison

- Full Comparison is the default.
- Selected Comparison is an optional, temporary analysis scope entered from Cost Breakdown. It applies to BOM and Routing; all Work Centers remain available as calculation context.
- For a matched `CHANGED` or `UNCHANGED` finding, select/exclude the Reference and Current pair together. `ADDED` and `REMOVED` findings are independently selectable.
- Selected mode recalculates from the selected scope and shows **only the selected-scope Gap**. Do not show the Full Gap beside or behind it.
- The scope is analysis state, not a dataset edit. It is not included in Save, export, or version history and does not persist across application restart. Unselected records remain in the source datasets.
- Carry the selected analysis scope through Cost Breakdown, Candidate, and RCA/Simulation. Exact downstream page presentation is specified per page where closed.
- Cancellation, or an actual change to Reference or Current source data, clears the selection and returns to Full Comparison immediately. Do not remap stale selections or ask recovery questions.

## Warnings and result integrity

Warnings inform and direct; they normally do not block navigation. Disable only operations that cannot be performed. Keep validation warnings separate from comparison statuses and never show fabricated cost values.

On Master Data, preserve cell-level invalid cues and show dataset notices outside tables; keep warning prose, row issue badges, and warning-count footers out of the tables. On Cost Breakdown, remove the duplicate top calculation-warning banner and keep details collapsed by default behind `Review warnings (N)`.

## Business analysis: confirmed direction and scope

`CONFIRMED DIRECTION — USER DECISION`: the dashboard is interactive/live with simulation, tells the result-to-cause story (`Result → Cause → Detail`), and gives executives an overview with details available on demand. A bar-chart-first approach is a design direction, not a fixed chart requirement. Keep calculation/domain logic separate from UI presentation.

Confirmed business concepts include Selling Price, SG&A, Material, Processing, COGS, GP, GP Margin, OP, OP Margin, Sales, and Volume/Quantity. OP must allow negative values. Business metric formulas, monetary SG&A treatment, total GP/OP formulas, and exact chart composition remain undecided; do not infer them from labels or current code. Selling Price and SG&A are stored as metadata inputs, with SG&A entered as a percent of Selling Price. Scenario overrides of Selling Price and SG&A are a confirmed future direction; each uses the current dataset value by default and clearing an override falls back to Current.

**MatVAR, LBVAR, and BDVAR are removed from current scope by the latest explicit user decision.** They are neither pending formulas nor deferred features. Do not add them to Standard Cost or the current dashboard scope.

### Engineering-first dashboard while business formulas are pending

`CONFIRMED DIRECTION — USER DECISION`: until business formulas are finalized, the dashboard may provide a useful engineering-first view using only settled calculations: Standard Cost; Material; Labor; Burden; Processing/Conversion; comparison Gap; scenario Standard Cost and Gross Saving; and relevant BOM, Work Center, and Process detail.

Do not fabricate numeric COGS, GP, GP Margin, OP, OP Margin, Sales, or Volume/Quantity results from guessed formulas or inputs. Do not display numeric zero for a metric whose formula is unavailable. Show an explicit unavailable state, such as **“Not calculated — formula pending”**, or equivalent wording. Selling Price and SG&A may appear as input context without being presented as calculated business results. The current engineering-first composition is a `PROVISIONAL — AI CHOICE` recorded in [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md); its exact layout can change without reopening these boundaries.

The actual Trial execution, validation, approval, and promotion workflow remains unspecified. The agreed Candidate-to-scenario selection and scenario-to-Trial handoff are described in [RCA_SIMULATION.md](RCA_SIMULATION.md).

## PENDING — USER DECISION NEEDED

- Whether importing a dataset preserves, resets, or recalculates its saved Sizing counts.
- Whether Clone is gated by source readiness and how readiness metadata transfers; the copy direction and Working/Last Saved behavior are settled in [MASTER_DATA.md](MASTER_DATA.md).
- Whether Clear requires a confirmation step; preserve the agreed Clear data effects while this interaction detail remains unresolved.
- Business metric formulas and any financial treatment needed to calculate them; actual Trial execution/validation/approval/promotion.
- Final human visual acceptance after applying the provisional visual contract. Routine layout, styling, status wording, and disabled/error presentation choices may be made provisionally and do not block implementation.

## Traceability

Key sources are [`agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md`](../../agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md), the finalized [Master Data source specification](../history/MASTER_DATA_SPEC_2026-10-05.md), the later [review-context decisions](../history/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md), and the user-directed workbook update recorded in commit `5a08907`. The 80-topic crosswalk links implementation and verification evidence without changing these requirements.
