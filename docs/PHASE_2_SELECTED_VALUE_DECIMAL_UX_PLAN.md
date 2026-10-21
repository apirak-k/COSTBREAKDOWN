# Phase 2 — Selected Value / Decimal UX Execution Plan

**Status:** Round 1 is CLOSED; Round 2 — Master Data is CLOSED; Round 3 — Cost Breakdown is NOT STARTED / NEXT; Rounds 4–5 are NOT STARTED.
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
| Round 2 — Master Data | Integrate the shared model into Master Data without changing its data, formulas, validation domains, dataset lifecycle, history, or spreadsheet semantics. Recover the known View-mode focus regression before accepting the early integration. | **CLOSED** | Native grid focus owns View numeric values and publishes the read-only Header value; neutral hover does not preview; editable source/Header transfer, keyboard navigation, range, clipboard, layout, and field behavior pass dedicated and Chrome browser checks. |
| Round 3 — Cost Breakdown | Integrate eligible Cost Breakdown values and interactions with the shared Header/source model, retaining the finalized Candidate, detail, tooltip, row, ordering, and comparison behavior. | **NOT STARTED** | All scoped CBD interactions and responsive behavior pass page-specific verification; no calculation or comparison semantics change. |
| Round 4 — Simulation | Integrate eligible Simulation Result, Economic, and Break-even numeric interactions while keeping the existing role/basis ownership, editable domains, economics, histories, reset/send behavior, and graph interaction contracts. | **NOT STARTED** | Page-specific and cross-state checks pass; graphs retain their existing geometry and do not gain numeric selection behavior. |
| Round 5 — Final Cross-page Regression | Run the final shared + Master Data + Cost Breakdown + Simulation regression and verify that state does not leak across pages/scopes. | **NOT STARTED** | Rounds 1–4 have each passed their gate; full cross-page regression, browser checks, build, and diff review pass. |

## Round 1 shared interaction contract

The provider maintains three distinct, temporary states:

- **Focus-owned active source:** existing editable sources publish their full value and original writer/domain to an editable Header. Source ↔ matching Header editor focus transfer keeps the same identity. Leaving both clears the focus state. Existing-focus read-only sources publish a read-only Header value with no spinner and clear it on blur.
- **Transient preview:** a no-focus read-only `SelectedNumber` previews its full value on hover and clears on pointer leave. It cannot displace a focus-owned source.
- **Pinned read-only value:** activating an eligible `SelectedNumber` pins it. A later pin replaces it. A preview temporarily outranks a pin, then leaving the preview restores the pin.

Header priority is **focus-owned source → hover preview → pinned value → `Value —`**. A value with an existing focus or inspection interaction does not need a `SelectedNumber` wrapper. Header styling/placement, adaptive body formatting, source conversion, field domains, formulas, and history/lifecycle behavior stay as already finalized in their canonical specs.

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

Round 2 is CLOSED. View-mode numeric cells that already participate in spreadsheet focus/navigation no longer use `SelectedNumber`. Their historical native `<span>` grid-cell focus targets remain the focus owner and now publish the read-only value through the Round 1 provider. Hover stays neutral and does not change Header; native focus publishes the full Header value without a spinner. Real browser checks cover pointer leave, Enter / Shift+Enter, a contiguous Edit range and copied clipboard values, unavailable blocker cells, and responsive table geometry.

The exact recovery base was inspected at `3b3880f79891293662aeb5e622d11941bcf3ea64`. The original `data-grid-cell`, row/field identity, `viewCellTabIndex`, native display element, blocker child, percentage suffix, and table-local grid target structure were retained. The historical compact field classes were restored: BOM Usage `max-w-20`, BOM Price `max-w-24`, Work Center Labor/Burden `max-w-24`, Routing Manning `max-w-20`, Routing Capacity `max-w-24`, and the Loss/Yield percentage shell `w-28`. The later finalized right-side axis was intentionally retained by using `ml-auto` instead of the historical centering; the `3ec9bbe` Header correction, Round 1 source model, and adaptive body presentation remain intact.

- Editable sources remain focus-owned and Header-editable, with their original source writer, domain, percentage conversion, and history path. Metadata Selling Price / SG&A retain `SelectedNumber` in View because they have no existing grid focus target. Dataset Sizing stays on the existing shared Header editor.
- No formulas, business-domain validation, calculations, dataset/comparison lifecycle, history semantics, or spreadsheet business rules changed. UOM / Selling Price / SG&A remains 20 / 45 / 35.
- Acceptance evidence: `node scripts/verify_master_data_ui_state.mjs`; live isolated Chrome on the verified Vite server at 1440 / 1024 / 768 / 390 / 320px; compact headers/body axis delta 1px; 112px percentage shell with 4px suffix gap; narrow table-local scrolling with no page overflow. Browser verifier totals are recorded in the Handoff.

Round 2 record:

- Starting SHA: `010c3d3fb6c3b2251bc7b0d783401df20937b1a6` (local and freshly fetched remote matched; worktree clean).
- Historical recovery source: `3b3880f79891293662aeb5e622d11941bcf3ea64`.
- Header correction preserved: `3ec9bbebebb01db65b3d8096082680a5e7b18aec`.
- Round 2 closure implementation SHA: `b89c283522e37a9d9e59535a81e3e0a3c8016053` (`fix: close master data selected value round`), a direct child of the starting SHA above. The adjacent documentation receipt records this exact SHA; no Round 1 history was rewritten.

**History restore rule:** use `git show` / `git diff` around `3b3880f` and `66f8b83` to identify the exact Master Data behavior introduced by the premature integration. Restore only the affected behavior from its actual pre-integration history when that is the correct source of truth, then reapply compatible finalized requirements. Do not reset the branch to `3b3880f`, revert all of `66f8b83`, discard later valid work, or revert `3ec9bbe`. No new branch, merge, rebase, or force-push is part of this plan.

## Boundaries

- Complete and close only one round at a time. Round 2 must be accepted before Round 3 starts; Round 3 must be accepted before Round 4 starts; Round 4 must be accepted before Round 5 starts.
- Do not change formulas, calculation logic, business domains, dataset lifecycle, comparison semantics, history semantics, or graph selection/geometry as part of numeric UX integration.
- Do not treat automated tests or code state as product-requirements authority. Browser evidence must exercise the actual UI for the round being closed.
- Keep known limits, failed checks, and deferred work explicit in the current Handoff. Do not report a later round as started or closed before its gate passes.

## Next action

**Round 3 — Cost Breakdown is NEXT and NOT STARTED.** It requires a separate explicit task and its own acceptance gate. Do not start Round 3 or Round 4 as part of this Round 2 closeout.
