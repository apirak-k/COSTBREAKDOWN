# COSTBREAKDOWN — Master Data Specification

- **Status:** Finalized for Master Data review
- **Scope:** Product/data behavior, session state, Master Data flow, table data model, editing interaction rules, fixed toolbar/metadata/footer placement, and the linked Standard Cost view in Excel
- **Not in scope:** Final visual styling, final accounting formulas, and detailed behavior of later pages except where explicitly noted

---

## 1. Purpose

The Master Data page prepares and edits the two datasets used by the rest of the COSTBREAKDOWN flow:

- **Reference**
- **Current**

The page should behave like a lightweight engineering spreadsheet rather than a form-heavy CRUD screen.

The design priorities are:

1. Keep only data that is actually needed.
2. Make data entry fast and familiar for Excel users.
3. Keep Reference and Current independent.
4. Make Save/Reset/Export behavior predictable.
5. Never use row position as business identity.
6. Keep warnings informative rather than blocking normal navigation.

---

## 2. Session and Persistence Model

The application has **no database persistence**.

All application state exists only for the current runtime/session.

```text
Open application
    ↓
New session
    ↓
Reference state + Current state
    ↓
Close/restart application
    ↓
Session is discarded
    ↓
Next open starts fresh
```

There is no:

- database
- save history
- version history
- archive
- multi-checkpoint rollback
- persistence across application restarts

### 2.1 Dataset state

Each dataset independently has:

```text
Reference
├─ Working
└─ Last Saved

Current
├─ Working
└─ Last Saved
```

`Reference` and `Current` never share one Save state.

### 2.2 Save

`Save` applies only to the dataset currently being viewed.

```text
Save Reference
→ Reference Working replaces Reference Last Saved
→ Current is unchanged
```

```text
Save Current
→ Current Working replaces Current Last Saved
→ Reference is unchanged
```

Only one Last Saved state is retained for each dataset. Saving again replaces the previous Last Saved state.

### 2.3 Reset

`Reset` restores the currently viewed dataset's Working state from its own Last Saved state.

```text
Current Working
    ↓ Reset
Current Last Saved
```

It does not affect the other dataset.

If no Last Saved state exists yet, there is no saved state to restore. The exact UI treatment (for example, disabled action versus explanatory message) belongs to the UX/UI phase.

### 2.4 Export

Export always uses the **Last Saved** state of the selected dataset.

Unsaved Working changes are not exported.

```text
Working changes
    ↓
not saved
    ↓
Export
    ↓
Last Saved dataset is exported
```

If the selected dataset has no Last Saved state yet, there is no valid saved source to export.

### 2.5 Import

Import writes into the **Working** state of the currently selected dataset.

Import does not become Last Saved until the user explicitly presses Save.

### 2.6 Clear

Clear affects only the **Working** state of the currently selected dataset.

The Last Saved state remains unchanged until Save is pressed.

Therefore:

```text
Clear
→ Working becomes empty/cleared

Reset
→ Working returns to Last Saved
```

### 2.7 Clone

Clone is always initiated from the dataset the user is currently viewing, and the **current dataset is the destination**.

```text
User is viewing Current
Clone
→ Reference is copied into Current Working
```

```text
User is viewing Reference
Clone
→ Current is copied into Reference Working
```

Clone affects Working only. The destination's Last Saved state is not replaced until Save is pressed.

---

## 3. Master Data Page Structure

The page contains these major areas:

```text
Header / Navigation / Status

Reference | Current
View Mode | Edit Mode

Dataset actions
Sizing | Import | Export | Clone | Reset | Clear | Save

Table selector
BOM | WC | Routing | All Tables

Metadata

Master Data table(s)

Footer / Context summary
```

Exact spacing, colors, component shapes, and pixel-level placement are deferred to the UX/UI phase.

---

## 4. Dataset Selector

The user can switch between:

- Reference
- Current

