# Master Data Toolbar and Engineering Workspace UX Contract

**Status:** Current user-directed UX contract for branch `CBD-UXUI`, including the 2026-10-10 shell and Prepare Dataset correction. This contract supersedes conflicting earlier presentation decisions. Finalized business behavior remains authoritative unless a decision below explicitly changes the presentation.

## Scope

This contract records the accepted workspace UX direction across the shared Header, Master Data toolbar/search/metadata and warning navigation, Cost Breakdown hierarchy, Candidate/RCA presentation, and Simulation result hierarchy. The current correction pass changes only Header utility placement, Master Data Search placement, app-shell scrolling, shared framing, Prepare Dataset presentation, and the two development mock fixtures.

It does not change finalized calculations, Candidate generation, RCA data semantics, Simulation logic, Master Data lifecycle, or Export's Last Saved source. It allows small table interaction changes required for shared search and warning navigation, without replacing the current table implementation.

## Finalized UX Decisions

- The shared Header is one compact workspace bar with three desktop zones: `COSTBREAKDOWN` and safely resolved Product (Unit) context at the left; centered Master Data / Cost Breakdown / Candidate / Simulation navigation; and Undo, Redo, then the final icon-only Info control for Prepare Dataset at the right. Smaller widths may reflow. Do not show Search, workflow status, a workflow CTA, warning text, or additional navigation in the Header.
- The shared Header's left zone contains only `COSTBREAKDOWN` and safe Product (Unit) context. Its center contains exactly four page-navigation tabs. Its right utility zone contains Undo, Redo, then Info in that order; it contains no Search.
- Undo and Redo remain visible in the right utility zone and use the existing Master Data history. They are enabled only on Master Data when the corresponding history action exists, disabled elsewhere, and use muted opacity with the normal cursor.
- On normal desktop widths, Master Data keeps Reference / Current / Custom, View / Edit, actions, BOM / Work Centers / Routing / All, and far-right Prepare Dataset at one compact toolbar level. Narrow widths may wrap.
- Master Data toolbar selectors remain text controls. Sizing, Import, Clone, Reset, Clear, Save, Export, and Prepare Dataset are icon-only, neutral, consistently sized actions with tooltips. Prepare Dataset uses Info. Save does not receive a special color treatment.
- Dataset selection styling and save-state dots are independent. The only user-facing save states are `Saved` (green) and `Draft` (neutral gray). Draft means Working differs from Last Saved or no Last Saved exists. Save state is derived from snapshots, not a manual flag.
- Save stays visible and is enabled when Working is Draft. Save copies the viewed Working state to that dataset's Last Saved state.
- Product Name and UOM remain blank unless entered; do not synthesize `Product` or `PC` in the UI, Save, or Export. UOM is free text. Selling Price and SG&A keep their existing missing-value semantics; Dataset Remark may be blank. Metadata fields have stable relative widths: Product Name wide, UOM narrow, Selling Price medium, SG&A narrow, Dataset Remark wide.
- Table-view controls appear in the order BOM / Work Centers / Routing / All, have equal fixed sizing, and remain at toolbar level. Prepare Dataset stays at the toolbar's far right and uses an Info icon.
- Search is a local Master Data toolbar control using the existing `masterDataSearchQuery` state and filtering behavior. It filters BOM, Work Centers, or Routing for the selected view; `All` applies the same query across all visible tables. Do not show Search in the global Header or invent search behavior for unrelated pages. Keep the existing per-table filtering logic and avoid adding duplicate table search controls.
- Clone opens a source flyout on hover, focus, or click; the flyout excludes the destination, stays open while moving between trigger and menu, closes when the pointer leaves both, and supports keyboard selection. Choosing a source clones immediately without a second confirmation.
- Prepare Dataset is a compact, toggleable popover with a fixed desktop rectangle of approximately 24rem × 30rem, clamped to the viewport on smaller screens. Its outer rectangle does not change with warning count, expansion, dataset filter, or Product detail state. The top summary, dataset rows, Warnings heading, and development mock actions remain fixed; only the warning list scrolls. It closes from its trigger, outside click, Escape, or its close button.
- The fixed top summary reads `Dataset`, then a dotted `Ready` / `Incomplete` status, a clickable dotted `Product Match` / `Product Mismatch` status, and Close at the far edge. Product status has no chevron, border, or filled semantic background. Clicking it opens a floating Reference / Current Product Name and UOM mini-popover; the mini-popover does not affect layout, closes on outside click, Escape, or a second status click, and starts closed when Prepare Dataset opens normally. Footer Product status opens Prepare Dataset with that mini-popover open.
- Reference / Current / Custom summaries are three separate rows with shared fixed columns for dataset name, save state, and warning count. Counts align right; positive counts show `⚠ N`, while zero is a muted `0` without a warning icon. Do not show Prepared / Needs input in these rows or explain that Custom is unused by CBD.
- Ready requires Reference and Current readiness plus no Missing required value warnings in Reference or Current. Custom does not affect readiness. Use this same readiness derivation in the Footer and the fixed top summary; do not show readiness on individual dataset rows.
- Status describes context/state; Warning identifies data to review. Product Mismatch is a non-blocking comparison status, excluded from warning categories and counts, and never triggers a CBD confirmation or blocker.
- Prepare Dataset exposes exactly three warning categories: Generated identity, Missing required value, and Auto-renamed duplicate. Invalid numeric values and nonblank unavailable Routing Work Center references are rejected at normal edit/import ingress; they are not warning categories. Blank required Work Center is Missing required value. Counts represent affected source items/locations, not categories, and do not double-count a condition at one location.
- Always show Reference / Current / Custom warning counts. Clicking a non-zero dataset count filters the category list to that dataset; `All` restores the combined list. Do not repeat dataset counts inside category rows.
- The Warnings heading has no warning icon. Always show exactly three warning category rows, including zero-count categories. A zero-count row is static and not interactive: keep its label at normal contrast, mute only the number `0`, and show no hover affordance or chevron. Positive rows use a shared label / fixed count / fixed far-right chevron grid and always expand or collapse, including when count is one. Each expanded actual warning item is the final action: it navigates directly to the source and has no chevron or other expansion/navigation indicator. The fixed warning viewport scrolls internally; the outer panel does not scroll. Navigation activates the dataset and table, switches to Edit, selects and scrolls the row, and focuses/highlights the field when practical. Warning presence never blocks normal application use.
- The shared Footer is a compact three-group summary: Reference/Current structure in BOM / WC / RTG order; Reference+Current readiness, clickable Product Match/Mismatch, and clickable `⚠ N`; then full Reference/Current Standard Cost and full Net Gap. Both statuses have a dot, semibold text, and semantic color; Product Match/Mismatch has no chevron. Custom is omitted from structure/readiness, but its warning items remain in the warning total. Product Mismatch and readiness are not warning items.
- Blank BOM, Work Center, and Routing identities have usable effective identities `Material N`, `Work Center N`, and `Process N`. `N` is the ordinal among currently blank/generated identities in that table, not the physical row number. Generated identities may be saved and exported, appear in warnings, and do not block workflow.
- Duplicate effective identities are auto-renamed to the next available deterministic suffix, such as `mat0.3a`, `mat0.3a(1)`, `mat0.3a(2)`. Apply the rule to direct entry, paste, bulk edits, and other applicable input paths. Report each correction as a warning without a modal. Existing imported/legacy ambiguous data must not cause the comparison engine to guess a match.
- Missing required values make only affected and dependent results Unavailable and appear in the warning list. Invalid numeric values are rejected at edit/import ingress; unavailable nonblank Routing Work Center references are rejected at edit/import ingress. Existing persisted invalid data remains Unavailable with local invalid-cell cues, but neither invalid values nor unresolved Work Centers appear as Prepare Dataset warning categories. Never replace missing values with zero. A valid zero remains valid where formulas permit it.
- Development exposes two direct actions, `Complete Mock` and `Incomplete Mock`, on one fixed compact row below the warning viewport. Both load immediately into ordinary Working/history state with no dropdown or confirmation. Loading replaces Reference and Current Working data, clears stale Custom Working rows/sizing that would inflate the fixture warning totals, and preserves every Last Saved dataset. The load is one ordinary undoable history action, including the previous Custom Working state. Complete Mock has matching Product Name/UOM, calculable Reference and Current costs, and zero warnings. Incomplete Mock has three generated identities, nine missing required values, three auto-renamed duplicates, and a Product Mismatch outside the 15-warning total. It does not introduce invalid-number or unresolved nonblank Work Center cases. There is no separate mock session/mode or return action. Reset continues to restore Last Saved.
- Clone is labeled `Clone`; it selects a source and copies that source's Working data into the viewed destination's Working data. The destination Last Saved is unchanged. Source selection performs the copy without a second replacement confirmation.
- Reset remains confirmation-protected and restores Working from Last Saved. Clear remains confirmation-protected and clears only the selected Working state. Sizing confirms only a decrease that removes populated data; growth or removal of blank trailing rows does not confirm.
- Valid Import continues to replace viewed Working data and initialize sizing from imported row counts without overwriting Last Saved. Invalid numeric values and unavailable nonblank Routing Work Center references reject Import. Export continues to export viewed Last Saved. Neither shows warning confirmation.
- Cost Breakdown shows Total Gap first, then cause categories, followed by BOM/Processing detail; avoid repeating the same values across Snapshot Comparison and Variance Tree. Selected Comparison remains a compact scope control.
- Candidate / RCA uses a compact decision table with key candidate values visible and changed/process details disclosed on demand. The RCA Case focuses on Candidates, Root Cause / Why?, and Action; Simulation is optional. RCA save state uses Saved / Draft.
- Simulation leads with Reference → Current → Simulated, cost story, and available result/decision metrics, followed by economic assumptions, Factors to Simulate, and parameter details. Preserve the current graph and formulas; economic evaluation remains advisory.
- The shared Footer wraps its three logical groups on narrow screens and remains one row on normal desktop widths. Its warning indicator always shows `⚠ N`, including zero, and opens Prepare Dataset with all warning roles visible. Product Match/Mismatch opens Prepare Dataset with the floating identity mini-popover open and no warning filter. Full Reference/Current costs and Net Gap do not follow Selected Comparison scope.
- Header, Main, and Footer content share the centered `max-w-[1440px]` frame with `px-3 sm:px-4 lg:px-6`; Header/Footer backgrounds span the viewport. The app shell is `h-dvh min-h-0 flex flex-col overflow-hidden`; full-viewport-width Main owns the only page-level vertical scrolling, with the centered frame inside Main, and Footer stays at the viewport bottom without overlaying content.
- Prepare Dataset and footer warning navigation do not add a global blocker or a CBD confirmation. No global page redesign beyond the Header workspace utilities is included.

