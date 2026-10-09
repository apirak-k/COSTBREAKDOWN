# COSTBREAKDOWN — Final Logic Specification & Implementation Checklist

**Status:** FINALIZED LOGIC — USER DECISION
**Date:** 2026-10-08
**Scope:** Canonical business logic, calculations, comparison behavior, analysis scope, page-to-page flow, simulation logic, economics logic, graph/data logic, examples, edge cases, and acceptance checklist.
**Not a visual redesign specification.**

---

## 0. Purpose, Authority, and Precedence

This document is the consolidated **logic-only source of truth** for the COSTBREAKDOWN application, establishing the latest user-finalized business logic.

It is intended to be usable directly by Codex or another implementation/review agent for:

- implementation audit,
- regression review,
- implementation planning,
- code changes,
- test planning,
- and logic verification.

### 0.1 Logic-only authority

This document finalizes **logic and behavior only**.

Existing finalized or accepted behavior outside this logic scope remains valid when it does not conflict with this document, including:

- UX/UI structure,
- visual style and engineering-console direction under `design.md`,
- component styling,
- wording and label typography,
- navigation presentation,
- interaction details,
- spreadsheet table editing behavior,
- keyboard navigation,
- compact/dense engineering-console direction,
- reversible implementation choices in `docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md`,
- and other previously finalized page behavior.

Do **not** interpret this document as permission to redesign the application.

### 0.2 Conflict rule

Use this precedence rule:

1. The latest explicit logic decision in this document wins for the specific behavior it changes.
2. Existing finalized behavior remains valid if it does not conflict.
3. A conflict supersedes only the conflicting behavior; it does not invalidate the entire older specification.
4. Existing code is implementation evidence, not a requirement source.
5. Do not infer additional formulas, identities, lifecycle rules, or workflow states that are not defined here or preserved by a non-conflicting finalized source.

### 0.3 Important supersessions introduced by this final logic review

This document explicitly supersedes older behavior in the following areas:

- **Master Data supports Reference, Current, and Custom:** `Custom` is a free dataset workspace with no hard-coded semantic meaning (not locked to Trial, Simulation, Proposal, or Future).
- **Master Data owns structural changes:** Adding, removing, resizing, or altering dataset structure belongs in Master Data / Custom, not in Simulation.
- **Clone action semantics:** The active dataset is the destination; the user selects the source dataset. No special promotion workflow.
- **Cost Breakdown (CBD) remains Reference vs Current only:** Custom is not a direct CBD comparison state.
- **Selected Comparison is analysis scope/view only:** It is neither a new dataset nor an RCA Case.
- **One RCA Case supports 1 or Many Candidates:** One real-world root cause may explain multiple comparison findings (e.g., QA1 REMOVED, QA1.1 ADDED, QA1.2 ADDED can be analyzed in one RCA Case).
- **RCA ends at Root Cause + Action:** RCA does not require mandatory Simulation, Trial, or approval.
- **No new RCA Note system:** Existing Master Data Note/Remark behavior remains separate; do not create duplicate RCA Note/Candidate Note workflows.
- **Simulation is one module with two dimensions:** Parameter Simulation and Economic Simulation. They may be used independently or combined.
- **Start SIM From Reference, Current, or Custom:** Current is a natural default when entering from an RCA Case, but is not the only valid starting baseline.
- **SIM structure is locked:** Once a dataset enters Simulation, rows cannot be added, removed, or resized. Structural changes must be prepared in Master Data / Custom first.
- **Parameter Simulation comparison basis is Current vs SIM:** Editability depends on record status: CHANGED, UNCHANGED, and ADDED are visible and editable; REMOVED remains visible (affecting comparison) but is not editable.
- **"Factors to Simulate" / "Selected Factors":** The user selects which factors to edit. Selected Factors control UI editing visibility, NOT calculation scope; the entire SIM dataset recalculates.
- **SIM-editable parameters are finalized:** BOM (Price, Usage/Consumption, Loss) and Routing (Manning, Capacity, Yield). Work Center Labor Rate and Burden Rate are NOT SIM-editable (change them in Master Data / Custom).
- **Scenario count is flexible:** Exactly Scenario A and Scenario B is not a mandatory business requirement.
- **Economic Simulation uses Action Cost and Evaluation Quantity:** Core formula is `Required Saving / pc = Action Cost / Evaluation Quantity`. It does not contain a duplicate parameter editor.
- **Economics is separate from Standard Cost:** Action Cost must NOT automatically alter MAT, LB, BD, or Standard Cost.
- **Economic result is advisory:** A scenario below break-even remains visible and selectable. The system informs; the engineer decides.
- **No special Trial lifecycle:** Custom may hold trial data if the user wants; to use it as Current, open Current, choose `Clone`, and select Custom.
- **MatVAR, LBVAR, and BDVAR remain out of scope.**

