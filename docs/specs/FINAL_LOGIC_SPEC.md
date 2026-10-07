# COSTBREAKDOWN — Final Logic Specification & Implementation Checklist

**Status:** FINALIZED LOGIC — USER DECISION  
**Date:** 2026-10-06  
**Scope:** Product logic, calculations, comparison behavior, analysis scope, page-to-page flow, simulation logic, economics logic, and graph/data logic.  
**Not a visual redesign specification.**

---

## 0. Purpose, Authority, and Precedence

This document is the consolidated **logic-only source of truth** for the COSTBREAKDOWN application based on the latest explicit user decisions in the final logic review.

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
- visual style,
- component styling,
- wording,
- navigation presentation,
- interaction details,
- table editing behavior,
- keyboard behavior,
- compact/dense engineering-console direction,
- reversible implementation choices,
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

- **Processing candidates are Process/Routing candidates, not Work Center candidates.**
- **Selected Comparison does not continue into Simulation.**
- **Selected Comparison begins in CBD and may end in CBD or continue through Ranking until one Candidate enters RCA.**
- **Exactly one Candidate enters one RCA analysis.**
- **Simulation has exactly two alternatives: Scenario A and Scenario B.**
- **Simulation can override supported Standard Cost inputs, improvement economics inputs, Selling Price, and SG&A%.**
- **Work Center Labor Rate and Burden Rate are finalized as scenario-editable Standard Cost inputs.**
- **SG&A amount and OP formulas are finalized here.**
- **OP may be negative and a negative OP means operating loss.**
- **Simulation contains the scenario-comparison and final storytelling graph logic; a separate dashboard workflow is not required by this logic.**
- **The final story compares Reference → Current → Simulated with exactly two adjacent comparison gaps.**
- **Economics additions used in the simulated cost comparison must be assigned to MAT, LB, or BD so that the simulated cost composition remains reconcilable with Reference and Current.**
- **MatVAR, LBVAR, and BDVAR remain outside scope and must not be reintroduced.**

---

# 1. End-to-End Product Flow

The finalized normal flow is:

```text
Master Data
    ↓
Cost Breakdown (CBD)
    ├─ Full Comparison
    └─ Selected Comparison (optional temporary scope)
            ↓
Ranking / Candidate
            ↓
Choose exactly ONE Candidate
            ↓
RCA
            ↓
Simulation
    ├─ Scenario A
    └─ Scenario B
            ↓
Human compares A vs B
            ↓
Human selects ONE scenario
            ↓
Storytelling result
Reference → Current → Simulated
          Gap 1      Gap 2
            ↓
Optional Trial handoff
```

### 1.1 Core page responsibilities

| Stage | Responsibility |
|---|---|
| Master Data | Prepare Reference and Current source snapshots |
| CBD | Explain Standard Cost difference and where it comes from |
| Selected Comparison | Temporarily narrow CBD/Ranking analysis to chosen BOM/Process findings |
| Ranking | Prioritize candidate findings |
| RCA | Analyze one Candidate at a time and record why/action context |
| Simulation | Compare two possible improvement strategies and their cost/business outcomes |
| Storytelling Graph | Show Reference → Current → Simulated financial/cost story |
| Trial | May receive a human-selected scenario; Trial execution logic is not redefined here |

---

# 2. Shared Data Model and Calculation Rules

## 2.1 Reference and Current are independent snapshots

Reference and Current must be treated as two complete, independent source snapshots.

Rules:

- Calculate Reference independently.
- Calculate Current independently.
- Compare only after each side has been calculated.
- Row counts do not need to match.
- Table sizes do not need to match.
- Structures may differ.
- Never align rows by row number or display order.

## 2.2 Business identity

Use business identity only:

```text
BOM         = Name
Work Center = WC
Routing     = Process
```

The display `#` column is not identity.

Never match by:

- row position,
- row number,
- array index,
- old Operation Code,
- old Sequence,
- or guessed positional correspondence.

Duplicate or missing identity is a data-quality problem. The system must not guess a match.

## 2.3 Comparison statuses

Use only:

```text
UNCHANGED
CHANGED
ADDED
REMOVED
```

Do not add:

- REPLACE,
- NEED REVIEW,
- or another comparison status.

Field-level changes are detail, not separate statuses.

### Status and Gap are independent

Examples:

- A record can be `CHANGED` with positive Gap.
- A record can be `CHANGED` with negative Gap.
- A record can be `CHANGED` with zero Gap.
- A record can be `CHANGED` with unavailable Gap when calculation inputs are invalid.
- A record may have unchanged own fields while its calculated cost changes because of a dependency such as a Work Center rate.

### Work Center rate dependency

Work Center is never a Candidate. The processing Candidate unit is always `Process / Routing`; Work Center is the rate owner and calculation/aggregation context.

If a Work Center Labor Rate or Burden Rate change causes one or more Processes' calculated Labor, Burden, Conversion, or total processing cost to change, each affected Process remains the Candidate. For a Process present in both Reference and Current, that Process is `CHANGED` when its calculated processing cost changes solely because of the Work Center rate dependency, even if its Routing-owned Manning, Capacity, Yield, and WC assignment are unchanged. The Work Center rate change is explanatory dependency/context; it does not create a Work Center Candidate.

If one Work Center serves multiple Processes and its rate change affects them, each affected Process may independently become a Process Candidate. Do not split one Process into Labor and Burden Candidates.

Example:

```text
Process: Cutting

Routing fields:
Manning     1 → 1
Capacity  100 → 100
Yield      95% → 95%
WC        WC-A → WC-A

WC-A Labor Rate:
10 → 12

Result:
Cutting calculated Labor / Conversion cost changes.

Candidate:
Cutting — CHANGED

Explanation/context:
WC-A Labor Rate 10 → 12

Do NOT create:
WC-A Candidate
```

## 2.4 Gap convention

Always use:

```text
Gap = Current - Reference
```

Interpretation:

```text
Gap > 0  → Current cost is higher than Reference
Gap = 0  → No net monetary difference
Gap < 0  → Current cost is lower than Reference
```

For structure changes:

```text
ADDED   → Reference contribution = 0 because the record does not exist in Reference
REMOVED → Current contribution   = 0 because the record does not exist in Current
```

This absent-record zero is **not** the same as missing data.

If an existing record is missing a required calculation input, do not substitute zero.

## 2.5 Standard Cost engine

### Material

Per BOM row:

```text
Material Cost
= Usage × Price × (1 + Loss)
```

`Loss` must use the application's agreed numeric representation consistently.

Total Direct Material:

```text
Direct Material
= sum of calculable BOM material costs
```

### Routing Factor

```text
Routing Factor
= Manning / (Capacity × Yield)
```

### Labor

```text
Labor
= Routing Factor × Work Center Labor Rate
```

### Burden

```text
Burden
= Routing Factor × Work Center Burden Rate
```

### Conversion

```text
Conversion
= Labor + Burden
```

### Standard Cost

```text
Standard Cost
= Direct Material + Labor + Burden
```

Equivalent:

```text
Standard Cost
= Direct Material + Conversion
```

Do not double-count Conversion.

All Standard Cost results are per piece unless explicitly discussing total economics.

## 2.6 Missing/invalid input rule

A required missing or invalid input makes the affected calculation unavailable.

Examples include:

- missing Usage,
- missing Price,
- invalid Loss,
- missing Manning,
- Capacity <= 0,
- Yield <= 0,
- missing referenced Work Center,
- duplicated ambiguous Work Center identity,
- missing Labor/Burden rate where required.

Rules:

- Do not fabricate zero.
- Do not fabricate a plausible value.
- Do not silently skip a problematic contribution if doing so creates a misleading total.
- Surface the data-quality issue.
- An explicitly entered numeric zero is valid when the formula logically permits zero.

## 2.7 Reconciliation rules

At top level:

```text
Material Gap + Labor Gap + Burden Gap
= Standard Cost Gap
```

Also:

```text
Labor Gap + Burden Gap
= Conversion Gap
```

If the data required to reconcile is unavailable, show an unavailable/data-quality state rather than a false mismatch.

---

# 3. Master Data Logic

## 3.1 Purpose

Master Data prepares the two source snapshots.

It is not the page that explains cost variance or performs RCA.

## 3.2 Fresh session

A fresh session opens into an empty Reference/Current Master Data workspace.

No separate startup Product selector is required.

The initial table view is:

```text
All Tables
```

with:

```text
BOM
Work Centers
Routing
```

in that order.

## 3.3 Independent dataset states

Reference and Current are independent.

Each side has:

```text
Working
Last Saved
```

There is one in-session Last Saved snapshot per side.

No database/version-history behavior is created by this logic.

## 3.4 Dataset actions

### Save

```text
Working → Last Saved
```

Only for the currently viewed side.

A later Save replaces that side's previous Last Saved state.

### Reset

