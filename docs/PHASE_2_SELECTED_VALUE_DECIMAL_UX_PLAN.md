# Phase 2 — Selected Value / Decimal UX Execution Plan

**Status:** Round 1 is verified and closed by the current closeout; Round 2 is open; Rounds 3–5 have not started.
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
| Round 1 — Shared Foundation | Shared numeric source lifecycle, Header Value, SelectedNumber inspection primitive, exact model-value handling, and shared browser/runtime verification. | **CLOSED** | Shared focus/preview/pin model, source lifecycle, stale-writer guards, existing formatting/stepping/domain contracts, browser behavior, typecheck, build, and regression audit pass. Closure commit SHA is recorded in the current Handoff. |
| Round 2 — Master Data | Integrate the shared model into Master Data without changing its data, formulas, validation domains, dataset lifecycle, history, or spreadsheet semantics. Recover the known View-mode focus regression before accepting the early integration. | **OPEN — next** | Existing-focus read-only cells publish a read-only Header value without SelectedNumber hover/pin treatment; editable sources retain matching Header transfer; grid navigation, ranges, clipboard, layout, and existing field behavior pass the page audit and browser checks. |
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
- `76df692fce196d436a55f2e73be2bae5589e58ca` — Round 1 closure, `feat: close selected value shared foundation`, a direct child of `3ec9bbebebb01db65b3d8096082680a5e7b18aec`.

At the start of this closeout, local and freshly fetched `origin/feat/selected-value-ux` both pointed to `3ec9bbebebb01db65b3d8096082680a5e7b18aec`. The current dev server’s working directory was verified as the same worktree. Preserve later valid branch history; do not reset the branch to an earlier checkpoint.

## Round 2 recovery tasks and history rule

Round 2 remains open because the early implementation currently wraps Master Data View-mode numeric cells in `SelectedNumber`, although those cells already participate in the spreadsheet’s focus/keyboard navigation. That adds hover preview, persistent pin, and a second visual selection system to values that must use the existing focus interaction and publish a read-only Header value instead. The Round 1 closeout provides the shared capability only; it does not perform this page recovery.

When Round 2 begins:

- Classify every Master Data numeric source by its existing interaction: editable focus source, read-only focus source, or read-only value with no existing focus/inspection interaction. Use `SelectedNumber` only for the last category.
- Restore existing-focus read-only View cells to the focus-owned read-only Header lifecycle. Preserve grid focus and Enter/Shift+Enter navigation, row/range selection, clipboard, and existing field focus treatment without a second blue hover/pin frame.
- Audit editable sources, metadata, sizing dialogs, unavailable values, and source identities for matching Header transfer, original writer/domain/conversion/history behavior, blur, unmount, and dataset/page stale protection.
- Recheck the early Round 2 layout work for regressions while retaining valid accepted layout decisions and the `3ec9bbe` Header correction. Do not change formulas, business domains, calculations, dataset/comparison semantics, or history behavior.

**History restore rule:** use `git show` / `git diff` around `3b3880f` and `66f8b83` to identify the exact Master Data behavior introduced by the premature integration. Restore only the affected behavior from its actual pre-integration history when that is the correct source of truth, then reapply compatible finalized requirements. Do not reset the branch to `3b3880f`, revert all of `66f8b83`, discard later valid work, or revert `3ec9bbe`. No new branch, merge, rebase, or force-push is part of this plan.

## Boundaries

- Complete and close only one round at a time. Round 2 must be accepted before Round 3 starts; Round 3 must be accepted before Round 4 starts; Round 4 must be accepted before Round 5 starts.
- Do not change formulas, calculation logic, business domains, dataset lifecycle, comparison semantics, history semantics, or graph selection/geometry as part of numeric UX integration.
- Do not treat automated tests or code state as product-requirements authority. Browser evidence must exercise the actual UI for the round being closed.
- Keep known limits, failed checks, and deferred work explicit in the current Handoff. Do not report a later round as started or closed before its gate passes.

## Next action

**Close Round 2 — Master Data recovery** after this Round 1 closeout is committed and pushed. Begin by reviewing the concrete View-mode focus regression against the finalized shared contract and the actual pre-integration history. Do not start Cost Breakdown or Simulation integration until the Master Data round is accepted and closed.
