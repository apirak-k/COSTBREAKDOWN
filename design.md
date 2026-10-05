# Cost Breakdown UI Design System

> Design contract for the frontend. Use this document for visual and interaction presentation only; current product behavior and calculations remain governed by `docs/REQUIREMENTS_INDEX.md` and its current sources.

## Design basis

- **Code baseline before this UI pass:** `2bf5ec50335beb8064b782f4063a9a1df862ac67` (`docs: record warning-density UI decision`). The design-only commit follows this baseline; the first UI implementation commit must follow the design-only commit.
- **Legacy UX reference:** `feature/taste-frontend-ui` at `f873540a6fa2bd1564c070a1164f457857762752`, inspected for presentation and interaction patterns.
- **Current visual reference:** the user's Cost Breakdown screenshot and the current implementation at the baseline above.
- The existing `codex/uiux-refresh` implementation is additional visual context. Adopt presentation patterns only; current schemas, state transitions, calculations, and workbook behavior take precedence.
- This is a light, compact industrial cost-workbench. It is not a marketing page or a generic dashboard.

## 1. Visual theme and philosophy

- **Direction:** precise, compact, calm manufacturing workbench with a dark control rail, light data surfaces, and clear financial hierarchy.
- **Mood:** practical and dependable. Keep rows, numbers, labels, and actions easy to scan without decorative chrome.
- **Reference:** preserve the screenshot's whole-page hierarchy: global title/status/navigation; page toolbar and product metadata; active dataset table or analysis; fixed workspace status footer.
- **Density:** fit useful information on screen while keeping labels readable. Prefer compact spacing and strong alignment over shrinking text or adding card layers.
- **Interaction:** make safe actions discoverable, mode changes explicit, and keyboard focus visible. Use motion only to clarify state changes.

## 2. Color palette and semantic tokens

Use the existing Tailwind slate, blue, amber, emerald, rose, and white colors. Do not introduce a second palette or dark mode as part of this UI pass.

| Token | Value | Use |
| :--- | :--- | :--- |
| `canvas` | `slate-100` (`#f1f5f9`) | Application work area and page gutters |
| `surface` | `white` (`#ffffff`) | Tables, metadata, forms, dialogs, and analysis sections |
| `surface-subtle` | `slate-50` (`#f8fafc`) | Quiet table headers and secondary grouping |
| `control-rail` | `slate-900` (`#0f172a`) | Global navigation and pinned footer |
| `text-primary` | `slate-900` (`#0f172a`) | Main values, titles, and primary labels |
| `text-secondary` | `slate-600` (`#475569`) | Supporting labels and descriptions |
| `text-muted` | `slate-500` (`#64748b`) | Hints and metadata that remain useful |
| `border` | `slate-300` (`#cbd5e1`) | Control edges and section boundaries |
| `divider` | `slate-200` (`#e2e8f0`) | Horizontal table and content separation |
| `action` | `blue-700` (`#1d4ed8`) | Primary actions, links, and active focus |
| `focus` | `blue-500` (`#3b82f6`) | Visible keyboard focus ring |
| `success` | `emerald-700` (`#047857`) | Confirmed or favorable state |
| `warning` | `amber-700` (`#b45309`) | Actionable data-quality or preparation state |
| `negative` | `rose-700` (`#be123c`) | Positive cost gap or unfavorable movement |

Use semantic colors only when the displayed state warrants them. Do not use color alone to communicate a state; pair it with text, an icon, or a local field cue.

## 3. Typography and hierarchy

- **Primary text:** existing Inter/system sans stack.
- **Engineering labels and numeric data:** existing monospace stack for table headings and compact status values. Use tabular figures for costs and quantities.
- **Hierarchy:** page title first; section title second; labels and descriptions below. Avoid oversized dashboard-style headings.
- **Readability:** keep dense table headings at the existing compact scale where necessary, but keep interactive labels and body text at least `text-xs`. Do not solve crowding by making text smaller.
- **Numbers:** align comparable values consistently; right-align numeric table columns; use tabular numerals and preserve explicit units.
- **Language:** UI copy stays in English. Prefer short, plain labels over accounting shorthand and unexplained acronyms.

