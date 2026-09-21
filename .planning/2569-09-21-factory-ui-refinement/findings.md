# Findings & Decisions

## User Intent

- The existing initial UI is considered attractive and does not look AI-generated.
- The user wants the app to be practical for factory use, not a visually overhauled AI dashboard.
- The safe interpretation is a targeted usability refinement that preserves the current visual identity and behavior.

## Current Active Path

```text
src/main.tsx
  → src/App.tsx
  → src/state/store.tsx
  → src/shared/layout/AppLayout.tsx
  → src/shared/layout/Navbar.tsx
  → src/features/*
```

The active Cost Breakdown route uses:

- `src/features/cost-breakdown/CostBreakdownPage.tsx`
- `src/features/cost-breakdown/components/ExecutiveKPICards.tsx`
- `src/features/cost-breakdown/components/SnapshotComparisonCard.tsx`
- `src/features/cost-breakdown/components/VarianceTreeCard.tsx`
- `src/features/cost-breakdown/components/BOMDetailedTable.tsx`
- `src/features/cost-breakdown/components/RoutingDetailedTable.tsx`
- `src/features/cost-breakdown/components/WorkCenterComparisonTable.tsx`

Legacy duplicate paths under `src/pages`, `src/components`, and `src/lib` are not imported by the active `src/App.tsx` path and will remain untouched.

## Runtime/UI Observations

- The current screen already has a strong operational structure: sticky header, product selector, route navigation, comparison KPIs, review warnings, variance tree, dense tables, and a bottom status bar.
- The dark header and white data panels are useful for a factory workbench and should be retained.
- The current visual language leans heavily on `font-mono`, uppercase labels, rounded cards, and console-style `SYSTEM ACTIVE` wording. These are the likely sources of the AI/demo/terminal feeling when used everywhere, not the overall layout itself.
- The screen is data-dense and should not be made more spacious or decorative. The primary improvement should be hierarchy and scanability.
- The existing comparison flow exposes real operational states such as missing Work Center rates and review counts. Those states should become easier to act on without changing their calculation or import semantics.

## Existing Project Direction

- `COSTBREAKDOWN_REDESIGN_CONCEPT_FOR_CODEX.md` already defines a factory-oriented Reference/Current snapshot concept.
- `COSTBREAKDOWN_REDESIGN_REVIEW.md` confirms the active path and warns against editing legacy duplicate paths during focused slices.
- Keep the existing `Reference` / `Current` terminology from the accepted snapshot work; do not rename it to Before/After in this UI slice.

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Preserve the current light data-surface plus dark header/footer composition | It is already useful for high-density factory review and is preferred by the user. |
| Limit the first pass to shared layout, navbar, and KPI presentation | These components affect all routes and can improve scanability without touching calculation behavior. |
| Treat warnings as operational states, not decorative alerts | Missing rates and review rows need clear text and contrast, not more visual effects. |
| Keep raw values and existing labels stable | Browser acceptance and existing users depend on current content and control names. |

## Verification Baseline

- Live browser screenshot and DOM inspection were performed on the active Comparison page.
- Worktree was clean before beginning this UI task.
- No code or product behavior has been changed in this UI task yet.
- Fresh verification will be run after each implementation slice; previous verification results will not be used as the only evidence for new UI claims.

## Risks

| Risk | Mitigation |
|------|------------|
| Shared CSS changes affect all routes | Verify every active route after the shared-shell slice before proceeding. |
| Reducing mono/uppercase styling harms numerical scanning | Keep tabular numeric values and use mono selectively for IDs/measurements. |
| Visual changes accidentally alter accessibility selectors | Preserve visible labels, button names, and semantic elements; run AX/keyboard smoke. |
| Screenshot tuning becomes subjective | Use the user's stated preference as the constraint and keep changes narrow/reversible. |
