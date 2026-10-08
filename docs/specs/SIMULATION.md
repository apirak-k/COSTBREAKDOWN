# Simulation Specification (Parameter & Economic)

**Status:** Simulation behavior across Parameter Simulation and Economic Simulation is `FINALIZED — USER DECISION`. The visual presentation follows [`design.md`](../../design.md) and [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md).

## Final Target State

Simulation is a single module comprising two distinct, interoperable dimensions:

```text
SIMULATION
├─ Parameter Simulation (What-if engineering cost simulation)
└─ Economic Simulation  (Investment threshold & break-even evaluation)
```

The user may engage with Simulation in three valid modes:
1. **Parameter Simulation only**
2. **Economic Simulation only**
3. **Parameter + Economic Simulation combined**

Simulation does not permanently alter Master Data. It provides an interactive sandbox for evaluating engineering and financial feasibility.

---

## 1. Parameter Simulation Logic

### 1.1 Purpose
Parameter Simulation answers: *“If these parameters had these values, what would the resulting product cost be?”*

It provides live what-if analysis against operational baselines. It does not claim to predict reality, but calculates the deterministic effect of entered assumptions through the shared cost engine.

### 1.2 Start SIM From
Parameter Simulation may start from any canonical dataset:
- **`Reference`**
- **`Current`**
- **`Custom`**

When launched from an RCA Case, the starting dataset naturally defaults to `Current`, but the engineer may select `Reference` or `Custom`. The selected dataset is copied into temporary, isolated SIM working memory. Simulation changes **never** mutate Master Data datasets.

### 1.3 Structure Is Strictly Locked
Once a dataset enters Simulation:
> **Structure and size are locked.**

Simulation cannot:
- Add records,
- Delete records,
- Resize table row counts,
- Perform structural split/merge operations.

If structural changes are required (e.g. adding a new manufacturing process or substituting a raw material):
$$\text{Master Data} \longrightarrow \text{Custom} \longrightarrow \text{Edit structure / Sizing} \longrightarrow \text{Start SIM From Custom}$$

### 1.4 Primary Comparison Basis: Current vs SIM
Regardless of whether SIM started from Reference, Current, or Custom, the primary comparison basis in Parameter Simulation is:

$$\text{Current} \longleftrightarrow \text{SIM}$$

$$\text{Saving / pc} = \text{Current Standard Cost} - \text{SIM Standard Cost}$$

$$\text{Gap / pc} = \text{SIM Standard Cost} - \text{Current Standard Cost}$$

This ensures that proposed alternative structures (prepared in Custom) are consistently evaluated against present operational reality (Current).

### 1.5 Record Status and Editability Matrix

When comparing Current vs SIM, records exhibit standard comparison statuses. Editability is governed by presence in the SIM dataset:

| Status in Current vs SIM | Visible in SIM | Selectable / Parameter-Editable | Reason |
|---|---|---|---|
| `CHANGED` | Yes | **Yes** | Record exists in SIM |
| `UNCHANGED` | Yes | **Yes** | Record exists in SIM; editing values makes it CHANGED |
| `ADDED` | Yes | **Yes** | Record exists in SIM (introduced via Custom) |
| `REMOVED` | Yes | **No** | Record does not exist in SIM; affects Gap only |

*Important:* `REMOVED` records must remain visible in comparison tables because their removal affects total cost movement and Gap. However, because they do not exist in the SIM dataset, their parameters cannot be edited.

### 1.6 Factors to Simulate
In large industrial datasets, exposing every row simultaneously causes cognitive clutter.
- The engineer may select multiple **Factors to Simulate** (e.g. `Process A`, `Process F`, `Material Steel`).
- **Selected Factors control editing controls visibility, NOT calculation scope.**
- When any input is edited, the **entire SIM dataset recalculates** through the shared cost engine.

### 1.7 Finalized SIM-Editable Parameters
The parameters editable in Parameter Simulation are strictly:

**BOM:**
- `Price` (THB)
- `Usage / Consumption`
- `Loss` (%)

**Routing:**
- `Manning`
- `Capacity`
- `Yield` (%)

#### Work Center Rates are NOT SIM-Editable
Work Center `Labor Rate` and `Burden Rate` are essential cost inputs in the broader cost model, but in the finalized Simulation scope:
- `Labor Rate`: **NOT editable in SIM**
- `Burden Rate`: **NOT editable in SIM**

If rate changes need to be tested, the engineer updates them in **Master Data** (typically in `Custom`) and starts Simulation from that dataset.

### 1.8 Live Recalculation
Parameter Simulation recalculates live upon every input change:
$$\text{Parameter edits} \longrightarrow \text{Shared Cost Engine} \longrightarrow \text{SIM MAT / LB / BD} \longrightarrow \text{SIM Standard Cost} \longrightarrow \text{Saving vs Current}$$

---

## 2. Economic Simulation Logic

### 2.1 Purpose
Economic Simulation is the second dimension within Simulation. It answers:
*“Given the Action Cost and Evaluation Quantity, how much saving per piece is required to break even?”*

### 2.2 Core Inputs
1. **Action Cost:** Total implementation, tooling, JIG, or capital investment cost (THB).
2. **Evaluation Quantity:** Evaluation volume / batch size over which the action is evaluated (pieces).

