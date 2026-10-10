# Master Data Toolbar and Engineering Workspace UX Contract

**Status:** Current user-directed UX contract for branch `CBD-UXUI`, including the latest 2026-10-10 shared-shell refinements and the finalized Master Data Toolbar + Metadata interaction pass. This contract supersedes conflicting earlier presentation decisions. Finalized business behavior remains authoritative unless a decision below explicitly changes the presentation.

## Scope

This contract records the accepted workspace UX direction across the shared Header, Master Data toolbar/search/metadata and warning navigation, Cost Breakdown hierarchy, Candidate/RCA presentation, and Simulation result hierarchy. The latest correction pass also refines Header brand hierarchy, Prepare Dataset sizing/alignment, Footer tooltip behavior, visible numeric precision, and Master Data Toolbar/Metadata interactions.

It does not change finalized calculations, Candidate generation, RCA data semantics, Simulation logic, Master Data lifecycle, or Export's Last Saved source. It allows small table interaction changes required for shared search and warning navigation, without replacing the current table implementation.

## Finalized UX Decisions

- The shared Header is one compact workspace bar with three desktop zones: `COSTBREAKDOWN` and safely resolved Product (Unit) context at the left; centered Master Data / Cost Breakdown / Candidate / Simulation navigation; and Undo, Redo, then the final icon-only Info control for Prepare Dataset at the right. Smaller widths may reflow. Do not show Search, workflow status, a workflow CTA, warning text, or additional navigation in the Header.
- The shared Header's left zone contains only `COSTBREAKDOWN` and safe Product (Unit) context. The brand is visually prominent (about 16px and bold); product context is smaller, lighter, and secondary. Its center contains exactly four page-navigation tabs. Its right utility zone contains Undo, Redo, then Info in that order; it contains no Search.
- Undo and Redo remain visible in the right utility zone and use the existing Master Data history. They are enabled only on Master Data when the corresponding history action exists, disabled elsewhere, and use muted opacity with the normal cursor.
- On desktop, the Master Data toolbar order is Dataset → icon-only Eye/Pencil mode controls → Tools → fixed Search → Table. Keep one compact row where width permits; groups wrap intact at narrower widths. The Master Data toolbar has no Prepare Dataset Info control.
- Dataset and Table selectors remain text controls. View and Edit are two visible 32×32px icon-only buttons (Eye and Pencil) matching toolbar utility dimensions, with accessible pressed state and clear active styling; geometry does not shift. The Reference / Current / Custom save-state dots keep their existing size. Sizing, spreadsheet Import, Clone, Warning highlights, Reset, Clear, Save, and Export are icon-only, neutral, consistently sized actions with tooltips and no vertical separators. Import uses a spreadsheet/file icon; Export uses an upward-from-tray/export icon. Save does not receive a special color treatment. The global Header Info control is the sole Prepare Dataset entry point.
- Dataset selection styling and save-state dots are independent. The only user-facing save states are `Saved` (green) and `Draft` (neutral gray). Draft means Working differs from Last Saved or no Last Saved exists. Save state is derived from snapshots, not a manual flag.
- Save stays visible and is enabled when Working is Draft. Save copies the viewed Working state to that dataset's Last Saved state.
- Product Name and UOM remain blank unless entered; do not synthesize `Product` or `PC` in the UI, Save, or Export. UOM is free text. Selling Price and SG&A keep their existing missing-value semantics; Dataset Remark may be blank. Page metadata is a compact inline label/value strip with no Metadata heading or disabled fields in View mode. Edit mode replaces only values with inputs. Fields have stable relative widths: Product Name wide, UOM narrow, Selling Price medium, SG&A narrow, Remark wide. Selling Price accepts a numeric value only; THB is fixed and supplied by the UI.
- Table-view controls appear in the order BOM / Work Centers / Routing / All, have equal fixed sizing, and remain at toolbar level. Prepare Dataset opens from the global Header Info control only.
- Search is a local Master Data toolbar control using the existing `masterDataSearchQuery` state and filtering behavior. It filters BOM, Work Centers, or Routing for the selected view; `All` applies the same query across all visible tables. Placeholders are `Search BOM...`, `Search Work Centers...`, `Search Routing...`, and `Search all tables...`. Keep a fixed 12rem desktop width and position so placeholder changes do not move adjacent controls or change wrapping. Do not show Search in the global Header or invent search behavior for unrelated pages. Keep existing filtering logic.
- Clone opens a compact source flyout only on click or keyboard activation (Enter/Space), never on hover or focus alone. The flyout excludes the destination. Outside click or Escape dismisses it; Escape restores focus to Clone. Choosing a source clones immediately without a second confirmation.
- Warning highlights use one toolbar `!` toggle, default ON. ON shows an uncrossed `!`; OFF shows the same symbol crossed by a diagonal slash, with the same button dimensions and correct `aria-pressed`/accessible labels. Turning it off hides only non-blocking Generated identity and Auto-renamed duplicate cues. Missing/invalid required values and unavailable Work Center blockers stay visible. Warning data, `aria-invalid`, calculations, Prepare Dataset details, and navigation remain unchanged. Do not add warning icons to rows or cells.
- Prepare Dataset is a compact, Header-owned popover, about 20rem wide, anchored to the global Header Info control. That Info control alone opens and toggles it; there is no toolbar trigger. It has content-driven height while warning categories are collapsed and a viewport-clamped maximum. When needed, the shared Warning/Blocker issue region scrolls within the available panel height; the header and dataset summary remain available above it, and mock controls remain available below it. Outside click and Escape close it; Escape and explicit close return focus to Header Info. Footer warning navigation opens this same panel.
- The top summary reads `Dataset`, a dotted `Ready` / `Incomplete` status, a dotted display-only `Product Match` / `Product Mismatch` status, and Close at the far edge. Ready is blue, Incomplete muted rose/red, Product Match green, and Product Mismatch violet. Product status has no click affordance, chevron, underline, border, or filled semantic background. Product Name/UOM details are available in the Footer tooltip; there is no Product mini-popover. Warning emphasis remains amber/yellow.
- Reference / Current / Custom summaries are whole-row dataset filter toggles with shared fixed columns for dataset, save state, Warning icon/count, and Blocker icon/count, in that order. Clicking a row filters both issue sections to that dataset; clicking the active row again clears the shared filter. Counts are neutral; warning and blocker icons retain their subtle semantic cues. Indent only the child label content by 12–16px; do not shift shared columns. Do not show Prepared / Needs input in these rows or explain that Custom is unused by CBD.
- Ready requires Reference and Current readiness plus no Blockers in Reference or Current. Warning-only identities do not make datasets Incomplete. Custom Blockers do not affect global readiness. Use the same readiness derivation in the Footer and the fixed top summary; do not show readiness on individual dataset rows.
- Status describes context/state; Warning identifies data to review. Product Mismatch is a non-blocking comparison status, excluded from warning categories and counts, and never triggers a CBD confirmation or blocker.
- Prepare Dataset separates two non-blocking Warning categories (Generated identity and Auto-renamed duplicate) from one Blocker category (Missing required value). Invalid values retain local invalid cues; missing/unresolvable required Work Center references are reported under Missing required value. Counts represent affected source items/locations, not categories, and do not double-count the same issue at one location.
- Always show Reference / Current / Custom Warning and Blocker counts. Warning counts precede Blocker counts. Each dataset row applies one shared filter to both sections; either section's `All` control clears that filter and remains a button in both active and All states. Show only non-zero category rows; do not add fake zero-count rows. Indent category labels by 12–16px while keeping count and chevron tracks aligned. Every category row toggles its compact detail list, including categories with one location. Each actual detail item is directly clickable, with no chevron or nested expansion, and shows `<Role> · <Table> · Row <N> · <Field>`. Row number follows current table order for display; navigation uses stable `rowId` and source metadata. Missing required value has a small red `*` after its category label. The issue area scrolls when needed while the header, dataset rows, and mock controls remain fixed and visible. Navigation activates the dataset/table, switches to Edit, selects and scrolls the row, clears Search if needed, and focuses/highlights the field when practical. Warning presence never blocks normal application use.
- The shared Footer is a compact three-group summary: Reference/Current structure in BOM / WC / RTG order; Reference+Current readiness, display-only Product Match/Mismatch, and clickable `⚠ N`; then full Reference/Current Standard Cost and full Net Gap. Readiness uses blue for Ready and muted rose/red for Incomplete; Product status uses green for Match and violet for Mismatch. The readiness tooltip shows only Reference and Current Blocker counts with CircleX; Custom is omitted, and Ready/Incomplete is not repeated in the tooltip. Both statuses have a dot and semantic text, with an upward tooltip on hover/focus. Product tooltip contains only Reference and Current Product Name (UOM) pairs; neither repeats a title. Hover opens after 275ms and keyboard focus opens immediately. Tooltips use content-sized width, viewport max-width, and do not participate in layout. Warning tooltip contains only non-zero Warning category/count rows with no heading or total. `⚠ N` counts Warning items only, including Custom and excluding Blockers/Product Mismatch. Clicking it opens the Header-owned Prepare Dataset panel with all Warning filters visible and no category expanded. Footer cost uses fixed THB and shows the shared trimmed Reference UOM only when both nonblank UOM values match after case normalization; otherwise its unit is `Unit`. The unit label is normal-weight, muted, and has no pipe, border, or focus treatment. When inline it sits about 20–24px after Net Gap; below 360px it wraps to a right-aligned line to keep the summary within the viewport.
- Non-edit numeric values across the application display at most two decimal places and omit unnecessary trailing zeros. Display rounding never changes stored/raw inputs or calculation precision. Non-finite values display as unavailable rather than as zero.
- Blank BOM, Work Center, and Routing identities have usable effective identities `Material N`, `Work Center N`, and `Process N`. `N` is the ordinal among currently blank/generated identities in that table, not the physical row number. Generated identities may be saved and exported, appear in warnings, and do not block workflow.
- Duplicate effective identities are auto-renamed to the next available deterministic suffix, such as `mat0.3a`, `mat0.3a(1)`, `mat0.3a(2)`. Apply the rule to direct entry, paste, bulk edits, and other applicable input paths. Report each correction as a warning without a modal. Existing imported/legacy ambiguous data must not cause the comparison engine to guess a match.
- Missing required values make only affected and dependent results Unavailable and appear in the Blockers section. Invalid numeric values and newly entered unresolved nonblank Routing Work Center references are rejected at edit/import ingress. Existing persisted invalid numeric values remain Unavailable with local invalid-cell cues but are not categorized as Warning or Blocker; existing unresolved required Work Center references remain Unavailable and appear under Missing required value Blockers. Never replace missing values with zero. A valid zero remains valid where formulas permit it.
- Development exposes two direct actions, `Complete Mock` and `Incomplete Mock`, in equal centered 50/50 columns on one fixed compact row below Warnings and Blockers. Both load immediately into ordinary Working/history state with no dropdown or confirmation. Loading replaces Reference and Current Working data, clears stale Custom Working rows/sizing that would inflate fixture issue totals, and preserves every Last Saved dataset. The load is one ordinary undoable history action, including the previous Custom Working state. Complete Mock has matching Product Name/UOM, calculable Reference and Current costs, and zero Warnings/Blockers. Incomplete Mock has 3 Generated identity + 3 Auto-renamed duplicate = 6 Warnings and 9 Missing required value Blockers, 15 affected locations total; Product Mismatch is a separate status. It does not introduce invalid-number or unresolved nonblank Work Center cases. There is no separate mock session/mode or return action. Reset continues to restore Last Saved.
- Clone is labeled `Clone`; it selects a source and copies that source's Working data into the viewed destination's Working data. The destination Last Saved is unchanged. Source selection performs the copy without a second replacement confirmation.
- Reset immediately restores Working from Last Saved as one Undo/Redo action; it is disabled without Last Saved. Clear immediately clears only Working, preserves Last Saved, and is one Undo/Redo action. Neither uses a confirmation. Sizing remains a compact centered dialog with aligned metadata and row-count controls; draft values stay local until Apply, Download Template uses that draft, and only populated-data truncation confirms.
- Import remains staged: selection validates without mutation; only the explicit Import button replaces viewed Working and initializes sizing from imported row counts. The compact dropzone and valid/invalid summaries keep the target and row counts easy to scan without exposing parser/debug text. Cancel, Escape, outside click, and X close without importing. Invalid numeric values and unavailable Routing Work Center references reject Import. Export remains enabled whenever the active dataset has Last Saved, independent of Working Draft state, and exports only that snapshot. Native Save As is invoked directly from the click before asynchronous workbook generation when supported; browser-download fallback remains available. Neither shows warning confirmation.
- Cost Breakdown shows Total Gap first, then cause categories, followed by BOM/Processing detail; avoid repeating the same values across Snapshot Comparison and Variance Tree. Selected Comparison remains a compact scope control.
- Candidate / RCA uses a compact decision table with key candidate values visible and changed/process details disclosed on demand. The RCA Case focuses on Candidates, Root Cause / Why?, and Action; Simulation is optional. RCA save state uses Saved / Draft.
- Simulation leads with Reference → Current → Simulated, cost story, and available result/decision metrics, followed by economic assumptions, Factors to Simulate, and parameter details. Preserve the current graph and formulas; economic evaluation remains advisory.
- The shared Footer wraps its three logical groups on narrow screens and remains one row on normal desktop widths. Its warning indicator always shows `⚠ N`, including zero, and opens Prepare Dataset with all warning roles visible. Product Match/Mismatch remains display-only and opens no panel. Full Reference/Current costs and Net Gap do not follow Selected Comparison scope.
- Header, Main, and Footer content share the centered `max-w-[1440px]` frame with `px-3 sm:px-4 lg:px-6`; Header/Footer backgrounds span the viewport. The app shell is `h-dvh min-h-0 flex flex-col overflow-hidden`; full-viewport-width Main owns the only page-level vertical scrolling, with the centered frame inside Main, and Footer stays at the viewport bottom without overlaying content.
- Prepare Dataset and footer warning navigation do not add a global blocker or a CBD confirmation. No global page redesign beyond the Header workspace utilities is included.

