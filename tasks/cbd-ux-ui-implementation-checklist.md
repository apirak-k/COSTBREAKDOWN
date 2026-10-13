IMPLEMENTATION CHECKLIST
==================================================

Create or update a CBD-specific checklist file under `tasks/`
to record implementation evidence.

Suggested file:
tasks/cbd-ux-ui-implementation-checklist.md

Start every requirement as [x].
Only change it to [x] AFTER it is implemented AND verified.

Use this checklist:

PRE-FLIGHT
[x] Confirmed branch is codex/cbd-candidate-integration
[x] Inspected git status and preserved unrelated existing changes
[x] Read AGENTS.md and relevant CBD specs
[x] Inspected latest CBD implementation before editing
[x] Inspected Master Data only as a layout/interaction reference

SCOPE SAFETY
[x] Changes are limited to CBD and directly required CBD state/docs
[x] Master Data behavior was not modified
[x] Candidate/RCA page was not modified
[x] Ranking was not modified
[x] Simulation was not modified
[x] Shared shell/header/footer was not redesigned
[x] Business formulas/matching logic remain unchanged

SUBHEADER
[x] Old Select Scope workflow removed
[x] No Select Scope button
[x] No Apply button
[x] No Cancel selection button
[x] No Edit Scope button
[x] No Full Comparison mode button
[x] One and only one Standard Cost Gap Bar exists
[x] Gap Bar is split into Material / Labor / Burden
[x] Full Standard Cost Gap remains the baseline
[x] Selected scope highlights contribution inside the same bar
[x] ALL / BOM / RTG control implemented
[x] Status dropdown implemented
[x] Status filtering does not destroy selected scope

FIXED STANDARD COST
[x] Standard Cost overview is compact
[x] Material REF / CUR / Gap shown
[x] Labor REF / CUR / Gap shown
[x] Burden REF / CUR / Gap shown
[x] Standard Cost REF / CUR / Gap shown
[x] % Parent removed
[x] Obsolete reconciliation/balanced presentation removed
[x] No duplicate review links remain

WORK CENTER CONTEXT
[x] Work Center still uses fullSnapshotComparison context
[x] Work Center does not change with selected scope
[x] Work Center is not selectable
[x] Work Center is not a Candidate
[x] Work Center REF Conversion is correct
[x] Work Center CUR Conversion is correct
[x] Work Center Gap is CUR - REF
[x] Compact WC | REF | CUR | Gap presentation implemented
[x] Total row/summary reconciles with total Conversion when data is available
[x] No unapproved new LB / BD / CONV column redesign was added

DIRECT SCOPE SELECTION
[x] Candidate # is the direct selection affordance
[x] No checkbox/Include selection mode remains
[x] Selecting one row immediately updates selected scope
[x] Selecting multiple rows creates a multi-Candidate scope
[x] Deselecting a row immediately updates selected scope
[x] Deselecting all rows returns naturally to Full scope
[x] Selected rows have a clear visible state
[x] Selection is not communicated by color alone
[x] Filtering does not silently clear hidden selected rows
[x] Existing selected-comparison state/model was reused where practical

BOM MAIN TABLE
[x] BOM header is exactly based on:
    # | Bill of Material | Status | Usage | Price | Loss | Cost Gap | % Total | ▼
[x] Unit is not shown in the CBD Candidate table
[x] CHANGED Usage displays delta
[x] CHANGED Price displays delta
[x] CHANGED Loss displays delta
[x] BOM Cost Gap is Material Cost Gap
[x] BOM % Total uses FULL Standard Cost Gap
[x] ADDED does not fabricate a missing REF delta
[x] REMOVED does not fabricate a missing CUR delta
[x] Signed gaps preserved
[x] UNCHANGED remains filterable/available

BOM EXPANSION
[x] Only CHANGED gets Parameter Effect expansion
[x] Expansion uses REF / CUR / EFFECT rows
[x] Expansion aligns Usage / Price / Loss / Cost Gap
[x] REF values are actual REF values
[x] CUR values are actual CUR values
[x] EFFECT uses existing LMDI result
[x] EFFECT total reconciles with BOM Cost Gap when available
[x] Unavailable attribution remains unavailable, not fabricated
[x] ADDED has no fake effect expansion
[x] REMOVED has no fake effect expansion
[x] % Parent removed from BOM detail

RTG MAIN TABLE
[x] RTG header is exactly based on:
    # | Routing | Status | Manning | Capacity | Yield | Cost Gap | % Total | ▼
