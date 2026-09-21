# Task Plan: Snapshot Import Role Selector

## Goal

Deliver the smallest verified UI slice that lets a user choose whether an Excel workbook is imported as Reference or Current, preserves the existing independent snapshot/store behavior, and proves the Reference -> Current -> Compare flow without regressing legacy workbook import.

## Scope Guard

In scope:

- src/features/master-data/components/ExcelImportPanel.tsx
- Focused verification for role selection and the existing snapshot import path
- Browser smoke/acceptance verification for the import panel
- Planning and progress records for this task

Out of scope for this task:

- Rewriting the parser, snapshot comparison engine, or session store unless a focused verification exposes a defect
- Changing the legacy renderer/menu/import behavior
- Redesigning lifecycle semantics or fixing the legacy hard-coded Work Center fallback
- Resolving the open architecture decisions about Routing identity, MHr, missing rates, or the canonical workbook contract
- Adding a new dependency only to make tests easier
- Pushing to a remote

## Next Step

Manual acceptance of native workbook upload/download in the user's browser; no further production change is indicated by the current fixture flow.

## Current Phase

Phase 9: Delivery & Checkpoint (complete)

## Phases

### Phase 1: Requirements & Discovery

- [x] Confirm the user wants execution, staged commits, and useful skills
- [x] Verify the live repository, branch, HEAD, and clean starting tree
- [x] Compare the latest handoff against the actual code
- [x] Identify the exact missing behavior and affected files
- [x] Record test/build limitations and baseline evidence in findings.md
- **Status:** complete

### Phase 2: Focused RED verification

- [x] Select the existing no-new-dependency verification path
- [x] Add a focused check for the visible Reference/Current selector and role propagation
- [x] Run it against the current implementation and record the expected failure
- [x] Define the acceptance checklist for the slice
- **Status:** complete

### Phase 3: Role Selector Implementation

- [x] Add local ComparisonRole state with the safe default current
- [x] Add accessible Reference and Current controls using existing visual tokens
- [x] Pass the selected role to ExcelUploadDropzone
- [x] Keep existing actions, legacy import behavior, and copy outside this slice unchanged
- [x] Re-run the focused check and type/build gates
- **Status:** complete

### Phase 4: Runtime Verification

- [x] Start the dev server in an isolated local process
- [x] Inspect the rendered Import panel after the app loaded
- [x] Verify both role controls are visible, keyboard reachable, and selection changes the displayed import role
- [ ] Verify browser console has no new errors/warnings [Unverified: the available browser automation surface does not expose console logs]
- [x] Verify the existing parser/store self-check coverage as far as the current runner permits
- **Status:** complete with one explicit unverified sub-check

### Phase 5: Delivery & Checkpoint

- [x] Review the final diff and staged files for scope and confidentiality
- [x] Commit the plan/checkpoint records separately from the UI behavior when practical
- [x] Commit the verified role-selector implementation as an atomic change
- [x] Update this plan, findings.md, and progress.md
- [x] Report verified, unverified, and next-slice items without claiming human acceptance
- **Status:** complete

### Phase 6: Full Workbook Flow Discovery

- [x] Re-open the selected plan and confirm the previous slice is clean and committed
- [x] Trace the role selector, parser, snapshot store, comparison page, and comparison export surfaces
- [x] Identify a safe local workbook/fixture path for browser upload without changing user data
- [x] Record the current end-to-end gap and acceptance assertions
- **Status:** complete

### Phase 7: Full Flow RED/GREEN Slice

- [x] Run the full-flow check against the current implementation and capture the browser file-picker limitation
- [x] Confirm whether a production integration/UI fix is required; no defect was exposed by the fixture flow
- [x] Preserve legacy import, independent snapshot mode, and existing export behavior
- [x] Add and run a bundled no-new-dependency full-flow verification check
- **Status:** complete; no production behavior change required

### Phase 8: Runtime and Regression Verification

- [ ] Exercise Reference upload in the browser and verify the Reference side is populated [Blocked by uncontrollable native picker]
- [ ] Exercise Current upload in the browser and verify the Current side is populated [Blocked by uncontrollable native picker]
- [x] Verify non-empty comparison output from both repository fixtures through the real comparison function
- [x] Verify comparison export and its four-sheet generated artifact through the real export function
- [x] Run type-check, build, and relevant regression/audit gates
- **Status:** complete with browser-upload/download checks explicitly marked unverified where the automation surface could not observe them

### Phase 9: Delivery & Checkpoint

- [x] Review the scoped diff and generated artifacts
- [x] Commit each meaningful increment atomically
- [x] Update findings/progress with verified and unverified evidence
- [x] Leave the worktree clean without pushing
- **Status:** complete

## Commit Boundaries

1. docs: add snapshot import role selector plan — planning records only.
2. feat: let users choose snapshot import role — UI role state, controls, prop wiring, and focused verification updates only.
3. A separate verification/test commit is allowed only if a meaningful runnable check is added without unrelated tooling expansion.
4. docs: extend snapshot plan for full workbook flow — plan and discovery records only.
5. test: add bundled snapshot full-flow verification — parser, comparison, and export only; no production behavior change.

## Acceptance Criteria

- The Import panel exposes exactly two clear choices: Reference and Current.
- Current remains the safe initial selection for backward compatibility.
- The selected role is passed to the existing dropzone/parser path.
- The dropzone copy reflects the selected role.
- Existing reset, clear, template, promote, and legacy adapter behavior is unchanged.
- TypeScript and production build pass.
- Browser smoke verification observes the controls and selection state.
- Any missing full end-to-end workbook upload proof is explicitly marked [Unverified].
- Browser console cleanliness is explicitly marked [Unverified] because the available automation surface does not expose console logs.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Keep the first code slice limited to ExcelImportPanel.tsx and focused verification | The parser and store already accept ComparisonRole; the missing boundary is UI selection. |
| Keep current as the initial role | The existing dropzone default is current, so existing import behavior remains compatible. |
| Do not add a test dependency yet | The repository has no test/lint/typecheck scripts and the first slice can be verified with existing tooling plus browser smoke verification. |
| Keep planning artifacts in a named .planning/<PLAN_ID>/ directory | Prevents this task from colliding with another task's planning files. |
| Use existing workbook fixtures or a temporary local fixture only | Full-flow proof needs real file input, but must not modify user-owned workbooks or add a speculative dependency. |

## Errors Encountered

| Error | Resolution |
|-------|------------|
| Existing .ts self-checks fail with ERR_UNKNOWN_FILE_EXTENSION under plain Node | Record as a verification limitation; do not claim those checks pass. Evaluate a no-new-dependency runner path during Phase 2. |
| node --experimental-strip-types still fails on extensionless source imports | Do not repeat the same invocation; use browser/build verification or a bounded runner investigation. |
| Graphify semantic extraction stopped without a supported key | Use the documented `--code-only` AST fallback for this codebase trace; do not add or request credentials. |
| Port 4173 was already occupied during the second runtime smoke | Use the isolated Vite server on port 4174 for this verification session. |
| Browser hidden file input did not expose a controllable native picker | Keep browser upload assertions [Unverified]; use repository-owned fixture verification and manual acceptance. |

## Definition of Done

The next checkpoint is complete only when the acceptance criteria above are met, fresh verification evidence is recorded, the working tree is clean after the commit(s), and remaining risks are explicit.
