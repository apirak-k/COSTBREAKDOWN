# Master Data Toolbar and Engineering Workspace UX Contract

**Status:** Current user-directed UX contract for branch `feat/master-data-toolbar-prepare-ux`. This contract supersedes conflicting earlier presentation decisions. Finalized business behavior remains authoritative unless a decision below explicitly changes the presentation.

## Scope

This contract covers the shared Header, Master Data toolbar/search/metadata and warning navigation, Cost Breakdown hierarchy, Candidate/RCA presentation, and Simulation result hierarchy.

It does not change finalized calculations, Candidate generation, RCA data semantics, Simulation logic, Master Data lifecycle, or Export's Last Saved source. It allows small table interaction changes required for shared search and warning navigation, without replacing the current table implementation.

## Finalized UX Decisions

- The shared Header is one compact workspace bar with three desktop zones: Undo, Redo, `COSTBREAKDOWN`, and safely resolved Product (Unit) context at the left; centered Master Data / Cost Breakdown / Candidate / Simulation navigation; and the permanent `Search data...` field plus a final icon-only Info control for Prepare Dataset at the right. Smaller widths may reflow. Do not show workflow status, a workflow CTA, warning text, or additional navigation in the Header.
- Undo and Redo remain visible and use the existing Master Data history; they are enabled only on Master Data when the corresponding history action exists, and disabled on other pages. Search remains visible but is enabled only on Master Data, where it filters the currently visible table context; other page search semantics are not finalized.
- On normal desktop widths, Master Data keeps Reference / Current / Custom, View / Edit, actions, BOM / Work Centers / Routing / All, and far-right Prepare Dataset at one compact toolbar level. Narrow widths may wrap.
- Master Data toolbar selectors remain text controls. Sizing, Import, Clone, Reset, Clear, Save, Export, and Prepare Dataset are icon-only, neutral, consistently sized actions with tooltips. Prepare Dataset uses Info. Save does not receive a special color treatment.
- Dataset selection styling and save-state dots are independent. The only user-facing save states are `Saved` (green) and `Draft` (neutral gray). Draft means Working differs from Last Saved or no Last Saved exists. Save state is derived from snapshots, not a manual flag.
- Save stays visible and is enabled when Working is Draft. Save copies the viewed Working state to that dataset's Last Saved state.
- Product Name and UOM remain blank unless entered; do not synthesize `Product` or `PC` in the UI, Save, or Export. UOM is free text. Selling Price and SG&A keep their existing missing-value semantics; Dataset Remark may be blank. Metadata fields have stable relative widths: Product Name wide, UOM narrow, Selling Price medium, SG&A narrow, Dataset Remark wide.
- Table-view controls appear in the order BOM / Work Centers / Routing / All, have equal fixed sizing, and remain at toolbar level. Prepare Dataset stays at the toolbar's far right and uses an Info icon.
- Header Search is a permanent inline `Search data...` field. It filters BOM, Work Centers, or Routing for the selected view; `All` applies the same query across all visible tables. It is disabled outside Master Data until those pages have finalized search behavior. The embedded per-table Search boxes are removed.
- Clone opens a source flyout on hover, focus, or click; the flyout excludes the destination, stays open while moving between trigger and menu, closes when the pointer leaves both, and supports keyboard selection. Choosing a source clones immediately without a second confirmation.
- Prepare Dataset is a compact toggleable popover. It closes from its trigger, outside click, Escape, or its close button. Reference / Current / Custom summaries show save state and a per-dataset warning count; rows are horizontal on desktop and responsive on small screens. Do not show Prepared / Needs input in those rows or explain that Custom is unused by CBD.
- The Prepare Dataset title row shows `Prepare Dataset`, `Ready` / `Incomplete`, and Close. A separate full-width `Product Match` / `Product Mismatch` row follows immediately; its chevron expands/collapses Reference and Current Product Name/UOM details. Product status does not change warning counts. Do not add a separate Comparison section.
- Ready requires Reference and Current readiness plus no Missing required value warnings in Reference or Current. Custom does not affect readiness. Use this same readiness derivation in the Footer and Prepare Dataset title row; do not show readiness on individual dataset rows.
- Status describes context/state; Warning identifies data to review. Product Mismatch is a non-blocking comparison status, excluded from warning categories and counts, and never triggers a CBD confirmation or blocker.
- Prepare Dataset exposes exactly three warning categories: Generated identity, Missing required value, and Auto-renamed duplicate. Invalid numeric values and nonblank unavailable Routing Work Center references are rejected at normal edit/import ingress; they are not warning categories. Blank required Work Center is Missing required value. Counts represent affected source items/locations, not categories, and do not double-count a condition at one location.
- Always show Reference / Current / Custom warning counts. Clicking a non-zero dataset count filters the category list to that dataset; `All` restores the combined list. Do not repeat dataset counts inside category rows.
- Always show exactly three warning category rows, including zero-count categories. A zero row is disabled, muted, and has no chevron. Positive rows use a stable label / fixed count / fixed far-right chevron layout and always expand or collapse, including when count is one. Each expanded actual warning item is the final action: it navigates directly to the source and has no chevron or other expansion/navigation indicator. Bound the popover height and scroll its warning list internally. Navigation activates the dataset and table, switches to Edit, selects and scrolls the row, and focuses/highlights the field when practical. Warning presence never blocks normal application use.
- The shared Footer is a compact three-group summary: Reference/Current structure in BOM / WC / RTG order; Reference+Current readiness, clickable Product Match/Mismatch, and clickable `⚠ N`; then full Reference/Current Standard Cost and full Net Gap. Both statuses have a dot, semibold text, and semantic color; Product Match/Mismatch has no chevron. Custom is omitted from structure/readiness, but its warning items remain in the warning total. Product Mismatch and readiness are not warning items.
- Blank BOM, Work Center, and Routing identities have usable effective identities `Material N`, `Work Center N`, and `Process N`. `N` is the ordinal among currently blank/generated identities in that table, not the physical row number. Generated identities may be saved and exported, appear in warnings, and do not block workflow.
- Duplicate effective identities are auto-renamed to the next available deterministic suffix, such as `mat0.3a`, `mat0.3a(1)`, `mat0.3a(2)`. Apply the rule to direct entry, paste, bulk edits, and other applicable input paths. Report each correction as a warning without a modal. Existing imported/legacy ambiguous data must not cause the comparison engine to guess a match.
- Missing required values make only affected and dependent results Unavailable and appear in the warning list. Invalid numeric values are rejected at edit/import ingress; unavailable nonblank Routing Work Center references are rejected at edit/import ingress. Existing persisted invalid data remains Unavailable with local invalid-cell cues, but neither invalid values nor unresolved Work Centers appear as Prepare Dataset warning categories. Never replace missing values with zero. A valid zero remains valid where formulas permit it.
- Development exposes one `Load Mock Data` action. It loads immediately into the current ordinary Working/history state, creates a normal undoable history action, and has no separate mock session/mode, return action, or confirmation. Reset continues to restore Last Saved.
- Clone is labeled `Clone`; it selects a source and copies that source's Working data into the viewed destination's Working data. The destination Last Saved is unchanged. Source selection performs the copy without a second replacement confirmation.
- Reset remains confirmation-protected and restores Working from Last Saved. Clear remains confirmation-protected and clears only the selected Working state. Sizing confirms only a decrease that removes populated data; growth or removal of blank trailing rows does not confirm.
- Valid Import continues to replace viewed Working data and initialize sizing from imported row counts without overwriting Last Saved. Invalid numeric values and unavailable nonblank Routing Work Center references reject Import. Export continues to export viewed Last Saved. Neither shows warning confirmation.
- Cost Breakdown shows Total Gap first, then cause categories, followed by BOM/Processing detail; avoid repeating the same values across Snapshot Comparison and Variance Tree. Selected Comparison remains a compact scope control.
- Candidate / RCA uses a compact decision table with key candidate values visible and changed/process details disclosed on demand. The RCA Case focuses on Candidates, Root Cause / Why?, and Action; Simulation is optional. RCA save state uses Saved / Draft.
- Simulation leads with Reference → Current → Simulated, cost story, and available result/decision metrics, followed by economic assumptions, Factors to Simulate, and parameter details. Preserve the current graph and formulas; economic evaluation remains advisory.
- The shared Footer wraps its three logical groups on narrow screens and remains one row on normal desktop widths. Its warning indicator always shows `⚠ N`, including zero, and opens Prepare Dataset with all warning roles visible. Product Match/Mismatch opens Prepare Dataset with comparison details expanded and no warning filter. Full Reference/Current costs and Net Gap do not follow Selected Comparison scope.
- Header, Main, and Footer content share the centered `max-w-[1440px]` frame with `px-3 sm:px-4 lg:px-6`; Header/Footer backgrounds span the viewport. The app shell is `h-dvh min-h-0 flex flex-col overflow-hidden`; Main owns vertical scrolling and Footer stays at the viewport bottom without overlaying content.
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

