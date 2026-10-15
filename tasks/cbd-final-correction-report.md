# Final CBD Correction Pass — Evidence Report

Date: 2026-10-16 (Asia/Bangkok). **Closure: CBD NOT CLOSED.**

Implementation and the executed checks below passed. Browser verification of Status re-entry into an already crossed row during the same held gesture, and cancellation during a gesture, remains **NOT VERIFIED**. The available browser input API exposes a single straight drag, without held-pointer waypoints or pointer cancellation. Unit/helper checks do not replace those browser checks. At this report's original checkpoint, nothing had been staged, committed, or pushed; the user later explicitly authorized Git delivery while retaining these open verification limits.

## 1. Starting State

Confirmed worktree `E:\COSTBREAKDOWN\.worktrees\CBD-CANDIDATE-INTEGRATION`, branch `codex/cbd-candidate-integration`, origin `https://github.com/apirak-k/COSTBREAKDOWN.git`. Fetched origin before implementation. Local and remote matched. Staged and unstaged diffs were empty. The only untracked file was `tasks/master-data-cbd-final-audit.md`; it was preserved.

## 2. Actual Starting SHA

Local and fetched remote: `3cee546cfdf15b1deef378b44b7b73d1fec28c81`. Inspected its correction diff, not just the handoff. The existing HANDOFF described an older implementation checkpoint and was treated as historical evidence where it differed from HEAD.

## 3. Pre-Edit Audit — KEEP / CHANGE / REMOVE / VERIFY

| Area | Classification | Finding / action |
|---|---|---|
| A. Cost/WC container | CHANGE / REMOVE | Explicit center-divider grid contradicted the latest instruction. |
| B. Visual parity | CHANGE | Native Cost table and WC grid had independent sizing paths. |
| C. Footer parity | CHANGE / VERIFY | Shared class names did not establish equal rendered geometry. |
| D. WC body scrollbar | KEEP / CHANGE | Keep body-only scrolling; remove rows extended beneath scrollbar. |
| E. Status structure | REMOVE / CHANGE | Remove reset heading and explanatory footer; retain four options. |
| F. Status hover/click | CHANGE | Existing click-only CBD behavior lacked Master Data preview/pinning. |
| G. Status drag | CHANGE | Add fixed-intent selection gesture and last-selected protection. |
| H. Sort chevron | CHANGE | Replace split Sort/Reapply controls with one toolbar button containing the current label/value and chevron. |
| I. Sort hover/glide | CHANGE | Use the single trigger for preview, click pinning, and trigger-to-popup travel. |
| J. Collapse | CHANGE / REMOVE | Restore box; remove blank-area handlers. |
| K. Main/sticky ownership | KEEP / VERIFY | Preserve Main owner and normal-flow Candidate region. |
| L. Selected layout | KEEP / VERIFY | Preserve numeric slots, neutral secondary values, and no WC Selected. |
| M. Candidate reorder | KEEP / VERIFY | No reorder implementation changes; prove real drops. |
| N. Undo/Redo | KEEP / VERIFY | Preserve shared chronological history. |
| O. Reapply Sort | KEEP / VERIFY | Preserve both-table order/history reset. |
| P. Responsive | VERIFY / CHANGE | Browser testing exposed mobile panel scrollbar height conflict; corrected. |
| Q. Docs | CHANGE | Active spec encoded obsolete divider and collapse decisions. |
| R. Verifiers | CHANGE | Replace obsolete implementation assertions and add Status logic checks. |

## 4. Root Causes

- Previous implementation deliberately encoded the now-reversed combined-frame contract in code, docs, and verifiers.
- Cost's native table height distribution differed from WC's grid, despite shared typography classes.
- WC extended body rows under the scrollbar instead of sizing fixed column content to the actual body width.
- Existing CBD menus did not implement the actual Master Data transient behavior.
- During correction, percentage heights with an indefinite parent let the WC body's intrinsic content expand both panels. Fixed shared tracks corrected this. A fixed mobile outer height then created unwanted vertical scrollbars; natural narrow panel height corrected that separately.

## 5. Cost/WC Layout Changes

Shared slate overview background/frame starts directly below Subheader. Inside: two complete bordered panels, desktop equal columns, 8px real gap, equal height. No middle column, divider element, or touching-panel structure. Narrow panels stack.

## 6. Shared Twin-Table Standard

