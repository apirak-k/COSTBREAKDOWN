# COSTBREAKDOWN — Comparison Principles

> HISTORICAL REFERENCE ONLY — Current authority is `docs/REQUIREMENTS_INDEX.md` and `docs/specs/`. Do not use this agreement to fill an open decision.

**Status:** Working Specification  
**Scope:** Comparison logic only  
**Audience:** AI coding agent / implementation team

> This document defines the comparison principles and expected system behavior only.  
> It does **not** prescribe a specific UI layout, component structure, visual style, or page design.

---

## 1. Purpose

The comparison layer exists to answer one main question:

> **How is the Current dataset different from the Reference dataset, and how do those differences explain the cost gap?**

The system compares two complete working datasets:

```text
Reference Dataset
        VS
Current Dataset
```

Each dataset may contain:

```text
Product
Work Center / Rates
BOM
Routing
```

The two datasets do **not** need to contain the same number of rows, items, or routing steps.

---

## 2. Snapshot-vs-Snapshot Principle

Reference and Current must be treated as two independent snapshots.

```text
Reference Dataset
→ Calculate Reference Cost independently

Current Dataset
→ Calculate Current Cost independently
```

Only after both sides have been calculated should the system compare them.

```text
Current Cost - Reference Cost
= Cost Gap
```

The system must not require the two datasets to have identical structures before cost calculation can occur.

---

## 3. Never Compare by Row Position

Rows must **not** be paired using spreadsheet position, table position, or sequence number alone.

Wrong:

```text
Reference row 1 ↔ Current row 1
Reference row 2 ↔ Current row 2
```

Correct:

```text
Match records by business identity
```

Examples of business identity may include:

```text
BOM
→ Material Code / Item Code

Work Center
→ Work Center Code

Routing
→ Operation Code only
```

Sequence number is an attribute that may change. It must not be treated as the only identity of a routing operation.

### 3.1 Routing Identity Is Operation Code Only

For Routing, match records only by `Operation Code`. Do not fall back to
`Process Code`, process name, sequence, row position, or a composite key. A
missing or duplicate Operation Code is a validation warning; do not guess a
match. `Sequence` is a comparable attribute, so a sequence change on the same
Operation Code is `CHANGED`.

For example, if Reference has Operation Code `10` and Current has Operation
Code `20`, those are different identities:

```text
Operation Code 10 → REMOVED
Operation Code 20 → ADDED
```

Do not infer that one operation replaced the other. `REPLACE` is not a
comparison status; replacement-like cases are represented by the applicable
`REMOVED` and `ADDED` records unless a future explicit business rule defines
another relationship.

---

## 4. Four Comparison Statuses

Every comparable business record uses the same four statuses:

```text
UNCHANGED
CHANGED
ADDED
REMOVED
```

### UNCHANGED

The same business record exists in both Reference and Current, and the compared values are the same.

```text
Reference: M01
Current:   M01

No relevant field changed
→ UNCHANGED
```

### CHANGED

The same business record exists in both datasets, but one or more relevant values changed.

```text
Printing

Reference Yield: 95%
Current Yield:   90%

→ CHANGED
```

### ADDED

The record exists only in Current.

```text
Reference: no Inspection operation
Current:   Inspection exists

→ ADDED
```

### REMOVED

The record exists only in Reference.

```text
Reference: Old Packing exists
Current:   no Old Packing operation

→ REMOVED
```

These four statuses must be used consistently across BOM, Routing, Work Center, and other comparable master-data sections.

There is no additional `REPLACE` status. Notes/remarks are annotations rather
than business inputs, so a note-only difference does not make a record
`CHANGED`.

---

## 5. Change Details Are Not Additional Statuses

Details such as the following are **not** separate comparison statuses:

```text
Price changed
Yield changed
Capacity changed
Work Center changed
Sequence changed
```

They are details inside `CHANGED`.

Example:

```text
Printing
Status: CHANGED

Changes:
- Sequence: 20 → 30
- Work Center: WC01 → WC02
- Capacity: 100 → 120
- Yield: 95% → 90%
```