## Status Model

| Dimension | Values | Meaning |
|---|---|---|
| Dataset save state | Saved / Draft | Saved means Working matches Last Saved. Draft means it differs or has never been saved. |
| Preparation | Prepared / Needs input | Existing readiness semantics are preserved, but these labels are not shown in the Prepare Dataset dataset rows. |
| Comparison | Product Match / Product Mismatch | Match requires normalized Reference and Current Product Name and UOM to agree; otherwise Mismatch. Informational and non-blocking. |

Save-state dots are separate from selected-dataset styling. Preparation status and warning count are also separate concepts.

## Warning Model

Each warning item identifies a source dataset, table, record, field when available, category, and a human-readable label. Counts represent distinct affected source locations. Do not count Product Mismatch. Deduplicate repeated descriptions of the same condition at the same location.

Show `Warnings N` across all datasets, or `Warnings · {Dataset} N` while filtered; do not put a warning icon before the heading. The canonical list always contains exactly three rows. A non-zero dataset count filters the section; `All` clears the filter. Category rows use a fixed label / count / chevron grid: count 0 is static with a normal-contrast label, muted number only, and no hover/click/chevron; every positive count expands a compact list of navigable locations. Actual warning items navigate directly and show no chevron or other navigation indicator. Keep the popover height bounded and scroll the warning list internally.