[x] Work Center is NOT a main-table column
[x] Labor Rate is NOT a main-table column
[x] Burden Rate is NOT a main-table column
[x] Labor is NOT a main-table column
[x] Burden is NOT a main-table column
[x] Conversion is NOT added as a separate main-table column
[x] CHANGED Manning displays delta
[x] CHANGED Capacity displays delta
[x] CHANGED Yield displays delta
[x] RTG Cost Gap equals Conversion Gap
[x] RTG % Total uses FULL Standard Cost Gap
[x] ADDED does not fabricate missing REF values
[x] REMOVED does not fabricate missing CUR values

RTG EXPANSION
[x] Only CHANGED gets Parameter Effect expansion
[x] Primary expansion uses REF / CUR / EFFECT rows
[x] Primary rows align Manning / Capacity / Yield / Cost Gap
[x] REF cost corresponds to REF Routing Conversion
[x] CUR cost corresponds to CUR Routing Conversion
[x] EFFECT Cost Gap equals actual Routing Conversion Gap
[x] Existing Manning/Capacity/Yield effect logic preserved
[x] Existing Work Center rate-effect logic preserved
[x] WC/rate context is shown compactly in expanded detail when required
[x] No WC/rate context was promoted into new main-table columns
[x] Effect reconciliation remains correct when attribution is available
[x] % Parent removed from RTG detail

PERCENTAGE RULE
[x] % Total uses Candidate Cost Gap / FULL Standard Cost Gap
[x] % Total can display negative values
[x] % Total can display values above 100%
[x] Zero/unavailable denominator displays —
[x] % Parent is no longer shown anywhere in the CBD UI

VISUAL / UX
[x] Fixed overview does not consume excessive vertical space
[x] Candidate area remains the primary scrollable workspace
[x] Selected row styling is visually clear
[x] Gap Bar highlight is understandable without opening details
[x] No unnecessary new cards/sections were introduced
[x] Narrow-screen overflow remains usable
[x] Keyboard interaction works
[x] Focus states remain visible
[x] Expand controls expose correct accessibility state

DOCUMENTATION
[x] COST_BREAKDOWN.md updated to latest CBD presentation decisions
[x] Old explicit Select/Edit/Apply comparison-mode UX removed from docs
[x] One-bar Full Gap + selected-highlight behavior documented
[x] Direct # Candidate selection documented
[x] % Parent removal documented
[x] BOM/RTG Candidate schemas documented
[x] Deferred LB/BD/CONV RTG idea is NOT written as a requirement
[x] No unrelated spec was rewritten

VERIFICATION
[x] `npm run build` passes
[x] Existing relevant verification scripts/tests were run if available
[x] No new TypeScript errors
[x] No obvious console/runtime errors in CBD
[x] Full state manually checked
[x] BOM-only filter manually checked
[x] RTG-only filter manually checked
[x] Status filter manually checked
[x] One selected Candidate manually checked
[x] Multiple selected Candidates manually checked
[x] Deselect-all → Full manually checked
[x] CHANGED BOM expansion manually checked
[x] CHANGED RTG expansion manually checked
[x] ADDED row manually checked
[x] REMOVED row manually checked
[x] Work Center confirmed unchanged while scope changes
[x] Gap Bar confirmed to remain one bar while scope changes
IMPLEMENTATION EVIDENCE
- Branch: codex/cbd-candidate-integration
- HEAD remains 687a509112b1c4dfe6b69defde0cc2aead8f8ec6; no commit or push was made.
- The target worktree was clean before edits. Pre-existing untracked files in the separate root checkout were left untouched.
- npm run build passed. Vite still reports its existing ExcelJS fs/crypto externalization warnings.
- CBD self-checks passed: verify_cbd_parameter_cost_effect.mjs, verify_selected_comparison_lifecycle.ts, verify_snapshot_bom_detail.ts, verify_snapshot_routing_detail.ts, verify_bom_comparison_view.ts, verify_routing_comparison_view.ts, verify_work_center_comparison_view.ts, verify_comparison_reconciliation.ts, verify_selected_comparison_boundary.ts, and verify_snapshot_comparison_view.ts.
- Browser checks passed at 1440x1000 and 390x844 for Full/Selected state, type/status filters, selection preservation, deselect-all, BOM/RTG details, Added/Removed values, keyboard/focus behavior, Work Center stability, single Gap Bar, and narrow-table scrolling.
- A CBD-only overscroll containment class on the shared main scroller prevents horizontal gestures outside tables from shifting the whole page; horizontal table scrollers remain usable.
- git diff --check passed. No calculation formulas or matching logic were changed.