Show `Warnings N` across all datasets, or `Warnings · {Dataset} N` while filtered. The canonical list always contains exactly three rows, including disabled zero-count rows. A non-zero dataset count filters the section; `All` clears the filter. Category rows use a fixed label / count / chevron grid: count 0 is disabled with no chevron; every positive count expands a compact list of navigable locations. Actual warning items navigate directly and show no chevron or other navigation indicator. Keep the popover height bounded and scroll the warning list internally.

## Generated and Default Identity Behavior

Product Name and UOM remain blank until supplied. Blank table identities use their generated effective names. Generated numbering counts blank/generated identity entries in table order, independently for BOM, Work Centers, and Routing. Example: `Steel`, blank, `Plastic`, blank becomes `Steel`, `Material 1`, `Plastic`, `Material 2`.

Generated values must be consistent in display, ordinary dataset use, Save, and Last Saved export. A generated-name warning remains visible to make the implicit identity reviewable. Identity generation must not silently write a physical row number as the business identity.

## Duplicate Identity Behavior

Uniqueness applies per identity domain and includes effective generated identities. Normalize a newly entered duplicate to the next free suffix deterministically. For example, if `mat0.3a` and `mat0.3a(1)` exist, another entry of `mat0.3a` becomes `mat0.3a(2)`. The application records the auto-rename as a warning and continues without confirmation.

