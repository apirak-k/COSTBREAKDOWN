# Cross-Cutting Product Rules

**Status:** Comparison, calculation, Candidate/RCA, Simulation architecture, and Selling Price/SG&A/OP rules are `FINALIZED — USER DECISION`. [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md) is the latest authority for product logic; this and page-specific specs retain compatible requirements, calculations, and UX/UI rules. Visual outcomes follow [`design.md`](../../design.md) and [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md).

## Final Target State

Calculate datasets independently from their own data, then compare calculated results strictly by business identity. Use $\text{Gap} = \text{Current} - \text{Reference}$ (or $\text{Saving} = \text{Current} - \text{SIM}$ in Parameter Simulation); never pair by row position or convert missing required inputs to zero.

Routing operations use their Work Center's rates; Cost Breakdown may aggregate processing cost by Work Center for context, while the processing Candidate is always Process/Routing. Full Comparison is the default. Selected Comparison is an optional temporary analysis scope, leaving source datasets intact and showing only its selected-scope Gap. It may constrain Candidate Ranking; Candidates are grouped into an RCA Case (which supports 1 or many Candidates) to determine Root Cause and Action. RCA legitimately ends there. Simulation is optional, operates in Parameter and Economic dimensions, can start from Reference, Current, or Custom, and compares Current vs SIM with locked structure.

## Source Authority

Follow [REQUIREMENTS_INDEX.md](../REQUIREMENTS_INDEX.md). A newer summary cannot erase a prior finalized decision by omission. Existing code and workbook files are implementation evidence only. The 80-topic crosswalk records sources and implementation/verification status; it does not define requirements.

## Independent Calculations and Business Identity

Reference, Current, and Custom are independent datasets and may have different row counts, table sizes, or structures. Calculate each dataset on its own first; compare results only after each dataset's Standard Cost calculation.

Match comparable records strictly by the approved business identity:
- BOM: `Name`
- Work Center: `WC`
- Routing: `Process`

Use the comparison statuses `UNCHANGED`, `CHANGED`, `ADDED`, and `REMOVED`. Status describes what changed in the business record; Gap describes the cost direction and magnitude. They are independent. Do not infer a status from Gap or invent a `REPLACE` status. Master Data deterministically suffixes duplicate effective identities from imports, legacy snapshots, direct edits, paste, and bulk updates; each auto-rename is reported as a warning. If raw duplicate identities reach comparison outside that normalization path, do not guess a match. A note-only difference is not a business change.

## Standard Cost Calculation

Use these canonical formulas across Master Data, Cost Breakdown, and Parameter Simulation:

$$\text{Direct Material} = \sum \left( \text{Usage} \times \text{Price} \times (1 + \text{Loss}) \right)$$

$$\text{Routing Factor} = \frac{\text{Manning}}{\text{Capacity} \times \text{Yield}}$$

$$\text{Labor} = \text{Routing Factor} \times \text{Work Center Labor Rate}$$

$$\text{Burden} = \text{Routing Factor} \times \text{Work Center Burden Rate}$$

$$\text{Conversion Cost} = \text{Labor} + \text{Burden}$$

$$\text{Standard Cost} = \text{Direct Material} + \text{Labor} + \text{Burden} = \text{Direct Material} + \text{Conversion Cost}$$

`Conversion Cost` is a subtotal of Labor and Burden; do not add it again to Standard Cost. Calculate Standard Cost per piece. Routing rates come from the matching Work Center master data.

If a required input is missing or invalid, Capacity or Yield is non-positive, or a Work Center reference is missing/duplicated, keep the affected result **unavailable** and explain the issue. Do not silently substitute zero or another plausible value. An explicitly entered zero is valid where logically permitted.

## Processing Cost and Work Center Comparison

For each dataset, calculate each Routing operation using its referenced Work Center Labor and Burden rates. Aggregate the resulting processing costs by Work Center, then compare Reference and Current processing totals at that Work Center:

$$\text{WC Net Gap} = \text{Current WC processing total} - \text{Reference WC processing total}$$

