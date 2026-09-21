# Task Plan: Factory UI Refinement

## Goal

Restore the original factory UI baseline that the user preferred, then use industrial UI principles only as restrained guardrails for clarity—not as a wholesale visual identity replacement.

## Scope Guard

In scope:

- Active React path under `src/App.tsx` → `src/features/*` → `src/shared/*`
- Shared layout, navigation, KPI presentation, warnings, tables, focus states, and responsive density
- Visual and usability refinement only; no domain or calculation changes

Out of scope:

- Replacing the original baseline with a new Swiss, tactical, brutalist, or AI-styled visual identity
- Changing Reference/Current semantics, import/export behavior, calculation formulas, or store state
- Editing legacy duplicate paths under `src/pages`, `src/components`, or `src/lib` unless an active import is proven
- Adding dependencies, fonts, backend services, or a design system package
- Pushes, PRs, or broad architecture migration

## User-Approved Direction

- Return the active UI files to the pre-refinement baseline at `63c418f`, which the user considers less AI-like and closer to the intended factory tool.
- Use the industrial skill selectively: keep operational hierarchy, readable dense tables, clear status, and restrained decoration as review criteria; do not impose a new archetype.
- Preserve the baseline's original layout, palette, navigation, labels, and information density unless a specific UI-only defect is found.
- Preserve calculations, store state, import/export, navigation, visible labels, and accessibility behavior.

## Next Step

Implement the requested `Reset Default` snapshot mock so Reference and Current/Active remain visibly different for real acceptance testing, then verify the reset flow end to end.

## Current Phase

Phase 10: Reset Default Snapshot Mock (in_progress)

## Phases

### Phase 1: Requirements & Discovery (complete)

- [x] Record the initial UI preference and the later approval boundary for a deeper visual revision
- [x] Trace the active frontend entry path and identify legacy duplicate paths
- [x] Inspect the current Cost Breakdown screen at runtime
- [x] Record visual findings, constraints, and risks in `findings.md`
- **Status:** complete

### Phase 2: Shared Visual Foundation

- [x] Define minimal tokens for surface, border, text, status, spacing, and focus treatment
- [x] Refine `AppLayout` without changing data or navigation behavior
- [x] Refine `Navbar` into a clear work-context header while preserving controls and labels
- [x] Refine the shared KPI card for fast factory scanning
- [ ] Verify the shared slice in the browser at desktop and narrow widths
- **Status:** complete for implementation; narrow-width evidence remains in final verification

### Checkpoint 1: Shared Shell

- [x] TypeScript check passes
- [x] Production build passes
- [x] Existing navigation and product selector still work
- [x] Browser console has no fresh-load errors
- [x] Commit only the shared-shell slice
- **Status:** complete (`2f6767f`)

### Phase 3: Cost Breakdown Readability

- [x] Improve comparison hierarchy without changing calculations
- [x] Make missing-rate and review warnings actionable and visually distinct
- [x] Improve section headers, tab controls, export action, and dense tables
- [x] Preserve all existing accessibility names and interaction behavior
- **Status:** complete

### Checkpoint 2: Cost Breakdown

- [x] Uploaded/seeded comparison still renders the same values
- [x] Export action remains available and no visible export error appears after the click smoke
- [x] Keyboard traversal reaches export and tabs; keyboard Enter toggles the expandable section
- [x] Commit only the Cost Breakdown UI slice
- **Status:** complete (`2e500d7`); IAB did not expose the programmatic Blob download event

### Phase 4: Cross-Route Consistency

- [x] Inspect Master Data, Candidate Selection, and RCA & Simulation for regressions from shared styles
- [x] Apply only small consistency fixes that support factory operation (no route-specific code change was needed)
- [x] Do not introduce a second visual language or duplicate components
- **Status:** complete

### Phase 5: Final Verification & Human Review (previous direction)

- [x] Run the full relevant verification gates after the final UI change
- [ ] Capture fresh browser evidence at 1366px-class desktop and a narrow fallback width (desktop captured; narrow blocked by harness)
- [x] Record verified and unverified evidence in `progress.md` and `findings.md`
- [x] Leave the worktree clean after commits
- [x] Leave final human acceptance to the user
- **Status:** complete for the previous refinement direction; narrow-width evidence remains an explicit browser-harness limitation carried into the new phase

### Phase 6: Swiss Industrial Print Foundation (superseded)

- [x] Replace the shared dark-terminal bias with the approved light Swiss substrate and carbon-ink tokens
- [x] Refine `AppLayout`, `Navbar`, footer/status, and shared KPI presentation around rigid rules and crisp corners
- [x] Remove active-shell gradients, heavy shadows, pill-like defaults, and decorative status motion without changing controls or labels
- [x] Keep focus visibility, keyboard access, responsive stacking, and semantic status treatment intact
- [x] Verify the foundation in a fresh browser on the active routes
- **Status:** superseded and rolled back by `3857d68` after the user preferred the original baseline

### Checkpoint 3: Swiss Foundation

- [x] TypeScript check passes
- [x] Production build passes
- [x] Existing navigation and product selector still work
- [ ] Fresh browser console has no application errors or warnings (not exposed by current IAB harness)
- [x] Commit only the shared Swiss foundation slice
- **Status:** complete with the console-evidence limitation recorded

### Phase 7: Swiss Cost Breakdown Presentation (superseded)

