# Simulation Specification

**Status:** FINALIZED — USER DECISION; Phase 1 foundation implemented, visible comparison redesign pending
**Scope:** Simulation lifecycle, parameter and economic calculations, Master Data transfer, matching, validation, graph, and page layout.

The visible product flow is:

```text
Master Data → Cost Breakdown → Simulation
```

Simulation is an isolated what-if workspace. It does not add an approval, Trial, Candidate, or RCA stage.

**Phase 1 architecture update (2026-10-19 user decision):** Master Data Reference, Current, and Custom Working datasets remain the only datasets and the source of truth. Simulation stores role-keyed parameter overrides over each latest Working dataset and derives an effective dataset when needed; it does not persist a fourth SIM snapshot or copy dataset structure. Each effective dataset retains its own rates. Master Working changes rebase only the changed role. `activeDataset` is independent of `comparisonBefore` and `comparisonAfter`; all nine ordered comparison pairs, including self-pairs, are valid. Defaults are active Current and Reference → Current. The existing visible Current/SIM result and graph remain for compatibility in this phase; generic comparison selectors, labels, and graph changes remain later-phase work.

## 1. Workspace lifecycle

### 1.1 Automatic initialization

When Simulation opens without a valid workspace, initialize the empty override workspace from the latest Reference, Current, and Custom Working snapshots, defaulting `activeDataset` to Current and comparison to Reference → Current. Show the existing working interface immediately. State belongs to the active product; switching products cannot reuse another product’s Simulation state, and deleted products are pruned.

### 1.2 Clone from

There is no Simulation clone snapshot in the Phase 1 state model. The existing **Clone from ▾** control remains visually unchanged as a compatibility control and selects the active role whose parameters are being edited; it does not copy metadata, structure, rows, or rates. Structural changes are made in Master Data and become available to Simulation from that role's latest Working snapshot. Reference, Current, and Custom effective datasets each use their own Work Center rates.

**Reset** clears parameter overrides only for `activeDataset`, rebasing it to that role's latest Working values. **Reset All** clears all three roles independently. Neither operation writes Master Data. Role-local economic inputs and worklist selection are retained when their Master basis remains current. Reset All has no visible control yet.

For all five Economic/Business numeric inputs, blank is distinct from zero and remains visibly blank after the user clears it, including after state reconciliation or rerender. Their steppers can decrement from the minimum valid value to blank: `0` for Fixed Action Cost, Variable Action Cost / pc, Selling Price, and SG&A %, and `1` for Batch Size. Selling Price and SG&A use the active role's values as visible defaults on initial setup and Reset; blank values continue to use the existing Current fallback in the visible Current/SIM economic calculation.

If a Master Working dataset changes, only that role's override state is rebased to the new basis; overrides for unchanged roles remain. A schema-versioned persistence shape is reconciled defensively. A versionless old single-SIM state is migrated only when it can be proven to be a parameter-only edit over unchanged Current structure and rates; otherwise its snapshot is discarded. Unknown schema versions are discarded safely. Per-product state pruning remains in effect.

### 1.3 Send to

Send always maps a Simulation role back to the same Master Data Working role: Reference → Reference, Current → Current, Custom → Custom. Send All applies all three mappings atomically. The existing **Send to ▾** control remains visually unchanged in Phase 1 and selects the role to make active before sending that role's effective snapshot. Send updates Working through the existing Master Data history lifecycle and reconciles sizing; it does not update Last Saved or the Master Data Reset baseline. After Send, the matching Simulation overrides naturally clear against the newly updated Working basis.

- Sending one role leaves the other two Working datasets and Simulation overrides untouched.
- Send All validates and prepares all three role snapshots before applying any of them.
- Defensive data-layer integrity validation remains an internal safeguard for corrupt or legacy state.
- Do not create a fourth dataset or a promotion/approval lifecycle.

## 2. Parameter Simulation

Simulation is temporary. It stores parameter overrides only; structure is always taken from the latest Master Data Working dataset. No add, delete, resize, split, merge, rate editing, or structural reorder is available in Simulation. Prepare structural alternatives in Master Data / Custom, then switch the active Simulation role to Custom.

### 2.1 Matching and status

Match by canonical business identity, never row position: BOM material identity, Work Center identity, and Routing process identity. Missing, duplicate, ambiguous, or unsafe identity is protected; do not guess or fabricate an attribution.

