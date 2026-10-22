# Simulation Specification

**Status:** FINALIZED — USER DECISION; Phase 3 state/action logic and Phase 4 graph/comparison UI implemented
**Scope:** Simulation lifecycle, parameter and economic calculations, Master Data transfer, matching, validation, graph, and page layout.

The visible product flow is:

```text
Master Data → Cost Breakdown → Simulation
```

Simulation is an isolated what-if workspace. It does not add an approval, Trial, Candidate, or RCA stage.

**Simulation final-polish update (2026-10-20 user decision):** Master Data Reference, Current, and Custom Working datasets remain the only datasets and source of truth. Simulation stores role-keyed parameter overrides and Business/Economic drafts over each latest Working dataset; no fourth SIM snapshot or copied structure exists. `activeDataset` owns parameter editing, active Reset, same-role Send, and parameter history. Result/Economic calculations use the user-selected `comparisonBefore → comparisonAfter` pair; selecting an Active Dataset synchronizes `comparisonAfter` to that role while preserving `comparisonBefore`, and manual Result selector changes do not change `activeDataset`. After owns Business/Economic drafts and history. Each role uses its own Work Center rates; a Master Working change rebases only that role. All nine pairs, including self-pairs, remain valid; fresh defaults are active Custom and Current → Custom. CBD and Simulation share a 96×32 Before/After selector whose popup minimum equals its trigger and can grow intrinsically. Result's visible header is one compact row: `Cost / Unit | Before | After | Change | %`, with compact `Business Outcome / Unit` divider and an sr-only Result heading. The fixed graph is Reference | GAP 1 | Current | GAP 2 | Custom. Its expanded geometry uses one X-coordinate system, not nested shifts. BOM and Routing have independent Material/Process search, continuous vertical scrolling with all filtered and ordered rows rendered, an always-visible footer, an actual viewport range, and one-row navigation. Header selection covers every eligible filtered match and preserves selected rows hidden by Search. Outcome includes a separate Break-even Qty row using the calculated whole quantity and its own UOM; the graph heading keeps Break-even primary and shows that quantity in subdued parentheses. Send/Reset remain immediate icon-only actions with compact secondary menus.

## 1. Workspace lifecycle

### 1.1 Automatic initialization

When Simulation opens without a valid workspace, initialize the empty override workspace from the latest Reference, Current, and Custom Working snapshots, defaulting `activeDataset` to Custom and comparison to Current → Custom. Valid context remains in application memory while navigating away and back. A full browser refresh preserves Simulation as the active top-level page, when selected, but restores those defaults and clears row selection, local search, expanded rows, and scroll position; it does not reset role-local parameter overrides or Business/Economic drafts. Persist only product-scoped business state and basis fingerprints, not active role, comparison pair, or worklist selection. Show the existing working interface immediately. State belongs to the active product; switching products cannot reuse another product's Simulation state, and deleted products are pruned.

### 1.2 Active dataset and Reset

There is no Simulation clone operation or clone snapshot and no separate Edit dataset control. The Reference, Current, and Custom graph labels set `activeDataset`, the dataset whose parameters are currently edited. Selecting one also sets Result `After` to that role while preserving the current `Before`; manually changing either Result selector does not change `activeDataset`. Graph selection does not copy metadata, structure, rows, or rates. The active label uses darker semibold text and a dark 2px underline, without a persistent filled or bordered selection box. Inactive labels remain readable and interactive with subtle hover and visible keyboard-focus states. Structural changes are made in Master Data and become available from that role's latest Working snapshot. Reference, Current, and Custom effective datasets and parameter cost effects use their own Working values and Work Center rates.

**Main Reset** affects only `activeDataset`: its BOM/Routing parameter overrides return to that role's latest Working values, Fixed Action Cost / Variable Action Cost / Batch Size clear to blank, and Selling Price / SG&A return to that role's Master Working defaults. It preserves active role, comparison pair, the other two roles, Master Data, and valid same-basis worklist selection. The complete parameter and Economic reset is one undoable role-local history operation. **Reset All** applies those rules independently to all three roles, then restores active Custom and Current → Custom. Neither operation writes Master Data. Reset All is available from the compact secondary menu with the exact label `Reset all`; it is not one cross-role Undo transaction under role-scoped history ownership.

For all five Economic/Business numeric inputs, blank is distinct from zero and remains visibly blank after the user clears it, including after state reconciliation or rerender. Their steppers can decrement from the minimum valid value to blank: `0` for Fixed Action Cost, Variable Action Cost / pc, Selling Price, and SG&A %, and `1` for Batch Size. Selling Price and SG&A use the `comparisonAfter` role's values as defaults; blank values fall back to that effective After dataset's Master Working values. Main Reset follows `activeDataset`, clears its three Simulation-only inputs, and restores its Master-backed Selling Price and SG&A.

If a Master Working dataset changes, only that role's override state is rebased to the new basis; overrides for unchanged roles remain. A schema-versioned persistence shape is reconciled defensively. A versionless old single-SIM state is migrated only when it can be proven to be a parameter-only edit over unchanged Current structure and rates; otherwise its snapshot is discarded. Unknown schema versions are discarded safely. Per-product state pruning remains in effect.

### 1.3 Same-role Send

