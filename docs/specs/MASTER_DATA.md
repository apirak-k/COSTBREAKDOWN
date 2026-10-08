# Master Data Specification

**Status:** Core Master Data behavior, dataset shape, and Sizing/workbook behaviors are `FINALIZED — USER DECISION`. The visual principles below are `CONFIRMED DIRECTION — USER DECISION`; presentation choices follow [`design.md`](../../design.md). Product decisions are complete (0 pending).

## Final Target State

Opening a fresh session goes directly to an empty Reference/Current workspace; there is no startup wizard or separate Product selector. The first time the user enters Master Data in a session, the default table view is **All Tables**, displaying BOM → Work Centers → Routing vertically. Users prepare independent datasets in that workspace, with Product Name stored as each dataset's metadata. Each side has a Working copy and one Last Saved copy; Save, Reset, Import, Clear, Clone, and Export act on the side being viewed. Sizing edits that side's metadata and exact row counts, and generates the agreed Excel template. Once both Working datasets have enough information for the intended calculation, they can be compared without saving, exporting, or activating them. The tables are presented in BOM → Work Centers → Routing order, but users may prepare the data in any order that supports the intended calculation. Matching uses business identity rather than row position. The toolbar and metadata stay together at the top of the content area, and the footer stays at the bottom of the app frame. Warnings inform the user without cluttering table rows or blocking normal navigation.

## Purpose and authority

This is the consolidated Master Data behavior from the finalized source specification and later explicit user decisions. Current code is implementation evidence only. Shared comparison and calculation rules are in [CROSS_CUTTING.md](CROSS_CUTTING.md); detailed traceability is in [the 80-topic crosswalk](../../tasks/source-crosswalk-80.md).

## Dataset lifecycle

Reference and Current are independent. Each has one in-session `Working` dataset and one `Last Saved` dataset. State does not persist across application restarts; there is no database, save history, or version history.

- **Save:** replace only the viewed dataset's `Last Saved` state with its `Working` state. A later Save replaces that side's prior saved state.
- **Reset:** restore only the viewed dataset's `Working` state from its `Last Saved` state.
- **Export:** export only the viewed dataset's `Last Saved` state. Unsaved Working edits are not exported.
- **Import:** replace only the viewed dataset's `Working` state. Import does not save it, and does not merge it with that side's existing Working data.
- **Clear:** clear only the viewed dataset's `Working` state, including its metadata, Dataset Remark, table rows, and Sizing values; retain `Last Saved` and leave the other side unchanged.
- **Clone:** always copy the opposite dataset's `Working` state into the viewed dataset's `Working` state, regardless of the source's Prepared/Needs input status. It does not replace `Last Saved`. If the destination already contains data, ask for explicit confirmation before replacing it. After the copy, recalculate the destination's Prepared/Needs input status from the copied Working content rather than copying the source readiness flag; the reversible content-detection detail is recorded as P-010 in [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md).

The two sides remain independent. Comparing uses their current Working states; no Save, export, confirmation, Activate, or version-history step is required first. Closing/restarting the application ends the session and starts with a fresh empty workspace.

## Page structure and metadata

The page supports Reference/Current selection, View/Edit modes, dataset actions, Sizing, BOM/Work Centers/Routing table selection, All Tables, metadata, tables, and a footer/context summary. On the first entry in a session, **All Tables** is the default view. The supplied screenshot sets the whole-page structural direction; its BOM table is an example, not the only supported table.

Keep the selected-dataset toolbar and metadata summary together at the top of the Master Data content scroll region. Keep the application footer at the bottom of the frame while workspace content scrolls. When the user leaves Master Data and returns during the same application/browser session, preserve the selected dataset (Reference/Current), mode (View/Edit), and table view (BOM/Work Centers/Routing/All Tables). This is UI/session state only: it is not dataset/business data, Save history, or persistence across application restart. A fresh application session starts fresh under the session model above. The final colors, typography, spacing, and human visual acceptance are not specified here.

### UX/UI directions

