# Master Data Specification

**Status:** Core Master Data behavior, dataset shape, and actions are `FINALIZED — USER DECISION`. The visual principles below are `CONFIRMED DIRECTION — USER DECISION`; reversible visual choices belong in [`design.md`](../../design.md) and [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md).

## Final Target State

Opening a fresh session goes directly to an empty workspace with three independent datasets: **Reference**, **Current**, and **Custom**. There is no startup wizard or separate Product selector. The first time the user enters Master Data in a session, the default table view is **All Tables**, displaying BOM → Work Centers → Routing vertically. Users prepare independent datasets in that workspace, with Product Name stored as each dataset's metadata.

Each dataset has an in-session `Working` copy and one `Last Saved` copy, plus an initial Working reset baseline used until that dataset has been saved. Save, Reset, Import, Clear, Clone, and Export act on the dataset being viewed. Sizing edits that side's metadata and exact row counts, and generates the agreed Excel template. Once Working datasets have sufficient information, Reference and Current can be compared in Cost Breakdown without saving, exporting, or activating them. The tables are presented in BOM → Work Centers → Routing order, but users may prepare the data in any order. Matching uses business identity rather than row position. The compact toolbar and metadata stay together above the tables, and the footer stays at the bottom of the app frame. Warnings inform the user without cluttering table rows or blocking normal navigation. Current shared-header, toolbar, preparation, status, warning, mock, and action-dialog behavior is detailed in [`MASTER_DATA_TOOLBAR_PREPARE_UX.md`](MASTER_DATA_TOOLBAR_PREPARE_UX.md).

## Purpose and Authority

This is the consolidated Master Data specification incorporating the latest finalized business logic. Master Data defines the dataset shapes, lifecycle, and structural editing for the application. Shared comparison and calculation rules are in [CROSS_CUTTING.md](CROSS_CUTTING.md); product logic authority is in [FINAL_LOGIC_SPEC.md](FINAL_LOGIC_SPEC.md).

## Datasets and Workspaces

Master Data maintains three independent datasets sharing the exact same canonical schema:

```text
Reference | Current | Custom
```

1. **Reference:** The business reference baseline used by Cost Breakdown (CBD).
2. **Current:** The current operational baseline used by Cost Breakdown (CBD).
3. **Custom:** A **free dataset workspace with no hard-coded semantic meaning**.
   - Custom may be used for a proposed future dataset, structural changes, sizing experiments, actual trial measurements, prepared alternative datasets, or data preparation prior to Simulation.
   - The system must **never** hard-code or force Custom to mean `Trial`, `Simulation`, `Approved`, `Future State`, or `Proposal`.
   - Custom is simply a free, flexible dataset canvas.

### Session Lifecycle
All three datasets are maintained in application session memory. State does not persist across application restarts; there is no database, persistent revision history, or version locking.

Each dataset has two distinct content states and an initial reset baseline:
- **`Working`:** Actively edited in-session state.
- **`Last Saved`:** In-session snapshot created when the user explicitly triggers Save on that dataset.
- **Initial reset baseline:** The Working snapshot when that dataset is first opened or loaded. Reset uses it until a Last Saved snapshot exists.

Actions act on the currently viewed dataset:
- **Save:** Replaces only the viewed dataset's `Last Saved` state with its current `Working` state.
- **Reset:** Always acts on the viewed dataset. It restores the most recently saved state when one exists; otherwise it restores that dataset's initial reset baseline. Reset All applies the same rule independently to Reference, Current, and Custom.
- **Export:** Always exports the viewed dataset's current `Working` state to Excel, including unsaved edits.
- **Import:** The UI accepts `.xlsx` only. Selecting a file parses and validates without changing `Working`. Only the explicit Import action applies the valid snapshot to the viewed dataset and initializes its Sizing counts from imported row counts. It never overwrites `Last Saved`; canceling the dialog leaves `Working` unchanged.
- **Clear:** Immediately blanks editable metadata and row values in only the viewed dataset's `Working` state. It preserves table rows, row order, row identity where supported, columns, required structural fields, and Sizing counts; it retains `Last Saved` and leaves other datasets untouched. Clear is one Undo/Redo history action, and Reset restores the applicable baseline when Clear was not saved.

## Master Data Owns Structural Changes