Routing `Process` remains drill-down detail under its Work Center in Cost Breakdown. Matching Routing operations one-to-one is not required to calculate the Work Center processing total or `WC Net Gap`. This Work Center aggregation is calculation/context detail and does not create a Work Center Candidate; Candidate Prioritization uses Process/Routing as the processing Candidate. If a Work Center Labor Rate or Burden Rate change causes calculated cost to change for one or more Processes, each affected Process may independently be `CHANGED` and remain the Candidate even when its Routing-owned fields are unchanged. See [Candidate Prioritization](CANDIDATE.md) and the [Work Center rate dependency rule](FINAL_LOGIC_SPEC.md#work-center-rate-dependency).

## Full and Selected Comparison

- Full Comparison is the default in Cost Breakdown.
- Selected Comparison is an optional, temporary analysis scope entered from Cost Breakdown. It applies to BOM and Routing; all Work Centers remain available as calculation context.
- For a matched `CHANGED` or `UNCHANGED` finding, select/exclude the Reference and Current pair together. `ADDED` and `REMOVED` findings are independently selectable.
- Selected mode recalculates from the selected scope and shows **only the selected-scope Gap**. Do not show the Full Gap beside or behind it.
- The scope is analysis state, not a dataset edit. It is not included in Save, export, or version history and does not persist across application restart.
- Selected scope may constrain Candidate Ranking. An RCA Case may be created from selected candidates; RCA completion or opening Simulation does not lock Simulation to that scope.
- Cancellation, or an actual change to Reference or Current source data, clears the selection and returns to Full Comparison immediately.

## Candidate and Multi-Candidate RCA

- Candidate pool derives from Full or Selected CBD scope.
- Ranking is an advisory prioritization aid; the system never forces rank #1.
- One RCA Case may contain **one or multiple Candidates**.
- Root Cause / Why? and Action are captured at the RCA Case level.
- No new RCA Note system is created.
- **RCA legitimately ends upon recording Root Cause and Action.** Simulation is optional.

## Simulation Architecture: Parameter & Economic Dimensions

Simulation is a single module with two dimensions:
```text
SIMULATION
├─ Parameter Simulation
└─ Economic Simulation
```

1. **Parameter Simulation:**
   - Evaluates what-if product costs under entered parameters.
   - May start from `Reference`, `Current`, or `Custom`.
   - **Structure is locked (Zero structural edits):** Cannot add/remove/resize records in SIM. Master Data Sizing owns all structural changes; structural edits belong in Master Data / Custom first.
   - Primary comparison basis is always **Current vs SIM**.
   - Statuses in SIM: `CHANGED`, `UNCHANGED`, and `ADDED` are visible and parameter-editable; `REMOVED` is visible (affecting Gap) but not editable.
   - **Factors to Simulate:** Users select multiple factors for editing visibility; the entire SIM dataset recalculates live.
   - SIM-editable parameters: Strictly physical BOM (`Price`, `Usage`, `Loss`) and Routing (`Manning`, `Capacity`, `Yield`). Work Center rates are **not** SIM-editable.
   - **Selling Price and SG&A %:** Economic/commercial parameters overridden at scenario metadata level, NOT parameter factor inputs. They affect SG&A Amount and OP, not Standard Cost.

2. **Economic Simulation:**
   - Evaluates investment feasibility: $\text{Required Saving / pc} = \frac{\text{Action Cost}}{\text{Evaluation Quantity}}$.
   - **Economics is separate from Standard Cost:** Action Cost must **NOT** be folded into MAT, LB, BD, or Standard Cost.
   - No duplicate parameter editor inside Economic Simulation.

3. **Combined Evaluation:**
   - Compares $\text{Parameter Saving / pc}$ vs $\text{Required Saving / pc}$ to determine $\text{Economic Margin}$.
   - Result is **advisory**: Scenarios below break-even remain visible and selectable.
   - Exactly Scenario A and B is **not a mandatory business requirement**.

## Business Outputs: Selling Price, SG&A, and OP

Preserve finalized business formulas:

$$\text{SG&A amount / pc} = \text{Selling Price} \times \text{SG\&A \%}$$

$$\text{OP / pc} = \text{Selling Price} - \text{Standard Cost} - \text{SG\&A amount}$$

- OP can be positive, zero, or negative. Negative OP represents an operating loss and must remain visibly displayed.
- Selling Price and SG&A % can be overridden in simulation scenarios.
- Other financial metrics (COGS, GP, GP Margin, OP Margin, Sales, historical time-series) and MatVAR/LBVAR/BDVAR are **OUT OF SCOPE**.

## Trial Lifecycle Boundary

No dedicated Trial execution, validation, approval, or promotion lifecycle is required.
- `Custom` in Master Data can store real trial measurements if desired.
- To use Custom as Current: View `Current` in Master Data, choose `Clone`, then select `Custom` as the source.

## Warnings and Result Integrity

- Warnings inform and direct; they do not block navigation unless an action is logically impossible. Master Data warning counts represent distinct affected data locations, not warning categories.
- Keep validation warnings separate from comparison statuses.
- Missing required inputs leave calculations unavailable; never substitute zero.
- On Master Data, preserve cell-level invalid cues and show dataset notices outside tables; keep warning prose, row issue badges, and warning-count footers out of the tables. On Cost Breakdown, remove duplicate top calculation-warning banners and keep details collapsed by default behind `Review warnings (N)`.

## Shared Status and Analysis Context

The global Footer is a compact three-group workspace summary: Reference/Current structure counts (BOM / WC / RTG), Reference+Current readiness, Product Match/Mismatch, all-dataset warning-item count, and full Reference/Current Standard Cost plus Net Gap. Both readiness and product statuses use a dot and semantic text color; Product status remains clickable without a chevron. Selected Comparison does not change those full snapshot costs. Footer status/warning actions open the corresponding Prepare Dataset view. The viewport shell keeps Header at the top, Main in its own vertical scroll area, and Footer at the bottom without overlaying Main. Header, Main, and Footer content share the centered `max-w-[1440px]` frame while the Header/Footer backgrounds span the viewport.

`CONFIRMED DIRECTION — USER DECISION`: provide a shared status/context cue that helps users understand what is happening and where to review it. Relevant states include:
- **`Ready for comparison`:** Both Reference and Current contain sufficient valid data for Cost Breakdown.
- **`Product Mismatch`:** Reference and Current differ in effective Product Name or UOM after trimming and case normalization (informational, non-blocking comparison status, not a warning).
- **`Missing data`:** One or both datasets have incomplete/missing required fields.
- **`Active Selected Comparison`:** Cost Breakdown or Candidate Ranking is scoped to a selected subset of records; ends when leaving CBD/Candidate scope.

When a state has a useful review destination, provide a convenient link or action to that page. Status is informational and normally does not block navigation; disable only an operation that is logically impossible.

Master Data dataset save state has two user-facing values: `Saved` when Working matches Last Saved, and `Draft` when it differs or has never been saved. Do not fabricate Product Name `Product` or UOM `PC`; blank metadata stays blank through display and export. Header Undo/Redo are contextual to Master Data, and Header Search filters its current table view. See [`MASTER_DATA_TOOLBAR_PREPARE_UX.md`](MASTER_DATA_TOOLBAR_PREPARE_UX.md) for the current interface contract.

Keep an active Selected Comparison recognizable while it applies in Cost Breakdown and scoped Candidate Ranking. At RCA entry or when opening Simulation, the scope ends; subsequent RCA/Simulation may retain the selected Candidate's origin as context, but must not show or apply an active Selected Scope. Exact placement, wording, and control styling while the scope is active remain reversible UI choices; this direction does not require a specific persistent status-bar layout.

## Product Boundaries and Scope

### Additional Business Metrics Scope
The finalized current result/economics scope focuses strictly on Selling Price, MAT, LB, BD, Standard Cost, SG&A, and OP. Additional business metrics (such as COGS, GP, GP Margin, OP Margin, Sales, historical monthly metrics, and Volume beyond the finalized Evaluation Quantity usage) are **OUT OF SCOPE**. Do not invent formulas or requirements for these items.

Discussion formulas preserved for historical context only (not implemented system formulas):
- `COGS = Material + Processing`
- `GP = Selling Price - COGS`
- `GP Margin = GP / Selling Price`
- `OP Margin = OP / Selling Price`
- `Sales = Selling Price × Volume`
- `Total GP = GP per piece × Volume`
- `Total OP = OP per piece × Volume`

Historical dashboard periods, time-series data sources, Reference/Current-to-period mapping, and annual averages are likewise OUT OF SCOPE for the current snapshot-based model.

## Human Review Checkpoint

Final visual acceptance after applying the provisional visual contract has not been recorded. This is a verification/review checkpoint, not an unresolved product rule; reversible layout, styling, status wording, and disabled/error presentation choices may be implemented before review.

## Traceability

Key sources are [`agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md`](../../agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md), the finalized [Master Data source specification](../history/MASTER_DATA_SPEC_2026-10-05.md), the later [review-context decisions](../history/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md), and the user-directed workbook update recorded in commit `5a08907`. The 80-topic crosswalk links implementation and verification evidence without changing these requirements. The consolidated business logic across datasets, Multi-Candidate RCA, and Simulation dimensions is finalized in [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md).
