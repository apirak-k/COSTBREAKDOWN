# Cross-Cutting Product Rules

**Status:** Comparison, calculation, legacy Candidate/RCA domain compatibility, Simulation architecture, and Selling Price/SG&A/OP rules are `FINALIZED — USER DECISION`. [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md) is the latest authority for product logic; this and page-specific specs retain compatible requirements, calculations, and UX/UI rules. Visual outcomes follow [`design.md`](../../design.md) and [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md).

## Final Target State

The current visible page flow is **Master Data → Cost Breakdown → Simulation**. Calculate datasets independently, then compare results strictly by business identity. Use $\text{Gap} = \text{Current} - \text{Reference}$ in CBD; Simulation's core supports any Before/After effective dataset pair, while the visible Current/SIM presentation remains during Phase 1. Never pair by row position or convert missing required inputs to zero.

Routing operations use their Work Center's rates; Cost Breakdown may aggregate processing cost by Work Center for context, while each processing finding is a Process/Routing record. Full Comparison is the default. Selected Comparison is a temporary CBD-only analysis view that leaves source datasets intact; the full comparison remains primary and selected-scope contributions appear beside it as secondary information. It does not create a Candidate/RCA page or pass scope/context into Simulation. Legacy Candidate/RCA records may remain for saved-session compatibility only. Simulation is directly accessible and opens ready to work. Its Phase 1 state supports role-local effective datasets and generic Before/After comparisons with locked structure; the visible Current/SIM presentation remains for compatibility.

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

Existing invalid legacy numeric values may remain visible and editable for correction, but invalid values are never used as valid calculation inputs. Affected and dependent results remain unavailable until the values are corrected.

## Processing Cost and Work Center Comparison

Calculate each Routing operation independently for Reference and Current using that snapshot's referenced Work Center Labor and Burden rates: Reference uses Reference Work Center rates, and Current uses Current Work Center rates. Aggregate each snapshot's resulting processing costs by Work Center, then compare Reference and Current processing totals at that Work Center:

$$\text{WC Net Gap} = \text{Current WC processing total} - \text{Reference WC processing total}$$

Routing `Process` is the primary processing comparison record in Cost Breakdown's Itemized Comparison. Work Center is a separate aggregation/calculation context, not the parent UI hierarchy for Process records and not a Candidate. A Process moving between Work Centers remains one matched Process finding when its approved business identity matches. Matching Routing operations one-to-one is not required to calculate the Work Center processing total or `WC Net Gap`. This Work Center aggregation is calculation/context detail and does not create a Work Center Candidate; Candidate Prioritization uses Process/Routing as the processing Candidate. If a Work Center Labor Rate or Burden Rate change causes calculated cost to change for one or more Processes, each affected Process may independently be `CHANGED` and remain the Candidate even when its Routing-owned fields are unchanged. See [Candidate Prioritization](CANDIDATE.md) and the [Work Center rate dependency rule](FINAL_LOGIC_SPEC.md#work-center-rate-dependency).

## Full and Selected Comparison

- Full Comparison is the default in Cost Breakdown.
- Selected Comparison is an optional, temporary analysis scope entered from Cost Breakdown. It applies to BOM and Routing; all Work Centers remain available as calculation context.
- For a matched `CHANGED` or `UNCHANGED` finding, select/exclude the Reference and Current pair together. `ADDED` and `REMOVED` findings are independently selectable.
- Selected mode calculates the selected-scope Gap from selected findings. Keep the Full Gap and full comparison visible as the primary result; show Selected beside the Full Gap as secondary information.
- The scope is analysis state, not a dataset edit. It is not included in Save, export, or version history and does not persist across application restart.
- Selected Comparison exists only inside CBD. Leaving CBD or changing Reference/Current data clears the scope; Simulation is independent.
- Cancellation, or an actual change to Reference or Current source data, clears the selection and returns to Full Comparison immediately.

## Legacy Candidate and Multi-Candidate RCA Session Domain

The following domain rules describe compatible historical RCA session data only. They are not current visible screens or workflow stages.

