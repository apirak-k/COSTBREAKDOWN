# Current Handoff — Source-of-Truth Reconciliation

**Updated:** 2026-10-05

## Active checkpoint

- Repository: `E:\COSTBREAKDOWN`.
- Active branch: `codex/costbreakdown-spec-source`.
- Last committed checkpoint before this documentation work: `cf504f9` (`revert: restore pre-UI review checkpoint`). The documentation reconciliation is currently in the working tree and has not been committed.
- The `feature/taste-frontend-ui` reference still points to `f873540`; the root `design.md` is absent after the rollback.
- This work is documentation-only. No application source or UI feature files were changed.
- The existing eight untracked synthetic verification scratch files were preserved; do not include them in a documentation commit.

## Current document roles

- `docs/REQUIREMENTS_INDEX.md`: authority order and reading order.
- `docs/specs/`: canonical product specifications.
- `tasks/source-crosswalk-80.md`: 80-topic traceability, commit references, implementation status, verification status, and gaps. It is not a requirements source.
- `tasks/plan.md` and `tasks/todo.md`: operational history/task tracking only.
- `HANDOFF.md`: active checkpoint and resume instructions only.
- `agreements/` and `docs/history/`: historical reference only.

## Reconciliation limits and open items

- The ChatGPT source links remain listed in `docs/REQUIREMENTS_INDEX.md`. The saved browser policy blocked reopening those links during this pass; they were not accessed through another browser surface. The crosswalk carries forward its previous verification evidence and makes this limitation explicit.
- No tests, builds, or browser verification were run during this documentation pass.
- `docs/specs/CROSS_CUTTING.md` marks Gap sign convention and unclosed downstream behaviors `PENDING/TBD` instead of treating the implementation as authority. `docs/specs/MASTER_DATA.md` also leaves Clone readiness behavior open pending source confirmation.
- Prior mistaken UI commits `df82a9d`, `9b39e22`, `2fd57ea`, and `52e5c9d` were reverted by `cf504f9`. Do not treat those edits or their deleted `design.md` as current work or approved behavior.

## Resume

1. Check `git status --short --branch` and confirm the active branch before editing.
2. Read `docs/REQUIREMENTS_INDEX.md`, then only the applicable files in `docs/specs/`.
3. Read `tasks/source-crosswalk-80.md` for status and evidence; do not infer requirements from the application code.
4. Keep any future feature work separate from this documentation reconciliation and wait for the user's direction before expanding scope.
