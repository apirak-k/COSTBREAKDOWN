# Progress

## 2026-09-27 — Discovery

- Confirmed clean starting branch `codex/snapshot-import-role-selector` at `0bb60f5`.
- Confirmed active import graph and isolated legacy source island.
- Confirmed current agreement plan is separate and incomplete; keep Tasks 14–18 intact.
- No application source files changed during discovery.

## 2026-09-27 — Structure and project guidance

- Removed the disconnected `src/pages/`, `src/components/`, and `src/lib/` source trees.
- Removed unreferenced single-sheet and multi-tab Excel adapters. Kept the active snapshot parser/export path and feature-local files.
- Added `*.tsbuildinfo` to `.gitignore` and staged removal of the tracked `tsconfig.tsbuildinfo` from the Git index. The generated file remains local and ignored.
- Updated the README navigation, project structure, project safeguards, and current handoff. The prior Master Data sizing handoff remains below the current checkpoint.
- Added the user's maintainability rule to `PROJECT_SPECIFIC.md`: shared behavior has one canonical implementation; intentional local exceptions explain why and how to keep them aligned. README now directs future work to read project safeguards and constraints.
- `npm run build` passed: 1,689 modules transformed. Vite emitted the existing large-chunk advisory; the main JavaScript bundle is 1,673.45 kB.
- Fresh import traversal resolves 95 source modules and zero under removed paths. Repository search found no references to removed modules in active source or scripts.
- `git diff --check` passed. Reviewed the full change list; agreements, task backlog, proposal, and prior audit are unchanged.
- The sandbox denied the initial index update because `.git/index` is read-only. The required one-file index update was then approved and staged. No commit or push was made.
- `.planning/.active_plan` now points to `tasks/plan.md`. The next agreement implementation task is Task 14.

## Resume Point

Resume agreement work at Task 14 in `tasks/todo.md`, after reviewing the local structure changes.