## Status Model

| Dimension | Values | Meaning |
|---|---|---|
| Dataset save state | Saved / Draft | Saved means Working matches Last Saved. Draft means it differs or has never been saved. |
| Preparation | Prepared / Needs input | Existing readiness semantics are preserved, but these labels are not shown in the Prepare Dataset dataset rows. |
| Comparison | Product Match / Product Mismatch | Match requires normalized Reference and Current Product Name and UOM to agree; otherwise Mismatch. Informational and non-blocking. |
| Data quality | Warning / Blocker | Warnings are generated/renamed identities; Blockers are missing required values. They have separate counts, cues, and readiness effects. |

Save-state dots are separate from selected-dataset styling. Preparation status and warning count are also separate concepts.

## Warning Model

Each Warning and Blocker item identifies a source dataset, table, record, field when available, category, and a human-readable label. Counts represent distinct affected source locations. The footer Warning total excludes Blockers and Product Mismatch. Deduplicate repeated descriptions of the same condition at the same location.

Show `Warnings N` and `Blockers N` in separate sections. Dataset summary rows toggle one shared dataset filter for both sections, and either section's `All` button clears it. Only categories with affected items are shown. Category rows use a fixed label / neutral count / chevron grid; every category row toggles its detail list, even when it contains one location. Actual items navigate directly and show no chevron or other navigation indicator. Keep the popover height bounded; the issue region scrolls when needed while the header, dataset summary, and mock controls remain available.

