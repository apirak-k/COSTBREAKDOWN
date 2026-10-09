# Master Data Toolbar and Prepare Dataset UX Contract

**Status:** Finalized user decisions for branch `feat/master-data-toolbar-prepare-ux`. This scoped contract supersedes earlier Master Data UX wording where it conflicts. Business formulas and table visual redesign remain outside this contract.

## Scope

This contract covers the Master Data toolbar, dataset metadata defaults, Prepare Dataset popover, dataset statuses and warnings, generated and duplicate identities, warning navigation, footer warning entry, development mock loading, and existing toolbar action confirmations. It allows only the minimal cross-page/footer and table-focus changes needed for warning navigation.

It does not redesign Master Data tables, the global Header, the general Footer, Cost Breakdown, RCA, or Simulation. It does not change finalized cost formulas, Import's Working-state replacement lifecycle, or Export's Last Saved source.

## Finalized UX Decisions

- On normal desktop widths, one primary toolbar row contains Reference / Current / Custom, View / Edit, Sizing, Import, Clone, Reset, Clear, Save, Export, the BOM / Work Centers / Routing / All table selector, and a far-right Prepare Dataset trigger. Narrow widths may wrap.
- Dataset selection styling and save-state dots are independent. Saved is green; Unsaved and Not saved yet are gray. Their accessible labels use those exact terms. Save state is derived by comparing Working with Last Saved; no status flag is manually maintained.
- Save remains visible and becomes prominent only while Working differs from Last Saved. Save copies the viewed Working state to that dataset's Last Saved state.
- Product Name defaults effectively to `Product`; UOM defaults effectively to `PC`. Both defaults are saved and exported. UOM is free text. Selling Price and SG&A keep their existing missing-value semantics; Dataset Remark may be blank. Metadata fields have stable relative widths: Product Name wide, UOM narrow, Selling Price medium, SG&A narrow, Dataset Remark wide.
- Table-view controls appear in the order BOM / Work Centers / Routing / All, have equal fixed sizing, and remain at toolbar level. Prepare Dataset stays at the toolbar's far right.
- Prepare Dataset is a compact toggleable popover. It closes from its trigger, outside click, Escape, or its close button. Reference / Current / Custom summaries are horizontal on desktop and responsive on small screens. Show save state for all three and readiness for Reference and Current. Do not explain that Custom is unused by CBD.
- Status describes context/state; Warning identifies data to review. Product Mismatch is a non-blocking comparison status, excluded from warning categories and counts, and never triggers a CBD confirmation or blocker.
- The warning categories are generated/default identity names, auto-renamed duplicate identities, missing required parameters/values, invalid values, and Routing references to unavailable/unresolvable Work Centers. The total counts affected items/locations, not categories, and does not double-count one condition at one source location.
- Warning categories are compact rows with count before label and a row-wide click target. One affected location navigates directly. More than one expands a compact list; each detail navigates directly. Navigation activates the dataset and table, scrolls to the row, and focuses/highlights the field when practical. Warning presence never blocks normal application use.
- The footer always shows only `⚠ N` for warnings, including `⚠ 0`. Clicking it navigates to Master Data and opens Prepare Dataset. Product Mismatch is excluded.
- Blank BOM, Work Center, and Routing identities have usable effective identities `Material N`, `Work Center N`, and `Process N`. `N` is the ordinal among currently blank/generated identities in that table, not the physical row number. Generated identities may be saved and exported, appear in warnings, and do not block workflow.
- Duplicate effective identities are auto-renamed to the next available deterministic suffix, such as `mat0.3a`, `mat0.3a(1)`, `mat0.3a(2)`. Apply the rule to direct entry, paste, bulk edits, and other applicable input paths. Report each correction as a warning without a modal. Existing imported/legacy ambiguous data must not cause the comparison engine to guess a match.
- Missing or invalid required values make only affected and dependent results Unavailable. Never replace them with zero; preserve local invalid-cell cues. A valid zero remains valid where formulas permit it.
- Development exposes one `Load Mock Data` action. It loads immediately into the current ordinary Working/history state, creates a normal undoable history action, and has no separate mock session/mode, return action, or confirmation. Reset continues to restore Last Saved.
- Clone is labeled `Clone`; it selects a source and copies that source's Working data into the viewed destination's Working data. The destination Last Saved is unchanged. Source selection performs the copy without a second replacement confirmation.
- Reset remains confirmation-protected and restores Working from Last Saved. Clear remains confirmation-protected and clears only the selected Working state. Sizing confirms only a decrease that removes populated data; growth or removal of blank trailing rows does not confirm.
- Import continues to replace viewed Working data and initialize sizing from imported row counts without overwriting Last Saved. Export continues to export viewed Last Saved. Neither shows warning confirmation.
- Prepare Dataset and footer warning navigation do not add a global blocker or a CBD confirmation. Do not move Undo / Redo into the global Header in this branch.

## Status Model

| Dimension | Values | Meaning |
|---|---|---|
| Dataset save state | Saved / Unsaved / Not saved yet | Derived from Working and Last Saved snapshots; `Not saved yet` applies only if no Last Saved snapshot exists. |
| Preparation | Prepared / Needs input | Existing readiness semantics for Reference and Current. |
| Comparison | Product Mismatch | Effective Reference and Current Product Names differ. Informational and non-blocking. |

Save-state dots are separate from selected-dataset styling. Preparation status and warning count are also separate concepts.

## Warning Model

Each warning item identifies a source dataset, table, record, field when available, category, and a human-readable label. Counts represent distinct affected source locations. Do not count Product Mismatch. Deduplicate repeated descriptions of the same condition at the same location.