- [ ] Align KPI ledger, comparison panels, warnings, variance tree, and tables with the Swiss substrate
- [ ] Use red only for actionable variance/review emphasis and keep neutral states legible without decorative color noise
- [ ] Preserve all values, tab names, warning text, export behavior, and keyboard semantics
- [x] Verify that no Swiss page-level slice is retained after the direction change
- **Status:** superseded; Cost Breakdown presentation returned to the pre-refinement baseline

### Phase 8: Final Verification & Human Acceptance (superseded)

- [ ] Inspect all active routes for visual consistency and unintended regressions
- [ ] Run the full relevant verification gates after the final visual change
- [ ] Capture fresh desktop evidence and document the narrow-width harness limitation if it remains
- [ ] Leave the worktree clean and hand final visual acceptance to the user
- **Status:** pending

### Phase 9: Initial UI Baseline Restoration & Verification

- [x] Restore the active UI files to the pre-refinement baseline at `63c418f`
- [x] Confirm the restoration diff contains only UI/layout/presentation files
- [x] Run typecheck, production build, and the existing audit suite
- [x] Verify fresh browser rendering and core navigation/product-selector interactions
- [x] Record the result and leave final human visual acceptance to the user
- **Status:** complete for implementation; final human visual acceptance remains with the user

### Checkpoint 4: Restored Baseline

- [x] UI files compare exactly with the pre-refinement baseline `63c418f`
- [x] TypeScript check passes
- [x] Production build passes; existing large-chunk warning remains
- [x] Existing audit suite passes `31/31`
- [x] Fresh browser shows the original shell and Cost Breakdown values
- [x] Product selector opens with the expected dataset/product entry
- [ ] Browser console log evidence (not exposed by the current IAB harness)

### Phase 10: Reset Default Snapshot Mock

- [ ] Define a deterministic default Reference/Current snapshot pair from the existing seed fixture
- [ ] Make `Reset Default` apply both legacy active fields and the explicit snapshot pair
- [ ] Preserve the existing reset confirmation and route/product behavior
- [ ] Verify Cost Breakdown shows a non-zero gap/variance after reset
- [ ] Verify the original default counts and product metadata remain intact
- **Status:** in_progress

### Checkpoint 5: Reset Default Testing Fixture

- [ ] TypeScript check passes
- [ ] Production build passes
- [ ] Existing audit suite passes
- [ ] Fresh browser reset flow shows Reference and Current/Active differences
- [ ] Commit and push the focused reset-fixture slice

## Acceptance Criteria

- The active UI files match the original pre-refinement factory baseline the user prefers.
- Industrial UI principles are used only as a restraint on future UI changes, not as a replacement visual identity.
- `Reset Default` provides an explicit two-snapshot test fixture with visible Active variance.
- Factory operator can identify product context, active state, cost gap, review count, and missing-rate warnings within one scan.
- Numbers remain tabular and aligned; labels and explanations remain readable at normal zoom.
- No interactive behavior changes for navigation, product selector, import, export, tabs, or accordion sections.
- Keyboard focus is visible and all existing controls remain keyboard accessible.
- No new dependencies or legacy-path edits are introduced.
- TypeScript, production build, existing audit checks, and fresh browser smoke pass.

## Commit Boundaries

1. `docs: plan factory UI refinement` — plan and discovery evidence only.
2. `style: refine shared factory workbench shell` — tokens, layout, navbar, and shared KPI only.
3. `style: improve cost breakdown factory readability` — comparison, warnings, controls, and tables only.
4. `style: align active route presentation` — only if cross-route inspection finds a real consistency issue.
5. `docs: record factory UI verification` — final evidence only.
6. `docs: plan swiss industrial UI direction` — superseded direction (`16935ca`).
7. `style: establish swiss industrial workbench foundation` — superseded visual experiment (`da0db47`).
8. `style: restore initial factory UI baseline` — UI-only rollback to `63c418f` (`3857d68`).
9. `docs: record initial UI baseline verification` — fresh verification and final evidence.
10. `feat: make reset default provide comparison fixture` — deterministic Reference/Current mock data for acceptance testing.
11. `docs: record reset default fixture verification` — focused reset-flow evidence.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Restore the pre-refinement baseline | The user explicitly prefers the first UI and says it reads less like AI; exact file comparison confirms the restored presentation matches `63c418f`. |
| Use industrial principles selectively | The skill is useful for hierarchy, dense operational data, and restraint, but the user does not want its full visual archetype applied. |
| Make Reset Default an explicit comparison fixture | Acceptance testing needs a deterministic Reference/Current pair with visible Active variance, not only a legacy-session reset. |
| Use small shared-shell and page-level slices | Prevents repeated redesign work and keeps each visual change reversible. |
| Keep the active frontend path only | The repository contains legacy duplicate UI paths that are not imported by `src/App.tsx`. |
| Prefer CSS/Tailwind changes over new abstractions | The app already uses Tailwind and shared components; a new design system would add unnecessary scope. |

## Errors Encountered

| Error | Resolution |
|-------|------------|
| Existing `graphify-out/graph.json` was not present | Used direct active-path tracing with `rg` and source inspection; no graph artifacts were created. |
| Namespace aliases in the skill catalog did not match filesystem paths | Resolved the actual skill-root paths and read the required skill files before planning. |
| UI/UX design-system search script could not run | `python3` resolved to an inaccessible WindowsApps shim and `py` was unavailable; used the read skill instructions and project evidence as the design-system fallback. |

## Definition of Done

The plan is complete only when the original UI character is preserved, the targeted factory usability changes are verified in the active browser flow, all required gates are fresh and passing, atomic commits are present, and remaining human-acceptance evidence is explicit.