## Generated and Default Identity Behavior

Product Name and UOM remain blank until supplied. Blank table identities use their generated effective names. Generated numbering counts blank/generated identity entries in table order, independently for BOM, Work Centers, and Routing. Example: `Steel`, blank, `Plastic`, blank becomes `Steel`, `Material 1`, `Plastic`, `Material 2`.

Generated values must be consistent in display, ordinary dataset use, Save, and Last Saved export. A generated-name warning remains visible to make the implicit identity reviewable. Identity generation must not silently write a physical row number as the business identity.

## Duplicate Identity Behavior

Uniqueness applies per identity domain and includes effective generated identities. Normalize a newly entered duplicate to the next free suffix deterministically. For example, if `mat0.3a` and `mat0.3a(1)` exist, another entry of `mat0.3a` becomes `mat0.3a(2)`. The application records the auto-rename as a warning and continues without confirmation.

## Missing and Invalid Values

Missing required numeric inputs produce Unavailable affected results and Missing required value Blocker items with a source location. Missing/unavailable required Routing Work Center references use the same Blocker category. Invalid numbers, non-positive Capacity, Yield outside its existing valid range, and unavailable nonblank Routing Work Center references retain their finalized local validation/result behavior; dependent results for legacy invalid values remain Unavailable. Do not fabricate values or convert missing/invalid data to zero. Blank Product Name, UOM, Dataset Remark, and valid zeroes allowed by finalized formulas retain their existing metadata/formula semantics.