Normal editable rows display exactly `CHANGED` or `UNCHANGED`. Compare committed BOM Price/Usage/Loss or RTG Manning/Capacity/Yield with the latest Master Working baseline for `activeDataset`, using stable row IDs. All parameters equal means `UNCHANGED`; any difference means `CHANGED`. Invalid drafts do not change authoritative status. Undo back to baseline and Reset restore `UNCHANGED`. The visible Result keeps the compatibility Current → active effective dataset comparison until later UI phases expose the generic comparison pair.

Legacy structural, missing, ambiguous, or protected rows remain safely visible where needed. Missing SIM rows and unsafe identities cannot be edited/selected. They do not introduce ADDED/REMOVED as normal editable status labels. CHANGED uses CBD's compact bold amber treatment; UNCHANGED uses its compact bold slate treatment.

There is no **Factors to Simulate** workflow. The `#` column is Simulation's local row selector: its header is a checkbox-role select-all/deselect-all control with false/mixed/true state. None or some selected selects all eligible rows; all selected clears them. Each eligible row's existing displayed number is its square selection button; repeat activation deselects the same stable record after selected-first movement. There is no separate Select column. Selected rows rise to the top in stable source order for viewing; the effective snapshot order and full-snapshot calculation scope never change. Protected, unmatched, ambiguous, and REMOVED comparison rows cannot be selected. Reset clears only the active role's parameter overrides and preserves economics and worklist; Reset All clears overrides for all three roles. CBD Selected Comparison, filters, and sorting are not transferred to Simulation, and Simulation does not mutate CBD selection.

The desktop Simulation BOM table columns are `# | Bill of Materials | Status | Price | Usage | Loss | Material Cost | Expand`; RTG columns are `# | Routing Process | Status | Manning | Capacity | Yield | Conversion Cost | Expand`. These column headers are the table identity; there are no separate BOM/RTG title or selected-count strips. Status shows committed editable-parameter differences from the Simulation baseline. Preserve the existing displayed row numbering after selected-first presentation; do not renumber or introduce a new numbering scheme. Header and numbered controls share the same centered horizontal axis. Selection is a local working/focus aid: it never filters a calculation and is not required before editing. Narrow cards keep row number, identity, explicitly labeled Status, all three parameters, calculated cost, and the same effect toggle.

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

In Simulation, spinner, keyboard, and wheel decrement stop at the lowest valid value: zero for Price, Usage, Loss, and Manning; `0.0001` for Capacity (four-decimal input precision); and `0.01%` for Yield (two-decimal percentage precision). Repeated decrement never clears a valid field or makes its calculation unavailable, and reaching a valid minimum adds no warning or unavailable message to a calculable row. Blank, incomplete, or invalid typed drafts never replace the previous authoritative valid value; leaving the editor restores that value. This protection is local to Simulation and does not change other pages' numeric-input behavior.

All six desktop parameter inputs use the same small left inset, keeping their right edges and numeric axes in place while giving Status a little more room.

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

The Result panel remains a read-only `Current → active effective dataset` comparison (the existing visible `Current` and `SIM` labels remain during Phase 1) and contains two sections in this order:

1. **Cost / Unit** — `Cost | Current | SIM | Change | %`, with visible rows **Material, Labor, Burden, Conversion, and Standard Cost**. The shorter labels change presentation only; BOM/RTG column headers remain Material Cost and Conversion Cost.
2. **Business Outcome / Unit** — Selling Price, monetary SG&A, and Operating Profit, using the same Current, SIM, Change, and % columns.

The panel uses the authoritative Current and active effective dataset costs and business metrics. Selling Price and SG&A overrides use the effective Simulation values. Business Outcome does not enter GAP 1 / GAP 2 or Action Break-even. A lower cost is favorable (green) and a higher cost is unfavorable (red). Operating Profit uses the opposite direction: an increase is favorable (green), a decrease is unfavorable (red). Selling Price and SG&A comparisons use neutral change styling. Conversion Cost is presented as the subtotal of Labor Cost and Burden Cost with a stronger separator, slight vertical breathing room, and semibold text; Standard Cost remains the stronger final total within Cost / Unit. Business panel outputs are labeled **SG&A** and **Operating Profit**; their values display the unit separately.

For every row:

```text
Change = SIM − Current
% = (Change / Current) × 100
```

