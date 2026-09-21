# Findings & Decisions

## User Intent (historical baseline)

- The existing initial UI is considered attractive and does not look AI-generated.
- The user wants the app to be practical for factory use, not a visually overhauled AI dashboard.
- The initial safe interpretation was a targeted usability refinement that preserved the current visual identity and behavior. The user has now explicitly approved a deeper visual revision because the result still reads as AI-like.

## Approved Swiss Industrial Direction

- Use Swiss Industrial Print as the single visual archetype: light bone/newsprint substrate, carbon-black typography, visible 1px/2px rules, rigid grid, crisp corners, and one primary hazard red.
- Apply utilitarian minimalism through disciplined spacing, restrained type hierarchy, selective mono for engineering values, and no decorative effects.
- Do not mix in Tactical CRT cues such as dark mode, scanlines, neon, glow, or terminal noise; those would preserve the AI/console impression the user wants removed.
- The redesign boundary is visual only. Calculations, Reference/Current semantics, store state, import/export, route navigation, control names, and accessibility behavior remain protected.

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
- The dark header and white data panels were useful as the prior baseline, but the user has since identified the mixed dark-terminal/light-card composition as still AI-like; the new phase will test a unified light Swiss substrate instead.
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
| Preserve information architecture, not the old color split | The user approved changing the mixed dark header/light-card treatment while keeping the dense factory review structure and all behavior. |
| Use one Swiss Industrial Print archetype | A single light print system avoids the visual incoherence of combining minimalist, terminal, and tactical patterns. |
| Limit the first pass to shared layout, navbar, and KPI presentation | These components affect all routes and can improve scanability without touching calculation behavior. |
| Treat warnings as operational states, not decorative alerts | Missing rates and review rows need clear text and contrast, not more visual effects. |
| Keep raw values and existing labels stable | Browser acceptance and existing users depend on current content and control names. |

## Verification Baseline

- Live browser screenshot and DOM inspection were performed on the active Comparison page.
- Worktree was clean before beginning this UI task.
- The shared-shell slice is committed as `2f6767f` and changes only the active shared CSS/layout/navbar/KPI files.
- Fresh verification will be run after each implementation slice; previous verification results will not be used as the only evidence for new UI claims.

## Shared Shell Verification

- `npx tsc -b --pretty false` passed after the final indentation cleanup.
- `npm run build` passed with the existing Vite large-chunk warning; no build failure was introduced.
- `node scripts/test_comprehensive_audit.js` passed `31/31`.
- Fresh browser load showed the existing dark header, white data surfaces, comparison content, warnings, tables, and footer with the refined typography/border treatment.
- Fresh browser interaction confirmed Cost Breakdown navigation, Candidate Selection navigation, and the product selector opening with `Dataset Versions & Products (1)` and `RGOM-024-01` visible.
- Fresh browser console inspection returned no `error` or `warn` entries.
- An earlier boolean smoke check incorrectly searched for uppercase page text and reported false negatives; the later accessibility snapshot confirmed the route changed correctly. The test assumption—not the UI behavior—was corrected.
- Narrow-width browser evidence is still pending and will be captured during final verification; no narrow-width claim is made yet.

## Cost Breakdown Readability Verification

- Slice 2 is committed as `2e500d7` and changes only the active Cost Breakdown page and its comparison/table presentation components.
- The fresh comparison page retained the same seeded values, including the Reference/Current totals, exact cost gap, variance bridge, and balance check.
- Missing Work Center rates and comparison warnings now use a clear left status rail and remain exposed as `status`/`alert` content; no warning text or calculation semantics changed.
- The dense tables retain horizontal overflow containment with explicit minimum widths, while prose labels use the normal UI font and engineering values remain tabular/mono where alignment matters.
- The fresh browser smoke confirmed BOM, Routing, and Work Center tabs, accordion collapse/expand, and keyboard Enter toggling of the expandable section.
- The Export Comparison button remained available and returned to its idle state without a visible export error after the click. The in-app browser did not expose the programmatic Blob download event, so filesystem/download completion is not claimed from this smoke.
- Fresh browser inspection of Master Data, Candidate Selection, and RCA & Simulation showed the shared header/navigation without route errors; no route-specific code change was necessary.
- A reload of an already-open HMR/imported tab briefly recorded a `useAppStore` provider error while the page recovered. A new fresh tab loaded and navigated with an empty `error`/`warn` log; this is recorded as a development hot-reload observation, not treated as clean-load proof.
- The available in-app browser control exposes DOM, screenshots, and interaction but not a viewport override. The repository has no Playwright package, and the bundled Python launcher is unavailable in this environment, so a narrow-width browser capture could not be completed here. Responsive source safeguards are present (`sm:` header stacking and `overflow-x-auto`/minimum table widths), but the narrow visual result remains for manual review.

## Risks

| Risk | Mitigation |
|------|------------|
| Shared CSS changes affect all routes | Verify every active route after the shared-shell slice before proceeding. |
| Reducing mono/uppercase styling harms numerical scanning | Keep tabular numeric values and use mono selectively for IDs/measurements. |
| Visual changes accidentally alter accessibility selectors | Preserve visible labels, button names, and semantic elements; run AX/keyboard smoke. |
| Screenshot tuning becomes subjective | Use the user's stated preference as the constraint and keep changes narrow/reversible. |
| Shared light tokens may affect every active route | Verify all active routes after the shared foundation and avoid touching legacy duplicate paths. |