- Candidate pool derives from Full or Selected CBD scope.
- Ranking is an advisory prioritization aid; the system never forces rank #1.
- One RCA Case may contain **one or multiple Candidates**.
- Root Cause / Why? and Action are captured at the RCA Case level.
- No new RCA Note system is created.
- **Legacy RCA sessions** retain their historical Root Cause + Action completion semantics. They do not define a current visible workflow or gate Simulation.

## Simulation Architecture: Role-Local Overrides and Separate Economics

Simulation is the third current visible page. It opens with a usable workspace and keeps engineering cost and economic evaluation separate:
```text
SIMULATION
├─ Parameter Simulation
└─ Economic Simulation
```

1. **Parameter Simulation (Phase 1 foundation, user decision 2026-10-19):**
   - The only datasets are Master Data Reference, Current, and Custom Working. Simulation persists no separate SIM dataset; it stores independent, validated parameter overrides per role and derives effective snapshots over each latest Working dataset.
   - Effective Reference uses Reference Work Center rates, Current uses Current rates, and Custom uses Custom rates. Rates are never Simulation-editable.
   - A Master Working change rebases only that role's overrides; unchanged roles keep their overrides.
   - `activeDataset` owns parameter edits. Result/Economic calculations use `comparisonBefore → comparisonAfter`; `comparisonAfter` owns the Business/Economic draft and defaults. These contexts are independent; all nine ordered pairs are supported, including self-comparisons. Defaults are active Current and Reference → Current.
   - Reset clears the active role's overrides; Reset All clears all roles independently. Send maps each role to the same Master Working role; Send All prepares and applies all three atomically. Send changes Working only and preserves Last Saved.
   - **Structure is Master Data-owned:** Simulation derives the structure from the selected role's latest Working dataset. Structural alternatives are prepared in Master Data / Custom.
   - Result and Economic calculations use any effective Before/After pair and match BOM, Work Center, and Routing by business identity, never row position. Parameter editor rows remain scoped to `activeDataset`. Visible Current/SIM labels and graph presentation remain compatible until later UI phases.
   - There is **no Factors to Simulate selector**. Direct edits are BOM (`Price`, `Usage`, `Loss`) and Routing (`Manning`, `Capacity`, `Yield`). Missing/invalid required inputs remain unavailable.
   - Persistence uses an explicit schema version. Safe unchanged-Current legacy parameter state may migrate; structurally incompatible or stale single-SIM state is discarded. State remains product-scoped and deleted products are pruned.

2. **Economic Simulation:**
   - Inputs: Fixed Action Cost, Variable Action Cost / pc, positive integer Batch Size, Selling Price override, and SG&A % override. All Business/Economic inputs are stored under `comparisonAfter`; blank commercial overrides use effective After values.
   - Fixed Cost / pc = Fixed Action Cost / Batch Size.
   - Required Saving / pc = Fixed Cost / pc + Variable Action Cost / pc.
   - Parameter Saving / pc = effective Before Standard Cost − effective After Standard Cost.
   - Economic Margin / pc = Parameter Saving / pc − Required Saving / pc.
   - SG&A / pc = Selling Price × (SG&A % / 100); OP / pc = Selling Price − effective After Standard Cost − SG&A / pc.
   - **Economics is separate from Standard Cost:** Economic inputs never alter MAT, LB, BD, Conversion, or Standard Cost. Negative Economic Margin and OP remain valid and visible.

3. **Combined Evaluation:**
   - Compares $\text{Parameter Saving / pc}$ vs $\text{Required Saving / pc}$ to determine $\text{Economic Margin}$.
   - Result is **advisory**: Scenarios below break-even remain visible and selectable.
   - Exactly Scenario A and B is **not a mandatory business requirement**.

## Business Outputs: Selling Price, SG&A, and OP

Preserve finalized business formulas:

$$\text{SG&A amount / pc} = \text{Selling Price} \times \frac{\text{SG\&A \%}}{100}$$

$$\text{OP / pc} = \text{effective After Selling Price} - \text{effective After Standard Cost} - \text{SG\&A amount / pc}$$