---

# 1. End-to-End Product Flow

The finalized product flow is:

```text
MASTER DATA
    ├─ Reference
    ├─ Current
    └─ Custom (Free workspace for structural edits, alternatives, trial data)
          │
          ▼
         CBD (Reference vs Current)
          ├─ Full Comparison
          └─ Selected Comparison (temporary analysis scope)
                  │
                  ▼
         Candidate / Ranking
                  │
                  ▼
         Select 1 or Many Candidates
                  │
                  ▼
              RCA Case
                  ├─ Root Cause / Why?
                  ├─ Action
                  └─ END RCA (RCA is complete here)

────────────────── OPTIONAL ──────────────────

              SIMULATION
    ┌─────────────┬─────────────┐
    ▼                           ▼
PARAMETER SIMULATION        ECONOMIC SIMULATION
  ├─ Start From Ref/Cur/Custom ├─ Action Cost
  ├─ Structure locked          ├─ Evaluation Quantity
  ├─ Select Factors to edit    └─ Required Saving / pc
  ├─ Live full-dataset recalc        │
  └─ Current vs SIM comparison       ▼
            │               If both are used:
            └───────────────► Parameter Saving / pc vs Required Saving / pc
                              (Economic Margin)
```

### 1.1 Core page responsibilities

| Area | Question it answers | Core Responsibility |
|---|---|---|
| Master Data | “What data state do I have?” | Prepare Reference, Current, and Custom snapshots; own structural edits and Sizing; generic Clone. |
| CBD | “What is different between Reference and Current?” | Compare Reference vs Current; show Standard Cost gaps by MAT/LB/BD/Conversion; support Full and Selected Comparison views. |
| Candidate / Ranking | “Which differences matter?” | Prioritize findings based on record-level Gap and controllability; advisory ranking. |
| RCA | “Why did it happen and what action should be taken?” | Group 1 or many Candidates into an RCA Case; record Root Cause / Why? and Action; optional handoff to Simulation. |
| Parameter Simulation | “If these parameters had these values, what would the cost become?” | Temporary what-if analysis; locked structure; live recalculation of full SIM dataset against Current. |
| Economic Simulation | “How much must the action save per piece to break even?” | Calculate `Required Saving / pc = Action Cost / Evaluation Quantity`; evaluate economic feasibility without altering Standard Cost. |

---

# 2. Shared Data Model and Calculation Rules

## 2.1 Canonical Dataset Shape

Reference, Current, and Custom use the exact same canonical dataset shape:

```text
META
BOM
WORK_CENTER
ROUTING
```

All calculations share one canonical cost engine. Do not create competing calculation engines.

## 2.2 Business Identity

Comparable records are matched strictly by business identity:

```text
BOM         → Name
WORK_CENTER → WC
ROUTING     → Process
```

The display `#` column is an ordinal row number and selection control, not an identity.

Never match by:
- row position,
- visual row number,
- array index,
- display order,
- legacy Operation Code or Sequence,
- guessed positional correspondence.

Duplicate identities introduced through Master Data edits are deterministically suffixed to keep effective identities unique and produce a review warning. Duplicates that remain in imported or legacy data produce data-quality warnings; the system must never guess a match.

## 2.3 Comparison Statuses

Only four comparison statuses exist:

```text
UNCHANGED
CHANGED
ADDED
REMOVED
```

Rules:
- Record exists on both sides with equivalent values → `UNCHANGED`.
- Record exists on both sides with differing values → `CHANGED`.
- Record exists only on the right/new side → `ADDED`.
- Record exists only on the left/old side → `REMOVED`.

Do not create statuses such as `MODIFIED`, `REPLACE`, or `NEED REVIEW`.

### Status and Gap are independent
- A record can be `CHANGED` with positive, negative, zero, or unavailable Gap.
- A Process can be `CHANGED` solely because of a Work Center rate dependency even if its own Routing inputs are unchanged.

