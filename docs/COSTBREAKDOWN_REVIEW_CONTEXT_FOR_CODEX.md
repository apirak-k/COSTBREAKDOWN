# COSTBREAKDOWN — Complete Review Context for Codex

**Purpose:** This file is a complete handoff of the product/system discussion so far. It is intentionally broader than a final spec and contains:

- verified current-system behavior
- finalized decisions
- confirmed new requirements
- design directions
- implementation principles
- items that are still pending or undecided

**Instruction to Codex:** Read this document as the full review context and extract the implementation spec from it. Do **not** assume every section is final. Respect the status markers.

Status labels used below:

- **FINALIZED** — agreed and closed
- **CONFIRMED** — agreed requirement, but neighboring details may still be pending
- **CURRENT BASELINE** — verified current behavior, not automatically part of the redesign
- **DESIGN DIRECTION** — intended UX/UI direction, not exact implementation
- **PENDING** — intentionally deferred
- **UNDECIDED** — explicitly not settled
- **DO NOT ASSUME** — avoid inventing behavior/formulas

---

# 1. Project and Review Intent

The project is `apirak-k/COSTBREAKDOWN`.

The goal is a substantial redesign/refactor of the current COSTBREAKDOWN system.

The review process is:

1. Understand the current system.
2. Review each page and flow.
3. Capture mentor requirements and user decisions.
4. Close each page behaviorally before redesigning visual details.
5. After all pages are reviewed, consolidate into a new final agreement/spec.
6. Then design UX/UI.
7. Then do implementation/refactor.

The user does not want to repeatedly inspect the existing system manually. The assistant/Codex should derive and explain current behavior from the repo/spec when needed.

The user prefers:

- behavior/spec first
- UX/UI later
- calculation correctness over UI convenience
- explicit source-of-truth documents
- separation of product spec, design spec, and implementation plan
- minimal unnecessary complexity
- no invented behavior when the requirement is not yet decided

---

# 2. Verified Repository / Branch Context

## 2.1 Branches discussed

- `current`
  - current implementation/refactor baseline
- `baddie/uiux-refresh`
  - UX/UI experiment based directly on `current`
  - useful source of interaction and information-architecture ideas
  - not to be copied wholesale
- `feature/taste-frontend-ui`
  - older design-language reference
  - visually useful
  - not a valid implementation base because it is old

## 2.2 Design-skill provenance

`feature/taste-frontend-ui` was built with a design standard centered on `taste-frontend`.

Useful design references discussed:

- compact industrial / engineering console feel
- restrained neutral palette
- dark application chrome
- light working canvas
- dense but readable information
- tabular numbers
- monospace for engineering/financial values where useful
- avoid generic AI gradients
- avoid decorative card nesting
- avoid unnecessary shadows
- prioritize clear microcopy
- responsive layout

These are design references only, not behavioral requirements.

---

# 3. Current System Baseline

This section records current behavior for review. It is not automatically the new spec.

## 3.1 Current top-level flow

Current navigation:

1. Master Data
2. Cost Breakdown
3. Candidate Prioritization
4. RCA & Simulation

Trial is currently only a handoff/selection concept and does not have a full workflow.

---

# 4. Current Master Data Baseline

**CURRENT BASELINE**

Current system originally had:

- Reference / Current datasets
- dataset-specific editing
- View Mode / Edit Mode
- BOM
- Routing
- Work Center
- Setup
- Import
- Export
- Template
- Clear Data
- readiness indicators

Old field sets were larger than desired and contained fields that the user considers unnecessary.

This page has now been fully reviewed and the new Master Data behavior is closed below.

---

# 5. Master Data — Finalized New Behavior

**FINALIZED**

Master Data review is closed behaviorally.

Visual styling and exact layout are deferred to the UX/UI phase.

---

# 6. Session Model

**FINALIZED**

The application has:

- no database
- no persistence across application restart
- no save history
- no archive
- no version timeline

All state exists only in the current runtime/session.

```text
Open app
→ start fresh session
→ work with Reference / Current
→ close/restart app
→ everything from session is gone
```