- Keep the Master Data tables compact and dense, reducing unnecessary visual weight and whitespace while retaining readability.
- Use `feature/taste-frontend-ui` only as a visual/design-language reference; do not copy its old behavior. Keep the engineering/industrial console direction.
- Address horizontal-scrollbar and table-alignment issues during the UI pass.
- Remove unnecessary application branding/chrome: `CB`, `Product Cost Analysis`, and the bottom-left `Workspace` label.
- Make Reference and Current total values visible in a useful place. Their exact placement and layout are not finalized.
- Correct the existing footer visual/layout issue during the later UI pass. This direction does not introduce a new footer behavior; the footer behavior and placement above remain the applicable specification.

These are visual/UI directions, not calculation or lifecycle changes, and they are not product-logic blockers.

Dataset metadata is independent for each side:

| Field | Meaning |
|---|---|
| Product Name | Product identity and display name |
| UOM | Unit of measure |
| Selling Price | THB |
| SG&A | Percent of Selling Price |
| Dataset Remark | Dataset-level remark |

Do not add Product Code, a separate Product Description, or Product Note. Reference and Current may have different Product Names; show a non-blocking Product Mismatch warning and do not silently equate them.

## Sizing and templates

The old Setup concept is replaced by **Sizing**. Sizing uses the selected side's same Working metadata; it does not maintain a second metadata copy. It contains Product Name, UOM, Selling Price, SG&A, Dataset Remark, and row counts for BOM, Work Centers, and Routing, plus Apply and Download Template. There is no separate Template action on the main toolbar.

Sizing belongs independently to Reference or Current. On a fresh workspace its row counts are unset; each configured count has a minimum of one. Applying a count sets that table to exactly that many rows. Increasing adds blank rows; decreasing removes rows from the end, including populated rows, and removed data is lost. Direct table additions and deletions keep that section's configured count aligned with its rows; deleting all rows leaves the count unset. Import initializes the viewed side's Sizing counts from the imported row counts. Reference and Current counts remain independent. Applying metadata in Sizing updates the viewed side's Working metadata.

The canonical Master Data workbook contains exactly these sheets, in order:

1. `META`
2. `BOM`
3. `WORK_CENTER`
4. `ROUTING`

