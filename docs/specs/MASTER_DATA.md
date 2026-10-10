# Master Data Specification

**Status:** Core Master Data behavior, dataset shape, and actions are `FINALIZED — USER DECISION`. The visual principles below are `CONFIRMED DIRECTION — USER DECISION`; reversible visual choices belong in [`design.md`](../../design.md) and [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md).

## Final Target State

Opening a fresh session goes directly to an empty workspace with three independent datasets: **Reference**, **Current**, and **Custom**. There is no startup wizard or separate Product selector. The first time the user enters Master Data in a session, the default table view is **All Tables**, displaying BOM → Work Centers → Routing vertically. Users prepare independent datasets in that workspace, with Product Name stored as each dataset's metadata.

Each dataset has an in-session `Working` copy and one `Last Saved` copy; Save, Reset, Import, Clear, Clone, and Export act on the dataset being viewed. Sizing edits that side's metadata and exact row counts, and generates the agreed Excel template. Once Working datasets have sufficient information, Reference and Current can be compared in Cost Breakdown without saving, exporting, or activating them. The tables are presented in BOM → Work Centers → Routing order, but users may prepare the data in any order. Matching uses business identity rather than row position. The compact toolbar and metadata stay together above the tables, and the footer stays at the bottom of the app frame. Warnings inform the user without cluttering table rows or blocking normal navigation. Current shared-header, toolbar, preparation, status, warning, mock, and action-dialog behavior is detailed in [`MASTER_DATA_TOOLBAR_PREPARE_UX.md`](MASTER_DATA_TOOLBAR_PREPARE_UX.md).

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

Each dataset has two distinct states:
- **`Working`:** Actively edited in-session state.
- **`Last Saved`:** In-session snapshot created when the user explicitly triggers Save on that dataset.

Actions act on the currently viewed dataset:
- **Save:** Replaces only the viewed dataset's `Last Saved` state with its current `Working` state.
- **Reset:** Restores only the viewed dataset's `Working` state from its `Last Saved` state.
- **Export:** Exports only the viewed dataset's `Last Saved` state to Excel. Working changes that have not been saved are not exported.
- **Import:** Selecting a file parses and validates without changing `Working`. Only the explicit Import action applies the valid snapshot to the viewed dataset and initializes its Sizing counts from imported row counts. It never overwrites `Last Saved`; canceling the dialog leaves `Working` unchanged.
- **Clear:** Immediately clears only the viewed dataset's `Working` state (metadata, remark, table rows, and Sizing values); retains `Last Saved` and leaves other datasets untouched. Clear is one Undo/Redo history action.

## Master Data Owns Structural Changes

All structural changes to datasets belong strictly in Master Data:
- Adding records,
- Deleting records,
- Changing table row counts (Sizing),
- Reordering rows.

Simulation does not support structural edits. If the user wants to test a structural change, they prepare it in Master Data (typically in `Custom`), and then start Simulation from that dataset.

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
- Mode selector: `View` / `Edit` text tabs with one sliding active indicator. The selector is 32px high, matching toolbar action controls; the Reference / Current / Custom save-state dots keep their existing size.
- Dataset action toolbar order: Dataset selector → sliding View / Edit tabs → icon-only Sizing / Import / Clone / warning toggle / Reset / Clear / Save / Export → fixed 192px local Search → Table selector. Dataset and Table remain text selectors. Tools have no vertical separators. Prepare Dataset opens only from the global Header Info control; no duplicate toolbar trigger is shown.
- Table navigation: `BOM`, `Work Centers`, `Routing`, `All` (`All` remains the first-session default).
- Compact inline metadata below the toolbar: Product Name, UOM, Selling Price (THB), SG&A (%), and Remark. Edit mode changes only value areas to inputs; values remain part of the selected `Working` dataset.

Preserve the selected dataset, mode, and table view during same-session navigation.

Dataset metadata is independent for each dataset:

| Field | Meaning | Scope |
|---|---|---|
| Product Name | Product identity and display name | Independent per dataset |
| UOM | Unit of measure | Independent per dataset |
| Selling Price | Selling price (THB) | Independent per dataset |
| SG&A | SG&A percent of Selling Price (%) | Independent per dataset |
| Dataset Remark | Dataset-level annotation remark | Independent per dataset |

Product Name and UOM remain blank until entered; do not fabricate `Product` or `PC` in display, save, or export. UOM is free text. Selling Price input accepts a number only; THB is fixed and shown by the UI. Selling Price and SG&A keep their existing missing-value semantics; Dataset Remark may be blank. Do not add Product Code, Product Description, or Product Note. If effective Reference and Current Product Name or UOM differ after trimming and case normalization, show `Product Mismatch` as a non-blocking comparison status, not a warning. It does not block or confirm CBD entry.