### 2.3 Core Calculation
$$\text{Required Saving / pc} = \frac{\text{Action Cost}}{\text{Evaluation Quantity}}$$

### 2.4 Separation from Standard Cost
- Economic Simulation does **not** duplicate parameter editing. There is no "Economic Manning" or "Economic Price".
- **Action Cost is NOT folded into Standard Cost:** Do not allocate Action Cost into MAT, LB, BD, or Standard Cost.
- Standard Cost (product unit cost) and Economic evaluation (investment threshold) are **two separate dimensions**.

### 2.5 Economic-Only Analysis
Economic Simulation can be performed completely independently without parameter changes.
*Example:* An investment of 100,000 THB evaluated over 100,000 pcs yields a $\text{Required Saving} = 1.00\text{ THB/pc}$. The engineer knows the hurdle rate before determining how to achieve it.

---

## 3. Combined Evaluation (Parameter + Economic)

When both dimensions are utilized together, the system compares outputs:

$$\text{Parameter Saving / pc} = \text{Current Standard Cost} - \text{SIM Standard Cost}$$

$$\text{Required Saving / pc} = \frac{\text{Action Cost}}{\text{Evaluation Quantity}}$$

$$\text{Economic Margin} = \text{Parameter Saving / pc} - \text{Required Saving / pc}$$

### Feasibility Interpretation
- If $\text{Economic Margin} \ge 0$: Proposed parameter savings exceed the break-even threshold.
- If $\text{Economic Margin} < 0$: Proposed parameter savings fall short of the break-even threshold.

### Advisory Outcome (Not an Approval Gate)
The economic outcome is **strictly advisory**:
- A scenario with negative Economic Margin (below break-even) remains completely visible, valid, and selectable.
- The system informs; the human engineer decides.

### Avoid Double-Counting
If a cost effect is already modeled in Parameter Simulation (e.g. Manning reduced from 2 to 1), do not re-enter that labor reduction as an Action Cost. Different effects may coexist (e.g. JIG purchase cost entered in Economic Simulation, Manning reduction entered in Parameter Simulation).

---

## 4. Selling Price, SG&A, and OP

Compatible finalized business formulas are preserved:

$$\text{SG&A amount / pc} = \text{Selling Price} \times \text{SG\&A \%}$$

$$\text{OP / pc} = \text{Selling Price} - \text{Standard Cost} - \text{SG&A amount}$$

- Selling Price and SG&A % can be overridden in simulation scenarios.
- **Negative OP is valid:** Represents an operating loss. Must remain clearly displayed without being clamped or marked unavailable.

---

## 5. Scenario Count Flexibility

The product **does not mandate exactly Scenario A and Scenario B**.
The application may support:
- Single scenario simulation,
- A/B comparison,
- Multiple scenarios,

as appropriate for the UI. Exact A/B is not a mandatory business constraint.

---

## 6. Trial Lifecycle Boundary

No special Trial lifecycle (such as `Scenario → Trial → Approve → Promote`) is required:
- `Custom` in Master Data may be used to store and maintain real trial data.
- If trial data in Custom is decided to become the new operational Current baseline, the user navigates to Master Data, views `Current`, and selects `Clone From Custom`.

---

## 7. Concrete Worked Examples

### 7.1 Parameter Simulation with Live Recalculation
```text
Current Baseline:
  Routing: QA-Check (Manning=2, Cap=100, Yield=95%)
  Current Standard Cost = 10.00 THB/pc

Start SIM From Current:
  User selects QA-Check as Factor to Simulate.
  Updates Manning: 2 → 1.
  Recalculation:
  SIM Standard Cost = 7.00 THB/pc.
  Parameter Saving  = 3.00 THB/pc.
```

### 7.2 Custom Structural Difference in SIM
```text
Current Routing: [Cut, Form]
Custom Routing:  [Cut, Form, Polish]

Start SIM From Custom:
Current vs SIM Comparison:
- Cut:    UNCHANGED (editable in SIM)
- Form:   UNCHANGED (editable in SIM)
- Polish: ADDED     (editable in SIM)
```

### 7.3 Economic-Only Evaluation
```text
Inputs:
  Action Cost = 100,000 THB
  Evaluation Quantity = 100,000 pcs

Output:
  Required Saving / pc = 100,000 / 100,000 = 1.00 THB/pc
```

### 7.4 Parameter + Economic Combined
```text
Parameter Simulation:
  Parameter Saving = 1.50 THB/pc

Economic Simulation:
  Action Cost = 100,000 THB
  Evaluation Quantity = 100,000 pcs
  Required Saving = 1.00 THB/pc

Combined Evaluation:
  Parameter Saving: 1.50 THB/pc
  Required Saving:  1.00 THB/pc
  Economic Margin:  +0.50 THB/pc (Feasible / Exceeds break-even)
```

---

## 8. Traceability

The original exploratory agreement was [`agreements/RCA_SIMULATION_SPEC.md`](../../agreements/RCA_SIMULATION_SPEC.md). The separation of Parameter Simulation and Economic Simulation, Start SIM From Ref/Cur/Custom, locked structure, editable parameter scope, and non-folding of Action Cost into Standard Cost are finalized in [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md).