---

# 7. Reference / Current State Model

**FINALIZED**

Reference and Current are independent datasets.

Each has:

```text
Working
Last Saved
```

Example:

```text
Reference
├─ Working
└─ Last Saved

Current
├─ Working
└─ Last Saved
```

They save independently.

Saving one does not modify the other.

Only the latest saved state is kept.

There is no Save #1 / Save #2 / Save #3 history.

---

# 8. Save

**FINALIZED**

Save applies only to the currently selected dataset.

```text
Save Reference
→ Reference Working replaces Reference Last Saved
→ Current unchanged
```

```text
Save Current
→ Current Working replaces Current Last Saved
→ Reference unchanged
```

Saving again overwrites the previous Last Saved state.

---

# 9. Reset

**FINALIZED**

Reset applies only to the currently selected dataset.

```text
Working
→ Reset
→ Last Saved
```

Reset does not affect the other dataset.

The exact UI behavior before the first Save is still a UX detail, not finalized.

---

# 10. Export

**FINALIZED**

Export always uses the **Last Saved** state of the selected dataset.

Unsaved Working changes are not exported.

```text
Working changes
→ not saved
→ Export
→ Last Saved is exported
```

If no saved state exists yet, there is no valid saved source to export.

Exact disabled/error presentation is deferred to UX/UI.

---

# 11. Import

**FINALIZED**

Import writes into the Working state of the currently selected dataset.

It does not become saved until the user explicitly presses Save.

---

# 12. Clear

**FINALIZED**

Clear affects only Working state.

```text
Clear
→ Working cleared
```

Last Saved is retained.

Therefore:

```text
Clear
→ Reset
→ restore Last Saved
```

---

# 13. Clone

**FINALIZED**

Clone is initiated from the dataset currently being viewed.

The **current dataset is the destination**.

Meaning:

```text
Viewing Current
→ Clone
→ copy Reference into Current Working
```

```text
Viewing Reference
→ Clone
→ copy Current into Reference Working
```

Clone only changes Working.

Save is still required to replace Last Saved.

Mental model:

- Save → acts on this dataset
- Reset → acts on this dataset
- Import → acts on this dataset
- Clear → acts on this dataset
- Clone → bring the other dataset into this dataset

---

# 14. Master Data Main Structure

**FINALIZED behaviorally**

Conceptual structure:

```text
Header / Navigation / Status

Reference | Current
View Mode | Edit Mode

Sizing | Import | Export | Clone | Reset | Clear | Save

BOM | WC | Routing | All Tables

Metadata

Data table(s)

Footer / context summary
```

Exact spacing, component placement, color, density, etc. are deferred to UX/UI.

---

# 15. View Mode / Edit Mode

**FINALIZED**

View Mode:

- read-only
- search allowed
- navigation allowed
- switching dataset/table allowed

Edit Mode:

- direct cell editing
- spreadsheet-style keyboard use
- copy/paste
- row selection
- bulk edits
- add/delete rows
- row reorder
- undo/redo where practical

---

# 16. Metadata

**FINALIZED**

New metadata is:

- Product Name
- UOM
- Selling Price
- SG&A
- Dataset Remark

Removed:

- Product Code
- separate Product Description
- Product Note

Product Code + Product Description are simplified into:

```text
Product Name
```

---

# 17. Selling Price

**CONFIRMED**

Selling Price is dataset-level metadata.

Reference and Current can have different values.

Currency scope for now:

```text
THB only
```

No currency selector is required yet.

---

# 18. SG&A

**CONFIRMED**

SG&A is dataset-level metadata.

The user enters SG&A as:

```text
% of Selling Price
```

Example:

```text
Selling Price = 120.00 THB
SG&A = 8.00 %
```

Do not store SG&A as user-entered THB in Master Data.

Exact accounting formula is intentionally deferred.

---

# 19. Sizing

**FINALIZED**

Old `Setup` is replaced by:

```text
Sizing
```

Sizing contains:

## Metadata

- Product Name
- UOM
- Selling Price (THB)
- SG&A (%)
- Dataset Remark

