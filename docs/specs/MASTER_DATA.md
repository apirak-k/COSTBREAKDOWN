# Master Data Specification

**Status:** Core dataset shape, lifecycle, and table behavior are finalized. The listed `PENDING/TBD` details and human visual acceptance remain open.

## Purpose and authority

This is the canonical specification for the Master Data page. It records agreed user behavior and data shape; current code is evidence to compare against it, not a source of requirements.

Shared save, warning, comparison, and calculation rules are in [CROSS_CUTTING.md](CROSS_CUTTING.md). Per-topic implementation and verification evidence is in [source-crosswalk-80.md](../../tasks/source-crosswalk-80.md).

## Dataset lifecycle

Reference and Current are independent. Each has one in-session `Working` dataset and one `Last Saved` dataset. State is discarded when the application session ends; there is no database or save history.

- **Save:** replace only the viewed dataset's `Last Saved` state with its `Working` state.
- **Reset:** replace only the viewed dataset's `Working` state with its `Last Saved` state.
- **Export:** export only the viewed dataset's `Last Saved` state.
- **Import:** replace only the viewed dataset's `Working` state; it is not saved until the user presses Save.
- **Clear:** clear only the viewed dataset's `Working` state and retain `Last Saved`.
- **Clone:** copy the opposite dataset into the viewed dataset's `Working` state. It does not replace `Last Saved`.

Reset and Export presentation before the first Save are **PENDING/TBD**. Whether Clone is gated by source readiness and how readiness transfers are also **PENDING/TBD**; do not promote the behavior in `862fb60` to a requirement without confirming it in the original source conversation.

## Page structure and metadata

The supplied screenshot describes the hierarchy of the whole page. The BOM table is an example; the page supports BOM, Work Centers, Routing, and All Tables.

Keep the dataset/action toolbar and metadata summary together at the top of the Master Data scroll region. Keep the application footer at the bottom of the frame while the workspace content scrolls. Exact colors, typography, spacing, and final visual acceptance are not specified here.

Dataset metadata:

| Field | Meaning |
|---|---|
| Product Name | Product identity and display name |
| UOM | Product unit of measure |
| Selling Price | THB |
| SG&A | Percent of Selling Price |
| Dataset Remark | Dataset-level remark |

Do not add Product Code, a separate Product Description, or Product Note. Reference and Current metadata remain independent.

Sizing shares the selected dataset's metadata and holds its BOM, Work Center, and Routing row counts. It provides Apply and Download Template. Import behavior for saved sizing counts is **PENDING/TBD**; do not infer a policy from current code.

## Tables and identity

Display tables in this order: **BOM → Work Centers → Routing**.

```text
BOM          # | Name | Usage | Unit | Price | Loss | Note
Work Centers # | WC | Labor | Burden | Note
Routing      # | Process | WC | Manning | Cap | Yield | Note
```

`#` is a display row number, not dataset data, business identity, or Routing sequence. Match records by `BOM.Name`, `WorkCenter.WC`, and `Routing.Process`; never match by row position. Surface ambiguous duplicate identities as data-quality warnings instead of guessing.

## Editing and row controls

View Mode is read-only. Edit Mode supports direct cell editing, keyboard navigation, spreadsheet copy/paste, range and row selection, practical undo/redo of Working edits, same-column bulk edits over selected rows, adding and deleting rows, and row reordering.

Keep row selection separate from reordering: `#` remains on the left for row selection; the reorder-only handle is in the rightmost table column, after Actions. Selected rows may move together while preserving their order. Search is the only Master Data query control; do not add a separate filter.

## Validation and notices

Validation is local and normally non-blocking. Keep invalid-value cues on the affected cells. Keep warning prose, per-row issue badges, and warning-count footers out of Master Data tables; show dataset-level notices outside the tables. Routing `WC` references the Work Center table. Product Name mismatch is a warning and does not block navigation.

## Workbook

Dataset templates and exports have exactly four data sheets, in this order:

1. `META` — Product Name, UOM, Selling Price, SG&A, and Dataset Remark
2. `BOM`
3. `ROUTING`
4. `WORK_CENTER`

Keep the formula-linked `COST_CALCULATION` inspection view on a separate sheet. It is not a fifth data sheet and is excluded from import. Its formulas follow the shared Standard Cost rules in [CROSS_CUTTING.md](CROSS_CUTTING.md).

## Traceability

The user-requested workbook refinement is recorded in commit `5a08907`; the warning-density and rightmost-handle changes are recorded in `bd967b5` and `2bf5ec5`. The 80-topic crosswalk identifies implementation and verification state without changing this specification.