## Mock Behavior

`Complete Mock` and `Incomplete Mock` load deterministic Reference/Current sample pairs into the active product's ordinary Working snapshots and select Current for review. They clear stale Custom Working rows/sizing that would inflate the fixture totals while preserving all Last Saved snapshots. Complete Mock is Ready/Match with zero Warnings and Blockers; Incomplete Mock is Incomplete/Mismatch with 3 Generated identity + 3 Auto-renamed duplicate = 6 Warnings and 9 Missing required value Blockers, 15 affected locations total. The pair load is one undoable history action, including the previous Custom Working state, and later edits use the same Undo / Redo history. There is no mock-only session, mode, preserved real session, return-to-session action, or mock-specific reset behavior. Reset returns the viewed dataset's Working state to that dataset's Last Saved snapshot.

## Action and Dialog Behavior

| Action | Behavior |
|---|---|
| Save | Save Working to Last Saved without a warning confirmation. |
| Clone | Choose source; immediately copy source Working to viewed destination Working; preserve destination Last Saved. |
| Reset | Immediately restore Last Saved as one Undo/Redo action. Disabled if no Last Saved exists. |
| Clear | Immediately clear selected Working as one Undo/Redo action; preserve Last Saved. |
| Sizing | Keep Dataset metadata and Rows in one compact centered dialog. Use effective row counts, directly editable native number inputs, and current dialog values for Download Template. Confirm only populated-data truncation at Apply. |
| Import | Use a compact dropzone and concise valid/invalid summary. Parse and validate on file selection without mutation; apply only on the explicit Import button. Cancel, Escape, outside click, and X leave Working unchanged. |
| Export | Export the active dataset's Last Saved snapshot whenever it exists, including while Working is Draft. Open native Save As before asynchronous workbook generation when supported; preserve the browser-download fallback. No warning confirmation. |
| Complete Mock / Incomplete Mock | Load the selected fixture immediately; no dropdown or confirmation. |
| CBD entry/navigation | Never blocked or confirmed by warnings or Product Mismatch. |

## Examples

1. **Save state:** a selected Current tab can be visually active while its gray dot and accessible title say `Draft`.
2. **Generated numbering:** `Steel`, blank, `Plastic`, blank gives effective BOM names `Steel`, `Material 1`, `Plastic`, `Material 2`.
3. **Warning and Blocker totals:** 2 generated identities + 3 auto-renamed duplicates produce footer `⚠ 5`; 3 missing parameter locations are shown separately as `Blockers 3`. Product Mismatch contributes to neither count.
4. **Single issue:** one affected Missing required value category still expands; the revealed location navigates directly to its source field.
5. **Multiple issues:** three missing parameters expand into three Blocker locations; selecting one targets its source.
6. **Duplicate entry:** with `mat0.3a` and `mat0.3a(1)` already present, a new `mat0.3a` becomes `mat0.3a(2)` and creates one auto-rename warning.
7. **Reset after mock:** mock load and subsequent edits are ordinary Working changes; Reset restores the existing Last Saved snapshot.
8. **Mock fixture totals:** Complete Mock has zero Warnings and Blockers. Incomplete Mock has 3 Generated identity + 3 Auto-renamed duplicate = 6 Warnings and 9 Missing required value Blockers, 15 affected locations total. Its Product Mismatch is a separate status.

## Implementation Checklist

### Toolbar
- [x] Desktop primary toolbar is one logical row where width permits, with controls grouped so wrap points do not split tool groups.
- [x] Reference / Current / Custom are on toolbar level.
- [x] Saved uses a green dot.
- [x] Draft uses a neutral gray dot, including when no Last Saved snapshot exists.
- [x] Active-tab styling is distinct from save state.
- [x] Save stays neutral and is enabled for Draft state.
- [x] Toolbar order is Dataset → icon-only Eye/Pencil → Tools → fixed Search → Table at the far right.
- [x] All toolbar actions use neutral icon-only controls with tooltips; Import uses FileSpreadsheet and Export uses an upward-from-tray icon.
- [x] View and Edit are always-visible icon-only Eye/Pencil buttons with 32×32px targets, distinct active styling, correct title/aria-label/aria-pressed, and stable geometry; dataset save-state dots keep their existing size.
- [x] Clone label is `Clone`.
- [x] Table selector order is BOM / Work Centers / Routing / All.
- [x] Table selector buttons use equal fixed sizing.
- [x] Master Data toolbar has no Prepare Dataset Info trigger; the sole Info entry point is in the global Header.
- [x] Header has brand/product context at left, exactly four centered navigation tabs, and right Undo / Redo / Info utilities in that order.
- [x] Global Header has no Search; disabled Undo/Redo use muted opacity without `cursor-not-allowed`.
- [x] Header Product context shows Name (UOM) only when normalized Name and UOM match; otherwise it stays neutral as `Product (Unit)`.
- [x] Undo / Redo stay visible in the right Header utility group and are enabled only for available Master Data history.
- [x] Search is local to Master Data and keeps the existing selected-table / All filtering behavior.
- [x] Search placeholders follow BOM / Work Centers / Routing / All and share a fixed 12rem desktop width and stable toolbar position.
- [x] Per-table Search controls are removed.
- [x] Clone source flyout opens only by click or Enter/Space activation, not hover/focus alone; it excludes the destination, closes outside/on Escape, restores focus on Escape, and clones immediately.
- [x] Warning toggle uses an uncrossed/crossed `!` state, hides only non-blocking identity warnings, and leaves missing/invalid blocker cues visible.
- [x] Toolbar actions contain no vertical separators.
- [x] Search remains 192px and in the same position for BOM / Work Centers / Routing / All.
- [x] View and Edit have accessible labels/titles and correct pressed states with no visible text labels.
- [x] Clone is click/Enter/Space only; hover and focus alone do not open it.
- [x] Clone Escape closes the menu and restores focus to the trigger.