### Work Center rate dependency
Work Center is never a Candidate. The processing Candidate identity is always `Process / Routing`; Work Center is the rate owner and calculation/aggregation context.

## 2.4 Gap Convention

Always use:

```text
Gap = Current - Reference
```

(Or in Simulation: `Gap = SIM - Current` / `Saving = Current - SIM`).

For absent sides:
- `ADDED` → Reference contribution = 0 (record does not exist in Reference).
- `REMOVED` → Current contribution = 0 (record does not exist in Current).

This absent-record zero is **not** the same as missing data.

## 2.5 Standard Cost Engine

### Material
Per BOM row:

$$\text{Material Cost} = \text{Usage} \times \text{Price} \times (1 + \text{Loss})$$

$$\text{Direct Material} = \sum \text{BOM Material Costs}$$

### Routing Factor
Per Routing row:

$$\text{Routing Factor} = \frac{\text{Manning}}{\text{Capacity} \times \text{Yield}}$$

### Labor
$$\text{Labor} = \text{Routing Factor} \times \text{Work Center Labor Rate}$$

### Burden
$$\text{Burden} = \text{Routing Factor} \times \text{Work Center Burden Rate}$$

### Conversion
$$\text{Conversion} = \text{Labor} + \text{Burden}$$

### Standard Cost
$$\text{Standard Cost} = \text{Direct Material} + \text{Labor} + \text{Burden} = \text{Direct Material} + \text{Conversion}$$

Do not double-count Conversion.

## 2.6 Missing / Invalid Required Inputs

A missing or invalid required input makes the affected calculated output **unavailable**.
- Do not silently substitute `0`.
- Do not guess or substitute a plausible default.
- An explicit numeric `0` remains valid where mathematically and logically permitted (e.g. Price = 0, Loss = 0).

## 2.7 Reconciliation Rules

- Sum of BOM material costs must reconcile to Direct Material total.
- Sum of Routing labor and burden costs must reconcile to Labor and Burden totals.
- $\text{Direct Material} + \text{Labor} + \text{Burden} = \text{Standard Cost}$.
- Record-level gaps must reconcile to total Gap.

---

# 3. Master Data Logic

## 3.1 Datasets and Workspaces

Master Data contains three independent datasets:

```text
Reference | Current | Custom
```

- **Reference:** Business reference state used by CBD.
- **Current:** Current operational state used by CBD.
- **Custom:** Free dataset workspace with **no hard-coded semantic meaning**.
  - May be used for proposed future states, sizing experiments, trial data, or structural preparations before Simulation.
  - Must not be forced to mean Trial, Simulation, Approved, or Proposal.

Each dataset has:
- In-session `Working` state.
- In-session `Last Saved` state.
- State does not persist across application restarts; closing the session resets the workspace.

## 3.2 Dataset Actions

- **Save:** Copies viewed dataset's `Working` state into its `Last Saved` state.
- **Reset:** Restores viewed dataset's `Working` state from its `Last Saved` state.
- **Export:** Exports viewed dataset's `Last Saved` state to Excel. Unsaved Working edits are not exported.
- **Import:** Replaces viewed dataset's `Working` state. Initializes Sizing counts from imported rows.
- **Clear:** Clears viewed dataset's `Working` state (metadata, rows, Sizing) while retaining `Last Saved`.
- **Clone:** Generic dataset copy.
  - Active viewed dataset = Destination.
  - User chooses Source dataset (`Reference`, `Current`, or `Custom`).
  - Destination readiness is recalculated from copied content.
  - Selecting the source performs the copy without a second replacement confirmation.
  - Never mutates `Last Saved`.
  - No special promotion workflow (to use Custom as Current, open Current, choose `Clone`, and select Custom).

## 3.3 Master Data Owns Structural Changes

All structural changes belong in Master Data:
- Adding rows,
- Deleting rows,
- Sizing table row counts,
- Reordering rows.

Custom is the recommended workspace when the user wants to experiment with structural differences without mutating Reference or Current.

## 3.4 Sizing and Templates

- Sizing configures starting row counts for BOM, Work Centers, and Routing (minimum 1 each).
- Applying a count sets that table to exactly that many rows:
  - Increasing adds blank rows.
  - Decreasing truncates from the end (removed data is lost).
- Download Template generates the canonical Excel workbook matching configured Sizing counts.

