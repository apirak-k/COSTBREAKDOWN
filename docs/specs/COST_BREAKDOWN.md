# Cost Breakdown Specification

**Status:** Only the decisions below are closed. Page redesign details remain open.

## Confirmed behavior

- Full Comparison is the default.
- In Selected Comparison, show only the selected-scope Gap; never show the Full Gap beside it.
- Selected scope and its lifecycle follow [CROSS_CUTTING.md](CROSS_CUTTING.md).
- Use the shared Standard Cost and missing-input rules in [CROSS_CUTTING.md](CROSS_CUTTING.md).
- Keep warning detail collapsed by default behind `Review warnings (N)` and remove the duplicate top warning banner.

## PENDING/TBD

- Gap arithmetic/sign convention pending source-conversation confirmation.
- Exact page hierarchy, KPI summary, comparison-detail presentation, filters, and downstream visual treatment remain open for UX and behavior review.
- Business/P&L formulas, margins, monetary SG&A, variance terms, and dashboard charts are not defined by this spec.

## Traceability

The selected-only Gap is an explicit user decision; the selected-scope implementation history is in `872e02e` and `07ba640`. The warning presentation decision is recorded in `bd967b5` and `2bf5ec5`. Implementation and verification evidence is tracked in [the 80-topic crosswalk](../../tasks/source-crosswalk-80.md).