Show `—` when either value is unavailable, or Current is unavailable or zero for the percentage. Never show Infinity, -Infinity, or NaN. Monetary values and percentages show exactly two decimals. Result values remain per-unit and use the resolved product UOM basis (falling back to `Unit` when the Reference and Current UOMs conflict); the panel does not display a separate UOM subtitle. Result is read-only and derives its displayed values from the cost engine and shared business-metric helper; it owns no persisted state.

## 3. Parameter Cost Effect

Each BOM and Routing row can expand a compact **Parameter Cost Effect** detail. Its subtle vertical hierarchy guide and label are indented to the right of the parent Material/Process name. Only this hierarchy presentation moves; parameter effect values and Total retain their existing numeric axes. Use the existing multiplicative attribution helper and show absolute `THB/<resolved UOM>` effects only (for example THB/PC or THB/SET; fallback THB/Unit).

- BOM attributes Material Cost change to Price, Usage, and Loss.
- Routing attributes Conversion Cost change to Manning, Capacity, and Yield.
- Routing uses the before-side and after-side snapshots' own Work Center rates; rates remain read-only and there is no Rate Effect.
- Effects must reconcile to `SIM row cost − Current row cost` within floating-point tolerance.
- Display signed effects in `THB/<resolved UOM>` under their matching parameter columns and one compact numeric Total under Material Cost / Conversion Cost. Positive cost effects use a `+` sign and red; negative cost effects use a minus sign and green; rounded zero is neutral `0.00`, never `+0.00`. The Total label stays neutral. Do not display effect percentages.
- When a valid parameter change takes a row cost to or from zero, split interaction effects symmetrically across parameter-change orders so the individual effects remain calculable and reconcile to Total.
- Added/Removed rows, ambiguous identity, missing required values, invalid math, or unreconciled Work Center context have unavailable attribution. Each unavailable effect and Total displays `—`; expanded details do not show an explanation or helper sentence.
- REMOVED, ambiguous, and unmatched rows may expand to view their unavailable effect values; they remain protected and cannot be edited or selected.
- Every safe non-interactive part of a row toggles its details: Material/Process name, Status, calculated cost, whitespace, padding, and chevron area. The chevron indicates the same row state; it has no independent expansion state. The focusable row exposes its expanded state and detail relationship; Enter/Space toggle only when the row itself is focused. NumericInput, the entire `#` selection area, drag selection, nested controls, and expanded detail interactions do not toggle the row.
- Clicking genuinely safe blank workspace outside the rows dismisses expanded details. Editors, selection controls, and detail content retain their own interaction. Clicking a safe area of row B while row A is expanded must execute B's toggle without the outside-dismiss handler swallowing the click.

## 4. Economic and Business Analysis

The shared card has exactly two main headings, **Business** and **Economic**, over the same SIM snapshot. Business contains Selling Price and SG&A %. Economic contains Variable Action Cost, Fixed Action Cost, and Batch Size, followed by a subordinate **Outcome** subsection. The main Business/Economic divider sits in whitespace after the SG&A editor with visible breathing room on both sides. An inset, subtle horizontal divider separates Outcome from its inputs; it is lighter than the main split and remains inside Economic. Outcome places **THB/<resolved UOM>** at the right of its heading, then shows exactly **Parameter Saving**, **Required Saving**, and **Economic Margin** with numeric-only values. Full per-unit accessible names, formula tooltips, unavailable states, and favorable/unfavorable colors remain; units are not repeated per row. Economic inputs do not change MAT, Labor, Burden, Conversion, or Standard Cost. Business assumptions do not enter the Action Break-even formula. Both are advisory and never an approval gate.

Simulation uses the shared first-focus input behavior for parameter, Economic, and Business editors: each focus entry selects the full current value, including when reached by Tab. A subsequent click can reposition the caret; arrows, partial selection, typing, deletion, paste, numeric stepping, and validation retain their normal editor behavior.

### Economic inputs and outputs

Editable Action Economics inputs:

1. Fixed Action Cost (THB), finite and `>= 0`.
2. Batch Size, a positive whole production quantity in the product UOM.
3. Variable Action Cost / Unit (THB per product UOM), finite and `>= 0`; display its label as **Variable Action Cost** with `THB/<UOM>` beside it, while retaining the full accessible input name.