## 4. Spacing, shape, and elevation

- Follow Tailwind's existing 4px spacing scale. Use compact gaps for toolbars and tabs, and larger separation only between distinct work areas.
- Keep the existing wide work surface (`max-w-7xl`) where it preserves legibility; tables may scroll horizontally on narrow screens.
- Favor square or lightly rounded controls (`rounded-sm` to `rounded-md`) and flat surfaces with clear borders.
- Use elevation sparingly for dialogs and popovers. Avoid nested cards, gradients, decorative shadows, and card-on-card layouts.
- Keep page gutters, toolbars, metadata blocks, and tables aligned to a shared left and right edge.

## 5. Shared component and interaction rules

### Application frame and navigation

- Keep the global title, current product/UOM, workflow status, and four primary sections in the dark top rail.
- Keep the workspace status footer anchored to the bottom of the application frame. It reports current dataset counts, preparation state, and the applicable Gap.
- On narrow screens, let navigation and footer content wrap or scroll without covering page controls. Preserve the skip link and visible keyboard focus.

### Page heading and work areas

- Use one concise page title and a short purpose statement. Place page-level actions or key scope values alongside the title when space permits.
- Use white work surfaces, thin slate boundaries, and restrained horizontal dividers. Group related controls once; do not repeat the same status in multiple banners.
- Preserve the screenshot's Master Data order: dataset/action toolbar, product metadata, selected data table(s), and workspace footer.

### Toolbars and controls

- Keep related actions together and visually distinguish primary, secondary, and destructive actions.
- Use short visible labels for important actions; icon-only controls require an accessible name and a discoverable tooltip where supported.
- Keep controls keyboard-operable, provide visible focus, and use native semantics (`button`, `label`, `select`, `table`, disclosure) where they fit.
- Editing should look different from viewing. Reuse the existing page-level View/Edit mode: viewing is calm and read-focused; editing exposes inputs and row actions.

### Tables and data entry

- Prefer clean horizontal row separators over dense vertical grid lines or striped columns.
- Align headers and cell values; keep row actions grouped at the far edge. In Master Data reorderable tables, keep `#` at the left and the reorder-only drag handle at the rightmost column.
- Keep warning prose, warning badges, and warning-count footers out of Master Data rows. Show a concise dataset notice outside the table when needed; preserve local invalid-cell cues.
- In view mode, present values as text. In edit mode, use quiet inputs that gain a clear surface/border on hover and focus.
- Keep row selection, bulk assignment, add/delete, and reorder affordances visible only where the current page mode and existing behavior allow them.
- On small screens, preserve readable columns with horizontal scrolling instead of compressing values into ambiguous labels.

### Warnings, status, and disclosure

- Use a warning only when it helps the user identify a current condition or next action.
- Keep notices outside dense data rows and avoid duplicate banners that repeat the same message.
- Cost Breakdown warning detail stays collapsed by default behind one concise count/disclosure. Opening it reveals the full current warning list.
- Do not hide a warning that changes the user's ability to interpret data. Keep all existing warning semantics and the current unavailable/missing-value behavior.

### Dialogs and forms

- Give dialogs a clear title, concise context, aligned labels, and a visible primary/secondary action order.
- Keep validation feedback beside the affected field. Do not replace missing or invalid values with a visual zero.
- Preserve keyboard access, initial focus, focus containment, Escape handling where currently supported, and focus return to the invoking control.

## 6. Page composition

### Master Data

- Treat the user's screenshot as the composition reference for the complete page, not as a BOM-only specification.
- Keep dataset selection and actions together in a compact top toolbar. Keep product identity and metadata grouped directly beneath it.
- Keep the active table workspace prominent and give it the remaining vertical room. Where the current layout permits, keep the toolbar/metadata group available while the table area scrolls; never let it overlap table content.
- Retain Work Centers, BOM, Routing, and All Tables access, View/Edit mode, and existing table actions.
- Use the safe legacy patterns that fit current behavior: read-only View Mode by default, border-light tables, inputs emphasized on focus, bulk Work Center assignment where present, and low-noise labels.