## 3.5 Workbook Format

Canonical 4-sheet workbook:
1. `META`: Inputs (Product Name, UOM, Selling Price, SG&A %, Dataset Remark); Formulas (MAT, Labor, Burden, Standard Cost, SG&A Amount, OP).
2. `BOM`: `Name | Usage | Unit | Price | Loss | Note`
3. `WORK_CENTER`: `WC | Labor | Burden | Note`
4. `ROUTING`: `Process | WC | Manning | Cap | Yield | Note`

Styling rules:
- Dark background with bold white text for headers.
- Yellow marks user-editable input cells.
- Light gray marks formula-driven META cells.
- Unused cells remain white.
- Web UI styling and Excel workbook styling remain separate.

## 3.6 Spreadsheet Editing and Keyboard Navigation

- View Mode is read-only; Edit Mode allows direct cell editing.
- Keyboard navigation: Arrow keys, Enter / Shift+Enter (down/up), Tab / Shift+Tab (right/left), Escape (cancel).
- Copy / Paste: TSV and multi-cell spreadsheet paste supported.
- Undo / Redo: Page-level history covering Working edits across all tables.
- `#` is left-pinned display number and row-selection handle.
- Reorder handle is in the rightmost column after Actions.

---

# 4. Cost Breakdown (CBD) Logic

## 4.1 Purpose and Comparison Scope

CBD answers: *“What changed between Reference and Current, and where does the Standard Cost gap come from?”*

CBD compares strictly:

$$\text{Reference} \longleftrightarrow \text{Current}$$

Custom is **never** a direct comparison state in CBD. To compare Custom, clone it into Reference or Current first.

## 4.2 Full Comparison vs Selected Comparison

- **Full Comparison:** Evaluates all eligible BOM and Routing records.
- **Selected Comparison:** Temporary analysis scope/view of selected BOM and Routing findings.
  - Retains complete Work Center rates for calculation context.
  - Selected Gap includes only selected items.
  - It is **not** a new dataset, **not** a persistent state, and **not** an RCA Case.
  - Does not mutate source datasets.
  - Clearing scope or changing source datasets restores Full Comparison.

## 4.3 Candidate Boundary

Selected Comparison may constrain the pool of findings shown on Candidate / Ranking. However, Selected Comparison does not lock or dictate what happens in RCA or Simulation.

---

# 5. Candidate Prioritization and RCA Logic

## 5.1 Candidate Pool and Advisory Ranking

- Candidate findings derive from CBD (Full or Selected scope).
- BOM Candidates represent material records with record-level Gap and changed input details. No unsupported per-factor THB attribution is fabricated.
- Processing Candidates represent `Process / Routing` records.
- Work Center is never a Candidate.
- Controllable starts `true` by default; unchecking does not hide the candidate.
- Ranking by Gap descending (highest to lowest) is **advisory only**. The system must never auto-select rank #1 or force top-rank selection.

## 5.2 RCA Case Supports 1 or Many Candidates

One RCA Case may contain:
- **1 Candidate**, or
- **Multiple Candidates**.

*Rationale:* A single real-world structural or engineering change often manifests as multiple comparison findings (e.g. replacing a single old process with two specialized operations).

### Multi-Candidate Example
```text
Reference:
  Process QA1

Current:
  Process QA1.1
  Process QA1.2

CBD findings:
  QA1   → REMOVED
  QA1.1 → ADDED
  QA1.2 → ADDED

RCA Case:
  Candidates: [QA1, QA1.1, QA1.2]
  Root Cause / Why?: Reorganized quality inspection line into two specialized stages.
  Action: Optimize cycle times across QA1.1 and QA1.2.
```

## 5.3 Root Cause / Why? and Action

- Root Cause and Action are recorded at the **RCA Case** level.
- Do not require duplicate Root Cause / Action fields for every individual Candidate in the same case.
- No new RCA Note system is created. Existing Master Data Note/Remark annotations remain separate.

## 5.4 RCA Ends at Root Cause + Action

RCA is complete when the engineer has identified:
$$\text{Candidate(s)} + \text{Root Cause / Why?} + \text{Action}$$

- Simulation is **optional**.
- Trial execution is **not required**.
- Approval/promotion is **not required**.
- The business workflow can legitimately end here.

## 5.5 RCA to Simulation Relationship

