# Task Plan: Factory UI Refinement

## Goal

Establish a coherent, practical factory workbench visual system that no longer reads as an AI dashboard, while preserving all existing data, calculations, state, and operator flows.

## Scope Guard

In scope:

- Active React path under `src/App.tsx` → `src/features/*` → `src/shared/*`
- Shared layout, navigation, KPI presentation, warnings, tables, focus states, and responsive density
- Visual and usability refinement only; no domain or calculation changes

Out of scope:

- Mixing multiple visual archetypes or adding a tactical CRT/dark-mode treatment
- Changing Reference/Current semantics, import/export behavior, calculation formulas, or store state
- Editing legacy duplicate paths under `src/pages`, `src/components`, or `src/lib` unless an active import is proven
- Adding dependencies, fonts, backend services, or a design system package
- Pushes, PRs, or broad architecture migration

## User-Approved Direction

- Use one coherent archetype: **Swiss Industrial Print** with utilitarian minimalism.
- Use a light bone/newsprint substrate, carbon-black ink, rigid rules/grid, crisp corners, and one primary hazard red for operational emphasis.
- Keep the existing factory information architecture and interaction model, but replace the previous mixed dark-terminal/light-card treatment where it causes the AI/demo impression.
- Avoid tactical CRT, scanlines, neon, gradients, glow, glass, heavy shadows, excessive rounded cards, marketing copy, and decorative animation.
- Preserve calculations, store state, import/export, navigation, visible labels, and accessibility behavior.

## Next Step

Implement the approved Swiss Industrial Print foundation, verify it in a fresh browser, then align the Cost Breakdown data surfaces before final cross-route verification.

## Current Phase

Phase 6: Swiss Industrial Print Foundation (in_progress)

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

### Phase 6: Swiss Industrial Print Foundation

- [ ] Replace the shared dark-terminal bias with the approved light Swiss substrate and carbon-ink tokens
- [ ] Refine `AppLayout`, `Navbar`, footer/status, and shared KPI presentation around rigid rules and crisp corners
- [ ] Remove active-shell gradients, heavy shadows, pill-like defaults, and decorative status motion without changing controls or labels
- [ ] Keep focus visibility, keyboard access, responsive stacking, and semantic status treatment intact
- [ ] Verify the foundation in a fresh browser on the active routes
- **Status:** in_progress

### Checkpoint 3: Swiss Foundation

- [ ] TypeScript check passes
- [ ] Production build passes
- [ ] Existing navigation and product selector still work
- [ ] Fresh browser console has no application errors or warnings
- [ ] Commit only the shared Swiss foundation slice

### Phase 7: Swiss Cost Breakdown Presentation

- [ ] Align KPI ledger, comparison panels, warnings, variance tree, and tables with the Swiss substrate
- [ ] Use red only for actionable variance/review emphasis and keep neutral states legible without decorative color noise
- [ ] Preserve all values, tab names, warning text, export behavior, and keyboard semantics
- [ ] Verify the fresh Cost Breakdown route and commit only the page-level slice

### Phase 8: Final Verification & Human Acceptance

- [ ] Inspect all active routes for visual consistency and unintended regressions
- [ ] Run the full relevant verification gates after the final visual change
- [ ] Capture fresh desktop evidence and document the narrow-width harness limitation if it remains
- [ ] Leave the worktree clean and hand final visual acceptance to the user
- **Status:** pending

## Acceptance Criteria

- Swiss Industrial Print is applied as one coherent factory workbench language rather than a mixed AI/terminal dashboard treatment.
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
6. `docs: plan swiss industrial UI direction` — approved direction and new implementation phases.
7. `style: establish swiss industrial workbench foundation` — shared light substrate, rules, navigation, layout, and KPI styling.
8. `style: align cost breakdown with swiss industrial system` — active Cost Breakdown presentation only.
9. `docs: record swiss industrial UI verification` — final evidence only.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Preserve behavior while revising the visual substrate | The user later confirmed the current result still looks AI-like and approved a deeper Swiss Industrial Print treatment; calculations and flows must remain stable. |
| Use Swiss Industrial Print, not Tactical CRT | The industrial UI skill requires one archetype; the light print language fits a factory workbench while avoiding another terminal-like aesthetic. |
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
