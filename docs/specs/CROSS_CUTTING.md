# Cross-Cutting Product Rules

**Status:** Comparison, calculation, legacy Candidate/RCA domain compatibility, Simulation architecture and Phase 4 UI, and Selling Price/SG&A/OP rules are `FINALIZED — USER DECISION`. [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md) is the latest authority for product logic; this and page-specific specs retain compatible requirements, calculations, and UX/UI rules. Visual outcomes follow [`design.md`](../../design.md) and [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md).

## Final Target State

The current visible page flow is **Master Data → Cost Breakdown → Simulation**. Calculate datasets independently, then compare results strictly by business identity. Cost Breakdown and Simulation use any ordered Before/After pair selected from the latest effective Reference, Current, and Custom datasets, with Change = After − Before. Simulation's fixed graph remains Reference | GAP 1 | Current | GAP 2 | Custom. Selecting an Active Dataset sets Result After to the same role while preserving Before; manually changing either Result selector does not change Active Dataset. Never pair by row position or convert missing required inputs to zero.

Routing operations use their Work Center's rates; Cost Breakdown may aggregate processing cost by Work Center for context, while each processing finding is a Process/Routing record. Full Comparison is the default. Selected Comparison is a temporary CBD-only analysis view that leaves source datasets intact; the full comparison remains primary and selected-scope contributions appear beside it as secondary information. It does not create a Candidate/RCA page or pass scope/context into Simulation. Legacy Candidate/RCA records may remain for saved-session compatibility only. Simulation is directly accessible and opens ready to work. Its active parameter-editing dataset and Result pair remain distinct contexts with one-way synchronization: selecting an active dataset sets Result After, while Before remains user-controlled and manual Result changes do not alter the active dataset. The fixed graph story, role-local economics, and locked structure remain separate contexts.

## Shared Compact Overlays and Page Navigation

- **Compact overlay sizing is cross-cutting.** For compact toolbar menus, selectors, filter/sort menus, clone/send/reset menus, and small button-triggered popovers or dialogs, size to the longest real content plus required icon/check/caret space and normal horizontal padding. Trigger width is not an automatic minimum unless the interaction calls for it. CBD and Simulation share one Before/After role selector with a stable 96×32px trigger and popup minimum equal to that trigger; its `w-max` popup grows only when visible content needs more width. This selector rule does not change the default for other compact overlays, including CBD Status/Sort. Remove arbitrary fixed widths or minimums that add unused blank space. Keep placement centered on the trigger, clamp to the viewport, and preserve keyboard entry, visible focus, accessible names, and dismissal behavior.
- **Keep intentional structured widths.** Do not shrink real form modals, multi-column dialogs, data tables, or panels whose information structure requires a minimum width. The shared Prepare Dataset warning/blocker panel remains a bounded multi-section panel; preserve its deliberate layout. Text in compact confirmation dialogs may wrap within the viewport rather than forcing overflow.
- **Navigation is not a reset.** Master Data, Cost Breakdown, and Simulation retain each page's valid in-memory UI state when the user switches pages and returns. This covers all six directions between the three pages. Master Data retains its role, table view, View/Edit mode, warning-highlight preference, and other valid local state; Cost Breakdown retains its pair, filters, sort, selection, ordering/history, disclosure, and valid expanded details; Simulation retains its active role, comparison pair, row selections, independent BOM/Routing search and scroll, expanded rows, and local workspace state. The shared Main scroll position is remembered separately for each page in memory.
- **Browser refresh preserves only the top-level page; temporary view state resets, not working data.** The active page (`master`, `breakdown`, or `simulation`) is stored separately for the current browser session and restored on refresh; missing or invalid values fall back to Master Data. Master Data returns to Current / Edit Data / All Tables, CBD to Reference → Current with All findings/statuses, default sort, expanded overview and no Selected Comparison scope, and Simulation to active Custom / Current → Custom. Page mode, selectors, filters, disclosure, selections, searches, and scroll return to those page defaults. Existing Master Data Working / Last Saved data and Simulation parameter/economic working data reload through their existing session persistence; refresh never invokes Reset or Clear.
- A page visit or active-tab change alone does not clear state. If its product, comparison pair, Working source, or role-basis fingerprint changes, reconcile only the state dependent on that context. Existing context invalidation rules take precedence over retaining stale state. Transient menus close on normal dismissal; a modal owned by a page must not remain visible after its page is hidden.
- The shared Header remains in the same location. Undo/Redo route to Master Data edit history, Cost Breakdown Candidate reorder history only, and Simulation history; unavailable actions stay visible and disabled. CBD filter, sort, selection, and disclosure changes do not add history entries, and Sort continues to clear Candidate manual-order history.