- OP can be positive, zero, or negative. Negative OP represents an operating loss and must remain visibly displayed.
- Selling Price and SG&A % can be overridden in the Simulation Economic panel.
- Other financial metrics (COGS, GP, GP Margin, OP Margin, Sales, historical time-series) and MatVAR/LBVAR/BDVAR are **OUT OF SCOPE**.

## Trial Lifecycle Boundary

No dedicated Trial execution, validation, approval, or promotion lifecycle is required.
- `Custom` in Master Data can store real trial measurements if desired.
- To use Custom as Current: View `Current` in Master Data, choose `Clone`, then select `Custom` as the source.

## Warnings and Result Integrity

- Master Data Warnings are generated identities and auto-renamed duplicates. They are non-blocking, amber/yellow, and count distinct affected locations. Missing required values are separate Blockers; they keep required-cell cues visible and may make affected/dependent calculations unavailable. Neither state blocks normal navigation or replaces missing values with zero.
- Keep validation Warnings and Blockers separate from comparison statuses. Product Match is green and Product Mismatch violet; both are informational, not Warnings or Blockers. The UI also shows neutral `Product Not Set` when either Reference or Current lacks Product Name or UOM; this display state does not change the existing handoff `productMismatch` boolean, readiness, counts, or calculations. Warning emphasis remains amber/yellow.
- On Master Data, preserve local invalid-cell cues and show issue details in Prepare Dataset. Keep issue prose and badges out of ordinary table rows. The Warning visibility toggle controls amber field fills for both Warning and Blocker fields; when OFF, both fills disappear while Blocker red `*` markers, validation, counts, readiness, and navigation remain. Footer `⚠ N` counts Warnings only and toggles Prepare Dataset; its readiness tooltip shows only Reference and Current Blocker counts with CircleX. On Cost Breakdown, do not duplicate Warning/Blocker review UI: the shared Header Info (`I`) → Prepare Dataset path remains the review location. Do not add duplicate top calculation-warning banners, a page-level Data Quality summary, or a separate CBD review disclosure. This presentation choice leaves validation, warning/blocker semantics, and calculation behavior unchanged; comparison statuses remain separate from data-quality issues.
- Warning highlights add a pale amber fill and a 1px amber border to both Warning and Blocker fields while ON; focus adds a local blue border/ring while retaining that fill. With highlights OFF, both fields return to their normal fill; Blocker `*` and validation remain. Never tint a full cell or row for an issue.
- Master Data uses proportional, explicit table-column widths. BOM Material, Work Centers Work Center, Routing Process, and Routing Work Center use a shared identity-width family; Routing reserves two such slots. Loss and Yield keep the numeric value, spinner, and Blocker marker in the input shell, with `%` outside that shell but within the same field group and owning column. Dropdown chevron and Blocker marker occupy distinct zones. Tables keep horizontal scrolling at narrower widths instead of squeezing columns.
- The `#` header control's all-visible-selected state uses a persistent medium/dark slate fill, white `#`, and subtle darker border; selected row-number buttons remain the stronger blue indicator.
- A safe blank click in the main workspace/gutters blurs the active editor, clears temporary spreadsheet cell focus/range, and dismisses transient menus/popovers without changing row selection, entered values, dataset/table selection, Search, or Saved/Working state. Escape closes only the topmost transient layer; otherwise it blurs an active field and clears temporary spreadsheet cell focus/range. Escape never undoes data. Existing modal Escape behavior remains owned by the modal.
- Clear communicates its destructive meaning only while hovered: the trigger and its all-dataset menu item use a pale rose surface and rose foreground. Idle weight, blue keyboard focus, and neutral tooltips stay unchanged; other toolbar actions retain neutral hover.
- Prepare Dataset is rendered by the shared shell. Header Info hover/pin and Footer Warning toggle open it without changing the active page; only choosing an issue detail navigates to Master Data. Every close path clears the panel-only dataset filter and expanded categories so it reopens at All with details collapsed.
- Shared tooltips render in a viewport-clamped top-level layer above their triggers, preserve their accessible description relationship, and do not affect layout or get clipped by Header stacking contexts.

## Numeric Display and Editing