## Generated and Default Identity Behavior

Product Name and UOM remain blank until supplied. Blank table identities use their generated effective names. Generated numbering counts blank/generated identity entries in table order, independently for BOM, Work Centers, and Routing. Example: `Steel`, blank, `Plastic`, blank becomes `Steel`, `Material 1`, `Plastic`, `Material 2`.

Generated values must be consistent in display, ordinary dataset use, Save, and Last Saved export. A generated-name warning remains visible to make the implicit identity reviewable. Identity generation must not silently write a physical row number as the business identity.

## Duplicate Identity Behavior

Uniqueness applies per identity domain and includes effective generated identities. Normalize a newly entered duplicate to the next free suffix deterministically. For example, if `mat0.3a` and `mat0.3a(1)` exist, another entry of `mat0.3a` becomes `mat0.3a(2)`. The application records the auto-rename as a warning and continues without confirmation.

## Missing and Invalid Values

Missing required numeric inputs produce Unavailable affected results and Missing required value warning items with a source location. Invalid numbers, non-positive Capacity, Yield outside its existing valid range, and unavailable nonblank Routing Work Center references are rejected at the normal edit/import boundary; dependent results for any legacy persisted invalid values remain Unavailable. Do not fabricate values or convert missing/invalid data to zero. Blank Product Name, UOM, Dataset Remark, and valid zeroes allowed by finalized formulas retain their existing metadata/formula semantics.