## Canonical `#` Row Selection

- Every table `#` header represents **none**, **mixed**, or **all** selected rows in its current logical selection scope and exposes `aria-checked=false`, `mixed`, or `true` respectively. Clicking none or mixed selects every eligible row in scope; clicking all clears every eligible row in scope. A bulk action computes and applies the resulting selection in one state update, preserving selected keys outside that scope.
- A true table filter/search may define the logical scope when that is the table's established behavior. Scrolling and one-row navigation never narrow the scope. Master Data scopes its header to filtered rows and preserves selected rows hidden by Search; the CBD findings table scopes it to current filtered/actionable findings and preserves hidden selections; Simulation scopes it to every eligible BOM or Routing match in that table's local Material/Process search and preserves selected rows hidden by Search.
- Dark-header CBD findings-table and Simulation controls use a neutral none state, a selected-looking mixed state with a faded inset ring, and a stronger all state with a bright white border/ring. Master Data restores its historical table header (`border-slate-400 bg-slate-100 text-slate-800`), none control (`text-slate-700 hover:bg-slate-200`), and all control (`border-slate-800 bg-slate-700 text-white`); only mixed uses an adapted intermediate slate state. These palette variants do not change selection behavior.
- Simulation's selected-first row order is presentation only. It preserves source order within selected and unselected groups, does not mutate the effective snapshot or calculation scope, and is not required for editing.

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

Calculate each Routing operation independently for the selected Before and After datasets using each snapshot's own referenced Work Center Labor and Burden rates. Aggregate each snapshot's resulting processing costs by Work Center, then compare the selected Before and After processing totals:

$$\text{WC Net Gap} = \text{After WC processing total} - \text{Before WC processing total}$$

Routing `Process` is the primary processing comparison record in Cost Breakdown's Itemized Comparison. Work Center is a separate aggregation/calculation context, not the parent UI hierarchy for Process records and not a Candidate. A Process moving between Work Centers remains one matched Process finding when its approved business identity matches. Matching Routing operations one-to-one is not required to calculate the Work Center processing total or `WC Net Gap`. This Work Center aggregation is calculation/context detail and does not create a Work Center Candidate; Candidate Prioritization uses Process/Routing as the processing Candidate. If a Work Center Labor Rate or Burden Rate change causes calculated cost to change for one or more Processes, each affected Process may independently be `CHANGED` and remain the Candidate even when its Routing-owned fields are unchanged. See [Candidate Prioritization](CANDIDATE.md) and the [Work Center rate dependency rule](FINAL_LOGIC_SPEC.md#work-center-rate-dependency).

## Full and Selected Comparison

- Full Comparison is the default in Cost Breakdown.
- Selected Comparison is an optional, temporary analysis scope entered from Cost Breakdown. It applies to BOM and Routing; all Work Centers remain available as calculation context.
- For a matched `CHANGED` or `UNCHANGED` finding, select/exclude the Before and After pair together. `ADDED` and `REMOVED` findings are independently selectable.
- Selected mode calculates the selected-scope Gap from selected findings. Keep the Full Gap and full comparison visible as the primary result; show Selected beside the Full Gap as secondary information.
- The scope is analysis state, not a dataset edit. It is not included in Save, export, or version history and does not persist across application restart.
- Selected Comparison exists only inside CBD and remains valid in memory while navigating between app pages. Navigation alone does not clear it. Changing either selected role or its Working data invalidates stale scope; Simulation does not consume the scope.
- Cancellation, a change to either selected role, or a change to either selected Working source clears the selection and returns to Full Comparison immediately.

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