If the user chooses to open Simulation from an RCA Case:
- The RCA Case provides **context**, not a hard scope constraint.
- Default starting dataset naturally defaults to `Current` (when analyzing a Ref-vs-Cur RCA Case), but the user can change it.
- Relevant factors may be highlighted/preselected, but the engineer **must be allowed to select additional factors**.

---

# 6. Simulation Logic

Simulation is one module containing two dimensions:

```text
SIMULATION
├─ Parameter Simulation
└─ Economic Simulation
```

Usage modes:
1. **Parameter only**
2. **Economic only**
3. **Parameter + Economic combined**

## 6.1 Parameter Simulation

Parameter Simulation answers: *“If these parameters had these values, what would the resulting cost be?”*

### Start SIM From
Simulation may start from:
- `Reference`
- `Current`
- `Custom`

The chosen dataset is copied into a temporary, isolated SIM working state. SIM changes never silently mutate Master Data.

### Structure Is Locked
Once a dataset enters Simulation:
- **Structure and size are strictly locked.**
- SIM cannot add records, remove records, resize tables, or split/merge rows.
- If structural changes are required:
  $$\text{Master Data} \rightarrow \text{Custom} \rightarrow \text{Structural edits} \rightarrow \text{Start SIM From Custom}$$

### Comparison Basis: Current vs SIM
Primary comparison in Parameter Simulation is always:

$$\text{Current} \longleftrightarrow \text{SIM}$$

Even if SIM started from Reference or Custom, comparing against Current allows evaluating the proposed state against the present operational baseline.

### Record Editability Matrix in SIM

| Status in Current vs SIM | Visible in SIM | Selectable / Editable in SIM | Reason |
|---|---|---|---|
| `CHANGED` | Yes | Yes | Record exists in SIM |
| `UNCHANGED` | Yes | Yes | Record exists in SIM; editing makes it CHANGED |
| `ADDED` | Yes | Yes | Record exists in SIM (introduced via Custom) |
| `REMOVED` | Yes | **No** | Record does not exist in SIM; affects Gap only |

### Factors to Simulate
- The user may select multiple **Factors to Simulate** (e.g. Process A, Material X).
- Selected Factors control **editing controls visibility**, NOT calculation scope.
- When an input changes, the **full SIM dataset recalculates** through the shared cost engine.

### Finalized SIM-Editable Parameters
- **BOM:** `Price` (THB), `Usage / Consumption`, `Loss` (%)
- **Routing:** `Manning`, `Capacity`, `Yield` (%)
- **Work Center Rates:** `Labor Rate` and `Burden Rate` are rates owned by Master Data and are **NOT SIM-editable** (modify them in Master Data / Custom).
- **Zero Structural Edits:** Simulation contains zero structural editing capabilities (cannot add/delete rows or change row counts). Master Data Sizing owns all structural changes.
- **Selling Price and SG&A % Placement:** Selling Price and SG&A % are economic/commercial parameters and may be overridden in Scenario metadata (see Section 7), NOT as BOM or Routing parameter factor inputs. They determine SG&A Amount and OP, and do not alter Standard Cost (MAT, LB, BD).

### Live Recalculation
Parameter edits immediately update:
$$\text{SIM MAT / LB / BD / Conversion} \longrightarrow \text{SIM Standard Cost} \longrightarrow \text{Saving vs Current} (\text{Current} - \text{SIM})$$

## 6.2 Economic Simulation

Economic Simulation answers: *“Given the Action Cost and Evaluation Quantity, how much saving per piece is required to break even?”*

### Inputs
1. **Action Cost:** Total implementation / capital cost (THB).
2. **Evaluation Quantity:** Evaluation volume / batch (pieces).

### Core Formula
$$\text{Required Saving / pc} = \frac{\text{Action Cost}}{\text{Evaluation Quantity}}$$

### Principles
- Economic Simulation does **not** contain a duplicate parameter editor.
- **Action Cost is NOT folded into Standard Cost:** Do not allocate Action Cost into MAT, LB, BD, or Standard Cost.
- Standard Cost (engineering/physics) and Economic threshold (financial feasibility) are **two separate dimensions**.

## 6.3 Combined Evaluation (Parameter + Economic)

When both dimensions are used together, the system compares outputs:

$$\text{Parameter Saving / pc} = \text{Current Standard Cost} - \text{SIM Standard Cost}$$

