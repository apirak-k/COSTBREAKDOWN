# Master Data Specification

**Status:** Core Master Data behavior, dataset shape, and actions are `FINALIZED โ€” USER DECISION`. The visual principles below are `CONFIRMED DIRECTION โ€” USER DECISION`; reversible visual choices belong in [`design.md`](../../design.md) and [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md).

## Final Target State

Opening a fresh session goes directly to an empty workspace with three independent datasets: **Reference**, **Current**, and **Custom**. There is no startup wizard or separate Product selector. The first time the user enters Master Data in a session, the default table view is **All Tables**, displaying BOM โ’ Work Centers โ’ Routing vertically. Users prepare independent datasets in that workspace, with Product Name stored as each dataset's metadata.

Each dataset has an in-session `Working` copy and one `Last Saved` copy; Save, Reset, Import, Clear, Clone From, and Export act on the dataset being viewed. Sizing edits that side's metadata and exact row counts, and generates the agreed Excel template. Once Working datasets have sufficient information, Reference and Current can be compared in Cost Breakdown without saving, exporting, or activating them. The tables are presented in BOM โ’ Work Centers โ’ Routing order, but users may prepare the data in any order. Matching uses business identity rather than row position. The toolbar and metadata stay together at the top of the content area, and the footer stays at the bottom of the app frame. Warnings inform the user without cluttering table rows or blocking normal navigation.

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
- **Export:** Exports only the viewed dataset's `Last Saved` state to Excel. Unsaved Working edits are not exported.
- **Import:** Replaces only the viewed dataset's `Working` state. Import initializes the viewed dataset's Sizing counts from the imported row counts. Does not automatically overwrite `Last Saved`.
- **Clear:** Clears only the viewed dataset's `Working` state (metadata, remark, table rows, and Sizing values); retains `Last Saved` and leaves other datasets untouched.

## Master Data Owns Structural Changes

All structural changes to datasets belong strictly in Master Data:
- Adding records,
- Deleting records,
- Changing table row counts (Sizing),
- Reordering rows.

Simulation does not support structural edits. If the user wants to test a structural change, they prepare it in Master Data (typically in `Custom`), and then start Simulation from that dataset.

## Generic `Clone From` Semantics

Dataset copying uses unified **`Clone From`** semantics:

> **The currently viewed dataset is the Destination. The user chooses the Source dataset.**

Examples:
- **`Custom โ’ Clone From Current`:**
  The user views `Custom`, clicks `Clone From`, and selects `Current`. Current's Working state is copied into Custom.
- **`Current โ’ Clone From Custom`:**
  The user views `Current`, clicks `Clone From`, and selects `Custom`. Custom's Working state is copied into Current.
- **`Custom โ’ Clone From Reference`:**
  The user views `Custom`, clicks `Clone From`, and selects `Reference`. Reference's Working state is copied into Custom.

Rules for Clone From:
- Clone From copies the selected source dataset's `Working` state into the viewed dataset's `Working` state.
- It never overwrites the destination's `Last Saved` state.
- If the destination already contains populated data, the system requires explicit user confirmation before replacing it.
- Destination readiness (Prepared / Needs input) is recalculated from the copied content, not blindly copied from the source flag.
- **No special promotion workflows:** The application does not require separate actions like *Promote Trial*, *Approve Trial*, or *Set Scenario as Current*. If the user decides a Custom configuration should become the new operational Current, they simply view `Current` and execute `Clone From Custom`.

## Page Structure and Metadata

The page supports:
- Dataset selection: `Reference`, `Current`, or `Custom`.
- Mode toggle: `View Mode` (read-only) / `Edit Mode` (interactive editing).
- Dataset action toolbar: `Save`, `Reset`, `Clear`, `Clone From`, `Import`, `Export`, `Sizing`.
- Table navigation: `All Tables` (default on first session entry), `Work Centers`, `BOM`, `Routing`.
- Metadata bar: Product summary and dataset remarks.

Preserve the selected dataset, mode, and table view during same-session navigation.

