# CBD Corrective Round Checklist

Branch: `codex/cbd-candidate-integration`  |  Starting HEAD: `28d8f59b7a1235d4a88ef6303c5167c98c43de37`
==================================================

PRE-FLIGHT
[x] Confirmed branch is codex/cbd-candidate-integration
[x] Confirmed starting HEAD/state
[x] Confirmed no unexpected local modifications
[x] Read current CBD spec/docs
[x] Inspected actual current CBD source
[x] Inspected AppLayout scroll/footer structure
[x] Located existing Secondbrain workflow source or explicitly reported that none is available

REGRESSION SAFETY
[x] No Master Data redesign
[x] No Candidate/RCA redesign
[x] No Ranking changes
[x] No Simulation changes
[x] No business formula change
[x] No matching-identity change
[x] No LMDI rewrite
[x] Existing direct # Candidate selection preserved
[x] Existing selection/filter persistence preserved
[x] Work Center remains full-snapshot context

CBD TOP AREA
[x] Redundant PageHeading removed
[x] "Reference vs Current · Gap..." description removed
[x] Subheader begins directly below Global Header
[x] No unnecessary top vertical gap
[x] Subheader contains Gap Bar
[x] Subheader contains ALL/BOM/RTG
[x] Subheader contains Status dropdown
[x] No Comparison Mode
[x] No Select Scope / Apply / Cancel / Edit Scope
[x] "No Candidates selected" text removed
[x] No second selected-scope bar added

GAP BAR
[x] Exactly one Standard Cost Gap chart exists
[x] Material / Labor / Burden are not equal fixed thirds
[x] Normal same-sign segment widths reflect actual Gap contribution
[x] Example +9.31 / +4.42 / +2.32 does not render as equal thirds
[x] Selected scope highlights contribution in the same chart
[x] Non-selected contribution remains visible
[x] No second Full/Selected chart
[x] Negative contributions preserve sign
[ ] NEEDS HUMAN REVIEW — SSR fixture covers +9 / -4 / +2; a browser-rendered full offset case was unavailable.
[ ] NEEDS HUMAN REVIEW — SSR fixture asserts selected +10 against +9 / -4 / +2; inspect this chart in a browser fixture.
[x] No per-segment independent normalization
[x] Numeric values remain accessible

FIXED OVERVIEW
[x] Standard Cost and Work Center are side-by-side on desktop
[x] Standard Cost remains REF / CUR / Gap
[x] Work Center remains WC / REF / CUR / Gap
[x] Work Center Total remains available
[x] Work Center still uses full snapshot
[x] Fixed Overview is compact
[x] Fixed Overview does not dominate the viewport
[x] Candidate rows remain meaningfully visible when overview is expanded

FIXED OVERVIEW COLLAPSE
[x] One collapse control controls the whole overview
[x] Standard Cost does not have a separate collapse state
[x] Work Center does not have a separate collapse state
[x] Default state is expanded
[x] Collapse frees vertical space for Candidates
[x] Expand restores same data
[x] Collapse does not modify scope
[x] Collapse does not modify filters
[x] Collapse does not modify calculations
[x] aria-expanded is correct
[x] Keyboard operation works

BOM EXPANSION
[x] Main BOM schema remains unchanged
[x] CHANGED-only expansion preserved
[x] REF is a row
[x] CUR is a row
[x] EFFECT is a row
[x] Usage is a column
[x] Price is a column
[x] Loss is a column
[x] Cost Gap is a column
[x] No generic primary Parameter column
[x] REF values are actual REF values
[x] CUR values are actual CUR values
[x] EFFECT uses existing LMDI
[x] EFFECT Cost Gap is actual BOM Material Gap
[x] Unit remains omitted
[x] Unavailable effects remain —

RTG EXPANSION
[x] Main RTG schema remains unchanged
[x] CHANGED-only expansion preserved
[x] REF is a row
[x] CUR is a row
[x] EFFECT is a row
[x] Manning is a column
[x] Capacity is a column
[x] Yield is a column
[x] Cost Gap is a column
[x] No generic primary Parameter column
[x] Labor Rate removed from primary parameter table
[x] Burden Rate removed from primary parameter table
[x] Work Center not promoted to primary column
[x] Existing WC/rate calculation preserved
[x] WC movement appears as compact secondary context when applicable
[x] Labor Rate context appears only secondarily when applicable
[x] Burden Rate context appears only secondarily when applicable
[x] Effect reconciliation remains correct
[x] No LB/BD/CONV main columns added