$$\text{Required Saving / pc} = \frac{\text{Action Cost}}{\text{Evaluation Quantity}}$$

$$\text{Economic Margin} = \text{Parameter Saving / pc} - \text{Required Saving / pc}$$

- If $\text{Economic Margin} \ge 0$: Scenario exceeds break-even threshold.
- If $\text{Economic Margin} < 0$: Scenario is below break-even threshold.

### Advisory Outcome
The economic result is **advisory / informational**, NOT an approval gate.
- A scenario below break-even remains completely visible and selectable.
- The system informs; the engineer decides.

### Avoid Double-Counting
If a cost effect is already modeled in Parameter Simulation (e.g. Manning 2 → 3), do not enter that same labor cost again as Action Cost.

## 6.4 Scenario Count Flexibility
Exact Scenario A and Scenario B is **not a mandatory business requirement**. The system may support single scenarios, A/B comparisons, or multiple scenarios without being constrained to a fixed pair.

---

# 7. Business Outputs (Selling Price, SG&A, OP)

Preserve compatible finalized business formulas:

$$\text{SG&A amount / pc} = \text{Selling Price} \times \text{SG\&A \%}$$

$$\text{OP (Operating Profit) / pc} = \text{Selling Price} - \text{Standard Cost} - \text{SG\&A amount}$$

- **Negative OP is valid:** Represents an operating loss. Must remain clearly displayed and never clamped or converted to unavailable.
- Selling Price and SG&A % may be overridden in simulation scenarios.
- Other financial metrics (COGS, GP, GP Margin, Volume history, MatVAR, LBVAR, BDVAR) remain out of current scope.

---

# 8. Worked Concrete Examples

### Example 1: Master Data Clone
1. Engineer opens `Custom`.
2. Chooses `Clone` and selects Current as the source. Current dataset is copied into Custom.
3. In Custom, engineer deletes process `Welding` and adds process `Laser Cutting`.
4. If this configuration is later approved for operations: Engineer opens `Current`, chooses `Clone`, and selects Custom as the source.

### Example 2: CBD Comparison Findings
```text
Reference           Current            Status      Gap
MAT-Steel (10 THB)  MAT-Steel (12 THB) CHANGED     +2.00 THB/pc
MAT-Bolt (1 THB)    MAT-Bolt (1 THB)   UNCHANGED    0.00 THB/pc
—                   MAT-Gasket         ADDED       +0.50 THB/pc
MAT-Washer          —                  REMOVED     -0.20 THB/pc
```

### Example 3: Multi-Candidate RCA
```text
Comparison finds:
- QA1: REMOVED (Reference 5 THB)
- QA1.1: ADDED (Current 2.5 THB)
- QA1.2: ADDED (Current 3.0 THB)

RCA Case created with all three findings:
Root Cause: Line rebalancing split inspection into mechanical (QA1.1) and optical (QA1.2).
Action: Benchmark cycle time of optical inspection.
```

### Example 4: Parameter Simulation with Live Recalculation
```text
Current:
  Routing: Assembly (Manning=2, Cap=100, Yield=95%) → Standard Cost = 10.00 THB/pc

Start SIM From Current:
  User selects Assembly as Factor to Simulate.
  Edits Manning: 2 → 1.
  Live calculation recalculates entire SIM dataset:
  SIM Standard Cost = 7.00 THB/pc.
  Parameter Saving = 3.00 THB/pc.
```

### Example 5: Custom Structural Difference in SIM
```text
Current Routing: [Cut, Form]
Custom Routing:  [Cut, Form, Polish]

Start SIM From Custom:
Current vs SIM comparison:
- Cut: UNCHANGED (editable in SIM)
- Form: UNCHANGED (editable in SIM)
- Polish: ADDED (editable in SIM)
```
If Custom omitted `Form`:
- `Form`: REMOVED (visible in comparison table, affects Gap, but disabled from editing in SIM).

### Example 6: Economic-Only Evaluation
```text
Action Cost = 100,000 THB
Evaluation Quantity = 100,000 pcs

Required Saving = 100,000 / 100,000 = 1.00 THB/pc.
(No parameter changes or BOM edits required).
```