Metadata appears as compact inline `Label : Value` pairs without a Metadata heading or disabled input boxes in View mode. Field widths remain stable, with Product Name and Remark wider than UOM and SG&A. Metadata in the page and Sizing dialog edit the same selected Working values.

## Sizing and Templates

- Sizing edits the viewed dataset's metadata and exact row counts for BOM, Work Centers, and Routing (minimum 1 each). Existing rows populate unset sizing fields with their effective current row counts; on a fresh empty workspace counts remain unset. Native number steppers remain available. Keep the dialog compact and centered, with aligned metadata fields and a grouped row-count list; dialog edits remain draft values until Apply.
- Applying a count sets that table to exactly that many rows:
  - Increasing the count appends blank rows with placeholder numbers.
  - Decreasing the count removes rows from the end; confirm only when populated data will be removed. Removing only blank trailing rows needs no confirmation.
  - Direct row additions and deletions keep that section's configured count synchronized; deleting all rows leaves the count unset.
- Blank business identities use effective names: `Material N`, `Work Center N`, and `Process N`. `N` counts currently blank/generated identities within that table, not physical row numbers. These effective names can be used, saved, and exported, and are reported as warnings until the user supplies an identity.
- **Download Template:** Located inside Sizing. Generates a blank canonical Excel structure using the current metadata and row-count values entered in the dialog, including values not yet applied.
- **Import Initialization:** When an Excel workbook is imported into the viewed dataset, its Sizing row counts are initialized to the imported row counts.

## Canonical Workbook Format

The canonical Master Data workbook contains exactly four sheets in order:
1. `META`
2. `BOM`
3. `WORK_CENTER`
4. `ROUTING`

There is no separate calculation sheet.
- **`META`:** Contains key-value metadata inputs (Product Name, UOM, Selling Price, SG&A %, Dataset Remark) and Excel formula outputs for MAT, Labor, Burden, Standard Cost, SG&A Amount, and OP. Blank Product Name/UOM remain blank in the workbook; generated row identities are exported as their effective values. The workbook stores SG&A as the app's percentage points (8 means 8%), so the formula divides the entered value by 100. Negative OP remains valid.
- Calculated META cells are Excel formulas with Excel cell Notes describing the formula. If an output's required source inputs are incomplete or invalid, its formula displays blank. An explicitly entered zero remains valid. Import reads only the five META inputs and recalculates results through the application engine; formula outputs are never imported as source values.
- **`BOM`:** `Name | Usage | Unit | Price | Loss | Note`
- **`WORK_CENTER`:** `WC | Labor | Burden | Note`
- **`ROUTING`:** `Process | WC | Manning | Cap | Yield | Note`

Styling conventions in the workbook:
- Dark header fill with bold white text.
- **Yellow fill:** Marks user-editable input cells.
- **Light gray fill:** Marks formula-driven calculation outputs on `META`.
- Unused cells remain plain white. Do not add a color legend, instruction prose, example rows, or extra source/system columns.
- (Note: Web table styling and Excel export styling remain separate; yellow cell rules apply to Excel export).

Record `Note` values and dataset `META.Dataset Remark` are annotations. Preserve them through web editing and workbook round-trips. Neither field is a calculation input or record identity, and a note-only difference does not make a business record `CHANGED`.

## Tables, Identity, and Spreadsheet Editing

Tables are displayed in standard order: **BOM → Work Centers → Routing**.

### Business Identity
Match records strictly by business identity:
- BOM: `Name`
- Work Centers: `WC`
- Routing: `Process`

`#` is a left-pinned row number and selection handle, not an identity. Never match records by row order or position. The local Search control in the Master Data toolbar searches the visible table; `All` applies the existing query to BOM, Work Centers, and Routing. Its placeholders are `Search BOM...`, `Search Work Centers...`, `Search Routing...`, and `Search all tables...`; its desktop width is fixed at 192px and position stays stable as the placeholder or table view changes. Search changes presentation, not dataset contents. It is not a global Header utility.

