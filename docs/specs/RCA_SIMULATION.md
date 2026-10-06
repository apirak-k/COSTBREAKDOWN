# RCA & Simulation Specification

**Status:** Human candidate selection, optional RCA notes, and non-mutating Scenario A/B/C behavior are `FINALIZED — USER DECISION`. Business-input overrides are a `CONFIRMED DIRECTION — USER DECISION`. Current page presentation choices are reversible AI choices in [`design.md`](../../design.md); business formulas and Trial workflow remain genuinely pending.

## FINALIZED — USER DECISION

The user chooses a candidate from the Candidate pool; the system never auto-selects the highest Gap. Root Cause and Action are optional real-world notes and do not affect calculations. The user compares independent Scenario A/B/C drafts made from Current, overrides only supported measurable inputs, and reviews each scenario's recalculated Standard Cost and savings/economics without changing Reference or Current. The user decides whether to hand a scenario to Trial; Trial execution and approval are a separate, not-yet-specified workflow.

## Candidate selection and notes

RCA & Simulation receives the candidate pool from [Candidate Prioritization](CANDIDATE.md), including the active Selected Comparison scope when one is in use. The user chooses a candidate here. The system must not automatically select the highest-ranked candidate.

Root Cause / Why and Action are optional, user-entered real-world notes. They are not required to continue and are not numeric calculation inputs.

## Scenarios and simulation inputs

Provide Scenario A, Scenario B, and Scenario C. Each begins from the Current state as an independent simulation draft. An explicit scenario override changes that scenario's measurable input; an unmodified/cleared input uses the Current value. Simulation is prediction only: it must not mutate Current or Reference.

Only override measurable parameters supported by the agreed Standard Cost engine, such as BOM Usage, Price, Loss, and Routing Manning, Capacity, or Yield. Do not add new factory formulas or change the data structure through simulation. Structural simulation is outside scope: do not add/remove Material, BOM, or Routing records and do not create Routing split/merge simulations.

The named BOM and Routing inputs above are grounded in the finalized user decisions. The source records do not explicitly finalize Work Center Labor Rate or Burden Rate as scenario-editable inputs. Their current exposure is a `PROVISIONAL — AI CHOICE`: they are measurable inputs to the existing Cost Engine, so the current implementation permits scenario-local rate changes while keeping the established formulas and source-dataset immutability. This choice is reversible and must not be represented as a user-finalized input set; see [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md).

Each scenario recalculates through the same Standard Cost rules in [CROSS_CUTTING.md](CROSS_CUTTING.md#standard-cost-calculation), on a per-piece basis. The user does not type a predicted Standard Cost.

## Current versus scenario result

Show Current Standard Cost / pc and the scenario Standard Cost / pc. Calculate:

```text
Gross Saving / pc = Current Standard Cost / pc - Scenario Standard Cost / pc
```

A positive Gross Saving means the scenario costs less than Current; a negative value means it costs more. Calculate each scenario independently and do not automatically mark one as the correct solution.

## Improvement economics

Improvement economics evaluate whether achieving a scenario is worthwhile; they do not redefine Standard Cost. A scenario may include Fixed Investment, Variable Added Cost / pc, and Evaluation Volume / Lot Size:

```text
Fixed Cost Equivalent / pc = Fixed Investment / Evaluation Volume
Net Benefit / pc = Gross Saving / pc - Variable Added Cost / pc - Fixed Cost Equivalent / pc
Total Gross Saving = Gross Saving / pc × Evaluation Volume
Total Variable Added Cost = Variable Added Cost / pc × Evaluation Volume
Total Net Benefit = Total Gross Saving - Total Variable Added Cost - Fixed Investment
```

## Business-input simulation direction

A later confirmed direction allows future scenarios to override business assumptions such as Selling Price and SG&A percent without mutating dataset values. Each defaults to Current; clearing the override returns to Current. This is separate from the Standard Cost formula and must not be used to invent financial formulas. The exact UI and calculation layer await the explicit business-formula review documented in [CROSS_CUTTING.md](CROSS_CUTTING.md#business-analysis-confirmed-direction-and-scope).

## Trial handoff

After reviewing scenarios, the user may select one scenario to continue to Trial. Selection is human-driven; Candidate ranking or simulation results never automatically choose it. Trial is a separate stage, not part of the core RCA calculation.

## PENDING — USER DECISION NEEDED

- Business formulas and chart behavior listed in [CROSS_CUTTING.md](CROSS_CUTTING.md#business-analysis-confirmed-direction-and-scope). MatVAR/LBVAR/BDVAR are explicitly removed from scope, not pending.
- Trial execution, validation, approval, and promotion. The scenario-to-Trial handoff itself is agreed above.

## Human review checkpoint

Final human visual acceptance after implementing the reversible presentation in [`design.md`](../../design.md) has not been recorded. It is a review checkpoint; page layout details do not block implementation.

## Traceability

The finalized behavior source is [`agreements/RCA_SIMULATION_SPEC.md`](../../agreements/RCA_SIMULATION_SPEC.md). The dated review context confirms later behavior/scope boundaries, including scenario business-input override direction and that Trial execution/approval remain unspecified. The 80-topic crosswalk remains implementation/verification traceability only.
