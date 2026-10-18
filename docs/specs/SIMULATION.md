# Simulation Specification

**Status:** FINALIZED — USER DECISION
**Scope:** Simulation lifecycle, parameter and economic calculations, Master Data transfer, matching, validation, graph, and page layout.

The visible product flow is:

```text
Master Data → Cost Breakdown → Simulation
```

Simulation is an isolated what-if workspace. It does not add an approval, Trial, Candidate, or RCA stage.

## 1. Workspace lifecycle

### 1.1 Automatic initialization

When Simulation opens without a valid workspace, initialize SIM from the current Current Working dataset and show the working interface immediately. There is no “Start SIM From” landing screen. State belongs to the active product; switching products cannot reuse another product’s SIM, and deleted products are pruned.

### 1.2 Clone from

The compact **Clone from ▾** menu has exactly three sources: Reference, Current, and Custom. Selecting one copies that dataset’s metadata, BOM, Routing, and structure into the isolated SIM snapshot. SIM Work Center rates are then replaced with Current Work Center rates. The selected source is starting content and provenance only: every analysis remains Current → SIM.

Every explicit clone establishes a new **Reset** baseline for editable BOM/RTG parameters. Reset restores those parameter values to the clone/start snapshot, clears Fixed Action Cost, Variable Action Cost / pc, and Batch Size, and restores Selling Price and SG&A % from Current. On Simulation initialization, Selling Price and SG&A % display their Current values and the three Simulation-only assumptions start blank. Reset preserves the live Current Work Center rates and Simulation-local selection, and never changes a source dataset. Existing Clone behavior for the Economic draft remains unchanged. Re-cloning replaces the parameter Reset baseline.

Changing Reference or Custom alone does not reset SIM. If Current changes, the saved SIM is stale because both the comparison baseline and rate context changed. Reconcile it, then initialize from the new Current when Simulation is active. Preserve valid Economic draft inputs where possible.

### 1.3 Send to

The compact **Send to ▾** menu has exactly three targets: Reference, Current, and Custom. Sending copies the complete SIM snapshot, including its Current-rate context and structure, into that target’s Working dataset. Reconcile sizing counts from the copied rate, BOM, and Routing rows. Record the change through the existing Master Data Working/history lifecycle; do not overwrite Last Saved.

- Sending to Reference or Custom leaves Current and the existing SIM baseline intact.
- Sending to Current changes the baseline; reconcile and recreate SIM from the new Current while preserving valid Economic inputs where possible.
- Valid sources and pre-commit Simulation input validation keep authoritative SIM sendable. Defensive data-layer integrity validation remains an internal invariant safeguard for corrupt/legacy state, not a normal user-facing blocked Send workflow.
- Do not create a fourth dataset or a promotion/approval lifecycle.

## 2. Parameter Simulation

SIM is temporary. Its structure is locked: no add, delete, resize, split, merge, rate editing, or structural reorder. Prepare structural alternatives in Master Data / Custom, then choose **Clone from Custom**.

### 2.1 Matching and status

Match by canonical business identity, never row position: BOM material identity, Work Center identity, and Routing process identity. Missing, duplicate, ambiguous, or unsafe identity is protected; do not guess or fabricate an attribution.

Normal editable rows display exactly `CHANGED` or `UNCHANGED`. Compare committed BOM Price/Usage/Loss or RTG Manning/Capacity/Yield with the latest valid start/clone/reset baseline, using stable Simulation record IDs. All parameters equal means `UNCHANGED`; any difference means `CHANGED`. Invalid drafts do not change authoritative status. Undo back to baseline and Reset restore `UNCHANGED`. Clone from Reference/Custom may differ from Current while still starting `UNCHANGED`. This display status does not change Current → SIM calculation or structural matching.

Legacy structural, missing, ambiguous, or protected rows remain safely visible where needed. Missing SIM rows and unsafe identities cannot be edited/selected. They do not introduce ADDED/REMOVED as normal editable status labels. CHANGED uses CBD's compact bold amber treatment; UNCHANGED uses its compact bold slate treatment.

There is no **Factors to Simulate** workflow. The `#` column is Simulation's local row selector: its header is a checkbox-role select-all/deselect-all control with false/mixed/true state. None or some selected selects all eligible rows; all selected clears them. Each eligible row's existing displayed number is its square selection button; repeat activation deselects the same stable record after selected-first movement. There is no separate Select column. Selected rows rise to the top in stable source order for viewing; the SIM snapshot order and full-snapshot calculation scope never change. Protected, unmatched, ambiguous, and REMOVED comparison rows cannot be selected. Reset restores the parameter baseline, clears the three Simulation-only assumptions, restores Selling Price and SG&A % from Current, and preserves the worklist. CBD Selected Comparison, filters, and sorting are not transferred to SIM, and Simulation does not mutate CBD selection.

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
| Work Center Labor/Burden Rate | read-only in SIM; always from Current |

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