SCROLL / FOOTER
[x] Pre-existing Footer bug root cause identified
[x] CBD has one intentional vertical scroll owner
[x] AppLayout main and Candidate do not both vertically scroll for CBD
[x] Candidate workspace owns CBD scrolling if using the preferred architecture
[x] Other pages retain their existing scroll behavior
[x] Footer remains at bottom of app shell
[x] Footer never overlaps CBD
[x] Footer does not float upward with empty canvas beneath
[x] No duplicate vertical scrollbar
[x] No body scrollbar appears accidentally
[x] Collapse/expand does not break Footer
[x] Resize does not break Footer
[ ] NEEDS HUMAN REVIEW — viewport tooling supports size changes but exposes no browser zoom control.
[x] Horizontal Candidate table scrolling remains local

CANDIDATE WORKSPACE
[x] Candidate area is the primary workspace
[x] Useful Candidate rows visible with overview expanded on desktop
[x] Collapse significantly increases Candidate workspace height
[x] Direct # selection still works
[x] One selection works
[x] Multiple selection works
[x] Hidden selection survives filters
[x] Deselect-all returns Full
[x] Selected styling remains clear and not color-only

SECONDBRAIN WORKFLOW
[x] Existing canonical Secondbrain workflow location identified
[x] Prompt → Implement → Audit → Next Prompt cycle documented
[x] Mid-implementation new decisions documented as next-round agreements by default
[x] Audit is documented as mandatory before next prompt
[x] Next prompt is documented to include audit + new agreements + new checklist
[x] No competing duplicate workflow document created

DOCUMENTATION
[x] COST_BREAKDOWN.md matches actual corrected CBD UX
[x] design.md CBD section matches corrected layout
[x] No stale equal-width/equal-column Gap Bar implication remains
[x] Side-by-side Overview documented
[x] Whole-overview collapse documented
[x] Single CBD scroll ownership documented where appropriate
[x] BOM expansion orientation documented
[x] RTG expansion orientation documented
[x] LB/BD/CONV remains explicitly deferred
[x] FINAL_LOGIC_SPEC business formulas not rewritten
[x] HANDOFF updated if used by current repository workflow

VERIFICATION
[x] npm run build passes
[x] Relevant CBD verification scripts pass
[x] Selected comparison verification passes
[x] Reconciliation verification passes
[x] git diff --check passes
[x] Desktop browser check completed
[x] 1366×768-like browser check completed
[x] Narrow/mobile browser check completed
[x] Full state checked
[x] Selected state checked
[x] Overview collapse checked
[x] BOM expansion checked
[x] RTG expansion checked
[x] Added row checked
[x] Removed row checked
[x] Work Center stability checked
[x] Footer checked at top of Candidate scroll
[x] Footer checked at bottom of Candidate scroll
[x] Double-scroll absence checked
[x] Gap Bar proportional case checked
[ ] NEEDS HUMAN REVIEW — selected negative overlay was checked in browser; the full signed-offset fixture was asserted in SSR only.

==================================================

## IMPLEMENTATION EVIDENCE

The checked items above are backed by the evidence below. Any visual item that could not be genuinely confirmed stays [ ] NEEDS HUMAN REVIEW.

### Preflight and regression safety
- Target worktree: E:\COSTBREAKDOWN\.worktrees\CBD-CANDIDATE-INTEGRATION.
- Branch: codex/cbd-candidate-integration. Starting HEAD and current local HEAD: 28d8f59b7a1235d4a88ef6303c5167c98c43de37. Worktree was clean before edits and tracked origin/codex/cbd-candidate-integration.
- No Master Data, Candidate/RCA, Ranking, or Simulation source changed. No calculation, identity, canonical status, LMDI, or Selected Comparison state code changed.
- Master Data main remained overflow-y:auto and scrolled 340 px at 1366×768 while Footer bottom stayed at 768 px. Candidate and Simulation routes retain main overflow-y:auto.
- Reviewed CBD source, app layout, both detail tables, overview tables, relevant selected-comparison usage, specs, and design.

