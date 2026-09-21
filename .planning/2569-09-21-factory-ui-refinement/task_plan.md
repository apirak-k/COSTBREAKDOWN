# Task Plan: Factory UI Refinement

## Goal

Improve the active frontend for practical factory use while preserving the original visual language that the user already considers attractive and non-AI-generated.

## Scope Guard

In scope:

- Active React path under `src/App.tsx` → `src/features/*` → `src/shared/*`
- Shared layout, navigation, KPI presentation, warnings, tables, focus states, and responsive density
- Visual and usability refinement only; no domain or calculation changes

Out of scope:

- Replacing the existing visual identity with a new industrial/brutalist theme
- Changing Reference/Current semantics, import/export behavior, calculation formulas, or store state
- Editing legacy duplicate paths under `src/pages`, `src/components`, or `src/lib` unless an active import is proven
- Adding dependencies, fonts, backend services, or a design system package
- Pushes, PRs, or broad architecture migration

## User-Approved Direction

- Keep the initial UI's attractive structure, palette, and overall character.
- Make only targeted factory usability improvements: fast scanning, clear operational status, readable tables, reliable controls, and keyboard/mouse use.
- Avoid generic AI visual signals: decorative gradients, excessive rounded cards, glowing effects, marketing copy, and unnecessary animation.

## Next Step

Implement the Cost Breakdown readability slice after recording the shared-shell verification.

## Current Phase

Phase 3: Cost Breakdown Readability (in_progress)

## Phases

### Phase 1: Requirements & Discovery (complete)

- [x] Confirm that the original UI should be preserved rather than replaced
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

### Phase 5: Final Verification & Human Review

- [x] Run the full relevant verification gates after the final UI change
- [ ] Capture fresh browser evidence at 1366px-class desktop and a narrow fallback width (desktop captured; narrow blocked by harness)
- [x] Record verified and unverified evidence in `progress.md` and `findings.md`
- [x] Leave the worktree clean after commits
- [x] Leave final human acceptance to the user
- **Status:** in_progress; narrow-width evidence is blocked by the available browser harness

## Acceptance Criteria

- Original UI character remains recognizable; this is a refinement, not a redesign replacement.
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

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Preserve the original UI direction | User explicitly prefers the initial look and does not want a new AI-looking or wholesale industrial theme. |
| Use small shared-shell and page-level slices | Prevents repeated redesign work and keeps each visual change reversible. |
| Keep the active frontend path only | The repository contains legacy duplicate UI paths that are not imported by `src/App.tsx`. |
| Prefer CSS/Tailwind changes over new abstractions | The app already uses Tailwind and shared components; a new design system would add unnecessary scope. |

## Errors Encountered

| Error | Resolution |
|-------|------------|
| Existing `graphify-out/graph.json` was not present | Used direct active-path tracing with `rg` and source inspection; no graph artifacts were created. |
| Namespace aliases in the skill catalog did not match filesystem paths | Resolved the actual skill-root paths and read the required skill files before planning. |

## Definition of Done

The plan is complete only when the original UI character is preserved, the targeted factory usability changes are verified in the active browser flow, all required gates are fresh and passing, atomic commits are present, and remaining human-acceptance evidence is explicit.