- Decimal business values display exactly two decimal places, including trailing zeroes (`12` → `12.00`, `12.5` → `12.50`). Percentages follow the same display rule. Semantic integer values such as row numbers, counts, and sequence numbers remain whole (`3`, not `3.00`). Non-finite values remain unavailable. Formatting is presentation only and does not round stored inputs or calculation precision.
- Editable numeric business values use the shared text-based numeric editor. Ordinary decimal entry accepts up to two UI decimal places; integer entry accepts whole numbers. Simulation Usage and Capacity retain their existing four-decimal input domain while displaying two decimals when not being edited. A focused draft may remain incomplete while typing, and blank remains blank/missing. On blur, valid decimal values show two places and integers remain whole. Presentation does not round stored values or calculations. Text fields do not receive numeric spinner or wheel behavior.
- Numeric spinners are visible only while focused. A pointer press applies one step immediately, then repeats after a short hold delay until release, cancellation, pointer leave, loss of interaction, or unmount. Spinner, ArrowUp/Down, and focused-wheel adjustments use the place value under the caret (for example, 123.45 steps by 100, 10, 1, 0.1, or 0.01 according to the active digit). If no single digit is active, the step falls back to 1.00 for decimals and 1 for integers. Integer inputs use integer place values only. Unfocused inputs do not consume page scrolling.
- Focused spinner arrows sit slightly inset from the numeric editor's right edge. When a Blocker marker is present, the arrows remain in their reserved slot immediately before the marker zone; they never cover the editable value/caret or collide with a `%` suffix outside the shell. Spinner placement does not change active-place stepping or shift the value when focus changes.
- Percentage units such as `%` stay outside the shared Master Data value-field perimeter but inside the same field group and owning table column. The value, spinner, and Blocker marker remain inside that perimeter. Percentage editors use the same direct Focus and issue treatment as other numeric editors; View values and unavailable dashes occupy the full value-field width. Percentage spacing stays stable in View, Edit, focus, and issue states.
- Enforce the shared field domains at every Master Data ingress: Selling Price, SG&A, BOM Usage/Price, Labor/Burden Rate, and Routing Manning are `>= 0`; SG&A is also at most `100%`; BOM Loss is `0..100%` inclusive (stored `0..1`); Routing Capacity is `> 0`; Routing Yield is `> 0..100%` inclusive (stored `>0..1`). Configured Sizing counts are integers from 1 through their existing per-table limits; unset counts remain unset. Preserve explicit zero where the domain permits it and imported precision where valid.
- Reject invalid typed or pasted values rather than storing them, repairing them to another number, or coercing them to the nearest legal boundary. Capacity and Yield may hold a transient zero-prefix draft so a valid fraction below one can be entered; zero itself never commits. Spinner and wheel operations honor the same field domains and may clear a nullable value when decrementing would cross its lower valid boundary.
- Poka-Yoke is separate from Blocker status. Rejected input does not become canonical data or create a new issue; a required value that remains blank retains its existing Blocker and unavailable dependent result.

## Shared Status and Analysis Context

The global Footer is a compact three-group workspace summary: Reference/Current structure counts (BOM / WC / RTG), Reference+Current readiness, Product Match/Mismatch/Not Set, all-dataset Warning-item count, and full Reference/Current Standard Cost plus Net Gap. Money and gap values display to two decimals. Readiness uses blue for Ready and muted rose/red for Incomplete; Product status uses green for Match, violet for Mismatch, and neutral slate for Not Set; Warning emphasis remains amber/yellow. Product Match/Mismatch/Not Set is display-only. Footer tooltips center above their triggers, clamp to the viewport, and keep content left-aligned. The Product tooltip shows full Reference and Current identities, wrapping long names and explicitly naming missing values (`Not set`, `Product name not set`, or `UOM not set`) without fabricating a fallback. The readiness tooltip shows only Reference and Current Blocker counts separately, without repeating Ready/Incomplete. The Warning action counts Warning items only and toggles the Header-owned Prepare Dataset view. Selected Comparison does not change full snapshot costs. The Footer cost summary keeps THB as the currency and shows the trimmed sole nonblank UOM when only one side has one, the trimmed Reference spelling when both normalized UOMs match, and `THB/Unit` when both are blank or conflict. The unit label is bold but secondary, has no pipe separator or parentheses, and when inline sits about 20–24px after Net Gap; below 360px it wraps onto a right-aligned line to keep the summary within the viewport. The viewport shell keeps Header, Main, and Footer in the viewport without the Footer overlaying Main. Normal pages use Main as the natural vertical scroll owner where applicable. Desktop CBD uses Main as its single primary vertical scroll owner: the Subheader and bounded Cost Element / Work Center overview stay sticky together at the top of Main, while Candidate Findings remains normal-flow content and does not create another vertical scroller. Work Center rows may independently scroll inside their bounded panel; its header and Total remain outside the row scroll body and share its grid. Desktop Simulation retains its existing exception: the workspace is fixed within the shell, and only BOM/RTG table bodies scroll vertically. Narrow layouts may use natural page scrolling and local responsive table fallback. Master Data table wrappers may scroll horizontally but do not cap or independently scroll vertically. Header, Main, and Footer content share the centered `max-w-[1440px]` frame while the Header/Footer backgrounds span the viewport.

