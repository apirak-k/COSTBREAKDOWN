# Candidate Prioritization Specification

**Status:** Finalized concept / behavior specification  
**Scope:** Candidate Prioritization page only  
**Audience:** AI coding agent / implementation team  
**UI status:** This document defines behavior and data flow. It does **not** prescribe a fixed page layout or visual design.

---

## 1. Purpose

The Candidate Prioritization page exists to review and prioritize cost-change findings that were already produced by the Cost Breakdown / Comparison layer.

The page must help the user answer:

- What changed?
- What is the Reference value/cost?
- What is the Current value/cost?
- What is the resulting Gap?
- Is this candidate considered controllable by the user?

The page does **not** decide which candidate must be improved.

Ranking and sorting are prioritization aids only.

```text
Highest Cost Gap
≠
Automatic improvement decision
```

---

## 2. Position in the System Flow

```text
Master Data
    ↓
Cost Breakdown / Comparison
    ↓
Candidate Prioritization
    ↓
Later RCA / Simulation flow
```

Candidate Prioritization consumes comparison results. It should not recreate the full comparison logic independently.

---

## 3. Candidate Source

Candidates must come from Cost Breakdown / Comparison findings.

Do not generate candidates directly from the old paired `base* / active*` row model.

Conceptually:

```text
Reference Working Dataset
        ↓
Current Working Dataset
        ↓
Cost Breakdown / Comparison
        ↓
Findings
        ↓
Candidate Prioritization
```

---

## 4. Material Candidates

Material candidates come from meaningful material changes identified by the comparison layer.

Do not suppress a `CHANGED` material finding solely because its changed business field is not `Price`, `Loss`, or `Usage`. Keep the finding available with its changed-field details and calculated Gap so the user can judge its relevance. A numeric Gap of `0` does not by itself remove a changed material finding from Candidate Prioritization.

Examples:

```text
Material M01 Price Changed
Material M02 Loss Changed
Material M03 Usage Changed
Material M04 Added
Material M05 Removed
```

If one material has more than one meaningful changed factor, those factors may remain separate findings.

The page should not collapse unrelated material changes into one candidate merely because they belong to the same material.

---

## 5. Processing Candidates

### 5.1 Current Project Decision

For the current project scope, do **not** add new Routing IDs, manual Routing mappings, or split/merge mapping logic.

Do **not** require row-to-row Routing matching for Candidate Prioritization.

Instead:

```text
Routing operation
    ↓
References Work Center
    ↓
Uses Work Center rate/master data for cost calculation
    ↓
Calculate Routing operation cost
    ↓
Aggregate Routing costs by Work Center
    ↓
Compare Reference vs Current by Work Center
```

### 5.2 Work Center Role

Work Center has two connected roles:

```text
Routing → Work Center

1. Work Center supplies confirmed rate/master data used by Routing calculation.
2. Work Center is the aggregation level used to compare Processing Cost.
```

This is **not** a duplicate Work Center comparison branch.

The Work Center data has already participated in Routing cost calculation, and Work Center is then used as the processing aggregation/comparison level.

### 5.3 Example

```text
REFERENCE — WC PRINT

Printing = 10
Total Processing Cost = 10


CURRENT — WC PRINT

Printing A = 6
Printing B = 3
Total Processing Cost = 9


WC PRINT Gap
= Current - Reference
= 9 - 10
= -1
```

Candidate result:

```text
WC PRINT
Reference Cost: 10
Current Cost:    9
Gap:            -1
```

Routing operations may still be shown as drill-down detail, but they do not need to be matched one-to-one.

### 5.4 Future Extension

If Work Center aggregation later proves too coarse, Routing identity/mapping may be added in a future version.

It is intentionally out of scope now.

---

## 6. Candidate Statuses

The Candidate Prioritization page uses only three statuses:

```text
CHANGED
ADDED
REMOVED
```

`UNCHANGED` does not belong on this page because this page is for changed findings/candidates.

Status meaning:

```text
CHANGED
= The comparable candidate exists on both sides and its relevant value/cost changed.

ADDED
= The candidate exists only in Current.

REMOVED
= The candidate exists only in Reference.
```

Status describes the structural/change condition.

Gap describes the cost direction and magnitude.

Do not assume that `ADDED` always means a bad cost increase or that `REMOVED` always means an improvement.