The Result panel remains a read-only `Current → SIM` comparison and contains two sections in this order:

1. **Cost / Unit** — `Cost | Current | SIM | Change | %`, with Material Cost, Labor Cost, Burden Cost, Conversion Cost, and Standard Cost.
2. **Business Outcome / Unit** — Selling Price, monetary SG&A, and Operating Profit, using the same Current, SIM, Change, and % columns.

The panel uses the authoritative Current and SIM cost calculations and business metrics. Selling Price and SG&A overrides use the effective Simulation values, initialized and reset from Current. Business Outcome does not enter GAP 1 / GAP 2 or Action Break-even. A lower cost is favorable (green) and a higher cost is unfavorable (red). Operating Profit uses the opposite direction: an increase is favorable (green), a decrease is unfavorable (red). Selling Price and SG&A comparisons use neutral change styling. Standard Cost is the emphasized total row within Cost / Unit.

For every row:

```text
Change = SIM − Current
% = (Change / Current) × 100
```

Show `—` when either value is unavailable, or Current is unavailable or zero for the percentage. Never show Infinity, -Infinity, or NaN. Monetary values and percentages show exactly two decimals. The Result currency-per-unit context uses the resolved product UOM (falling back to `Unit` when the Reference and Current UOMs conflict). Result is read-only and derives its displayed values from the cost engine and shared business-metric helper; it owns no persisted state.

## 3. Parameter Cost Effect

Each BOM and Routing row can expand a compact **Parameter Cost Effect** detail. Its subtle vertical hierarchy guide and label are indented to the right of the parent Material/Process name. Only this hierarchy presentation moves; parameter effect values and Total retain their existing numeric axes. Use the existing multiplicative attribution helper and show absolute `THB/<resolved UOM>` effects only (for example THB/PC or THB/SET; fallback THB/Unit).

- BOM attributes Material Cost change to Price, Usage, and Loss.
- Routing attributes Conversion Cost change to Manning, Capacity, and Yield.
- Routing uses Current Work Center rates on both sides; there is no Rate Effect.
- Effects must reconcile to `SIM row cost − Current row cost` within floating-point tolerance.
- Display signed effects in `THB/<resolved UOM>` under their matching parameter columns and one compact numeric Total under Material Cost / Conversion Cost. Positive cost effects use a `+` sign and red; negative cost effects use a minus sign and green; rounded zero is neutral `0.00`, never `+0.00`. The Total label stays neutral. Do not display effect percentages.
- When a valid parameter change takes a row cost to or from zero, split interaction effects symmetrically across parameter-change orders so the individual effects remain calculable and reconcile to Total.
- Added/Removed rows, ambiguous identity, missing required values, invalid math, or unreconciled Work Center context have unavailable attribution. Each unavailable effect and Total displays `—`; expanded details do not show an explanation or helper sentence.
- REMOVED, ambiguous, and unmatched rows may expand to view their unavailable effect values; they remain protected and cannot be edited or selected.
- Every safe non-interactive part of a row toggles its details: Material/Process name, Status, calculated cost, whitespace, padding, and chevron area. The chevron indicates the same row state; it has no independent expansion state. The focusable row exposes its expanded state and detail relationship; Enter/Space toggle only when the row itself is focused. NumericInput, the entire `#` selection area, drag selection, nested controls, and expanded detail interactions do not toggle the row.
- Clicking genuinely safe blank workspace outside the rows dismisses expanded details. Editors, selection controls, and detail content retain their own interaction. Clicking a safe area of row B while row A is expanded must execute B's toggle without the outside-dismiss handler swallowing the click.

## 4. Economic and Business Analysis

Economic and Business are two visually separate zones over the same SIM snapshot. Economic inputs do not change MAT, Labor, Burden, Conversion, or Standard Cost. Business assumptions do not enter the Action Break-even formula. Both are advisory and never an approval gate.

Simulation uses the shared first-focus input behavior for parameter, Economic, and Business editors: each focus entry selects the full current value, including when reached by Tab. A subsequent click can reposition the caret; arrows, partial selection, typing, deletion, paste, numeric stepping, and validation retain their normal editor behavior.

### Economic inputs and outputs

Editable Action Economics inputs:

1. Fixed Action Cost (THB), finite and `>= 0`.
2. Batch Size, a positive whole production quantity in the product UOM.
3. Variable Action Cost / Unit (THB per product UOM), finite and `>= 0`.

Calculated, read-only outputs:

```text
Parameter Saving / Unit = Current Standard Cost − SIM Standard Cost
Required Saving / Unit = (Fixed Action Cost / Batch Size) + Variable Action Cost / Unit
Economic Margin / Unit = Parameter Saving / Unit − Required Saving / Unit
Break-even Quantity = Fixed Action Cost / (Parameter Saving / Unit − Variable Action Cost / Unit)
```

Batch Size spreads Fixed Action Cost when calculating Required Saving and Economic Margin. It is the planned production quantity and does not define or change Break-even Quantity.

If `Parameter Saving / Unit <= Variable Action Cost / Unit`, positive-quantity break-even is not achievable. If Fixed Action Cost is zero and net saving is positive, Break-even Quantity is zero. Break-even is calculated independently of Batch Size. Missing required source values remain unavailable; never substitute zero. For whole-unit production, display the smallest whole quantity that reaches break-even (ceiling) while retaining the precise internal intersection for the graph.

The Break-even graph uses:

```text
Cumulative Parameter Saving(Q) = Parameter Saving / Unit × Q
Total Action Cost(Q) = Fixed Action Cost + Variable Action Cost / Unit × Q
```

The lines share the same Break-even calculation as the numeric result. Batch Size is the graph's only draggable value and stays synchronized with its NumericInput. The graph uses the product's resolved UOM; when Reference and Current UOMs are both present but differ, use the existing shared display convention `Unit`.

### Business assumptions and outputs

Editable assumptions:

1. Selling Price override, initialized and reset to Current Selling Price, finite and `>= 0`.
2. SG&A % override, initialized and reset to Current SG&A %, `0–100%` inclusive.

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

The graph title is **Simulation Cost Structure**. The five categories remain `REF | GAP 1 | CUR | GAP 2 | SIM`. REF, CUR, and SIM show Material, Labor, Burden, SG&A, and sign-matched Profit. Their visible Standard Cost remains Material + Labor + Burden only; its value and subtle neutral/slate outline group follow the currently visible cost contributors. The outline has no fill and is not another cost segment. SG&A and Profit stay outside the Standard Cost group and do not enter its value.

Each state also shows **Visible Net**, the signed sum of the currently visible state-stack segments (Material + Labor + Burden + SG&A + sign-matched Profit). It is derived from the same Legend-filtered stack that draws the bar, updates immediately when Legend visibility changes, and is graph-view-only: it does not change Standard Cost, Result, source data, or business values. Selling Price is excluded. If a visible segment makes the stack total unavailable, Visible Net is unavailable. For REF, CUR, and SIM, place its two-decimal value just outside its own visible-stack endpoint: above for positive or zero totals and below for negative totals. Never derive its normal vertical position from Standard Cost. Check the rendered text bounds against the connected Selling Price line/point and plot boundary. If the centered label would actually crowd either, place it in the existing Standard Cost number column (`state.x + 35`, start-aligned). In that side column, keep its Y position tied to its own stack endpoint; only adjust around that endpoint when needed to avoid a remaining visual collision or clipping. Equal Visible Net and Selling Price numbers alone do not imply a collision. When Visible Net and Standard Cost are effectively equal at the graph's displayed precision, render only the existing Standard Cost label. GAP 1 and GAP 2 have no Visible Net labels.

Selling Price remains a separate solid line with a circular marker and no separate Selling Price numeric label. Its blue is slightly lighter, while its calculation, path, points, Legend toggle, tooltip, and interactions remain unchanged. Render the Selling Price line and points behind the Standard Cost and Visible Net number labels. GAP 1 and GAP 2 remain signed Material, Labor, and Burden contributions with visible signed totals at their bar ends. Positive and negative values retain their actual direction, including negative Operating Profit.

Legend controls are **Material, Labor, Burden, SG&A, Profit +, Profit −, Selling Price, and Ruler**. They filter the graph view only and never change source data, Result, or calculations. Hidden segments reserve no geometry; visible segments reflow. Profit + shows only positive Profit and Profit − only negative Profit. Use square swatches for stack items, a solid line with a centered circle for Selling Price, and a dashed marker-free line for Ruler. Keep the title and legend as a compact group without pushing the legend to the far edge. The separate **Show all** action stays visible after Ruler at the far right; it is enabled while any Legend item is hidden and restores all eight items, then disables when all are visible. The title/legend row and divider use the same responsive breakpoint: side-by-side uses a subtle vertical divider; stacked uses horizontal separation and no vertical divider. OFF bar-series squares are hollow and retain their own series color border; OFF Selling Price and Ruler line samples become neutral gray, while all labels remain readable. Graph fills use solid colors in the shared CBD Material, Labor, and Burden families; SG&A and the positive/negative Profit colors remain distinct. Do not use low opacity to soften bar fills.