`summary-table-styles.ts` owns panel, table, header/body/footer group, row, cell, typography, separator, and height tokens. Both use grid tracks `28px 114px 32px`; desktop border-box panels are 176px. Narrow outer height can include a native horizontal scrollbar. Cost retains table/header/data-cell semantics and existing Selected slots.

## 7. WC Scrollbar Implementation

Only WC's 114px body has `overflow-y:auto`. Header/footer wrappers remain outside it and retain full width and height. ResizeObserver measures `offsetWidth - clientWidth`; header/footer row content uses that real width difference to align with body columns. No hard-coded scrollbar padding, painted gutter, or cells extended under the scrollbar.

## 8. Status UI / Interaction

Exactly four options, no heading/footer/separators. Reuses the shared transient-interaction registry and shared `Tooltip` component used by Master Data. A single toolbar button contains the Status value and Chevron. Hover preview starts after 120ms; leaving the trigger/popup closes after a 150ms travel grace; click pins/unpins. Escape closes and restores trigger focus; outside click closes without focus theft. The popup is portal-positioned 4px below and horizontally centered on the trigger, clamped to the viewport without clipping under sticky panels. Master Data code was not modified.

## 9. Status Drag Select/Deselect

Pointer-down fixes select/deselect intent. Pointer capture plus hit-testing tracks crossed options; a visited set prevents repeated updates. The existing shared row-selection helper is reused with minimum-one protection. Release, lost capture, pointercancel, and window blur clear gesture state in code. Helper tests cover repeated crossing; browser re-entry/cancellation are explicitly NOT VERIFIED.

## 10. Sort UI / Interaction

One toolbar button contains the current Sort label and integrated Chevron; no split segment or separate Reapply button remains. It shares the Master Data `Tooltip`, 120ms hover preview, 150ms leave/travel grace, click pinning, Escape focus restoration, and outside-click dismissal. The compact popup is 144 x 82px with exactly Gap High→Low, Gap Low→High, and |Gap| High→Low; the active mode is indicated with `aria-pressed`. It opens 4px below and horizontally centered on the trigger, with horizontal viewport clamping. Selecting any option, including the active one, reapplies Sort, resets both BOM and RTG manual orders, clears shared Undo/Redo, and closes the popup.

## 11. Collapse Reversion

32 x 32px boxed button; 1px border `rgb(203,213,225)`, centered disclosure icon, normal hover, and 2px blue focus-visible outline. Dedicated control alone changes expanded state. Correct `aria-expanded` and `aria-controls="cost-breakdown-overview-panels"`.

## 12. Files Changed

- `src/features/cost-breakdown/CostBreakdownPage.tsx`
- `src/features/cost-breakdown/components/CostBreakdownPopover.tsx`
- `src/features/cost-breakdown/components/ComparisonStatusOptions.tsx` (new)
- `src/features/cost-breakdown/components/status-drag-selection.ts` (new)
- `src/features/cost-breakdown/components/SnapshotComparisonCard.tsx`
- `src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx`
- `src/features/cost-breakdown/components/summary-table-styles.ts`
- `scripts/verify_cbd_summary_ux.ts`
- `scripts/verify_cbd_parameter_cost_effect.mjs`
- `docs/specs/COST_BREAKDOWN.md`
- This report. The unrelated audit file is excluded.

## 13. Desktop Browser Geometry Evidence

Actual populated Chromium render, dedicated dev server launched from the exact worktree at `http://127.0.0.1:5175/`. Loaded the repository's Complete Mock via existing Prepare Dataset UI. No real operational data was used. DOM rectangles and computed styles were measured; screenshots were inspected in the browser tool.

All rectangle tuples are `(x, y, width, height)` CSS pixels:

| Viewport | Panel | Outer | Header | Body viewport | Footer |
|---|---|---|---|---|---|
| 1920 x 920 | Cost | 270,99,683,176 | 271,100,681,28 | 271,128,681,114 | 271,242,681,32 |
| 1920 x 920 | WC | 961,99,683,176 | 962,100,681,28 | 962,128,681,114 | 962,242,681,32 |
| 1512 x 982 | Cost | 66,99,683,176 | 67,100,681,28 | 67,128,681,114 | 67,242,681,32 |
| 1512 x 982 | WC | 757,99,683,176 | 758,100,681,28 | 758,128,681,114 | 758,242,681,32 |
| 1440 x 900 | Cost | 33,99,680,176 | 34,100,678,28 | 34,128,678,114 | 34,242,678,32 |
| 1440 x 900 | WC | 721,99,680,176 | 722,100,678,28 | 722,128,678,114 | 722,242,678,32 |
| 1366 x 768 | Cost | 33,99,643,176 | 34,100,641,28 | 34,128,641,114 | 34,242,641,32 |
| 1366 x 768 | WC | 684,99,643,176 | 685,100,641,28 | 685,128,641,114 | 685,242,641,32 |

