# Simulation BOM / RTG — Final UX Requirements

**Status:** Requirement CLOSED / Finalized  
**Implementation status:** Not closed until implementation + browser re-audit pass  
**Scope:** Simulation page — BOM and RTG tables only

---

## 1. Purpose

This document defines the finalized UX and interaction requirements for the Simulation BOM and RTG tables.

The goal of this round is to finish the table experience without reopening business logic, formulas, Simulation semantics, or unrelated pages.

---

## 2. Scope Boundaries

### In scope

- BOM row expand / collapse
- RTG row expand / collapse
- Parameter Cost Effect expanded detail presentation
- Material Cost / Conversion Cost header alignment
- Body-only table scrolling and fixed/opaque headers
- Signed effect formatting and coloring
- Safe outside-dismiss behavior
- Existing selection and drag-selection behavior preservation
- Browser verification of the above

### Out of scope

Do **not** change:

- Simulation formulas
- Result logic
- Economics
- Clone / Send / Reset semantics
- Current / Reference / Custom semantics
- Graph behavior
- Master Data
- Cost Breakdown business logic
- calculation scope
- invalid-input business rules

---

# 3. Row Expand / Collapse

## 3.1 Safe row-area toggle

A normal, non-interactive area of a BOM or RTG row may toggle the row's `Parameter Cost Effect` detail.

Expected behavior:

- closed row + safe row click → opens
- open row + same safe row click → closes
- same row can be opened and closed repeatedly
- no auto-collapse conflict

## 3.2 Keyboard behavior

When the row itself is the active row interaction target:

- `Enter` toggles the expanded detail
- `Space` toggles the expanded detail

Keyboard behavior must not alter the row's business data.

## 3.3 Nested controls must not toggle the row

Interacting with nested controls must **not** open/close the row.

Examples:

- NumericInput
- `#` row-selection control
- drag-selection interaction
- other valid row controls
- interactive content inside expanded detail

## 3.4 Chevron behavior

The chevron is an **indicator of open/closed state**, not a second independent expand/collapse mechanism with separate behavior.

The row interaction must remain the single coherent source of expand/collapse semantics.

---

# 4. Parameter Cost Effect — Expanded Hierarchy

The expanded detail must visually read as a child of its parent row, similar to the existing Cost Breakdown expanded-detail language.

## 4.1 Left hierarchy guide

Add a subtle vertical guide / child indicator on the left side of the expanded detail.

Target visual weight:

```text
subtle vertical guide
approximately border-l-2 / slate-like neutral tone
```

It must remain visually light; do not turn the detail into a heavy card.

## 4.2 Move only the label

Move only the text label:

```text
Parameter Cost Effect
```

slightly to the right so that it clearly reads as nested beneath the parent row.

### Critical rule

**Do not move the numeric effect values.**

The values must remain on the same existing numeric axes/columns as before.

### BOM mapping

```text
Price effect   → Price column
Usage effect   → Usage column
Loss effect    → Loss column
Total          → Material Cost column
```

Example:

```text
Parent BOM row
│
└── Parameter Cost Effect           +x.xx      -x.xx      +x.xx      Total +x.xx
                                    Price      Usage       Loss       Material Cost
```

The label moves. The values do not.

### RTG mapping

```text
Manning effect  → Manning column
Capacity effect → Capacity column
Yield effect    → Yield column
Total           → Conversion Cost column
```

Example:

```text
Parent RTG row
│
└── Parameter Cost Effect           +x.xx      -x.xx      +x.xx      Total +x.xx
                                    Manning    Capacity    Yield      Conversion Cost
```

Again: **move only the label/hierarchy presentation, not the numeric detail row.**

---

# 5. Material Cost / Conversion Cost Header Alignment

The numeric values in the rightmost cost columns are already considered correctly aligned.

The problem is the **header label position**, not the value axis.

## 5.1 BOM — Material Cost

Adjust only the `Material Cost` header label so it visually centers/aligned over the numeric values beneath it.

Do not shift the working Material Cost numbers unless absolutely necessary.

Desired relationship:

```text
          Material Cost
                ↓
              25.20
               5.10
              16.15
```