### CBD UI and calculation evidence
- Changed files: CostBreakdownPage.tsx, SnapshotComparisonCard.tsx, WorkCenterProcessingTable.tsx, BOMDetailedTable.tsx, and RoutingDetailedTable.tsx.
- Browser checks confirmed no redundant heading, one chart, subheader filters, side-by-side Overview panels, and visible Candidate content with Overview expanded.
- At 1366×768, browser-measured chart shares were Material 58.0%, Labor 27.6%, Burden 14.4% for +9.31 / +4.42 / +2.32. MAT-A selected +4.20 in the same chart; MAT-REMOVED showed a signed selected -6.12 against the positive full gap. Selection persisted through type/status filters and multiple selection; deselect-all returned to Full.
- Overview collapse/expand was keyboard-tested with Space. aria-expanded changed true → false → true. Type/status filters, chart values, and full-snapshot Work Center rows stayed unchanged. At 390×844, collapsing while Candidates were scrolled grew the workspace from 125 px to 438 px while Footer remained at 844 px and document scroll stayed zero.
- BOM and RTG changed details showed REF / CUR / EFFECT rows. BOM values reconciled to +4.20. RTG OP-MANNING reconciled to +2.30, including secondary Labor Rate +0.19 and Burden Rate +0.09 context. Added/Removed values and unavailable effects were checked in self-checks/rendered accessibility state.
- Work Center stayed at REF 19.86 / CUR 26.60 / Gap +6.74 while Candidate scope changed.

### Scroll ownership and responsive evidence
- Changed files: AppLayout.tsx, Navbar.tsx, index.css, and CostBreakdownPage.tsx.
- Root cause: CBD main and Candidate both previously had vertical auto-scroll, without a constrained CBD flex/min-height chain.
- Final CBD ownership: main is overflow-hidden; the constrained workspace frame is a flex column; Candidate workspace is the only vertical scroller. html/body suppress document-level scroll. Footer remains shrink-0 and Navbar is protected from flex shrinking. Other route mains retain overflow-y:auto.
- Browser sizes: 1440×1000, 1366×768, and 390×844. Candidate scrolling reached its bottom while Footer stayed at the viewport bottom. Collapse/expand while scrolled and local horizontal scrolling in Overview/Candidate tables were checked.
- Wide table contents make document scrollWidth larger than viewport in narrow mode, but document scrollLeft stayed 0 and horizontal movement remained in the table container. Browser zoom was unavailable.

### Documentation and Secondbrain
- Repo docs: docs/specs/COST_BREAKDOWN.md, design.md, HANDOFF.md, and this checklist. FINAL_LOGIC_SPEC.md was not changed.
- Existing canonical workflow: secondbrain/WORKFLOW.md in private DEV checkout C:\Users\Boom\.codex\worktrees\skill-link-ownership-dev\Human-AI-Working-Standard. It now documents Discuss/Close → Prompt → Current Codex Round → Audit → Next Prompt, with mid-round decisions saved for the next round by default. DEV checkout is on branch dev at 3acdc3da885021c68440c511c0c5e5e1e63216a1; only that file is modified, unstaged and uncommitted.
- No duplicate workflow document was created.

### Commands and verification
- npm run build — PASS; tsc -b and Vite build, 2049 modules. Existing Vite ExcelJS fs/crypto browser-externalization warnings remain.
- node scripts/verify_cbd_parameter_cost_effect.mjs — PASS; includes proportional +9.31 / +4.42 / +2.32 and signed +9 / -4 / +2 with selected +10.
- Ten Vite SSR TypeScript checks — PASS: CBD view, selected-comparison lifecycle/boundary, reconciliation, BOM/RTG comparison views, snapshot comparison/detail views, and Work Center view.
- git diff --check — PASS.
- Previously attempted out-of-scope Candidate checks verify_candidate_selection_view.mjs and verify_cost_breakdown_review_feedback.mjs failed because the existing CandidateSelectionPage fixture expects an obsolete Information/Overview label and omits currentRcaWorkspace. Candidate/RCA files were not changed.
- No commit or push was performed.

### Remaining human review
- The unchecked NEEDS HUMAN REVIEW items above cover browser inspection of a full opposite-sign chart, a component-over-net selected marker, and browser zoom. Static signed-chart assertions pass, but they do not replace visual acceptance.
