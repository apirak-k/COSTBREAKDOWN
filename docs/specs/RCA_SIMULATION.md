# RCA & Simulation Specification

**Status:** Page redesign and detailed behavior are not closed. Do not promote the existing page implementation to requirements.

## Confirmed shared behavior

- When Selected Comparison is active, carry that selected analysis scope into RCA & Simulation, as defined in [CROSS_CUTTING.md](CROSS_CUTTING.md).
- Any Standard Cost result uses the shared calculation rules and must preserve unavailable states for missing or invalid inputs.

## PENDING/TBD

- Candidate-to-RCA handoff, problem statement, Root Cause and Action fields, scenario inputs and overrides, scenario state, and exact recalculation behavior require source-backed page review.
- Business/P&L formulas, structural simulation, Trial execution, validation, approval, and promotion are not specified here.
- Exact RCA & Simulation layout and visual styling remain open for review.

## Traceability

Selected-scope propagation is recorded in `07ba640` and `862fb60`. The prior context describes other RCA/Simulation behavior as current baseline only; it is not promoted here without source confirmation. See [the 80-topic crosswalk](../../tasks/source-crosswalk-80.md).