All structural changes to datasets belong strictly in Master Data:
- Adding records,
- Deleting records,
- Changing table row counts (Sizing),
- Reordering rows.

Simulation does not support structural edits. It derives each role's structure from that role's latest Master Data Working dataset. If the user wants to test a structural change, they prepare it in Master Data (typically in `Custom`); Simulation consumes the updated Custom Working structure directly when Custom is active. Save remains a checkpoint and is not a downstream publish gate.

## Generic Clone Semantics

Dataset copying uses unified **Clone** semantics:

> **The currently viewed dataset is the Destination. The user chooses the Source dataset.**

Examples:
- **`Custom` destination, `Current` source:**
  The user views `Custom`, clicks `Clone`, and selects `Current`. Current's Working state is copied into Custom.
- **`Current` destination, `Custom` source:**
  The user views `Current`, clicks `Clone`, and selects `Custom`. Custom's Working state is copied into Current.
- **`Custom` destination, `Reference` source:**
  The user views `Custom`, clicks `Clone`, and selects `Reference`. Reference's Working state is copied into Custom.

Rules for Clone:
- Clone copies the selected source dataset's `Working` state into the viewed dataset's `Working` state.
- It never overwrites the destination's `Last Saved` state.
- Selecting the source performs the copy; there is no second replacement confirmation.
- Destination readiness (Prepared / Needs input) is recalculated from the copied content, not blindly copied from the source flag.
- **No special promotion workflows:** The application does not require separate actions like *Promote Trial*, *Approve Trial*, or *Set Scenario as Current*. If the user decides a Custom configuration should become the new operational Current, they simply view `Current` and clone from `Custom`.

## Page Structure and Metadata

The page supports:
- Dataset selection: `Reference`, `Current`, or `Custom`.
- Mode selector: one compact icon-only segmented toggle with Eye and Pencil always visible in equal 32px halves. Clicking anywhere in the control or pressing Enter/Space toggles the current mode once; the icons indicate state and are not separate setters. A sliding active thumb changes without changing geometry. Its dark-slate active slab is inset about 2px from the outer shell. Dataset and Table selectors use the same inset active-slab treatment. The control uses `role="switch"`, `aria-checked`, and a tooltip/accessibility name for the next action (`Switch to Edit` or `Switch to View`). Reference / Current / Custom save-state dots keep their existing size.
- Dataset action toolbar order: Dataset selector → Eye / Pencil mode control → Sizing → spreadsheet Import → Clone → Warning toggle → Save → Reset → Clear → Export → fixed 192px local Search → Table selector. Dataset, mode, tools, search, and Table controls use 32px height; Dataset and Table remain text selectors with matching border and selected-state styling. Dataset, mode, and Table active slabs share the same inset geometry. Tool icons have no idle borders and retain individual 32px hit areas and existing spacing. Search placeholders are `Search BOM`, `Search Work Centers`, `Search Routing`, and `Search all tables`. Prepare Dataset opens only from the global Header Info control; no duplicate toolbar trigger is shown. No Master Data toolbar action is disabled or visually unavailable because of dataset state. Clone opens on hover or click/keyboard activation; trigger and dropdown are one hover region. The content-fit dropdown uses compact source rows and stays horizontally centered on the 32px trigger, subject to viewport clamping. A hover-open menu closes after leaving both regions, while click pins it open until trigger click, outside click, or Escape. Escape restores focus; selecting a source copies immediately and closes the menu.
- Reset, Clear, and Save each keep a single icon. Clicking it acts on the viewed dataset; a delayed hover menu exposes only the corresponding `… all datasets` action. Keyboard users can open that action from the focused control. These compound Working changes use the existing history entry; Save keeps the existing Last Saved lifecycle.
- Table navigation: `BOM`, `Work Centers`, `Routing`, `All` (`All` remains the first-session default).
- Compact inline metadata below the toolbar: Product Name, UOM, Selling Price (THB), SG&A, and Remark. Edit mode changes only value areas to inputs; the SG&A `%` suffix sits outside its input shell, and values remain part of the selected `Working` dataset.

Preserve the selected dataset, mode, and table view during same-session navigation.

Dataset metadata is independent for each dataset:

| Field | Meaning | Scope |
|---|---|---|
| Product Name | Product identity and display name | Independent per dataset |
| UOM | Unit of measure | Independent per dataset |
| Selling Price | Selling price (THB) | Independent per dataset |
| SG&A | SG&A percent of Selling Price (%) | Independent per dataset |
| Dataset Remark | Dataset-level annotation remark | Independent per dataset |

Product Name and UOM remain blank until entered; do not fabricate `Product` or `PC` in display, save, or export. UOM is free text. Selling Price input accepts a number only; `(THB)` in the field label identifies the unit, so the displayed value does not repeat a `THB` suffix. Selling Price and SG&A keep their existing missing-value semantics; Dataset Remark may be blank. Do not add Product Code, Product Description, or Product Note. Product comparison display has three informational states: `Product Match` (green) when both complete identities match after trimming/case normalization; `Product Mismatch` (violet) when both are complete but differ; and `Product Not Set` (neutral) when either side lacks Product Name or UOM. `Product Not Set` changes display only; it does not change handoff mismatch, Warning/Blocker counts, readiness, calculations, or CBD availability. Product Mismatch remains non-blocking and is not a Warning or Blocker. Warning emphasis remains amber/yellow.

Master Data numeric domains are shared across editing, state updates, and import validation: Selling Price, SG&A, BOM Usage, BOM Price, Work Center Labor Rate, Work Center Burden Rate, and Routing Manning are nonnegative; SG&A has no upper bound. BOM Loss is 0–100% inclusive (stored as 0–1); Routing Capacity is strictly positive; Routing Yield is greater than 0 through 100% inclusive (stored as greater than 0 through 1). Configured Sizing counts are whole numbers from 1 through their existing per-table limit; an unset count remains unset. Preserve imported precision when it is valid, and never coerce a missing or invalid required value to zero.

Main-page Metadata appears as one compact horizontal row on desktop: each field keeps its `Label : Value` pair inline, without a Metadata heading, disabled input boxes, or decorative underlines in View mode. The same five outer slots, label positions, baseline, and row height remain stable in View and Edit; only the value/editor changes. Product Name and Remark are wider; UOM, Selling Price, and SG&A use equal effective widths. Product Name, UOM, and Remark values are left aligned; Selling Price and SG&A values are right aligned. The SG&A label is `SG&A :`; its `%` suffix is outside the numeric input shell but remains inside its metadata field group. Narrower screens may wrap the field groups while keeping each label and value inline. Metadata in the page and Sizing dialog edit the same selected Working values.

## Sizing and Templates

- Sizing edits the viewed dataset's metadata and exact row counts for BOM, Work Centers, and Routing (minimum 1 each). Existing rows populate unset sizing fields with their effective current row counts; on a fresh empty workspace counts remain unset. Keep the dialog compact and centered. Product Name and Dataset Remark each use a full-width inline `Label : Input` row. UOM / Selling Price / SG&A use three equal outer columns; BOM / Work Centers / Routing use the same three aligned columns immediately below. Labels use their natural content width; each editor fills the remaining usable width of its own column, so editor widths may differ. Numeric values (Selling Price, SG&A, and row counts) are right aligned. Thin, short slate dividers separate only the first two groups in each three-column row; they are hidden when the fields stack and do not trail the third group. SG&A is labelled `SG&A`, with `%` in a fixed suffix gutter outside the input; UOM and Selling Price reserve the same empty gutter. All Sizing editors use a transparent idle border, subtle hover affordance, and a strong inset blue focus outline without changing geometry. Numeric controls keep a small right-side spinner gutter. Use quiet uppercase `METADATA` and `TABLE ROWS` section labels, with whitespace instead of a full-width divider between sections. Row counts use the shared numeric editor as whole numbers with existing bounds; an untouched unset count stays unset. Focused spinner, ArrowUp/Down, and wheel use the active digit's place value; without an active digit they step by 1. Download Template uses a Download icon and remains at the bottom-left of the dialog action area. It generates an `.xlsx` from the current dialog draft, even before Apply. Dialog edits remain draft values until Apply.
- Applying a count sets that table to exactly that many rows:
  - Increasing the count appends blank rows with placeholder numbers.
  - Decreasing the count removes rows from the end; confirm only when populated data will be removed. Removing only blank trailing rows needs no confirmation.
  - Direct row additions and deletions keep that section's configured count synchronized; deleting all rows leaves the count unset.