The graph has a visible Y-axis line with readable ticks and the dynamically resolved `THB/<UOM>` label rendered horizontally above or at the top of the axis, never rotated vertically beside it. Standard Cost values sit just to the right of their group outline with a small deliberate gap; the value alone moves, not its bar or outline. Its range refits to currently visible graph geometry; Selling Price affects the range only while its legend item is on. Controlled data tooltips appear immediately on hover/focus and disappear immediately on leave/blur, without flicker between adjacent segments. The five visible category labels themselves use the custom tooltip mappings REF → Reference Cost Structure, GAP 1 → Current − Reference, CUR → Current Cost Structure, GAP 2 → Simulation − Current, and SIM → Simulation Cost Structure. Tooltips also identify stack contributors and each state's visible Standard Cost with its unit. Informational targets use the normal/default cursor; the ruler retains `ns-resize`. Blank graph space shows no native tooltip; accessible graph name/description remain available to assistive technology.

The draggable ruler is a visual-only comparison guide. Draw a thin dashed line in front of the bars with its numeric value at the right end. Keep pointer capture, a local 8–12px hit target centered on the line, vertical-only drag, Arrow Up/Down, Page Up/Down, Home, End, and gentle snapping to zero, every visible cumulative Material/Labor/Burden/SG&A/Profit boundary in REF/CUR/SIM, visible Standard Cost, visible Selling Price, and useful GAP boundaries. Snap only when close; preserve free movement between levels. It remains visually clean during pointer and keyboard interaction, with no focus frame or visible hit box. Do not use a full-plot transparent interaction layer or separate ruler box/label.

Browser verification must inspect the rendered unit label, grouped Standard Cost, tooltip behavior, legend/header layout, marker shape, and geometry at desktop-wide, laptop, narrower, and small/mobile widths. Keep the current SVG viewBox scaling unless the browser shows visible distortion.

Ordinary graph space allows natural vertical page scrolling on touch layouts. Only the narrow ruler hit area captures its drag; it retains pointer capture and keyboard interaction.

## 6. Page layout and navigation

- Remove the large Simulation PageHeading/title block; begin with working content.
- Desktop Simulation is a fixed workspace inside the shared application shell: the page does not vertically scroll, and only the BOM and RTG table bodies scroll vertically. At narrow responsive sizes, panels stack and natural page scrolling is allowed so all controls remain reachable.
- Desktop: Graph occupies about two-thirds of the upper row; Result and Economic share the remaining third. BOM and RTG are equal-width panels in the lower row. Keep all five regions visible together and use the shell's available height; only BOM and RTG table bodies scroll vertically.
- Keep exactly two separate compact menu controls, **Clone from ▾** and **Send to ▾**, in the Result action line, followed immediately by a Simulation-local **Reset** button to the right of Send to. Reset is not a Global Header action. Menus and Reset remain keyboard accessible. Clone, Send, and Reset produce no persistent inline Result/workspace feedback, including no routine "Send blocked" message.
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

Current Routing `[Cut, Form]`, Custom Routing `[Cut, Form, Polish]`, then Clone from Custom: Cut/Form match by identity; Polish exists only in SIM and is editable. All cloned editable values start with visible status UNCHANGED against that clone baseline; Current Work Center rates still apply. If Custom omits Form, Form remains visible and protected as a structurally absent comparison row, without a normal editable ADDED/REMOVED status label.

## 8. Simulation Undo / Redo

Simulation uses one chronological history for committed BOM Price/Usage/Loss, RTG Manning/Capacity/Yield, Economic inputs, Business overrides, and Reset. Undo reverses actions in order; Redo reapplies them, and a new edit after Undo clears Redo. Clone starts a new baseline and clears both stacks. Send to Master Data is excluded.

History is scoped to the active product and Current basis. A Current-basis change invalidates stale entries. Each entry stores only authoritative editable values keyed by stable Simulation record IDs and the Economic draft; rates, derived results, selection, expansion, focus, scroll, graph legend/ruler state, and transient invalid drafts are excluded. Applying an entry preserves Simulation-local selection and the live Current Work Center rate context, then recalculates all derived values.

Typing is grouped into one committed edit per focused control. Spinner repeats and Batch Size graph dragging each form one action for the complete pointer gesture. Rejected or no-op values add no history entry. Reset is one action across all editable parameters and Economic/Business inputs: parameters return to the clone/start baseline, Fixed Action Cost / Variable Action Cost / Batch Size become blank, and Selling Price / SG&A % return to their Current values. Undo restores the full pre-Reset values and Redo reapplies the Reset; view state is preserved.

Simulation history is ephemeral for the current app session and remains separate from Master Data dataset-edit history and CBD Candidate reorder history.