There is no `COST_CALCULATION` sheet. `META` uses a label/value layout. Its user inputs are Product Name, UOM, Selling Price, SG&A %, and Dataset Remark. Its formula outputs are MAT, Labor, Burden, Standard Cost, SG&A Amount, and OP. These outputs follow [the shared Standard Cost rules](CROSS_CUTTING.md#standard-cost-calculation); SG&A Amount is Selling Price × SG&A %, and OP is Selling Price − Standard Cost − SG&A Amount. The workbook stores SG&A as the app's percentage points (8 means 8%), so the formula divides the entered value by 100. Negative OP remains valid.

Calculated META cells are Excel formulas with Excel cell Notes describing the formula. If an output's required source inputs are incomplete or invalid, its formula displays blank. An explicitly entered zero remains valid. Import reads only the five META inputs and recalculates results through the application engine; formula outputs are never imported as source values.

The data table schemas are `Name | Usage | Unit | Price | Loss | Note` for BOM, `WC | Labor | Burden | Note` for WORK_CENTER, and `Process | WC | Manning | Cap | Yield | Note` for ROUTING. Their header rows begin on row 3, after a title and a blank row. Download Template uses the selected dataset's Sizing counts to create exactly that number of blank input rows. Dataset Export contains the selected dataset's current rows, including blank Sizing rows; Import preserves those row counts and initializes Sizing to them. Numeric input cells that are blank remain blank. A blank identity shows its placeholder ordinal, counted only among blank identities and independent of the `#` display row number; this ordinal is not a business identity and does not make the row complete.

Workbook labels and table headers use a dark background with bold white text; yellow marks user-editable inputs; light gray marks formula-driven META outputs; unused worksheet cells remain white. Do not add a color legend, instruction prose, example rows, or extra source/system columns. This convention does not apply to editable cells in the web Master Data tables; workbook and web-table styling remain separate.

Record-level `Note` values and dataset-level `META.Dataset Remark` are annotations. Preserve them through web editing and workbook import/export. Neither field is a calculation input or record identity, and a note-only difference does not make a business record `CHANGED`.

## Tables, identity, and editing

Display tables in this order: **BOM → Work Centers → Routing**. All Tables uses the same vertical order.

```text
BOM          # | Name | Usage | Unit | Price | Loss | Note
Work Centers # | WC | Labor | Burden | Note
Routing      # | Process | WC | Manning | Cap | Yield | Note
```

`#` is a display row number and row-selection control, not a dataset field, business identity, calculation input, or Routing sequence. Match by BOM `Name`, Work Center `WC`, and Routing `Process`; never match by row position. Duplicate or ambiguous identity values are data-quality warnings, not a reason to guess.

View Mode is read-only. Edit Mode supports direct cell editing and spreadsheet keyboard navigation:

- Arrow keys move between cells.
- Enter moves down; Shift+Enter moves up.
- Tab moves right; Shift+Tab moves left.
- Escape cancels or exits the current edit state where appropriate.
- Ctrl/Cmd+C and Ctrl/Cmd+V copy and paste, including tabular data copied from Excel; pasted values map by row and column, and invalid pasted cells are identified locally rather than failing the page.
- Ctrl/Cmd+Z undoes; Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z redoes.

Support row and range selection, same-column bulk edits to selected rows, adding rows, deleting one or multiple selected rows, and row reordering. Page-level Undo/Redo spans Working edits across all Master Data tables. Undo/Redo is Working-edit history only, not Save history or dataset-version history, and does not persist across application restart. Keep Undo/Redo controls compact and icon-only; exact placement is a UX/UI detail. These interactions should remain lightweight rather than turn the page into a full spreadsheet application. Search is the only Master Data query control; it changes presentation, not dataset contents.

Keep row selection separate from reordering. `#` stays at the left for row selection. The reorder-only handle is in the rightmost table column, after Actions; selected rows may move together while preserving their order. Reordering changes Working row order but does not make a business record `CHANGED`.

Row-selection gestures are: click a row header to select one row; drag across row headers to select a contiguous range; Shift+click to select a range; and Ctrl/Cmd+click to add or remove a non-contiguous row. Data cells remain dedicated to editing, navigation, copy/paste, and range selection. Selection and reorder use separate controls and gestures.

## Validation and notices

Validation is local and normally non-blocking. Keep invalid-value cues on affected cells. Keep warning prose, per-row issue badges, and warning-count footers out of Master Data tables; show dataset-level notices outside the tables. Routing `WC` references the Work Center table, and its entry control should help prevent typos. Missing or invalid required values make the row MISSING; blank numeric values are never replaced with zero. A MISSING row is not eligible for normal comparison as a complete record, and costs requiring missing values remain unavailable. Only logically impossible operations should be unavailable.

The existing confirmation before Clear and the disabled Reset/Export controls before a selected-side `Last Saved` state are reversible interface choices, not additional user requirements; their current provenance is recorded in [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md). The exact placement of Reference and Current totals and compact Undo/Redo controls, colors, typography, spacing, and status presentation are ordinary visual choices. Follow the confirmed visual direction and record unfinalized implementation choices as provisional; they do not block implementation. Human visual acceptance remains a later review checkpoint.

## Traceability

Primary detailed source: [finalized Master Data source specification](../history/MASTER_DATA_SPEC_2026-10-05.md), [the review context's later decisions](../history/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md), and its §79 latest Master Data addendum. The older [Master Data agreement](../../agreements/MASTER_DATA_FLOW_SPEC.md) remains evidence for compatible flow decisions; its earlier schema, workbook, export, and identity details were superseded by the later Master Data source. The explicit workbook decision on 2026-10-07 supersedes the separate calculation view and finalizes the four-sheet structure and META formulas above.