## Mock Behavior

`Complete Mock` and `Incomplete Mock` load deterministic Reference/Current sample pairs into the active product's ordinary Working snapshots and select Current for review. Custom and all Last Saved snapshots stay untouched. Complete Mock is Ready/Match with zero warning items; Incomplete Mock is Incomplete/Mismatch with Generated identity 3, Missing required value 9, Auto-renamed duplicate 3, and total 15. The pair load is one undoable history action, and later edits use the same Undo / Redo history. There is no mock-only session, mode, preserved real session, return-to-session action, or mock-specific reset behavior. Reset returns the viewed dataset's Working state to that dataset's Last Saved snapshot.

## Action and Dialog Behavior

| Action | Behavior |
|---|---|
| Save | Save Working to Last Saved without a warning confirmation. |
| Clone | Choose source; immediately copy source Working to viewed destination Working; preserve destination Last Saved. |
| Reset | Confirm discard of Working changes; restore Last Saved. Disabled if no Last Saved exists. |
| Clear | Confirm clearing selected Working; preserve Last Saved. |
| Sizing | Confirm only populated-data truncation. |
| Import | Preserve current import flow and lifecycle; no new broad modal redesign. |
| Export | Export Last Saved; no warning confirmation. |
| Complete Mock / Incomplete Mock | Load the selected fixture immediately; no dropdown or confirmation. |
| CBD entry/navigation | Never blocked or confirmed by warnings or Product Mismatch. |

## Examples

1. **Save state:** a selected Current tab can be visually active while its gray dot and accessible title say `Draft`.
2. **Generated numbering:** `Steel`, blank, `Plastic`, blank gives effective BOM names `Steel`, `Material 1`, `Plastic`, `Material 2`.
3. **Warning total:** 2 generated identities + 3 missing parameter locations = footer `⚠ 5`; Product Mismatch contributes zero.
4. **Single warning:** a one-item Missing required value category expands to one source item; selecting it targets that field directly.
5. **Multiple warnings:** three missing parameters expand into three source items; selecting one targets its source.
6. **Duplicate entry:** with `mat0.3a` and `mat0.3a(1)` already present, a new `mat0.3a` becomes `mat0.3a(2)` and creates one auto-rename warning.
7. **Reset after mock:** mock load and subsequent edits are ordinary Working changes; Reset restores the existing Last Saved snapshot.
8. **Mock fixture totals:** Complete Mock has zero warning items; Incomplete Mock totals 3 Generated identity + 9 Missing required value + 3 Auto-renamed duplicate = 15. Its Product Mismatch is a separate status.

