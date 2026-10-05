# Cost Breakdown Specification

**Status:** Core comparison, calculation, gap, and Selected Comparison behavior is agreed. Exact page hierarchy and visual acceptance remain open.

## Final Target State

Cost Breakdown starts in Full Comparison. Reference and Current are calculated independently, then compared using business identities and the four applicable statuses. Gap is always Current minus Reference. Material costs are compared by BOM identity; processing uses each side's Routing and Work Center rates, aggregates by Work Center, and exposes Process as drill-down detail. Users can temporarily select BOM/Routing findings for analysis; while that scope is active, every result shows only the selected-scope Gap. Details explain and reconcile to the total without fabricating missing costs.

## Inputs and calculation

Cost Breakdown consumes the Reference and Current Working datasets from [Master Data](MASTER_DATA.md). Different table sizes and structures are valid; calculate each side independently before comparison. Use the shared formulas, identities, missing-input rules, and processing aggregation defined in [CROSS_CUTTING.md](CROSS_CUTTING.md).

The signed cost difference is:

```text
Gap = Current Cost - Reference Cost
```

A positive Gap means Current cost is higher; a negative Gap means it is lower; zero means there is no net cost difference. For an `ADDED` record, the absent Reference-side contribution is zero. For a `REMOVED` record, the absent Current-side contribution is zero. This absent-record rule does not convert a missing required input inside an existing record to zero; such a result remains unavailable.

## Comparison results

Use `UNCHANGED`, `CHANGED`, `ADDED`, and `REMOVED` where applicable, matched by the current Master Data identities. Status and Gap are independent: a `CHANGED` finding can have positive, negative, zero, or unavailable Gap; cost dependencies can change Gap even when that record's own business fields are unchanged. Field differences are details of `CHANGED`, not extra statuses. Do not invent a `REPLACE` status or infer split/merge relationships.

Keep unchanged records available in the normal comparison data and for status filtering. The status filter is multi-select: each status may be selected independently, and visible records are the union of selected statuses. `All` selects all four statuses and is the default; it is a control, not a fifth status.

## Processing and drill-down

Use Routing operations and the Work Center rates on each side to calculate processing cost independently. Aggregate processing by Work Center, then compare the Reference and Current Work Center totals. `WC Net Gap = Current WC processing total - Reference WC processing total`. Routing `Process` remains drill-down detail under Work Center; one-to-one Routing matching is not required to calculate `WC Net Gap`. See [CROSS_CUTTING.md](CROSS_CUTTING.md#processing-cost-and-work-center-comparison).

Provide a result-to-detail path from total Gap to cost category, Work Center/BOM/Routing detail, affected record, and changed fields where available. Detailed effects should reconcile to their parent totals:

```text
Material Gap + Labor Gap + Burden Gap = Total Gap
Changed effects + Added effects + Removed effects = their parent branch Gap
```

If detail cannot reconcile because of missing/invalid calculation data, surface an unavailable or validation state instead of a misleading number.

## Selected Comparison

Full Comparison remains the default. Selected Comparison follows [the shared scope and lifecycle](CROSS_CUTTING.md#full-and-selected-comparison): BOM and Routing findings are selectable; Work Centers remain full calculation context; matched `CHANGED`/`UNCHANGED` findings move as Reference/Current pairs; `ADDED`/`REMOVED` are independently selectable.

Selected Comparison is a temporary analysis scope and does not change or save either source dataset. While it is active, show the selected findings and **only the selected-scope Gap**. Do not show the Full Gap alongside it. Cancellation or an actual Reference/Current source-data change clears the scope and returns to Full Comparison.

## Warnings and presentation boundaries

Warnings normally inform and direct without blocking navigation. Keep comparison statuses separate from validation warnings. Keep the duplicate top calculation-warning banner removed; show the full warning details in a collapsed disclosure labeled `Review warnings (N)`.

The behavior above does not prescribe exact KPI cards, table layout, visual styling, or status wording. Preserve the confirmed result → cause → detail direction without treating a current implementation layout as a requirement.

## Traceability

The core comparison rules are recorded in [`agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md`](../../agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md). The `Gap = Current - Reference` convention and four statuses also appear in the finalized Candidate agreement. The later Selected-only Gap instruction is in the 2026-10-05 addendum of [the review context](../history/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md). The warning-collapse and display decision was recorded in `bd967b5` and `2bf5ec5`. Implementation evidence is separate in [the 80-topic crosswalk](../../tasks/source-crosswalk-80.md).