---

## 7. Gap Convention

Use:

```text
Gap = Current - Reference
```

Interpretation:

```text
Gap > 0
→ Current cost is higher

Gap < 0
→ Current cost is lower

Gap = 0
→ No net cost difference
```

A structurally changed candidate with `Gap = 0` must still remain visible.

This also applies to a changed material finding whose calculated cost Gap is zero. The user, not the Gap sign or a hard-coded field allowlist, decides whether to prioritize it.

Example:

```text
Reference = 10
Current   = 10
Gap       = 0
Status    = CHANGED
```

The candidate stays visible because a real structural/value change still occurred.

---

## 8. Candidate Information

Each candidate should expose at least:

```text
Candidate / Finding
Status
Reference
Current
Gap
Controllable
```

Exact visual layout is not prescribed.

Example:

```text
Candidate: WC PRINT Processing Cost
Status: CHANGED
Reference: 10
Current: 9
Gap: -1
[✓] Controllable
```

---

## 9. Controllable

### 9.1 Default

Every candidate starts as:

```text
[✓] Controllable
```

Implementation default:

```text
controllable = true
```

### 9.2 User Behavior

If the user believes a candidate cannot be controlled, they uncheck it:

```text
[ ] Controllable
```

Implementation:

```text
controllable = false
```

### 9.3 Meaning

This checkbox is a **human mark**.

The system is not claiming that it has scientifically determined controllability.

Unchecked candidates:

- remain visible;
- are not deleted;
- are not blocked;
- remain part of the candidate pool.

---

## 10. Filtering

For the current scope, keep filtering intentionally simple.

Only provide status filtering, with multi-select behavior. Each status can be selected independently, and the visible candidates are the union of selected statuses:

```text
All     = CHANGED + ADDED + REMOVED
Changed = CHANGED only
Added   = ADDED only
Removed = REMOVED only
```

Default:

```text
All
```

`All` selects every available candidate status; it is a select-all control, not a candidate status. Any combination of `Changed`, `Added`, and `Removed` may be selected.

Do not add additional filters yet unless required later.

Examples intentionally out of scope for now:

```text
Material / Processing filter
Controllable filter
Cost Increase / Cost Decrease filter
Requirement Fit filter
Feasibility filter
```

---

## 11. Sorting / Ranking

The page may sort candidates by Gap.

Default order:

```text
Highest Gap → Lowest Gap
```

Example:

```text
+10
+5
+2
0
-1
-4
```

Negative and zero Gap candidates must remain visible.

Ranking is only a prioritization aid.

It must not automatically select a candidate for later improvement work.

---

## 12. What This Page Must Not Do

The Candidate Prioritization page must **not** include:

```text
Select for RCA
Requirement Fit
Feasibility checklist
Action input
Root Cause input
RCA form
Simulation
What-If
Routing manual mapping
New Routing identity requirements
```

The page must not force a candidate choice for RCA.

The decision about which candidate will be taken into later RCA / Simulation work belongs to a later flow.

---

## 13. Final Page Responsibility

The page is responsible only for:

```text
Receive Cost Breakdown findings
        ↓
Show CHANGED / ADDED / REMOVED candidates
        ↓
Show Reference / Current / Gap
        ↓
Aggregate Processing candidates by Work Center
        ↓
Allow status filtering
        ↓
Allow Gap-based sorting/ranking
        ↓
Default every candidate to [✓] Controllable
        ↓
User unchecks candidates that are not controllable
        ↓
End Candidate Prioritization
```

---

## 14. Final Baseline

```text
CANDIDATE PRIORITIZATION

Source:
Cost Breakdown / Comparison findings

Material:
Use material-level changed findings

Processing:
Routing cost
→ Work Center reference/rates
→ Aggregate by Work Center
→ Reference vs Current WC processing gap

Candidate statuses:
CHANGED
ADDED
REMOVED

Candidate fields:
Reference
Current
Gap
[✓] Controllable

Filter:
All | Changed | Added | Removed

Default filter:
All

Sort:
Gap descending by default

Controllable:
Checked by default
User unchecks if not controllable

Not included:
RCA selection
Action
RCA form
Simulation
What-If
Requirement / Feasibility checklist
Routing mapping / new Routing ID
```

This is the finalized behavioral baseline for the Candidate Prioritization page.