### Metadata
- [x] Product Name remains blank until entered.
- [x] UOM remains blank until entered.
- [x] UOM is free input.
- [x] Metadata fields use stable relative widths.
- [x] Metadata uses compact inline label/value pairs without a heading or disabled View inputs.
- [x] Selling Price accepts a numeric input; the UI supplies the fixed THB unit.

### Prepare Dataset
- [x] Reference / Current / Custom each occupy a row at all widths, with aligned save, Warning, and Blocker columns.
- [x] Save states are shown for all datasets.
- [x] Dataset rows do not show Prepared / Needs input readiness.
- [x] Per-dataset Warning and Blocker counts are shown independently of save state.
- [x] Clicking a whole dataset summary row filters both Warnings and Blockers; clicking that same active row clears the shared filter.
- [x] Either section's `All` button clears the shared dataset filter and remains a usable button in both states.
- [x] Popover is about 20–21rem wide, content-driven when collapsed, and clamps to the available viewport height.
- [x] Top row reads Dataset, readiness, Product status, and Close in one compact line.
- [x] Ready uses blue; Incomplete uses muted rose/red and remains a status, not a warning.
- [x] Product Match / Mismatch is display-only, with no chevron, underline, border, or filled status background; it remains outside the warning count.
- [x] Product Name/UOM details are available through the Footer tooltip; no Product mini-popover remains.
- [x] Reference / Current / Custom summaries use aligned Dataset / Save / Warning icon+count / Blocker icon+count columns, in that order.
- [x] Warning and Blocker category counts are neutral; semantic emphasis stays on section titles and icons/cues.
- [x] Warnings and Blockers are distinct sections, each with its own `All` control; only categories with affected items are shown.
- [x] Dataset and category child labels alone are indented 12–16px without shifting shared icon/count/chevron columns.
- [x] Warning item labels show current role/table/row number/field only; navigation continues to use stable rowId/source metadata.
- [x] Warning and Blocker category count and chevron columns stay aligned.
- [x] Every category row expands/collapses its details consistently, including a single affected location; each detail navigates directly.
- [x] The issue region scrolls as needed while the panel header, dataset summary, and mock controls remain fixed and visible.
- [x] Complete Mock / Incomplete Mock action row stays fixed below warning details with equal centered 50/50 buttons.
- [x] Panel stays compact without unused collapsed space; its fixed regions and mock row remain visible in visual cases A–N.
- [x] Narrow viewport panel fit is verified at 375px and 320px using a real CSS viewport override.
- [ ] At 320×667, the panel keeps both mock actions visible and confines overflow scrolling to the issue region.
- [x] Ready / Incomplete and Product Match/Mismatch use the shared handoff state and Product Name/UOM comparison.
- [x] Product Match / Mismatch is display-only on the Dataset top row.
- [x] Product Match / Mismatch uses normalized Product Name and UOM comparison and the finalized green/violet mapping.
- [x] Product Match / Mismatch stays informational when the panel opens.
- [x] Prepare Dataset and Footer use the same readiness derivation; Custom does not affect readiness.
- [x] Footer Product tooltip presents Reference / Current Product Name and UOM without a separate comparison popover.
- [x] Unnecessary Custom/CBD explanation is removed.
- [x] Product Mismatch is Status.
- [x] Product Mismatch is excluded from Warning count.
- [x] Product Mismatch does not block/confirm CBD.
- [x] Warnings section exists.
- [x] Warnings and Blockers are separate; Warning categories are Generated identity and Auto-renamed duplicate, and Blockers contain Missing required value.
- [x] Missing required value has a red `*` after the category text.
- [x] Category rows align label, fixed count column, and fixed right-side chevron; actual issue rows have no chevron.
- [x] Actual Warning and Blocker items navigate directly without a nested expansion.
- [x] Blank or unresolved required Routing Work Center is counted under Missing required value Blockers.
- [x] Expanded Warning/Blocker details scroll only inside their bounded list without growing the outer panel.
- [x] Invalid numeric values retain local invalid cues and do not create an extra Warning category.
- [x] Invalid numeric values and unavailable nonblank Routing Work Centers are rejected at normal edit/import ingress.
- [x] Every Warning or Blocker category row toggles its compact detail list, regardless of count; a revealed location navigates directly.
- [x] Detail entries navigate to source.
- [x] Outside click closes popover.
- [x] Escape closes popover.
- [x] Header Info toggles the Header-owned popover; outside click closes it, and Escape/explicit close return focus to Header Info.
- [x] Prepare Dataset Warning/Blocker detail navigation switches dataset and table, enters Edit, selects and focuses/highlights its source row/field.
- [x] A table-local Blocker navigator in All view stays in All while navigating within its own table.