1. **Parameter Simulation (Phase 3–4 state/action and UI contract, user decision 2026-10-20):**
   - The only datasets are Master Data Reference, Current, and Custom Working. Simulation persists no separate SIM dataset; it stores independent, validated parameter overrides per role and derives effective snapshots over each latest Working dataset.
   - Effective Reference uses Reference Work Center rates, Current uses Current rates, and Custom uses Custom rates. Rates are never Simulation-editable.
   - A Master Working change rebases only that role's overrides; unchanged roles keep their overrides.
   - `activeDataset` owns parameter edits. Result/Economic calculations use `comparisonBefore → comparisonAfter`; `comparisonAfter` owns the Business/Economic draft and defaults. Selecting an Active Dataset synchronizes `comparisonAfter` to that role while preserving `comparisonBefore`; manually changing either Result selector does not change `activeDataset`. All nine ordered pairs are supported, including self-comparisons. Fresh app defaults are active Custom and Current → Custom; active role, pair, and row selection are in-memory view context and return to those defaults after a browser refresh. Reconciliation during the current app session preserves valid in-memory context.
   - Main Reset affects only the active role: parameters return to that role's Master Working values, Fixed/Variable/Batch inputs clear, and Selling Price/SG&A return to that role's Master Working values. It preserves the active role, pair, other roles, Master Data, and valid same-basis selection; one role-local Undo reverses the whole reset. Reset All applies the same reset to all roles and restores active Custom / Current → Custom. Its label is exactly `Reset all`.
   - Send maps the active role to the same Master Working role; Send All prepares and applies all three atomically. Send changes Working only and preserves Last Saved. The Send secondary label stays `Send all datasets`.
   - **Structure is Master Data-owned:** Simulation derives the structure from the selected role's latest Working dataset. Structural alternatives are prepared in Master Data / Custom.
   - Result and Economic calculations use any effective Before/After pair and match BOM, Work Center, and Routing by business identity, never row position. Parameter editor rows, status, and cost effects use `activeDataset` and its own Working values and Work Center rates. The graph is fixed at Reference | GAP 1 | Current | GAP 2 | Custom, with GAP 1 = Current − Reference and GAP 2 = Custom − Current. Each graph state uses its effective role dataset and own rates; Result pair changes do not rename or recalculate the graph from the selected pair.
   - Graph Reference/Current/Custom labels select `activeDataset`; selecting one also sets Result After to that role while preserving Before. Manual Before/After changes do not change `activeDataset`. Graph selection does not clone data. The active label uses darker semibold text and a dark underline, with no persistent selected box. On desktop the Graph remains the largest area; Business/Economic stays narrower than its older layout with readable labels, and the reclaimed space benefits Result/Break-even. Exact grid fractions are implementation choices, not user-decided requirements. Result's visible toolbar begins with the Before/After selectors and keeps actions on the same row; narrow layouts may wrap. Its accessible section name remains through an sr-only heading. CBD and Simulation use the same stable 96×32px boxed selector. The visible tooltip is Before/After; its accessible name also includes the selected role. Each menu omits only its own selected role; popup minimum equals trigger width and intrinsic width grows for longer options. The opposite-side role remains available, so all nine pairs including self-pairs remain possible. Visible Result columns are `Cost / Unit | Before | After | Change | %` in one row; `Business Outcome / Unit` remains a compact divider. Send and Reset use compact icon-only primary controls; secondary menus expose exactly Send all datasets and Reset all. The fixed graph's plot expands from 632 to 692 SVG units (`plotLeft=88`, `plotRight=780`) and positions Reference/GAP1/Current/GAP2/Custom at 155/294/433/572/710. One canonical X geometry drives all marks with no `GRAPH_X_SHIFT` or outer translate. The ruler value is start-aligned in a dedicated gutter immediately right of `plotRight` and remains inside the SVG viewBox. Y-axis and right-side labels stay within view bounds.
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
- Master Data uses proportional, explicit table-column widths. BOM Material, Work Centers Work Center, Routing Process, and Routing Work Center use a shared identity-width family; Routing reserves two such slots. Loss and Yield keep the numeric value and Blocker marker in the input shell, with `%` outside that shell but within the same field group and owning column. Dropdown chevron and Blocker marker occupy distinct zones. Tables keep horizontal scrolling at narrower widths instead of squeezing columns.
- The `#` header control's all-visible-selected state uses a persistent medium/dark slate fill, white `#`, and subtle darker border; selected row-number buttons remain the stronger blue indicator.
- A safe blank click in the main workspace/gutters blurs the active editor, clears temporary spreadsheet cell focus/range, and dismisses transient menus/popovers without changing row selection, entered values, dataset/table selection, Search, or Saved/Working state. Escape closes only the topmost transient layer; otherwise it blurs an active field and clears temporary spreadsheet cell focus/range. Escape never undoes data. Existing modal Escape behavior remains owned by the modal.
- Clear communicates its destructive meaning only while hovered: the trigger and its all-dataset menu item use a pale rose surface and rose foreground. Idle weight, blue keyboard focus, and neutral tooltips stay unchanged; other toolbar actions retain neutral hover.
- Prepare Dataset is rendered by the shared shell. Header Info hover/pin and Footer Warning toggle open it without changing the active page; only choosing an issue detail navigates to Master Data. Every close path clears the panel-only dataset filter and expanded categories so it reopens at All with details collapsed.
- Shared tooltips render in a viewport-clamped top-level layer above their triggers, preserve their accessible description relationship, and do not affect layout or get clipped by Header stacking contexts.

