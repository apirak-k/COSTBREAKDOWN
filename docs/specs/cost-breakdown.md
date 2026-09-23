# Cost Breakdown Page Specification

## Status

- Concept status: **Approved in discussion**
- Document status: **Approved concept / implementation pending**
- Reviewed: 2026-09-22
- Requirements alignment update: 2026-09-23
- Scope: Cost Breakdown page only.
- This document does not define Master Data import, Simulation, or the future financial-calculation extension.

## 1. Purpose

Cost Breakdown is the read-oriented analysis page for explaining the difference between two valid datasets for the same Product:

```text
Reference Dataset  →  Reference calculation
Current Dataset    →  Current calculation
                         ↓
                  Compare all data
                         ↓
                  Show cost gaps and changes
```

The page must explain what changed, where it changed, how the change affects cost, and which source supports the displayed values.

## 2. Core Cost Structure

The core cost structure is a standard, stable structure and is not user-configurable on this page:

- Material
- Labor
- Burden

The page must not provide actions to add or remove these core cost elements during normal use. The system may support a future change to the standard through a reviewed specification change, but the user must not accidentally redefine the core comparison model from the page.

Additional financial items or scenario variables such as Sale, COGS, Gross Profit, SG&A, OP, Profit, Packaging, Energy, or other add-ons are outside the Core Cost Breakdown contract. They may consume Cost Breakdown results from a separate Calculation or Simulation capability.

## 3. Scope

### In scope

- Displaying the selected Product and the Reference/Current context.
- Validating that both datasets belong to the same Product before comparison.
- Calculating Reference and Current independently.
- Comparing all supported data in both datasets.
- Showing all data and a separate Changed Only view.
- Showing Before/After values, Gap, status, and source information.
- Comparing Material, Labor, Burden, BOM, Routing, and Work Center impacts.
- Showing structural changes such as added, removed, reordered, or moved Routing operations.
- Showing Missing, Invalid, Warning, Ambiguous, and Need Review conditions.
- Tracing Routing cost through the Work Center data used by the same dataset.
- Reconciliation from detailed rows back to cost-element and total gaps.

### Out of scope

- Importing or editing Excel files.
- Creating, cloning, or modifying the source datasets.
- Adding or removing Core Cost Elements at runtime.
- Defining Sale, COGS, Gross Profit, SG&A, OP, or Profit formulas.
- Creating or editing Simulation scenarios.
- RCA, Candidate Selection, and Trial workflows.
- Export behavior for this phase.

## 4. Input Contract

The page consumes two prepared datasets:

| Input | Requirement |
|---|---|
| Product | Reference and Current must identify the same Product Code. |
| Reference | Complete dataset used as the comparison baseline. |
| Current | Complete dataset used as the comparison subject. |
| Provenance | Each displayed value or group of values has source/evidence metadata where available. |
| Data quality | Missing or invalid values remain visibly marked. |

A Product mismatch is a blocking comparison error. The primary Product Code check occurs during Master Data import, but Cost Breakdown must also refuse to present a valid comparison when the two selected datasets do not identify the same Product.

## 5. Calculation Contract

1. Calculate Reference independently from the Reference dataset.
2. Calculate Current independently from the Current dataset.
3. Calculate the exact gap as:

```text
Current − Reference
```

4. Calculate Material, Labor, and Burden as separate core elements.
5. Calculate Routing using the Work Center rates belonging to the same dataset.
6. Do not use a hidden fallback value for a missing or invalid input.
7. Affected rows or metrics must show `N/A`, `Missing`, `Invalid`, or `Need Review` rather than a fabricated verified-looking number.
8. Unaffected rows may continue to calculate, but the aggregate result must carry a visible review status when required inputs are unavailable.
9. Detailed results must reconcile to their parent cost element and total wherever the required inputs are valid.

## 6. Comparison Contract

The comparison must cover all supported fields and records in the two datasets. It must not silently limit comparison to only the fields currently shown in the first UI version.

“All supported” means every field and record represented by the current Product Dataset contract, including supported additional data. A field that is retained but not yet mapped to calculation or comparison must remain visible as `Needs Review`; it must not be silently discarded or treated as a verified zero.

### Comparison statuses

- `Unchanged` — the matched value/record is equivalent.
- `Modified` — the matched record exists on both sides but one or more supported fields differ.
- `Added` — present in Current but absent from Reference.
- `Removed` — present in Reference but absent from Current.
- `Reordered` — the same operation exists but its sequence/order changed.
- `Moved Work Center` — the same operation exists but its Work Center reference changed.
- `Need Review` — identity, data quality, or mapping is ambiguous.

Data-quality states such as `Missing`, `Invalid`, and `Warning` are separate from comparison statuses. A row can be `Modified` and also have a `Warning`.

### Matching principles

- BOM should prefer a stable item/material code; duplicate or missing identity requires review.
- Routing should prefer a stable operation ID or process code.
- Sequence is an order attribute, not the sole Routing identity.
- Work Center is a calculation dependency and reporting dimension, not the sole identity of a Routing operation.
- Ambiguous records must remain visible and must not be silently merged.

## 7. Page Views

The page must provide two complementary views:

### All Data

Shows the complete Reference/Current comparison, including unchanged records. This is the audit view and must not hide records merely because they have no cost gap.

### Changed Only

Shows only records with a comparison status other than `Unchanged`, plus records that require data-quality review.

Both views must preserve access to:

- Reference value
- Current value
- Gap
- Comparison status
- Data-quality status
- Source group and detailed source location

## 8. Source and Provenance Display

Source information should be clear without repeating identical text in every row.

### Source grouping