**Send** sends the effective `activeDataset` only to the matching Master Data Working role: Reference → Reference, Current → Current, Custom → Custom. There is no destination-role choice. Send All applies all three same-role mappings atomically. Send and Send All update Working through the existing Master Data history lifecycle and reconcile sizing; they do not update Last Saved or the Master Data Reset baseline. After a successful Send, the sent Simulation override rebases to the new Working basis and its stale history clears; unrelated roles retain their overrides and history. The icon-only primary action is exactly **Send**; its compact secondary action is **Send all datasets**.

- Sending one role leaves the other two Working datasets and Simulation overrides untouched.
- Send All validates and prepares all three role snapshots before applying any of them.
- Last Saved checkpoints remain unchanged by Send and Send All; Master Data Save remains the operation that changes them.
- Defensive data-layer integrity validation remains an internal safeguard for corrupt or legacy state.
- Do not create a fourth dataset or a promotion/approval lifecycle.

## 2. Parameter Simulation

Simulation is temporary. It stores parameter overrides only; structure is always taken from the latest Master Data Working dataset. No add, delete, resize, split, merge, rate editing, or structural reorder is available in Simulation. Prepare structural alternatives in Master Data / Custom, then switch the active Simulation role to Custom.

### 2.1 Matching and status

Match by canonical business identity, never row position: BOM material identity, Work Center identity, and Routing process identity. Missing, duplicate, ambiguous, or unsafe identity is protected; do not guess or fabricate an attribution.

Normal editable rows display exactly `CHANGED` or `UNCHANGED`. Compare committed BOM Price/Usage/Loss or RTG Manning/Capacity/Yield with the latest Master Working baseline for `activeDataset`, using stable row IDs. All parameters equal means `UNCHANGED`; any difference means `CHANGED`. Invalid drafts do not change authoritative status. Undo back to baseline and Reset restore `UNCHANGED`. Parameter editor rows stay scoped to `activeDataset`; the Result card exposes Before/After selectors for any valid pair, including self-pairs. Active Dataset selection sets After to that role and preserves Before; manually changing either Result selector does not change Active Dataset.

Legacy structural, missing, ambiguous, or protected rows remain safely visible where needed. Missing effective-role rows and unsafe identities cannot be edited/selected. They do not introduce ADDED/REMOVED as normal editable status labels. CHANGED uses CBD's compact bold amber treatment; UNCHANGED uses its compact bold slate treatment.

There is no **Factors to Simulate** workflow. The `#` column follows the shared Cross-Cutting none/mixed/all interaction: none or mixed selects all eligible rows, and all clears them, with correct checkbox ARIA state and one atomic selection update. Each table's local Material/Process search defines the logical selection scope: the header covers every eligible filtered match across the complete dataset, while scrolling and one-row navigation never narrow that scope; rows hidden by Search retain their selection. Changing or clearing Search resets only that table's scroll position. Each eligible row's existing displayed number is its square selection button; repeat activation deselects the same stable record after selected-first movement. There is no separate Select column. Selected rows rise to the top in stable source order for viewing; the effective snapshot order and full-snapshot calculation scope never change. Protected, unmatched, ambiguous, and REMOVED comparison rows cannot be selected. Reset preserves valid same-basis worklist selection while restoring only the active role's parameter and draft values; Reset All clears role-local selection only when ordinary basis reconciliation independently invalidates it. CBD Selected Comparison, filters, and sorting are not transferred to Simulation, and Simulation does not mutate CBD selection.

The desktop Simulation BOM table columns are `# | Bill of Materials | Status | Price | Usage | Loss | Material Cost | Expand`; RTG columns are `# | Routing Process | Status | Manning | Capacity | Yield | Conversion Cost | Expand`. These column headers are the table identity; there are no separate BOM/RTG title or selected-count strips. For each desktop numeric column, the header, editable or read-only row value, expanded Parameter Cost Effect value, and (for Material Cost / Conversion Cost) the calculated cost and expanded Total share one right-side data axis. Do not add unrelated positional offsets to individual labels. Preserve the existing narrow-card presentation rather than imposing desktop table axes on cards. Status shows committed editable-parameter differences from the Simulation baseline. Preserve the existing displayed row numbering after selected-first presentation; do not renumber or introduce a new numbering scheme. Header and numbered controls share the same centered horizontal axis. Selection is a local working/focus aid: it never filters a calculation and is not required before editing. Narrow cards keep row number, identity, explicitly labeled Status, all three parameters, calculated cost, and the same effect toggle.

### 2.2 Editable inputs and validation

UI controls and state/calculation boundaries both enforce the domains below. Reject invalid input and retain the previous committed valid value. Never silently clamp or turn invalid or missing input into zero.

| Input | Valid domain |
|---|---|
| BOM Price | finite, `>= 0` |
| BOM Usage / Consumption | finite, `>= 0` |
| BOM Loss | `0–100%` inclusive; stored as `0–1` |
| Routing Manning | finite, `>= 0` |
| Routing Capacity | finite, `> 0` |
| Routing Yield | greater than `0%` and at most `100%`; stored as `0–1` with zero excluded |
| Work Center Labor/Burden Rate | read-only in Simulation; from the matching role's Master Working dataset |

Blank/null may remain unavailable where the data model allows it. A missing required input makes its result unavailable; it is not a structural zero. ADDED/REMOVED comparison sides may use zero only because one side is structurally absent.