## Implementation Checklist

### Toolbar
- [x] Desktop primary toolbar is one row where width permits (checked at 1280px).
- [x] Reference / Current / Custom are on toolbar level.
- [x] Saved uses a green dot.
- [x] Draft uses a neutral gray dot, including when no Last Saved snapshot exists.
- [x] Active-tab styling is distinct from save state.
- [x] Save stays neutral and is enabled for Draft state.
- [x] Sizing, Import, Clone, Reset, Clear, Save, and Export use icon-only neutral actions with tooltips.
- [x] Clone label is `Clone`.
- [x] Table selector order is BOM / Work Centers / Routing / All.
- [x] Table selector buttons use equal fixed sizing.
- [x] Prepare Dataset remains far right and uses an Info icon.
- [x] Header has brand/product context at left, exactly four centered navigation tabs, and right Undo / Redo / Info utilities in that order.
- [x] Global Header has no Search; disabled Undo/Redo use muted opacity without `cursor-not-allowed`.
- [x] Header Product context shows Name (UOM) only when normalized Name and UOM match; otherwise it stays neutral as `Product (Unit)`.
- [x] Undo / Redo stay visible in the right Header utility group and are enabled only for available Master Data history.
- [x] Search is local to Master Data and keeps the existing selected-table / All filtering behavior.
- [x] Per-table Search controls are removed.
- [x] Clone source flyout supports hover, focus, click, keyboard selection, excludes destination, and closes when pointer leaves trigger and menu.

### Metadata
- [x] Product Name remains blank until entered.
- [x] UOM remains blank until entered.
- [x] UOM is free input.
- [x] Metadata fields use stable relative widths.

### Prepare Dataset
- [x] Reference / Current / Custom summaries use separate vertical rows at all widths.
- [x] Save states are shown for all datasets.
- [x] Dataset rows do not show Prepared / Needs input readiness.
- [x] Per-dataset warning counts are shown and are independent of save states.
- [x] Clicking a non-zero dataset warning count filters the category rows; `All` restores the combined view.
- [x] Outer popover rectangle is fixed at approximately 24rem × 30rem and clamps to the viewport.
- [x] Top row reads Dataset, readiness, Product status, and Close in one compact line.
- [x] Ready / Incomplete uses a green/amber dot and remains a status, not a warning.
- [x] Product Match / Mismatch is clickable, has no chevron/border/filled status background, and remains outside the warning count.
- [x] Product details use a floating mini-popover; opening/closing details does not change panel geometry.
- [x] Normal Info opening and normal panel reopening keep Product details closed.
- [x] Footer Product status opens Prepare Dataset with the floating Product details open.
- [x] Outside click and Escape close Product details; a second Escape closes Prepare Dataset.
- [x] Reference / Current / Custom save state and warning columns use the same fixed grid.
- [x] Positive dataset warning counts align right as `⚠ N`; zero uses a muted `0` with no triangle.
- [x] Warnings heading and `All` control stay fixed while the warning list scrolls.
- [x] Warning category count and chevron columns stay fixed across all three categories.
- [x] Warning list is the only scrollable panel region; the outer panel never scrolls.
- [x] Complete Mock / Incomplete Mock action row stays fixed below the warning viewport.
- [x] Outer panel width/height and all fixed regions remain unchanged in visual cases A–J.
- [x] Narrow desktop panel fits the viewport without horizontal overflow.
- [x] Phone-height panel clamps to the remaining Main area so the mock row stays visible above the Footer.
- [x] Ready / Incomplete and Product Match/Mismatch use the shared handoff state and Product Name/UOM comparison.
- [x] Product Match / Mismatch is on the Dataset top row and opens floating identity details.
- [x] Product Match / Mismatch uses normalized Product Name and UOM comparison.
- [x] Product Match / Mismatch details start closed when the panel component mounts.
- [x] Prepare Dataset and Footer use the same readiness derivation; Custom does not affect readiness.
- [x] Compared Reference / Current Product Name and UOM details are compact; there is no separate Comparison section.
- [x] Unnecessary Custom/CBD explanation is removed.
- [x] Product Mismatch is Status.
- [x] Product Mismatch is excluded from Warning count.
- [x] Product Mismatch does not block/confirm CBD.
- [x] Warnings section exists.
- [x] Warnings heading has no warning icon; exactly three category rows remain visible, including zero counts.
- [x] Zero-count category label stays at normal contrast; only its number is muted, with no click, hover, or chevron affordance.
- [x] Positive category counts, including count 1, expand or collapse.
- [x] Category rows align label, fixed count column, and fixed right-side chevron.
- [x] Actual warning items navigate directly and have no chevron or expansion/navigation indicator.
- [x] Blank required Routing Work Center is counted as Missing required value.
- [x] Warning details scroll inside the fixed-size warning viewport without growing the outer panel.
- [x] Invalid value and Unresolved Work Center are not Prepare Dataset categories.
- [x] Invalid numeric values and unavailable nonblank Routing Work Centers are rejected at normal edit/import ingress.
- [x] Positive warning category rows are the expansion click target, including when count is one.
- [x] Detail entries navigate to source.
- [x] Outside click closes popover.
- [x] Escape closes popover.
- [x] Trigger toggles popover.
- [x] Warning navigation switches dataset and table, enters Edit, selects and focuses/highlights its source row/field.