### Example 7: Combined Parameter + Economic Evaluation
```text
Parameter Simulation:
  Current Standard Cost = 10.00 THB/pc
  SIM Standard Cost     = 8.50 THB/pc
  Parameter Saving      = 1.50 THB/pc

Economic Simulation:
  JIG Action Cost     = 100,000 THB
  Evaluation Quantity = 100,000 pcs
  Required Saving     = 1.00 THB/pc

Combined Result:
  Parameter Saving: 1.50 THB/pc
  Required Saving:  1.00 THB/pc
  Economic Margin:  +0.50 THB/pc (Above break-even threshold)
```

---

# 9. Edge Cases and Integrity Rules

## 9.1 Data Quality and Matching
- **Duplicate Identity:** Master Data edits auto-rename new duplicate business identities with the next available suffix and report the change as a warning. If duplicate identities remain in imported or legacy snapshots, warn and mark affected matching unavailable. Never guess by row position.
- **Missing Required Input:** If Usage, Price, Manning, Capacity, or Yield is missing, mark cost unavailable. Never replace with zero.
- **Explicit Zero:** An explicit zero is valid where logically permitted (e.g. Loss = 0).

## 9.2 CBD Integrity
- Different row counts between Reference and Current are normal.
- `ADDED` and `REMOVED` rows correctly calculate against an absent-side zero.
- Selected Comparison must never mutate the underlying Reference or Current datasets.

## 9.3 RCA Integrity
- An RCA Case can hold 1 Candidate or many Candidates.
- Ranking is advisory; rank #1 is never forced.
- RCA completion does not depend on Simulation or Trial.

## 9.4 Simulation Integrity
- Structure is locked: SIM cannot add or delete rows.
- Current vs SIM handles ADDED (editable) and REMOVED (visible, disabled).
- Selected Factors only filter edit controls; the full SIM dataset recalculates.
- Work Center rates are not editable in SIM.
- Action Cost is never added into MAT, LB, BD, or Standard Cost.
- Below-break-even economic results remain visible and selectable.

---

# 10. Explicitly Superseded Legacy Logic

The following older rules are **explicitly superseded** and must not be reintroduced:

1. **Exactly one Candidate per RCA:** Superseded. An RCA Case may contain 1 or multiple Candidates.
2. **Mandatory RCA → Simulation:** Superseded. RCA ends at Root Cause + Action. Simulation is optional.
3. **Simulation always has exactly Scenario A and B:** Superseded. Exact A/B is not mandatory.
4. **Simulation baseline is always Current:** Superseded. SIM can start from Reference, Current, or Custom.
5. **Structural editing inside Simulation:** Superseded. Structure is locked in SIM; structural edits happen in Master Data / Custom.
6. **Work Center rates editable in Simulation:** Superseded. Rates are not SIM-editable; change them in Master Data / Custom.
7. **Economics folded into MAT/LB/BD/Standard Cost:** Superseded. Standard Cost and Economics are separate dimensions.
8. **Special Trial lifecycle (Trial → Approve → Promote):** Superseded. Custom may store trial data; choose `Clone` on Current and select Custom as the source.
9. **Duplicate RCA Note system:** Superseded. Existing Master Data annotations remain separate.
10. **MatVAR / LBVAR / BDVAR:** Superseded and removed from current scope.

---

# 11. System-Level Acceptance Checklist

### Master Data
- [ ] Reference, Current, and Custom exist and share the same canonical schema.
- [ ] Custom has no hard-coded semantic meaning.
- [ ] Structural editing (add/remove/sizing) belongs in Master Data / Custom.
- [ ] Clone semantics: active dataset is destination, user chooses source.
- [ ] User can clone Current → Custom, Reference → Custom, Custom → Current.
- [ ] Sizing and Excel template generation preserved.
- [ ] 4-sheet workbook format (`META`, `BOM`, `WORK_CENTER`, `ROUTING`) preserved with yellow editable cells.

### Cost Breakdown (CBD)
- [ ] CBD compares Reference vs Current only. Custom is not compared directly.
- [ ] Matching uses business identity (`Name`, `WC`, `Process`), never row index.
- [ ] Exactly four statuses: `UNCHANGED`, `CHANGED`, `ADDED`, `REMOVED`.
- [ ] $\text{Gap} = \text{Current} - \text{Reference}$.
- [ ] Full Comparison and Selected Comparison supported.
- [ ] Selected Comparison is analysis scope only, not a dataset or RCA Case.