## Numeric Display and Editing

`FINALIZED — USER DECISION — 2026-10-21`: Selected Value / Decimal UX supersedes the former fixed-two-decimal display and body-spinner presentation. It does not change numeric storage, calculations, signs, field domains, or history/lifecycle rules.

- Decimal business values default to two places, including trailing zeroes. If a non-zero value would display as `0.00` (including its negative equivalent), use four places. If it would still display as zero, use scientific notation with two fractional digits: `12.345678 → 12.35`, `0.03456 → 0.03`, `0.004567 → 0.0046`, `0.000123 → 0.0001`, `0.00003 → 3.00e-5`, `0 → 0.00`. Negative values follow the same rule. Percentages apply the rule in percentage units with `%`; semantic integers remain whole. Non-finite values remain unavailable. Formatting never changes stored values, calculations, or favorable/unfavorable/zero semantics.
- The canonical presentation helper is `formatBusinessNumber` in `src/shared/ui/numeric-display.ts`. Round 1 applies it to the shared NumericInput and the opt-in read-only number primitive. Master Data Round 2 is CLOSED: existing-focus View cells publish a read-only Header value through native grid focus, without `SelectedNumber` preview/pin treatment. Cost Breakdown Round 3 is NOT STARTED / NEXT; Simulation and final cross-page integration remain later rounds.
- Editable numeric business values retain the shared text editor's unrestricted fractional entry within finite JavaScript-number representation. Direct typing and paste retain finite/domain checks, incomplete drafts, integer enforcement, min/max/min-exclusive rules, and existing blank/null behavior. On blur, ordinary decimal editors use the adaptive formatter and integer editors remain whole. A scientific body display expands to an exact decimal draft on focus so the existing decimal syntax and caret stepping remain usable without changing the stored value.
- Ordinary numeric inputs have no visible inline spinner or spinner-only gutter. ArrowUp/Down and focused wheel retain the existing caret-place stepping: `123.45` can step by 100, 10, 1, 0.1, or 0.01; without a single active digit the fallback is 1. Unfocused inputs do not capture wheel input. No precision-derived minimum is introduced for Capacity or Yield.
- Visible increase/decrease controls belong only to the editable Header Value. They use the same NumericInput validation and caret stepping, including immediate press and delayed hold/repeat, cancelled on release, pointer leave/cancellation, blur, or unmount. A read-only Header selection has no spinner.
- Percentage suffixes remain outside ordinary Master Data editor shells but within their field group/column. Blocker markers retain their own reserved slot. Removing body spinners does not change issue, focus, spreadsheet range, or row-selection semantics.
- Enforce the shared field domains at every Master Data ingress: Selling Price, SG&A, BOM Usage/Price, Labor/Burden Rate, and Routing Manning are `>= 0`; SG&A is also at most `100%`; BOM Loss is `0..100%` inclusive (stored `0..1`); Routing Capacity is `> 0`; Routing Yield is `> 0..100%` inclusive (stored `>0..1`). Configured Sizing counts are integers from 1 through their existing per-table limits; unset counts remain unset. Preserve explicit zero where permitted and imported precision where valid.
- Reject invalid typed or pasted values rather than storing, repairing, or coercing them. Capacity/Yield may hold a transient zero-prefix draft so a fraction below one can be entered; zero never commits. Stepping preserves each source's existing nullable-boundary/stop-at-minimum behavior. Rejected input does not create canonical data or new issues; missing required fields retain their existing Blocker/unavailable-result behavior.