Calculated, read-only outputs:

```text
Parameter Saving / Unit = Current Standard Cost − SIM Standard Cost
Required Saving / Unit = (Fixed Action Cost / Batch Size) + Variable Action Cost / Unit
Economic Margin / Unit = Parameter Saving / Unit − Required Saving / Unit
Break-even Quantity = Fixed Action Cost / (Parameter Saving / Unit − Variable Action Cost / Unit)
```

Batch Size spreads Fixed Action Cost when calculating Required Saving and Economic Margin. It is the planned production quantity and does not define or change Break-even Quantity.

If `Parameter Saving / Unit <= Variable Action Cost / Unit`, positive-quantity break-even is not achievable. If Fixed Action Cost is zero and net saving is positive, Break-even Quantity is zero. Break-even is calculated independently of Batch Size. Missing required source values remain unavailable; never substitute zero. For whole-unit production, display the smallest whole quantity that reaches break-even (ceiling) while retaining the precise internal intersection for the graph.

Do not duplicate Break-even as an Economic Outcome row. Display its whole-unit result in the graph heading as **Break-even · <quantity> <UOM>**, using `breakEvenQuantity`; display **Break-even · Not achievable** or the existing `—` unavailable convention when appropriate. Keep the precise intersection quantity for graph geometry and preserve accessible graph naming and descriptions. Label the X axis **QTY (<resolved UOM>)** at its right end, separated from the last tick and Batch marker without clipping or overflow; keep Y-axis THB, scales, and ticks unchanged.

The Break-even graph uses:

```text
Cumulative Parameter Saving(Q) = Parameter Saving / Unit × Q
Total Action Cost(Q) = Fixed Action Cost + Variable Action Cost / Unit × Q
```

The lines share the same Break-even calculation as the numeric result. Batch Size is the graph's only draggable value and stays synchronized with its NumericInput. The graph uses the product's resolved UOM; when Reference and Current UOMs are both present but differ, use the existing shared display convention `Unit`.

Break-even graph lines and the intersection retain accessible names, and the Batch Size marker retains its slider role, value text, focus state, drag, and keyboard behavior. Do not show floating hover or focus popups for these graph marks.

### Business assumptions and outputs

Editable assumptions:

1. Selling Price override, initialized and reset to the active role's Selling Price, finite and `>= 0`.
2. SG&A % override, initialized and reset to the active role's SG&A %, `0–100%` inclusive.

Calculated, read-only outputs:

```text
SIM Standard Cost = authoritative SIM cost-engine total
SG&A / Unit = Effective Selling Price × Effective SG&A % / 100
Operating Profit / Unit = Effective Selling Price − SIM Standard Cost − SG&A / Unit
```

Changing Selling Price or SG&A changes Business outputs only; it does not alter Parameter Saving, Required Saving, Economic Margin, Break-even Quantity, or Break-even graph geometry. Negative Economic Margin and Operating Profit are valid. Positive/negative outputs use favorable/unfavorable semantics, while zero is neutral. Continuous monetary values display to two decimals; Batch Size and whole-quantity Break-even display as integers.

## 5. Graph story

The story order and signs are fixed:

```text
REF → GAP 1 → CUR → GAP 2 → SIM
GAP 1 = Current − Reference
GAP 2 = SIM − Current
Result Change = SIM − Current
Parameter Saving = Current − SIM
```

The graph title is **Simulation Cost Structure**. The underlying story remains `REF → GAP 1 → CUR → GAP 2 → SIM`; its visible category labels are `Reference | GAP 1 | Current | GAP 2 | Simulation`. These names are presentation labels and do not change the scenario identities or graph order. Reference, Current, and Simulation show Material, Labor, Burden, SG&A, and sign-matched Profit. Their visible Standard Cost remains Material + Labor + Burden only; its value and subtle neutral/slate outline group follow the currently visible cost contributors. The outline has no fill and is not another cost segment. SG&A and Profit stay outside the Standard Cost group and do not enter its value.