### Footer
- [x] Reference and Current structure counts use BOM / WC / RTG order; Custom is omitted.
- [x] Readiness is limited to Reference and Current and uses `Datasets Ready` / `Datasets Incomplete` with a dot, semibold text, and semantic color.
- [x] Product Match/Mismatch compares normalized Product Name and UOM, and uses the same handoff status in Footer and Prepare Dataset.
- [x] Product Match/Mismatch opens the floating identity mini-popover without changing the Prepare Dataset panel size.
- [x] `⚠ 0` remains visible; `⚠ N` uses affected warning-item count and excludes Product Mismatch/readiness.
- [x] Clicking `⚠ N` requests Prepare Dataset with all warning roles visible.
- [x] Full Reference/Current Standard Cost and Net Gap remain independent from Selected Comparison.
- [x] Unavailable Standard Cost/Net Gap displays `—`; no zero is fabricated.
- [x] Net Gap is Current minus Reference; only the number uses positive/negative semantic color.
- [x] Header, Main, and Footer align to the same centered `max-w-[1440px]` frame.
- [x] Main is full viewport width with the centered frame inside it; Footer remains a shrink-0 shell sibling and the full-width Main owns scrolling.
- [x] Footer groups fit one row at the inspected desktop width.
- [ ] Long-page scroll and narrow-screen Footer wrapping still need visual acceptance.
- [x] Product Match/Mismatch consistently compares normalized Product Name and UOM in the handoff, shared utility, Header context, Footer, and Prepare Dataset.

### Generated identities
- [x] Blank BOM identities display/use Material N.
- [x] Blank Work Center identities display/use Work Center N.
- [x] Blank Routing identities display/use Process N.
- [x] Numbering is not physical-row-based.
- [x] Generated names Save correctly.
- [x] Generated names Export correctly.
- [x] Generated names create warning entries.
- [x] Generated names do not globally block workflow.

### Duplicates
- [x] Duplicate identity auto-renames.
- [x] Next suffix is deterministic and available-suffix aware.
- [x] Direct editing is covered.
- [x] Paste/bulk paths are covered where applicable.
- [x] Auto-renamed duplicate creates a warning.
- [x] No duplicate-confirm modal is added.

### Data quality
- [x] Missing required input remains Unavailable.
- [x] Invalid input remains Unavailable.
- [x] Unresolved Work Center affects only dependent results.
- [x] No silent zero substitution is introduced.
- [x] No global warning blocker is introduced.
- [x] Warning source navigation works.