## 5.2 RTG — Conversion Cost

Apply the same alignment language to `Conversion Cost`.

```text
        Conversion Cost
                ↓
               1.68
               5.71
              43.65
```

## 5.3 Consistency rule

`Material Cost` and `Conversion Cost` should visually behave as the same kind of right-side numeric column.

Do not solve the header-label issue by disturbing already-correct numeric alignment.

---

# 6. Table Scroll Ownership / Header Behavior

This must be fixed structurally and reliably for **both BOM and RTG**.

## 6.1 Required structure

Conceptually:

```text
HEADER — fixed / fully visible / opaque
---------------------------------------
SCROLLABLE BODY
```

Only the body should vertically scroll.

## 6.2 Header requirements

The header must:

- stay fully visible
- stay fully opaque
- remain visually above all normal rows
- remain visually above all expanded Parameter Cost Effect rows
- keep a clear bottom separation
- never be visually consumed by the body or scrollbar

## 6.3 Expanded-row requirement

When expanded details scroll upward, they must pass **under** the header and never appear through or on top of it.

## 6.4 Do not rely on z-index alone

If the actual issue is scroll-container ownership/layout structure, fix the correct scroll owner instead of only repeatedly increasing z-index.

## 6.5 Verification states

Verify independently for BOM and RTG with:

- many rows
- no expanded row
- one expanded row
- multiple expanded rows if supported
- scroll to top
- mid-scroll
- scroll to bottom

---

# 7. Signed Effect Formatting

Signed Parameter Cost Effect values must be easy to scan.

## 7.1 Positive

```text
+2.35
```

- keep explicit `+`
- use green semantic text color

## 7.2 Negative

```text
-1.20
```

- keep explicit `-`
- use red semantic text color

## 7.3 Zero

```text
0.00
```

- neutral color
- **must not show `+0.00`**

## 7.4 Color is supplemental

The sign remains visible in text. Color does not replace the `+` / `-` sign.

This rule should be applied consistently to visible signed effect values where appropriate.

---

# 8. Total Formatting

The expanded total format is finalized as:

```text
positive → Total +2.35
negative → Total -1.20
zero     → Total 0.00
```

## 8.1 Critical zero rule

Never render:

```text
Total +0.00
```

## 8.2 Color behavior

- `Total` label remains neutral
- positive numeric value → green
- negative numeric value → red
- zero numeric value → neutral

## 8.3 Alignment

The Total numeric value must stay on the existing cost numeric axis:

- BOM Total → Material Cost axis
- RTG Total → Conversion Cost axis

Do not move the Total value merely because the `Parameter Cost Effect` label is indented.

---

# 9. Selection / Drag Behavior — Preserve Existing Semantics

This round must not regress the existing selection behavior.

## 9.1 Row selection control

Drag selection begins from the existing `#` row-number control.

## 9.2 Drag mode

If drag begins on an unselected eligible row:

```text
traversed eligible rows become selected
```

If drag begins on a selected eligible row:

```text
traversed eligible rows become deselected
```

## 9.3 Expansion isolation

Dragging from `#` must never expand/collapse the row.

## 9.4 Selected-first stability

Selected-first presentation must not corrupt row identity.

Requirements:

- stable key identity is preserved
- displayed original row number remains correct
- expanding one row still expands the correct row after ordering changes
- drag selection still targets the correct rows

## 9.5 Header `#`

Header selection control keeps normal:

```text
none / mixed / all
```

semantics.

---

# 10. Safe Outside Dismiss

Expanded Parameter Cost Effect is a transient UI state and should dismiss when the user clicks genuinely safe blank workspace outside the active detail.

## 10.1 Basic behavior

```text
row A expanded
→ click safe blank workspace
→ row A detail closes
```

## 10.2 Do not dismiss on legitimate interaction

Do **not** dismiss merely because the user interacts with:

- NumericInput
- `#`
- selection controls
- drag select/deselect
- expanded detail content
- valid row controls
- other nested interactive elements

## 10.3 Switching rows

If row A is expanded and the user clicks safe row area of row B:

```text
row A may dismiss
AND
row B must still receive its own intended click action
```

The outside-dismiss system must not swallow the actual click.

## 10.4 Shared transient behavior

Where the existing application already has a shared safe workspace-dismiss mechanism, this behavior may integrate with it, but only without introducing interaction conflicts.

---

# 11. Invalid / Protected Data Behavior

This UX refinement must not change invalid-input or protected-row semantics.

Preserve:

- invalid-input safeguarding
- protected/invalid row behavior
- calculation availability rules
- full Simulation snapshot calculation scope

Selection must never redefine calculation scope.

---

# 12. Example — Desired BOM Expanded Row

```text
#   Material       Status       Price      Usage      Loss      Material Cost
--------------------------------------------------------------------------------
1   MAT-A          UNCHANGED    12.00      2.00       5.00%          25.20      ˅
    │
    └── Parameter Cost Effect   +1.20      -0.50      +0.10      Total +0.80
                                 green      red        green          green
```

Notes:

- hierarchy guide is only a visual relationship aid
- `Parameter Cost Effect` label is indented
- effect values remain aligned to Price / Usage / Loss
- Total remains aligned to Material Cost
- header remains fixed when body scrolls

---

# 13. Example — Desired RTG Expanded Row

```text
#   Routing Process   Status      Manning    Capacity    Yield    Conversion Cost
---------------------------------------------------------------------------------
3   OP-21             CHANGED      26.00      1190.00     9.01          43.65      ˅
    │
    └── Parameter Cost Effect     +49.18      -57.28    +45.56      Total +37.46
                                   green        red       green           green
```

Notes:

- the numeric effect values stay on their current RTG columns
- only the hierarchy/label presentation shifts right
- Total stays on Conversion Cost axis

---

# 14. Browser Verification Checklist

Verify **BOM and RTG separately**.

- [ ] Safe row click opens detail
- [ ] Same row closes again
- [ ] Enter toggles correctly
- [ ] Space toggles correctly
- [ ] Nested input does not toggle row
- [ ] `#` does not toggle row
- [ ] Chevron reflects state without conflicting behavior
- [ ] Drag select from unselected row selects traversed eligible rows
- [ ] Drag select from selected row deselects traversed eligible rows
- [ ] Drag does not expand rows
- [ ] Selected-first ordering preserves stable row identity
- [ ] Header `#` supports none / mixed / all
- [ ] Left hierarchy guide is visible but subtle
- [ ] Only `Parameter Cost Effect` label moves right
- [ ] BOM effect numbers remain aligned to Price / Usage / Loss
- [ ] BOM Total remains aligned to Material Cost
- [ ] RTG effect numbers remain aligned to Manning / Capacity / Yield
- [ ] RTG Total remains aligned to Conversion Cost
- [ ] Material Cost header is centered/aligned over its values
- [ ] Conversion Cost header is centered/aligned over its values
- [ ] Only body scrolls vertically
- [ ] Header remains fully opaque
- [ ] Normal rows never draw over header
- [ ] Expanded rows never draw over header
- [ ] Positive effect displays `+` and green
- [ ] Negative effect displays `-` and red
- [ ] Zero displays `0.00` with neutral color
- [ ] Zero never displays `+0.00`
- [ ] `Total` label remains neutral
- [ ] Outside safe-space click dismisses detail
- [ ] Clicking inside detail does not dismiss
- [ ] NumericInput interaction does not dismiss
- [ ] `#` interaction does not dismiss
- [ ] Switching to another row does not swallow the new row action
- [ ] Invalid/protected behavior is unchanged
- [ ] No Graph behavior is changed by this round

---

# 15. Closure Criteria

BOM / RTG may be considered **CLOSED** only when:

1. all requirements above are implemented,
2. browser interaction has been checked for both BOM and RTG,
3. scrolling/header overlap is visibly resolved,
4. no regression is found in selection/drag/keyboard behavior,
5. sign/zero formatting is correct,
6. outside-dismiss is conflict-free,
7. relevant focused verification/build checks pass,
8. any item that cannot be physically verified is explicitly reported as `NOT VERIFIED` rather than assumed to pass.