## Missing and Invalid Values

Missing required numeric inputs produce Unavailable affected results and Missing required value warning items with a source location. Invalid numbers, non-positive Capacity, Yield outside its existing valid range, and unavailable nonblank Routing Work Center references are rejected at the normal edit/import boundary; dependent results for any legacy persisted invalid values remain Unavailable. Do not fabricate values or convert missing/invalid data to zero. Blank Product Name, UOM, Dataset Remark, and valid zeroes allowed by finalized formulas retain their existing metadata/formula semantics.

## Mock Behavior

`Load Mock Data` loads its deterministic Reference/Current sample pair into the active product's ordinary Working snapshots and selects Current for review. Custom and all Last Saved snapshots stay untouched. The pair load is one undoable history action, and later edits use the same Undo / Redo history. There is no mock-only session, mode, preserved real session, return-to-session action, or mock-specific reset behavior. Reset returns the viewed dataset's Working state to that dataset's Last Saved snapshot.

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
| Load Mock Data | Load immediately; no confirmation. |
| CBD entry/navigation | Never blocked or confirmed by warnings or Product Mismatch. |

## Examples

1. **Save state:** a selected Current tab can be visually active while its gray dot and accessible title say `Draft`.
2. **Generated numbering:** `Steel`, blank, `Plastic`, blank gives effective BOM names `Steel`, `Material 1`, `Plastic`, `Material 2`.
3. **Warning total:** 2 generated identities + 3 missing parameter locations = footer `⚠ 5`; Product Mismatch contributes zero.
4. **Single warning:** a one-item Missing required value category expands to one source item; selecting it targets that field directly.
5. **Multiple warnings:** three missing parameters expand into three source items; selecting one targets its source.
6. **Duplicate entry:** with `mat0.3a` and `mat0.3a(1)` already present, a new `mat0.3a` becomes `mat0.3a(2)` and creates one auto-rename warning.
7. **Reset after mock:** mock load and subsequent edits are ordinary Working changes; Reset restores the existing Last Saved snapshot.

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
- [x] Header has left utilities/product context, centered navigation, and right Search/Info zones on desktop; smaller widths reflow.
- [x] `COSTBREAKDOWN` uses approximately `text-sm`; disabled Undo, Redo, and Search use reduced opacity without `cursor-not-allowed`.
- [x] Header Product context shows Name (UOM) only when normalized Name and UOM match; otherwise it stays neutral as `Product (Unit)`.
- [x] Undo / Redo stay visible in the shared Header and are enabled only for available Master Data history; Search stays visible and is enabled only on Master Data.
- [x] Header Search filters the selected table and all visible tables in All view.
- [x] Per-table Search controls are removed.
- [x] Clone source flyout supports hover, focus, click, keyboard selection, excludes destination, and closes when pointer leaves trigger and menu.

### Metadata
- [x] Product Name remains blank until entered.
- [x] UOM remains blank until entered.
- [x] UOM is free input.
- [x] Metadata fields use stable relative widths.

