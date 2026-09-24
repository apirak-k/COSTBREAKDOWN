# RCA & Simulation Specification

**Status:** Finalized concept / behavior specification  
**Scope:** RCA & Simulation page only  
**Audience:** AI coding agent / implementation team  
**UI status:** This document defines behavior, calculation flow, and boundaries. It does **not** prescribe a fixed visual layout.

---

## 1. Purpose

The RCA & Simulation page is the point where the user chooses a candidate from the Candidate Prioritization pool, optionally records the real-world cause and action, and evaluates improvement scenarios.

The page must keep three concepts separate:

```text
Candidate / Factor
= What changed?

Root Cause
= Why did it change?

Action
= What will be done about it?
```

Only measurable simulation inputs are used by the cost calculation.

`Root Cause` and `Action` are explanatory real-world information and are **not** calculation inputs.

---

## 2. Position in the System Flow

```text
Master Data
    ↓
Cost Breakdown / Comparison
    ↓
Candidate Prioritization
    ↓
RCA & Simulation
    ↓
Trial
```

Candidate Prioritization does not select an RCA target.

Candidate selection happens on the RCA & Simulation page.

---

## 3. Candidate Selection

The page must allow the user to choose a candidate from the existing Candidate Prioritization pool.

The selected candidate provides context for the simulation.

The system must not automatically choose the highest-ranked candidate.

```text
Highest Cost Gap
≠
Automatic simulation target
```

Human selection remains required.

---

## 4. Root Cause

The page may provide an optional field such as:

```text
Root Cause / Why?
[................................]
```

Root Cause is:

- optional;
- user-entered real-world information;
- useful for explaining why the factor changed;
- not required to continue;
- not used directly in the cost formula.

The user may leave it blank and continue to Simulation.

---

## 5. Action

The page may provide an optional field such as:

```text
Action
[................................]
```

Action is:

- optional;
- user-entered real-world information;
- useful for recording what the user plans to do in practice;
- not required to continue;
- not used directly as a numeric cost-calculation input.

The user may leave it blank and continue to Simulation.

---

## 6. Scenario Model

The page supports scenario comparison using:

```text
Scenario A
Scenario B
Scenario C
```

Each scenario begins from the Current state.

Conceptually:

```text
Current
    ↓ copy for simulation
Scenario Draft
    ↓
Override measurable parameter values
    ↓
Recalculate
```

A scenario must not mutate the Current working data.

Simulation is prediction only.

---

## 7. Simulation Inputs

Simulation changes measurable parameters that are already supported by the verified project cost logic.

Examples include confirmed inputs such as:

```text
Material
- Price
- Loss
- Usage / Consumption

Processing
- Yield
- Capacity
- Manning / Runtime-related values where supported by the verified formula
- Other already-confirmed measurable inputs used by the Cost Engine
```

The exact editable parameter set should follow the existing verified Cost Engine and data model.

Do not invent new factory formulas or unconfirmed parameter semantics.

---

## 8. No Structural Simulation in Current Scope

The current scope does **not** include Structural Simulation.

Do not add scenario behavior for:

```text
Add Material
Remove Material
Add Routing
Remove Routing
Manual Routing split/merge simulation
```

Structural Simulation is outside the current scope.

---

## 9. Standard Cost Calculation

The simulation must continue to use the project's core Standard Cost model:

```text
Standard Cost / pc
=
Material
+ Labor
+ Burden
```

The primary calculation basis is cost per piece.

The user does not manually enter a Predicted Standard Cost.

Instead:

```text
Scenario parameter overrides
        ↓
Existing Cost Engine
        ↓
Scenario Standard Cost / pc
```

The same verified calculation logic used by the main system should be reused for simulation.

---

## 10. Current vs Scenario

Each scenario should show the difference between Current and simulated results.

Core result:

```text
Current Standard Cost / pc
Scenario Standard Cost / pc
Gross Saving / pc
```

Use:

```text
Gross Saving / pc
=
Current Standard Cost / pc
-
Scenario Standard Cost / pc
```

Interpretation:

```text
Positive Gross Saving
→ Scenario cost is lower than Current

Negative Gross Saving
→ Scenario cost is higher than Current
```

---

## 11. Improvement Economics

The existing improvement-economics concept should remain available.

Each scenario may include:

```text
Fixed Investment
Variable Added Cost / pc
Evaluation Volume / Lot Size
```

These values evaluate whether the improvement is economically worthwhile.

### 11.1 Fixed Cost Equivalent

```text
Fixed Cost Equivalent / pc
=
Fixed Investment
/
Evaluation Volume
```

### 11.2 Net Benefit per Piece

```text
Net Benefit / pc
=
Gross Saving / pc
-
Variable Added Cost / pc
-
Fixed Cost Equivalent / pc
```

