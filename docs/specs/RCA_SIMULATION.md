# RCA & Simulation Specification

**Status:** Human selection of one Candidate, optional RCA notes, non-mutating Scenario A/B behavior, supported simulation inputs, improvement economics, and Selling Price/SG&A/OP behavior are `FINALIZED — USER DECISION`. [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md) is the latest logic authority; compatible layout, wording, and interaction requirements remain valid. Current presentation choices are reversible AI choices in [`design.md`](../../design.md). Only other business metrics and the Trial lifecycle remain pending as noted below.

## FINALIZED — USER DECISION

The user chooses exactly one Candidate for each RCA; the system never auto-selects the highest Gap. Root Cause and Action are optional real-world notes and do not affect calculations. The user compares independent Scenario A and Scenario B drafts based on full Current, edits supported inputs, and reviews recalculated cost and economics without changing Reference or Current. The user selects the preferred scenario; no numeric ranking automatically chooses it.

## Candidate selection and notes

RCA & Simulation receives Candidates from [Candidate Prioritization](CANDIDATE.md). The user chooses exactly one Candidate for one RCA analysis; multiple Candidates require separate RCA rounds. The system must not automatically select the highest-ranked Candidate. If the Candidate came from scoped Ranking, Selected Scope terminates when the Candidate enters RCA. Candidate origin may remain explanatory context but cannot change the Simulation baseline: both scenarios use the normal full Current dataset.

Root Cause / Why and Action are optional, user-entered real-world notes. They are not required to continue and are not numeric calculation inputs.

## Scenarios and simulation inputs

Provide exactly Scenario A and Scenario B. Each independently begins from full Current; neither begins from the other. An explicit scenario override changes that scenario's input; an unmodified or cleared override uses Current. Simulation is prediction only: it must not mutate Reference, Current, or the other scenario. Standard Cost cannot be entered directly; each scenario recalculates it through the shared engine.

Scenario-editable Standard Cost inputs are BOM Usage, Price, and Loss; Routing/Process Manning, Capacity, and Yield; and Work Center Labor Rate and Burden Rate. Do not add new factory formulas or change the data structure through simulation. Structural simulation is outside scope: do not add/remove Material, BOM, or Routing records and do not create Routing split/merge simulations.

Work Center Labor Rate and Burden Rate are finalized scenario-editable inputs. A rate override is scenario-local calculation context; when it changes the calculated processing cost of a Process, that Process remains the Candidate and the rate change is explanatory dependency context. It does not create a Work Center Candidate. See the [Work Center rate dependency rule](FINAL_LOGIC_SPEC.md#work-center-rate-dependency).

Each scenario recalculates through the same Standard Cost rules in [CROSS_CUTTING.md](CROSS_CUTTING.md#standard-cost-calculation), on a per-piece basis. The user does not type a predicted Standard Cost.

## Improvement economics

The finalized economics inputs are Fixed Investment, Variable Added Cost / pc, and Evaluation Quantity. Fixed and Variable are independent; the user is not required to provide both. When Fixed Investment is spread per piece:

```text
Fixed Equivalent / pc = Fixed Investment / Evaluation Quantity
```

Evaluation Quantity is the chosen horizon for evaluating/spreading economics; it is not inherently one production batch. It must be valid and positive when required to calculate the fixed equivalent.

Any economics cost included in simulated product-cost composition must have its applicable `MAT`, `LB`, or `BD` category. Do not hard-code all Fixed Investment as `BD`; use the category representing its cost treatment. For each category:

```text
Simulated Category
= recalculated engine category
+ applicable categorized economics equivalent / pc
```

Therefore:

```text
Simulated Standard Cost = Simulated MAT + Simulated LB + Simulated BD
```

Avoid double counting: if an economics cost is already represented through a Standard Cost engine input change, do not repeat it through Variable Added Cost. Do not subtract categorized economics again after they are included in Simulated MAT/LB/BD.

Calculate:

```text
Gross Improvement / pc
= Current Standard Cost / pc - Simulated Standard Cost / pc

Total Improvement
= Gross Improvement / pc × Evaluation Quantity
```

## Selling Price, SG&A, and OP

Each scenario may override Selling Price and SG&A%; unmodified values default to Current, and clearing an override returns to Current. SG&A is a percentage of Selling Price:

```text
SG&A amount / pc = Selling Price × SG&A %
OP / pc = Selling Price - Standard Cost - SG&A amount
```

Equivalently, `OP = Selling Price - MAT - LB - BD - SG&A`. OP may be positive, zero, or negative. Negative OP represents a loss; do not clamp it to zero or mark it unavailable merely because it is negative. Use the [finalized business logic](FINAL_LOGIC_SPEC.md); do not add unfinalized GP, margin, sales, or other business formulas.

## Scenario A/B comparison

Scenario A and Scenario B are independent improvement strategies. Compare these monetary values on a compatible per-piece basis:

```text
MAT, LB, BD, Standard Cost, SG&A, OP, Selling Price
```

Make changed inputs available as concise scenario-change/trade-off context; Usage, Material Price, Loss, Manning, Capacity, Yield, Labor Rate, Burden Rate, Fixed Investment, Variable Added Cost / pc, SG&A%, and Selling Price override are not monetary chart series. Human choice determines the preferred scenario; the system must not select the numerically lowest-cost scenario automatically.

## Reference → Current → Simulated result story

After the user selects Scenario A or B, `Simulated` means that human-selected scenario. Compare Reference → Current → Simulated using exactly two adjacent gaps:

```text
Gap 1 = Current - Reference
Gap 2 = Simulated - Current
```

Do not add a required third Simulated-versus-Reference gap. Preserve MAT, LB, BD, Standard Cost, SG&A, OP, and Selling Price visibility for all three states; Standard Cost must not hide its MAT/LB/BD components. Preserve the signed movements, including negative OP. Do not fabricate historical monthly or annual periods from Reference and Current snapshots. The detailed graph rules are in [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md).

## Trial handoff

After reviewing the scenarios, the user may select one scenario to continue to Trial. Selection is human-driven; Candidate ranking or simulation results never automatically choose it. Trial is a separate stage, not part of the core RCA calculation. Trial execution, validation, approval, and promotion remain unspecified.

## PENDING — USER DECISION NEEDED

- Other business metrics such as COGS, GP, GP Margin, OP Margin, Sales, and Volume/Quantity, as scoped in [CROSS_CUTTING.md](CROSS_CUTTING.md#business-analysis-confirmed-direction-and-scope). Selling Price, SG&A, OP, and their formulas are finalized above. MatVAR/LBVAR/BDVAR are removed from scope, not pending.
- Trial execution, validation, approval, and promotion. The human-selected scenario-to-Trial handoff itself is agreed above.

## Human review checkpoint

Final human visual acceptance after implementing the reversible presentation in [`design.md`](../../design.md) has not been recorded. It is a review checkpoint; page layout details do not block implementation.

## Traceability

The original agreement is retained as provenance in [`agreements/RCA_SIMULATION_SPEC.md`](../../agreements/RCA_SIMULATION_SPEC.md). Current product logic follows [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md); Trial execution/approval remain unspecified. The 80-topic crosswalk remains implementation/verification traceability only.