### Cost Breakdown

- Lead with the current cost summary and make the comparison scope explicit.
- Use a clear hierarchy between summary figures, variance/source groupings, and itemized detail.
- Preserve the current Standard Cost calculation and comparison data. If Selected Comparison is active, display only its selected-scope Gap; do not add a Full Gap alongside it.
- Keep the warning disclosure collapsed by default and remove repeated explanatory copy.

### Candidate Prioritization

- Make cost impact and prioritization order easy to scan; keep filters secondary to the findings table.
- Keep the applicable Full or Selected Comparison Gap visible with its scope label. Do not imply that ranking automatically selects work.
- Retain the existing controllability action and status filtering without adding confidence badges or warning prose to rows.

### RCA and Simulation

- Show the selected candidate and simulation basis before its RCA and scenario details.
- Distinguish user-authored inputs from calculated outputs through labels, grouping, and alignment, not new business-status colors.
- Keep scenarios A, B, and C comparable in parallel on wide screens and readable in a stacked layout on narrow screens.
- Keep Trial as a concise handoff marker, visually distinct from scenario editing and calculation.

## 7. Responsive and accessibility behavior

- Support the current desktop workbench and narrow viewports from 320px upward.
- At narrow widths, stack page-heading actions and summary blocks, wrap toolbars, keep navigation reachable, and allow data tables to scroll horizontally.
- Do not allow sticky or fixed regions to obscure keyboard focus, dialogs, or table content. Keep the footer readable when its content wraps.
- Preserve semantic headings, table headers, button names, `aria-current`/`aria-pressed` state, and live status announcements already used by the app.
- Use a visible focus ring with sufficient contrast; support reduced motion and do not rely on hover alone.

## 8. Scope boundaries and legacy reuse

- **Presentation scope:** colors, type hierarchy, spacing, surface treatment, navigation, toolbar arrangement, responsive layout, concise copy, and accessible visual states.
- **Keep current behavior unchanged:** domain types, data schemas, identity matching, storage/session rules, import/export format, formulas, calculations, comparison status, Gap scope, warning meaning, and workflow state transitions.
- The old branch is a UX reference, not a behavioral authority. Reuse only patterns that still fit current requirements. Do not restore its outdated workbook formulas, labels, statuses, validation rules, finance logic, or persistence assumptions.
- Do not add a UI library, CSS framework, fonts, or runtime dependency for this refresh. Use the installed React, Tailwind, Lucide, and shared components.
- Do not invent a new user-visible business concept to make a layout look complete. Leave unresolved behavior as-is and record it in the existing source checklist if a design choice would require changing it.

## 9. UI implementation and review rule

1. Treat the code baseline above as the last pre-UI implementation state. The design-only commit must not change rendered application behavior.
2. Implement visual changes in reviewable page-sized slices. Every UI implementation commit message must contain `ui` and identify the affected area.
3. Keep the current design contract current when an approved UI decision changes. Update `HANDOFF.md` with the base commit, commits, verification evidence, and remaining visual review needs.
4. Before calling the work complete, verify the affected build and existing UI checks, inspect the final diff, and report any browser-rendered review that remains unverified. Automated checks do not equal human UI acceptance.

## Implementation record — 2026-10-05

- Design-only checkpoint: `2bf5ec50335beb8064b782f4063a9a1df862ac67`; design contract commit: `df82a9d`.
- Implemented on the existing `codex/costbreakdown-spec-source` branch in separate commits: `9b39e22` (Master Data toolbar and metadata) and `2fd57ea` (RCA and Simulation layout). The reference `feature/taste-frontend-ui@f873540` was read-only.
- The shell/footer, Cost Breakdown warning disclosure, and Candidate scope/filter layout were already present at the checkpoint and remain unchanged in this pass. Calculation engines, comparison rules, candidate generation, scenario computation, and workbook structure/formulas were not changed.
- `npm run build` passed after each UI implementation slice; `git diff --check` passed before each commit. Automated UI checks and tests were not run in this pass. Browser-rendered review remains **[Unverified]** under the existing no-retry instruction in `HANDOFF.md`.