Decimal Price, Usage, Loss, Manning, Capacity, and Yield inputs accept any number of fractional digits representable as a finite value; input precision does not define a business minimum. Capacity remains strictly greater than zero and Yield remains greater than zero through 100%. Spinner, keyboard, and wheel decrement honor the active digit place and stop at the current valid value when the next step would cross its domain boundary. Repeated decrement never clears a valid field or makes its calculation unavailable. Blank, incomplete, or invalid typed drafts never replace the previous authoritative valid value; leaving the editor restores that value.

All six desktop parameter inputs use the same small left inset, keeping their right edges and numeric axes in place while giving Status a little more room. The visible frame is rebalanced rightward around the fixed numeric value using a geometry-derived placement rule; do not specify an arbitrary pixel offset as product behavior. The native input moves by the same amount and compensates with equal right padding, so the visible frame and native input retain unchanged dimensions and aligned bounds while the numeric text axis, column geometry, and calculated/effect axes remain unchanged. A 0.5px clip at the transparent input edge prevents Chrome's fractional hit-test from targeting the input just outside the visible left frame. Hover and pointer click/focus/edit follow the visible frame bounds; the verifier checks the inside-left, center, inside-right, outside-left, and outside-right points on all six fields at 1440 / 1024 / 768px. The accepted historical Focus appearance is preserved: a 2px `#1d4ed8` inset outline at `outline-offset: -2px` with a 2px radius; only the neutral/blue interaction styling changes. Mobile-card editors retain their existing layout and behavior. The latest pre-Round-4B input / row correction is **IMPLEMENTED / AWAITING EXTERNAL USER AUDIT**; local browser checks do not mark it accepted or closed.

### 2.3 Shared Standard Cost and result

Use the shared Standard Cost calculation:

```text
Material Cost = Usage × Price × (1 + Loss)
Direct Material = Σ Material Cost
Routing Factor = Manning / (Capacity × Yield)
Labor = Routing Factor × Current Labor Rate
Burden = Routing Factor × Current Burden Rate
Conversion = Labor + Burden
Standard Cost = Direct Material + Labor + Burden
```

Missing or invalid required values make the corresponding result unavailable. Do not substitute zero. Negative analytical differences are valid.

The Result panel remains read-only. Its visible toolbar starts directly with the **Before → After** selectors; an sr-only Result heading retains the section's accessible name. At normal desktop widths, selectors and icon-only Send/Reset controls stay in one horizontal header row, with wrapping allowed at narrow widths. The desktop upper workspace reads **Main Graph | Result + Break-even | Business/Economic**: the Graph remains the largest area, Business/Economic is narrower than its older layout with readable labels, and the reclaimed space benefits Result/Break-even. Exact grid fractions are an implementation choice, not a user-decided requirement. Result and Break-even share the middle analysis column, with Result using approximately 58% of its height and Break-even 42%. The Result table starts below the single toolbar row. CBD and Simulation consume the same shared selector: a stable 96×32px trigger shows the full single-line selected role; the visible tooltip remains **Before** or **After**, and the accessible name includes side and selected role. All nine ordered pairs remain valid, including self-pairs; changing one side never auto-swaps the other. Each menu omits only its own selected role. Popup width is `max(trigger width, longest visible option plus normal padding)`: its intrinsic `w-max` may grow for longer content and its minimum equals the trigger. Menu Arrow, Home, and End navigation use the visible filtered options. Menus stay centered, viewport-clamped, and flip above when needed; hover, click-to-pin, keyboard navigation, outside click, Escape, and focus behavior follow the approved comparison popover pattern. Manually changing either Result selector leaves `activeDataset` unchanged; selecting a graph label sets `activeDataset` and Result After to that role while preserving Before. The one compact visible header row is:

1. **Cost / Unit** — `Cost / Unit | Before | After | Change | %`, with visible rows **Material, Labor, Burden, Conversion, and Standard Cost**. The header label and Before/After headings share this row; selected role names are not duplicated in visible columns. BOM/RTG column headers remain Material Cost and Conversion Cost.
2. **Business Outcome / Unit** — Selling Price, monetary SG&A, and Operating Profit, using the same selected Before/After role columns, Change, and %.

The panel uses the effective Before and After costs and business metrics. Before Business values use the effective Before dataset's Master values; After Selling Price and SG&A use the role-local `comparisonAfter` draft, with blank inputs falling back to that effective After dataset. Business Outcome is shown in each graph role's economic series; it does not enter Standard Cost or Action Break-even, and it does not change the fixed cost-only meanings of GAP 1 / GAP 2. A lower cost is favorable (green) and a higher cost is unfavorable (red). Operating Profit uses the opposite direction: an increase is favorable (green), a decrease is unfavorable (red). Selling Price and SG&A comparisons use neutral change styling. Conversion Cost is presented as the subtotal of Labor Cost and Burden Cost with a stronger separator, slight vertical breathing room, and semibold text; Standard Cost remains the stronger final total within Cost / Unit. Business panel outputs are labeled **SG&A** and **Operating Profit**; their values display the unit separately.

For every row:

```text
Change = effective After − effective Before
% = (Change / effective Before) × 100
```

Show `—` when either value is unavailable, or effective Before is unavailable or zero for the percentage. Never show Infinity, -Infinity, or NaN. Monetary values and percentages follow the adaptive display target in `CROSS_CUTTING.md`; Result callsite integration remains a later round. Result values remain per-unit and use the resolved product UOM basis (falling back to `Unit` when the Reference and Current UOMs conflict); the panel does not display a separate UOM subtitle. Result is read-only and derives its displayed values from the cost engine and shared business-metric helper; it owns no persisted state.