- Blank business identities use effective names: `Material N`, `Work Center N`, and `Process N`. `N` counts currently blank/generated identities within that table, not physical row numbers. These identities remain marked as generated in Working and Last Saved, can be used in normal application flow, export as effective names, and are reported as warnings until the user supplies an identity. Their Edit control value stays blank; the effective name is only placeholder text, not a user-entered value.
- **Download Template:** Located inside Sizing. Generates a blank canonical Excel structure using the current metadata and row-count values entered in the dialog, including values not yet applied.
- **Import Initialization:** When an Excel workbook is imported into the viewed dataset, its Sizing row counts are initialized to the imported row counts.

## Canonical Workbook Format

The canonical Master Data workbook contains exactly four sheets in order:
1. `META`
2. `BOM`
3. `WORK_CENTER`
4. `ROUTING`

There is no separate calculation sheet.
- **`META`:** Contains key-value metadata inputs (Product Name, UOM, Selling Price, SG&A %, Dataset Remark) and Excel formula outputs for MAT, Labor, Burden, Standard Cost, SG&A Amount, and OP. Blank Product Name/UOM remain blank in the workbook; generated row identities are exported as their effective values. The workbook stores SG&A as the app's percentage points (8 means 8%), so the formula divides the entered value by 100. Negative OP remains valid. Workbook routing labor and burden use each Routing row's selected Work Center and the same Manning / (Capacity × Yield) factor as the application; Work Center identity matching trims whitespace and ignores case, while missing or ambiguous matches leave results blank.
- Calculated META cells are Excel formulas with Excel cell Notes describing the formula. If an output's required source inputs are incomplete or invalid, its formula displays blank. An explicitly entered zero remains valid. A complete valid dataset must calculate MAT, Labor, Burden, Standard Cost, SG&A Amount, and OP as numeric Excel results. Import reads only the five META inputs and recalculates results through the application engine; formula outputs are never imported as source values.
- **`BOM`:** `Name | Usage | Unit | Price | Loss | Note`
- **`WORK_CENTER`:** `WC | Labor | Burden | Note`
- **`ROUTING`:** `Process | WC | Manning | Cap | Yield | Note`

Styling conventions in the workbook:
- Dark header fill with bold white text.
- **Yellow fill:** Marks user-editable input cells.
- **Light gray fill:** Marks formula-driven calculation outputs on `META`.
- Unused cells remain plain white. Do not add a color legend, instruction prose, example rows, or extra source/system columns.
- Spreadsheet alignment: numeric input and cost columns are right-aligned; Unit, Work Center/WC, and short sequence identifiers are centered; descriptive text and Note remain left-aligned.
- (Note: Web table styling and Excel export styling remain separate; yellow cell rules apply to Excel export).

Record `Note` values and dataset `META.Dataset Remark` are annotations. Preserve them through web editing and workbook round-trips. Neither field is a calculation input or record identity, and a note-only difference does not make a business record `CHANGED`.

## Tables, Identity, and Spreadsheet Editing

Tables are displayed in standard order: **BOM → Work Centers → Routing**.

### Business Identity
Match records strictly by business identity:
- BOM: `Name`
- Work Centers: `WC`
- Routing: `Process`

`#` is a left-pinned row number and selection handle, not an identity. Never match records by row order or position. The local Search control in the Master Data toolbar searches the visible table; `All` applies the existing query to BOM, Work Centers, and Routing. Its placeholders are `Search BOM`, `Search Work Centers`, `Search Routing`, and `Search all tables`; its desktop width is fixed at 192px and position stays stable as the placeholder or table view changes. Search changes presentation, not dataset contents. It is not a global Header utility.