```text
Last Saved → Working
```

Only for the currently viewed side.

### Export

Export the viewed side's **Last Saved** state.

Unsaved Working changes are not exported.

### Import

Import replaces only the viewed side's **Working** state.

Import:

- does not merge,
- does not automatically Save,
- does not replace the opposite dataset.

### Clear

Clear only the viewed side's Working content.

Retain that side's Last Saved state.

Do not affect the other side.

### Clone

Clone copies the **opposite side's Working state** into the viewed side's Working state.

Rules:

- Clone does not copy Last Saved.
- Clone does not replace Last Saved.
- Clone is not gated by the source side's readiness.
- If destination contains data, preserve the existing finalized confirmation behavior unless later UX changes supersede it.
- Destination readiness is recalculated from copied content.

## 3.5 Comparison readiness

CBD can use current Working datasets.

The user does **not** need to:

- Save,
- Export,
- Activate,
- create a version,
- or perform another confirmation step

before comparison.

## 3.6 Metadata

Each side independently contains:

```text
Product Name
UOM
Selling Price
SG&A (% of Selling Price)
Dataset Remark
```

Do not add Product Code as a required identity field.

Reference and Current may have different Product Names.

A mismatch is a non-blocking warning; do not silently treat different names as identical.

## 3.7 Table schemas

### BOM

```text
# | Name | Usage | Unit | Price | Loss | Note
```

### Work Center

```text
# | WC | Labor | Burden | Note
```

### Routing

```text
# | Process | WC | Manning | Cap | Yield | Note
```

### Meaning of `#`

`#` is for display/selection/order.

It is not:

- identity,
- calculation input,
- Routing sequence,
- or comparison key.

## 3.8 Notes and remarks

Record `Note` and dataset `Remark` are annotations.

They:

- are preserved through normal data handling,
- are not business identity,
- are not calculation inputs,
- and a note-only change does not make a business record `CHANGED`.

## 3.9 Sizing

Sizing controls exact row counts and shared metadata for the selected side.

Applying a row count creates exactly that many row slots. Increasing appends blank rows. Decreasing removes rows from the end, including populated rows, and removed data is lost. Import initializes the selected side's counts to the actual imported row counts. Direct table additions and deletions keep that section's count aligned with its current rows; Reference and Current remain independent. A blank identity displays an ordinal counted among blank identities only, not by UI row position, and the ordinal is not a business identity. Blank numeric inputs remain blank.

A row with missing required data is MISSING. A MISSING row is not eligible for normal comparison as a complete record, and missing required calculation values do not produce a cost or gap.

Sizing must not create a record-count equality requirement between Reference and Current.

## 3.10 Workbook logic preserved

The neutral workbook has four data sheets:

```text
META
BOM
ROUTING
WORK_CENTER
```

The calculation inspection view may exist separately and is not imported as a fifth data sheet.

The calculation view follows the same Standard Cost engine as the app.

## 3.11 Master Data validation

Validation is local and normally non-blocking.

The system must not fabricate downstream costs from invalid cells.

Routing `WC` must reference Work Center master data.

---

# 4. Cost Breakdown (CBD) Logic

## 4.1 Purpose

CBD explains:

1. how much Standard Cost changed,
2. whether the change is Material or Processing,
3. which BOM / Work Center / Process contributes,
4. which underlying inputs changed,
5. before the user chooses a Candidate for RCA.

CBD does **not** determine root cause.

## 4.2 Default mode

CBD opens in:

```text
Full Comparison
```

## 4.3 Summary

At top-level calculation logic, provide:

```text
                    Reference   Current   Gap
Direct Material
Labor
Burden
Conversion
Standard Cost
```

Where:

```text
Gap = Current - Reference
```

## 4.4 Material branch

The material analysis path is:

```text
Standard Cost
→ Direct Material
→ BOM record
→ Usage / Price / Loss details
```

Each BOM finding must be able to expose:

```text
Status
Reference Cost
Current Cost
Gap
```

For a matched changed BOM record, changed inputs should be shown as:

```text
Usage: Ref → Current
Price: Ref → Current
Loss:  Ref → Current
```

### No fabricated per-input THB attribution

There is no finalized method to divide one BOM record's monetary Gap into separate monetary:

- Usage effect,
- Price effect,
- Loss effect.

Therefore:

- do not invent these monetary effects,
- do not duplicate the full record Gap onto each changed field.

The record Gap is monetary.
The input differences explain what changed.

## 4.5 Processing branch

Processing calculation is performed independently on each side.

For each Routing record:

```text
Routing Factor
→ Labor
→ Burden
→ Conversion
```

using that side's referenced Work Center rates.

### Work Center role

Work Center remains:

- calculation context,
- rate owner,
- aggregation context.

Work Center owns:

```text
Labor Rate
Burden Rate
```

### Routing / Process role

Routing/Process owns:

```text
Process
WC assignment
Manning
Capacity
Yield
```

A Process can display its calculated:

```text
Labor
Burden
Conversion
```

and corresponding Gaps even though Labor/Burden rates belong to Work Center.

### Processing aggregation

For each side:

1. calculate every Routing operation,
2. aggregate processing cost by Work Center,
3. compare Work Center totals.

```text
WC Net Gap
= Current WC processing total
- Reference WC processing total
```

A one-to-one Routing match is **not required** to calculate the Work Center processing total.

## 4.6 CBD drill-down boundary

CBD may drill from:

```text
Standard Cost Gap
→ Material / Conversion
→ BOM / Work Center
→ Process
→ underlying changed inputs
```

Relevant underlying variables are:

### BOM

```text
Usage
Price
Loss
```

### Process / Routing

```text
Manning
Capacity
Yield
WC assignment
```

### Work Center

```text
Labor Rate
Burden Rate
```

CBD should not pretend Work Center rates are Routing-owned fields.

## 4.7 CBD statuses and filtering

CBD supports all four statuses:

```text
UNCHANGED
CHANGED
ADDED
REMOVED
```

Status filter is multi-select.

`All` means all four statuses and is the default.

Unchanged remains available/viewable.

## 4.8 Warnings

Keep warnings separate from comparison status.

Examples:

- duplicate identity,
- missing identity,
- missing required input,
- invalid WC reference,
- duplicate WC,
- Capacity <= 0,
- Yield <= 0.

Warnings normally inform rather than block navigation.

The previously agreed collapsed review area remains compatible:

```text
Review warnings (N)
```

---

# 5. Selected Comparison Logic

## 5.1 Purpose

Selected Comparison is a temporary analysis scope that starts in CBD.

It is used when the user wants to focus on a subset of findings before Candidate selection.

It does not edit Reference or Current.

## 5.2 Selectable finding types

The user may select multiple:

```text
BOM findings
Process / Routing findings
```

The user may **not** select Work Center as a Selected Comparison finding.

Work Centers remain available as full calculation/rate context.

## 5.3 Selection behavior

For matched findings:

```text
CHANGED
UNCHANGED
```

the Reference/Current pair is selected or excluded together.

For:

```text
ADDED
REMOVED
```

the finding is independently selectable because it exists on only one side.

## 5.4 Selected Gap

While Selected Comparison is active in CBD:

```text
Selected Gap
= Gap of the active selected analysis scope
```

Do not mutate the source datasets.

Do not save the scope as business data.

## 5.5 Lifecycle

Selected Comparison begins in CBD.

The user has two valid paths.

### Path A — end inside CBD

```text
CBD Full
→ enter Selected Comparison
→ analyze selected findings
→ Exit Selected
→ return to Full Comparison
```

### Path B — continue to Candidate selection

```text
CBD Selected Scope
→ Ranking limited to that Scope
→ user chooses exactly ONE Candidate
→ Candidate enters RCA
→ Selected Scope ends
→ Simulation uses normal Simulation logic
```

## 5.6 Selected scope does not enter Simulation

Once one Candidate enters RCA, the multi-finding Selected Scope has completed its job.

Simulation must **not** calculate a special selected-only product.

Simulation must **not** carry a multi-finding Selected Scope state.

The Candidate may remember/display its origin as contextual information if current UX already does so, but this must not alter Simulation calculation scope.

## 5.7 Scope invalidation

A real change to Reference or Current source data invalidates the selected scope.

Do not remap stale selections by guess.

Return to a valid Full Comparison state.

---

# 6. Ranking / Candidate Logic

## 6.1 Purpose

Ranking helps the user decide **which point to investigate next**.

It is intentionally shallower than CBD.

CBD explains deeply.
Ranking prioritizes.

## 6.2 Candidate groups

Ranking has two main candidate groups only:

```text
1. BOM
2. Process / Routing
```

Work Center is **not** a main Candidate type.

This supersedes the older Work-Center-level processing candidate rule.

Work Center remains useful as:

- context,
- rate owner,
- aggregation detail.

## 6.3 Candidate statuses