All four: panel width/height equality, header/body/footer height equality, 8px panel gap, document width equals viewport. Representative first body row: y128, height38px on both sides. **PASS**.

## 14. Cost/WC Header/Footer Exact Measurements

Compared actual computed style objects at all four desktop sizes: header cell/group, representative body label cell, footer cell/group matched on both sides. Footer text range top/bottom difference was 0px.

| Property | Cost | WC |
|---|---|---|
| Outer border / background / sizing | 1px solid rgb(203,213,225) / white / border-box | Same |
| Header height / label font | 28px / Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif | Same |
| Header size / weight / line-height | 11px / 600 / 16px | Same |
| Header vertical / horizontal padding | 6px / 8px; final percentage cell right16px | Same |
| Header background / bottom separator | rgb(30,41,59) / 1px rgb(51,65,85) | Same |
| Body row / size / line-height | 38px / 12px / 16px | Same |
| Body label font / weight | Inter system sans / 500 | Same |
| Body numeric font / padding | JetBrains Mono, Fira Code, Consolas, monospace / 6px 8px | Same |
| Footer height / label font | 32px / Inter system sans | Same |
| Footer size / weight / line-height | 12px / 600 / 16px | Same |
| Footer numeric font / alignment | JetBrains Mono, Fira Code, Consolas, monospace / right | Same |
| Footer vertical / horizontal padding | 6px / 8px; final percentage cell right16px | Same |
| Footer background / top border | rgb(241,245,249) / 2px rgb(203,213,225) | Same |
| Footer text range / vertical alignment | y251..267, height16px | y251..267, height16px |

Cost GAP retains its existing Full/Selected internal grid; WC has no Selected slot. **PASS** for equivalent roles and preserved Selected presentation.

## 15. WC Scrollbar Evidence

All four desktop sizes: body clientHeight114, scrollHeight190, y128..242; header ends at128 and footer starts at242. Native scrollbar width measured6px. WC client widths respectively675,675,672,635; body bounding widths681,681,678,641. Header/body/footer column content aligns to the body client width. Real wheel input changed WC scrollTop0 ->76; header remained y100/h28, footer y242/h32, Main scrollTop stayed0. **PASS**.

## 16. Status Browser Verification

**PASS:** hover opens; trigger-to-panel travel gap stays open; leave dismisses; click opens and pins; pinned panel survives pointer leave; outside click dismisses; four labels only; simple click toggles; drag across Changed/Added/Removed deselects all three leaving Unchanged; next gesture starting unchecked selects all three; last-selected click cannot clear it; Space toggles; Escape dismisses and restores trigger focus; Status drag labels have `user-select:none` and leave no browser text selection; only one Status/Sort panel exists; overview remains expanded. Tooltip is the shared Master Data component; the popup is below the trigger and remains unclipped.

**NOT VERIFIED:** leave and re-enter a previously crossed Status row during one held gesture; pointer cancellation/blur during a held gesture. Sequential drag gestures and release reset were observed, but are not substitutes for cancellation or re-entry. Helper idempotence/minimum-one checks passed.

## 17. Sort Browser Verification

**PASS:** one toolbar button with integrated visible Chevron; compact three-option popup with no title/footer, whole-trigger hover, trigger-to-panel glide, leave dismissal, click pin/unpin, ArrowDown opening/focus, Enter activation, Escape, outside-click dismissal, trigger-focus restoration, and current-mode indication. The popup opened 4px below the trigger without clipping; shared Tooltip appeared above it and did not overlap. Hovering the unselected low-to-high option produced `rgb(248,250,252)` background. Verified actual order for all three modes in both tables.

BOM High-to-Low: ADDED, A, USAGE, LOSS, B, REMOVED. Low-to-High: REMOVED, B, LOSS, USAGE, A, ADDED. Absolute: ADDED, REMOVED, A, USAGE, LOSS, B (all MAT- prefixed). Routing ordering was inspected independently for all modes, including signed negative gaps. Reapply evidence is in section22.

## 18. Collapse Browser Verification