### Prepare Dataset
- [x] Reference / Current / Custom summaries are horizontal on desktop.
- [x] Save states are shown for all datasets.
- [x] Dataset rows do not show Prepared / Needs input readiness.
- [x] Per-dataset warning counts are shown and are independent of save states.
- [x] Clicking a non-zero dataset warning count filters the category rows; `All` restores the combined view.
- [x] Ready / Incomplete appears in the Prepare Dataset title row.
- [x] Product Match / Mismatch is on its own full-width row below the title and expands/collapses identity details.
- [x] Product Match / Mismatch uses normalized Product Name and UOM comparison.
- [x] Product Match / Mismatch details start collapsed.
- [x] Prepare Dataset and Footer use the same readiness derivation; Custom does not affect readiness.
- [ ] Compared Reference / Current Product Name and UOM details are compact; there is no separate Comparison section (requires visual acceptance).
- [x] Unnecessary Custom/CBD explanation is removed.
- [x] Product Mismatch is Status.
- [x] Product Mismatch is excluded from Warning count.
- [x] Product Mismatch does not block/confirm CBD.
- [x] Warnings section exists.
- [x] Exactly three warning category rows remain visible, including zero counts.
- [x] Zero-count rows are disabled, muted, and have no chevron.
- [x] Positive category counts, including count 1, expand or collapse.
- [x] Category rows align label, fixed count column, and fixed right-side chevron.
- [x] Actual warning items navigate directly and have no chevron or expansion/navigation indicator.
- [x] Blank required Routing Work Center is counted as Missing required value.
- [x] Warning details scroll inside a bounded popover.
- [x] Invalid value and Unresolved Work Center are not Prepare Dataset categories.
- [x] Invalid numeric values and unavailable nonblank Routing Work Centers are rejected at normal edit/import ingress.
- [x] Warning category row is the expansion click target.
- [x] Detail entries navigate to source.
- [x] Outside click closes popover.
- [x] Escape closes popover.
- [x] Trigger toggles popover.
- [x] Warning navigation switches dataset and table, enters Edit, selects and focuses/highlights its source row/field.

### Footer
- [x] Reference and Current structure counts use BOM / WC / RTG order; Custom is omitted.
- [x] Readiness is limited to Reference and Current and uses `Datasets Ready` / `Datasets Incomplete` with a dot, semibold text, and semantic color.
- [x] Product Match/Mismatch compares normalized Product Name and UOM, and uses the same handoff status in Footer and Prepare Dataset.
- [x] Product Match/Mismatch is a separate clickable status with a dot, semibold text, and semantic color; it has no chevron and opens expanded comparison details.
- [x] `⚠ 0` remains visible; `⚠ N` uses affected warning-item count and excludes Product Mismatch/readiness.
- [x] Clicking `⚠ N` requests Prepare Dataset with all warning roles visible.
- [x] Full Reference/Current Standard Cost and Net Gap remain independent from Selected Comparison.
- [x] Unavailable Standard Cost/Net Gap displays `—`; no zero is fabricated.
- [x] Net Gap is Current minus Reference; only the number uses positive/negative semantic color.
- [x] Header, Main, and Footer align to the same centered `max-w-[1440px]` frame.
- [x] Short and long pages keep Footer at the viewport bottom while Main scrolls internally without overlap.
- [ ] Footer groups wrap cleanly on narrow screens and fit one row on normal desktop widths.
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
- [x] Exactly one user-facing Load Mock Data action exists.
- [x] Old two-button mock UI is removed/consolidated.
- [x] Mock load has no confirmation.
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
- [ ] Human visual acceptance of the final layouts at desktop and narrow widths.

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
- [ ] Changes committed and pushed without merging. This checkout remains an uncommitted worktree.

### Verification Notes

- Browser inspection at desktop and narrow widths remains unverified in this checkout because the local preview did not open in the available browser session. Human visual acceptance remains pending.
- Clone pointer/keyboard interactions and warning-focus replay still need browser click-through verification; source-level checks do not count as visual or interaction acceptance.
- `package.json` currently has no lint or test script. The repository's standalone targeted verifiers were run directly; exact commands are listed in the final work report.

## Deferred / Locked for Later

1. A separate, detailed Master Data table visual redesign and any table-library migration.
2. A detailed table toolbar, selection, drag/reorder, and bulk-action review.
3. Detailed Import modal visual redesign beyond preserving current valid behavior.

The next Master Data review area after this branch is the Table. Table business behavior and the current branch's data, lifecycle, and domain logic remain authoritative in that later review.