### Spreadsheet Editing
- View Mode is read-only for data and clipboard operations, but users may focus and select cells for inspection.
- Edit Mode supports direct cell editing and spreadsheet keyboard navigation:
  - On each focus entry, editable text and numeric controls select their full current value. This applies to mouse and Tab focus, including the shared `NumericInput`. After focus, a second click can place the caret, ArrowLeft/ArrowRight collapse or move the caret normally, manual partial selection edits only that selection, and typing, Backspace/Delete, Ctrl/Cmd+A, and paste keep their normal behavior. Select controls and buttons do not receive text-selection behavior.
  - ArrowLeft/ArrowRight move the caret within an editable text value and collapse an active text selection. At the beginning or end of that value, they resume spreadsheet navigation to the adjacent cell. ArrowUp/ArrowDown and Enter retain their existing editor-specific cell/step behavior.
  - Enter: Move down; Shift+Enter: Move up.
  - Tab: Move right; Shift+Tab: Move left.
  - Escape: The shared shell closes the topmost transient menu/popover first; when none is open, it blurs the focused field and clears temporary spreadsheet cell focus/range. Escape never performs Undo. Dialogs keep their own existing Escape contract.
  - Ctrl/Cmd+C, Ctrl/Cmd+X, and Ctrl/Cmd+V: With no multi-cell selection, clipboard actions use the focused editable cell. A selection of two or more cells takes precedence for scalar paste and copy/cut; Copy/Cut emits newline-separated values in top-to-bottom visual order. Newline-separated single-column paste fills consecutive rows in that same column from the focused cell, does not require Block Action or row selection, and keeps existing validation and numeric parsing. Trailing newline rows are ignored. Cut clears only its focused or selected source values through the existing Working update path as one history action, and one Undo restores them together. Read-only cells and structural controls are not cut. View mode allows focus and selection for inspection but does not copy, cut, or paste. Existing safe behavior for clipboard content with tabs is retained.
  - Ctrl/Cmd+Z: Undo; Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z: Redo. When Master Data is active, Header Undo/Redo span Working edits across all Master Data tables; the shared Header routes to the active page's history.