Ranking candidates use:

```text
CHANGED
ADDED
REMOVED
```

`UNCHANGED` is not a Candidate.

A changed Candidate with zero Gap remains valid and visible.

## 6.4 Candidate monetary value

### BOM Candidate

Use the BOM record's calculated:

```text
Reference Cost
Current Cost
Gap
```

Changed fields may be shown as explanatory detail.

Do not invent per-input THB effects.

### Process Candidate

A Process/Routing Candidate remains one Candidate.

Do not split one Process into separate candidates such as:

```text
Labor Candidate
Burden Candidate
```

A Process may show supporting monetary context:

```text
Labor Gap
Burden Gap
Conversion Gap
```

and short changed-factor context such as:

```text
Manning changed
Capacity changed
Yield changed
WC changed
```

but the Process itself remains the Candidate.

Apply the [Work Center rate dependency rule](#work-center-rate-dependency): a changed rate may make each affected Process `CHANGED` based on its calculated processing-cost movement, even when that Process's Routing-owned fields are unchanged. Work Center remains dependency context, never a Candidate.

## 6.5 Ranking order

Default ranking:

```text
Gap descending
```

Keep:

- positive,
- zero,
- negative

Gap Candidates visible.

Ranking is a prioritization aid only.

Do not automatically conclude that the highest Gap is the best improvement target.

## 6.6 Controllable

Every Candidate defaults:

```text
Controllable = true
```

The user may uncheck it.

Unchecking:

- does not hide it,
- does not delete it,
- does not block it,
- does not remove it from the candidate pool.

It is a human judgment aid.

## 6.7 Filtering

Status filtering remains available.

Default:

```text
All
```

representing:

```text
CHANGED + ADDED + REMOVED
```

Do not invent additional required filters as logic.

## 6.8 Relationship with Selected Comparison

If a Selected Scope is active:

```text
Ranking Candidate Pool
= Candidates inside Selected Scope
```

If no Selected Scope is active:

```text
Ranking Candidate Pool
= Full applicable Candidate Pool
```

## 6.9 Candidate selection for RCA

The user selects **exactly one Candidate** to analyze in one RCA.

```text
1 RCA analysis = 1 Candidate
```

Do not send multiple Candidates into one RCA session.

If the user wants RCA for multiple Candidates:

```text
Candidate A → RCA round 1
Candidate B → RCA round 2
Candidate C → RCA round 3
```

The system must not auto-select the top-ranked Candidate.

---

# 7. RCA Logic

## 7.1 Purpose

RCA answers:

```text
Why did this selected Candidate change?
```

It does not analyze multiple Candidates simultaneously.

## 7.2 Input

RCA receives exactly one human-selected Candidate.

The Candidate may have come from:

- Full Ranking,
- or Ranking restricted by Selected Comparison.

At RCA entry, the multi-item Selected Scope ends.

## 7.3 RCA notes

RCA may contain:

```text
Root Cause / Why?
Action
```

These are real-world human notes.

They are optional unless a later non-conflicting requirement explicitly makes them mandatory.

They are not numeric calculation inputs.

They do not change Standard Cost automatically.

## 7.4 RCA to Simulation

RCA provides investigation context to Simulation.

Simulation remains a scenario-building environment and is not restricted to editing only one raw field from the Candidate.

The Candidate is the reason/focus for the analysis, but a scenario may contain multiple supported input changes when representing one realistic improvement strategy.

---

# 8. Simulation Logic — Normal Mode

## 8.1 Purpose

Simulation compares two realistic alternative improvement strategies.

It is not merely a calculator for choosing the numerically smaller of two Standard Costs.

Scenario A and B should support different trade-offs.

Example concept:

```text
Scenario A
- Usage increases
- Material Price increases
- Loss decreases significantly
- Lower fixed investment

Scenario B
- Usage stays similar
- Material Price decreases significantly
- Loss increases
- Higher fixed investment
```

The system then calculates the financial/business outcome of both strategies.

## 8.2 Exactly two scenarios

Provide exactly:

```text
Scenario A
Scenario B
```

This supersedes the previous A/B/C model.

## 8.3 Scenario baseline

Both scenarios independently begin from:

```text
Current
```

They do not begin from each other.

```text
Current
├─ Scenario A
└─ Scenario B
```

Scenario A edits must not mutate Scenario B.
Scenario B edits must not mutate Scenario A.

## 8.4 Source immutability

Simulation never mutates:

```text
Reference
Current
```

Simulation uses scenario-local overrides.

Clearing an override returns that scenario input to the Current value.

## 8.5 Standard Cost cannot be typed directly

The user must not type:

```text
Standard Cost = 85 THB/pc
```

as an arbitrary predicted output.

The user changes supported inputs and the system recalculates.

## 8.6 Scenario-editable Standard Cost inputs

### BOM

```text
Usage
Price
Loss
```

### Routing / Process

```text
Manning
Capacity
Yield
```

### Work Center

```text
Labor Rate
Burden Rate
```

Work Center Labor/Burden Rate scenario editing is finalized here.

## 8.7 No structural simulation

Simulation changes measurable values, not source structure.

Do not use Simulation to:

- add a new BOM record,
- remove a BOM record,
- add a Routing record,
- remove a Routing record,
- split Routing records,
- merge Routing records,
- invent a new factory formula.

Structural changes would require separate future logic.

## 8.8 Recalculation

Every scenario recalculates through the same Standard Cost engine:

```text
BOM inputs
→ MAT

Routing + WC inputs
→ LB / BD

MAT + LB + BD
→ Standard Cost
```

No alternative formula is introduced for Simulation.

---

# 9. Improvement Economics Logic

## 9.1 Purpose

Improvement economics captures additional cost required to make a scenario possible.

The currently agreed inputs are:

```text
Fixed Investment
Variable Added Cost / pc
Evaluation Quantity
```

## 9.2 Fixed and variable are independent

The user is **not** required to enter both.

Valid examples:

### Fixed only

```text
Fixed Investment          = 50,000 THB
Variable Added Cost / pc  = 0
```

### Variable only

```text
Fixed Investment          = 0
Variable Added Cost / pc  = 1.20 THB/pc
```

### Both

Both may be used when the improvement genuinely requires both.

## 9.3 Evaluation Quantity

Evaluation Quantity is the number of pieces used to evaluate/spread economics.

It is not inherently one production batch.

Possible business meanings include:

- expected monthly quantity,
- annual quantity,
- program quantity,
- project-life quantity,
- or another chosen evaluation horizon.

The system must not call it a production batch unless the user explicitly uses a batch context.

## 9.4 Fixed equivalent per piece

When Fixed Investment is evaluated per piece:

```text
Fixed Equivalent / pc
= Fixed Investment / Evaluation Quantity
```

Evaluation Quantity must be valid and positive when required for this calculation.

## 9.5 Economics category

Any economics cost that participates in the simulated cost composition must be assigned to one of:

```text
MAT
LB
BD
```

This is required so Reference, Current, and Simulated remain comparable by the same cost categories.

Examples:

- a jig investment may be categorized as `BD` when treated as overhead,
- an added material-related per-piece cost may be categorized as `MAT`,
- an added labor-related per-piece cost may be categorized as `LB`.

Do not hard-code every Fixed Investment as BD; the categorization must represent the actual cost treatment.

## 9.6 Avoid double counting

A cost must enter the scenario once.

If a production cost is already represented by a direct Standard Cost input change, do not enter the same effect again as Variable Added Cost.

Example:

```text
Material price increases
→ change BOM Price
→ do NOT repeat the same increase as Variable Added Cost
```

Economics inputs are for additional improvement costs not already represented by the changed engine inputs.

## 9.7 Scenario cost composition

For each category:

```text
Simulated Category
= Recalculated engine category
+ applicable categorized economics equivalent / pc
```

Thus:

```text
Simulated MAT
Simulated LB
Simulated BD
```

remain reconcilable.

The displayed simulated Standard Cost is:

```text
Simulated Standard Cost
= Simulated MAT + Simulated LB + Simulated BD
```

This means categorized economics included in the simulated composition must **not** be subtracted a second time in downstream OP or net-improvement calculations.

## 9.8 Gross improvement and total evaluation

Per-piece improvement relative to Current:

```text
Gross Improvement / pc
= Current Standard Cost / pc
- Simulated Standard Cost / pc
```

Because the finalized Simulated Standard Cost composition already includes categorized economics equivalents, do not subtract those same economics costs again.

For an evaluation quantity:

```text
Total Improvement
= Gross Improvement / pc × Evaluation Quantity
```

The economics summary may still expose the components separately for transparency:

```text
Fixed Investment
Fixed Equivalent / pc
Variable Added Cost / pc
Evaluation Quantity
```

but the calculation engine must avoid double counting.

---

# 10. Selling Price, SG&A, and OP Logic

## 10.1 Scenario-editable business inputs

Each scenario may override:

```text
Selling Price
SG&A %
```

Unmodified values default to Current.

Clearing an override returns to Current.

## 10.2 SG&A definition

SG&A is entered as:

```text
% of Selling Price
```

Therefore:

```text
SG&A amount / pc
= Selling Price × SG&A %
```

Example:

```text
Selling Price = 150 THB/pc
SG&A          = 10%

SG&A amount
= 150 × 10%
= 15 THB/pc
```

## 10.3 OP definition

Use:

```text
OP / pc
= Selling Price
- Standard Cost
- SG&A amount
```

Because:

```text
Standard Cost = MAT + LB + BD
```

equivalently:

```text
OP / pc
= Selling Price
- MAT
- LB
- BD
- SG&A amount
```

## 10.4 Negative OP

OP is allowed to be negative.

```text
OP < 0
```

means the simulated/current/reference state is operating at a loss under the defined per-piece model.

Do not:

- clamp negative OP to zero,
- hide it,
- convert it to unavailable merely because it is negative.

Example:

```text
Selling Price = 100
Standard Cost = 95
SG&A amount   = 10

OP = 100 - 95 - 10 = -5 THB/pc
```

Interpretation:

```text
Operating Loss = 5 THB/pc
```

## 10.5 Current scope of business metrics

The final reviewed graph/business logic focuses on:

```text
Selling Price
MAT
LB
BD
Standard Cost
SG&A
OP
```

Do not expand this final logic review into additional business metrics such as:

- GP,
- GP Margin,
- OP Margin,
- Sales,
- other P&L metrics,

unless an older finalized, non-conflicting requirement explicitly requires them for another purpose.

They are not required by this final logic specification.

---

# 11. Scenario A vs Scenario B Comparison Logic

## 11.1 Purpose

The A/B comparison helps the user choose between two strategies that may have different trade-offs.

It must not be reduced to:

```text
A Standard Cost = 90
B Standard Cost = 88
```

with no explanation of how the strategies differ.

## 11.2 What the scenario comparison graph compares

The graph compares **money outcomes**, not raw engineering variables.

Required monetary series/values:

```text
MAT
LB
BD
Standard Cost
SG&A
OP
Selling Price
```

All monetary values are expressed on a compatible per-piece basis for direct comparison.

## 11.3 Input-change context

Raw changed inputs such as:

```text
Usage
Material Price
Loss
Manning
Capacity
Yield
Labor Rate
Burden Rate
Fixed Investment
Variable Added Cost
SG&A %
Selling Price override
```

should be available as scenario change/trade-off context.

They do not need to be plotted on the same money graph because they use incompatible units.

The logic requirement is:

> The user must be able to understand why Scenario A and Scenario B produce different money outcomes.

The exact UI arrangement is not fixed here.

## 11.4 Human selection

The system does not automatically choose a winner.

The user selects one scenario to continue.

The selected scenario becomes:

```text
Simulated
```

for the final storytelling result.

---

# 12. Final Storytelling Graph / Dashboard Logic

## 12.1 Location

The storytelling/dashboard graph belongs in the Simulation result flow.

This logic does not require a separate Dashboard workflow page.

Existing non-conflicting visual components may be reused.

## 12.2 Three states

After the user selects Scenario A or B, compare:

```text
Reference
Current
Simulated
```

where:

```text
Simulated = the human-selected scenario
```

## 12.3 Exactly two adjacent comparison gaps

There are three states and exactly two primary adjacent comparisons:

```text
Reference → Current → Simulated
          Gap 1      Gap 2
```

### Gap 1

```text
Gap 1 = Current - Reference
```

This tells the original change/problem between Reference and Current.

### Gap 2

For each money metric, show the signed movement from Current to Simulated:

```text
Gap 2 = Simulated - Current
```

For Standard Cost, the UI may also label the beneficial direction as improvement/saving, but the underlying signed delta must remain unambiguous.

Do not introduce a third primary gap as part of this storytelling requirement.

## 12.4 Required money content

The final graph/result must expose:

```text
MAT
LB
BD
Standard Cost
SG&A
OP
Selling Price
```

for:

```text
Reference
Current
Simulated
```

Standard Cost must not hide MAT/LB/BD.

The application is a cost-breakdown system; users must still see the cost composition.

## 12.5 Required relationships

For each state:

```text
Standard Cost = MAT + LB + BD
```

and:

```text
SG&A amount = Selling Price × SG&A %
```

and:

```text
OP = Selling Price - Standard Cost - SG&A
```

Therefore:

```text
Selling Price
= MAT + LB + BD + SG&A + OP
```

When OP is negative, the visual/result must still preserve the signed value.

## 12.6 Quick-comprehension goal

The graph logic should support a viewer understanding quickly:

1. What did Reference look like?
2. What changed in Current?
3. Which MAT/LB/BD component changed?
4. How did SG&A and OP look?
5. What does the selected Simulation change?
6. What is Gap 1?
7. What is Gap 2?
8. Is OP profit or loss?
9. How do the two candidate scenarios differ financially?

Exact colors, geometry, chart library, card layout, spacing, and typography remain UX/UI decisions.

---

# 13. Worked Example — Traceable End-to-End Logic

This example exists only to demonstrate the finalized logic.

All numbers are introduced explicitly before use.

## 13.1 Reference dataset

Assume one product with:

```text
Selling Price = 150.00 THB/pc
SG&A          = 10%
```

### Reference BOM — MAT-A

```text
Usage = 2.00
Price = 20.00 THB/unit
Loss  = 5% = 0.05
```

Material:

```text
MAT
= 2.00 × 20.00 × (1 + 0.05)
= 42.00 THB/pc
```

### Reference Process — Cutting

```text
Manning  = 1
Capacity = 10
Yield    = 100% = 1.00

WC Labor Rate  = 100 THB
WC Burden Rate = 50 THB
```

Routing Factor:

```text
= 1 / (10 × 1.00)
= 0.10
```

Labor:

```text
LB
= 0.10 × 100
= 10.00 THB/pc
```

Burden:

```text
BD
= 0.10 × 50
= 5.00 THB/pc
```

Reference Standard Cost:

```text
STD
= MAT + LB + BD
= 42 + 10 + 5
= 57.00 THB/pc
```

Reference SG&A:

```text
= 150 × 10%
= 15.00 THB/pc
```

Reference OP:

```text
= 150 - 57 - 15
= 78.00 THB/pc
```

## 13.2 Current dataset

Assume Current changes to:

```text
Selling Price = 150.00 THB/pc
SG&A          = 10%
```

### Current MAT-A

```text
Usage = 2.10
Price = 22.00
Loss  = 8% = 0.08
```

Current MAT:

```text
= 2.10 × 22 × 1.08
= 49.896 THB/pc
```

### Current Cutting

```text
Manning  = 1
Capacity = 8
Yield    = 95% = 0.95

Labor Rate  = 100
Burden Rate = 50
```

Routing Factor:

```text
= 1 / (8 × 0.95)
= 1 / 7.6
≈ 0.1315789474
```

Current LB:

```text
≈ 0.1315789474 × 100
≈ 13.1579 THB/pc
```

Current BD:

```text
≈ 0.1315789474 × 50
≈ 6.5789 THB/pc
```

Current STD:

```text
≈ 49.896 + 13.1579 + 6.5789
≈ 69.6328 THB/pc
```

Current SG&A:

```text
= 150 × 10%
= 15.00 THB/pc
```

Current OP:

```text
≈ 150 - 69.6328 - 15
≈ 65.3672 THB/pc
```

### Gap 1 — Reference → Current

MAT:

```text
49.896 - 42.000
= +7.896
```

LB:

```text
13.1579 - 10.0000
≈ +3.1579
```

BD:

```text
6.5789 - 5.0000
≈ +1.5789
```

STD:

```text
69.6328 - 57.0000
≈ +12.6328 THB/pc
```

OP:

```text
65.3672 - 78.0000
≈ -12.6328 THB/pc
```

The example reconciles:

```text
7.896 + 3.1579 + 1.5789
≈ 12.6328
```

## 13.3 Scenario A

Scenario A begins from Current.

Assume strategy A:

```text
Usage remains       = 2.10
Material Price      = 22.50
Loss improves       = 3% = 0.03
Capacity improves   = 10
Yield improves      = 98% = 0.98
Selling Price       = 150
SG&A                 = 10%
Fixed Investment    = 10,000 THB
Evaluation Quantity = 10,000 pc
Fixed category      = BD
Variable Added Cost = 0
```

Scenario A engine MAT:

```text
= 2.10 × 22.50 × 1.03
= 48.6675
```

Scenario A Routing Factor:

```text
= 1 / (10 × 0.98)
≈ 0.1020408163
```

Engine LB:

```text
≈ 10.2041
```

Engine BD:

```text
≈ 5.1020
```

Fixed Equivalent:

```text
= 10,000 / 10,000
= 1.00 THB/pc
```

Because Fixed category = BD:

```text
Simulated BD
≈ 5.1020 + 1.00
≈ 6.1020
```

Scenario A STD:

```text
≈ 48.6675 + 10.2041 + 6.1020
≈ 64.9736 THB/pc
```

Scenario A SG&A:

```text
= 150 × 10%
= 15
```

Scenario A OP:

```text
≈ 150 - 64.9736 - 15
≈ 70.0264
```

## 13.4 Scenario B

Scenario B independently begins from Current.

Assume strategy B:

```text
Usage remains        = 2.10
Material Price       = 19.00
Loss worsens         = 10% = 0.10
Capacity             = 9
Yield                 = 96% = 0.96
Selling Price        = 148
SG&A                  = 9%
Fixed Investment     = 30,000 THB
Evaluation Quantity  = 10,000 pc
Fixed category       = BD
Variable Added Cost  = 0.50 THB/pc
Variable category    = MAT
```

Scenario B engine MAT:

```text
= 2.10 × 19.00 × 1.10
= 43.89
```

Add categorized variable cost:

```text
Simulated MAT
= 43.89 + 0.50
= 44.39
```

Routing Factor:

```text
= 1 / (9 × 0.96)
= 1 / 8.64
≈ 0.1157407407
```

Engine LB:

```text
≈ 11.5741
```

Engine BD:

```text
≈ 5.7870
```

Fixed Equivalent:

```text
= 30,000 / 10,000
= 3.00 THB/pc
```

Categorized to BD:

```text
Simulated BD
≈ 5.7870 + 3.00
≈ 8.7870
```

Scenario B STD:

```text
≈ 44.39 + 11.5741 + 8.7870
≈ 64.7511 THB/pc
```

SG&A:

```text
= 148 × 9%
= 13.32 THB/pc
```

OP:

```text
≈ 148 - 64.7511 - 13.32
≈ 69.9289 THB/pc
```

## 13.5 Why the A/B graph matters

The two scenarios are close in STD:

```text
Scenario A STD ≈ 64.9736
Scenario B STD ≈ 64.7511
```

But they use different strategies:

```text
A:
- higher material price
- much lower loss
- stronger capacity/yield recovery
- lower fixed investment
- no added variable cost
- same Price/SG&A

B:
- much lower material price
- higher loss
- weaker processing recovery
- higher fixed investment
- added MAT variable cost
- lower Selling Price and SG&A%
```

Therefore the comparison must expose:

```text
MAT
LB
BD
STD
SG&A
OP
Selling Price
```

not only the final STD number.

The human chooses the preferred strategy.

## 13.6 Final selected scenario story

Assume the user selects Scenario A.

Then:

```text
Simulated = Scenario A
```

The final story is:

```text
Reference → Current → Simulated
          Gap 1      Gap 2
```

For Standard Cost:

```text
Gap 1
= Current - Reference
≈ 69.6328 - 57.0000
≈ +12.6328
```

Gap 2:

```text
= Simulated - Current
≈ 64.9736 - 69.6328
≈ -4.6592
```

A negative Gap 2 for Standard Cost means the selected simulation lowered cost relative to Current.

No third primary gap is required.

---

# 14. Edge Cases and Integrity Rules

## 14.1 Different counts

Reference may have:

```text
10 BOM rows
5 Work Centers
8 Routing rows
```

while Current may have:

```text
12 BOM rows
4 Work Centers
11 Routing rows
```

This is valid.

Do not require equal counts.

## 14.2 Duplicate identity

If two BOM rows share the same `Name` where uniqueness is required:

- warn,
- do not guess a pair,
- do not silently choose the first row.

Same principle for WC and Process identities.

## 14.3 Missing Work Center

If a Routing row references a missing WC:

- affected processing calculation is unavailable,
- do not use zero Labor/Burden rates.

## 14.4 Zero Gap CHANGED

A record may be `CHANGED` but have:

```text
Gap = 0
```

Keep it changed.

Do not rewrite status to UNCHANGED based only on money.

## 14.5 ADDED/REMOVED zero side

Use zero only because the record is absent on one side.

Do not generalize that rule to missing values inside an existing record.

## 14.6 OP negative

Negative OP is valid and means loss.

## 14.7 Invalid Evaluation Quantity

If a Fixed Investment needs per-piece conversion and:

```text
Evaluation Quantity <= 0
```

the fixed-equivalent calculation is unavailable.

Do not divide by zero.

## 14.8 Scenario independence

Changing A does not change B.

Changing B does not change A.

Both retain Current as fallback for fields without overrides.

## 14.9 No scenario structural mutation

Do not simulate structural add/remove/split/merge.

## 14.10 Economics double-count prevention

If a cost effect is already represented through:

```text
BOM Price
BOM Usage
BOM Loss
Routing variable
WC rate
```

do not repeat the same cost as economics.

## 14.11 Source-data change during Selected Comparison

Clear stale Selected Scope and return to valid Full Comparison behavior.

## 14.12 Multiple RCA targets

Do not analyze multiple Candidates in one RCA.

Run separate RCA cycles.

---

# 15. Cross-Page State Boundaries

## 15.1 Master Data → CBD

Pass:

```text
Reference Working
Current Working
```

Do not require Save.

## 15.2 CBD → Ranking

### Full mode

Pass applicable Full findings.

### Selected mode

Pass only Candidate-eligible findings within Selected Scope.

## 15.3 Ranking → RCA

Pass exactly one human-selected Candidate.

Do not auto-select.

## 15.4 Selected Scope boundary

Selected Scope may be active through Ranking.

When one Candidate enters RCA:

```text
Selected Scope terminates
```

## 15.5 RCA → Simulation

Pass:

- selected Candidate context,
- optional Root Cause,
- optional Action.

Simulation itself uses normal full Current baseline plus scenario overrides.

## 15.6 Simulation → selected result

A and B are independent.

Human selects one.

Selected scenario becomes:

```text
Simulated
```

for final story.

---

# 16. Logic That Must Not Be Reintroduced

Do not reintroduce:

- row-position matching,
- Routing Operation Code/Sequence identity,
- REPLACE status,
- NEED REVIEW comparison status,
- Work Center as the main Processing Candidate,
- multiple Candidates in one RCA,
- three simulation scenarios,
- selected-scope Simulation,
- user-typed Standard Cost,
- structural BOM/Routing simulation,
- fabricated Price/Usage/Loss monetary effects,
- MatVAR,
- LBVAR,
- BDVAR,
- forced non-negative OP,
- invented monthly/historical dashboard data,
- duplicate economics cost counting,
- automatic scenario winner selection,
- automatic highest-Gap RCA selection.

---

# 17. Detailed Implementation / Audit Checklist

Use this checklist for implementation audit.

Recommended audit result values:

```text
PASS
PARTIAL
FAIL
NOT VERIFIED
NOT APPLICABLE
```

---

## A. Specification authority and preservation

- [ ] The implementation treats this document as logic authority for the behaviors finalized here.
- [ ] Existing non-conflicting finalized UX/UI behavior is preserved.
- [ ] Existing non-conflicting wording is preserved unless a separate requirement changes it.
- [ ] Existing non-conflicting interaction behavior is preserved.
- [ ] Older behavior is superseded only where this document explicitly conflicts.
- [ ] Code is not used as evidence to override a user decision.
- [ ] No new accounting formula is invented outside this specification.
- [ ] No new identity/matching rule is invented outside this specification.
- [ ] No new Trial execution/approval workflow is invented from this specification.

---

## B. Shared Reference / Current snapshot logic

- [ ] Reference and Current are independent snapshots.
- [ ] Reference is calculated independently.
- [ ] Current is calculated independently.
- [ ] Comparison occurs after independent calculation.
- [ ] Different BOM row counts are supported.
- [ ] Different Work Center row counts are supported.
- [ ] Different Routing row counts are supported.
- [ ] Different structures are supported.
- [ ] Equal dataset sizing is not required.
- [ ] Comparison never relies on row position.
- [ ] Comparison never relies on display `#`.
- [ ] Comparison never relies on array index.

---

## C. Identity / matching

- [ ] BOM identity is `Name`.
- [ ] Work Center identity is `WC`.
- [ ] Routing identity is `Process`.
- [ ] Legacy Operation Code is not required.
- [ ] Legacy Routing Sequence is not required.
- [ ] Display row number is not identity.
- [ ] Duplicate BOM identity produces a data-quality issue.
- [ ] Duplicate WC identity produces a data-quality issue.
- [ ] Duplicate Process identity produces a data-quality issue.
- [ ] Missing identity produces a data-quality issue.
- [ ] Ambiguous identity is never resolved by guessing.
- [ ] Note/Remark is not identity.

---

## D. Comparison statuses

- [ ] Supported statuses are exactly UNCHANGED / CHANGED / ADDED / REMOVED where applicable.
- [ ] REPLACE is not introduced.
- [ ] NEED REVIEW is not introduced as a comparison status.
- [ ] Field changes are detail, not separate statuses.
- [ ] Status is independent from monetary Gap.
- [ ] CHANGED may have positive Gap.
- [ ] CHANGED may have zero Gap.
- [ ] CHANGED may have negative Gap.
- [ ] CHANGED may have unavailable Gap.
- [ ] ADDED is not automatically interpreted as bad.
- [ ] REMOVED is not automatically interpreted as good.
- [ ] Note-only changes do not create CHANGED business status.

---

## E. Gap rules

- [ ] Gap always means Current - Reference.
- [ ] Positive Gap means Current is higher.
- [ ] Negative Gap means Current is lower.
- [ ] Zero Gap means no net monetary difference.
- [ ] ADDED uses absent Reference contribution = 0.
- [ ] REMOVED uses absent Current contribution = 0.
- [ ] Missing required data inside an existing record is not replaced with 0.
- [ ] Unavailable values remain unavailable instead of fabricated.

---

## F. Standard Cost engine

- [ ] Material cost uses Usage × Price × (1 + Loss).
- [ ] Direct Material sums valid BOM material costs.
- [ ] Routing Factor uses Manning / (Capacity × Yield).
- [ ] Labor uses Routing Factor × WC Labor Rate.
- [ ] Burden uses Routing Factor × WC Burden Rate.
- [ ] Conversion = Labor + Burden.
- [ ] Standard Cost = MAT + LB + BD.
- [ ] Standard Cost may equivalently use MAT + Conversion.
- [ ] Conversion is not double-counted.
- [ ] Standard Cost is calculated per piece.
- [ ] Routing rates come from referenced Work Center data.
- [ ] Explicit valid zero inputs are not automatically treated as missing.
- [ ] Capacity <= 0 causes unavailable affected calculation.
- [ ] Yield <= 0 causes unavailable affected calculation.
- [ ] Missing referenced WC causes unavailable affected calculation.
- [ ] Ambiguous duplicated WC causes unavailable affected calculation.
- [ ] Missing required input does not produce fabricated cost.

---

## G. Reconciliation

- [ ] MAT Gap + LB Gap + BD Gap reconciles to Standard Cost Gap when values are available.
- [ ] LB Gap + BD Gap reconciles to Conversion Gap.
- [ ] Parent/child monetary details reconcile where calculation is available.
- [ ] Reconciliation is not faked when required values are unavailable.
- [ ] Data-quality issues are surfaced when reconciliation cannot be calculated.

---

## H. Master Data — session and dataset lifecycle

- [ ] Fresh session supports empty Reference and Current workspace.
- [ ] No separate Product selector is required before Master Data.
- [ ] First-entry table view is All Tables.
- [ ] All Tables order is BOM → Work Centers → Routing.
- [ ] Reference has independent Working state.
- [ ] Reference has independent Last Saved state.
- [ ] Current has independent Working state.
- [ ] Current has independent Last Saved state.
- [ ] Save copies viewed Working to viewed Last Saved.
- [ ] Save does not overwrite the opposite side.
- [ ] Reset restores viewed Working from viewed Last Saved.
- [ ] Reset does not alter opposite side.
- [ ] Export uses viewed Last Saved state.
- [ ] Unsaved Working edits are not exported.
- [ ] Import replaces viewed Working state.
- [ ] Import does not merge with viewed Working data.
- [ ] Import does not automatically Save.
- [ ] Import does not alter opposite side.
- [ ] Clear affects viewed Working only.
- [ ] Clear retains viewed Last Saved state.
- [ ] Clear does not alter opposite side.
- [ ] Clone copies opposite Working into viewed Working.
- [ ] Clone does not copy source Last Saved.
- [ ] Clone does not replace destination Last Saved.
- [ ] Clone is not gated by source readiness.
- [ ] Destination readiness is recalculated after Clone.
- [ ] Existing finalized populated-destination confirmation remains valid unless separately superseded.
- [ ] CBD can compare Working without Save.
- [ ] CBD can compare Working without Export.
- [ ] CBD can compare Working without Activate/version step.

---

## I. Master Data — metadata

- [ ] Reference has independent Product Name.
- [ ] Current has independent Product Name.
- [ ] Reference has independent UOM.
- [ ] Current has independent UOM.
- [ ] Reference has independent Selling Price.
- [ ] Current has independent Selling Price.
- [ ] Reference has independent SG&A %.
- [ ] Current has independent SG&A %.
- [ ] Reference has independent Dataset Remark.
- [ ] Current has independent Dataset Remark.
- [ ] SG&A metadata is interpreted as % of Selling Price.
- [ ] Different Product Names are allowed.
- [ ] Product mismatch is not silently ignored.
- [ ] Product mismatch is non-blocking unless another logic impossibility exists.
- [ ] Product Code is not introduced as a required identity field.
- [ ] Dataset Remark is not a calculation input.

---

## J. Master Data — table schema and annotations

- [ ] BOM supports Name / Usage / Unit / Price / Loss / Note.
- [ ] Work Center supports WC / Labor / Burden / Note.
- [ ] Routing supports Process / WC / Manning / Cap / Yield / Note.
- [ ] `#` is not persisted/used as business identity.
- [ ] `#` is not a calculation input.
- [ ] `#` is not Routing sequence identity.
- [ ] BOM Note is not a calculation input.
- [ ] WC Note is not a calculation input.
- [ ] Routing Note is not a calculation input.
- [ ] Note-only change does not create business CHANGED.
- [ ] Notes/Remarks remain annotation data.

---

## K. Master Data — Sizing/workbook logic

- [ ] Sizing belongs to the selected Reference/Current side.
- [ ] Sizing row counts determine the exact current row slots.
- [ ] Decreasing Sizing removes rows from the end, including populated rows.
- [ ] Import initializes Sizing to actual row counts; Reference and Current remain independent.
- [ ] Export and re-import preserve blank row slots and numeric blanks.
- [ ] Missing required rows are MISSING and cannot be treated as complete comparisons.
- [ ] Sizing does not require Ref/Current counts to match.
- [ ] Workbook data sheets are META / BOM / ROUTING / WORK_CENTER.
- [ ] Separate calculation inspection view is not imported as a data sheet.
- [ ] Calculation inspection uses same Standard Cost formula.
- [ ] Sizing/template logic does not alter comparison identities.

---

## L. CBD — page purpose and summary

- [ ] CBD starts in Full Comparison.
- [ ] CBD consumes Reference Working and Current Working.
- [ ] CBD does not require Last Saved as comparison input.
- [ ] CBD summary can expose Ref / Current / Gap.
- [ ] CBD summary includes Direct Material.
- [ ] CBD summary includes Labor.
- [ ] CBD summary includes Burden.
- [ ] CBD summary includes Conversion.
- [ ] CBD summary includes Standard Cost.
- [ ] CBD uses Gap = Current - Reference.

---

## M. CBD — material logic

- [ ] Material drill-down reaches BOM records.
- [ ] BOM finding exposes Status.
- [ ] BOM finding can expose Reference cost.
- [ ] BOM finding can expose Current cost.
- [ ] BOM finding can expose Gap.
- [ ] Changed Usage is shown as Ref → Current detail.
- [ ] Changed Price is shown as Ref → Current detail.
- [ ] Changed Loss is shown as Ref → Current detail.
- [ ] No per-Usage THB effect is fabricated.
- [ ] No per-Price THB effect is fabricated.
- [ ] No per-Loss THB effect is fabricated.
- [ ] Full BOM record Gap is not duplicated onto each changed factor.

---

## N. CBD — processing logic

- [ ] Each side calculates Routing independently.
- [ ] Routing uses referenced WC Labor Rate.
- [ ] Routing uses referenced WC Burden Rate.
- [ ] Routing Factor uses Manning / (Capacity × Yield).
- [ ] Process can expose calculated Labor.
- [ ] Process can expose calculated Burden.
- [ ] Process can expose calculated Conversion.
- [ ] Process can expose Labor Gap where meaningful.
- [ ] Process can expose Burden Gap where meaningful.
- [ ] Process can expose Conversion Gap where meaningful.
- [ ] Work Center owns Labor Rate.
- [ ] Work Center owns Burden Rate.
- [ ] Routing owns Manning.
- [ ] Routing owns Capacity.
- [ ] Routing owns Yield.
- [ ] Routing owns WC assignment.
- [ ] WC rates are not falsely presented as Routing-owned raw fields.
- [ ] Each side aggregates processing by WC.
- [ ] WC Net Gap = Current WC processing total - Reference WC processing total.
- [ ] One-to-one Routing pairing is not required to calculate WC aggregate.
- [ ] No manual split/merge mapping is invented for WC aggregate calculation.

---

## O. CBD — status filtering and warnings

- [ ] CBD filter supports UNCHANGED.
- [ ] CBD filter supports CHANGED.
- [ ] CBD filter supports ADDED.
- [ ] CBD filter supports REMOVED.
- [ ] CBD status filter is multi-select.
- [ ] CBD default All represents all four statuses.
- [ ] Unchanged remains viewable.
- [ ] Warning state is not comparison status.
- [ ] Duplicate identity may appear as warning.
- [ ] Missing identity may appear as warning.
- [ ] Missing required input may appear as warning.
- [ ] Invalid WC reference may appear as warning.
- [ ] Invalid Capacity/Yield may appear as warning.
- [ ] Warning handling does not fabricate values.
- [ ] Existing collapsed `Review warnings (N)` behavior remains compatible.

---

## P. Selected Comparison — selection

- [ ] Selected Comparison starts from CBD.
- [ ] Full Comparison remains default.
- [ ] Multiple findings may be selected.
- [ ] BOM findings are selectable.
- [ ] Process/Routing findings are selectable.
- [ ] Work Center is not selectable as a Selected finding.
- [ ] Work Centers remain available as calculation context.
- [ ] Matched CHANGED pair is selected/excluded together.
- [ ] Matched UNCHANGED pair is selected/excluded together.
- [ ] ADDED may be selected independently.
- [ ] REMOVED may be selected independently.
- [ ] Selected Scope does not edit Reference.
- [ ] Selected Scope does not edit Current.
- [ ] Selected Scope is not Save/version data.

---

## Q. Selected Comparison — lifecycle

- [ ] User may Exit Selected at CBD.
- [ ] Exit Selected returns to Full Comparison.
- [ ] User may continue active Selected Scope to Ranking.
- [ ] Ranking is limited to candidate-eligible findings inside active Scope.
- [ ] User chooses exactly one Candidate from scoped Ranking.
- [ ] Selected Scope terminates when that Candidate enters RCA.
- [ ] Multi-finding Selected Scope is not carried into Simulation.
- [ ] Simulation does not produce a selected-only product.
- [ ] Source-data change invalidates stale Selected Scope.
- [ ] Stale selection is not guessed/remapped after source-data change.

---

## R. Ranking — candidate structure

- [ ] Ranking has BOM Candidate group.
- [ ] Ranking has Process/Routing Candidate group.
- [ ] Work Center is not a main Candidate group.
- [ ] Older WC-level processing candidate behavior is not treated as current logic.
- [ ] Work Center may remain contextual information.
- [ ] BOM candidate uses record monetary Ref/Current/Gap.
- [ ] Process remains one Candidate.
- [ ] Process is not split into Labor Candidate.
- [ ] Process is not split into Burden Candidate.
- [ ] Process may show Labor Gap as context.
- [ ] Process may show Burden Gap as context.
- [ ] Process may show Conversion Gap as context.
- [ ] Process may show changed Routing factors as context.

---

## S. Ranking — status, sorting, controllability

- [ ] Ranking candidates use CHANGED.
- [ ] Ranking candidates use ADDED.
- [ ] Ranking candidates use REMOVED.
- [ ] UNCHANGED is not a Ranking Candidate.
- [ ] Zero-Gap CHANGED Candidate remains visible.
- [ ] Default ranking is Gap descending.
- [ ] Positive Gap candidates remain visible.
- [ ] Zero Gap candidates remain visible.
- [ ] Negative Gap candidates remain visible.
- [ ] Ranking does not auto-select highest Gap.
- [ ] Every Candidate defaults Controllable = true.
- [ ] User may uncheck Controllable.
- [ ] Unchecking does not hide Candidate.
- [ ] Unchecking does not delete Candidate.
- [ ] Unchecking does not block Candidate.
- [ ] Default status filter is All.
- [ ] All represents CHANGED + ADDED + REMOVED.

---

## T. Ranking → RCA selection

- [ ] Exactly one Candidate is chosen for one RCA.
- [ ] Multiple Candidates cannot enter one RCA session.
- [ ] Human chooses the Candidate.
- [ ] System does not auto-select the highest Gap Candidate.
- [ ] Multiple desired RCA analyses are performed as separate rounds.

---

## U. RCA

- [ ] RCA receives one Candidate.
- [ ] RCA answers why that Candidate changed.
- [ ] Root Cause / Why field is supported.
- [ ] Action field is supported.
- [ ] Root Cause is not a numeric cost input.
- [ ] Action is not a numeric cost input.
- [ ] RCA does not combine unrelated Candidates into one root cause.
- [ ] Selected multi-item Scope is already ended at RCA entry.
- [ ] Candidate context can continue into Simulation.
- [ ] Simulation is not restricted to only one changed raw field when a strategy requires multiple supported overrides.

---

## V. Simulation — scenario count and baseline

- [ ] Simulation has exactly Scenario A and Scenario B.
- [ ] Scenario C is removed/not required.
- [ ] Scenario A starts from Current.
- [ ] Scenario B starts from Current.
- [ ] Scenario A does not start from Scenario B.
- [ ] Scenario B does not start from Scenario A.
- [ ] A and B are independent drafts.
- [ ] A overrides do not mutate B.
- [ ] B overrides do not mutate A.
- [ ] Unmodified scenario input uses Current value.
- [ ] Clearing an override returns that field to Current.
- [ ] Simulation does not mutate Reference.
- [ ] Simulation does not mutate Current.

---

## W. Simulation — Standard Cost editable inputs

- [ ] User cannot type arbitrary predicted Standard Cost.
- [ ] BOM Usage is scenario-editable.
- [ ] BOM Price is scenario-editable.
- [ ] BOM Loss is scenario-editable.
- [ ] Routing Manning is scenario-editable.
- [ ] Routing Capacity is scenario-editable.
- [ ] Routing Yield is scenario-editable.
- [ ] WC Labor Rate is scenario-editable.
- [ ] WC Burden Rate is scenario-editable.
- [ ] Scenario uses same Standard Cost engine as Current/Reference.
- [ ] Scenario does not introduce a new Standard Cost formula.

---

## X. Simulation — structural boundaries

- [ ] Simulation does not add BOM records.
- [ ] Simulation does not remove BOM records.
- [ ] Simulation does not add Routing records.
- [ ] Simulation does not remove Routing records.
- [ ] Simulation does not split Routing records.
- [ ] Simulation does not merge Routing records.
- [ ] Simulation does not invent new factory formulas.
- [ ] Structural simulation is treated as out of current scope.

---

## Y. Economics — input behavior

- [ ] Fixed Investment is supported.
- [ ] Variable Added Cost / pc is supported.
- [ ] Evaluation Quantity is supported.
- [ ] Fixed Investment is optional.
- [ ] Variable Added Cost / pc is optional.
- [ ] Fixed does not require Variable.
- [ ] Variable does not require Fixed.
- [ ] Evaluation Quantity is not automatically called a production batch.
- [ ] Evaluation Quantity may represent a chosen business evaluation horizon.
- [ ] Fixed Equivalent / pc = Fixed Investment / Evaluation Quantity.
- [ ] Invalid/non-positive required Evaluation Quantity produces unavailable fixed-equivalent result.
- [ ] Economics input does not mutate Reference/Current source data.

---

## Z. Economics — MAT/LB/BD categorization and double-count control

- [ ] An economics cost used in simulated cost composition is categorized as MAT, LB, or BD.
- [ ] Fixed-equivalent / pc has a category when included in simulated cost composition.
- [ ] Variable Added Cost / pc has a category when included in simulated cost composition.
- [ ] A jig/overhead example may be categorized as BD when appropriate.
- [ ] The system does not hard-code all Fixed Investment as BD without cost-treatment basis.
- [ ] Material-related added cost may be categorized as MAT.
- [ ] Labor-related added cost may be categorized as LB.
- [ ] Same economic effect is not entered twice.
- [ ] BOM Price effect is not repeated as Variable Added Cost.
- [ ] BOM Usage effect is not repeated as Variable Added Cost.
- [ ] BOM Loss effect is not repeated as Variable Added Cost.
- [ ] Routing/WC rate effect is not repeated as Variable Added Cost when already modeled directly.
- [ ] Simulated MAT includes applicable categorized economics equivalent.
- [ ] Simulated LB includes applicable categorized economics equivalent.
- [ ] Simulated BD includes applicable categorized economics equivalent.
- [ ] Simulated Standard Cost = Simulated MAT + Simulated LB + Simulated BD.
- [ ] Economics already included in simulated categories is not subtracted again downstream.

---

## AA. Selling Price / SG&A / OP

- [ ] Selling Price is scenario-editable.
- [ ] SG&A % is scenario-editable.
- [ ] Unmodified Selling Price defaults to Current.
- [ ] Unmodified SG&A % defaults to Current.
- [ ] Clearing Selling Price override returns to Current.
- [ ] Clearing SG&A override returns to Current.
- [ ] SG&A is interpreted as % of Selling Price.
- [ ] SG&A amount / pc = Selling Price × SG&A %.
- [ ] OP / pc = Selling Price - Standard Cost - SG&A amount.
- [ ] Equivalent OP = Selling Price - MAT - LB - BD - SG&A.
- [ ] OP may be positive.
- [ ] OP may be zero.
- [ ] OP may be negative.
- [ ] Negative OP means operating loss.
- [ ] Negative OP is not clamped to zero.
- [ ] Negative OP is not hidden.
- [ ] GP/GP Margin/OP Margin/Sales are not required by this final reviewed logic unless preserved by another non-conflicting finalized requirement.

---

## AB. Scenario A/B comparison graph

- [ ] A/B comparison exists.
- [ ] A/B comparison is for strategy trade-off, not merely choosing the smaller total.
- [ ] A/B graph compares money outcomes.
- [ ] A/B graph includes MAT.
- [ ] A/B graph includes LB.
- [ ] A/B graph includes BD.
- [ ] A/B graph includes Standard Cost.
- [ ] A/B graph includes SG&A.
- [ ] A/B graph includes OP.
- [ ] A/B graph includes Selling Price.
- [ ] Monetary comparison uses compatible per-piece basis.
- [ ] Raw engineering variables are not forced onto the same money scale.
- [ ] User can understand which input changes differentiate A from B.
- [ ] Fixed/Variable economics differences can be understood as scenario context.
- [ ] System does not automatically select a scenario winner.
- [ ] Human selects the preferred scenario.

---

## AC. Final storytelling graph

- [ ] Selected scenario becomes Simulated.
- [ ] Final story contains Reference.
- [ ] Final story contains Current.
- [ ] Final story contains Simulated.
- [ ] Final story has exactly two primary adjacent comparisons.
- [ ] Gap 1 is Reference → Current.
- [ ] Gap 1 uses Current - Reference.
- [ ] Gap 2 is Current → Simulated.
- [ ] Gap 2 uses Simulated - Current as signed movement.
- [ ] No third primary gap is required.
- [ ] Final story exposes MAT.
- [ ] Final story exposes LB.
- [ ] Final story exposes BD.
- [ ] Final story exposes Standard Cost.
- [ ] Final story exposes SG&A.
- [ ] Final story exposes OP.
- [ ] Final story exposes Selling Price.
- [ ] Standard Cost does not hide MAT/LB/BD.
- [ ] For each state, Standard Cost = MAT + LB + BD.
- [ ] For each state, SG&A amount = Selling Price × SG&A %.
- [ ] For each state, OP = Selling Price - Standard Cost - SG&A.
- [ ] Signed negative OP remains visible.
- [ ] Final graph/dashboard is logically part of Simulation result flow.
- [ ] No fabricated historical/monthly series is required.
- [ ] Chart colors/layout/spacing are not locked by this logic spec.

---

## AD. Quick-comprehension outcome

- [ ] Viewer can identify Reference outcome quickly.
- [ ] Viewer can identify Current outcome quickly.
- [ ] Viewer can identify selected Simulated outcome quickly.
- [ ] Viewer can identify original Ref→Current change quickly.
- [ ] Viewer can identify Current→Simulated change quickly.
- [ ] Viewer can see MAT/LB/BD cost composition.
- [ ] Viewer can see Standard Cost total.
- [ ] Viewer can see Selling Price.
- [ ] Viewer can see SG&A.
- [ ] Viewer can see OP.
- [ ] Viewer can recognize operating loss when OP is negative.
- [ ] Viewer can understand A/B trade-off without reading every raw table row.

---

## AE. Selected mode boundary regression checks

- [ ] Selected Scope does not accidentally persist into Simulation.
- [ ] Simulation baseline remains full Current.
- [ ] Candidate selected from Scoped Ranking behaves the same in Simulation as a Candidate selected from Full Ranking.
- [ ] Normal Simulation A/B logic is identical regardless of Candidate's scope origin.
- [ ] No selected-only Standard Cost replaces full product Standard Cost in Simulation.
- [ ] No stale scope changes Reference/Current/Simulated story.

---

## AF. Result integrity / unavailable states

- [ ] Missing calculation input is distinguishable from numeric zero.
- [ ] Unavailable calculations do not display as 0.
- [ ] Duplicate identity does not silently select a record.
- [ ] Invalid WC reference does not fabricate Labor/Burden.
- [ ] Invalid Capacity/Yield does not fabricate Routing cost.
- [ ] Invalid Evaluation Quantity does not fabricate fixed-equivalent cost.
- [ ] Reconciliation issue is surfaced rather than hidden.
- [ ] Comparison status is not used as validation warning.
- [ ] Validation warning is not converted into comparison status.

---

## AG. Explicit anti-regression checks

- [ ] Routing is not matched by row position.
- [ ] Routing does not revert to Operation Code identity.
- [ ] Ranking does not revert to WC as the processing Candidate.
- [ ] RCA does not allow multi-Candidate root-cause analysis in one round.
- [ ] Simulation does not revert to A/B/C.
- [ ] Selected Comparison does not propagate into Simulation.
- [ ] Standard Cost cannot be typed directly.
- [ ] Simulation does not add/remove BOM or Routing structure.
- [ ] Per-factor Price/Usage/Loss THB attribution is not fabricated.
- [ ] MatVAR is not reintroduced.
- [ ] LBVAR is not reintroduced.
- [ ] BDVAR is not reintroduced.
- [ ] OP is not forced non-negative.
- [ ] Economics is not double-counted.
- [ ] Monthly/historical data is not invented for graphs.
- [ ] System does not auto-pick the highest Gap Candidate.
- [ ] System does not auto-pick the winning Scenario.

---

# 18. Codex Audit Instructions

When auditing the current implementation against this document:

1. Do not modify code before completing the audit unless explicitly instructed.
2. Check every checklist item.
3. Report each item as:
   - PASS
   - PARTIAL
   - FAIL
   - NOT VERIFIED
   - NOT APPLICABLE
4. For PARTIAL/FAIL, identify:
   - current behavior,
   - conflicting file/component/function,
   - required behavior,
   - smallest safe change.
5. Preserve all existing non-conflicting finalized UX/UI and behavior.
6. Do not redesign the application merely because this document does not restate the old UI.
7. Where older docs conflict with this logic, update or mark only the conflicting statements.
8. Do not reopen already-settled logic.
9. Do not invent missing accounting formulas, structural simulation, or Trial workflow.
10. Verify calculations with traceable test data rather than unexplained constants.

---

# 19. Existing Source Documents to Cross-Reference

This document consolidates and supersedes only conflicting logic from the existing source set, including:

```text
docs/REQUIREMENTS_INDEX.md
docs/specs/MASTER_DATA.md
docs/specs/COST_BREAKDOWN.md
docs/specs/CROSS_CUTTING.md
docs/specs/CANDIDATE.md
docs/specs/RCA_SIMULATION.md
agreements/
docs/history/
```

Important preservation principle:

> Absence from this logic-only document does not invalidate an older finalized UX/UI or interaction decision. Only an explicit logic conflict supersedes that specific older behavior.

Important migration differences that Codex should detect:

```text
Old: Processing Candidate at Work Center level
New: Process/Routing is the Candidate; WC remains context/rate owner/aggregation context.

Old: Selected Scope carried through RCA/Simulation
New: Selected Scope may continue to Ranking, but ends when one Candidate enters RCA.

Old: Scenario A/B/C
New: Exactly Scenario A/B.

Old: WC rate scenario editing provisional
New: Labor Rate and Burden Rate are finalized scenario-editable Standard Cost inputs.

Old: SG&A amount / OP formula pending
New:
SG&A amount = Selling Price × SG&A %
OP = Selling Price - Standard Cost - SG&A amount
OP may be negative.

Old: Dashboard/business graph not fully closed
New:
Simulation includes A/B money comparison and final Ref/Current/Simulated storytelling logic using
MAT / LB / BD / STD / SG&A / OP / Selling Price,
with exactly two adjacent comparison gaps.
```

---

# 20. Final Logic Closure Statement

For the scope reviewed in this specification, the following logic is considered closed:

```text
Master Data core logic
Standard Cost calculation
Cost Breakdown
Selected Comparison
Ranking / Candidate
RCA one-candidate rule
Simulation normal mode
Simulation selected-scope boundary
Scenario A/B comparison
Improvement economics
Selling Price / SG&A / OP relationship
Simulation graph/dashboard data logic
Reference → Current → Simulated storytelling
```

Future work may still refine:

- UI layout,
- visual styling,
- wording,
- chart visual form,
- interaction polish,
- responsive behavior,
- and other presentation choices,

provided those changes preserve the finalized logic above.