**PASS:** boxed geometry/focus appearance; click hides only Cost/WC; Subheader/Candidate remain; Enter expands; Space collapses/expands; ARIA updates; blank Subheader click does nothing; BOM/RTG/ALL, Status, and Sort interactions do not collapse overview.

## 19. Sticky / Main Scroll Verification

At1440x900 Main rect `(0,49,1440,806)`, scrollHeight1129, clientHeight806, overflow-y:auto. Wheel input changed Main scrollTop0 ->323 while sticky shell remained y49/h243 and global Footer remained y855/h45. Candidate moved in normal flow (top -31), overflow-y:visible. Header/Footer are outside Main; document scrollTop0 and scrollHeight=clientHeight900. Scrollbar remains at Main's far-right edge. **PASS**.

## 20. Selected Regression Verification

At1440x900 selecting MAT-A left every full/selected slot x and width unchanged. Selected slots x522.546875/w49.46875; visible +4.20/0.00 values neutral rgb(100,116,139), no parentheses. Full Gap remains primary. WC has no Selected label/value. Selected header starts x543.5; +4.20 glyph start is approximately544.5, while numeric slot positions were preserved. Focused Selected boundary/lifecycle checks also passed. **PASS** for tested scope; this is AI verification, not human acceptance.

## 21. Candidate Drag / Group Drag / Undo / Redo Verification

Actual Chrome handle-to-row-cell drops were performed; synthetic DOM drag events were not used. Initial handle-to-handle attempts did not change order/history; retargeting the row's identity cell resolved the browser interaction.

- Single BOM: moved MAT-ADDED below MAT-A. Order became REMOVED,A,ADDED,USAGE,LOSS,B. One Undo restored original order and disabled Undo; Redo restored the moved order and disabled Redo. **PASS**, one drop = one action.
- Selected group: selected MAT-ADDED and MAT-REMOVED; dragged selected handle below MAT-LOSS. Order became A,USAGE,LOSS,ADDED,REMOVED,B. Both selected identities remained selected, in original relative order. One Undo/Redo reversed/reapplied the whole group. **PASS**.
- Shared timeline: after group BOM action A, moved Routing OP-ADDED below OP-REMOVED (action B). First Undo reversed only B; second reversed only A and disabled Undo. Redo reapplied A then B independently. **PASS**.
- Candidate reorder/domain/source modules were not edited. **PASS** for preservation plus executed flows.

## 22. Sort Reset Verification

With manual order changes present in both BOM and Routing, clicked the already-active `|Gap| High → Low` option. Both tables returned to their original absolute-gap order (BOM `MAT-ADDED, MAT-REMOVED, MAT-A, MAT-USAGE, MAT-LOSS, MAT-B`; RTG `OP-ADDED, OP-REMOVED, OP-MANNING, CUT-CURRENT-B, CUT-REF-B, CUT-REF-A, CUT-CURRENT-A, OP-20, OP-10, OP-21`). Undo and Redo were disabled; the old manual orders could not be restored. **PASS**. Sort-change/reset focused checks also passed.

## 23. Responsive Verification

| Viewport | Cost outer | WC outer | Result |
|---|---|---|---|
| 900 x900 | (25,151,844,176) | (25,335,844,176) | Stacked,8px gap, document width900 |
| 390 x844 | (21,151,342,182) | (21,341,342,182) | Stacked,8px gap, document width390 |

At390 each panel clientHeight=scrollHeight174: no panel vertical scrolling; local horizontal scrollbar accounts for extra6px outer height. Header/body/footer remain28/114/32. After the toolbar autoscrolled horizontally to reveal each trigger, Status trigger x262.6..370.9 and popup x252.8..380.8 (128 x 106px); Sort trigger x235.9..371 and popup x231.5..375.5 (144 x 82px). At900, Status trigger x583.6..691.9 and popup x573.8..701.8; Sort trigger x697.9..833 and popup x693.5..837.5. For both controls at390, 709, and900, popup center differed from trigger center by less than0.01px, top gap was4px, and the full popup stayed inside the viewport. Document width stayed equal to each viewport. Collapse works. Candidate remains available with table-local horizontal scrolling; global Header/Footer remain in the shell. **PASS** for executed responsive checks.

## 24. Automated Verification

All required verifiers exited0:

`verify_cbd_summary_ux.ts`, `verify_cbd_parameter_cost_effect.mjs`, `verify_snapshot_comparison_view.ts`, `verify_cbd_reorder_history.ts`, `verify_cost_breakdown_sort.ts`, `verify_cost_breakdown_view.ts`, `verify_selected_comparison_boundary.ts`, `verify_selected_comparison_lifecycle.ts`, `verify_row_drag_selection.ts`, `verify_work_center_comparison_view.ts`, `verify_global_header.ts`, `verify_master_data_ui_state.mjs`. All 12 passed when run sequentially; the two Vite-resolved scripts were run through Vite SSR. An initial parallel launch caused local Vite WebSocket contention and direct Node execution could not resolve extensionless TypeScript imports; the correct sequential/SSR rerun passed.

TypeScript scripts used `node --experimental-strip-types`; Work Center and Global Header used Vite SSR. `npx.cmd tsc --noEmit --pretty false`: exit0. Final `npm.cmd run build`: exit0,2047 modules,11.37s, includes tsc-b. `git diff --check`: exit0. Browser error log inspection returned no errors. Build retains existing ExcelJS browser-externalization warnings.

Regression tests first rejected the actual HEAD's divider contract (expected RED, exit1). Corrected final-contract checks then passed. These tests include executable Status select/deselect, repeated-intent idempotence, final-selected invariant, and compact four-option SSR markup checks.

## 25. Regression Check

Core formulas, snapshots, identity, Master Data, Simulation, AppLayout/global history, dependencies/lockfile, ItemizedComparisonTable, and CandidateFindingsTable were not modified. Existing filtering/sorting/reorder/Selected callbacks were retained and covered by the focused checks and browser flows above. No Selected-to-Simulation linkage was added. No reset/restore/stash/force push occurred. Audit file remained untracked/unstaged and its SHA256 remained `50111B8AD0A3AA8FB2ACCFF0604374857D041E2E6E6A97ECD5884A112482C67C`.

Separate baseline check: `npm audit --json` exited1, reporting9 existing dependency vulnerabilities (5high,4moderate,0critical). Dependency files were unchanged; remediation was outside this bounded UI pass. No zero-vulnerability or broader security-completion claim is made.

## 26. Documentation Alignment

Updated active COST_BREAKDOWN.md for independent boxes, shared background/gap, measured grid rhythm, WC body-only scrolling, boxed collapse, compact Status/drag, and single-button Status/Sort controls with integrated chevrons, shared Tooltip and Master Data timing, keyboard/focus/outside-click behavior, below-trigger placement, and same-option Reapply Sort reset. Stale active split-button descriptions/assertions were removed. CROSS_CUTTING.md and FINAL_LOGIC_SPEC.md needed no logic change. HANDOFF.md remains at its earlier checkpoint; this report records the current correction evidence and open verification limits.

## 27. Git Delivery

Origin fetch from the starting audit showed the branch and remote unchanged. Intended files were reviewed, staged diff was empty, protected audit preserved, and final diff check passed. The user later explicitly authorized a normal commit and push despite the listed browser checks; no force push or history rewrite is authorized. Equality of the original local/remote SHA was baseline equality, not delivery of these local changes.

## 28. Final Local SHA

`3cee546cfdf15b1deef378b44b7b73d1fec28c81` was the local HEAD at the original report checkpoint, before these corrections were committed.

## 29. Final Remote SHA

`origin/codex/cbd-candidate-integration`: `3cee546cfdf15b1deef378b44b7b73d1fec28c81` after the fetch at the original report checkpoint.

## 30. Closure Status

**CBD NOT CLOSED.** Layout, rendered parity, WC scrolling, tested Status/Sort/collapse flows, Selected stability, real Candidate reorder/history/reset, responsive checks, all 12 focused verifiers, TypeScript, build, and diff check passed. Status same-gesture row re-entry and mid-gesture cancellation/blur remain NOT VERIFIED. Git delivery was explicitly authorized despite these open checks. AI verification does not constitute human acceptance.

## 31. Remaining Limitations / Exact Resume Point

The remaining verification limits are the Status same-gesture row re-entry and pointer cancellation/blur cases. The browser API used here exposes one straight drag only, so it could not prove those behaviors. If closure is resumed, use a browser input mechanism with held-pointer waypoints to press Changed, cross Added, return to Changed, and release; confirm fixed selection intent and no second toggle. Exercise pointer cancellation/blur and verify a subsequent independent click/drag behaves normally. Preserve the protected audit and the separately reported baseline dependency risk.