## Dataset size

- BOM row count
- WC row count
- Routing row count

## Actions

- Apply
- Download Template

---

# 20. Sizing Metadata Synchronization

**FINALIZED**

Sizing does not have a separate metadata state.

It uses the same Working Dataset metadata as Master Data.

If metadata is already entered on Master Data:

```text
Open Sizing
→ preload those values
```

If metadata is edited in Sizing and Apply is pressed:

```text
Sizing values
→ update selected Working Dataset
```

---

# 21. Template

**FINALIZED**

`Download Template` belongs inside Sizing.

There is no separate Template button on the main toolbar.

The template uses:

- current Sizing metadata values
- BOM row count
- WC row count
- Routing row count

Old Reset inside Setup/Sizing is removed.

Dataset Reset remains separate and means:

```text
Working → Last Saved
```

---

# 22. Table Order

**FINALIZED**

The table order is:

1. BOM
2. WC
3. Routing

This applies to:

- table selector
- All Tables view
- vertical ordering

Reasoning:

- BOM first
- WC before Routing because Routing references WC
- Routing is often the longest, so it is last

---

# 23. Table Schemas

**FINALIZED**

Only these fields are required.

Old extra fields should not be retained just because they existed before.

## BOM

```text
# | Name | Usage | Unit | Price | Loss | Note
```

Dataset fields:

- Name
- Usage
- Unit
- Price
- Loss
- Note

## WC

```text
# | WC | Labor | Burden | Note
```

Dataset fields:

- WC
- Labor
- Burden
- Note

## Routing

```text
# | Process | WC | Manning | Cap | Yield | Note
```

Dataset fields:

- Process
- WC
- Manning
- Cap
- Yield
- Note

---

# 24. Row Number

**FINALIZED**

`#` is display-only.

It is not:

- business identity
- comparison identity
- Routing sequence
- a persisted business key

It only tells the user which visible row they are looking at.

---

# 25. Row Reorder

**FINALIZED**

Rows can be reordered by drag-and-drop.

After reorder, row numbers recalculate.

Example:

```text
Before
1 A
2 B
3 C

Move C to top

After
1 C
2 A
3 B
```

Reordering is a Working Dataset change.

Save preserves the latest ordering in Last Saved.

Reset restores Last Saved ordering.

Export uses Last Saved ordering.

However:

> Reordering alone must not create a comparison CHANGED status.

---

# 26. Comparison Identity vs Row Order

**FINALIZED principle**

Comparison must never pair by row number.

Under the simplified schemas, intended pairing is:

- BOM → Name
- WC → WC
- Routing → Process

Example:

```text
Reference
1 A
2 B
3 C

Current
1 C
2 A
3 B
```

Must pair:

```text
A ↔ A
B ↔ B
C ↔ C
```

Not:

```text
Row 1 ↔ Row 1
```

Ambiguous duplicates should become data-quality warnings instead of being silently matched by position.

---

# 27. Spreadsheet-Style Editing

**FINALIZED direction**

The tables should reuse useful Excel-like behavior.

They should not become a full spreadsheet application.

Core behavior:

- click cell to edit
- Arrow keys move between cells
- Enter moves down
- Shift+Enter moves up
- Tab moves right
- Shift+Tab moves left
- Escape cancels/exits edit state where appropriate
- Ctrl/Cmd+C
- Ctrl/Cmd+V
- paste tabular data copied from Excel
- copy/paste within grid
- undo/redo where practical

---

# 28. Copy / Paste

**FINALIZED**

The grid should support pasted tabular data from Excel.

Values map by row/column.

Invalid pasted cells should be flagged locally rather than causing the whole operation/page to fail.

---

# 29. Undo / Redo

**CONFIRMED direction**

Working edits should support familiar undo/redo where practical:

- Ctrl/Cmd+Z
- Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z

This is only Working-state editing history.

It is not persistent Save history.

---

# 30. Row Controls: Selection vs Reorder

**FINALIZED**

Selection and movement must not share the same drag gesture.

Use a narrow row-control gutter:

```text
[drag handle] [#] | data columns...
```

Both controls are outside the actual dataset schema.

---

# 31. Drag Handle

**FINALIZED**

Drag handle is used only for:

```text
row reorder
```

If multiple rows are selected, dragging a selected row may move the selected group while preserving group order.

---

# 32. Row Header / #

**FINALIZED**

The `#` area is used for row selection.

Expected behavior:

- click → select one row
- drag across row headers → select a continuous row range
- Shift+click → range selection
- Ctrl/Cmd+click → add/remove non-contiguous rows

The `#` area is not used for reorder.

---

# 33. Data Cells

**FINALIZED**

Data cells are reserved for spreadsheet interaction:

- edit
- navigation
- copy/paste
- cell-range interaction where useful

This keeps selection, reorder, and editing gestures separate.

---

# 34. Bulk Editing

**FINALIZED**

Bulk edit rule:

```text
Selected rows + edited column
→ apply the edited value to the same column for all selected rows
```

Example:

```text
Selected rows:
2
5
8

Edit Loss = 5%
```

Result:

```text
Row 2 Loss = 5%
Row 5 Loss = 5%
Row 8 Loss = 5%
```

Other columns remain unchanged.

This applies consistently to:

- BOM
- WC
- Routing

Examples:

```text
BOM selected rows + Unit = KG
→ only Unit changes for selected rows
```

```text
WC selected rows + Burden = 12.5
→ only Burden changes
```

```text
Routing selected rows + WC = WC-A
→ only WC changes
```

A large separate Bulk Edit modal is not required for this core behavior.

---

# 35. Add / Delete

**FINALIZED**

All three tables support:

- Add Row
- Delete selected row(s)

Multi-row delete is supported.

Exact control placement is UX/UI work.

---

# 36. Search

**FINALIZED**

Master Data tables use:

```text
Search only
```

No separate filter system is required in Master Data.

Each table has its own search.

In All Tables mode, each section may have its own search.

Search changes presentation only.

It does not mutate the dataset.

---

# 37. Validation

**CONFIRMED principle**

Validation is local and informative, not page-blocking.

Examples:

- invalid numeric value
- invalid percentage
- missing WC reference
- duplicate/ambiguous identity

Preferred behavior:

```text
detect issue
→ mark relevant cell/row
→ explain issue
→ user may continue working
```

Do not fabricate calculations when data is invalid.

---

# 38. Routing → WC Reference

**CONFIRMED**

Routing.WC should refer to values defined in the WC table.

The UI should help prevent typos, such as:

- dropdown
- autocomplete

Exact visual control is UX/UI work.

---

# 39. Header / Footer Structural Direction

**CONFIRMED DESIGN DIRECTION**

The user's Master Data mockup is accepted as the structural direction for non-table areas.

Exact final visual design is still pending.

## Header role

Header should communicate:

- application/product context
- current Product Name
- high-level workflow/system status
- primary navigation

Conceptually:

```text
COST BREAKDOWN | Product | STATUS | Navigation
```

## Footer role

Footer should communicate current working context/result summary, such as:

- Reference BOM/WC/Routing counts
- Current BOM/WC/Routing counts
- compact calculation summary

Exact financial metrics shown in footer are pending calculation review.

---

# 40. Global Status Principle

**CONFIRMED**

Status should tell the user what is happening and where to review it.

Warnings generally do not block navigation.

Examples:

- Ready for comparison
- Product mismatch
- Missing data
- Selected Comparison Mode

Principle:

```text
Status ≠ blocker
```

Typical pattern:

```text
detect issue
→ inform user
→ explain impact
→ provide relevant destination/action
→ allow continue
```

Only logically impossible operations should be unavailable.

---

# 41. Product Mismatch

**CONFIRMED**

If:

```text
Reference Product Name ≠ Current Product Name
```

show Product Mismatch.

It does not block navigation.

The system must not silently assume they are the same product.

---

# 42. Missing Data

**CONFIRMED**

Missing data should produce warning/partial unavailable states, not block navigation by default.