All dataset-scoped actions operate on the currently selected dataset.

This includes:

- View/Edit
- Sizing
- Import
- Export
- Clone destination
- Reset
- Clear
- Save
- Metadata editing
- BOM editing
- WC editing
- Routing editing

---

## 5. View Mode and Edit Mode

### View Mode

View Mode is read-only.

The user may still:

- inspect data
- search data
- navigate tables
- switch datasets
- switch table sections

### Edit Mode

Edit Mode enables spreadsheet-style interaction:

- direct cell editing
- keyboard navigation
- copy/paste
- multi-row selection
- bulk edit by column
- add rows
- delete rows
- reorder rows
- undo/redo Working edits where supported

---

## 6. Metadata

The finalized dataset-level metadata is:

| Field | Meaning / Unit |
|---|---|
| Product Name | Product identity/display name |
| UOM | Product unit of measure |
| Selling Price | THB |
| SG&A | Percentage of Selling Price |
| Dataset Remark | Dataset-level remark |

### Removed metadata

The new Master Data model does **not** include:

- Product Code
- separate Product Description
- Product Note

`Product Code + Product Description` are simplified into one field:

- **Product Name**

### 6.1 Selling Price

Selling Price is stored at dataset level.

Reference and Current may have different Selling Prices.

Current currency scope:

- **THB only**

A currency selector is not required at this stage.

### 6.2 SG&A

SG&A is stored at dataset level as:

- **% of Selling Price**

The user enters the percentage, not a derived THB value.

Example input:

```text
Selling Price: 120.00 THB
SG&A: 8.00 %
```

The exact downstream accounting formula is outside this Master Data specification and will be finalized during calculation review.

### 6.3 Metadata state

Metadata follows the same Working / Last Saved rules as the rest of the selected dataset.

---

## 7. Sizing

The old **Setup** concept is replaced by **Sizing**.

Sizing is the preparation point for both:

- dataset structure
- template generation

### 7.1 Sizing contents

Sizing contains:

#### Metadata

- Product Name
- UOM
- Selling Price (THB)
- SG&A (%)
- Dataset Remark

#### Dataset size

- BOM row count
- WC row count
- Routing row count

#### Actions

- Apply
- Download Template

### 7.2 Metadata synchronization

Sizing does not maintain a second copy of metadata.

The metadata shown in Sizing is the same Working Dataset metadata shown on the Master Data page.

When Sizing opens:

```text
Sizing fields
← preload from selected Working Dataset
```

If the user already entered metadata on Master Data, Sizing starts with those values.

If the user changes metadata in Sizing and presses Apply:

```text
Sizing metadata
→ selected Working Dataset metadata
```

### 7.3 Template

`Download Template` is inside Sizing.

There is no separate Template action in the main Master Data toolbar.

The template is generated from the Sizing context, including:

- current metadata values shown in Sizing
- BOM size
- WC size
- Routing size

The old Reset action inside Setup/Sizing is removed.

Dataset Reset remains a separate dataset-level action and means **restore Last Saved**.

---

## 8. Table Order

The Master Data table order is fixed as:

1. **BOM**
2. **WC**
3. **Routing**

This order applies to:

- table selector
- All Tables mode
- the visual order of sections

Reasoning:

- BOM is the primary material data.
- WC is referenced by Routing.
- Routing is typically the longest table, so it remains last.

---

## 9. Table Schemas

Only the fields below are required.

Fields from the old implementation that are not listed here should not be retained merely for backward UI compatibility.

### 9.1 BOM

```text
# | Name | Usage | Unit | Price | Loss | Note
```

Dataset fields:

- Name
- Usage
- Unit
- Price
- Loss
- Note

`#` is not a dataset field.

### 9.2 Work Center (WC)

```text
# | WC | Labor | Burden | Note
```

Dataset fields:

- WC
- Labor
- Burden
- Note

`#` is not a dataset field.