At the first level, show `⚠ Warnings` and only categories with affected items. `⚠ Warnings 0` may be shown when no items exist; do not create zero-count category rows. For count 1, activate direct navigation. For count greater than 1, expand a compact list of navigable locations.

## Generated and Default Identity Behavior

Product Name and UOM use effective defaults `Product` and `PC` unless the user supplies a value. Blank table identities use their generated effective names. Generated numbering counts blank/generated identity entries in table order, independently for BOM, Work Centers, and Routing. Example: `Steel`, blank, `Plastic`, blank becomes `Steel`, `Material 1`, `Plastic`, `Material 2`.

Generated values must be consistent in display, ordinary dataset use, Save, and Last Saved export. A generated-name warning remains visible to make the implicit identity reviewable. Identity generation must not silently write a physical row number as the business identity.

## Duplicate Identity Behavior

Uniqueness applies per identity domain and includes effective generated identities. Normalize a newly entered duplicate to the next free suffix deterministically. For example, if `mat0.3a` and `mat0.3a(1)` exist, another entry of `mat0.3a` becomes `mat0.3a(2)`. The application records the auto-rename as a warning and continues without confirmation.

## Missing and Invalid Values

Missing required numeric inputs, invalid numbers, non-positive Capacity where a positive value is required, and unresolved Routing Work Center references produce Unavailable affected results and warnings with a source location. Dependent results also remain Unavailable. Do not fabricate values or convert missing/invalid data to zero. Product Name `Product`, UOM `PC`, blank Dataset Remark, and valid zeroes allowed by finalized formulas are not missing warnings.

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

1. **Save state:** a selected Current tab can be visually active while its gray dot and accessible title say `Unsaved`.
2. **Generated numbering:** `Steel`, blank, `Plastic`, blank gives effective BOM names `Steel`, `Material 1`, `Plastic`, `Material 2`.
3. **Warning total:** 2 generated identities + 3 missing parameter locations = footer `⚠ 5`; Product Mismatch contributes zero.
4. **Single warning:** one invalid Capacity row opens its dataset/table and targets that field directly.
5. **Multiple warnings:** three missing parameters expand into three source links; selecting one targets its source.
6. **Duplicate entry:** with `mat0.3a` and `mat0.3a(1)` already present, a new `mat0.3a` becomes `mat0.3a(2)` and creates one auto-rename warning.
7. **Reset after mock:** mock load and subsequent edits are ordinary Working changes; Reset restores the existing Last Saved snapshot.

## Implementation Checklist

### Toolbar
- [ ] Desktop primary toolbar is one row where width permits.
- [x] Reference / Current / Custom are on toolbar level.
- [x] Saved uses a green dot.
- [x] Unsaved uses a gray dot.
- [x] Not saved yet uses a gray dot when this state exists.
- [x] Active-tab styling is distinct from save state.
- [x] Save priority reflects unsaved state.
- [x] Clone label is `Clone`.
- [x] Table selector order is BOM / Work Centers / Routing / All.
- [x] Table selector buttons use equal fixed sizing.
- [x] Prepare Dataset remains far right.

### Metadata
- [x] Product default is Product.
- [x] UOM default is PC.
- [x] UOM is free input.
- [x] Metadata fields use stable relative widths.

### Prepare Dataset
- [ ] Reference / Current / Custom summaries are horizontal on desktop.
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
- [ ] Warning source navigation works.

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
- [x] No feature/taste-frontend-ui table styling adoption.
- [x] No centered/max-width table layout refinement.
- [x] No detailed table toolbar/selection/bulk-action redesign.
- [x] No global Header redesign or Undo / Redo relocation.
- [x] No broad Footer redesign.
- [x] No CBD redesign.
- [x] No RCA redesign.
- [x] No Simulation redesign.
- [x] No finalized cost formulas changed unintentionally.

### Docs
- [x] MASTER_DATA.md is reconciled with latest decisions.
- [x] CROSS_CUTTING.md is reconciled with Product Mismatch semantics.
- [x] Current authoritative docs contain no contradictory mock/session behavior.
- [x] New UX contract is linked/indexed appropriately if needed.

## Verification Checklist

- [x] Targeted tests pass.
- [x] Relevant regression verifiers pass.
- [x] Typecheck passes if configured.
- [ ] Lint passes if configured.
- [x] Build passes.
- [x] `git diff --check` passes.
- [x] Final diff is manually reviewed against this contract.
- [x] Unrelated changes are absent.
- [x] Branch is committed and pushed without merging.

### Verification Notes

- The desktop one-row toolbar and horizontal desktop summaries remain unchecked pending screenshot review. The isolated in-app browser blocked `localhost` and refused `127.0.0.1`; Chrome DevTools MCP is not configured in this environment.
- Warning source navigation remains unchecked pending a live click-through. Its dataset/table selection, scroll, focus, and highlight wiring passed the source-level UI verifier.
- Lint remains unchecked because `package.json` has no lint script.

## Deferred / Locked for Later

1. Master Data full table visual redesign.
2. Adoption of `feature/taste-frontend-ui` table styling/layout/density concepts.
3. Centered/max-width table layout refinement.
4. Detailed table toolbar, selection, and bulk-action UX review.
5. Global Header Undo / Redo relocation.
6. Cost Breakdown visual review.
7. RCA visual review.
8. Simulation visual review.
9. Detailed Import modal visual redesign beyond preserving current valid behavior.

The next Master Data review area after this branch is the Table. Table business behavior and the current branch's data, lifecycle, and domain logic remain authoritative in that later review.