- Cell focus/selection is separate from row selection and is scoped to one Dataset + Table + Column. A single focused cell is Focus only; Cell Selection exists only for two or more cells. A plain click moves Focus and clears any prior multi-cell selection. Ctrl/Cmd+Click toggles non-contiguous cells; when the selection falls below two cells, its remaining cell becomes Focus only. Shift+Click, vertical pointer drag after a small movement threshold, and Shift+Up/Down select contiguous cells in one column. Horizontal movement never extends a cell range; text editors use ArrowLeft/ArrowRight for caret and selection edits until a value edge, then resume spreadsheet navigation. Shift+Left/Right at a value edge moves Focus without extending a cell range. Interacting with another column or table clears the prior cell selection; only one table owns cell focus/selection at a time. Selected cells use a thin blue 1px perimeter; Focus uses the stronger shared blue 2px perimeter and visually wins when a cell is also selected. Issue fill and the Blocker marker remain visible without nested perimeters. Switching View/Edit preserves only valid focus/multi-cell state; changing Dataset clears the previous dataset's state. Clipboard actions are Edit-only: without a multi-cell selection they use the focused cell, and with two or more selected cells they operate on exactly those cells in top-to-bottom visual order.
- Selection gestures: Click `#` to select or deselect a row; dragging from an unselected row selects the traversed row range, while dragging from an already-selected row deselects the traversed range. Shift+click selects a contiguous range; Ctrl/Cmd+click toggles a non-contiguous row. Row content remains focused/edited normally and does not toggle selection. Row selection works in View and Edit, persists when switching between them, and is cleared only when the dataset scope changes or selected rows are removed. The shared `#` header uses the Cross-Cutting none/mixed/all rule within the filtered row scope and preserves selected rows hidden by Search. Normal, hover, selected, and selected-plus-hover rows have progressively stronger neutral/subtle-blue tint; selected row-number controls remain the strongest local row-selection indicator. Cell selection is a separate, thin blue perimeter restricted to one column; focus takes precedence over cell-selection styling. The sticky `#` cell remains transparent so the tint spans the row.
- Actions column: One fixed rightmost `Actions` column contains Trash and GripVertical reorder controls. Clicking Trash on a selected row deletes all selected rows in one history action; clicking Trash on an unselected row deletes only that row. Selected rows move together in source order. Reordering changes Working row order but does not make a business record `CHANGED`.
- Each table is a separate bordered section with a compact title/header. The header shows the title, row and selected counts, local Warning and Blocker counters, and Add Row in that order. Counts remain visible at zero; nonzero counters cycle to the next source issue in that table and current dataset, clear Search if needed, and do not open Prepare Dataset. The per-table footer is removed; the global Footer remains unchanged. All view uses a compact gap between the three sections and the page-level scroll. Master Data's table headers restore the historical `border-slate-400 bg-slate-100 text-slate-800` styling from the 2026-10-20 visual reference commit, including a `bg-slate-100` sticky `#` cell. The shared `#` control preserves its historical none appearance (`text-slate-700 hover:bg-slate-200`) and all appearance (`border-slate-800 bg-slate-700 text-white`); the canonical mixed state alone uses an intermediate slate. Add Row stays visible but disabled in View. Empty tables keep the active `Click to add first row` action in Edit mode.
- Web table columns use explicit shared widths for semantic columns and may scroll horizontally rather than squeezing structured values. A common outer table fills the available desktop panel width while keeping a shared minimum width inside each table's horizontal scroller. BOM Material, Work Centers Work Center, Routing Process, and Routing Work Center use the same actual Identity width; Routing reserves two Identity-width slots. BOM, Work Centers, and Routing Note use the same actual Note width. `#` and Actions remain fixed and shared across all three tables. Only middle data columns flex when the panel has extra width; Unit remains a stable small-medium width that is wider than the previous narrow editor. Identity/descriptive content (Material, Work Center, Process, Routing Work Center, and Note) is left aligned consistently across headers, View values, and Edit controls. All four identity values share one typography family; Work Center does not receive a uniquely heavier style. Row numbers, Actions, Unit, and numeric table values (Usage, Price, Loss, Labor Rate, Burden Rate, Manning, Capacity, and Yield) retain the centered web-table convention. Numeric values remain centered in the web tables; the separate Excel workbook alignment remains numeric-right as specified above.
- Loss and Yield use the same value shell for focus and selection in View and Edit. Numeric value, focused spinner, and reserved Blocker marker stay inside it; `%` stays outside every focus/selection/issue perimeter in a fixed suffix slot. The complete value-plus-suffix group is centered under its column label and remains aligned across View/Edit, focus, spinner, and Blocker states.
- The Warning-highlight toggle controls visual amber fill on both Warning and Blocker fields. ON shows amber Warning fields and amber Blocker fields with red `*`; OFF removes both amber fills but keeps the Blocker `*`, `aria-invalid`, validation, count, readiness, Prepare Dataset item, and navigation. Focus adds the dominant blue focus treatment; the `*` remains visible, and a cell also inside a selected range does not receive a second blue ring. Issue styling stays on the field, not the whole `td` or row. The Master Data `#` control restores the historical none/all appearance and uses an intermediate slate only for its canonical mixed state; selected row-number buttons remain the strongest blue selection indicator.
- Safe blank workspace/gutter clicks dismiss transient UI and clear temporary spreadsheet cell focus/range while preserving row selection, edited data, dataset/table selection, Search, and Saved/Working state. Escape dismisses one topmost transient layer; otherwise it blurs the focused field and clears temporary spreadsheet focus/range. Neither action invokes Undo. Existing modal behavior remains modal-owned.
- View-mode cell selection uses the same informational cell-selection state as Edit without enabling clipboard actions; Work Center identity typography matches Material, Process, and Routing Work Center.
- Table wrappers may scroll horizontally but do not create nested vertical scroll regions; All view uses the page-level scroll for Bill of Materials → Work Centers → Routing.

## Validation and Edge Cases