Each state also shows **Visible Net**, the signed sum of the currently visible state-stack segments (Material + Labor + Burden + SG&A + sign-matched Profit). It is derived from the same Legend-filtered stack that draws the bar, updates immediately when Legend visibility changes, and is graph-view-only: it does not change Standard Cost, Result, source data, or business values. Selling Price is excluded. If a visible segment makes the stack total unavailable, Visible Net is unavailable. For Reference, Current, and Simulation, its normal two-decimal label stays above its own visible-stack endpoint for positive or zero totals and below for negative totals. Selling Price side fallback applies only when Selling Price is visible, its value is greater than Visible Net, and the normal label's rendered/estimated SVG text bounds actually crowd the connected Selling Price marker or line. A higher Selling Price alone does not move Visible Net; hidden Selling Price and Selling Price less than or equal to Visible Net never trigger this fallback. If the normal label does not collide, keep the normal placement. If it does, place Visible Net in the Standard Cost numeric column (`state.x + 35`, start-aligned) and align its own value level with the text's top edge. Standard Cost uses the same side-label convention: its own value level aligns with the text's top edge. If both values are side labels and their distinct text boxes overlap, split them at the midpoint between their actual value levels: the upper label's bottom edge and lower label's top edge meet at that midpoint. Otherwise, do not offset either label. When Visible Net and Standard Cost render as the same two-decimal graph value, render only the existing Standard Cost label; if the displayed values differ, render both. Compare their displayed strings without changing either full-precision value used by calculations. Recompute Visible Net and all placement/duplicate/overlap decisions from the current Legend-filtered state after every Legend toggle. GAP 1 and GAP 2 have no Visible Net labels.

Plot-boundary proximity or clipping is not an independent side-fallback trigger. Do not search candidate positions, add connector lines, or apply arbitrary vertical nudges. The graph range auto-fits its visible values; if a fundamental rendering defect makes a label impossible to display, stop and report it rather than adding another placement rule.

Selling Price remains a separate solid line with a circular marker and no separate Selling Price numeric label. Its blue is slightly lighter, while its calculation, path, points, Legend toggle, tooltip, and interactions remain unchanged. Render the Selling Price line and points behind the Standard Cost and Visible Net number labels. GAP 1 and GAP 2 remain signed Material, Labor, and Burden contributions with visible signed totals at their bar ends. Positive and negative values retain their actual direction, including negative Operating Profit.

Legend controls are **Material, Labor, Burden, SG&A, Profit +, Profit −, Selling Price, and Ruler**. They filter the graph view only and never change source data, Result, or calculations. Hidden segments reserve no geometry; visible segments reflow. Profit + shows only positive Profit and Profit − only negative Profit. Use square swatches for stack items, a solid line with a centered circle for Selling Price, and a dashed marker-free line for Ruler. Keep the title and legend as a compact group. At `xl` and wider, keep the graph title, all eight Legend controls, and Show all on one non-wrapping row in that order. Place **Show all** immediately after the Legend with a visibly larger action gap after Ruler, without pushing it to the far edge; it is enabled while any Legend item is hidden and restores all eight items, then disables when all are visible. The title/legend row and divider use the same responsive breakpoint: side-by-side uses a subtle vertical divider; stacked uses horizontal separation and no vertical divider. OFF bar-series squares are hollow and retain their own series color border; OFF Selling Price and Ruler line samples become neutral gray, while all labels remain readable. Graph fills use solid colors in the shared CBD Material, Labor, and Burden families; SG&A and the positive/negative Profit colors remain distinct. Do not use low opacity to soften bar fills.

The graph has a visible Y-axis line with readable ticks and the dynamically resolved `THB/<UOM>` label rendered horizontally above or at the top of the axis, never rotated vertically beside it. Standard Cost values sit just to the right of their group outline with a small deliberate gap; the value alone moves, not its bar or outline. Its range refits to currently visible graph geometry; Selling Price affects the range only while its legend item is on. Controlled data tooltips appear immediately on pointer hover and disappear on leave, without flicker between adjacent segments. Tooltip content can use up to 360px or the graph host's available inner width, whichever is smaller. Short content stays on one line when it fits; long content wraps when space is limited. Position each tooltip from the hovered SVG element's rendered bounds, centered horizontally with a consistent gap; prefer above the element and use below only when there is insufficient room above. Clamp the tooltip within the graph host in both directions, and keep its position stable while the pointer moves within the same target. Only the bottom GAP labels have explanatory category tooltips: GAP 1 → Current − Reference and GAP 2 → Simulation − Current. The bottom Reference, Current, and Simulation labels have no tooltip. Tooltips on actual graph data marks still identify their series or value and unit. Informational graph marks remain pointer-hover targets but are not keyboard Tab stops and do not show focus frames. The Legend buttons, Show all action, and Ruler remain keyboard-accessible controls; the Ruler keeps Arrow Up/Down, Page Up/Down, Home, and End. Blank graph space shows no native tooltip; the graph's accessible name and description remain available to assistive technology.