If something cannot be calculated correctly:

- show unavailable / warning state
- do not fabricate a number

---

# 43. Cost Breakdown — Current Baseline

**CURRENT BASELINE**

Current Cost Breakdown calculates Reference and Current independently.

Current Standard Cost structure:

```text
Material + Labor + Burden = Total Standard Cost
```

Current Gap:

```text
Current - Reference
```

Current statuses:

- UNCHANGED
- CHANGED
- ADDED
- REMOVED

Status and Gap are separate concepts.

Current page has:

- Executive KPI cards
- Snapshot Comparison
- Variance Tree
- detailed BOM/Routing/WC comparison

Potential issue identified:

- summary hierarchy is somewhat duplicated

No final redesign has been locked yet.

---

# 44. Selected Comparison Mode

**CONFIRMED**

Cost Breakdown will gain an optional:

```text
Selected Comparison Mode
```

Default behavior remains:

```text
Full Comparison
```

User explicitly enters Selected Comparison Mode from Cost Breakdown.

This is not part of Master Data Save.

---

# 45. Selected Comparison Scope

**CONFIRMED**

Partial selection applies only to:

- BOM
- Routing

WC is not partially selected.

WC remains complete supporting context for Routing calculations.

---

# 46. Selection Rules

**CONFIRMED**

For matched findings:

- CHANGED → select Reference + Current as one pair
- UNCHANGED → select Reference + Current as one pair

Selection is atomic for the pair.

For unmatched findings:

- ADDED → independently selectable
- REMOVED → independently selectable

---

# 47. Partial Comparison Is Temporary

**FINALIZED principle**

Selected Comparison Mode is temporary analysis state.

It is:

- not saved into Reference
- not saved into Current
- not exported
- not versioned
- not persistent across restart

There is no Save for partial selection.

---

# 48. Partial Comparison Does Not Mutate Data

**FINALIZED principle**

Selected comparison scope is not a dataset edit.

Unselected records remain in Reference/Current.

Do not interpret:

```text
not selected
```

as:

```text
does not exist in product
```

Full dataset calculation context remains intact.

---

# 49. Downstream Use of Selected Scope

**CONFIRMED**

Once Selected Comparison Mode is active:

```text
Cost Breakdown
→ Candidate Prioritization
→ RCA
→ Simulation
```

continues through the normal steps, but using the selected analysis scope.

Exact downstream UI is still pending page-by-page review.

---

# 50. Exiting Selected Comparison Mode

**CONFIRMED**

Selected Comparison Mode can be cancelled.

The system may show that the mode is active across downstream pages.

The user can return to Cost Breakdown to review or exit the mode.

Exact indicator placement is UX/UI work.

---

# 51. If Source Data Changes During Selected Comparison

**FINALIZED**

Keep it simple.

If Reference or Current actually changes:

```text
source data changes
→ immediately exit Selected Comparison Mode
→ clear temporary selection
→ return to Full Comparison
```

Do not:

- remap old selections
- preserve stale selections
- ask complex recovery questions
- create selection checkpoints

---

# 52. Candidate Prioritization — Current Baseline

**CURRENT BASELINE**

Current page uses comparison findings.

Current candidate groups:

- Material candidate from BOM findings
- Processing candidate from Routing aggregated by WC

Current candidate statuses:

- CHANGED
- ADDED
- REMOVED

UNCHANGED is not currently a candidate.

Current default ordering:

- Gap descending
- rank assigned 1-based

Current Controllable:

- human-editable checkbox
- ranking does not auto-select

Final redesign for this page is not yet reviewed.

---

# 53. RCA & Simulation — Current Baseline

**CURRENT BASELINE**

Current page:

- requires user-selected candidate
- does not auto-select candidate
- includes Problem Statement
- stores Root Cause and Action as notes
- Root Cause/Action do not affect calculations
- has Scenario A/B/C
- each scenario starts from Current
- blank scenario field falls back to Current
- simulation does not mutate Current/Reference
- supports numeric overrides
- structural simulation is not currently supported
- scenario standard-cost result is recalculated
- current page also contains improvement economics inputs/results
- Trial handoff currently only selects Scenario A/B/C