### 9.3 Routing

```text
# | Process | WC | Manning | Cap | Yield | Note
```

Dataset fields:

- Process
- WC
- Manning
- Cap
- Yield
- Note

`#` is not a dataset field.

---

## 10. Row Number and Row Order

The `#` column is a **display index / row header only**.

It is used to show the user's current row position:

```text
1
2
3
...
```

It is not:

- business identity
- comparison identity
- a persisted business key
- Routing sequence
- part of calculation identity

### 10.1 Reordering

Users can reorder rows manually.

Example:

```text
Before
1  Material A
2  Material B
3  Material C
```

After moving Material C:

```text
1  Material C
2  Material A
3  Material B
```

The displayed row numbers are recalculated automatically.

Reordering is a Working Dataset change and is included in Save/Reset/Export behavior.

However:

> Reordering alone must not make a business record CHANGED in comparison.

### 10.2 Comparison identity

Reference and Current records are matched by business identity, never by row position.

Under the simplified schemas, the intended identity fields are:

- BOM → `Name`
- WC → `WC`
- Routing → `Process`

Example:

```text
Reference
1  Material A
2  Material B
3  Material C

Current
1  Material C
2  Material A
3  Material B
```

Comparison must still pair:

```text
Material A ↔ Material A
Material B ↔ Material B
Material C ↔ Material C
```

not Row 1 ↔ Row 1.

Ambiguous duplicate identity values should be surfaced as data-quality warnings rather than silently matched by row order.

---

## 11. Spreadsheet-Style Table Editing

BOM, WC, and Routing use the same interaction model.

The goal is to reuse familiar Excel behavior where it improves speed and clarity without turning the application into a full spreadsheet product.

### 11.1 Direct editing

In Edit Mode:

- click a cell to activate/edit it
- edit values directly in the grid
- avoid opening a modal for ordinary single-cell edits

### 11.2 Keyboard navigation

Support familiar spreadsheet navigation:

- Arrow Up / Down / Left / Right → move between cells
- Enter → move down
- Shift + Enter → move up
- Tab → move right
- Shift + Tab → move left
- Escape → cancel/exit the current edit state where appropriate

### 11.3 Copy / Paste

Support:

- Ctrl/Cmd + C
- Ctrl/Cmd + V
- copying within the Master Data grid
- pasting tabular data copied from Excel

Pasted values should map by row and column.

Invalid pasted cells should be identified at cell level rather than failing the entire page.

### 11.4 Undo / Redo

Working edits should support familiar undo/redo behavior where practical:

- Ctrl/Cmd + Z → undo
- Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z → redo

Undo/redo applies only to the current Working editing session.

It is **not Save history** and does not create persistent versions.

---

## 12. Row Controls: Selection vs Reorder

Selection and row movement must use **separate interaction targets** so one drag gesture never ambiguously means both "select" and "move".

Use a narrow row-control gutter to the left of the actual data columns:

```text
[drag handle] [#] | dataset columns...
```

These are UI controls, not dataset fields.

### 12.1 Drag handle

The drag-handle area is used only for row reorder.

```text
Drag handle
→ drag-and-drop row movement
```

If multiple rows are selected and the user drags one of the selected rows, the selected group may move together while preserving its internal order.

### 12.2 Row number / row header

The `#` area is used for row selection.

Expected selection behavior:

- click → select one row
- drag across row headers → select a continuous range
- Shift + click → select a range
- Ctrl/Cmd + click → add/remove non-contiguous rows from the selection

The `#` area is not used for reorder.

### 12.3 Data cells

Data cells remain dedicated to spreadsheet interaction:

- edit
- navigate
- copy/paste
- range selection where useful

This prevents row selection/reorder gestures from conflicting with data entry.

---

## 13. Bulk Editing

Bulk editing is based on:

> **Selected rows + edited column**

The user selects one or more rows, then edits a value in a specific column.