This keeps the status model simple while still preserving detailed explanations.

---

## 6. Structural Differences

Different dataset structures are valid and must still be comparable.

Example:

```text
REFERENCE ROUTING

10 Cutting
20 Printing
30 Assembly


CURRENT ROUTING

10 Cutting
20 Inspection
30 Printing
40 Assembly
```

Possible result:

```text
Cutting
→ UNCHANGED or CHANGED

Inspection
→ ADDED

Printing
→ CHANGED
  - Sequence changed: 20 → 30

Assembly
→ CHANGED
  - Sequence changed: 30 → 40
```

The system must not incorrectly pair `Printing` with `Inspection` merely because both appear at sequence 20.

---

## 7. Split / Merge Cases

The first implementation should not automatically infer complex process genealogy.

Example:

```text
Reference:
Printing

Current:
Printing A
Printing B
```

If there is no stable business identity proving that these records represent the same operation, classify them directly:

```text
Printing   → REMOVED
Printing A → ADDED
Printing B → ADDED
```

Do not automatically infer:

```text
Split
Merge
Replaced By
```

Those relationships can be added later if the business requires them.

---

## 8. Ambiguous or Invalid Matching

`NEED REVIEW` is **not** a comparison status.

If matching cannot be performed safely because of duplicated, missing, or invalid business keys, treat that as a **validation warning**, separate from the four comparison statuses.

Examples:

```text
Duplicate Material Code
Missing Operation ID where identity is required
Multiple possible matches
Invalid Work Center reference
```

The system should not silently guess a match.

Once the data or mapping is corrected, the record should resolve to one of:

```text
UNCHANGED
CHANGED
ADDED
REMOVED
```

---

## 9. Cost-Gap Treatment

The general rule is:

```text
Gap = Current Cost - Reference Cost
```

### CHANGED record

```text
Reference Cost = 10
Current Cost   = 13

Gap = +3
```

### ADDED record

The record does not exist in Reference, therefore its contribution on the Reference side is zero.

```text
Reference contribution = 0
Current contribution   = 5

Gap = +5
```

### REMOVED record

The record does not exist in Current, therefore its contribution on the Current side is zero.

```text
Reference contribution = 8
Current contribution   = 0

Gap = -8
```

Important:

> A missing record is treated as zero contribution for comparison purposes.  
> This does **not** mean a missing required input value such as Price, Yield, or Rate should be silently converted to zero.

Missing required values must be handled as validation/data-quality issues.

---

## 10. Cost Breakdown Display Principle

The Cost Breakdown page should display the normal comparison data for all records.

`UNCHANGED` records remain visible in the normal data view.

Status and Gap are independent outputs:

```text
Status = what changed in the compared record
Gap    = the cost impact, Current - Reference
```

Do not infer Status from the Gap or infer the Gap from Status. A `CHANGED` record may have a positive, negative, zero, or unavailable Gap. A record may also have a non-zero cost Gap while its own business fields are unchanged, when a cost dependency changes.

Status labels should not create unnecessary visual noise. The table omits the `UNCHANGED` label while keeping the row and its cost values visible. The `UNCHANGED` status remains available to filtering and comparison logic.

Recommended behavior:

```text
UNCHANGED
→ data remains visible
→ status label is omitted

CHANGED
→ show status

ADDED
→ show status

REMOVED
→ show status
```

Other visual details are UI decisions and are not defined by this document.

---

## 11. Status Filtering

The user must be able to filter comparison records by status using multi-select behavior. Each status can be selected independently, and the visible rows are the union of the selected statuses.

Conceptually:

```text
All     = UNCHANGED + CHANGED + ADDED + REMOVED
Changed = CHANGED only
Added   = ADDED only
Removed = REMOVED only
Unchanged = UNCHANGED only
```

`All` selects all four statuses; it is a select-all control, not a fifth comparison status. The default view selects all statuses. The user may combine any status filters.