The draggable ruler is a visual-only comparison guide. Draw a thin dashed line in front of the bars with its numeric value at the right end. Keep pointer capture, a local 8–12px hit target centered on the line, vertical-only drag, Arrow Up/Down, Page Up/Down, Home, End, and gentle snapping to zero, every visible cumulative Material/Labor/Burden/SG&A/Profit boundary in REF/CUR/SIM, visible Standard Cost, visible Selling Price, and useful GAP boundaries. Snap only when close; preserve free movement between levels. It remains visually clean during pointer and keyboard interaction, with no focus frame or visible hit box. Do not use a full-plot transparent interaction layer or separate ruler box/label.

Browser verification must inspect the rendered unit label, grouped Standard Cost, tooltip behavior, legend/header layout, marker shape, and geometry at desktop-wide, laptop, narrower, and small/mobile widths. Keep the current SVG viewBox scaling unless the browser shows visible distortion.

Ordinary graph space allows natural vertical page scrolling on touch layouts. Only the narrow ruler hit area captures its drag; it retains pointer capture and keyboard interaction.

## 6. Page layout and navigation

- Remove the large Simulation PageHeading/title block; begin with working content.
- Desktop Simulation is a fixed workspace inside the shared application shell: the page does not vertically scroll, and only the BOM and RTG table bodies scroll vertically. At narrow responsive sizes, panels stack and natural page scrolling is allowed so all controls remain reachable.
- Desktop upper workspace: the main Graph is on the left and wider than a right-side block. The right-side block has two independent vertical columns. Its left column is one outer Business/Economic card with two main sections, Business and Economic, and a subordinate inset Outcome group within Economic; its right column stacks Result above Break-even Graph. Divide each column independently; their horizontal boundaries do not need to align. Stack Business inputs vertically in Selling Price, then SG&A % order; it contains inputs only, while Business Outcome rows remain in Result. Stack Economic inputs vertically in Variable Action Cost, Fixed Action Cost, then Batch Size order. The Variable Action Cost label has its `THB/<UOM>` unit beside it.
- Desktop Simulation remains a fixed workspace in the shared shell. Keep the upper areas and equal-width BOM/RTG lower panels visible together, giving the lower panels more workspace height than the previous implementation. Only BOM and RTG table bodies scroll vertically. Exact fixed proportions are reversible implementation details and are not finalized by this structural layout.
- Keep three compact icon-only controls in the Result action line in order: **Clone from**, **Send to**, and Simulation-local **Reset**. Use 32×32 neutral toolbar targets with icons, tooltips, explicit accessible names, hover feedback, and visible keyboard focus. Clone and Send use the same role-menu presentation as Master Data: the stable-width compact menu box, sized for the longest role label `Reference`, centers below its trigger and clamps to the viewport; Reference, Current, and Custom are left aligned with normal padding. Keep the accepted interaction language: delayed hover preview, one trigger/menu hover region, click to pin or close, outside-click dismissal, Escape with focus restoration, and keyboard navigation. Both retain exactly Reference, Current, and Custom options and their existing Simulation callbacks. Reset directly invokes Simulation Reset and has no all-dataset menu. Reset is not a Global Header action. Menus and Reset remain keyboard accessible. Clone, Send, and Reset produce no persistent inline Result/workspace feedback, including no routine "Send blocked" message.
- BOM/RTG have no separate title/count bars; their headers name **Bill of Materials** and **Routing Process**, and Status is a dedicated column. Each opaque header stays outside the vertically scrollable body and fills the complete panel width, including the space above the body's scrollbar gutter. Header/body columns remain aligned; the header has no vertical scroll owner. **Material Cost** and **Conversion Cost** stay on one line at desktop table sizes without moving their numeric axes or narrowing usable inputs. The `#` header and row numbers share a centered column while row numbers preserve original identity after selected-first presentation. Safe-row expansion, chevron state, keyboard behavior, and safe outside dismissal follow section 3.
- The `#` row-number controls manage only Simulation's per-product working selection; selected rows appear first without structural reordering. Protected or removed rows cannot be selected, and the selection never limits calculation scope.
- BOM and RTG must not have horizontal scrollbars. Keep vertical internal scrolling and usable sticky table headers. Use fixed/proportional columns and a responsive reflow/card presentation at narrow widths while preserving every editable field. No add/delete/resize/split/merge/reorder or Work Center-rate editing controls are available in Simulation; structural alternatives are prepared in Master Data / Custom.
- The page must not have horizontal overflow. Stack the major panels on narrow screens.
- The visible product navigation contains only Master Data, Cost Breakdown, and Simulation. No RCA context strip or visible Candidate/RCA-to-Simulation handoff appears.