The edited value is applied to that same column for every selected row.

Example:

```text
Selected rows:
2
5
8

Edit:
Loss = 5%
```

Result:

```text
Row 2 → Loss = 5%
Row 5 → Loss = 5%
Row 8 → Loss = 5%
```

Other columns remain unchanged.

This behavior applies consistently to:

- BOM
- WC
- Routing

Examples:

```text
BOM
selected rows + Unit = KG
→ Unit changes for selected BOM rows only
```

```text
WC
selected rows + Burden = 12.5
→ Burden changes for selected WC rows only
```

```text
Routing
selected rows + WC = WC-A
→ WC changes for selected Routing rows only
```

A large separate Bulk Edit modal is not required for this core behavior.

---

## 14. Add and Delete

Each table supports:

- Add Row
- Delete selected row(s)

Deleting multiple selected rows is supported.

Exact button placement and visual treatment are part of UX/UI design, not this behavior specification.

---

## 15. Search

Each table has **Search**.

Master Data tables do not require a separate Filter system.

This applies to:

- BOM
- WC
- Routing

In All Tables mode, each table section may search its own dataset.

Search affects presentation only. It does not mutate data.

---

## 16. Validation and Data Quality

Validation should be local and informative rather than blocking the whole page.

Examples:

- invalid numeric values
- invalid percentage values
- missing referenced WC
- ambiguous duplicate identity values

The preferred behavior is:

```text
Detect issue
→ mark relevant cell/row
→ explain issue
→ allow user to continue working
```

Warnings should not fabricate calculation values.

### 16.1 Routing → WC reference

`Routing.WC` should reference values defined in the WC table.

The editing experience should help prevent typos, for example through a dropdown or autocomplete sourced from WC.

The exact visual control is deferred to UX/UI.

---

## 17. Header and Footer Direction

The provided Master Data mockup is accepted as the structural direction for the non-table portions of the page.

The exact visual design will be refined later.

### 17.1 Header

The header is responsible for high-level context such as:

- application/product context
- current product name
- system/workflow status
- primary page navigation

Conceptually:

```text
COST BREAKDOWN | Product | STATUS | Navigation
```

### 17.2 Footer

The footer is responsible for current dataset/result context.

Useful context may include:

- Reference BOM/WC/Routing counts
- Current BOM/WC/Routing counts
- compact calculation/result summary

Exact calculated metrics shown in the footer are deferred until calculation requirements are finalized.

### 17.3 Status principle

Status information should tell the user what is happening and where to review it.

Warnings generally do **not** block navigation.

Examples already agreed in principle:

- Ready for comparison
- Product mismatch
- Missing data
- Selected Comparison Mode

Product mismatch or missing data may direct the user back to Master Data for review, but the workflow remains accessible.

### 17.4 Fixed placement while scrolling

- Keep the selected-dataset toolbar and its product metadata summary together at the top of the Master Data content scroll region.
- Keep the workspace footer at the bottom of the application frame while the main content scrolls.
- These placement rules do not prescribe final colors, typography, spacing, or other visual styling.

---

## 18. Product Mismatch

Reference and Current may contain different Product Names.

If:

```text
Reference Product Name ≠ Current Product Name
```

the system shows a Product Mismatch warning.

This warning does not block navigation.

The application should not silently assume the two datasets represent the same product.

---

# Appendix A — Confirmed Cross-Page Decisions Made During Master Data Review

These decisions affect later pages but were already confirmed during this review.

They should be carried forward when reviewing Cost Breakdown and downstream pages.

## A.1 Selected Comparison Mode

Cost Breakdown will have an optional **Selected Comparison Mode**.

Normal behavior remains Full Comparison.

The user explicitly enters Selected Comparison Mode from Cost Breakdown.

### Selectable areas

Partial selection applies to:

- BOM
- Routing

WC is not partially selected.

WC remains available as the complete supporting calculation context required by Routing.

