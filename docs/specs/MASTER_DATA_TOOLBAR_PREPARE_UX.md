# Master Data Toolbar and Engineering Workspace UX Contract

**Status:** Current user-directed UX contract for branch `feat/master-data-toolbar-prepare-ux`. This contract supersedes conflicting earlier presentation decisions. Finalized business behavior remains authoritative unless a decision below explicitly changes the presentation.

## Scope

This contract covers the shared Header, Master Data toolbar/search/metadata and warning navigation, Cost Breakdown hierarchy, Candidate/RCA presentation, and Simulation result hierarchy.

It does not change finalized calculations, Candidate generation, RCA data semantics, Simulation logic, Master Data lifecycle, or Export's Last Saved source. It allows small table interaction changes required for shared search and warning navigation, without replacing the current table implementation.

## Finalized UX Decisions

- The shared Header contains page navigation and useful workflow context. Undo, Redo, and Search are consistent icon-only utilities with tooltips, accessible names, focus styling, and clear disabled state. Undo/Redo appear only on Master Data; Search appears there and searches the current table context.
- On normal desktop widths, Master Data keeps Reference / Current / Custom, View / Edit, actions, BOM / Work Centers / Routing / All, and far-right Prepare Dataset at one compact toolbar level. Narrow widths may wrap.
- Master Data toolbar selectors remain text controls. Sizing, Import, Clone, Reset, Clear, Save, Export, and Prepare Dataset are icon-only, neutral, consistently sized actions with tooltips. Prepare Dataset uses Info. Save does not receive a special color treatment.
- Dataset selection styling and save-state dots are independent. The only user-facing save states are `Saved` (green) and `Draft` (neutral gray). Draft means Working differs from Last Saved or no Last Saved exists. Save state is derived from snapshots, not a manual flag.
- Save stays visible and is enabled when Working is Draft. Save copies the viewed Working state to that dataset's Last Saved state.
- Product Name and UOM remain blank unless entered; do not synthesize `Product` or `PC` in the UI, Save, or Export. UOM is free text. Selling Price and SG&A keep their existing missing-value semantics; Dataset Remark may be blank. Metadata fields have stable relative widths: Product Name wide, UOM narrow, Selling Price medium, SG&A narrow, Dataset Remark wide.
- Table-view controls appear in the order BOM / Work Centers / Routing / All, have equal fixed sizing, and remain at toolbar level. Prepare Dataset stays at the toolbar's far right and uses an Info icon.
- Header Search is a compact expandable control. It filters BOM, Work Centers, or Routing for the selected view; `All` applies the same query across all visible tables. The embedded per-table Search boxes are removed.
- Clone opens a source flyout on hover, focus, or click; the flyout excludes the destination, stays open while moving between trigger and menu, closes when the pointer leaves both, and supports keyboard selection. Choosing a source clones immediately without a second confirmation.
- Prepare Dataset is a compact toggleable popover. It closes from its trigger, outside click, Escape, or its close button. Reference / Current / Custom summaries are horizontal on desktop and responsive on small screens. Show save state for all three and readiness for Reference and Current. Do not explain that Custom is unused by CBD.
- Status describes context/state; Warning identifies data to review. Product Mismatch is a non-blocking comparison status, excluded from warning categories and counts, and never triggers a CBD confirmation or blocker.
- The warning categories are generated/default identity names, auto-renamed duplicate identities, missing required parameters/values, invalid values, and Routing references to unavailable/unresolvable Work Centers. The total counts affected items/locations, not categories, and does not double-count one condition at one source location.
- Warning categories are compact rows with count before label and a row-wide click target. One affected location navigates directly. More than one expands a compact list; each detail navigates directly. Navigation activates the dataset and table, switches to Edit, selects and scrolls the row, and focuses/highlights the field when practical. Warning presence never blocks normal application use.
- The footer always shows only `⚠ N` for warnings, including `⚠ 0`. Clicking it navigates to Master Data and opens Prepare Dataset. Product Mismatch is excluded.
- Blank BOM, Work Center, and Routing identities have usable effective identities `Material N`, `Work Center N`, and `Process N`. `N` is the ordinal among currently blank/generated identities in that table, not the physical row number. Generated identities may be saved and exported, appear in warnings, and do not block workflow.
- Duplicate effective identities are auto-renamed to the next available deterministic suffix, such as `mat0.3a`, `mat0.3a(1)`, `mat0.3a(2)`. Apply the rule to direct entry, paste, bulk edits, and other applicable input paths. Report each correction as a warning without a modal. Existing imported/legacy ambiguous data must not cause the comparison engine to guess a match.
- Missing or invalid required values make only affected and dependent results Unavailable. Never replace them with zero; preserve local invalid-cell cues. A valid zero remains valid where formulas permit it.
- Development exposes one `Load Mock Data` action. It loads immediately into the current ordinary Working/history state, creates a normal undoable history action, and has no separate mock session/mode, return action, or confirmation. Reset continues to restore Last Saved.
- Clone is labeled `Clone`; it selects a source and copies that source's Working data into the viewed destination's Working data. The destination Last Saved is unchanged. Source selection performs the copy without a second replacement confirmation.
- Reset remains confirmation-protected and restores Working from Last Saved. Clear remains confirmation-protected and clears only the selected Working state. Sizing confirms only a decrease that removes populated data; growth or removal of blank trailing rows does not confirm.
- Import continues to replace viewed Working data and initialize sizing from imported row counts without overwriting Last Saved. Export continues to export viewed Last Saved. Neither shows warning confirmation.
- Cost Breakdown shows Total Gap first, then cause categories, followed by BOM/Processing detail; avoid repeating the same values across Snapshot Comparison and Variance Tree. Selected Comparison remains a compact scope control.
- Candidate / RCA uses a compact decision table with key candidate values visible and changed/process details disclosed on demand. The RCA Case focuses on Candidates, Root Cause / Why?, and Action; Simulation is optional. RCA save state uses Saved / Draft.
- Simulation leads with Reference → Current → Simulated, cost story, and available result/decision metrics, followed by economic assumptions, Factors to Simulate, and parameter details. Preserve the current graph and formulas; economic evaluation remains advisory.
- The shared footer remains compact; its warning indicator always shows `⚠ N`, including zero, and opens Prepare Dataset.
- Prepare Dataset and footer warning navigation do not add a global blocker or a CBD confirmation. No global page redesign beyond the Header workspace utilities is included.