- Validation is local and non-blocking. Cues appear on affected cells.
- Warnings are generated identity and auto-renamed duplicate; they are non-blocking and may be highlighted in amber. Blockers are missing required values and make Reference/Current Incomplete. The Warning-highlight toggle controls only visual field fills: OFF removes amber from both Warning and Blocker fields but preserves the Blocker `*`, validation, counts, readiness, Prepare Dataset entry, and navigation. All validation/readiness/count behavior remains unchanged. Custom Blockers appear in Prepare Dataset but do not affect global readiness. The Footer `⚠ N` and its tooltip count/list Warnings only; its dataset readiness tooltip shows only the Reference and Current Blocker counts with CircleX. Product Mismatch remains a separate violet comparison status.
- Warning prose and issue badges stay out of table rows; dataset-level details appear in Prepare Dataset. The persistent footer `⚠ N` opens that summary without changing the current page. Counts are distinct affected source locations; Blockers and Product Mismatch are excluded from Warning counts. Prepare Dataset detail navigation switches to the source dataset/table, enters Edit mode, selects and scrolls the row, and focuses/highlights the field when available. Table-header Warning and Blocker counters independently advance cyclically within their own table and current dataset, clear Search when the next source is filtered out, and preserve All view when activated from All.
- Issue meaning stays cell-level. Both Warning and Blocker fields receive a pale amber fill and subtle amber border only while Warning highlights are on. With highlights off, both return to their normal field color; Blockers retain a small red `*` attached to the actual field/value in both View and Edit. The star is an absolute overlay and consumes no layout width. Focus is stronger than a selected-cell range; when both apply, focus wins without stacking rings. Neither state alters issue classification. Never apply warning/blocker color to the whole row.
- A numeric input responds to mouse-wheel adjustment only while it owns focus. Scrolling while the pointer merely rests over an unfocused numeric cell scrolls the page without changing the value.
- Routing `WC` references the Work Center table, and its entry control should help prevent typos.
- Missing required numeric inputs are Blockers and leave affected/dependent results `unavailable`; they are never replaced with zero. Costs requiring missing inputs remain `unavailable`.
- Blank rows created by Sizing remain incomplete records and are marked `MISSING`. The calculation engine does not silently skip a required incomplete row and produce a complete cost from the remaining populated rows. Missing required inputs are never replaced with zero, so affected or dependent results—including Standard Cost and the related comparison Gap—remain unavailable until the row is completed or removed. An explicitly entered numeric zero follows the normal field-domain and business rules and is distinct from a missing value.
- Reset is always invokable and immediately restores Working from Last Saved when present, otherwise from the initial Working baseline; it is one Undo/Redo action. Clear immediately blanks editable values while preserving the dataset's existing rows, row order, identities, columns, and Sizing; it retains Last Saved and is one Undo/Redo action. Neither opens a confirmation. Clear's trigger and its all-dataset menu item use rose styling only on hover; the idle trigger, keyboard focus ring, and tooltip remain neutral, and no other action receives destructive hover. Export is always invokable and exports the viewed current Working snapshot, including unsaved edits; it opens native Save As directly from the user action when supported and retains the browser-download fallback. Clone opens on hover or click/keyboard activation, excludes the viewed destination, and performs the copy immediately when a source is chosen. Import stages validation until explicit Import. The Warning toggle controls amber field fills on both Warning and Blocker locations; turning it off removes both fills while preserving blocker stars, validation, counts, readiness, Prepare Dataset details, and navigation. Warning/blocker classification, data, `aria-invalid`, calculations, and navigation remain unchanged. Warning presence does not add confirmations to Save, Export, or CBD navigation.
- Table Edit fields keep the table's cell padding, row height, and value position stable across View/Edit. Idle editors use a light transparent surface, with stronger affordance on hover/focus; warning/blocker fills and borders apply only to the actual field/value. The `#` is the selection control, while a subtle selected-row tint provides row-wide visual tracking without a blue left border or outline. Hover stays lighter than selected state, and focused cells retain a distinct local blue ring. Column widths are explicit, identity columns receive priority, and Note does not absorb leftover width. Work Center View uses a neutral left-aligned identifier tag. Renaming a Work Center updates its linked Routing references in the same Working history mutation. During identity editing, the focused input retains the user's text draft while normalization keeps stored identities unique; on blur, the normalized value is shown. Deleting the full text leaves the editor blank even when an effective generated identity remains available to the application.

## Traceability

Primary detailed source: [finalized Master Data source specification](../history/MASTER_DATA_SPEC_2026-10-05.md), [the review context's later decisions](../history/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md), and its §79 latest Master Data addendum. The older [Master Data agreement](../../agreements/MASTER_DATA_FLOW_SPEC.md) remains evidence for compatible flow decisions; its earlier schema, workbook, export, and identity details were superseded by the later Master Data source. The explicit workbook decision on 2026-10-07 supersedes the separate calculation view and finalizes the four-sheet structure and META formulas above. The generic destination/source Clone semantics across Reference, Current, and Custom are finalized in [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md); this round's toolbar and warning behavior is finalized in [`MASTER_DATA_TOOLBAR_PREPARE_UX.md`](MASTER_DATA_TOOLBAR_PREPARE_UX.md).