### Selected Value shared foundation — Round 1

- The shared layout owns one temporary, non-persisted provider with three distinct states: (1) a focus-owned active source, (2) a transient read-only hover preview, and (3) a pinned read-only value. Header priority is focus-owned source, then current hover preview, then pinned value. With none active it displays `Value —`. A preview never steals a focused source; leaving the preview restores the pin. A new pin replaces the prior pin. These states are independent and must not be collapsed into one ambiguous selection lifecycle.
- Editable sources reuse their existing focus interaction. Focus publishes the source's full value and opens an editable Header editor with its source writer/domain. Focus moving between the source and its matching Header editor preserves source identity and writer; leaving both clears only the focus-owned state, revealing a valid preview/pin if present. Editable sources retain their normal input appearance and receive no extra SelectedNumber frame.
- Read-only values that already have a focus interaction reuse it. Focus publishes the full value in a read-only Header with no spinner; blur clears the focus-owned value. They do not need a `SelectedNumber` wrapper and do not receive a second hover/pin visual system.
- `SelectedNumber` is for read-only values that have no existing focus or inspection interaction. Idle values do not affect Header. Unpinned pointer hover previews the full value with a thin blue frame/ring and no added background fill; its background remains identical to idle, `aria-pressed` remains false, and geometry does not change. Keyboard focus keeps a visible ring without the pinned fill or pressed state. Pointer leave clears the preview. Click/Enter/Space pins the value with a stronger dark-blue frame and optional subtle fill; `aria-pressed` becomes true. If A is pinned and B is hovered, Header shows B until the pointer leaves B, then returns to A. Unavailable values are not selectable.
- The source hook synchronizes active source updates, including Undo/Redo and external changes, and clears states owned by an unmounted source. Page/scope changes invalidate old states. Each integration gives identities/scopes that distinguish its data context, record, and field so a previous source cannot write to another dataset.
- Header Value shows the full finite value represented by the existing JavaScript `number` model, independent of the compact formatter. Exponential Number representations may be expanded to decimal text for editing; no extra precision is invented. Global editable Header Value uses a transparent dark surface, light text and spinner arrows, and a subtle light border; read-only Header Value is plain light text without a box or spinner. Editable writes go through the source callback/domain/history path. Percentage adapters keep the existing editor units and storage conversion at the source boundary.
- Round 1 shared foundation and Master Data Round 2 are CLOSED. Existing-focus Master Data View cells reuse native grid focus; `SelectedNumber` remains for no-focus inspection values. Cost Breakdown Round 3 is NOT STARTED / NEXT and Simulation remains later. Story Graph and Break-even graph geometry/axes/ticks/lines/markers do not opt into numeric selection.

## Shared Status and Analysis Context

The global Footer is a compact three-group workspace summary: Reference/Current structure counts (BOM / WC / RTG), Reference+Current readiness, Product Match/Mismatch/Not Set, all-dataset Warning-item count, and full Reference/Current Standard Cost plus Net Gap. Money and gap values follow the adaptive decimal target above; Footer callsite migration remains a later-round integration. Readiness uses blue for Ready and muted rose/red for Incomplete; Product status uses green for Match, violet for Mismatch, and neutral slate for Not Set; Warning emphasis remains amber/yellow. Product Match/Mismatch/Not Set is display-only. Footer tooltips center above their triggers, clamp to the viewport, and keep content left-aligned. The Product tooltip shows full Reference and Current identities, wrapping long names and explicitly naming missing values (`Not set`, `Product name not set`, or `UOM not set`) without fabricating a fallback. The readiness tooltip shows only Reference and Current Blocker counts separately, without repeating Ready/Incomplete. The Warning action counts Warning items only and toggles the Header-owned Prepare Dataset view. Selected Comparison does not change full snapshot costs. The Footer cost summary keeps THB as the currency and shows the trimmed sole nonblank UOM when only one side has one, the trimmed Reference spelling when both normalized UOMs match, and `THB/Unit` when both are blank or conflict. The unit label is bold but secondary, has no pipe separator or parentheses, and when inline sits about 20–24px after Net Gap; below 360px it wraps onto a right-aligned line to keep the summary within the viewport. The viewport shell keeps Header, Main, and Footer in the viewport without the Footer overlaying Main. Normal pages use Main as the natural vertical scroll owner where applicable. Desktop CBD uses Main as its single primary vertical scroll owner: the Subheader and bounded Cost Element / Work Center overview stay sticky together at the top of Main, while Candidate Findings remains normal-flow content and does not create another vertical scroller. Work Center rows may independently scroll inside their bounded panel; its header and Total remain outside the row scroll body and share its grid. Desktop Simulation retains its existing exception: the workspace is fixed within the shell, and only BOM/RTG table bodies scroll vertically. Narrow layouts may use natural page scrolling and local responsive table fallback. Master Data table wrappers may scroll horizontally but do not cap or independently scroll vertically. Header, Main, and Footer content share the centered `max-w-[1440px]` frame while the Header/Footer backgrounds span the viewport.