Dataset metadata is independent for each dataset:

| Field | Meaning | Scope |
|---|---|---|
| Product Name | Product identity and display name | Independent per dataset |
| UOM | Unit of measure | Independent per dataset |
| Selling Price | Selling price (THB) | Independent per dataset |
| SG&A | SG&A percent of Selling Price (%) | Independent per dataset |
| Dataset Remark | Dataset-level annotation remark | Independent per dataset |

Do not add Product Code, Product Description, or Product Note. If Reference and Current have different Product Names, display a non-blocking Product Mismatch warning in CBD.

## Sizing and Templates

- Sizing edits the viewed dataset's metadata and exact row counts for BOM, Work Centers, and Routing (minimum 1 each).
- Applying a count sets that table to exactly that many rows:
  - Increasing the count appends blank rows with placeholder numbers.
  - Decreasing the count removes rows from the end; populated rows removed during truncation are lost.
  - Direct row additions/deletions in the table keep the configured Sizing count synchronized.
- **Download Template:** Located inside Sizing. Generates the canonical Excel workbook matching the viewed dataset's configured row counts.
- **Import Initialization:** When an Excel workbook is imported into the viewed dataset, its Sizing row counts are initialized to the imported row counts.

## Canonical Workbook Format

The canonical Master Data workbook contains exactly four sheets in order:
1. `META`
2. `BOM`
3. `WORK_CENTER`
4. `ROUTING`

There is no separate calculation sheet.
- **`META`:** Contains key-value metadata inputs (Product Name, UOM, Selling Price, SG&A %, Dataset Remark) and Excel formula outputs for MAT, Labor, Burden, Standard Cost, SG&A Amount, and OP. OP can be negative.
- **`BOM`:** `Name | Usage | Unit | Price | Loss | Note`
- **`WORK_CENTER`:** `WC | Labor | Burden | Note`
- **`ROUTING`:** `Process | WC | Manning | Cap | Yield | Note`

Styling conventions in the workbook:
- Dark header fill with bold white text.
- **Yellow fill:** Marks user-editable input cells.
- **Light gray fill:** Marks formula-driven calculation outputs on `META`.
- Unused cells remain plain white.
- (Note: Web table styling and Excel export styling remain separate; yellow cell rules apply to Excel export).

Record `Note` values and dataset `META.Dataset Remark` are annotations. Preserve them through web editing and workbook round-trips.

## Tables, Identity, and Spreadsheet Editing

Tables are displayed in standard order: **BOM โ’ Work Centers โ’ Routing**.

### Business Identity
Match records strictly by business identity:
- BOM: `Name`
- Work Centers: `WC`
- Routing: `Process`

`#` is a left-pinned row number and selection handle, not an identity. Never match records by row order or position.

### Spreadsheet Editing
- View Mode is read-only.
- Edit Mode supports direct cell editing and keyboard navigation:
  - Arrow keys: Navigate across cells.
  - Enter: Move down; Shift+Enter: Move up.
  - Tab: Move right; Shift+Tab: Move left.
  - Escape: Cancel/exit cell editing.
  - Ctrl/Cmd+C & Ctrl/Cmd+V: Clipboard copy/paste (including tabular data from Excel).
  - Ctrl/Cmd+Z & Ctrl/Cmd+Y: Page-level Undo/Redo across all Working tables.
- Selection gestures: Click `#` to select row; drag or Shift+click for contiguous range; Ctrl/Cmd+click for non-contiguous rows.
- Reorder handle: Dedicated control in the rightmost column after Actions. Selected rows move together in source order.

## Validation and Edge Cases

- Validation is local and non-blocking. Cues appear on affected cells.
- Warning prose and count badges stay out of table rows; dataset-level notices appear outside the tables.
- Missing required numeric inputs leave rows marked `MISSING`; they are never replaced with zero. Costs requiring missing inputs remain `unavailable`.
- Blank placeholder rows from Sizing remain marked missing and are excluded from cost calculations.