## 3. Parameter Cost Effect

Each BOM and Routing row can expand a compact **Parameter Cost Effect** detail. Its subtle vertical hierarchy guide and label are indented to the right of the parent Material/Process name. Only this hierarchy presentation moves; parameter effect values and Total retain their existing numeric axes. Use the existing multiplicative attribution helper and show absolute `THB/<resolved UOM>` effects only (for example THB/PC or THB/SET; fallback THB/Unit).

- BOM attributes Material Cost change to Price, Usage, and Loss.
- Routing attributes Conversion Cost change to Manning, Capacity, and Yield.
- Routing uses the before-side and after-side snapshots' own Work Center rates; rates remain read-only and there is no Rate Effect.
- Effects must reconcile to `effective active-role row cost − its Master Working baseline row cost` within floating-point tolerance.
- Display signed effects in `THB/<resolved UOM>` under their matching parameter columns and one compact numeric Total under Material Cost / Conversion Cost. Positive cost effects use a `+` sign and red; negative cost effects use a minus sign and green; rounded zero is neutral `0.00`, never `+0.00`. The Total label stays neutral. Do not display effect percentages.
- When a valid parameter change takes a row cost to or from zero, split interaction effects symmetrically across parameter-change orders so the individual effects remain calculable and reconcile to Total.
- Added/Removed rows, ambiguous identity, missing required values, invalid math, or unreconciled Work Center context have unavailable attribution. Each unavailable effect and Total displays `—`; expanded details do not show an explanation or helper sentence.
- REMOVED, ambiguous, and unmatched rows may expand to view their unavailable effect values; they remain protected and cannot be edited or selected.
- Every safe non-interactive part of a row toggles its details: Material/Process name, Status, calculated cost, whitespace, padding, and chevron area. The chevron indicates the same row state; it has no independent expansion state. The focusable row exposes its expanded state and detail relationship; Enter/Space toggle only when the row itself is focused. NumericInput, the entire `#` selection area, drag selection, nested controls, and expanded detail interactions do not toggle the row.
- Clicking genuinely safe blank workspace outside the rows dismisses expanded details. Editors, selection controls, and detail content retain their own interaction. Clicking a safe area of row B while row A is expanded must execute B's toggle without the outside-dismiss handler swallowing the click.

### Expandable BOM / Routing row presentation — pre-Round-4B correction

Simulation's main BOM and Routing rows retain their existing white rest state, neutral main-row hover, and expansion behavior. Each expanded group has one Parameter Cost Effect detail row with a white surface, no independent hover fill, and the existing indentation and vertical hierarchy guide. Both main→detail and detail→next-main boundaries are full-width; Simulation has no inset separator because it has no detail-to-detail boundary. The same contract applies to BOM and Routing without copying Cost Breakdown column geometry. Narrow mobile-card structure remains unchanged. This correction does not change editing, selection, calculation, or expansion logic; its status is **IMPLEMENTED / AWAITING EXTERNAL USER AUDIT**. The shared contract is in [CROSS_CUTTING.md](CROSS_CUTTING.md#expandable-table-row-visual-contract).

## 4. Economic and Business Analysis

The shared card has exactly two main headings, **Business** and **Economic**, over the selected comparison context. Business uses effective After and its Selling Price/SG&A draft. Economic uses the selected effective Before → After cost pair and the After role's action-cost inputs. Business contains Selling Price and SG&A %. Economic contains Variable Action Cost, Fixed Action Cost, and Batch Size, followed by a subordinate **Outcome** subsection. The main Business/Economic divider sits in whitespace after the SG&A editor with visible breathing room on both sides. An inset, subtle horizontal divider separates Outcome from its inputs; it is lighter than the main split and remains inside Economic. Outcome places **THB/<resolved UOM>** at the right of its heading, then shows **Parameter Saving**, **Required Saving**, and **Economic Margin**. A subtle divider separates **Break-even Qty** from those three monetary per-unit outputs; the quantity row uses the same calculated, rounded-up `breakEvenQuantity` as the graph and includes its own resolved UOM. Display **Not achieved** when a positive quantity cannot break even and `—` when the calculation is unavailable. The graph heading keeps **Break-even** primary and shows the quantity or state in subdued parenthetical context. Full per-unit accessible names, formula tooltips, unavailable states, and favorable/unfavorable colors remain; units are not repeated per monetary row. Economic inputs do not change MAT, Labor, Burden, Conversion, or Standard Cost. Business assumptions do not enter the Action Break-even formula. Both are advisory and never an approval gate.

Simulation uses the shared first-focus input behavior for parameter, Economic, and Business editors: each focus entry selects the full current value, including when reached by Tab. A subsequent click can reposition the caret; arrows, partial selection, typing, deletion, paste, numeric stepping, and validation retain their normal editor behavior.

### Economic inputs and outputs

Editable Action Economics inputs:

1. Fixed Action Cost (THB), finite and `>= 0`.
2. Batch Size, a positive whole production quantity in the product UOM.
3. Variable Action Cost / Unit (THB per product UOM), finite and `>= 0`; display its label as **Variable Action Cost** with `THB/<UOM>` beside it, while retaining the full accessible input name.

Calculated, read-only outputs:

```text
Parameter Saving / Unit = effective Before Standard Cost − effective After Standard Cost
Required Saving / Unit = (Fixed Action Cost / Batch Size) + Variable Action Cost / Unit
Economic Margin / Unit = Parameter Saving / Unit − Required Saving / Unit
Break-even Quantity = Fixed Action Cost / (Parameter Saving / Unit − Variable Action Cost / Unit)
```

Batch Size spreads Fixed Action Cost when calculating Required Saving and Economic Margin. It is the planned production quantity and does not define or change Break-even Quantity.

If `Parameter Saving / Unit <= Variable Action Cost / Unit`, positive-quantity break-even is not achievable. If Fixed Action Cost is zero and net saving is positive, Break-even Quantity is zero. Break-even is calculated independently of Batch Size. Missing required source values remain unavailable; never substitute zero. For whole-unit production, display the smallest whole quantity that reaches break-even (ceiling) while retaining the precise internal intersection for the graph.

Display the whole-unit result in the Economic Outcome as **Break-even Qty**, using `breakEvenQuantity` and its resolved UOM; use **Not achieved** when a positive quantity is not achievable and `—` when unavailable. The graph heading keeps **Break-even** as the primary label and shows `(<quantity> <UOM>)`, `(Not achieved)`, or `(—)` as subdued parenthetical context. Both displays use the same calculated result without recalculating it. Keep the precise intersection quantity for graph geometry and preserve accessible graph naming and descriptions. Label the X axis **QTY (<resolved UOM>)** at its right end, separated from the last tick and Batch marker without clipping or overflow; keep Y-axis THB, scales, and ticks unchanged.

The Break-even graph uses:

```text
Cumulative Parameter Saving(Q) = Parameter Saving / Unit × Q
Total Action Cost(Q) = Fixed Action Cost + Variable Action Cost / Unit × Q
```

The lines share the same Break-even calculation as the numeric result. Batch Size is the graph's only draggable value and stays synchronized with its NumericInput. The graph uses the product's resolved UOM; when Reference and Current UOMs are both present but differ, use the existing shared display convention `Unit`.

Break-even graph lines and the intersection retain accessible names, and the Batch Size marker retains its slider role, value text, focus state, drag, and keyboard behavior. Do not show floating hover or focus popups for these graph marks.

### Business assumptions and outputs

Editable assumptions:

1. Selling Price override, initialized from the `comparisonAfter` role's Selling Price, finite and `>= 0`; blank falls back to effective After Selling Price.
2. SG&A % override, initialized from the `comparisonAfter` role's SG&A %, `0–100%` inclusive; blank falls back to effective After SG&A %.

Calculated, read-only outputs:

```text
Effective After Standard Cost = comparison pair's After cost-engine total
SG&A / Unit = Effective After Selling Price × Effective After SG&A % / 100
Operating Profit / Unit = Effective After Selling Price − effective After Standard Cost − SG&A / Unit
```

Changing Selling Price or SG&A changes Business outputs only; it does not alter Parameter Saving, Required Saving, Economic Margin, Break-even Quantity, or Break-even graph geometry. Negative Economic Margin and Operating Profit are valid. Positive/negative outputs use favorable/unfavorable semantics, while zero is neutral. Continuous monetary values follow the adaptive display target in `CROSS_CUTTING.md` (page-specific read-only integration remains a later round); Batch Size and whole-quantity Break-even display as integers.

## 5. Graph story

The graph is a fixed story over effective Reference, Current, and Custom datasets, independent of the selected Result pair and Business/Economic After role. Selecting a graph label sets `activeDataset` and Result `After` to that role while preserving `Before`; manually changing either Result selector does not change `activeDataset`. Graph selection does not clone data. Each graph state uses its role's own effective snapshot, Work Center rates, and role-local business draft. The active label uses darker semibold text with a dark 2px underline and no persistent blue fill or full border. Inactive labels remain readable and clickable, with subtle hover feedback and a visible keyboard-focus outline. Legend changes affect graph presentation only. The canonical plot rectangle is `x=55..765`, `y=32..280`; centers are Reference 130, GAP 1 270, Current 410, GAP 2 550, and Custom 690. These coordinates shift the previous plot left by `(74 − 36) / 2 = 19` SVG units, preserving its 710-unit width and 140-unit category spacing. The viewBox starts at 820×332; its right bound expands only as needed for the natural monospace width of the formatted Ruler range/current value plus the existing 6-unit gap and 2-unit right padding, including the existing mobile font size. Grid/axis, state and gap anchors, category labels, Selling Price marks, value labels, connectors, tooltips, and ruler derive from this coordinate system. There is no global `GRAPH_X_SHIFT` or outer translation. Keep Y-axis tick labels, `THB/<UOM>`, Custom labels, and ruler text inside the SVG viewBox.

The story order and signs are fixed:

```text
Reference → GAP 1 → Current → GAP 2 → Custom
GAP 1 = Current − Reference
GAP 2 = Custom − Current
Result Change = effective After − effective Before
Parameter Saving = effective Before − effective After
```

The graph title is **Cost Structure**. Its visible category labels and fixed order are `Reference | GAP 1 | Current | GAP 2 | Custom`. Reference, Current, and Custom show Material, Labor, Burden, SG&A, and sign-matched Profit. Their visible Standard Cost remains Material + Labor + Burden only; its value and subtle neutral/slate outline group follow the currently visible cost contributors. The outline has no fill and is not another cost segment. SG&A and Profit stay outside the Standard Cost group and do not enter its value.