`CONFIRMED DIRECTION — USER DECISION`: provide a shared status/context cue that helps users understand what is happening and where to review it. Relevant states include:
- **`Ready for comparison`:** Both Reference and Current contain sufficient valid data for Cost Breakdown.
- **`Product Mismatch`:** The existing handoff comparison remains based on effective Product Name/UOM after trimming and case normalization (informational, non-blocking status, not a Warning or Blocker). For UI display, show `Product Mismatch` only when both sides have a complete Product Name and UOM; otherwise show neutral `Product Not Set` without changing the handoff boolean.
- **`Missing data`:** One or both datasets have incomplete/missing required fields.
- **`Active Selected Comparison`:** Cost Breakdown is scoped to selected records; the scope remains active while its selected pair and Working sources remain valid. Navigation alone does not end it. Changing either selected role or its Working source data invalidates stale scope.

When a state has a useful review destination, provide a convenient link or action to that page. Status is informational and normally does not block navigation; disable only an operation that is logically impossible.

Master Data dataset save state has two user-facing values: `Saved` when Working matches Last Saved, and `Draft` when it differs or has never been saved. Do not fabricate Product Name `Product` or UOM `PC`; blank metadata stays blank through display and export. Header Undo/Redo are contextual: Master Data uses its existing edit history, Cost Breakdown uses one chronological Candidate reorder history across BOM and Routing, and Simulation uses product-, role-, and basis-scoped ephemeral edit histories. CBD records only completed manual reorder actions; changing or reapplying Sort clears manual orders and CBD Undo/Redo. Search stays local to the Master Data toolbar and filters its current table view. See [`MASTER_DATA_TOOLBAR_PREPARE_UX.md`](MASTER_DATA_TOOLBAR_PREPARE_UX.md) for the current interface contract.

Keep an active Selected Comparison recognizable only while it applies inside Cost Breakdown. It remains valid in memory while navigating away and back, and ends when either selected role or its Working source data changes. Simulation does not retain Candidate origin context or apply a selected CBD scope.

Simulation owns product-scoped, role-local parameter overrides over Master Data Working; there is no CBD Selected Comparison handoff or synchronization. Graph dataset labels select the active Simulation role and do not copy structure or CBD selection, filters, or sorting. Selecting an active role synchronizes Result After to that role while preserving Before; manually changing either Result selector does not change the active role. Direct Send can update only the active role's matching Master Working dataset. On desktop, Simulation uses the shared-shell workspace without page-level vertical scrolling; only BOM and RTG table bodies scroll internally. Narrow screens may use natural page scrolling and stacked panels.

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

The user visually accepted the final UI mini-round at baseline `07a2c86a15d8716beacc20e9761a8073feadf914` on 2026-10-20. That acceptance closes the visual product checkpoint; it does not replace the separate regression and browser verification evidence recorded in the current [`HANDOFF.md`](../../HANDOFF.md).

## Traceability

Key sources are [`agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md`](../../agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md), the finalized [Master Data source specification](../history/MASTER_DATA_SPEC_2026-10-05.md), the later [review-context decisions](../history/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md), and the user-directed workbook update recorded in commit `5a08907`. The 80-topic crosswalk links implementation and verification evidence without changing these requirements. The consolidated current page flow and Simulation rules, plus retained legacy RCA session semantics, are finalized in [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md).