### Footer
- [x] Reference and Current structure counts use BOM / WC / RTG order; Custom is omitted.
- [x] Readiness is limited to Reference and Current and uses `Datasets Ready` / `Datasets Incomplete` with blue / muted rose-red dot and text.
- [x] Product Match/Mismatch compares normalized Product Name and UOM, and uses the same handoff status in Footer and Prepare Dataset.
- [x] Dataset status tooltip lists Reference and Current only; it does not change footer layout.
- [x] Product tooltip lists Reference and Current Product Name/UOM only; Product status is not clickable.
- [x] Warning tooltip appears above the Footer, shows only non-zero Warning categories, and does not change layout.
- [x] `⚠ 0` remains visible; `⚠ N` counts Warning items only and excludes Blockers, Product Mismatch, and readiness.
- [x] Footer readiness tooltip shows only Reference and Current Blocker icon/count rows; Ready/Incomplete is not repeated and Custom is omitted.
- [x] Clicking `⚠ N` opens Prepare Dataset with all roles visible and no category expanded.
- [x] Full Reference/Current Standard Cost and Net Gap remain independent from Selected Comparison.
- [x] Unavailable Standard Cost/Net Gap displays `—`; no zero is fabricated.
- [x] Net Gap is Current minus Reference; only the number uses positive/negative semantic color.
- [x] Header, Main, and Footer align to the same centered `max-w-[1440px]` frame.
- [x] Main is full viewport width with the centered frame inside it; Footer remains a shrink-0 shell sibling and the full-width Main owns scrolling.
- [x] Footer groups fit one row at the inspected desktop width.
- [x] Long-page Main scrolling and narrow-screen Footer wrapping were visually checked with browser viewport emulation.
- [x] Product Match/Mismatch consistently compares normalized Product Name and UOM in the handoff, shared utility, Header context, Footer, and Prepare Dataset.

### Latest Header / Prepare Dataset / Footer / Number Display Correction
- [x] Header brand is visibly larger/bolder than the smaller, lighter Product context.
- [x] Prepare Dataset is about 20rem wide and content-driven while warning categories are collapsed.
- [x] The issue region scrolls within the bounded panel while the panel header, dataset summary, and mock actions remain visible.
- [x] Ready is blue; Incomplete is muted rose/red; Product Match is green; Product Mismatch is violet; Warning remains amber/yellow.
- [x] Dataset Warning and Blocker counts are neutral, aligned, and retain semantic icon cues.
- [x] Dataset rows apply a shared filter to both issue sections, with same-row toggle back to All and a working `All` reset in each section.
- [x] Footer Dataset tooltip has no repeated heading and shows only Reference / Current Blocker icon/count rows.
- [x] Footer Product tooltip has no heading, shows Name (UOM), wraps long names, and never clips with ellipsis.
- [x] Footer warning tooltip has no heading/total and shows only non-zero category/count rows.
- [x] Footer tooltip hover delay is 250–300ms, keyboard focus opens immediately, and Escape hides it.
- [x] Footer tooltips are fixed overlays that cause no page scrollbar or layout shift.
- [x] Footer status text is not selectable and uses the default cursor; warning action uses a pointer cursor.
- [x] Non-edit numbers across Master Data, Footer, Cost Breakdown, Candidate, and Simulation display at most two decimals.
- [x] Trailing zeroes are omitted; rounding applies only to display and does not change inputs or calculations.
- [x] Non-finite values render as unavailable, never as a fabricated zero.

### Latest Header Ownership / Warning Hierarchy / Row Location Correction
- [x] Header Info is the only Prepare Dataset entry point and owns the panel anchor; Master Data toolbar has no duplicate or hidden trigger.
- [x] Header Info toggles the panel; Footer warning action opens the same panel in All mode; outside click and Escape close it.
- [x] Escape and explicit close return focus to Header Info; outside click does not steal focus.
- [x] Dataset and warning-category labels alone are indented 12–16px while icon/count/chevron tracks stay fixed.
- [x] `All` remains visible in both All and filtered modes at the shared count column; the chevron column stays empty.
- [x] Visible warning items use `<Role> · <Table> · Row <N> · <Field>` and omit business identity/category text.
- [x] Row number reflects current table order, is display-only, and navigation continues using stable source metadata.
- [x] Ready is blue; Incomplete is muted rose/red; Product Match is green; Product Mismatch is violet in Prepare Dataset and Footer; Warning remains amber/yellow.
- [x] Desktop correction cases A–Q were checked at 1280px; warning navigation and focus were checked in the running app.
- [x] Narrow viewport case R was visually checked at 375px and 320px widths.