Each Reference, Current, and Custom state displays independent **Visible +** and **Visible −** totals from the same currently visible segments that draw its state stack. Visible + sums only positive segments and describes the upper stack boundary; Visible − sums only negative segments and describes the lower stack boundary. Never net the two sides into one state-summary label: a +300 positive stack and −50 negative stack display `+300.00` and `-50.00`, not +250. Selling Price is excluded from both totals. Standard Cost remains the separate visible Material + Labor + Burden concept. Legend changes immediately recompute both boundaries, including sign-matched Profit visibility; missing segments do not create fabricated geometry. A side with no actual nonzero visible segments has no label. These are graph-view summaries only; stored values, financial/business net results, Result, and GAP calculations remain unchanged. GAP 1 and GAP 2 retain their existing signed contribution totals and do not receive these state summaries.

The graph labels contain only the signed number using the existing numeric precision: explicit `+` for the positive side and `-` for the negative side, with neutral text on both sides. Visible + normally sits above the actual positive stack; Visible − sits below the actual negative stack. Tooltips identify the state, side, signed value, and dynamic unit, for example `Current Visible + · +300.00 THB/KG` and `Current Visible − · -50.00 THB/KG`. The SVG description, accessibility labels, helpers, and data attributes use the independent-side semantics.

Selling Price collision protection applies only to Visible +. Preserve the existing gate: Selling Price must be visible, greater than the positive visible total, and its connected line/point must actually crowd the normal positive-label text bounds. A higher but separated Selling Price leaves the label above its stack; hidden Selling Price disables this fallback. On a real collision, use the existing start-aligned side column (`state.x + 35`), keeping the label outside the positive stack. Visible − has no Selling Price fallback. Standard Cost stays displayed at its own group boundary and is not suppressed or changed. A valid visible-side label is never suppressed merely because its formatted value equals Standard Cost. When text bounds overlap Standard Cost, move the visible-side label outward above/below its stack rather than moving Standard Cost or using the retired midpoint split. If a positive side label actually overlaps Ruler text on a narrow viewport, move only that positive label outward above the Ruler text; preserve the accepted Ruler coordinates, gutter, formatting, and interaction. The existing graph auto-range continues to include positive/negative visible stack geometry, visible Standard Cost, visible Selling Price, and GAP geometry. Recompute label placement from the Legend-filtered geometry.

Plot-boundary proximity or clipping is not an independent side-fallback trigger. Do not search candidate positions, add connector lines, or apply arbitrary vertical nudges. The graph range auto-fits its visible values; if a fundamental rendering defect makes a label impossible to display, stop and report it rather than adding another placement rule.

Selling Price remains a separate solid line with a circular marker and no separate Selling Price numeric label. Its blue is slightly lighter, while its calculation, path, points, Legend toggle, tooltip, and interactions remain unchanged. Render the Selling Price line and points behind the Standard Cost and Visible + / Visible − number labels. GAP 1 and GAP 2 remain signed Material, Labor, and Burden contributions with visible signed totals at their bar ends. Positive and negative values retain their actual direction, including negative Operating Profit.

Legend controls are **Material, Labor, Burden, SG&A, Profit +, Profit −, Selling Price, and Ruler**. They filter the graph view only and never change source data, Result, or calculations. Hidden segments reserve no geometry; visible segments reflow. Profit + shows only positive Profit and Profit − only negative Profit. Use square swatches for stack items, a solid line with a centered circle for Selling Price, and a dashed marker-free line for Ruler. Keep the title and Legend controls as one compact semantic group. **Show all** is a separate graph-level button inside the Cost Structure card, placed at the card header's top-right and visually separated from the Legend. At `xl` and wider, keep the title, all eight Legend controls, and Show all on one non-wrapping row; Show all occupies the far-right edge of the card header, not a ninth Legend position. At narrower widths it remains inside the graph card and separate from the Legend. It is enabled while any Legend item is hidden and restores all eight items, then disables when all are visible. The title/legend row and divider use the same responsive breakpoint: side-by-side uses a subtle vertical divider; stacked uses horizontal separation and no vertical divider. OFF bar-series squares are hollow and retain their own series color border; OFF Selling Price and Ruler line samples become neutral gray, while all labels remain readable. Graph fills use solid colors in the shared CBD Material, Labor, and Burden families; SG&A and the positive/negative Profit colors remain distinct. Do not use low opacity to soften bar fills.

The graph has a visible Y-axis line with readable ticks and the dynamically resolved `THB/<UOM>` label rendered horizontally above or at the top of the axis, never rotated vertically beside it. Standard Cost values sit just to the right of their group outline with a small deliberate gap; the value alone moves, not its bar or outline. Its range refits to currently visible graph geometry; Selling Price affects the range only while its legend item is on. Controlled data tooltips appear immediately on pointer hover and disappear on leave, without flicker between adjacent segments. Tooltip content can use up to 360px or the graph host's available inner width, whichever is smaller. Short content stays on one line when it fits; long content wraps when space is limited. Position each tooltip from the hovered SVG element's rendered bounds, centered horizontally with a consistent gap; prefer above the element and use below only when there is insufficient room above. Clamp the tooltip within the graph host in both directions, and keep its position stable while the pointer moves within the same target. Only the bottom GAP labels have explanatory category tooltips: GAP 1 → Current − Reference and GAP 2 → Custom − Current. The bottom Reference, Current, and Custom labels are semantic active-dataset buttons with visible selected and keyboard-focus states. Tooltips on actual graph data marks still identify their series or value and unit. Informational graph marks remain pointer-hover targets but are not keyboard Tab stops and do not show focus frames. The Legend buttons, Show all action, and Ruler remain keyboard-accessible controls; the Ruler keeps Arrow Up/Down, Page Up/Down, Home, and End. Blank graph space shows no native tooltip; the graph's accessible name and description remain available to assistive technology.

