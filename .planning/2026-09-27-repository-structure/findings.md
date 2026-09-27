# Repository Structure Findings

## Baseline

- Repository: `E:\COSTBREAKDOWN`
- Branch: `codex/snapshot-import-role-selector`
- Starting HEAD: `0bb60f5f40055e32b6e5e62195f8736f3550d06d`
- Starting worktree: clean
- The locally available `origin/feature/taste-frontend-ui` ref is an ancestor of this branch. The current branch contains 89 commits after that ref; no branch switch or fetch is part of this cleanup.

## Active Application Structure

The import walk from `src/main.tsx` resolves 95 source modules. The active application imports modules under `src/features/`, `src/core/`, `src/state/`, `src/services/`, and `src/shared/`. It reaches zero modules under the top-level `src/pages/`, `src/components/`, and `src/lib/` directories.

Repository-wide reference search found those old source directories referenced only from within the old page/component island and in the tracked TypeScript build metadata. Current scripts, task plans, and docs do not depend on those source paths. The old pages use a separate `src/lib` model and are not the page exports selected by `src/App.tsx`.

The active Excel path uses snapshot import/export modules. The old single-sheet parser/generator have no callers. The old multi-tab parser/generator are used only by the unreachable `src/pages/DataMasterPage.tsx`.

Keep all files under `src/features/` during this cleanup. Some feature-local files are not yet imported by the current page, but they are named in the agreement implementation backlog and may be needed for Tasks 14–18 or other accepted work.

## Existing Planning and History

- `tasks/plan.md` and `tasks/todo.md` describe the incomplete agreement implementation work. Tasks 14–18 remain unchecked. Neither file is to be overwritten.
- `.planning/2569-09-24-agreement-gap-audit/` records a completed static audit. Its findings remain historical evidence, not current verification.
- At baseline, the top of `HANDOFF.md` labeled the 2026-09-25 sizing change as uncommitted and gave base `f83d8d8`. The checkout was clean at `0bb60f5`, which includes that sizing change. Refresh the current checkpoint and retain the old record below it.
- The proposed dataset sizing design remains proposed and is not adopted as product scope.

## Verification Evidence

- `git status --short --branch`: clean at the starting checkpoint.
- `git rev-parse HEAD`: `0bb60f5f40055e32b6e5e62195f8736f3550d06d`.
- TypeScript import traversal from `src/main.tsx`: 95 reachable source modules; zero reachable modules under `src/pages/`, `src/components/`, and `src/lib/`.
- `rg` repository search: old directory imports are contained within the unreachable legacy island; current agreements, tasks, and scripts have no such imports.
- `tsconfig.tsbuildinfo` is tracked generated TypeScript build metadata and contains paths for the old tree.

## Scope Boundaries

- No UX/UI or business logic changes.
- No changes to agreements or acceptance status.
- No dependency, backend, test-framework, or package-script changes.
- No commit or push without a separate explicit request.