### Latest Footer Unit and Compactness Correction
- [x] Prepare Dataset is 20rem wide on desktop and content-driven when collapsed.
- [x] Its viewport width clamp and status-row fit were verified at 375px and 320px.
- [x] Dataset summary rows toggle the shared Warning/Blocker filter; either section's `All` button returns to All and remains usable in both states.
- [x] Warning icon uses a centered fixed cell aligned with the shared count axis; warning colors remain amber/yellow.
- [x] Dataset selector and Prepare Dataset use the same small, more clearly outlined Saved/Draft dot style without adding selector text.
- [x] Footer cost unit uses trimmed Reference UOM only when both Reference and Current UOM are nonblank and match after case normalization; otherwise it shows `Unit`.
- [x] Footer cost unit stays THB, appears in parentheses, uses 20–24px separation after Net Gap while inline, and has no pipe separator; under 360px it moves to a right-aligned line.
- [x] Product Mismatch is violet in Prepare Dataset and Footer; Product Match is green, Ready blue, Incomplete rose/red, and warning emphasis amber/yellow.
- [x] Footer informational content uses the default cursor; only the clickable `⚠ N` indicator uses pointer.
- [x] At 1280px, 1024px, 375px, and 320px, the long Master Data view has Main as its only page-level vertical scroller at the viewport's right edge.
- [x] Master Data table wrappers do not add nested vertical scrollbars; the bounded Prepare Dataset issue region scrolls without displacing mock controls.
- [x] No horizontal page overflow; the responsive table selector keeps all four equal options, including `All`, inside the viewport.
- [x] Prepare Dataset stays inside the viewport with its top statuses and mock row usable at 375px and 320px.
- [x] Footer wraps without overlap, and its status/cost groups remain within the viewport at 375px and 320px.
- [x] Footer shared unit stays dynamic with fixed THB, normal-weight and muted, with 20px inline spacing after Net Gap and a right-aligned second line under 360px.
- [x] Narrow viewport cases were visually inspected through browser viewport emulation.

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
- [x] Incomplete Mock has 6 Warnings and 9 Blockers, 15 affected locations total; Product Mismatch is outside both counts.
- [x] Post-load Complete Mock remains zero-warning with calculable Reference and Current costs after loading over stale Custom Working data.
- [x] Post-load Incomplete Mock is 6 Warnings + 9 Blockers = 15 affected locations after loading over stale Custom sizing/placeholders.
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
- [x] Export is enabled for Reference/Current when their Last Saved exists even if Working is Draft, and disabled for Custom with no Last Saved.
- [ ] Native Save As opens directly from the Export user action before asynchronous workbook generation; browser fallback remains available.
- [x] Reset is immediate, restores Last Saved, and remains one Undo/Redo action.
- [x] Clear is immediate, preserves Last Saved, and remains one Undo/Redo action.
- [x] Sizing confirms only destructive populated truncation.
- [x] Sizing defaults unset counts from existing rows and downloads a blank template from current dialog values.
- [x] Sizing dialog presents aligned metadata and row-count controls in a compact centered layout; draft values remain local until Apply.
- [x] Import does not mutate until the explicit Import action; cancel paths leave Working unchanged.
- [x] Import dialog provides a compact dropzone and concise valid/invalid summary while preserving staged validation.
- [x] Export uses Last Saved and attempts native Save As with a browser-download fallback.
- [x] Save has no warning confirmation.
- [x] Export has no warning confirmation.
- [x] CBD entry has no warning confirmation.

### Scope
- [x] Master Data tables retain their existing implementation without a wholesale table rewrite.
- [x] Targeted table presentation/interactions for selection, blockers, row actions, and counts are implemented while preserving existing spreadsheet behavior.
- [x] Shared Header follows the latest order and label contract without adding workflow status, CTA, warning text, or navigation items.
- [x] No broad Footer redesign.
- [x] Cost Breakdown, Candidate/RCA, and Simulation receive presentation-only refinements.
- [x] No finalized cost formulas changed unintentionally.
- [ ] The latest Warning/Blocker split, table footers, and Header-to-toolbar spacing have been visually accepted in a browser.
- [x] Prepare Dataset fit and Footer tooltip bounds from the prior visual pass were checked at 320, 375, 1024, 1280, and 1920px; latest table/spacing changes still need current visual acceptance.

### Docs
- [x] MASTER_DATA.md is reconciled with latest decisions.
- [x] CROSS_CUTTING.md is reconciled with Warning/Blocker and Product Mismatch semantics.
- [x] Current authoritative docs contain no contradictory mock/session behavior.
- [x] New UX contract is linked/indexed appropriately if needed.

## Verification Checklist

- [x] Targeted verifiers pass (`verify_master_data_ui_state.mjs`, `verify_master_data_mock_load.mjs`).
- [x] Relevant regression verifiers pass.
- [x] TypeScript typecheck passes as part of `npm run build`.
- [x] Lint availability checked; no lint script is configured.
- [x] Production build passes.
- [x] `git diff --check` passes.
- [x] Final diff is manually reviewed against this contract.
- [x] Unrelated changes are absent.
- [x] Current correction pass remains uncommitted and unpushed as requested; branch is not merged.

### Verification Notes

#### Prior Prepare Dataset / Footer visual acceptance

- [x] A — Complete Mock shows Match/Ready and no warning categories are expanded.
- [x] B — Incomplete Mock shows Mismatch/Incomplete and the expected non-zero warning groups.
- [x] C — Collapsed warning categories show no empty scroll viewport.
- [x] D — Generated identity expansion keeps its category row visible.
- [x] E — Missing required value details remain within the shared bounded issue region, which scrolls when needed.
- [x] F — Switching expanded categories keeps only the selected category open.
- [x] G — One- and two-digit dataset counts align in the same fixed columns.
- [x] H — Custom zero count has a gray warning icon and right-aligned gray `0`.
- [x] I — Footer Dataset status tooltip opens upward and lists Reference / Current only.
- [x] J — Footer Product tooltip opens upward and shows each Product Name/UOM without fake defaults.
- [x] K — Footer Warnings tooltip opens upward and lists non-zero categories only.
- [x] L — Clicking footer `⚠ N` opens Prepare Dataset in All warnings mode with no category open.
- [x] M — Filtered `Warnings · Current N` with `All` stays quiet and functional.
- [x] N — Complete Mock / Incomplete Mock buttons have equal centered 50/50 widths.
- [x] Footer Dataset, Product, and Warning tooltips stay within the viewport at 320, 375, 1024, 1280, and 1920px; opening them does not change document width or scroll ownership.
- [x] Footer Dataset and Product indicators remain informational and do not navigate on click.
- [x] Escape hides a focused Footer tooltip and still closes the Prepare Dataset popover.

