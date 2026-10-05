# Current Handoff — Documentation Source-of-Truth Recovery

**Updated:** 2026-10-05

## Active checkpoint

- Repository: `E:\COSTBREAKDOWN`.
- Branch: `codex/costbreakdown-spec-source`.
- Starting HEAD: `b746b16` (`docs: refresh reconciliation handoff`), pushed to `origin/codex/costbreakdown-spec-source`.
- Current task: documentation/source-of-truth recovery only. This recovery is recorded as a documentation-only commit on the active branch. No application code has been changed.
- Eight untracked synthetic verification scratch files remain local and must stay outside documentation commits.

## Correction being applied

The previous reconciliation in `793e62b` wrongly treated agreements as historical-only and downgraded finalized decisions missing from the short specs to `PENDING/TBD`. This pass restores valid decisions from agreements and the dated source material, applying only specific later user decisions that supersede them. Source precedence and migration protection are in `docs/REQUIREMENTS_INDEX.md`.

## Current document roles

- `docs/specs/`: consolidated, user-readable product behavior, including a Final Target State for each page.
- `agreements/` and dated source records under `docs/history/`: decision evidence with original status and chronology; archive location does not invalidate finalized decisions.
- `tasks/source-crosswalk-80.md`: traceability and implementation/verification status only, not product requirements or a user-facing feature checklist.
- `tasks/plan.md`, `tasks/todo.md`, and this file: operational history and checkpoint only.

## Recovered and superseded behavior

- Recovered comparison sign and calculation rules, independent Reference/Current calculation, business-identity matching, four statuses, Work Center processing aggregation, and the Standard Cost equations.
- Restored finalized Candidate and RCA & Simulation behavior from their agreements while keeping exact page redesign separate.
- Preserved finalized Selected Comparison lifecycle and Selected-only Gap display.
- Kept the later Master Data schema/workbook/export/identity and warning/layout decisions over the older conflicting details.
- MatVAR/LBVAR/BDVAR are removed from current scope by the latest explicit user decision.

## Genuine open items and verification

- Remaining product details explicitly not settled: sizing-count behavior after import; whether Clone is gated by source readiness and how readiness transfers; whether Clear asks for confirmation; exact Reset/Export presentation before first Save; business metric formulas/chart composition; Trial execution/approval/promotion; exact downstream page layouts and human visual acceptance.
- Direct retrieval of the original ChatGPT links was attempted: the first share URL timed out; the 80-topic URL returned only the logged-out ChatGPT shell, not the conversation. The local agreements, archived source context/spec, chronology, and this task's explicit corrections were inspected and used. Do not claim the inaccessible conversation messages were read; their lack of retrieval does not invalidate finalized decisions present in the local evidence or the user's explicit corrections.
- This is documentation-only work. No application tests/build/browser checks are in scope or claimed. Run documentation consistency checks and `git diff --check` before handoff.

## Resume

1. Check branch, HEAD, and worktree; preserve the eight local scratch files.
2. Read `docs/REQUIREMENTS_INDEX.md` and the applicable canonical spec before any product work.
3. If any previously finalized agreement decision is absent from a spec, treat that as a migration gap. Do not infer a supersession from age, archive location, or current code.
4. Do not implement application behavior as part of this recovery.