### 11.3 Total Gross Saving

```text
Total Gross Saving
=
Gross Saving / pc
×
Evaluation Volume
```

### 11.4 Total Variable Added Cost

```text
Total Variable Added Cost
=
Variable Added Cost / pc
×
Evaluation Volume
```

### 11.5 Total Net Benefit

```text
Total Net Benefit
=
Total Gross Saving
-
Total Variable Added Cost
-
Fixed Investment
```

These economic values do not redefine the Standard Cost formula.

They evaluate the economics of achieving the simulated improvement.

---

## 12. Example

```text
CURRENT

Standard Cost = 100.00 THB/pc
Yield         = 88%
Capacity      = 500
```

Scenario A:

```text
Root Cause:
Machine setting unstable              [optional]

Action:
Standardize machine setting           [optional]

Simulation Overrides:
Yield       88% → 93%
Capacity    500 → 550
```

Cost Engine result:

```text
Current Standard Cost     = 100.00 THB/pc
Scenario Standard Cost    = 95.00 THB/pc

Gross Saving
= 100.00 - 95.00
= 5.00 THB/pc
```

Improvement economics:

```text
Fixed Investment          = 20,000 THB
Variable Added Cost       = 0.50 THB/pc
Evaluation Volume         = 10,000 pcs

Fixed Cost Equivalent
= 20,000 / 10,000
= 2.00 THB/pc

Net Benefit / pc
= 5.00 - 0.50 - 2.00
= 2.50 THB/pc

Total Net Benefit
= (5.00 × 10,000)
  - (0.50 × 10,000)
  - 20,000
= 25,000 THB
```

---

## 13. Scenario Comparison

The system should allow the user to compare Scenario A / B / C.

Each scenario may have different:

```text
Parameter overrides
Fixed Investment
Variable Added Cost / pc
Evaluation Volume
```

The system calculates the resulting Standard Cost and improvement economics independently for each scenario.

No scenario is automatically selected as the correct solution.

Human review remains required.

---

## 14. Scenario Selection for Trial

After reviewing the scenarios, the user may choose one scenario to continue to the Trial stage.

Conceptually:

```text
Scenario A
Scenario B
Scenario C
    ↓
Human Review
    ↓
Choose Scenario for Trial
    ↓
Trial
```

Trial is a separate stage and should not be merged into the core RCA & Simulation workflow.

---

## 15. Additional Financial Parameters — Future Extension

The project may later add a separate financial-analysis layer with parameters such as:

```text
Sale
COGS
Gross Profit
SG&A
OP
Margin
Subcontract
Other financial parameters
```

This concept should be preserved for future work.

However:

- it is **not part of the current RCA & Simulation implementation scope**;
- it must not change the current Standard Cost formula;
- it should not be implemented until its formulas and business definitions are explicitly agreed.

Current implementation work should focus on the core cost simulation and improvement economics first.

---

## 16. What This Page Must Not Do

The RCA & Simulation page must not:

```text
Require Root Cause before Simulation
Require Action before Simulation
Use Root Cause text as a numeric formula input
Use Action text as a numeric formula input
Allow the user to manually type Predicted Standard Cost
Mutate Current working data during What-If
Automatically select the highest-ranked Candidate
Implement Structural Simulation
Add/Remove BOM or Routing records in Scenario
Invent unverified factory formulas
Implement Additional Financial Parameters yet
```

---

## 17. Final Baseline

```text
RCA & SIMULATION

Select Candidate
        ↓
Root Cause / Why?   [optional]
Action              [optional]
        ↓
Scenario A / B / C
        ↓
Override measurable parameters
        ↓
Existing Cost Engine
        ↓
Scenario Standard Cost / pc
        ↓
Current vs Scenario
        ↓
Gross Saving / pc
        ↓
Fixed Investment
Variable Added Cost / pc
Evaluation Volume
        ↓
Net Benefit / pc
Total Net Benefit
        ↓
Human selects Scenario
        ↓
Trial
```

Core rules:

1. Root Cause and Action are optional real-world notes.
2. Root Cause and Action are not calculation inputs.
3. Simulation starts from Current.
4. Simulation modifies measurable parameters only.
5. Current data must not be mutated.
6. Standard Cost remains `Material + Labor + Burden`.
7. Standard Cost is calculated on a per-piece basis.
8. Gross Saving comes from Current Standard Cost versus Scenario Standard Cost.
9. Fixed Investment, Added Cost, and Volume are used to evaluate improvement economics.
10. Structural Simulation is not included in the current scope.
11. Additional Financial Parameters are preserved as a future extension only.
12. Human judgment is required when choosing the scenario that proceeds to Trial.

This is the finalized behavioral baseline for the RCA & Simulation page.