#### Prior shell and Prepare Dataset visual refinement
- [x] 1 — Complete Mock shows the compact collapsed Prepare Dataset panel.
- [x] 2 — Incomplete Mock shows the compact collapsed Prepare Dataset panel.
- [x] 3 — Clicking the Reference summary filters warnings to Reference.
- [x] 4 — Clicking the Current summary filters warnings to Current.
- [x] 5 — Clicking the same active dataset summary row clears the shared Warning/Blocker filter and expanded category.
- [x] 6 — Each warning category expands in place and only one stays open.
- [x] 7 — Long issue content scrolls inside the bounded issue region while fixed header, dataset summary, and mock controls remain visible.
- [x] 8 — Custom with zero warnings displays gray warning icon and gray `0`.
- [x] 9 — Dataset and warning-category counts share the same right-aligned column.
- [x] 10 — Complete Mock and Incomplete Mock actions occupy equal 50/50 widths.
- [x] 11 — Footer Dataset tooltip shows only Reference / Current blocker icon/count rows without repeating readiness.
- [x] 12 — Footer Product tooltip shows and wraps long Name (UOM) values without ellipsis.
- [x] 13 — Footer Warning tooltip shows only non-zero categories and counts without a heading or total.
- [x] 14 — Hovering a Footer status does not create a page scrollbar.
- [x] 15 — Showing a Footer tooltip does not shift page width or content.
- [x] 16 — Prepare Dataset and Footer tooltips remain within a 320px viewport without horizontal overflow or a new scrollbar.
- [x] 17 — Header brand is clearly stronger than the secondary Product context.
- [x] 18 — Visible numeric values across all major pages show no more than two decimals.

- `package.json` currently has no lint or test script. The repository's standalone targeted verifiers are run directly; exact commands are listed in the final work report.

### Final Addendum — Table, Prepare Dataset, Footer, and Header Spacing

#### Warning and Blocker model
- [x] Generated identity and Auto-renamed duplicate are the only Warning categories.
- [x] Missing required value is a separate Blocker category; the same source condition is not double-counted.
- [x] Warnings do not make Reference/Current Incomplete; their highlights follow the Warning toggle.
- [x] Reference/Current Blockers make readiness Incomplete; Custom Blockers do not affect global readiness.
- [x] Blocker cell highlight and red `*` stay visible when Warning highlights are hidden.
- [x] Prepare Dataset shows Warning counts before Blocker counts on each dataset row.
- [x] Warnings precede Blockers; dataset rows apply one shared filter, and either section's `All` button resets it.
- [x] `Missing required value *` places the red star after the category label.
- [x] Every category row expands/collapses details regardless of count; actual item rows have no chevron and navigate directly.
- [x] Complete Mock and Incomplete Mock remain equal-width controls below both issue sections.

#### Footer
- [x] Footer `⚠ 0` stays visible; `⚠ N` counts only Warning items.
- [x] Warning tooltip excludes Blockers and contains only non-zero Warning categories.
- [x] Footer readiness tooltip shows only Reference and Current Blocker icon/count rows; Ready/Incomplete is not repeated and Custom is omitted.
- [x] Warning click still opens Prepare Dataset.
- [x] Product Match is green; Product Mismatch is violet; Warning emphasis remains amber/yellow.

#### Master Data tables
- [x] Visible column labels use Material, Work Center, Labor Rate, Burden Rate, Capacity, Yield, Note, and Actions.
- [ ] View/Edit keeps table, columns, row heights, Actions, footer, and Add Row geometry stable.
- [x] Row selection works in View and persists into Edit while the dataset scope stays the same.
- [x] `#` header toggles only visible/filtered rows and preserves hidden selected rows.
- [x] `#` Select All has a subtle visible pressed state with the same geometry in both states.
- [x] Trash on a selected row deletes the selected group in one history action; unselected-row Trash deletes only that row.
- [x] One Actions column contains Trash and GripVertical; selected Grip is stronger, while hover/focus/drag retain clear states.
- [x] Each table has its own cyclic Blocker navigator; zero uses muted disabled styling without moving controls.
- [x] Each table is a distinct bordered card in All view, with a compact gap and shared width.
- [x] A table-local Blocker navigator in All stays in All while moving to a source in that table.
- [x] Blocker navigation clears Search when needed, then selects, scrolls, and focuses the source.
- [x] Add Row remains visible and disabled in View; empty Edit body adds the first row and remains compact.
- [x] Table footer always shows row/selection, Warning, and Blocker counts with neutral numbers and only a semantic Blocker icon.
- [x] Tables use the page-level vertical scroll; table wrappers scroll horizontally only.
- [x] Spreadsheet keyboard, TSV paste, Undo/Redo, multi-row edit, and reorder behavior remain intact.

#### Header spacing and verification
- [x] Master Data toolbar touches the shared Header with no added top gap; other pages keep their spacing.
- [x] The `#` header, row selection, Trash grouping, and blocker navigation are covered by targeted verifier checks.
- [x] Relevant verifier scripts pass.
- [x] `npm run build` passes.
- [x] `git diff --check` passes.
- [ ] Current Warning/Blocker popover, table geometry, and Header-to-toolbar spacing receive human visual acceptance in a browser.

Visual verification performed at the available desktop viewport with a clean dataset. The collapsed Prepare Dataset panel, toolbar/Header spacing, zero-count footer, and page-level table scroll were visible. Expanded Incomplete Mock details and a side-by-side View/Edit geometry comparison still need visual acceptance.

## Deferred / Locked for Later

1. A broader Master Data table visual redesign beyond the compact title/header, Actions column, count footer, and navigation refinements in the latest addendum.
2. Any table-library migration such as MUI X Data Grid.
3. Detailed Import modal visual redesign beyond preserving current valid behavior.

The latest bounded table interaction refinements are in scope and documented below. A broader table visual pass remains later work; current data, lifecycle, and domain logic remain authoritative.
