# Candidate Prioritization Specification

**Status:** Page redesign and detailed behavior are not closed. Do not promote the existing page implementation to requirements.

## Confirmed shared behavior

- When Selected Comparison is active, carry that selected analysis scope into Candidate Prioritization, as defined in [CROSS_CUTTING.md](CROSS_CUTTING.md).
- Preserve calculation integrity and unavailable results according to the shared Standard Cost rules.

## PENDING/TBD

- Candidate groups, ranking inputs and ordering, controllability behavior, selection flow, detail layout, and page redesign require source-backed page review.
- Exact behavior for candidate status, zero-gap candidates, and missing attribution inputs is not specified here.

## Traceability

Selected-scope propagation is recorded in `07ba640` and `862fb60`; the 80-topic ledger records the prior end-to-end verification status. That evidence does not close the remaining Candidate design decisions.
