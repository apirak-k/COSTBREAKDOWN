# Cross-Cutting Product Rules

**Status:** Comparison, calculation, Candidate/RCA, Simulation architecture, and Selling Price/SG&A/OP rules are `FINALIZED โ€” USER DECISION`. [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md) is the latest authority for product logic; this and page-specific specs retain compatible requirements, calculations, and UX/UI rules. Visual outcomes follow [`design.md`](../../design.md) and [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md).

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

Use the comparison statuses `UNCHANGED`, `CHANGED`, `ADDED`, and `REMOVED`. Status describes what changed in the business record; Gap describes the cost direction and magnitude. They are independent. Do not infer a status from Gap or invent a `REPLACE` status. Ambiguous or duplicate identity is a data-quality warning; do not guess. A note-only difference is not a business change.

## Standard Cost Calculation Engine

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
โ”โ”€ Parameter Simulation
โ””โ”€ Economic Simulation
```

1. **Parameter Simulation:**
   - Evaluates what-if product costs under entered parameters.
   - May start from `Reference`, `Current`, or `Custom`.
   - **Structure is locked:** Cannot add/remove/resize records in SIM. Structural edits belong in Master Data / Custom first.
   - Primary comparison basis is always **Current vs SIM**.
   - Statuses in SIM: `CHANGED`, `UNCHANGED`, and `ADDED` are visible and parameter-editable; `REMOVED` is visible (affecting Gap) but not editable.
   - **Factors to Simulate:** Users select multiple factors for editing visibility; the entire SIM dataset recalculates live.
   - SIM-editable parameters: BOM (Price, Usage, Loss) and Routing (Manning, Capacity, Yield). Work Center rates are **not** SIM-editable.

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
- To promote Custom to Current: View `Current` in Master Data and choose `Clone From Custom`.

## Warnings and Result Integrity

- Warnings inform and direct; they do not block navigation unless an action is logically impossible.
- Keep validation warnings separate from comparison statuses.
- Missing required inputs leave calculations unavailable; never substitute zero.