Final redesign is pending.

---

# 54. Mentor Requirement — Interactive Business Dashboard

**CONFIRMED REQUIREMENT**

Mentor wants:

- interactive graph
- simulation changes should update the graph live
- dashboard-like experience
- business storytelling
- quick executive understanding
- ability to drill into detail

Desired principle:

```text
Executive first
Detail on demand
```

and:

```text
Result
→ Cause
→ Detail
```

---

# 55. Mentor Business Metrics Mentioned

**CONFIRMED as required concepts, formulas not finalized**

Discussed concepts include:

- Selling Price
- SG&A
- Material
- Processing
- COGS
- GP
- GP Margin
- OP
- OP Margin
- Sales
- Volume / Quantity

Exact formula definitions are intentionally deferred.

---

# 56. OP

**CONFIRMED**

OP must support negative values.

Example meaning:

```text
OP < 0
→ operating loss
```

Do not clamp OP to zero.

Exact OP formula is pending calculation review.

---

# 57. Graph Direction

**DESIGN DIRECTION**

Mentor specifically mentioned a bar-chart style because executives should understand the result quickly.

Bar-chart-first is a direction, not a final chart specification.

Do not hardcode a chart model before the business formulas and final UX are reviewed.

---

# 58. Real-World Dashboard Reference

A mentor reference dashboard was discussed.

Useful conceptual pattern:

```text
business result
→ drivers
→ context
→ drill-down evidence
```

Do not copy the dense Excel/PowerPoint visual literally.

The redesign should extract the storytelling logic, not imitate the exact cluttered layout.

---

# 59. Business / P&L Layer Concept

**DESIGN / ARCHITECTURE DIRECTION**

Current engineering cost data:

```text
BOM + Routing + WC
→ Cost Engine
→ Material + Processing
```

New business inputs may sit above that:

```text
Selling Price / SG&A / Volume / ...
→ Business Impact Layer
→ Sales / COGS / GP / OP / margins
```

Conceptual separation:

```text
Engineering / Cost Data
        ↓
Cost Engine
        ↓
Material + Processing
        ↓
Business assumptions
        ↓
Business Impact Engine
        ↓
Business KPIs / Dashboard
```

This is a conceptual architecture direction.

Exact implementation boundaries and formulas are pending.

---

# 60. UI Must Not Own the Formula

**CONFIRMED PRINCIPLE**

Even though the current review is focused on frontend/logic, calculation correctness has priority.

The UI should:

- collect input
- show state
- show results
- provide interactions

The UI should not contain scattered business formulas.

Calculation/domain logic should remain separate from presentation.

This does not require a backend server.

It can still exist in the same frontend codebase as separate domain/application logic.

---

# 61. Simulation Overrides for Business Inputs

**CONFIRMED direction**

Simulation should be able to override business assumptions such as:

- Selling Price
- SG&A %

without mutating the saved dataset.

Conceptually:

```text
Current dataset value
→ scenario uses current by default
→ scenario override replaces only scenario value
→ clearing override falls back to current
```

Exact simulation UI is pending.

---

# 62. Business Metric Formulas

**PENDING**

Do not treat these as final:

- COGS formula
- GP formula
- GP Margin formula
- OP formula
- OP Margin formula
- Sales formula
- Total GP
- Total OP
- exact SG&A treatment in monetary terms

The user explicitly wants calculation reviewed later.

---

# 63. Variance Terms

**UNDECIDED**

The real-world dashboard contained:

- MatVAR
- LBVAR
- BDVAR

Do not assume these equal:

```text
Reference - Current Gap
```

These may be accounting/manufacturing variance concepts.

They remain undecided until their business meaning and data source are confirmed.

---

# 64. Currency

**CONFIRMED**

Use:

```text
THB
```

for now.

Multi-currency support is not required yet.

---

# 65. UX/UI Timing

**CONFIRMED PROCESS**

Do not prematurely lock visual details while page behavior is still being reviewed.

Current phase:

```text
what exists
what changes
what belongs where
what state/flow means
```

Later phase:

```text
exact layout
visual hierarchy
spacing
colors
buttons
component styling
responsive behavior
```

---

# 66. Master Data Visual Mockup

The user supplied a Master Data mockup.

The general non-table structure is accepted as a direction.

Everything in the mockup except the actual old table schemas should be treated as a useful structural reference.

The table schemas must use the newly agreed fields.

Do not blindly preserve old table columns shown in old implementation screenshots.

---

# 67. Header / Footer Status Across the Product

**CONFIRMED concept**

A persistent status/context area is desirable.

Potential states include:

- Ready for comparison
- Product mismatch
- Missing data
- Selected Comparison Mode

The status can link/direct the user to the relevant page.

Example:

```text
Ready for comparison
→ link/action toward Cost Breakdown
```

```text
Product mismatch
→ link/action toward Master Data
```

```text
Missing data
→ link/action toward Master Data
```

Selected Comparison Mode may remain visible across downstream pages.

Exact location:

- header
- footer
- status bar

is deferred to UX/UI.

---

# 68. Warning Philosophy

**CONFIRMED**

Warnings should usually not block.

Examples:

- Product mismatch
- Missing data
- invalid/missing noncritical inputs

The system should allow the user to continue while clearly communicating impact.

Only impossible operations should be disabled.

---

# 69. Calculation Integrity

**CONFIRMED**

If required inputs are missing:

- do not fabricate numbers
- use unavailable / N/A / warning states
- preserve transparency

Calculation correctness is more important than showing a complete-looking dashboard.

---

# 70. Trial

**PENDING**

Trial is not yet fully specified.

Current implementation only stores a selected Scenario A/B/C handoff.

Future workflow may need:

- execution
- validation
- approval
- promote/accept

None of that is finalized yet.

---

# 71. Product Session Architecture

**CURRENT BASELINE / REFACTOR HOTSPOT**

Current internal implementation contains ProductSession concepts.

The current UI no longer exposes the old product/session selector.

This mismatch between internal multi-session architecture and current UI is a refactor hotspot.

No final new session/product architecture has been agreed yet.

Do not preserve old hidden architecture merely because it exists.

---

# 72. Master Data Revision / Invalidation Principle

**CURRENT BASELINE / PRINCIPLE WORTH PRESERVING**

Current implementation uses revision-style invalidation so downstream RCA/simulation state does not remain stale after relevant Master Data changes.

The newly agreed Selected Comparison rule simplifies one part of this:

```text
Ref/Current changes
→ exit Selected Comparison Mode
```

For other downstream states, final invalidation behavior will be decided during later page reviews.

---

# 73. Current Comparison Principles Worth Preserving Unless Replaced

**CURRENT BASELINE**

Existing behavior/spec includes useful principles:

- calculate Reference and Current independently
- match by business identity, not row position
- status is separate from Gap
- simulation starts from Current
- simulation must not mutate Current
- Root Cause / Action are notes, not calculation inputs
- candidate ranking must not automatically select candidates

These remain useful references but should still be checked against the final new spec.

---

# 74. Finalized Master Data Checklist

**FINALIZED**

Master Data is considered closed at behavior/data level with:

- session-only state
- no DB
- Ref/Current independent Working + Last Saved
- Save independent
- Reset to Last Saved
- Export from Last Saved only
- Import to Working
- Clear Working only
- Clone other dataset into current Working
- Sizing replaces Setup
- Sizing contains metadata + row counts
- Template download inside Sizing
- metadata synchronization between page and Sizing
- Product Name
- UOM
- Selling Price (THB)
- SG&A (%)
- Dataset Remark
- no Product Code
- no separate Product Description
- no Product Note
- table order BOM → WC → Routing
- minimal schemas only
- `#` display-only
- row reorder
- comparison not based on order
- Excel-like editing
- copy/paste from Excel
- undo/redo direction
- separate row selection and reorder controls
- bulk edit by selected rows + edited column
- add/delete
- search only
- no table filter
- validation non-blocking
- Routing.WC references WC
- header/footer/status structural direction retained
- product mismatch warning
- warning-first rather than blocker-first behavior