The draggable ruler is a visual-only comparison guide. Draw a thin dashed line in front of the bars, stopping at the plot boundary. Its numeric value is start-aligned 6 SVG units beyond that boundary in a dedicated right gutter, using its existing font and formatting without `textLength`/`lengthAdjust` glyph compression. Keep pointer capture, a local 8–12px hit target centered on the line, vertical-only drag, Arrow Up/Down, Page Up/Down, Home, End, and gentle snapping to zero, every visible cumulative Material/Labor/Burden/SG&A/Profit boundary across Reference/Current/Custom, visible Standard Cost, visible Selling Price, and useful GAP boundaries. Snap only when close; preserve free movement between levels. It remains visually clean during pointer and keyboard interaction, with no focus frame or visible hit box. Do not use a full-plot transparent interaction layer or separate ruler box/label.

Browser verification must inspect the rendered unit label, grouped Standard Cost, tooltip behavior, legend/header layout, marker shape, and geometry at desktop-wide, laptop, narrower, and small/mobile widths. Keep the current SVG viewBox scaling unless the browser shows visible distortion.

Ordinary graph space allows natural vertical page scrolling on touch layouts. Only the narrow ruler hit area captures its drag; it retains pointer capture and keyboard interaction.

## 6. Page layout and navigation

Each Simulation Search field is 24px high. When its query is non-empty, its custom clear control stays inside the field with an 18×18px hover/click surface, vertically centered with a 3px right inset, and a 9×9px X icon. Keep the neutral slate idle/hover colors, pointer cursor, visible keyboard focus, conditional rendering, clear-then-refocus action, and native browser cancel suppression. Master Data Search retains its separate 32px field geometry.

- Remove the large Simulation PageHeading/title block; begin with working content.
- Desktop Simulation is a fixed workspace inside the shared application shell: the page does not vertically scroll, and only the BOM and RTG table bodies scroll vertically. At narrow responsive sizes, panels stack and natural page scrolling is allowed so all controls remain reachable.
- Desktop upper workspace: the main Graph remains on the left and wider than the right-side block. The right-side block has two independent vertical columns: its wider left column stacks Result above Break-even Graph, and its narrower far-right column contains the Business/Economic card with Business, Economic, and its inset Outcome group. Divide each column independently; their horizontal boundaries do not need to align. Stack Business inputs vertically in Selling Price, then SG&A % order; it contains inputs only, while Business Outcome rows remain in Result. Stack Economic inputs vertically in Variable Action Cost, Fixed Action Cost, then Batch Size order. The Variable Action Cost label has its `THB/<UOM>` unit beside it.
- Desktop Simulation remains a fixed workspace in the shared shell. Keep the upper areas and equal-width BOM/RTG panels visible together. Each desktop table renders every filtered and ordered row in an approximately 160px body with native vertical scrolling, showing about four normal-height rows at once. Its compact footer keeps Search always visible on the left and the actual viewport range with previous/next row controls on the right. Mouse wheel, trackpad, and scrollbar dragging continue to scroll the body; footer navigation moves one row and disables at the actual scroll boundaries. Search is independent between BOM and Routing, filters Material or Process names, and resets only that table's scroll position when changed or cleared. The range is measured from rows intersecting that table's current scroll viewport and reports `0 of 0` for no matches. Header selection applies across every eligible filtered match, whether visible or not. The footer has a subtle divider and a gray surface distinct from white data rows. The panels size to their compact table content; the upper workspace uses the freed height instead of leaving a matching blank band. At narrow/mobile card widths, keep natural card flow and page scrolling while retaining the table-local search, actual visible range, and row navigation controls.
- The Simulation footer uses 16px ChevronLeft / ChevronRight icons matching the row expansion ChevronRight. On desktop, the Next control is centered in the final Details column using the same column tracks as the table; both controls continue one-row-at-a-time native scrolling and do not paginate.
- Keep icon-only 32×32 Send and Reset primary actions in the Result toolbar. The visible Send tooltip and accessible name are **Send to Master Data**; Reset remains **Reset**. Each main click acts immediately on `activeDataset`. Secondary commands are exactly **Send all datasets** and **Reset all**, in the compact delayed-hover/keyboard menu, without a permanent chevron segment. The menu is centered on its trigger, viewport-clamped, vertically corrected above/below, keyboard reachable, and dismissible by outside click or Escape; Alt+ArrowDown or Shift+F10 opens it for keyboard users. Send maps the active role to its same-role Master Working dataset; Send All atomically maps all three roles and preserves Last Saved. Main Reset returns only active-role parameter values to Master Working, clears Fixed/Variable/Batch, restores Selling Price/SG&A from that role's Master Working values, and remains one role-local Undo operation. Reset All applies that reset to each role and restores active Custom / Current → Custom. Neither control writes Master Data or changes the comparison pair during Main Reset. Reset is not a Global Header action. Actions produce no persistent inline Result/workspace feedback, including no routine "Send blocked" message.
- BOM/RTG have no separate title/count bars; their headers name **Bill of Materials** and **Routing Process**, and Status is a dedicated column. Each opaque header stays outside the vertically scrollable body and fills the complete panel width, including the space above the body's scrollbar gutter. Header/body columns remain aligned; the header has no vertical scroll owner. **Material Cost** and **Conversion Cost** stay on one line at desktop table sizes without moving their numeric axes or narrowing usable inputs. The `#` header and row numbers share a centered column while row numbers preserve original identity after selected-first presentation. Safe-row expansion, chevron state, keyboard behavior, and safe outside dismissal follow section 3.
- The `#` row-number controls manage only Simulation's per-product working selection; selected rows appear first without structural reordering. Protected or removed rows cannot be selected, and the selection never limits calculation scope. The active Material/Process search defines the header's logical selection scope; scroll position and one-row navigation do not narrow it, and selections hidden by Search are preserved.
- BOM and RTG must not have horizontal scrollbars. Keep approximately four normal desktop rows visible in native vertical scroll bodies, with usable sticky table headers and a compact always-visible footer; render complete filtered and ordered row sets without pagination. Use fixed/proportional columns and a responsive reflow/card presentation at narrow widths while preserving every editable field and natural page flow. No add/delete/resize/split/merge/reorder or Work Center-rate editing controls are available in Simulation; structural alternatives are prepared in Master Data / Custom.
- The page must not have horizontal overflow. Stack the major panels on narrow screens.
- The visible product navigation contains only Master Data, Cost Breakdown, and Simulation. No RCA context strip or visible Candidate/RCA-to-Simulation handoff appears.

