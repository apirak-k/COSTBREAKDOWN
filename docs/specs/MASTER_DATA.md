# Master Data Specification

**Status:** Master Data behavior and dataset shape are finalized. UX/UI directions are recorded below; exact styling, placement, and the listed edge details remain open.

## Final Target State

Opening a fresh session goes directly to an empty Reference/Current workspace; there is no startup wizard or separate Product selector. The first time the user enters Master Data in a session, the default table view is **All Tables**, displaying BOM → Work Centers → Routing vertically. Users prepare independent datasets in that workspace, with Product Name stored as each dataset's metadata. Each side has a Working copy and one Last Saved copy; Save, Reset, Import, Clear, Clone, and Export act on the side being viewed. Sizing edits that side's metadata and starting row counts, and generates the agreed Excel template. Once both Working datasets have enough information for the intended calculation, they can be compared without saving, exporting, or activating them. The tables are presented in BOM → Work Centers → Routing order, but users may prepare the data in any order that supports the intended calculation. Matching uses business identity rather than row position. The toolbar and metadata stay together at the top of the content area, and the footer stays at the bottom of the app frame. Warnings inform the user without cluttering table rows or blocking normal navigation.

## Purpose and authority

This is the consolidated Master Data behavior from the finalized source specification and later explicit user decisions. Current code is implementation evidence only. Shared comparison and calculation rules are in [CROSS_CUTTING.md](CROSS_CUTTING.md); detailed traceability is in [the 80-topic crosswalk](../../tasks/source-crosswalk-80.md).

## Dataset lifecycle

Reference and Current are independent. Each has one in-session `Working` dataset and one `Last Saved` dataset. State does not persist across application restarts; there is no database, save history, or version history.

- **Save:** replace only the viewed dataset's `Last Saved` state with its `Working` state. A later Save replaces that side's prior saved state.
- **Reset:** restore only the viewed dataset's `Working` state from its `Last Saved` state.
- **Export:** export only the viewed dataset's `Last Saved` state. Unsaved Working edits are not exported.
- **Import:** replace only the viewed dataset's `Working` state. Import does not save it, and does not merge it with that side's existing Working data.
- **Clear:** clear only the viewed dataset's `Working` state, including its metadata, Dataset Remark, table rows, and Sizing values; retain `Last Saved` and leave the other side unchanged.
- **Clone:** copy the opposite dataset's `Working` state into the viewed dataset's `Working` state. It does not replace `Last Saved`.

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

The old Setup concept is replaced by **Sizing**. Sizing uses the selected side's same Working metadata; it does not maintain a second metadata copy. It contains Product Name, UOM, Selling Price, SG&A, Dataset Remark, and starting row counts for BOM, Work Centers, and Routing, plus Apply and Download Template. There is no separate Template action on the main toolbar.

Sizing belongs independently to Reference or Current. On a fresh workspace its starting row counts are unset; each configured count has a minimum of one. These counts set the starting number of rows, not a maximum-record limit. Decreasing a count may remove surplus unpopulated generated blank slots only; populated records are not implicitly deleted. Applying metadata in Sizing updates the viewed side's Working metadata.

The neutral workbook contains exactly four data sheets, in this order: `META`, `BOM`, `ROUTING`, `WORK_CENTER`. `META` contains Product Name, UOM, Selling Price, SG&A, and Dataset Remark. Keep the formula-linked `COST_CALCULATION` inspection view on a separate sheet; it is not a fifth data sheet and is excluded from import. Its formulas follow [the shared Standard Cost rules](CROSS_CUTTING.md#standard-cost-calculation).

In the Excel template/export presentation, yellow marks editable user-input cells. Formula, calculated, and read-only cells are not yellow. This workbook convention does not apply to editable cells in the web Master Data tables; workbook and web-table styling remain separate.

## Tables, identity, and editing

Display tables in this order: **BOM → Work Centers → Routing**. All Tables uses the same vertical order.

```text
BOM          # | Name | Usage | Unit | Price | Loss | Note
Work Centers # | WC | Labor | Burden | Note
Routing      # | Process | WC | Manning | Cap | Yield | Note
```

`#` is a display row number and row-selection control, not a dataset field, business identity, calculation input, or Routing sequence. Match by BOM `Name`, Work Center `WC`, and Routing `Process`; never match by row position. Duplicate or ambiguous identity values are data-quality warnings, not a reason to guess.

View Mode is read-only. Edit Mode supports direct cell editing; spreadsheet keyboard navigation and copy/paste; row and range selection; page-level Undo/Redo across Working edits from all Master Data tables; same-column bulk edits to selected rows; adding and deleting rows; and row reordering. Undo/Redo is Working-edit history only, not Save history or dataset-version history, and it does not persist across application restart. Keep Undo/Redo controls compact and icon-only; exact placement is a UX/UI detail. These interactions should remain lightweight rather than turn the page into a full spreadsheet application. Search is the only Master Data query control; it changes presentation, not dataset contents.

Keep row selection separate from reordering. `#` stays at the left for row selection. The reorder-only handle is in the rightmost table column, after Actions; selected rows may move together while preserving their order. Reordering changes Working row order but does not make a business record `CHANGED`.

## Validation and notices

Validation is local and normally non-blocking. Keep invalid-value cues on affected cells. Keep warning prose, per-row issue badges, and warning-count footers out of Master Data tables; show dataset-level notices outside the tables. Routing `WC` references the Work Center table, and its entry control should help prevent typos. Missing or invalid values must not produce fabricated calculation results. Only logically impossible operations should be unavailable.

## PENDING/TBD

These narrow details were not finalized in the sources; do not infer them from code:

- Whether Clear requires a confirmation step. The earlier agreement allowed confirmation but did not require it.
- Exact disabled/error presentation for Reset or Export before the selected side has a `Last Saved` state. Their behavior is settled: Reset has no saved state to restore, and Export has no valid saved source.
- Whether Clone is gated by source readiness and how readiness metadata transfers. The copy direction and Working/Last Saved semantics above are finalized.
- Whether importing a dataset preserves, resets, or recalculates its saved Sizing counts.
- Exact placement of the Reference and Current total values and the compact Undo/Redo controls.
- Exact colors, typography, spacing, status wording, and final human visual acceptance.

## Traceability

Primary detailed source: [finalized Master Data source specification](../history/MASTER_DATA_SPEC_2026-10-05.md), [the review context's later decisions](../history/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md), and its §79 latest Master Data addendum. The older [Master Data agreement](../../agreements/MASTER_DATA_FLOW_SPEC.md) remains evidence for compatible flow decisions; its earlier schema, workbook, export, and identity details were superseded by the later Master Data source. The current four-data-sheet workbook and separate calculation view were reaffirmed in the later user decision record.