---

# 75. What Is Explicitly Not Final Yet

**PENDING / UNDECIDED**

Do not invent final answers for:

- exact Cost Breakdown redesign
- exact Full vs Selected Gap presentation
- exact Candidate Prioritization redesign
- exact RCA & Simulation redesign
- Trial workflow
- exact GP/COGS/OP formulas
- exact margin formulas
- exact Sales/Volume behavior
- exact SG&A accounting treatment beyond input being `% of Selling Price`
- MatVAR/LBVAR/BDVAR semantics
- exact business-dashboard chart composition
- exact status bar location
- exact visual styling
- exact responsive layout
- exact formula/output content in footer
- exact behavior before first Save for Reset/Export
- exact implementation architecture for hidden ProductSession state

---

# 76. What Codex Should Do With This File

This file is the full product-review context so far.

Codex should:

1. Extract finalized requirements from sections marked FINALIZED.
2. Carry CONFIRMED requirements forward.
3. Preserve CURRENT BASELINE only when it remains compatible with the new decisions.
4. Treat DESIGN DIRECTION as guidance, not exact UI.
5. Leave PENDING and UNDECIDED items unresolved.
6. Never invent business formulas.
7. Never use row order as comparison identity.
8. Keep calculation/domain logic separate from presentation.
9. Prefer simpler behavior when a complex recovery/state mechanism is not explicitly required.
10. Use this document to derive the actual implementation spec or refactor plan when asked.

This document is intentionally comprehensive and should be treated as the conversation-derived source for the next extraction step.

---

# 77. Later User Decisions and Work Instructions — 2026-10-05

**FINALIZED where stated below.** This dated addendum supersedes earlier pending wording above when it covers the same point.

## Requirements authority and checklist use

- The user designated the 80-topic checklist, the two linked ChatGPT conversations, and this review context plus `MASTER_DATA_SPEC.md` as the current source set.
- The older files in `agreements/` are outdated and are historical references only.
- `tasks/source-crosswalk-80.md` remains the single row-by-row evidence/status ledger. The 80 rows are checked against source decisions; they are not 80 feature tickets to implement blindly.
- Mark a row PASS only when there is current implementation evidence. Keep unresolved or human-acceptance items distinct from completed AI implementation.

## Comparison and layout

- **Selected Comparison Gap:** show only the selected-scope Gap in Selected mode. Do not show the Full Gap beside it. This supersedes the earlier pending wording in §75 and the earlier checklist label.
- Use the supplied Master Data screenshot as the layout direction for the full page. The BOM table is one example; support all approved tables.
- Keep the dataset toolbar and metadata summary together at the top of the Master Data scrolling region. Keep the application footer at the bottom of the app frame while content scrolls.
- Final colors, exact visual styling, and detailed status wording remain open for human UX review.

## Excel dataset workbook and formulas

- Use four data tabs, in order: `META`, `BOM`, `ROUTING`, `WORK_CENTER`. Put Product Name, UOM, Selling Price, SG&A %, and Dataset Remark together in `META`.
- Put formula-linked Standard Cost inspection on a separate `COST_CALCULATION` tab. Use formulas that link to the data sheets and recalculate in Excel.
- Follow the current in-app Cost Engine: Material = Usage × Price × (1 + Loss); Routing Factor = Manning ÷ (Capacity × Yield); Labor and Burden equal that factor times the matching Work Center rate; Total Standard Cost is the sum of the three components.
- Keep missing or invalid inputs unavailable; do not replace them with zero. Do not add GP/COGS/OP, margin, or monetary SG&A formulas.
- The old blank Excel template has a different BOM Loss formula. For this implementation, the current Cost Engine is the formula source; this does not authorize changing the engine.

## Execution

- Implement the AI-ready scope in small verified chunks, update this source context and the single 80-topic ledger with evidence, commit each coherent stage, then push the authorized branch. Keep deferred work and human acceptance visible in the handoff.