- Normalize identical source identities into one Source Group.
- Show the Source Group once with a record count.
- Allow the user to expand the group to inspect row/field-level locations.
- Keep Reference and Current source groups visually distinct, even if both point to the same underlying document.
- A detailed source location may include file/document, sheet, row, range, effective date, or source reference as available.

Example presentation:

```text
Reference
  Cost Declare v1 · BOM sheet · 16 records
  Cost Declare v1 · Routing sheet · 39 records

Current
  Cost Declare v2 · BOM sheet · 17 records
  Cost Declare v2 · Routing sheet · 40 records
```

### Bulk operations

- Cost Breakdown may provide bulk grouping, filtering, expanding, and review actions for records sharing a Source Group.
- Bulk assignment or correction of source metadata belongs to the data-preparation workflow and must not change cost values from this read-oriented page.
- If source metadata editing is later exposed in a shared workflow, assigning one Source Group to multiple selected records must be explicit, reversible, and recorded as metadata only.

## 9. Routing and Work Center Impact

Routing and Work Center must remain linked for calculation and explanation:

- Reference Routing uses Reference Work Center data.
- Current Routing uses Current Work Center data.
- A Routing parameter change is distinct from a Work Center rate change.
- A Routing operation moving to another Work Center is shown as a structural/relationship change.
- A missing, duplicate, or unknown Work Center reference is a visible review finding.
- Work Center aggregate impacts must not be added on top of the same operation impacts a second time.

## 10. UI Requirements

The page must show:

- Selected Product and comparison context.
- Reference and Current dataset identity.
- Reference cost, Current cost, and exact Gap.
- Material, Labor, and Burden cost-element bridge.
- All Data / Changed Only view control.
- Comparison status and data-quality status.
- Work Center, BOM, and Routing drill-down.
- Grouped Source information with expandable detail.
- Reconciliation status and warnings.

The page must not present Simulation controls as if they were official Reference or Current values.

## 11. Acceptance Criteria

- [ ] Reference and Current are calculated independently.
- [ ] A comparison is blocked when the two datasets have different Product Codes.
- [ ] Material, Labor, and Burden remain the stable Core Cost Elements.
- [ ] Users cannot add or remove Core Cost Elements from the Cost Breakdown page.
- [ ] All supported records and fields are compared, including structural changes.
- [ ] The page has both All Data and Changed Only views.
- [ ] Unchanged, Modified, Added, Removed, Reordered, Moved Work Center, and Need Review states are distinguishable.
- [ ] Missing or invalid inputs are visible and are not silently converted into verified-looking zero values.
- [ ] Reference and Current values can be traced to grouped source information.
- [ ] Source groups avoid repeated display text while preserving row/field-level detail.
- [ ] Routing resolves Work Center data from the same dataset side.
- [ ] Work Center and Routing impacts are not double-counted.
- [ ] Detailed results reconcile to valid parent cost elements and totals.
- [ ] Sale, COGS, Gross Profit, SG&A, OP, Profit, and Simulation add-ons are not mixed into the Core Cost Breakdown contract.
- [ ] Export is not required for this phase.

## 12. Current Baseline and Gaps

The current implementation is transitional and must be migrated toward this contract. The Snapshot comparison path now covers the main handoff, comparison-view, provenance, routing-linkage, status-vocabulary, and no-silent-zero slices; the legacy paired-model path remains during migration:

- The page currently consumes both legacy paired `costBreakdown` data and newer `snapshotComparison` data in `src/features/cost-breakdown/CostBreakdownPage.tsx:20-42`.
- The cost-element bridge is currently hard-coded to Material, Labor, and Burden in `src/features/cost-breakdown/components/SnapshotComparisonCard.tsx:72-75`. These remain the intended Core Cost Elements; the required change is to keep them clearly separated from future extension layers, not to make the core user-editable.
- The old engine hard-codes Labor Rate Variance and Burden Rate Variance to zero in `src/core/calculations/cost-engine.ts:61-65`.
- The legacy rate resolver still returns a zero rate for missing Work Centers in `src/core/calculations/work-center-rate.ts`; this remains transitional and must not be used as the Snapshot comparison fallback.
- Snapshot calculation now preserves missing or invalid numeric values as unavailable (`null` / `—`) while adding warnings in `src/core/calculations/snapshot-cost.ts`, `src/core/calculations/snapshot-bom-detail.ts`, and `src/core/calculations/snapshot-routing-detail.ts`.
- Snapshot comparison now discovers supported record fields dynamically in `src/core/calculations/snapshot-comparison.ts`; identity and provenance metadata (`id`, `confidence`, `sourceRef`) remain excluded from working-value change status. The detailed UI still renders the canonical fields explicitly, so any future field added to the dataset contract must also receive a visible detail-column or review surface.
- Duplicate Work Center identities are kept as `Need Review`/unavailable dependencies rather than silently selecting one rate.
- Comparison workbook generation is available in `src/services/excel/comparison-export.ts` and has a focused verifier in `scripts/verify_comparison_export.ts`; the active `src/features/cost-breakdown/CostBreakdownPage.tsx` currently exposes no Export Comparison action. Adding an export control is explicitly deferred from this target scope.

## 13. Related Documents

- `docs/REQUIREMENTS_INDEX.md` — document authority, shared vocabulary, and cross-page decisions.
- `docs/specs/master-data.md` — source dataset preparation and import rules.
- `docs/specs/cross-cutting-requirements.md` — financial and extensibility requirements outside the Core Cost Breakdown contract.
- `COSTBREAKDOWN_SYSTEM_LOGIC_SOURCE_OF_TRUTH.md` — existing calculation, comparison, and lifecycle logic reference.
- `COSTBREAKDOWN_REDESIGN_REVIEW.md` — current-state redesign analysis and migration gaps.