### Mock
- [x] Exactly two direct development mock actions exist: Complete Mock and Incomplete Mock.
- [x] Complete Mock has matching Product Name/UOM, calculable costs, and zero warnings.
- [x] Incomplete Mock has exactly 3 Generated identity, 9 Missing required value, 3 Auto-renamed duplicate, total 15; Product Mismatch is outside that count.
- [x] Post-load Complete Mock remains zero-warning with calculable Reference and Current costs after loading over stale Custom Working data.
- [x] Post-load Incomplete Mock is exactly 3 / 9 / 3 = 15 after loading over stale Custom sizing/placeholders.
- [x] Product Mismatch after Incomplete Mock remains separate from the warning total.
- [x] Mock-load Undo restores prior Custom Working data and Redo clears it again in the same history step.
- [x] Mock load does not replace Last Saved datasets.
- [x] Neither mock action uses a dropdown or confirmation; both use ordinary Working/history state.
- [x] Ordinary Working state is used.
- [x] Ordinary Undo / Redo history is used.
- [x] No Mock Session remains.
- [x] No Mock Mode remains.
- [x] No Return to working session remains.
- [x] Reset restores Last Saved after mock load.

### Actions
- [x] Clone source selection works.
- [x] Clone has no second confirmation.
- [x] Reset confirmation is correct.
- [x] Clear confirmation is correct.
- [x] Sizing confirms only destructive populated truncation.
- [x] Save has no warning confirmation.
- [x] Export has no warning confirmation.
- [x] CBD entry has no warning confirmation.

### Scope
- [x] No Master Data table redesign.
- [x] The existing Master Data table implementation is preserved while shared search and warning targeting work.
- [x] Shared Header follows the latest order and label contract without adding workflow status, CTA, warning text, or navigation items.
- [x] No broad Footer redesign.
- [x] Cost Breakdown, Candidate/RCA, and Simulation receive presentation-only refinements.
- [x] No finalized cost formulas changed unintentionally.
- [x] Desktop visual inspection covered the Header, Master Data toolbar, open Prepare Dataset popover, and Footer alignment.
- [x] Prepare Dataset narrow-desktop panel fit is visually accepted at 1024×768; full-app Footer reflow is still outside this correction.

### Docs
- [x] MASTER_DATA.md is reconciled with latest decisions.
- [x] CROSS_CUTTING.md is reconciled with Product Mismatch semantics.
- [x] Current authoritative docs contain no contradictory mock/session behavior.
- [x] New UX contract is linked/indexed appropriately if needed.

## Verification Checklist

- [x] Targeted verifiers pass.
- [x] Relevant regression verifiers pass.
- [x] TypeScript typecheck passes as part of `npm run build`.
- [x] Lint availability checked; no lint script is configured.
- [x] Production build passes.
- [x] `git diff --check` passes.
- [x] Final diff is manually reviewed against this contract.
- [x] Unrelated changes are absent.
- [x] Changes committed and pushed on `CBD-UXUI` without merging; the delivered worktree is clean.

### Verification Notes

- Prepare Dataset visual acceptance used an isolated browser profile at 1920×1080 for A–J. Each state retained a 384×480 outer panel; dataset rows, warning heading/list, and mock actions kept the same bounds, the outer panel had no overflow, and long expanded details scrolled only inside the warning viewport. The 1024×768 panel also stayed within the viewport. At 375×760 it clamped to 343×401 within Main, keeping the fixed mock row above Footer.
- Footer Product click, normal Info opening, outside click, Product-detail toggle, and one-/two-step Escape behavior were exercised in the isolated browser. Full-app Footer wrapping/long-page scrolling, Clone pointer/keyboard interactions, and warning-focus replay still need browser click-through/visual acceptance.
- `package.json` currently has no lint or test script. The repository's standalone targeted verifiers were run directly; exact commands are listed in the final work report.

## Deferred / Locked for Later

1. A separate, detailed Master Data table visual redesign and any table-library migration.
2. A detailed table toolbar, selection, drag/reorder, and bulk-action review.
3. Detailed Import modal visual redesign beyond preserving current valid behavior.

The next Master Data review area after this branch is the Table. Table business behavior and the current branch's data, lifecycle, and domain logic remain authoritative in that later review.