## Status Model

| Dimension | Values | Meaning |
|---|---|---|
| Dataset save state | Saved / Draft | Saved means Working matches Last Saved. Draft means it differs or has never been saved. |
| Preparation | Prepared / Needs input | Existing readiness semantics for Reference and Current. |
| Comparison | Product Mismatch | Effective Reference and Current Product Names differ. Informational and non-blocking. |

Save-state dots are separate from selected-dataset styling. Preparation status and warning count are also separate concepts.

## Warning Model

Each warning item identifies a source dataset, table, record, field when available, category, and a human-readable label. Counts represent distinct affected source locations. Do not count Product Mismatch. Deduplicate repeated descriptions of the same condition at the same location.

At the first level, show `⚠ Warnings` and only categories with affected items. `⚠ Warnings 0` may be shown when no items exist; do not create zero-count category rows. For count 1, activate direct navigation. For count greater than 1, expand a compact list of navigable locations.

## Generated and Default Identity Behavior

Product Name and UOM remain blank until supplied. Blank table identities use their generated effective names. Generated numbering counts blank/generated identity entries in table order, independently for BOM, Work Centers, and Routing. Example: `Steel`, blank, `Plastic`, blank becomes `Steel`, `Material 1`, `Plastic`, `Material 2`.

Generated values must be consistent in display, ordinary dataset use, Save, and Last Saved export. A generated-name warning remains visible to make the implicit identity reviewable. Identity generation must not silently write a physical row number as the business identity.

## Duplicate Identity Behavior

Uniqueness applies per identity domain and includes effective generated identities. Normalize a newly entered duplicate to the next free suffix deterministically. For example, if `mat0.3a` and `mat0.3a(1)` exist, another entry of `mat0.3a` becomes `mat0.3a(2)`. The application records the auto-rename as a warning and continues without confirmation.

## Missing and Invalid Values

Missing required numeric inputs, invalid numbers, non-positive Capacity where a positive value is required, and unresolved Routing Work Center references produce Unavailable affected results and warnings with a source location. Dependent results also remain Unavailable. Do not fabricate values or convert missing/invalid data to zero. Blank Product Name, UOM, Dataset Remark, and valid zeroes allowed by finalized formulas retain their existing metadata/formula semantics.

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
4. **Single warning:** one invalid Capacity row opens its dataset/table and targets that field directly.
5. **Multiple warnings:** three missing parameters expand into three source links; selecting one targets its source.
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
- [x] Undo / Redo / Search are in the shared Header, contextual to Master Data.
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
- [x] Reference / Current readiness is shown.
- [x] Unnecessary Custom/CBD explanation is removed.
- [x] Product Mismatch is Status.
- [x] Product Mismatch is excluded from Warning count.
- [x] Product Mismatch does not block/confirm CBD.
- [x] Warnings section exists.
- [x] Counts precede labels.
- [x] Right-side affordance is aligned.
- [x] Warning row/text is the click target.
- [x] Count 1 provides direct navigation.
- [x] Count >1 uses progressive expansion.
- [x] Detail entries navigate to source.
- [x] Outside click closes popover.
- [x] Escape closes popover.
- [x] Trigger toggles popover.
- [x] Warning navigation switches dataset and table, enters Edit, selects and focuses/highlights its source row/field.

### Footer
- [x] `⚠ 0` is always visible.
- [x] `⚠ N` uses total affected warning-item count.
- [x] Footer indicator does not show the word Warning.
- [x] Product Mismatch is excluded.
- [x] Clicking the indicator opens Prepare Dataset.

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
- [x] Shared Header utilities are added without changing page navigation or workflow status behavior.
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
- [x] Branch is committed and pushed without merging.

### Verification Notes

- Browser inspection at desktop and narrow widths exercised Master Data, warning navigation, Header search, Cost Breakdown, Candidate/RCA, and Simulation. The app's browser-local review fixture is temporary; this is not human visual acceptance.
- Final browser checks confirmed single-click Clone opening, Tab access to source choices, immediate source selection, pointer-leave dismissal, and no warning-focus replay after switching away from and back to the target table.
- `package.json` currently has no lint or test script. The repository's standalone targeted verifiers were run directly; exact commands are listed in the final work report.

## Deferred / Locked for Later

1. A separate, detailed Master Data table visual redesign and any table-library migration.
2. A detailed table toolbar, selection, drag/reorder, and bulk-action review.
3. Detailed Import modal visual redesign beyond preserving current valid behavior.

The next Master Data review area after this branch is the Table. Table business behavior and the current branch's data, lifecycle, and domain logic remain authoritative in that later review.