Legacy RCA case/session migration may remain for old saved data. It is compatibility only and does not create an active RCA Simulation workflow.

## 7. Worked examples

### No change

Current SC `100`, SIM SC `100`: GAP 2 `0`, Parameter Saving `0`, Result Change `0.00`, Result `%` `0.00%`.

### BOM Price

Current `Usage=2`, `Price=10`, `Loss=5%`: Material Cost `21.00`. SIM Price `12`: Material Cost `25.20`, Change `+4.20`. Attribution: Price `+4.20`, Usage `0.00`, Loss `0.00`, Total `+4.20`.

### Routing Manning

Current Manning `1`, Capacity `100`, Yield `100%`, Labor Rate `100`, Burden Rate `50`: Factor `0.01`, Labor `1.00`, Burden `0.50`, Conversion `1.50`. SIM Manning `0.8`: Labor `0.80`, Burden `0.40`, Conversion `1.20`; parameter effects reconcile to `-0.30`.

### Economic margin

Current SC `100`, SIM SC `90`, Fixed Action Cost `1000`, Variable Action Cost / pc `1`, Batch Size `100`: Fixed Cost / pc `10`, Required Saving / pc `11`, Parameter Saving / pc `10`, Economic Margin / pc `-1`.

### Operating Profit

Selling Price `120`, SIM SC `90`, SG&A `10%`: SG&A / pc `12`, OP / pc `18`. With Selling Price `80`, SIM SC `90`, SG&A `10%`: SG&A / pc `8`, OP / pc `-18`.

### Input rejection

Reject Loss `-1%` or `101%`; Yield `0%` or `101%`; SG&A `-5%` or `101%`; negative Price, Usage, Manning, Fixed Action Cost, Variable Action Cost / pc, or Selling Price; Capacity `0` or negative; Batch Size `0`, negative, or fractional; and non-finite values. Do not coerce any of these to zero.

### Custom structure

Current Routing `[Cut, Form]`, Custom Routing `[Cut, Form, Polish]`, then select Custom as `activeDataset`: its latest Working structure is used directly; Cut/Form match by identity and Polish is editable as a Custom-only row. All untouched editable values start with visible status UNCHANGED against the Custom baseline; Custom Work Center rates apply to that effective dataset. If Custom omits Form, Form remains visible and protected as a structurally absent comparison row, without a normal editable ADDED/REMOVED status label.

## 8. Simulation Undo / Redo

Simulation keeps a separate chronological history for each product and role. A role history records committed BOM Price/Usage/Loss, RTG Manning/Capacity/Yield, and that role's Economic inputs. Undo reverses actions in order; Redo reapplies them, and a new edit after Undo clears that role's Redo stack. Switching active roles changes the history in scope. Send to Master Data is excluded.

Each history is scoped to its role's Working basis. A basis change invalidates only that role's stale entries. Each entry stores authoritative editable values keyed by stable Simulation record IDs and the role's Economic draft; rates, derived results, selection, expansion, focus, scroll, graph legend/ruler state, and transient invalid drafts are excluded. Applying an entry preserves that role's Simulation-local selection and its own Work Center rate context, then recalculates all derived values.

Typing is grouped into one committed edit per focused control. Spinner repeats and Batch Size graph dragging each form one action for the complete pointer gesture. Rejected or no-op values add no history entry. Reset is one action for the active role's parameter overrides; its Economic inputs and view state are preserved. Undo restores the pre-Reset parameter values and Redo reapplies the reset. Undo/Redo cannot cross-contaminate Reference, Current, and Custom.

Simulation history is ephemeral for the current app session and remains separate from Master Data dataset-edit history and CBD Candidate reorder history.
