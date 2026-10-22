# Phase 2 — Selected Value / Decimal UX Execution Plan

**Status:** Round 1 is CLOSED; Round 2 — Master Data is CLOSED after final UX polish that followed the already-accepted previous correction; Round 3 — Cost Breakdown is CLOSED after the targeted correction and re-verification below; the original five-item Round 4A — Simulation UI Polish is CLOSED; the latest pre-Round-4B Simulation input / cross-system expandable-row correction is IMPLEMENTED / AWAITING EXTERNAL USER AUDIT; Global authoritative-full-value-on-edit is IMPLEMENTED / EXTERNALLY ACCEPTED; Round 4B — Simulation Selected Value / Decimal UX is NOT STARTED / BLOCKED UNTIL FRAME ACCEPTANCE; Global direct-edit blue-value indicator is NOT STARTED; Round 5 is NOT STARTED.
**Execution branch:** `feat/selected-value-ux`
**Repository:** `https://github.com/apirak-k/COSTBREAKDOWN`

This is an operational roadmap. Product behavior remains governed by the latest explicit finalized user decisions, [`FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md), and the relevant canonical page/shared specifications. This plan and [`HANDOFF.md`](../HANDOFF.md) record execution status; they do not override those requirements.

## Fixed execution order and gate

Phase 2 contains exactly these five execution rounds, in this order:

1. **Round 1 — Shared Foundation**
2. **Round 2 — Master Data**
3. **Round 3 — Cost Breakdown**
4. **Round 4 — Simulation**
5. **Round 5 — Final Cross-page Regression**

Every round follows the same gate:

**IMPLEMENT → VERIFY / AUDIT → ACCEPT / CLOSE → ONLY THEN START NEXT ROUND**

Do not overlap implementation rounds or add numbered sub-phases. A failing acceptance check keeps that round open and blocks the next round.

## Round status and scope

| Round | Scope | Status | Close condition |
|---|---|---|---|
| Round 1 — Shared Foundation | Shared numeric source lifecycle, Header Value, SelectedNumber inspection primitive, exact model-value handling, and shared browser/runtime verification. | **CLOSED** | Shared focus/preview/pin model, source lifecycle, stale-writer guards, existing formatting/stepping/domain contracts, and runtime checks pass. Unpinned pointer hover has a frame/ring with no added fill and unchanged geometry; keyboard focus has a clear ring without the pinned fill; pin remains stronger. Final correction commit is recorded in the current Handoff. |
| Round 2 — Master Data | Integrate the shared model into Master Data without changing its data, formulas, validation domains, dataset lifecycle, history, or spreadsheet semantics. Preserve the accepted native View-mode focus recovery and apply the later finalized hover/Header precision contract and final geometry polish. | **CLOSED** | Native grid focus owns View numeric values; source Preview uses a cancellable 350ms dwell; Focus/Pin remains anchored; only focused editable sources own Header writers; Header displays at most 8 decimals and keeps stable numeric / `%` / spinner regions and direct-interaction affordance; actual Chrome, regression, source audit, build, and diff checks pass. |
| Round 3 — Cost Breakdown | Integrate eligible Cost Breakdown values and interactions with the shared Header/source model, retaining the finalized Candidate, detail, tooltip, row, ordering, and comparison behavior. | **CLOSED** | Shared no-focus `SelectedNumber` is transparent at rest, `#E9EEF4` on direct hover, and `blue-100` when pinned; Candidate row hover is independent. CHANGED-row cell whitespace expands/collapses while actual numeric, `#`, and reorder controls keep their own action. Targeted Chrome, Round 2 / Round 3 browser gates, build, source audit, and diff checks pass; no calculation or comparison semantics change. Implementation: `9536da7edec07d29e808bec8af8c45a16e8be621`. |
| Round 4 — Simulation | 4A: the original five desktop UI polish items are closed. The latest targeted editable-input and cross-system expandable-row correction remains inside the Round 4 gate, not a new round. 4B: integrate eligible Simulation Result, Economic, and Break-even numeric interactions while retaining role/basis ownership, editable domains, economics, histories, reset/send behavior, and graph interaction contracts. | **Original five 4A items CLOSED; pre-4B correction IMPLEMENTED / AWAITING EXTERNAL USER AUDIT; 4B NOT STARTED / BLOCKED UNTIL FRAME ACCEPTANCE** | The latest isolated Chrome Simulation verifier passed 160/160 at 1440 / 1024 / 768 / 390 / 320px, including all six fields' inside/outside click-focus probes, historical Focus styling, unchanged axes/dimensions, and the corrected row separators. CBD passed 277/277 and Master Data passed 151/151; requested screenshots were visually inspected. Simulation regression and production build exited 0; both browser verifier syntax checks and diff checks passed. The external acceptance gate remains open. See the current [HANDOFF](../HANDOFF.md#pre-round-4b-simulation-input--expandable-row-correction--2026-10-22) for exact evidence and known limits. After acceptance, follow the next-work order below before starting 4B. For 4B, page-specific and cross-state checks must pass without adding numeric-selection behavior to graphs. |
| Round 5 — Final Cross-page Regression | Run the final shared + Master Data + Cost Breakdown + Simulation regression and verify that state does not leak across pages/scopes. | **NOT STARTED** | Rounds 1–3, all of Round 4 (4A and 4B), and both preceding global numeric UX items have passed their audit/acceptance gates; full cross-page regression, browser checks, build, and diff review pass. |

## Agreed next-work order

These are workflow steps inside the existing five-round Phase 2 plan, not new numbered rounds. Follow this order **after the current pre-Round-4B correction is externally accepted**. Future items marked NOT STARTED have not been implemented in the correction.

1. GLOBAL authoritative-full-value-on-edit correction — implemented in the separate prior correction.
2. Audit and accept that global numeric correction — externally accepted.
3. Implement Round 4B — Simulation Selected Value / Decimal UX.
4. Audit / accept and close Round 4.
5. Implement the GLOBAL direct-edit blue-value indicator.
6. Audit and accept that global UX item.
7. Run Round 5 — Final Cross-page Regression.
8. After Phase 2: Excel validation → real-world usage test → portable distribution.

Current statuses: pre-Round-4B correction **IMPLEMENTED / AWAITING EXTERNAL USER AUDIT**; Global authoritative-full-value-on-edit **IMPLEMENTED / EXTERNALLY ACCEPTED**; Round 4B **NOT STARTED / BLOCKED UNTIL FRAME ACCEPTANCE**; Global direct-edit blue-value indicator **NOT STARTED**; Round 5 **NOT STARTED**.

## Numeric Display-Fit narrow correction — 2026-10-22

**Status: IMPLEMENTED / AWAITING EXTERNAL USER AUDIT.** The latest user correction supersedes the prior display-fit geometry claims: the 16% identity / 9% Status / 15.5% parameter allocation failed visual audit. Preserve accepted compact formatting and full precision; hydrate committed decimal focus/step drafts with at least two fractional digits, retain the ordinary decimal axis while text fits, and allow native internal scrolling for longer drafts. Fixed frames must sit comfortably under their own headers, leave Status readable, and keep percentage suffixes separated and stationary. Prefer scientific presentation over extra ordinary capacity that crowds a neighbor. Targeted rendered tests must measure decimal X, frame containment, Status gutters, and suffix separation at desktop/mobile widths. The current correction evidence and final implementation geometry are recorded in [HANDOFF](../HANDOFF.md). Round 4B and the direct-edit blue indicator remain NOT STARTED.

## Current pre-Round-4B correction checkpoint — 2026-10-22

Starting local and freshly fetched remote SHA: `6dc0098b921a3f115d54413acfb6fa59fa1ac94a`. Implementation commit: `bd30cd3628738733a51b91aee796fc094ae5aca4`. It preserves the historical 2px inset blue Simulation Focus treatment, aligns the native input click/focus region to the visible frame despite Chrome's fractional hit-test overshoot, and applies the agreed exact separator contract to CBD and Simulation expanded rows. Actual Chrome results: Simulation **160/160**, CBD **277/277**, Master Data **151/151**; Simulation regression and production build exited 0. The Simulation, CBD, and Master Data screenshot evidence and browser-cleanup note are in the current HANDOFF. This correction remains **IMPLEMENTED / AWAITING EXTERNAL USER AUDIT**; it is not accepted or closed.

## Round 1 shared interaction contract

The provider maintains three distinct, temporary states:

- **Focus-owned active source:** existing editable sources publish their value and original writer/domain to an editable Header. Source ↔ matching Header editor focus transfer keeps the same identity. Leaving both clears the Focus anchor. Existing-focus read-only sources anchor a read-only Header value with no spinner and clear it on blur.
- **Transient preview:** a numeric source with native focus or edit behavior, or a no-focus read-only `SelectedNumber`, previews its value read-only on hover and clears on pointer leave. Preview is non-owning and temporarily overrides the anchor. Hovering the already-focused same source leaves its editable Header unchanged.
- **Pinned read-only value:** activating an eligible no-focus `SelectedNumber` pins it. A later pin replaces it. A preview temporarily outranks a Focus/Pin anchor, then leaving the preview restores that anchor.

Header priority is **hover preview → anchored Focus/Pin → `Value —`**. Editable previews are read-only; only actual Focus owns a writer. Master Data native-focus cells keep gray hover and their existing grid target. No-focus `SelectedNumber` values use an immediate content-hugging light hover fill and a stronger content-hugging Pin fill without a pointer ring or geometry change; the Header Preview still waits for 350ms, keyboard focus keeps its ring, same-value activation unpins, and safe blank/background click-away discards Pin without intercepting real controls. Body/table formatting remains 2 places → 4 when a nonzero value would otherwise show zero → scientific notation if still zero. Header formatting is presentation-only, capped at 8 decimals with trailing-zero and floating-noise cleanup plus a scientific fallback for tiny nonzero values. Stored/calculated values and source conversions remain unchanged.

## History and current checkpoint

Record chronology accurately; do not reinterpret the commits as separate roadmap rounds:

- `3b3880f79891293662aeb5e622d11941bcf3ea64` — initial shared foundation, `feat: add selected value and decimal UX foundation`.
- `66f8b83f21a4b6590fe974b7935ae97569ac7cef` — Master Data integration was started before Round 1 had passed its close gate. This is the start of the still-open Round 2 work, not an accepted/closed round.
- `3ec9bbebebb01db65b3d8096082680a5e7b18aec` — Header interaction/styling correction. It is preserved as a correction within this Phase 2 work, not a separate round.
- `76df692fce196d436a55f2e73be2bae5589e58ca` — first Round 1 closure implementation, `feat: close selected value shared foundation`, a direct child of `3ec9bbebebb01db65b3d8096082680a5e7b18aec`.
- `4b841c4a8198d996bee1a0a785c7518756a7620b` — documentation receipt for that closure attempt; final visual acceptance was still open.
- `fix: finalize selected number hover contract` — final Round 1 acceptance correction before Round 2; its full SHA is in the previous delivery report.

The Round 1 final acceptance correction started from a clean worktree where local and freshly fetched `origin/feat/selected-value-ux` both pointed to `4b841c4a8198d996bee1a0a785c7518756a7620b`; its closed final HEAD is `010c3d3fb6c3b2251bc7b0d783401df20937b1a6`. Round 2 started from that same `010c3d3...` HEAD after a fresh fetch. Its implementation/closure commit and documentation receipt are recorded in the current Handoff. Dev server PID `96264` on port 5173 was confirmed to serve this worktree. Preserve all earlier branch history; do not reset to an earlier checkpoint.

## Round 2 recovery result and history rule

The previous implementation at `b89c283522e37a9d9e59535a81e3e0a3c8016053` correctly closed Round 2 against the requirements that existed then: View-mode numeric cells retained their historical native `<span>` grid-cell focus targets, focus published read-only Header values, and spreadsheet/grid behaviors passed. After that close, hover-preview priority and bounded Header presentation precision were finalized. This post-close correction preserves the valid `b89c283` work and is now CLOSED after its separate acceptance gate passed.

The exact recovery base was inspected at `3b3880f79891293662aeb5e622d11941bcf3ea64`. The original `data-grid-cell`, row/field identity, `viewCellTabIndex`, native display element, blocker child, percentage suffix, and table-local grid target structure were retained. The historical compact field classes were restored: BOM Usage `max-w-20`, BOM Price `max-w-24`, Work Center Labor/Burden `max-w-24`, Routing Manning `max-w-20`, Routing Capacity `max-w-24`, and the Loss/Yield percentage shell `w-28`. The later finalized right-side axis was intentionally retained by using `ml-auto` instead of the historical centering; the `3ec9bbe` Header correction, Round 1 source model, and adaptive body presentation remain intact.

- Editable sources remain focus-owned and Header-editable, with their original source writer, domain, percentage conversion, and history path. Metadata Selling Price / SG&A retain `SelectedNumber` in View because they have no existing grid focus target. Dataset Sizing stays on the existing shared Header editor.
- No formulas, business-domain validation, calculations, dataset/comparison lifecycle, history semantics, or spreadsheet business rules changed. UOM / Selling Price / SG&A remains 20 / 45 / 35.
- **Root cause:** the provider resolved focused source before preview and rejected editable-source previews; the active Master Data editable and native-focus value wrappers had no pointer preview handlers. The writer guard also followed the displayed selection, and Header blur could clear the anchor when a different preview replaced the Header editor. The correction moves display priority to preview while keeping writer ownership tied to the actual focused anchor and preserving that anchor across preview-driven unmount.
- **Accepted behavior:** Header priority is hover preview → anchored Focus/Pin → `Value —`. Preview is temporary, read-only, and non-owning; only Focus owns editable writers. Same-source hover preserves the editable Header. Master Data native View cells retain gray hover and native grid focus; metadata `SelectedNumber` retains its separate blue ring/pin treatment.
- **Presentation:** body/table values remain on the existing 2 → 4 → scientific fallback. Header shows at most 8 decimals, trims trailing zeroes, cleans floating noise, and uses scientific notation for tiny nonzero values. This does not change editable drafts, source conversion, stored precision, or calculations. Header width is bounded from 80px to 192px with a 17vw preferred size; the typical `-123.12345678` fits at 1440 / 1024 / 768px and scrolls inside the value output at 390 / 320px without page overflow.
- **Browser acceptance:** `verify_numeric_input_browser.mjs` in isolated Chrome typed `12.3456789` in Master Data, Simulation, Business, and Economic; each retained the model value and displayed `12.35` after blur. `verify_master_data_selected_value.mjs` passed 147/147 in isolated Chrome, including native View hover/leave/focus/restore, Edit hover preview, BOM Loss input `20.000000000000004` → reselected and previewed Header `20 %`, no writer/focus transfer on hover, and viewports 1440 / 1024 / 768 / 390 / 320px.
- **Acceptance checks:** shared numeric verifier, Master Data UI-state, numeric integrity, global compact overlays, page navigation persistence, Simulation regression, spreadsheet batch, Dataset Sizing / Clone / toolbar / quality navigation / history / no-op / preservation / row order / Clear / Custom / Clone readiness / rename verifiers, TypeScript, production build, `git diff --check`, and browser script syntax checks pass. Simulation regression prints existing nested WebSocket port 24678-in-use warnings and exits 0. Build prints the existing ExcelJS/fast-csv externalization and >500 kB chunk warnings. `npm audit --audit-level=high` remains exit 1 with 10 dependency advisories (6 high, 4 moderate, 0 critical); dependency and lockfiles were not changed.
- **[Unverified]** the browser harness does not expose raw stored Loss fraction for direct inspection; the real edit/reselect/Edit/View path exercises the fraction `/ 100` writer and `* 100` reader, and those conversion callsites are unchanged. Firefox/Safari/touch/screen-reader behavior is outside the Chrome run.
- The correction changes only shared preview/ownership, Master Data source hover hooks, Header presentation/width, tests, and these requirements/specification records. It preserves the prior keyboard/range/clipboard/history/data-domain behavior and does not implement Cost Breakdown Round 3 or Simulation Round 4.

Round 2 record:

- Starting SHA: `010c3d3fb6c3b2251bc7b0d783401df20937b1a6` (local and freshly fetched remote matched; worktree clean).
- Historical recovery source: `3b3880f79891293662aeb5e622d11941bcf3ea64`.
- Header correction preserved: `3ec9bbebebb01db65b3d8096082680a5e7b18aec`.
- Round 2 closure implementation SHA: `b89c283522e37a9d9e59535a81e3e0a3c8016053` (`fix: close master data selected value round`), a direct child of the starting SHA above. The adjacent documentation receipt records this exact SHA; no Round 1 history was rewritten.
- Post-close finalized correction started from local and freshly fetched remote SHA `4df905927ee9237a5e7a9e335e1bee9f8ce73825`; both matched and the worktree was clean before edits. Its implementation is `1c7f18092c5989f05a7eef371beef95bee083f44` (`fix: finalize master data hover preview and header precision`), a direct child of that base. This correction accepts only the subsequently finalized hover-priority and Header-presentation requirements; it preserves the valid `b89c283` work.

**History restore rule:** use `git show` / `git diff` around `3b3880f` and `66f8b83` to identify the exact Master Data behavior introduced by the premature integration. Restore only the affected behavior from its actual pre-integration history when that is the correct source of truth, then reapply compatible finalized requirements. Do not reset the branch to `3b3880f`, revert all of `66f8b83`, discard later valid work, or revert `3ec9bbe`. No new branch, merge, rebase, or force-push is part of this plan.

## Final polish after prior Round 2 acceptance — 2026-10-21

The prior Master Data Round 2 correction already passed its requested acceptance gate. This final polish was added afterward to capture the separately finalized source-hover dwell and stable Header presentation; it does not reinterpret or invalidate the previous acceptance.

- Source Hover Preview now activates after exactly 350ms. Pointer leave before activation cancels the single pending target; after activation, pointer leave clears Preview promptly and restores the existing Focus/Pin anchor or `Value —`. A newer source, source cleanup/unmount, focus/pin action, provider scope change, and provider unmount cancel pending work; the callback checks both pending-target identity and current scope before activation.
- Header Value reserves a right-aligned numeric region followed by a fixed 10px `%` slot and 12px spinner slot. The global area uses `clamp(96px, 28vw, 192px)` behavior. Empty and read-only states reserve the same geometry without interactive controls. Editable anchors stay calm away from Header; direct Header hover reveals the subtle boundary and real spinner, while actual focus retains its clear focus treatment. Source hover does not flash an editable frame. Existing read-only Preview remains non-owning and only actual editable Focus owns the writer.
- No formulas, domain validation, conversion, history semantics, body formatting, Header precision, stored/calculated precision, or later-round behavior changed. No Cost Breakdown Round 3 or Simulation Round 4 implementation was added.
- **Starting checkpoint:** local branch and freshly fetched `origin/feat/selected-value-ux` both matched `ae304f6f7a0d289e2e1ba77e49d3dc5e149efd1c`; no remote divergence was found. Implementation commit: `2fcf86857bce76927a7bb8312057069d3b2cf4bf` (`fix: stabilize selected value hover and header layout`), a direct child of the starting checkpoint.
- **Actual Chrome:** `verify_numeric_input_browser.mjs` passed with Master Data, Simulation, Business, and Economic inputs each accepting `12.3456789`. It also passed dwell, cancellation, anchor restoration, stale-target/source-unmount/scope-change checks and Header geometry/affordance checks at 1440, 1024, 768, 390, and 320px. `verify_master_data_selected_value.mjs` passed **151 / 151** in isolated Chrome at the same widths, including fast pass not previewing, delayed Preview, Focus A restoration, editable non-owning Preview, and native read-only View behavior.
- **Regression/build:** shared numeric input, numeric integrity, Master Data UI-state, spreadsheet batch, Dataset Sizing/Clone, toolbar/Prepare, quality navigation, edit history, sizing no-op/preservation, row order, Clear, Custom, clone readiness, rename/empty-edit, Handoff, compact overlay, navigation persistence, Simulation regression, TypeScript, production build, browser-script syntax, and `git diff --check` passed. Simulation regression exits 0 with the existing nested Vite SSR WebSocket port `24678` in-use warning. Build passes with the existing ExcelJS / fast-csv browser externalization warnings and the main chunk advisory at 558.62 kB (>500 kB).
- **[Unverified]** Firefox, Safari, touch hardware, and screen-reader behavior were not tested. The app harness does not expose the raw stored BOM Loss fraction for direct browser inspection; its unchanged edit/reselect/read path remains covered only through existing application behavior.

## Previous Round 3 closure checkpoint — 2026-10-22

The closure below records the state before a later user-requested targeted correction pass. Its results and commit remain historical; the current Round 3 state is recorded in the following section.

- **Status:** Round 1 CLOSED; Round 2 — Master Data CLOSED; Round 3 — Cost Breakdown CLOSED; Round 4 — Simulation NOT STARTED / NEXT; Round 5 NOT STARTED.
- **Starting checkpoint:** local `feat/selected-value-ux` and freshly fetched `origin/feat/selected-value-ux` both matched `fe0bb59280bbc739d21218672846a1c68ba536d2`. No divergence or unrelated worktree changes were present in the target checkout `/Users/bubu/COSTBREAKDOWN-ref-current-custom-flow-redesign`.
- **Implementation:** commit `a770d7ee12d0022a195ee8458f02b35cb476de41` (`fix: polish selected value and cost breakdown interactions`). It preserves the already-valid Round 3 implementation at `fe0bb592...` and makes only the finalized Candidate chevron, shared no-focus SelectedNumber visual, and Pin dismissal corrections.
- **SelectedNumber:** the inner visual wraps only the rendered numeric content, so short and long values receive content-sized hover/Pin fills without a full-cell background or geometry movement. Pointer hover is immediate, no pointer ring is added, and Header Preview still uses the shared 350ms dwell. Pin has a stronger fill; selecting the same value again or clicking blank/background space clears it. Real controls preserve their behavior and active Pin.
- **Candidate chevron:** only a CHANGED row owns expansion and its `aria-expanded` state; eligible row areas and Enter / Space toggle it. The chevron is decorative and has no separate control, focus target, tooltip/title, hover box, or accessibility entry. `#`, numeric values, and reorder remain excluded; ADDED / REMOVED do not expand.
- **Actual Chrome:** `node scripts/verify_cbd_selected_value_browser.mjs` passed **257 / 257** in isolated Chrome at 1440 / 1024 / 768 / 390 / 320px. It covered Master Data Selling Price and SG&A, CBD summary values, Candidate values, expanded BOM / Routing details, immediate hover, 350ms Preview, leave/anchor restore, Pin/move/same-value unpin/blank-area dismissal, real controls, Candidate row keyboard/click/disclosure, numeric/#/reorder exclusions, actual drag-and-drop, content width, alignment, page overflow, and local horizontal scrolling. No browser exceptions, console errors, or warnings were recorded. `node scripts/verify_master_data_selected_value.mjs` passed **151 / 151** at the same viewports. `node scripts/verify_numeric_input_browser.mjs` passed actual entry of `12.3456789` in Master Data, Simulation, Business, and Economic inputs.
- **Regression/build:** `node scripts/verify_numeric_input.mjs`; `scripts/verify_selected_comparison_boundary.ts`, `scripts/verify_selected_comparison_lifecycle.ts`, and `scripts/verify_numeric_integrity.ts` loaded through Vite SSR; `scripts/verify_cbd_summary_ux.ts` within `node scripts/verify_simulation_regression.mjs`; `npm run build` (`tsc -b && vite build`); `node --check scripts/verify_cbd_selected_value_browser.mjs`; `node --check scripts/verify_numeric_input_browser.mjs`; and `git diff --check` passed. Simulation regression prints existing Vite SSR WebSocket port `24678` in-use warnings but exits 0. Production build prints existing `fs` / `crypto` browser-externalization notices and the 564.64 kB main-chunk size advisory, and exits 0. No dependencies or lockfiles changed; `npm audit` was not treated as a gate.
- **Scope audit:** active no-focus callers are Master Data Selling Price / SG&A and Cost Breakdown summary, Candidate, and detail values. Simulation has no active `SelectedNumber` callers. No Round 4 or Round 5 implementation, formulas, business domains, calculations, comparison semantics, data/history semantics, dependencies, merge, rebase, or force-push were included.
- **[Unverified]** Firefox, Safari, physical touch hardware, and screen-reader behavior were not tested.
- **Implementation files:** `src/shared/ui/selected-value.tsx`, `src/features/master-data/components/MasterDataNumericValue.tsx`, `src/features/cost-breakdown/components/BOMDetailedTable.tsx`, `src/features/cost-breakdown/components/CandidateFindingsTable.tsx`, `src/features/cost-breakdown/components/RoutingDetailedTable.tsx`, `src/features/cost-breakdown/components/SnapshotComparisonCard.tsx`, `src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx`, `scripts/verify_cbd_selected_value_browser.mjs`, `scripts/verify_cbd_summary_ux.ts`, and `scripts/verify_numeric_input_browser.mjs`.
- **Closure documentation files:** `docs/specs/CROSS_CUTTING.md`, `docs/specs/COST_BREAKDOWN.md`, `docs/specs/MASTER_DATA.md`, `docs/specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md`, `docs/REQUIREMENTS_INDEX.md`, this plan, and `HANDOFF.md`.

## Round 3 targeted correction and reclosure — 2026-10-22

- **Status:** Round 1 CLOSED; Round 2 — Master Data CLOSED; Round 3 — Cost Breakdown CLOSED; Round 4 — Simulation NOT STARTED / NEXT; Round 5 NOT STARTED.
- **Starting checkpoint:** freshly fetched `origin/feat/selected-value-ux` and local `HEAD` both matched `5a2ec42d456bc3c9ebece35ba162ea89b5c902de`; the target worktree was clean before this correction.
- **Implementation:** `9536da7edec07d29e808bec8af8c45a16e8be621` (`fix: correct selected value interaction boundaries`), a direct child of the starting checkpoint.
- **Verification:** isolated Chrome Round 3 verifier **271/271** at 1440 / 1024 / 768 / 390 / 320px, including the ADDED / REMOVED / UNCHANGED non-expandable checks; Round 2 Master Data verifier **151/151** at the same viewport set; numeric-input and numeric-integrity checks; page-navigation persistence and Simulation regression suites; `npm run build`, browser-script syntax check, and `git diff --check` pass. Simulation regression printed existing Vite SSR WebSocket port-in-use notices but exited successfully. The full evidence is in the current `HANDOFF.md` section.
- Only the requested Candidate click boundaries and shared SelectedNumber hover scope/color changed. No formulas, business logic, numeric domains, stored/calculation precision, Round 4 implementation, merge, rebase, or force-push are included.

## Boundaries

- Complete and close only one round at a time. Round 2 must be accepted before Round 3 starts; Round 3 must be accepted before Round 4 starts; Round 4 must be accepted before Round 5 starts.
- Do not change formulas, calculation logic, business domains, dataset lifecycle, comparison semantics, history semantics, or graph selection/geometry as part of numeric UX integration.
- Do not treat automated tests or code state as product-requirements authority. Browser evidence must exercise the actual UI for the round being closed.
- Keep known limits, failed checks, and deferred work explicit in the current Handoff. Do not report a later round as started or closed before its gate passes.

## Next action

**Next:** complete the external audit and acceptance of the pre-Round-4B correction, then follow the agreed next-work order above. Round 4B is NOT STARTED and blocked until frame acceptance; Round 5 is NOT STARTED. The original five Round 4A UI polish items and Round 3 are CLOSED. Do not begin Round 5 until its preceding work and acceptance gates are complete.