### Spreadsheet Editing
- View Mode is read-only.
- Edit Mode supports direct cell editing and spreadsheet keyboard navigation:
  - Arrow keys: Navigate across cells.
  - Enter: Move down; Shift+Enter: Move up.
  - Tab: Move right; Shift+Tab: Move left.
  - Escape: Cancel/exit cell editing where appropriate.
  - Ctrl/Cmd+C & Ctrl/Cmd+V: Clipboard copy/paste (including tabular data from Excel; pasted values map by row and column, and invalid pasted cells are identified locally rather than failing the page).
  - Ctrl/Cmd+Z: Undo; Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z: Redo. Header Undo/Redo stay visible across pages but are enabled only on Master Data and span Working edits across all Master Data tables.
  - Same-column bulk edits to selected rows.
- Selection gestures: Click `#` to select a row; drag across row headers or Shift+click for a contiguous range; Ctrl/Cmd+click for non-contiguous rows. Selection works in View and Edit, persists when switching between them, and is cleared only when the dataset scope changes or selected rows are removed. The `#` header toggles selection for visible/filtered rows only and preserves selected rows hidden by Search.
- Actions column: One fixed rightmost `Actions` column contains Trash and GripVertical reorder controls. Clicking Trash on a selected row deletes all selected rows in one history action; clicking Trash on an unselected row deletes only that row. Selected rows move together in source order. Reordering changes Working row order but does not make a business record `CHANGED`.
- Each table has a compact title/header with its local cyclic Blocker navigator and Add Row control, plus an always-visible footer for row/selection, Warning, and Blocker counts. Add Row stays visible but disabled in View. Empty tables remain compact and can add the first row from the Edit empty body or header control.
- Table wrappers may scroll horizontally but do not create nested vertical scroll regions; All view uses the page-level scroll for Bill of Materials → Work Centers → Routing.

## Validation and Edge Cases

- Validation is local and non-blocking. Cues appear on affected cells.
- Warnings are generated identity and auto-renamed duplicate; they are non-blocking, shown in amber, and may be hidden by the Warning visibility toggle. Blockers are missing required values, use an amber affected-cell highlight and red `*`, remain visible when Warning highlights are hidden, and make Reference/Current Incomplete. Custom Blockers appear in Prepare Dataset but do not affect global readiness. The Footer `⚠ N` and its tooltip count/list Warnings only; Ready/Incomplete tooltip separately shows Reference and Current Blocker counts. Product Mismatch remains a separate orange comparison status.
- Warning prose and issue badges stay out of table rows; dataset-level details appear in Prepare Dataset. The persistent footer `⚠ N` opens that summary. Counts are distinct affected source locations; Blockers and Product Mismatch are excluded from Warning counts. Warning or Blocker navigation switches to the source dataset/table, enters Edit mode, selects and scrolls the row, and focuses/highlights the field when available. Each table's Blocker navigator advances cyclically within that table and clears Search when the next source is filtered out.
- Routing `WC` references the Work Center table, and its entry control should help prevent typos.
- Missing required numeric inputs are Blockers and leave affected/dependent results `unavailable`; they are never replaced with zero. Costs requiring missing inputs remain `unavailable`.
- Blank placeholder rows from Sizing remain marked missing and are excluded from cost calculations.
- Reset immediately restores Working from Last Saved and is one Undo/Redo action; it is disabled when no Last Saved state exists. Clear immediately clears Working while preserving Last Saved and is one Undo/Redo action. Neither opens a confirmation. Export is enabled whenever the viewed dataset has Last Saved, independent of Working Draft state, and exports only that Last Saved snapshot. It opens native Save As directly from the user action when supported and retains the browser-download fallback. Clone opens a hover/focus source flyout, excludes the viewed destination, and performs the copy immediately when a source is chosen. Import stages validation until explicit Import. The Warning toggle controls only non-blocking generated-identity and auto-renamed-duplicate cues; missing/invalid required values and unresolved Work Center blocker cues remain visible. Warning data, `aria-invalid`, calculations, Prepare Dataset details, and navigation are unchanged. Warning presence does not add confirmations to Save, Export, or CBD navigation.

## Traceability

Primary detailed source: [finalized Master Data source specification](../history/MASTER_DATA_SPEC_2026-10-05.md), [the review context's later decisions](../history/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md), and its §79 latest Master Data addendum. The older [Master Data agreement](../../agreements/MASTER_DATA_FLOW_SPEC.md) remains evidence for compatible flow decisions; its earlier schema, workbook, export, and identity details were superseded by the later Master Data source. The explicit workbook decision on 2026-10-07 supersedes the separate calculation view and finalizes the four-sheet structure and META formulas above. The generic destination/source Clone semantics across Reference, Current, and Custom are finalized in [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md); this round's toolbar and warning behavior is finalized in [`MASTER_DATA_TOOLBAR_PREPARE_UX.md`](MASTER_DATA_TOOLBAR_PREPARE_UX.md).