### Candidate / RCA
- [ ] Candidate pool derives from active CBD comparison scope.
- [ ] Ranking is advisory; no automatic top-rank selection.
- [ ] Processing Candidate identity is `Process / Routing` (WC is context, not candidate).
- [ ] One RCA Case supports 1 Candidate or multiple Candidates.
- [ ] Root Cause / Why? and Action recorded at RCA Case level.
- [ ] No duplicate RCA Note system.
- [ ] RCA is complete upon recording Root Cause + Action; Simulation is optional.
- [ ] RCA context does not restrict user from simulating additional factors.

### Simulation (Parameter & Economic)
- [ ] Simulation includes Parameter Simulation and Economic Simulation.
- [ ] May start from Reference, Current, or Custom.
- [ ] Dataset structure is locked upon entering Simulation.
- [ ] Multiple Factors to Simulate can be selected for editing.
- [ ] Editing factors triggers live recalculation of the entire SIM dataset.
- [ ] Editable parameters: BOM (Price, Usage, Loss), Routing (Manning, Cap, Yield).
- [ ] WC Labor and Burden rates are NOT editable in SIM.
- [ ] Current vs SIM comparison correctly handles CHANGED, UNCHANGED, ADDED (editable), and REMOVED (visible, disabled).
- [ ] Economic Simulation calculates $\text{Required Saving / pc} = \frac{\text{Action Cost}}{\text{Evaluation Quantity}}$.
- [ ] Economic Action Cost is NOT folded into MAT, LB, BD, or Standard Cost.
- [ ] Combined mode compares Parameter Saving vs Required Saving to show Economic Margin.
- [ ] Economic results are advisory, not an approval gate.
- [ ] Exactly A/B scenario count is not mandatory.

### Shared & Integrity
- [ ] One shared calculation engine for all features.
- [ ] Missing inputs make outputs unavailable (never substituted with zero).
- [ ] Reversible implementation details documented in provisional ledger.

---

# 12. Implementation Progress Checklist Template

This tracks execution progress across future implementation phases.

Allowed statuses: `TODO`, `IN PROGRESS`, `IMPLEMENTED`, `VERIFIED`, `BLOCKED — BUSINESS QUESTION`.

### Phase 0 — Baseline
- [ ] Confirm active branch.
- [ ] Record baseline commit SHA.
- [ ] Confirm expected worktree state.
- [ ] Read repository agent instructions.
- [ ] Read requirements authority and canonical specs.
- [ ] Record baseline build/test status.

### Phase 1 — Documentation Alignment
- [x] Migrate `FINAL_LOGIC_SPEC.md` to latest finalized logic.
- [x] Update `REQUIREMENTS_INDEX.md`.
- [x] Update `MASTER_DATA.md` (Ref / Cur / Custom, Clone).
- [x] Update `COST_BREAKDOWN.md` (Ref vs Cur, Selected scope).
- [x] Update `CANDIDATE.md` (Candidate + Multi-Candidate RCA).
- [x] Rename/rewrite `RCA_SIMULATION.md` → `SIMULATION.md` (Parameter + Economic).
- [x] Update `CROSS_CUTTING.md`.
- [x] Update `SYSTEM_LOGIC_DIAGRAM.md`.
- [x] Reconcile provisional decisions and design references.
- [x] Update `HANDOFF.md`.
- [x] Verify cross-document consistency.

### Phase 2+ — Implementation
(To be executed during code audit and implementation phase).

---

# 13. Ambiguity and Escalation Rule

If an implementation detail is reversible and does not alter business semantics:
> Make a safe implementation choice, preserve established patterns, record it as provisional if materially important, and continue.

If a question alters:
- business logic,
- calculations,
- matching identity,
- dataset lifecycle,
- persistence,
- destructive behavior,
- RCA meaning,
- Simulation or Economic meaning,
- Standard Cost meaning,

then:
> **DO NOT GUESS. DO NOT INVENT A RULE.**
> Mark as `BLOCKED — BUSINESS QUESTION` and report the exact context and question for external user resolution.

---

# 14. Definition of Done

The documentation migration is complete only when:
$$\text{Final Logic} = \text{Canonical Active Docs} = \text{Implementation Target}$$

and:
1. No active canonical document contradicts this specification.
2. Historical agreements remain preserved as provenance.
3. Compatible existing requirements are preserved intact.
4. Current implementation status is accurately described without false completion claims.
5. Verification evidence is recorded before handoff.
