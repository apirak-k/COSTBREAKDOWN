# Master Data Toolbar and Engineering Workspace UX Contract

**Status:** Current shared UX decisions are recorded below; Master Data Selected Value Round 2 is CLOSED after final UX polish, applied after the previous correction had already passed acceptance. Final acceptance includes 350ms Hover Preview dwell, stable Header numeric / `%` / spinner regions, calm editable idle appearance, direct Header affordance, and the regression gates recorded below. The Round 2 addendum supersedes conflicting earlier numeric alignment, metadata-proportion, and spinner statements; older receipts remain as chronology.

**Current acceptance note (2026-10-20):** The user visually accepted the final UI mini-round at baseline `07a2c86a15d8716beacc20e9761a8073feadf914`. Older pending-acceptance statements below describe their original checkpoints and do not represent open current UI decisions; Phase 5 regression and browser-verification status is recorded in [`HANDOFF.md`](../../HANDOFF.md).

**Selected Value / Decimal UX status update (2026-10-22):** Round 1 — Shared Foundation, Round 2 — Master Data, and Round 3 — Cost Breakdown are CLOSED. Round 4 — Simulation is NOT STARTED / NEXT; Round 5 is NOT STARTED. The current shared no-focus visual contract is in [`CROSS_CUTTING.md`](CROSS_CUTTING.md#numeric-display-and-editing), with active Master Data and Cost Breakdown details in their canonical specifications. The dated 2026-10-21 Round 2 notes below retain their original acceptance checkpoint and history.

**Round 2 numeric presentation decision (2026-10-21):** The Selected Value / Decimal UX contract in [`CROSS_CUTTING.md`](CROSS_CUTTING.md#numeric-display-and-editing) supersedes earlier fixed-two-decimal and focused-inline-spinner presentation statements/checklists below. Round 1 provides the shared Header Value/state, adaptive body formatter, focus/preview/pin model, and removal of visible body spinners. The previous Master Data Round 2 correction already passed its acceptance gate; the final polish recorded below then added a 350ms source-hover dwell and stable Header geometry/affordance. Round 2 is now CLOSED after this final gate. At that 2026-10-21 checkpoint, Cost Breakdown Round 3 was NOT STARTED / NEXT and Simulation and final cross-page integrations remained later rounds.

## Scope

This contract records the accepted workspace UX direction across the shared Header, Master Data toolbar/search/metadata and warning navigation, Cost Breakdown hierarchy, legacy Candidate/RCA session compatibility, and Simulation workspace. The latest correction pass also refines shared numeric scroll direction, Master Data Clone/Warning wording and role-menu alignment, Header brand hierarchy, Prepare Dataset sizing/alignment, Footer tooltip behavior, visible numeric precision, and Master Data Toolbar/Metadata interactions.

It does not change finalized calculations, CBD finding semantics, legacy RCA session data, or Simulation logic. The 2026-10-17 Master Data correction finalizes Reset, Export, Clear, Clone, toolbar availability, and vertical paste behavior without changing table calculation or validation rules. The 2026-10-18 Simulation presentation correction removes unavailable-effect explanations while keeping the existing `—` values and calculations.

## Finalized UX Decisions

### Global compact overlay rule

For compact popovers, dropdowns, toolbar menus, selectors, and small button-triggered dialogs across Master Data, Cost Breakdown, Simulation, and shared controls, the width follows the longest real content plus its required icon/check/caret area and normal horizontal padding. Trigger width is not an automatic minimum: an intrinsic overlay may be narrower than its trigger. Keep trigger alignment only for a specific UX/layout reason; remove arbitrary fixed/minimum widths that leave blank space. Center under the trigger, clamp to the viewport, and retain keyboard/focus/dismissal behavior. Real form modals, multi-column dialogs, data tables, and structured panels such as the multi-section Prepare Dataset warning/blocker view retain their layout-required widths.

- The shared Header is one compact workspace bar with three desktop zones: `COSTBREAKDOWN` and truthful Current Product context at the left; centered Master Data / Cost Breakdown / Simulation navigation; and Value, Undo, Redo, then the final icon-only Info control for Prepare Dataset at the right. Candidate findings stay inside Cost Breakdown and do not add a navigation item. It displays the Current Product Name prominently and Current UOM in secondary text regardless of Reference comparison status; blank metadata stays blank or is labeled as not set without inventing values. Product Match/Mismatch status remains in Prepare Dataset and Footer. Smaller widths may reflow or truncate only when space is genuinely constrained. Do not show Search, workflow status, a workflow CTA, warning text, or additional navigation in the Header.
- The shared Header's left zone contains only `COSTBREAKDOWN` and truthful Product context; it never fabricates Product Name or UOM. The brand is visually prominent (about 16px and bold); the `PRODUCT:` prefix and UOM are secondary to the Product Name. Its center contains exactly four page-navigation tabs. Its right utility zone contains Value, Undo, Redo, then Info in that order; it contains no Search.
- Undo and Redo remain visible in the same right utility-zone positions on every main page and route to the active page history: Master Data edits, Cost Breakdown manual Candidate reorders, or Simulation edits. Each control is disabled when that page has no corresponding action and uses muted opacity with the normal cursor.
- On desktop, the Master Data toolbar order is Dataset → icon-only Eye/Pencil segmented mode control → Sizing → Import → Clone → Warning → Save → Reset → Clear → Export → fixed Search → Table. Each selector and tool target is 32px high; keep one compact row where width permits and preserve the order when groups wrap. The Master Data toolbar has no Prepare Dataset Info control, and its actions remain enabled and visually active regardless of dataset state.
- Dataset and Table selectors remain text controls with matching height, border weight, vertical alignment, and selected-state styling. Dataset uses three equal fixed-width segments; Table uses four equal fixed-width controls. Their active dark-slate slabs inset approximately 2px within the selector shell, matching View/Edit. View/Edit is one 64×32px icon-only sliding switch containing Eye and Pencil state indicators. Clicking anywhere in the switch or pressing Enter/Space toggles exactly once; its dynamic tooltip/accessibility label names the next action (`Switch to Edit` / `Switch to View`) and `aria-checked` reports current state. The Reference / Current / Custom save-state dots keep their existing size. Sizing, spreadsheet Import, Clone, Warning highlights, Save, Reset, Clear, and Export are icon-only, neutral actions with tooltips, borderless idle styling, separate 32px hit areas, and no vertical separators. Import uses FileSpreadsheet; Export uses an upward arrow from a tray/box. Save does not receive a special color treatment. Reset/Clear/Save click applies to the viewed dataset, while a delayed hover menu exposes only the matching all-dataset action; keyboard users can reach that action. No Master Data toolbar action is disabled, faded, or given a not-allowed cursor because of dataset state. The global Header Info control is the sole Prepare Dataset entry point.
- Dataset selection styling and save-state dots are independent. The only user-facing save states are `Saved` (green) and `Draft` (neutral gray). Draft means Working differs from Last Saved or no Last Saved exists. Save state is derived from snapshots, not a manual flag.
- Save stays visible and invokable in every state. Save copies the viewed Working state to that dataset's Last Saved state, including when Working is already clean.
- Product Name and UOM remain blank unless entered; do not synthesize `Product` or `PC` in the UI, Save, or Export. UOM is free text. Selling Price and SG&A keep their existing missing-value semantics; Dataset Remark may be blank. Page metadata is one compact horizontal row on desktop, with each `Label : Value` pair inline and no Metadata heading or disabled fields in View mode. Edit mode replaces only values with inputs while preserving the same five outer slots, label positions, and row height. Product Name and Remark are wide; within the UOM / Selling Price / SG&A metadata subgroup, allocate the available width at 20 / 45 / 35 respectively. This ratio does not apply to Product Name, Dataset Remark, or the whole metadata section. Product Name, UOM, and Remark values are left aligned; Selling Price and SG&A values are right aligned. Selling Price accepts a numeric value only; `(THB)` in its label supplies the unit, without a duplicate suffix on the displayed value. SG&A `%` is outside the input shell but remains inside its field group. Narrower screens may wrap field groups while keeping each label and value inline. Sizing uses inline `Label : Input` rows, with full-width Product/Remark fields and three metadata columns; row-count fields retain their separate aligned columns.
- Table-view controls appear in the order BOM / Work Centers / Routing / All, have equal fixed sizing, and remain at toolbar level. Prepare Dataset opens from the global Header Info control only.
- Search is a local Master Data toolbar control using the existing `masterDataSearchQuery` state and filtering behavior. It filters BOM, Work Centers, or Routing for the selected view; `All` applies the same query across all visible tables. Placeholders are `Search BOM`, `Search Work Centers`, `Search Routing`, and `Search all tables`, without ellipses. Keep a fixed 192px desktop width and position so placeholder changes do not move adjacent controls or change wrapping. Do not show Search in the global Header or invent search behavior for unrelated pages. Keep existing filtering logic.
- Clone uses the tooltip and accessible name `Clone from`. It opens by hover after a short delay and by click/keyboard activation. Trigger and dropdown share one hover region; leaving the whole region closes a hover-only menu. Clicking pins it until trigger click, outside click, or Escape. Escape restores focus. Choosing a source clones immediately without a second confirmation. The compact flyout box is centered below the trigger and viewport-clamped, with intrinsic width sized to its longest real role label plus normal padding; it may be narrower than its trigger when the content allows. Role labels are left aligned. It excludes the destination and keeps the existing interactions and clone behavior.
- Warning visibility uses one toolbar `!` toggle, default ON. Its tooltip and accessible label are `Show warnings` / `Hide warnings`. ON shows an uncrossed `!`; OFF shows the same symbol crossed by a diagonal slash, with the same button dimensions and correct `aria-pressed`. Turning it off removes amber field fills from both Warning and Blocker locations. Blocker markers and semantics remain: red `*`, validation, `aria-invalid`, counts, readiness, Prepare Dataset details, and navigation. Do not add warning icons to rows or cells.
- Focused shared numeric editors use ArrowUp, upward mouse-wheel motion, and upward trackpad scrolling to increment by the active digit place; corresponding downward controls decrement by that place. With no active digit, the existing unit-step fallback applies. An unfocused numeric editor does not capture wheel input, so the page or containing scroller scrolls normally. Decimal entry accepts any number of fractional digits representable as a finite value; domain validation, blank/zero rules, bounds, and caret behavior remain in force.
- Prepare Dataset is a compact, shared-shell popover, about 19rem wide, anchored below and centered on the global Header Info control. Hover/focus previews it; click pins it; clicking the trigger again, outside click, Escape, or X closes it. Pointer/focus movement from trigger to panel keeps it open; an unpinned preview closes only after both interaction areas are left. Opening, previewing, closing, and the Footer `⚠ N` action do not navigate away from the current page. Clicking the Footer action toggles this same panel and opens it with the All dataset filter when closed. Every real close resets the shared dataset filter and expanded categories. Keep the panel viewport-clamped. Warning and Blocker headings and category rows stay fixed, and each expanded category has an independent detail scroller with a maximum of three 28px rows: one/two locations keep natural one/two-row height, while longer lists scroll within three rows. Multiple categories may stay expanded. Dataset rows and Mock controls stay outside detail scrollers, with Mock controls structurally fixed below the issue sections. Toolbar popovers center below their trigger and clamp horizontally.
- The top summary reads `Dataset`, a dotted `Ready` / `Incomplete` status, a dotted display-only `Product Match` / `Product Mismatch` / `Product Not Set` status, and Close at the far edge. Ready is blue, Incomplete muted rose/red, Product Match green, Product Mismatch violet, and Product Not Set neutral slate. Product status has no click affordance, chevron, underline, border, or filled semantic background. Product Name/UOM details are available in the Footer tooltip; there is no Product mini-popover. Warning emphasis remains amber/yellow.
- Reference / Current / Custom summaries are whole-row dataset filter toggles with shared fixed columns for dataset, save state, Warning icon/count, and Blocker icon/count, in that order. Clicking a row filters both issue sections to that dataset; clicking the active row again clears the shared filter. Nonzero top-row Warning counts use amber and Blocker counts use rose; zero counts remain neutral. Category counts remain neutral. Indent only the child label content by 12–16px; do not shift shared columns. Do not show Prepared / Needs input in these rows or explain that Custom is unused by CBD.
- Ready requires Reference and Current readiness plus no Blockers in Reference or Current. Warning-only identities do not make datasets Incomplete. Custom Blockers do not affect global readiness. Use the same readiness derivation in the Footer and the fixed top summary; do not show readiness on individual dataset rows.
- Status describes context/state; Warning identifies data to review. Product Mismatch is a non-blocking comparison status, excluded from warning categories and counts, and never triggers a CBD confirmation or blocker.
- Prepare Dataset separates two non-blocking Warning categories (Generated identity and Auto-renamed duplicate) from one Blocker category (Missing required value). Invalid values retain local invalid cues; missing/unresolvable required Work Center references are reported under Missing required value. Counts represent affected source items/locations, not categories, and do not double-count the same issue at one location.
- Always show Reference / Current / Custom Warning and Blocker counts. Warning counts precede Blocker counts. Each dataset row applies one shared filter to both sections; click the active row again to return to All. Both issue headings show the same active dataset (`All`, `Reference`, `Current`, or `Custom`) as plain read-only text, with no button, pill, hover, selected background, or reset behavior. Dataset summary rows remain the only filter controls. Show only non-zero category rows; do not add fake zero-count rows. Indent category labels by 12–16px while keeping count and chevron tracks aligned. Category counts are neutral. Every category row toggles its compact detail list, including categories with one location. Each actual detail item is directly clickable, with no chevron or nested expansion, and visibly shows `REF/CUR/CUS · BOM/WC/RTG · Row <N> · <Field>`; preserve full dataset and table names in its accessible name. Row number follows current table order for display; navigation uses stable `rowId` and source metadata. Missing required value has a small red `*` after its category label. Warning and Blocker headings and category rows stay outside scrolling regions; each expanded category's detail list has a three-row maximum and scrolls only when it contains more than three locations. Header, dataset rows, and Mock controls stay fixed and visible. Navigation activates the dataset/table, switches to Edit, selects and scrolls the row, clears Search if needed, and focuses/highlights the field when practical. Warning presence never blocks normal application use.
- The shared Footer is a compact three-group summary: Reference/Current structure in BOM / WC / RTG order; Reference+Current readiness, display-only Product Match/Mismatch/Not Set, and clickable `⚠ N`; then full Reference/Current Standard Cost and full Net Gap. Readiness uses blue for Ready and muted rose/red for Incomplete; Product status uses green for Match, violet for Mismatch, and neutral slate for Not Set. The readiness tooltip shows only Reference and Current Blocker counts with CircleX; Custom is omitted, and Ready/Incomplete is not repeated in the tooltip. All Footer tooltips center above their triggers, clamp within the viewport, and keep their content left-aligned. Product tooltip shows full Reference and Current identities and names missing fields without fabricated values. Hover opens after 275ms and keyboard focus opens immediately. Warning tooltip contains only non-zero Warning category/count rows with no heading or total. `⚠ N` counts Warning items only, including Custom and excluding Blockers/Product statuses. Clicking it toggles the Header-owned Prepare Dataset panel; opening resets the issue list to All datasets with no category expanded. Footer cost uses fixed THB: when only one side has UOM, display that trimmed value; when both normalized UOMs match, display the trimmed Reference spelling; when both are blank or conflict, display `Unit`. The unit label is bold but secondary, has no parentheses or pipe/border/focus treatment, sits about 20–24px after Net Gap while inline, and wraps to a right-aligned line below 360px.
- Decimal business values follow the adaptive target in `CROSS_CUTTING.md` (two places normally, four for non-zero values that would look zero, then scientific notation); semantic integers remain whole. Display rounding never changes stored/raw inputs or calculation precision. Non-finite values display as unavailable rather than as zero.
- Blank BOM, Work Center, and Routing identities have usable effective identities `Material N`, `Work Center N`, and `Process N`. `N` is the ordinal among currently blank/generated identities in that table, not the physical row number. Generated identities remain marked as generated in saved snapshots and export as effective names such as `Material 1`; their Edit values remain blank and show the effective name only as placeholder text. They appear in warnings and do not block workflow.
- Duplicate effective identities are auto-renamed to the next available deterministic suffix, such as `mat0.3a`, `mat0.3a(1)`, `mat0.3a(2)`. Apply the rule to direct entry, paste, bulk edits, and other applicable input paths. Report each correction as a warning without a modal. Existing imported/legacy ambiguous data must not cause the comparison engine to guess a match.
- Missing required values make only affected and dependent results Unavailable and appear in the Blockers section. Invalid numeric values and newly entered unresolved nonblank Routing Work Center references are rejected at edit/import ingress. Existing persisted invalid numeric values remain Unavailable with local invalid-cell cues but are not categorized as Warning or Blocker; existing unresolved required Work Center references remain Unavailable and appear under Missing required value Blockers. Never replace missing values with zero. A valid zero remains valid where formulas permit it.
- Development exposes two direct actions, `Complete Mock` and `Incomplete Mock`, in equal centered 50/50 columns on one fixed compact row below Warnings and Blockers. Both load immediately into ordinary Working/history state with no dropdown or confirmation and preserve the active Master Data, Cost Breakdown, or Simulation page. Loading replaces Reference and Current Working data, clears stale Custom Working rows/sizing that would inflate fixture issue totals, and preserves every Last Saved dataset. The load is one ordinary undoable history action, including the previous Custom Working state. Complete Mock has matching Product Name/UOM, calculable Reference and Current costs, and zero Warnings/Blockers. Incomplete Mock has 3 Generated identity + 3 Auto-renamed duplicate = 6 Warnings and 9 Missing required value Blockers, 15 affected locations total; Product Mismatch is a separate status. It does not introduce invalid-number or unresolved nonblank Work Center cases. There is no separate mock session/mode or return action. Reset uses Last Saved when present and the initial Working baseline otherwise.
- Clone is labeled `Clone`; it selects a source and copies that source's Working data into the viewed destination's Working data. The destination Last Saved is unchanged. Source selection performs the copy without a second replacement confirmation.
- Reset always immediately restores Working from Last Saved when present, otherwise from the initial Working baseline; it remains one Undo/Redo action. Clear immediately blanks editable values and metadata while preserving rows, order, supported identity, columns, structural fields, and Sizing counts; it preserves Last Saved and is one Undo/Redo action. Neither uses a confirmation. Sizing remains a compact centered dialog (about 768px maximum). Product Name and Dataset Remark each use a full-width inline `Label : Input` row. UOM, Selling Price (THB), and SG&A use three equal outer columns with inline labels and editors; Bill of Materials, Work Centers, and Routing use the same three column boundaries directly below. Labels use their natural content width and each editor fills the remaining usable width in its own column, so editor widths may differ. SG&A is labelled `SG&A`; `%` stays outside its input shell in a fixed suffix gutter, with accepted gutters preserved for UOM and Selling Price. Sizing editors share a transparent idle border, subtle hover affordance, and strong blue focus without changing geometry. Text values are left aligned and numeric values are right aligned. The dialog uses quiet uppercase `METADATA` and `TABLE ROWS` section headings with whitespace, no divider, and no visible Dataset subheading. Numeric metadata and row counts use the shared text-based numeric editor; row counts remain whole numbers and bounded by their existing limits. ArrowUp/Down and focused wheel use the caret's active place value; when no digit is active, they use the unit step (1 for integer fields and 1.00 for decimal fields). Unfocused wheel input scrolls the page. Unset counts stay unset until edited. Draft values stay local until Apply, and Download Template creates a real `.xlsx` using the current dialog draft with a Download icon in the bottom-left action area. Only populated-data truncation confirms.
- Import remains staged and accepts `.xlsx` only: selection validates without mutation; only the explicit Import button replaces viewed Working and initializes sizing from imported row counts. The compact dropzone and valid/invalid summaries keep the target and row counts easy to scan without exposing parser/debug text. Cancel, Escape, outside click, and X close without importing. Invalid numeric values and unavailable Routing Work Center references reject Import. Export is always available and exports the current Working snapshot, including unsaved changes. Native Save As is invoked directly from the click before asynchronous workbook generation when supported; browser-download fallback remains available. Neither shows warning confirmation.
- Cost Breakdown shows Total Gap first, then cause categories, followed by BOM/Processing detail; avoid repeating the same values across Snapshot Comparison and Variance Tree. Selected Comparison remains a compact scope control.
- Candidate/finding inspection and selection remain inside Cost Breakdown; there is no visible Candidate/Ranking/RCA page or active RCA workflow.
- Simulation opens with Custom active and Current → Custom in Result. It shows the fixed Reference → GAP 1 → Current → GAP 2 → Custom graph, role-local Economic inputs, and directly editable BOM/RTG parameters. Keep same-role Send/Reset actions and the shared Before/After selector; there is no Factors selector, editable Work Center rate, or horizontal BOM/RTG scroll.
- The shared Footer wraps its three logical groups on narrow screens and remains one row on normal desktop widths. Its warning indicator always shows `⚠ N`, including zero, and opens Prepare Dataset with all warning roles visible. Product Match/Mismatch remains display-only and opens no panel. Full Reference/Current costs and Net Gap do not follow Selected Comparison scope.
- Header, Main, and Footer content share the centered `max-w-[1440px]` frame with `px-3 sm:px-4 lg:px-6`; Header/Footer backgrounds span the viewport. The app shell is `h-dvh min-h-0 flex flex-col overflow-hidden`; full-viewport-width Main owns the only page-level vertical scrolling, with the centered frame inside Main, and Footer stays at the viewport bottom without overlaying content.
- Prepare Dataset and footer warning navigation do not add a global blocker or a CBD confirmation. No global page redesign beyond the Header workspace utilities is included.

## Status Model

| Dimension | Values | Meaning |
|---|---|---|
| Dataset save state | Saved / Draft | Saved means Working matches Last Saved. Draft means it differs or has never been saved. |
| Preparation | Prepared / Needs input | Existing readiness semantics are preserved, but these labels are not shown in the Prepare Dataset dataset rows. |
| Comparison display | Product Match / Product Mismatch / Product Not Set | Match/Mismatch labels require complete Product Name and UOM on both sides. Incomplete identity displays neutral Product Not Set without changing the handoff mismatch boolean. All are informational and non-blocking. |
| Data quality | Warning / Blocker | Warnings are generated/renamed identities; Blockers are missing required values. They have separate counts, cues, and readiness effects. |

Save-state dots are separate from selected-dataset styling. Preparation status and warning count are also separate concepts.

## Warning Model

Each Warning and Blocker item identifies a source dataset, table, record, field when available, category, and a human-readable label. Counts represent distinct affected source locations. The footer Warning total excludes Blockers and Product Mismatch. Deduplicate repeated descriptions of the same condition at the same location.

Show `Warnings N` and `Blockers N` in separate sections. Dataset summary rows toggle one shared dataset filter for both sections. Each heading displays the same active dataset (`All`, `Reference`, `Current`, or `Custom`) as plain read-only text; headings have no reset control, selected background, or button behavior. Only categories with affected items are shown. Category rows use a fixed label / neutral count / chevron grid; every category row toggles its detail list, even when it contains one location. Actual items navigate directly and show no chevron or other navigation indicator. Keep the popover about 19rem wide and content-driven. Section headings and category rows stay outside scrolling regions; each expanded category has its own auto-height, max-height detail scroller. Mock controls remain below all issue content and never overlap it.

## Generated and Default Identity Behavior

Product Name and UOM remain blank until supplied. Blank table identities use their generated effective names. Generated numbering counts blank/generated identity entries in table order, independently for BOM, Work Centers, and Routing. Example: `Steel`, blank, `Plastic`, blank becomes `Steel`, `Material 1`, `Plastic`, `Material 2`.

Generated values must be consistent in display, ordinary dataset use, Save, and current Working export. A generated-name warning remains visible to make the implicit identity reviewable. Identity generation must not silently write a physical row number as the business identity.

## Duplicate Identity Behavior

Uniqueness applies per identity domain and includes effective generated identities. Normalize a newly entered duplicate to the next free suffix deterministically. For example, if `mat0.3a` and `mat0.3a(1)` exist, another entry of `mat0.3a` becomes `mat0.3a(2)`. The application records the auto-rename as a warning and continues without confirmation.

## Missing and Invalid Values

Missing required numeric inputs produce Unavailable affected results and Missing required value Blocker items with a source location. Missing/unavailable required Routing Work Center references use the same Blocker category. Invalid numbers, non-positive Capacity, Yield outside its existing valid range, and unavailable nonblank Routing Work Center references retain their finalized local validation/result behavior; dependent results for legacy invalid values remain Unavailable. Do not fabricate values or convert missing/invalid data to zero. Blank Product Name, UOM, Dataset Remark, and valid zeroes allowed by finalized formulas retain their existing metadata/formula semantics.

## Mock Behavior

`Complete Mock` and `Incomplete Mock` load deterministic Reference/Current sample pairs into the active product's ordinary Working snapshots and select Current for review. They clear stale Custom Working rows/sizing that would inflate the fixture totals while preserving all Last Saved snapshots. Complete Mock is Ready/Match with zero Warnings and Blockers; Incomplete Mock is Incomplete/Mismatch with 3 Generated identity + 3 Auto-renamed duplicate = 6 Warnings and 9 Missing required value Blockers, 15 affected locations total. The pair load is one undoable history action, including the previous Custom Working state, and later edits use the same Undo / Redo history. There is no mock-only session, mode, preserved real session, return-to-session action, or mock-specific reset behavior. Reset returns Working to Last Saved when present, otherwise to the initial Working baseline.

## Action and Dialog Behavior

| Action | Behavior |
|---|---|
| Save | Save Working to Last Saved without a warning confirmation. |
| Clone | Choose source; immediately copy source Working to viewed destination Working; preserve destination Last Saved. |
| Reset | Always invoke; restore Last Saved when present, otherwise the initial Working baseline. One Undo/Redo action. |
| Clear | Immediately blank editable values while preserving rows and Sizing; preserve Last Saved. One Undo/Redo action. |
| Sizing | Keep Dataset metadata and Rows in one compact centered dialog at about 768px maximum. Product Name and Dataset Remark use full-width inline label/input rows; UOM / Selling Price / SG&A use the 20 / 45 / 35 metadata ratio, while the three row-count fields keep their separate aligned columns. Use the shared text-based editor with existing bounds and stable idle/hover/focus states; no body numeric editor has a visible spinner or spinner-only gutter. The editable Header Value owns the visible spinner; ordinary editors keep ArrowUp/Down and focused-wheel adjustment. Use current dialog values for Download Template. Valid Sizing Apply immediately resizes even when trailing rows contain data; the existing Master Data Undo/Redo history restores and reapplies the removed Working rows and counts without changing Last Saved. |
| Import | Use a compact dropzone and concise valid/invalid summary. Parse and validate on file selection without mutation; apply only on the explicit Import button. Cancel, Escape, outside click, and X leave Working unchanged. |
| Export | Always export the active dataset's current Working snapshot, including unsaved edits. Open native Save As before asynchronous workbook generation when supported; preserve the browser-download fallback. No warning confirmation. |
| Complete Mock / Incomplete Mock | Load the selected fixture immediately; no dropdown or confirmation. |
| CBD entry/navigation | Never blocked or confirmed by warnings or Product Mismatch. |

## Examples

1. **Save state:** a selected Current tab can be visually active while its gray dot and accessible title say `Draft`.
2. **Generated numbering:** `Steel`, blank, `Plastic`, blank gives effective BOM names `Steel`, `Material 1`, `Plastic`, `Material 2`.
3. **Warning and Blocker totals:** 2 generated identities + 3 auto-renamed duplicates produce footer `⚠ 5`; 3 missing parameter locations are shown separately as `Blockers 3`. Product Mismatch contributes to neither count.
4. **Single issue:** one affected Missing required value category still expands; the revealed location navigates directly to its source field.
5. **Multiple issues:** three missing parameters expand into three Blocker locations; selecting one targets its source.
6. **Duplicate entry:** with `mat0.3a` and `mat0.3a(1)` already present, a new `mat0.3a` becomes `mat0.3a(2)` and creates one auto-rename warning.
7. **Reset after mock:** mock load and subsequent edits are ordinary Working changes; Reset restores Last Saved when present, otherwise the initial Working baseline.
8. **Mock fixture totals:** Complete Mock has zero Warnings and Blockers. Incomplete Mock has 3 Generated identity + 3 Auto-renamed duplicate = 6 Warnings and 9 Missing required value Blockers, 15 affected locations total. Its Product Mismatch is a separate status.

## Implementation Checklist

### Toolbar
- [x] Desktop primary toolbar is one logical row where width permits, with controls grouped so wrap points do not split tool groups.
- [x] Reference / Current / Custom are on toolbar level.
- [x] Saved uses a green dot.
- [x] Draft uses a neutral gray dot, including when no Last Saved snapshot exists.
- [x] Active-tab styling is distinct from save state.
- [x] Save stays neutral and remains invokable in every dataset state.
- [x] Toolbar order is Dataset → icon-only Eye/Pencil → Tools → fixed Search → Table at the far right.
- [x] All toolbar actions use neutral icon-only controls with tooltips and borderless idle styling, retaining individual 32×32px targets and existing spacing; Import uses FileSpreadsheet and Export uses SquareArrowOutUpRight.
- [x] View and Edit are always-visible icon-only Eye/Pencil segments within one 64×32px sliding control, with equal halves, distinct active styling, correct title/aria-label/aria-pressed, and stable geometry; dataset save-state dots keep their existing size.
- [x] Clone label is `Clone`.
- [x] Table selector order is BOM / Work Centers / Routing / All.
- [x] Table selector buttons use equal fixed sizing.
- [x] Master Data toolbar has no Prepare Dataset Info trigger; the sole Info entry point is in the global Header.
- [x] Header has brand/product context at left, exactly four centered navigation tabs, and right Undo / Redo / Info utilities in that order.
- [x] Global Header has no Search; disabled Undo/Redo use muted opacity without `cursor-not-allowed`.
- [x] Header Product context uses the Current Product Name/UOM even when it differs from Reference; available names use remaining Header width, blank components stay truthful, and no Product/PC defaults are fabricated.
- [x] Undo / Redo stay visible in the right Header utility group and are enabled only for available Master Data history.
- [x] Search is local to Master Data and keeps the existing selected-table / All filtering behavior.
- [x] Search placeholders are `Search BOM` / `Search Work Centers` / `Search Routing` / `Search all tables`, without ellipses, and share a fixed 192px desktop width and stable toolbar position.
- [x] Per-table Search controls are removed.
- [x] Clone source flyout opens by hover and click/keyboard activation, remains open when moving between trigger and menu, closes after leaving the whole region unless pinned, and closes on trigger click/outside click/Escape when pinned. It excludes the destination and clones immediately.
- [x] Reset, Clear, and Save keep one icon each: click acts on the viewed dataset; a delayed hover menu exposes only the matching `… all datasets` action, with an accessible keyboard route and no confirmation.
- [x] Dataset selector uses three equal fixed-width segments; Table selector uses four equal fixed-width controls. Both groups share control height, border weight, selected-state language, and vertical alignment.
- [x] Warning toggle uses an uncrossed/crossed `!` state; OFF removes amber fills from Warning and Blocker fields while preserving Blocker stars and semantics.
- [x] Toolbar actions contain no vertical separators.
- [x] Search remains 192px and in the same position for BOM / Work Centers / Routing / All.
- [x] View and Edit have accessible labels/titles and correct pressed states with no visible text labels.
- [x] Clone opens on hover or click/keyboard activation and keeps the trigger plus dropdown as one hover region.
- [x] Clone Escape closes the menu and restores focus to the trigger.

### Metadata
- [x] Product Name remains blank until entered.
- [x] UOM remains blank until entered.
- [x] UOM is free input.
- [x] Metadata fields use stable relative widths.
- [x] Metadata uses compact inline label/value pairs without a heading or disabled View inputs.
- [x] Selling Price accepts a numeric input; `(THB)` in the field label supplies the unit without a duplicate value suffix.

### Prepare Dataset
- [x] Reference / Current / Custom each occupy a row at all widths, with aligned save, Warning, and Blocker columns.
- [x] Save states are shown for all datasets.
- [x] Dataset rows do not show Prepared / Needs input readiness.
- [x] Per-dataset Warning and Blocker counts are shown independently of save state.
- [x] Clicking a whole dataset summary row filters both Warnings and Blockers; clicking that same active row clears the shared filter.
- [x] Both issue headings show the active dataset filter as plain text without button, hover, or selected background; dataset rows remain the only filter controls.
- [x] Popover is about 19rem wide, content-driven when collapsed, and clamps to the available viewport height.
- [x] Top row reads Dataset, readiness, Product status, and Close in one compact line.
- [x] Ready uses blue; Incomplete uses muted rose/red and remains a status, not a warning.
- [x] Product Match / Mismatch is display-only, with no chevron, underline, border, or filled status background; it remains outside the warning count.
- [x] Product Name/UOM details are available through the Footer tooltip; no Product mini-popover remains.
- [x] Reference / Current / Custom summaries use aligned Dataset / Save / Warning icon+count / Blocker icon+count columns, in that order.
- [x] Warning and Blocker category counts are neutral; semantic emphasis stays on section titles and icons/cues.
- [x] Warnings and Blockers are distinct sections that share one dataset filter; only categories with affected items are shown.
- [x] Dataset and category child labels alone are indented 12–16px without shifting shared icon/count/chevron columns.
- [x] Warning item labels show current role/table/row number/field only; navigation continues to use stable rowId/source metadata.
- [x] Warning and Blocker category count and chevron columns stay aligned.
- [x] Every category row expands/collapses its details consistently, including a single affected location; each detail navigates directly.
- [x] Warning and Blocker section headings and category rows stay fixed; each expanded category has its own bounded detail scroll region while the panel header, dataset summary, and Mock controls remain visible.
- [x] Complete Mock / Incomplete Mock action row stays fixed below warning details with equal centered 50/50 buttons.
- [x] Panel stays compact without unused collapsed space; its fixed regions and mock row remain visible in visual cases A–N.
- [x] Narrow viewport panel fit is verified at 375px and 320px using a real CSS viewport override.
- [x] At 320×667, the panel keeps both Mock actions visible and confines overflow scrolling to expanded category detail regions.
- [x] Ready / Incomplete uses the shared readiness derivation; Product Match / Mismatch / Not Set uses truthful complete-identity display without changing the core handoff mismatch boolean.
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
- [x] Table-local Warning and Blocker counters in All stay in All while navigating within their own table.

### Footer
- [x] Reference and Current structure counts use BOM / WC / RTG order; Custom is omitted.
- [x] Readiness is limited to Reference and Current and uses `Datasets Ready` / `Datasets Incomplete` with blue / muted rose-red dot and text.
- [x] Complete Product identities use the shared normalized Match/Mismatch display in Footer and Prepare Dataset; incomplete identity shows Product Not Set without changing the handoff boolean.
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
- [x] Prepare Dataset is about 19rem wide and content-driven while warning categories are collapsed.
- [x] Warning/Blocker headings and category rows stay outside scrolling regions; only each expanded category's detail list scrolls within a bounded, content-driven height, and Mock controls remain below all issue content.
- [x] Ready is blue; Incomplete is muted rose/red; Product Match is green; Product Mismatch is violet; Product Not Set is neutral; Warning remains amber/yellow.
- [x] Nonzero top dataset Warning/Blocker counts use amber/rose respectively, zero counts and category counts remain neutral, and columns stay aligned.
- [x] Dataset rows apply one shared filter to both issue sections; both headings show its active value as plain, non-interactive text.
- [x] Footer Dataset tooltip has no repeated heading and shows only Reference / Current Blocker icon/count rows.
- [x] Footer Product tooltip has no heading, shows complete Name (UOM), labels partial/missing values, wraps long names, and never clips with ellipsis.
- [x] Footer warning tooltip has no heading/total and shows only non-zero category/count rows.
- [x] Footer tooltip hover delay is 250–300ms, keyboard focus opens immediately, and Escape hides it.
- [x] Footer tooltips are fixed overlays that cause no page scrollbar or layout shift.
- [x] Footer status text is not selectable and uses the default cursor; warning action uses a pointer cursor.
- [x] Decimal business values across Master Data, Footer, Cost Breakdown findings, and Simulation display exactly two decimals, including trailing zeroes; semantic integers remain whole.
- [x] Rounding applies only to display and does not change stored inputs or calculations.
- [x] Non-finite values render as unavailable, never as a fabricated zero.

### Latest Header Ownership / Warning Hierarchy / Row Location Correction
- [x] Header Info is the only Prepare Dataset entry point and owns the panel anchor; Master Data toolbar has no duplicate or hidden trigger.
- [x] Header Info toggles the panel; Footer warning action opens the same panel in All mode; outside click and Escape close it.
- [x] Escape and explicit close return focus to Header Info; outside click does not steal focus.
- [x] Dataset and warning-category labels alone are indented 12–16px while icon/count/chevron tracks stay fixed.
- [x] Both issue headings show the active shared dataset filter as plain, non-interactive text.
- [x] Visible warning items use `<Role> · <Table> · Row <N> · <Field>` and omit business identity/category text.
- [x] Row number reflects current table order, is display-only, and navigation continues using stable source metadata.
- [x] Ready is blue; Incomplete is muted rose/red; Product Match is green; Product Mismatch is violet; Product Not Set is neutral in Prepare Dataset and Footer; Warning remains amber/yellow.
- [x] Desktop correction cases A–Q were checked at 1280px; warning navigation and focus were checked in the running app.
- [x] Narrow viewport case R was visually checked at 375px and 320px widths.

### Latest Footer Unit and Compactness Correction
- [x] Prepare Dataset is about 19rem wide on desktop and content-driven when collapsed.
- [x] Its viewport width clamp and status-row fit were verified at 375px and 320px.
- [x] Dataset summary rows toggle the shared Warning/Blocker filter; both headings display the active filter as plain text.
- [x] Warning icon uses a centered fixed cell aligned with the shared count axis; warning colors remain amber/yellow.
- [x] Dataset selector and Prepare Dataset use the same small, more clearly outlined Saved/Draft dot style without adding selector text.
- [x] Footer cost unit uses the sole trimmed nonblank UOM when only one side has a value, the trimmed Reference spelling when both normalized UOMs match, and `Unit` when both are blank or conflict.
- [x] Footer cost unit stays THB, has no parentheses or pipe separator, uses 20–24px separation after Net Gap while inline, and under 360px moves to a right-aligned line.
- [x] Product Mismatch is violet in Prepare Dataset and Footer; Product Match is green, Product Not Set neutral, Ready blue, Incomplete rose/red, and warning emphasis amber/yellow.
- [x] Footer informational content uses the default cursor; only the clickable `⚠ N` indicator uses pointer.
- [x] At 1280px, 1024px, 375px, and 320px, the long Master Data view has Main as its only page-level vertical scroller at the viewport's right edge.
- [x] Master Data table wrappers do not add nested vertical scrollbars; each expanded Prepare Dataset category has its own bounded detail scroller without scrolling its section/category labels or displacing Mock controls.
- [x] No horizontal page overflow; the responsive table selector keeps all four equal options, including `All`, inside the viewport.
- [x] Prepare Dataset stays inside the viewport with its top statuses and mock row usable at 375px and 320px.
- [x] Footer wraps without overlap, and its status/cost groups remain within the viewport at 375px and 320px.
- [x] Footer shared unit stays dynamic with fixed THB, bold but secondary, with 20px inline spacing after Net Gap and a right-aligned second line under 360px.
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
- [x] Complete and Incomplete Mock preserve the active page for Master Data, Cost Breakdown, and Simulation (all six combinations).
- [x] Neither mock action uses a dropdown or confirmation; both use ordinary Working/history state.
- [x] Ordinary Working state is used.
- [x] Ordinary Undo / Redo history is used.
- [x] No Mock Session remains.
- [x] No Mock Mode remains.
- [x] No Return to working session remains.
- [x] Reset after mock load restores Last Saved when present, otherwise the mock Working baseline.

### Actions
- [x] Clone source selection works.
- [x] Clone has no second confirmation.
- [x] Export is always available and uses current Working values, including unsaved edits.
- [ ] Native Save As opens directly from the Export user action before asynchronous workbook generation; browser fallback remains available.
- [x] Reset is immediate, uses Last Saved or initial Working baseline, and remains one Undo/Redo action.
- [x] Clear is immediate, preserves row structure and Last Saved, and remains one Undo/Redo action.
- [x] Sizing confirms only destructive populated truncation.
- [x] Sizing defaults unset counts from existing rows and downloads a blank template from current dialog values.
- [x] Sizing dialog presents aligned metadata and row-count controls in a compact centered layout; draft values remain local until Apply.
- [x] Import does not mutate until the explicit Import action; cancel paths leave Working unchanged.
- [x] Import dialog provides a compact dropzone and concise valid/invalid summary while preserving staged validation.
- [x] Export uses current Working and attempts native Save As with a browser-download fallback.
- [x] Save has no warning confirmation.
- [x] Export has no warning confirmation.
- [x] CBD entry has no warning confirmation.

### Scope
- [x] Master Data tables retain their existing implementation without a wholesale table rewrite.
- [x] Targeted table presentation/interactions for selection, blockers, row actions, and counts are implemented while preserving existing spreadsheet behavior.
- [x] Shared Header follows the latest order and label contract without adding workflow status, CTA, warning text, or navigation items.
- [x] No broad Footer redesign.
- [x] Cost Breakdown findings and Simulation receive presentation-only refinements.
- [x] No finalized cost formulas changed unintentionally.
- [ ] The latest Warning/Blocker split, table-header counters with no per-table footer, and Header-to-toolbar spacing have been visually accepted in a browser.
- [x] Prepare Dataset fit, Footer tooltip bounds, product/UOM states, Sizing, and the `.xlsx` picker were reviewed in the browser at 320, 375, 1024, 1280, and 1920px as applicable. The same Routing table and metadata slots were also compared across View/Edit; human acceptance remains pending for the overall Warning/Blocker hierarchy.

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
- [x] The 2026-10-17 correction pass was committed and pushed to `origin/logic/simulation-finalized-implementation` as `123152c`; it was not merged.

### Verification Notes

#### Prior Prepare Dataset / Footer visual acceptance

These records describe earlier visual reviews. Fresh browser review of the product-status, UOM, Import file-filter, and Sizing corrections is recorded in the correction checklist below; overall human acceptance remains pending.

- [x] A — Complete Mock shows Match/Ready and no warning categories are expanded.
- [x] B — Incomplete Mock shows Mismatch/Incomplete and the expected non-zero warning groups.
- [x] C — Collapsed warning categories show no empty scroll viewport.
- [x] D — Generated identity expansion keeps its category row visible.
- [x] E — Missing required value detail rows stay within their category's bounded detail region, which scrolls when needed.
- [x] F — Multiple warning/blocker categories may remain expanded at the same time, with each category label fixed above its own details.
- [x] G — One- and two-digit dataset counts align in the same fixed columns.
- [x] H — Custom zero count has a gray warning icon and right-aligned gray `0`.
- [x] I — Footer Dataset status tooltip opens upward and lists Reference / Current only.
- [x] J — Footer Product tooltip opens upward and shows each Product Name/UOM without fake defaults.
- [x] K — Footer Warnings tooltip opens upward and lists non-zero categories only.
- [x] L — Clicking footer `⚠ N` opens Prepare Dataset in All warnings mode with no category open.
- [x] M — Filtered Warning and Blocker sections both show `Current` as plain context while their rows and counts are filtered.
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
- [x] 6 — Each warning category expands in place; multiple categories may remain open.
- [x] 7 — Long issue content scrolls only inside its own category detail list; section headings and category labels stay outside the scroller, and Mock controls remain below.
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
- [x] Blocker red `*` and validation stay visible when Warning highlights are hidden; its amber fill is removed with the Warning fill.
- [x] Prepare Dataset shows Warning counts before Blocker counts on each dataset row.
- [x] Warnings precede Blockers; dataset rows apply one shared filter, and each section shows a read-only label for the active filter.
- [x] `Missing required value *` places the red star after the category label.
- [x] Every category row expands/collapses details regardless of count; actual item rows have no chevron and navigate directly.
- [x] Complete Mock and Incomplete Mock remain equal-width controls below both issue sections.

#### Footer
- [x] Footer `⚠ 0` stays visible; `⚠ N` counts only Warning items.
- [x] Warning tooltip excludes Blockers and contains only non-zero Warning categories.
- [x] Footer readiness tooltip shows only Reference and Current Blocker icon/count rows; Ready/Incomplete is not repeated and Custom is omitted.
- [x] Warning click still opens Prepare Dataset.
- [x] Product Match is green; Product Mismatch is violet; Product Not Set is neutral; Warning emphasis remains amber/yellow.

#### Master Data tables
- [x] Visible column labels use Material, Work Center, Labor Rate, Burden Rate, Capacity, Yield, Note, and Actions.
- [x] Browser comparison of the same Routing table in View and Edit shows stable columns, row heights, Actions, header counters, Add Row, and metadata slot positions.
- [x] Row selection works in View and persists into Edit while the dataset scope stays the same.
- [x] `#` header toggles only visible/filtered rows and preserves hidden selected rows.
- [x] `#` Select All has a subtle visible pressed state with the same geometry in both states.
- [x] Trash on a selected row deletes the selected group in one history action; unselected-row Trash deletes only that row.
- [x] One Actions column contains Trash and GripVertical; idle grips stay light, direct grip hover and active drag darken the grip, and row selection/hover/focus-within do not.
- [x] Each table has local cyclic Warning and Blocker counters in the header; zero counts remain visible and inert.
- [x] Each table is a distinct bordered card in All view, with a compact gap and shared width.
- [x] Table-local Warning and Blocker counters in All stay in All while navigating within their own table.
- [x] Table-local Warning and Blocker navigation clears Search when needed, then selects, scrolls, and focuses the source.
- [x] Warning and Blocker traversal follows stable issue IDs across equivalent regenerated lists, View/Edit, search clearing, and focus changes; resolving the current issue continues to the next remaining one. Product, role, or table scope changes reset the local cursor.
- [x] Add Row remains visible and disabled in View; empty Edit body adds the first row and remains compact.
- [x] The table header always shows title, row/selection counts, Warning/Blocker counters (including zero), and Add Row; no per-table footer renders.
- [x] Tables use the page-level vertical scroll; table wrappers scroll horizontally only.
- [x] Spreadsheet keyboard, TSV paste, Ctrl/Cmd+X cut as one history action, Undo/Redo, multi-row edit, and reorder behavior remain intact.

#### Header spacing and verification
- [x] Master Data toolbar touches the shared Header with no added top gap; other pages keep their spacing.
- [x] The `#` header, row selection, Trash grouping, and blocker navigation are covered by targeted verifier checks.
- [x] Relevant verifier scripts pass.
- [x] `npm run build` passes.
- [x] `git diff --check` passes.
- [ ] Current Warning/Blocker popover, table geometry, and Header-to-toolbar spacing receive human visual acceptance in a browser.

Browser review covered the expanded Incomplete Mock warning/blocker details, per-category detail scroll regions, fixed Mock controls, product tooltip, UOM display, Sizing, and Footer at desktop and narrow widths. View/Edit table and metadata geometry were compared in the same Routing view. Human acceptance of the overall Warning/Blocker hierarchy remains pending.

## Deferred / Locked for Later

1. Any migration to a new table library such as MUI X Data Grid.
3. Detailed Import modal visual redesign beyond preserving current valid behavior.

The latest bounded table interaction refinements are in scope and documented below. A broader table visual pass remains later work; current data, lifecycle, and domain logic remain authoritative.

### Current Product Identity, UOM, Import, and Sizing Correction
- [x] Product status is Match, Mismatch, or Not Set based on complete identity values; incomplete values remain visible in the tooltip without fabricated Product/UOM defaults and do not affect Warning/Blocker counts or readiness by themselves.
- [x] Footer shows the sole nonblank trimmed UOM, Reference spelling for normalized matches, or Unit for blank/conflicting values; unit styling is bold but secondary.
- [x] The user-facing Import picker/dropzone accepts `.xlsx` only; data remains staged until the explicit Import action and there is no second confirmation.
- [x] Sizing uses the shared bounded integer editor for typing and keyboard interaction; focused spinner, ArrowUp/Down, and wheel use the active integer place or unit fallback, unfocused wheel scrolls normally, and unset counts stay unset.
- [x] Fresh browser review of the corrected Footer product tooltip/status and UOM display at desktop and narrow widths.
- [x] Fresh browser review of the corrected Prepare Dataset popover and fixed Mock controls at desktop and narrow widths.
- [x] Fresh browser review of the Sizing dialog and shared numeric-editor minimum/maximum boundaries and unset behavior.
- [x] Browser DOM confirms the picker advertises `.xlsx` only; the Import verifier checks the visible label and non-`.xlsx` rejection guard.

### Latest Toolbar, Import, and Prepare Detail Correction

This addendum supersedes earlier presentation details in this document where they differ, while preserving the existing lifecycle, history, validation, Warning/Blocker, and calculation rules.

#### Implementation checklist

- [x] View/Edit is one equal-half Eye/Pencil segmented switch; either icon area toggles the same state once, both icons remain visible, and the accessible name/tooltip describe the next action.
- [x] Dataset selector has three equal fixed-width segments; Table selector has four equal fixed-width controls. Both share border, height, alignment, and selected-state treatment.
- [x] Toolbar utility icons have no idle border and retain separate 32px targets and existing spacing.
- [x] Warning visibility uses the same centered `!` geometry with a clean slash when off.
- [x] Export uses an outward arrow-from-box icon and exports current Working.
- [x] Clone uses the `Clone from` tooltip/accessibility name; its compact menu fits the longest real role label plus padding, centers below the trigger, role labels are left aligned, and the destination remains excluded. Hover, click-pinning, outside click, Escape, and selection dismissal follow the latest contract.
- [x] Search placeholders omit ellipses and remain fixed-width and fixed-position.
- [x] Reset/Clear/Save primary click acts on the viewed dataset; each hover menu has only the matching all-dataset action, and keyboard users can reach it.
- [x] All-dataset Reset/Clear use one ordinary compound Working history edit; Save retains the existing Last Saved lifecycle.
- [x] View and Edit metadata use the same stable field slots as table editing; idle editors remain visually light, with clearer hover and focus treatment.
- [x] Footer shows bold-secondary `THB/UOM` without parentheses or a pipe; UOM resolution is unchanged.
- [x] Import title has no decorative icon; the full taller dashed dropzone is clickable, keyboard-accessible, and accepts `.xlsx` only.

## Master Data Interaction and Dataset Correction — 2026-10-17

These requirements supersede older Clone, toolbar-availability, Reset, Export, Clear, and clipboard statements above.

### Finalized contract

- [x] Clone opens by hover.
- [x] The Clone menu stays open while the pointer is over the trigger or dropdown.
- [x] A hover-open Clone menu closes after the pointer leaves the whole region.
- [x] Clicking Clone pins the dropdown open.
- [x] A pinned dropdown closes on trigger click, outside click, or Escape.
- [x] Selecting a Clone source applies the existing copy and closes the menu.
- [x] Every Master Data toolbar action stays enabled and visually active regardless of dataset state.
- [x] Save remains invokable while Working is clean.
- [x] Reset always has a baseline: Last Saved when present, otherwise the initial Working baseline.
- [x] Reset before the first Save restores the initial dataset state.
- [x] Reset after Save restores the latest saved state.
- [x] Export is always invokable and uses current Working values, including unsaved edits.
- [x] Clear blanks editable values while preserving rows, row order, supported row identities, columns, required structural fields, and Sizing counts.
- [x] Clear preserves the row structure and does not behave like Delete Row.
- [x] Clear followed by Reset restores the applicable pre-Clear reset baseline when Clear was not saved.
- [x] Newline-separated single-column paste fills consecutive rows from the focused cell without requiring Block Action or row selection.
- [x] A one-value paste changes only the focused cell, even when a cell range is selected; trailing newlines do not create extra values.
- [x] Pasted values use existing parsing and validation paths; existing safe tabbed clipboard behavior is retained.

### Browser verification checklist

- [x] Clone hover opens, remains open during trigger-to-menu pointer transfer, and closes after leaving the whole region.
- [x] Click pins Clone; pointer leave keeps it open; trigger click, outside click, and Escape dismiss it.
- [x] Clone can be opened by keyboard Space; Escape restores focus to the trigger.
- [x] Selecting a Clone source closes the menu after copying.
- [x] Toolbar actions remain enabled and active-looking in empty and populated dataset states; toolbar actions and selectors can be invoked.
- [x] Clean Save, no-save Reset to initial Working, and post-Save Reset to the latest saved values work in the rendered browser.
- [x] Export downloaded a workbook containing the current unsaved Working value; the headless browser used the download fallback.
- [x] Clear kept row count, identity/order, and columns, blanked editable values, and did not show the empty-table state.
- [x] Clear followed by Reset restored the saved reset baseline.
- [x] Single-cell and vertical multi-row paste events updated only the focused column, without Block Action or selected rows; trailing newlines were ignored.
- [x] Invalid negative Price values were rejected while valid numeric pasted values were applied.
- [x] At 1440×900 and 390×844, the document stayed within the viewport width and the browser emitted no runtime errors.
- [ ] OS-level Ctrl+V / Cmd+V shortcut delivery was not verified: headless CDP input did not emit a native paste event. The rendered table paste handler was exercised with focused-cell ClipboardEvents.
- [x] Import remains staged until the explicit Import action; no second confirmation appears.
- [x] Prepare Dataset section headings and all category labels remain outside scrolling regions; each expanded category owns a separate auto-height, max-bounded detail scroller.
- [x] Prepare Dataset has no shared Warning/Blocker scroll region; only an expanded category's own detail list scrolls, and Mock controls remain below both sections.
- [x] Multiple categories can remain expanded; short lists reserve no empty height and Mock controls stay after issue content.
- [x] Zero Blockers use neutral Footer tooltip icon/count styling; nonzero Blockers retain rose styling.
- [x] Generated identities remain marked as generated for normal workflow and saved snapshots, and Export uses their effective names; Edit inputs stay blank and show the generated identity only as placeholder text.
- [x] Renaming a Work Center updates its linked Routing references in the same ordinary Working history edit, including direct typing and paste/bulk updates.
- [x] Master Data tables use fixed engineering column proportions, neutral idle editors, field-only Warning/Blocker fills and borders, #-only selection interaction with row-level hover/selection tint, and a distinct local focus ring.
- [x] Table row counts begin at the same horizontal position in BOM, Work Centers, and Routing headers.
- [x] Work Center View mode shows a compact neutral identity tag, and the Routing Work Center editor matches its width.
- [x] Shared tooltips render in a viewport-clamped top-level portal above their triggers.
- [x] Sizing uses full-width inline Product/Remark rows; UOM/Selling Price/SG&A align with BOM/Work Centers/Routing in the same three columns, and row-count editors fill their available column width.

#### Verification checklist

- [x] Master Data UI state verifier covers the segmented control, selectors, toolbar action behavior, Import dropzone, Footer unit, and category/detail scroll structure.
- [x] Browser review verified Clone-menu centering and hover/pin/outside/Escape/focus behavior, all six mock/page combinations, Prepare Dataset abbreviations, and first-focus editing at desktop and narrow widths; Clone source selection was checked by verifier, not exercised in browser.
- [ ] Remaining browser coverage: keyboard access for every toolbar action, metadata View/Edit, and Import picker/drop.
- [x] Browser review verifies long and short category lists, multiple expanded categories, fixed section/category labels, and Mock controls remaining visible below details. At 768×900, each three-item list used its natural 84px height without scrolling, the nine-item Blocker list scrolled within its own 88px region, and both Mock actions stayed visible below the details; desktop was also reviewed.
- [x] `npm run build` and `git diff --check` pass after this correction.
- [ ] Human visual acceptance remains pending until the requested desktop and narrow-width review is complete.

### Global Numeric Display and Input Correction — 2026-10-11

The cross-page numeric contract is specified in [`CROSS_CUTTING.md`](CROSS_CUTTING.md). It uses one shared text-based editor, preserves domain validation, and keeps formatting separate from stored precision and calculations.

- [x] Decimal business values show exactly two places, including trailing zeroes; semantic integers remain whole.
- [x] Display formatting does not round stored values or calculation precision; valid imported precision remains intact.
- [x] Master Data, metadata, Sizing, Simulation, Economic Simulation, and legacy numeric entry modals use the shared editor; no application source retains native `type="number"` inputs.
- [x] Decimal typing has no fixed decimal-count limit; blank stays blank; focused drafts are not padded while typing. Display formatting remains separate from stored precision.
- [x] Spinner, ArrowUp/Down, and focused-wheel steps follow the digit place under the caret for decimal and integer inputs; unavailable active place falls back to units; unfocused wheel remains available to page scrolling.
- [x] Capacity and Yield accept valid fractions below one through a transient zero-prefix draft, reject zero and out-of-range values, and do not coerce invalid input.
- [x] Paste applies numeric syntax and domain checks; invalid edits remain uncommitted and do not replace a required-value Blocker with valid-looking data.
- [x] Domain boundaries are field-specific: Selling Price, SG&A (without an upper bound), BOM Usage/Price, Labor/Burden Rate, and Manning are `>= 0`; Loss is `0..100%` inclusive; Capacity is `> 0`; Yield is `> 0..100%` inclusive; configured row counts are bounded whole numbers `>= 1`.
- [x] The numeric rules, formatter, Master Data input filter, and Simulation input guard have targeted automated coverage.
- [x] Browser review verifies live typing, blanking, focused spinners, focused/unfocused wheel behavior, and Poka-Yoke for Capacity/Yield.

### Follow-up Table Geometry and Dismiss Interaction — 2026-10-11

This correction keeps the current table model and domain behavior. Explicit proportional column widths are shared by each table's header, View value, and Edit control. Identity columns remain bounded; Notes remain medium; numeric columns remain compact. Work Center identity and Routing Work Center controls use compatible widths. Loss and Yield keep the value, spinner, and Blocker marker inside the input shell; `%` remains outside that shell inside the same field group and owning column.

Issue styling belongs to the actual field. Warning highlight ON uses a pale amber fill and 1px amber border that survives hover. Warning highlight OFF removes both Warning and Blocker amber field fills while retaining the Blocker red star and validation cues. Focus is the dominant local blue state while retaining the applicable amber fill and Blocker star. A focused cell inside a selected range does not get a second blue ring. Row selection remains a separate subtle row tint and strong blue row-number control; the all-visible-selected header `#` uses a persistent medium/dark slate state with white `#` and a subtle darker border.

Clear's trigger and `Clear all datasets` menu item use a pale rose background and rose foreground on hover only. Idle styling, ordinary tooltip colors, and the blue keyboard focus ring stay unchanged.

Safe empty-workspace/gutter clicks blur an active editor, clear only temporary spreadsheet cell focus/range, and dismiss transient menus/popovers. Escape closes only the topmost transient layer; with no layer open it blurs a focused field/cell and clears temporary spreadsheet focus/range. These actions do not change row selection, committed data, dataset/table selection, Search, or Saved/Working state and never invoke Undo. Existing dialogs retain their own Escape behavior.

#### Implementation checklist

- [x] BOM, Work Centers, and Routing use coherent bounded column/editor proportions.
- [ ] Work Center identity, Routing Process, and Routing Work Center selector use one shared identity-width family.
- [ ] Loss and Yield keep suffix outside the input shell while value/spinner/marker remain within their intended zones.
- [ ] Amber issue borders survive hover; focus stays blue while amber fill and Blocker star remain, without competing range rings.
- [ ] The all-visible-selected `#` control is medium/dark slate with white text and a persistent pressed state.
- [x] Clear alone receives rose hover styling on both the trigger and all-dataset action.
- [x] Safe blank-workspace clicks dismiss transient UI and temporary spreadsheet focus without clearing persistent state.
- [x] Escape closes only the topmost transient layer, then falls back to blurring a field and clearing temporary cell focus/range.
- [x] Generated effective identities remain present in Export and round-trip coverage.

#### Verification checklist

- [x] Targeted geometry, issue-state, Clear hover, and dismiss verifiers pass.
- [x] Required regression verifiers and `npm run build` pass; `git diff --check` passes.
- [ ] Browser checks cover 1280px desktop table states, 1024/1920px, and 375/320px horizontal scrolling after this geometry correction.
- [ ] Numeric active-place stepping, spinner, caret, wheel, and percentage/blocker coexistence are checked in the browser with `%` outside the input shell.
- [ ] Clear all-datasets menu-item hover still needs direct visual inspection; its rose hover styling is present and checked by the verifier.

### Final Field, Selection, and Sizing Geometry — 2026-10-11

The latest geometry correction keeps Dataset, View/Edit, and Table as separate segmented controls while giving all three the same approximately 2px inset active slab. Placeholder color stays neutral except on amber issue fields, where generated/placeholder text uses a slightly stronger neutral slate. Numeric input shells contain value, focus-only spinner, and Blocker marker; a `%` suffix stays outside the shell within its same field group and owning column. Dropdown chevron and Blocker marker occupy separate zones.

Spreadsheet cell focus/selection is limited to one Dataset + Table + Column and remains separate from row selection. A single cell is Focus only; Cell Selection exists only for two or more cells. Plain click moves Focus and clears any earlier multi-cell selection; Ctrl/Cmd+Click toggles non-contiguous cells, and a selection that falls below two cells collapses to Focus on the remaining cell. Shift+Click, vertical drag after a small movement threshold, and Shift+Up/Down select contiguous cells in one column. Interacting with another column or table clears the earlier cell selection; only one table owns the active cell state. View supports focus/selection for inspection without clipboard operations; Edit supports Copy/Cut/Paste. Without multi-selection, clipboard actions use Focus; with two or more selected cells they operate on the selected cells in top-to-bottom order. Scalar paste fills all selected cells, and one-column multiline paste maps one value to each selected position through the existing update/history path. Selected cells use a thin blue 1px perimeter; Focus uses a stronger shared blue perimeter and wins visually without stacking borders. Issue fill and Blocker markers remain visible during selection/Focus.

The Dataset selector has three equal-width segments with fixed geometry and an approximately 2px inset active slab. The identity width family comprises BOM Material, Work Centers Work Center, Routing Process, and Routing Work Center; Routing reserves two such slots. Main-page metadata stays in one horizontal row at desktop widths with inline `Label : Value` pairs; UOM, Selling Price, and SG&A have equal effective widths, while Product Name and Remark remain wider. Loss and Yield issue shells retain applicable amber fill through focus; a selected or focused value perimeter replaces the amber border. Turning Warning highlights off removes amber fill from both Warning and Blocker fields while Blocker markers and validation remain. Sizing uses quiet uppercase `METADATA` and `TABLE ROWS` headings with whitespace between sections, plus short subtle vertical dividers between the first two groups in each three-column row. Dividers hide when the rows stack.

#### Implementation checklist

- [ ] Dataset, View/Edit, and Table active slabs share the inset geometry.
- [ ] Amber-highlighted generated placeholders use readable neutral slate.
- [ ] Numeric value, spinner, blocker marker, chevron, and `%` use distinct intended zones.
- [ ] `%` remains outside its input shell and inside its owning field group/column.
- [ ] Spinner remains compact, stable, and clear of value/caret and blocker marker.
- [ ] Warning/Blocker fill follows the highlight toggle through hover/focus; Blocker star and validation survive OFF; focus wins over range styling.
- [ ] Cell-range selection stays in one column for pointer and keyboard extension.
- [ ] Same-column copy/cut/paste uses ordered newline values and existing validation.
- [ ] Header `#` has clear normal, hover, and dark-slate/white pressed states.
- [ ] BOM Material, Work Center, Routing Process, and Routing Work Center use the identity-width family.
- [ ] UOM, Selling Price, and SG&A have equal outer column widths in View and Edit.
- [ ] Sizing shows `METADATA` / `TABLE ROWS` and has no section divider.

#### Verification checklist

- [ ] Targeted verifiers cover geometry and same-column clipboard behavior.
- [ ] Relevant regression verifiers and `npm run build` pass.
- [ ] `git diff --check` passes.
- [ ] Browser review covers all requested desktop and narrow viewport sizes.

### Sizing and Cell Focus/Selection Finishing Pass — 2026-10-12

This latest refinement keeps the accepted Master Data workflow and calculations unchanged. Sizing uses inline `Label : Input` rows: Product Name and Dataset Remark span the dialog width; UOM / Selling Price / SG&A use three equal outer columns aligned with BOM / Work Centers / Routing below. Labels use natural content widths, and each editor fills the remaining usable space in its own column, so editor widths can differ. Subtle vertical separators mark the first two upper groups and the first two lower groups without a trailing divider. SG&A is labelled `SG&A`, and its fixed `%` suffix sits outside the input shell; accepted spinner/suffix gutters remain. Sizing editors share a stable transparent idle state, subtle hover, and strong inset blue focus.

Master Data cell focus/selection is independent from row selection. It is available in View and Edit but only Edit exposes clipboard operations. Cell Selection is confined to one Dataset + Table + Column and exists only for two or more cells; one cell is Focus only. Plain click moves Focus and clears prior multi-selection. Ctrl/Cmd+Click toggles non-contiguous cells, and reducing the selection below two cells focuses the remaining cell without a Selected state. Shift+Click, vertical drag, and Shift+Up/Down create same-column ranges. Interacting with another column or table clears the prior selection, and only one table owns the active cell state. Selected cells use a thin blue 1px perimeter; Focus uses the stronger shared blue approximately 2px perimeter and wins visually when both states apply. Clipboard actions use Focus when there is no multi-selection and selected cells in visual row order when there are two or more. Scalar paste fills selected cells and multiline paste maps one value to each selected position through the existing update/history path.

The four identity columns (BOM Material, Work Center, Routing Process, Routing Work Center) and all Note columns use shared actual widths. `#` and Actions retain their shared fixed widths. Routing reserves two shared Identity-width columns; only the middle data columns flex, and each table uses the same outer width and minimum-width policy so the Actions edge aligns. Unit is wider than the previous narrow state. Identity typography is consistent and preserves stored casing/generated-placeholder treatment. Loss/Yield formulas and data remain unchanged; their numeric input/display fields use the shared Master Data field-state system, occupy the full value region, and keep the fixed `%` suffix outside the Focus, selection, and issue perimeter.

### Shared First-Focus Input Selection — 2026-10-17

Editable text inputs, textareas, and the shared numeric editor select their full current value whenever they receive focus, whether focus comes from a pointer or keyboard navigation. The first pointer click keeps that selection after native caret placement; a later click can place the caret. Arrow keys, manual partial selection, typing, Backspace/Delete, Ctrl/Cmd+A, paste, numeric steppers, spreadsheet navigation, and validation continue through their existing editing paths. Select controls, buttons, read-only fields, and display cells are outside this behavior.

#### Verification

- [x] Master Data text, dataset remark, numeric, and textarea focus behavior.
- [x] Mouse focus and Tab focus select the full value; a second click repositions the caret.
- [x] ArrowLeft/ArrowRight collapse or move the text caret; grid navigation resumes at value boundaries.
- [x] Backspace/Delete, replacement typing, partial selection, select-all, paste, numeric stepper, and validation paths remain functional.
- [x] Simulation parameter, Economic, and Business numeric editors use the same behavior.

#### Implementation and verification checklist

- [x] Sizing Product Name and Dataset Remark use full-width inline label/input rows.
- [x] UOM / Selling Price / SG&A and BOM / Work Centers / Routing share aligned three-column boundaries, with natural-width labels and editors filling their own columns.
- [x] Row-count editors fill their available column width instead of shrinking to the value.
- [x] SG&A label is `SG&A`; fixed `%` stays outside the input shell.
- [x] All Sizing editors share transparent idle, subtle hover, and stable strong focus styling.
- [x] All editable Master Data fields, including issue, percent, dropdown, Unit, and Sizing fields use one strong focus family.
- [x] Cell selection is thin blue; focused selected cell shows the stronger focus treatment as the visual winner.
- [x] View supports cell selection without clipboard operations; Edit supports clipboard operations.
- [x] Ctrl/Cmd+Click toggles non-contiguous cells; Shift-click, vertical drag, and Shift+Up/Down select a contiguous same-column range.
- [x] One cell is Focus only; Cell Selection exists only for 2+ cells and collapsing below 2 promotes the remaining cell to Focus.
- [x] Selection ownership is limited to Dataset + Table + Column; another table clears the prior table's selection.
- [x] Clipboard uses Focus with no multi-selection and selected cells only for a selection of 2+.
- [x] Copy/Cut use top-to-bottom selected positions; scalar and multiline paste map through selected cells.
- [x] Escape, blank workspace, dataset/table scope changes, and removed rows clear or prune temporary selection as specified.
- [x] Identity and Note columns use shared actual widths; `#` and Actions retain shared fixed widths.
- [x] Unit uses one wider stable width in View/Edit/focus; all numeric values stay centered and text stays left aligned.
- [x] Work Center identity typography matches the other identity values without changing casing or generated placeholder treatment.
- [x] Loss and Yield value-plus-suffix groups remain centered; `%` stays stable across View/Edit, focus, spinner, and Blocker states.
- [ ] Export and Download Template retain all six calculated META labels and their existing dependency/blank semantics.
- [x] Targeted verifiers, relevant regressions, production build, and `git diff --check` passed for the 2026-10-17 correction; `src/state/store.tsx` contains the active-page preservation change for mock loading.
- [ ] Browser review covers 1280px, 1024px, and available 1920px / 375px / 320px widths.
- [x] The 2026-10-17 correction changed no calculation or lifecycle semantics; its scoped changes were committed and pushed as `123152c` and not merged.

### Selected Value / Decimal UX — Master Data Round 2 — 2026-10-21

This later finalized user decision supersedes earlier Master Data statements in this file that center numeric table columns, reserve inline spinner space, show body spinners, or allocate equal widths to the UOM / Selling Price / SG&A metadata subgroup. Historical checklists and receipts above retain their original chronology.

- Every editable Master Data numeric input uses the existing shared Selected Value provider. Source identity includes role/dataset, section or table, record or modal draft, and field. Focused Header edits use the original source writer, domain, percentage conversion, integer rules, and history path; hover previews are read-only and non-owning. Read-only numeric values with existing grid focus reuse that native focus target and receive temporary gray hover previews; `SelectedNumber` is reserved for no-focus inspection values. This transient Header state is independent of spreadsheet range/cell focus, row selection, drag/reorder, and clipboard behavior. While Dataset Sizing is open, the same Header Value editor is presented inside the dialog so it remains visible and in the dialog's focus order; no second provider or writer is created. Round 2 acceptance passed, including native-grid hover, editable hover, anchor restoration, and percentage presentation checks.
- Header preview has priority over anchored Focus/Pin and otherwise shows `Value —`. Source Hover Preview waits 350ms; leaving sooner cancels the pending preview, while leaving after activation clears it promptly and restores the existing Focus/Pin anchor or `Value —`. Preview remains read-only and non-owning. Header presentation is capped at 8 decimals, trims trailing zeros, and removes floating-point noise without changing source/storage precision; nonzero values too small for that rounded presentation retain scientific notation. Body/table formatting remains 2 places → 4 places when needed to avoid visual zero → scientific notation when still zero. The global Header Value width is bounded from 96px to 192px with a 28vw preferred size; the Sizing dialog Header keeps its separate bounded dialog width.
- Table numeric headers, editable inputs, and read-only values share a stable right-side axis with consistent right padding. Values grow left; focus does not move the axis. The global Header reserves stable `[numeric value][10px % slot][12px spinner slot]` regions across empty, read-only, editable, Preview, Focus, and Pin states; an absent `%` remains visually empty without shifting the numeric axis. Editable Header anchors stay calm when the pointer is outside Header Value; direct Header hover reveals its subtle boundary and real spinner, and actual Header focus retains a clear blue treatment and usable spinner. Source hover never reveals an editable Header frame. Read-only Header states keep the same geometry without an interactive spinner or editable frame. Ordinary body/table/modal inputs have no visible inline spinner and no spinner-only gutter. Blocker markers and `%` suffixes keep their required separate areas inside the owning field or column.
- The UOM / Selling Price / SG&A metadata subgroup uses 20 / 45 / 35 of that subgroup's available width. Product Name and Dataset Remark remain separate outer metadata fields; this ratio does not apply to the full metadata section or the BOM / Work Centers / Routing sizing-count columns. The layout reflows responsively without clipping field labels or controls.
- At the 2026-10-21 Round 2 close checkpoint, Master Data was CLOSED after the final polish passed its verify/audit/accept gate; the previous correction had already passed acceptance and remains valid. Cost Breakdown Round 3 had not started at that checkpoint; Simulation and final cross-page integration remained later rounds. Calculations, validation domains, dataset lifecycle, spreadsheet selection, history semantics, and import/paste business rules are unchanged.