For example:

```text
Changed + Added + Removed
```

means:

> Show only records where something changed between Reference and Current.

---

## 12. Drill-Down Principle

The Cost Breakdown should allow the user to move from the total gap to its detailed causes.

Conceptually:

```text
Total Cost Gap
        ↓
Cost Category
        ↓
BOM / Work Center / Routing
        ↓
Individual Item / Operation
        ↓
Changed Fields
```

Example:

```text
Total Gap: +12

Material Gap: +7
Labor Gap:    +3
Burden Gap:   +2
```

Material detail:

```text
M01   CHANGED   +4
M04   ADDED     +5
M02   REMOVED   -2
M03             0

Material Gap    +7
```

Opening `M01` may show:

```text
M01 — CHANGED

Consumption: 2.0 → 2.2
Price:       10  → 11
Loss:         2% → 3%

Reference Cost: 20
Current Cost:   24
Gap:            +4
```

---

## 13. Reconciliation Principle

Detailed comparison results must reconcile back to the higher-level cost gap.

At the top level:

```text
Material Gap
+ Labor Gap
+ Burden Gap
= Total Gap
```

Within a branch:

```text
Changed effects
+ Added effects
+ Removed effects
= Branch Gap
```

Example:

```text
M01 Changed   +4
M04 Added     +5
M02 Removed   -2
----------------
Material Gap  +7
```

The system should not show a detailed explanation that cannot reconcile back to the calculated total unless the mismatch is explicitly reported as a validation/calculation issue.

---

## 14. What the Comparison Layer Must Produce

The comparison engine should conceptually produce:

```text
Comparison Result
├── Reference calculated cost
├── Current calculated cost
├── Total gap
│
├── BOM comparison
│   ├── UNCHANGED
│   ├── CHANGED
│   ├── ADDED
│   └── REMOVED
│
├── Work Center comparison
│   ├── UNCHANGED
│   ├── CHANGED
│   ├── ADDED
│   └── REMOVED
│
├── Routing comparison
│   ├── UNCHANGED
│   ├── CHANGED
│   ├── ADDED
│   └── REMOVED
│
├── Field-level change details
├── Cost effect per record
└── Reconciliation result
```

UI components should consume this comparison result instead of independently inventing comparison logic.

---

## 15. Final Comparison Flow

```text
Reference Working Dataset
        +
Current Working Dataset
        ↓
Validate business identities / required data
        ↓
Calculate each dataset independently
        ↓
Match records by business identity
        ↓
Classify each record

UNCHANGED
CHANGED
ADDED
REMOVED
        ↓
Calculate field differences
        ↓
Calculate record-level cost effects
        ↓
Aggregate into

Material Gap
Labor Gap
Burden Gap
        ↓
Reconcile to Total Gap
        ↓
Display full Cost Breakdown
        ↓
Allow status filtering and drill-down
```

---

## 16. Core Rules to Preserve

1. Reference and Current are complete, independent datasets.
2. Dataset structures and row counts do not need to match.
3. Never match records by row position alone.
4. Use business identity to determine whether records represent the same object.
5. Use only four comparison statuses: `UNCHANGED`, `CHANGED`, `ADDED`, `REMOVED`.
6. Field-level differences are details of `CHANGED`, not additional statuses.
7. Structural additions and removals remain part of cost-gap calculation.
8. Do not automatically infer split/merge relationships.
9. Ambiguous matching is a validation problem, not a fifth comparison status.
10. Unchanged data remains available in Cost Breakdown.
11. Users can filter by comparison status.
12. Every detailed cost effect should reconcile back to the overall cost gap.
13. The comparison layer explains the gap; later RCA/improvement logic comes after this layer.
14. This specification defines behavior, not UI layout.
15. Routing identity is `Operation Code` only; ambiguous or missing keys produce a validation warning instead of a guessed match.
16. A different Routing Operation Code is represented as one `REMOVED` and one `ADDED`, never an inferred `REPLACE` status.