### Selection rules

For matched findings:

- CHANGED → Reference and Current are one paired finding
- UNCHANGED → Reference and Current are one paired finding

Selecting/excluding one means selecting/excluding the matched pair.

For unmatched findings:

- ADDED → may be selected independently
- REMOVED → may be selected independently

### Temporary state

Selected Comparison Mode is temporary analysis state.

It is:

- not part of Reference Save
- not part of Current Save
- not exported
- not versioned
- not persisted across application restart

It cannot be saved as a dataset state.

### Downstream flow

Once a selected scope is applied, the normal downstream steps continue using that selected analysis scope.

The exact downstream UI will be finalized during later page reviews.

### Exit behavior

The mode can be cancelled.

The status can remain visible across downstream pages, while the user may return to Cost Breakdown to review or exit the mode.

Exact status placement is a UX/UI decision.

### Source-data invalidation

If Reference or Current data actually changes while Selected Comparison Mode is active:

```text
Reference/Current source data changes
→ exit Selected Comparison Mode
→ clear temporary selection
→ return to normal Full Comparison
```

Do not attempt to remap or preserve the old selection.

## 19. Excel Dataset Workbook and Calculation View

The neutral dataset workbook has four data tabs, in this order:

1. `META` — Product Name, UOM, Selling Price (THB), SG&A (%), and Dataset Remark
2. `BOM`
3. `ROUTING`
4. `WORK_CENTER`

`META` contains the product fields and Dataset Remark together. There is no separate Product data tab. A separate `COST_CALCULATION` tab is a formula-linked inspection view; it is not a fifth data tab and does not participate in import.

The calculation view follows the existing application Cost Engine:

```text
Material = Usage × Price × (1 + Loss)
Routing Factor = Manning ÷ (Capacity × Yield)
Labor = Routing Factor × matching Work Center Labor rate
Burden = Routing Factor × matching Work Center Burden rate
Total Standard Cost = Material + Labor + Burden
```

The workbook must link calculation cells to the data tabs so edits recalculate in Excel. Missing or invalid inputs, non-positive Capacity/Yield, and missing or duplicate WC matches leave the relevant result unavailable. Do not silently substitute zero. Zero remains a valid input when it is present.

The historical blank calculation template uses a different BOM Loss expression. Use the current application Cost Engine for the linked view; do not silently change the engine or introduce that older expression.

Selling Price and SG&A remain metadata inputs. Do not add GP, COGS, OP, margin, or monetary SG&A formulas to this Standard Cost view.

---

## A.2 Partial selection does not mutate datasets

Selected Comparison is an **analysis scope**, not a dataset edit.

Unselected BOM or Routing rows are not deleted or removed from Reference/Current.

Full dataset data remains intact.

Calculation logic must not reinterpret "not selected for analysis" as "does not exist in the product".

---

## A.3 General warning principle

Warnings are primarily informational.

Examples include:

- product mismatch
- missing data
- data-quality issues

They should:

1. explain the issue
2. point the user to the relevant place when useful
3. allow navigation to continue unless an operation is logically impossible

If a result cannot be calculated correctly, the UI must show an unavailable/warning state rather than inventing a number.

---

# Appendix B — Explicitly Deferred Items

The following are intentionally **not finalized by this Master Data spec**:

- exact GP / COGS / OP calculation formulas
- exact SG&A accounting treatment beyond input being `% of Selling Price`
- final OP/business dashboard design
- exact footer financial metrics
- exact visual styling, colors, spacing, and component treatment beyond the fixed toolbar/metadata/footer placement in §17.4
- final Cost Breakdown page layout
- final Candidate Prioritization behavior changes
- final RCA & Simulation redesign
- Trial workflow
- final UX wording for states/actions
- exact UI behavior when Reset/Export is invoked before the selected dataset has ever been saved

These should not be invented during implementation unless a later approved specification defines them.
