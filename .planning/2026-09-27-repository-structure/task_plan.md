# Repository Structure Cleanup Plan

## Objective

Make the Cost Breakdown repository easier to understand and continue with agreement-led vibe coding. Preserve the current product agreements, implementation backlog, and historical handoff evidence. Keep application behavior and user-owned UX/business decisions unchanged.

## Current Source of Truth

- Product behavior: the four documents in `agreements/`, indexed by `docs/REQUIREMENTS_INDEX.md`.
- Active application entry: `index.html` → `src/main.tsx` → `src/App.tsx` → the four feature areas under `src/features/`.
- Implementation context: `PROJECT.md`.
- Current status and resume point: `HANDOFF.md`.
- Existing agreement implementation plan and checklist: `tasks/plan.md` and `tasks/todo.md`. Preserve both; Tasks 14–18 remain open.

## Architecture Decisions

- Keep the documented `src/features/`, `src/core/`, `src/state/`, `src/services/`, and `src/shared/` layout.
- Remove only the duplicate legacy source tree proven unreachable from the active application and not referenced by current scripts, plans, or documentation.
- Keep the existing agreements, feature-local files, and history. Do not change product behavior, add dependencies, or introduce a backend.
- Track repository restructuring here, separately from the incomplete agreement implementation plan.

## Task List

### Phase 1: Establish the active structure

- [x] Trace the active source import graph from `src/main.tsx`.
- [x] Check references to duplicate legacy paths across source, scripts, docs, and plans.
- [x] Confirm the current branch, commit, and clean starting worktree.

### Phase 2: Remove proven dead structure

- [x] Remove the unreachable `src/pages/`, `src/components/`, and `src/lib/` trees.
- [x] Remove obsolete single-sheet and multi-tab Excel adapters that have no active callers.
- [x] Add an ignore rule for future `*.tsbuildinfo` files.
- [x] Remove the already-tracked TypeScript build metadata from the Git index.

### Phase 3: Make navigation and status accurate

- [x] Update `README.md`, `PROJECT.md`, and `PROJECT_SPECIFIC.md` to describe the canonical source layout.
- [x] Record the shared-module source-of-truth and change-locality rule for future implementation work.
- [x] Add a current `HANDOFF.md` checkpoint and retain the previous checkpoint under historical handoffs.
- [x] Point `.planning/.active_plan` to the preserved agreement implementation plan after this cleanup is complete.
- [x] Preserve `tasks/plan.md`, `tasks/todo.md`, and the completed agreement audit unchanged.

### Phase 4: Verify and leave a clear resume point

- [x] Confirm no active references remain to removed paths.
- [x] Run `npm run build` after the changes.
- [x] Run `git diff --check` and inspect the complete diff.
- [x] Record actual verification and set the next feature resume point to Task 14.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Old-looking modules contain behavior still needed by the app. | Trace runtime imports and repository references before removal; preserve active snapshot adapters and feature-local files. |
| Structure cleanup is mistaken for agreement completion. | Keep the 18-task implementation checklist unchanged and state that Tasks 14–18 remain open. |
| Historical handoff is lost while refreshing current status. | Retain the prior handoff content under a historical heading. |
| Cleanup changes product behavior. | Limit source changes to removing unreachable modules; verify with a fresh production build. |

## Human Acceptance Boundary

Build and import-graph checks verify structure and compilation only. They do not establish agreement compliance or human acceptance of product behavior.