Legacy RCA case/session migration may remain for old saved data. It is compatibility only and does not create an active RCA Simulation workflow.

## 7. Worked examples

### No change

Custom SC `100`, Current SC `100`: GAP 2 `0`, Parameter Saving `0`, Result Change `0.00`, Result `%` `0.00%`.

### BOM Price

Current `Usage=2`, `Price=10`, `Loss=5%`: Material Cost `21.00`. For Current → Custom, Custom Price `12` gives Material Cost `25.20` and Change `+4.20`. Attribution: Price `+4.20`, Usage `0.00`, Loss `0.00`, Total `+4.20`.

### Routing Manning

Current Manning `1`, Capacity `100`, Yield `100%`, Labor Rate `100`, Burden Rate `50`: Factor `0.01`, Labor `1.00`, Burden `0.50`, Conversion `1.50`. For Current → Custom, Custom Manning `0.8` gives Labor `0.80`, Burden `0.40`, and Conversion `1.20`; parameter effects reconcile to `-0.30`.

### Economic margin

Current SC `100`, Custom SC `90`, Fixed Action Cost `1000`, Variable Action Cost / pc `1`, Batch Size `100`: Fixed Cost / pc `10`, Required Saving / pc `11`, Parameter Saving / pc `10`, Economic Margin / pc `-1`.

### Operating Profit

Selling Price `120`, Custom Standard Cost `90`, SG&A `10%`: SG&A / pc `12`, OP / pc `18`. With Selling Price `80`, Custom Standard Cost `90`, SG&A `10%`: SG&A / pc `8`, OP / pc `-18`.

### Input rejection

Reject Loss `-1%` or `101%`; Yield `0%` or `101%`; SG&A `-5%` or `101%`; negative Price, Usage, Manning, Fixed Action Cost, Variable Action Cost / pc, or Selling Price; Capacity `0` or negative; Batch Size `0`, negative, or fractional; and non-finite values. Do not coerce any of these to zero.

### Custom structure

Current Routing `[Cut, Form]`, Custom Routing `[Cut, Form, Polish]`, then select Custom as `activeDataset`: its latest Working structure is used directly; Cut/Form match by identity and Polish is editable as a Custom-only row. All untouched editable values start with visible status UNCHANGED against the Custom baseline; Custom Work Center rates apply to that effective dataset. If Custom omits Form, Form remains visible and protected as a structurally absent comparison row, without a normal editable ADDED/REMOVED status label.

## 8. Simulation Undo / Redo

Simulation keeps a separate chronological history for each product and role. Parameter edits are recorded under `activeDataset`; Business/Economic edits are recorded under `comparisonAfter`. Undo/Redo follows the role that owns the most recent history entry, so changing only `activeDataset` does not reinterpret an Economic entry. Undo reverses actions in order; Redo reapplies them, and a new edit after Undo clears that role's Redo stack. Send to Master Data is excluded.

Each history is scoped to its role's Working basis. A basis change invalidates only that role's stale entries. Each entry stores authoritative editable values keyed by stable Simulation record IDs and the role's Economic draft; rates, derived results, selection, expansion, focus, scroll, graph legend/ruler state, and transient invalid drafts are excluded. Applying an entry preserves that role's Simulation-local selection and its own Work Center rate context, then recalculates all derived values.

Typing is grouped into one committed edit per focused control. Spinner repeats and Batch Size graph dragging each form one action for the complete pointer gesture. Rejected or no-op values add no history entry. Reset is one action for the active role's parameter overrides; its Economic inputs and view state are preserved. Undo restores the pre-Reset parameter values and Redo reapplies the reset. Undo/Redo cannot cross-contaminate Reference, Current, and Custom.

Simulation history is ephemeral for the current app session and remains separate from Master Data dataset-edit history and CBD Candidate reorder history.