`CONFIRMED DIRECTION — USER DECISION`: provide a shared status/context cue that helps users understand what is happening and where to review it. Relevant states include:
- **`Ready for comparison`:** Both Reference and Current contain sufficient valid data for Cost Breakdown.
- **`Product Mismatch`:** The existing handoff comparison remains based on effective Product Name/UOM after trimming and case normalization (informational, non-blocking status, not a Warning or Blocker). For UI display, show `Product Mismatch` only when both sides have a complete Product Name and UOM; otherwise show neutral `Product Not Set` without changing the handoff boolean.
- **`Missing data`:** One or both datasets have incomplete/missing required fields.
- **`Active Selected Comparison`:** Cost Breakdown is scoped to selected records; the scope ends on leaving CBD or changing its Reference/Current source data.

When a state has a useful review destination, provide a convenient link or action to that page. Status is informational and normally does not block navigation; disable only an operation that is logically impossible.

Master Data dataset save state has two user-facing values: `Saved` when Working matches Last Saved, and `Draft` when it differs or has never been saved. Do not fabricate Product Name `Product` or UOM `PC`; blank metadata stays blank through display and export. Header Undo/Redo are contextual: Master Data uses its existing edit history, Cost Breakdown uses one chronological Candidate reorder history across BOM and Routing, and Simulation uses product-, role-, and basis-scoped ephemeral edit histories. CBD records only completed manual reorder actions; changing or reapplying Sort clears manual orders and CBD Undo/Redo. Search stays local to the Master Data toolbar and filters its current table view. See [`MASTER_DATA_TOOLBAR_PREPARE_UX.md`](MASTER_DATA_TOOLBAR_PREPARE_UX.md) for the current interface contract.

Keep an active Selected Comparison recognizable only while it applies inside Cost Breakdown. It ends when leaving CBD or changing its Reference/Current source data. Simulation does not retain Candidate origin context or apply a selected CBD scope.

Simulation owns product-scoped, role-local parameter overrides over Master Data Working; there is no CBD Selected Comparison handoff or synchronization. The legacy Clone from control selects the active Simulation role in Phase 1 and does not copy structure or CBD selection, filters, or sorting. On desktop, Simulation uses the shared-shell workspace without page-level vertical scrolling; only BOM and RTG table bodies scroll internally. Narrow screens may use natural page scrolling and stacked panels.

## Product Boundaries and Scope

### Additional Business Metrics Scope
The finalized current result/economics scope focuses strictly on Selling Price, MAT, LB, BD, Standard Cost, SG&A, and OP. Additional business metrics (such as COGS, GP, GP Margin, OP Margin, Sales, and historical monthly metrics) are **OUT OF SCOPE**. Do not invent formulas or requirements for these items.

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

Key sources are [`agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md`](../../agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md), the finalized [Master Data source specification](../history/MASTER_DATA_SPEC_2026-10-05.md), the later [review-context decisions](../history/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md), and the user-directed workbook update recorded in commit `5a08907`. The 80-topic crosswalk links implementation and verification evidence without changing these requirements. The consolidated current page flow and Simulation rules, plus retained legacy RCA session semantics, are finalized in [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md).
