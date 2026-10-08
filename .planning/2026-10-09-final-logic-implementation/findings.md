# Final Logic Implementation Findings

> This plan is an execution guide. Canonical product requirements remain under `docs/REQUIREMENTS_INDEX.md` and `docs/specs/`.

## Requirements

- Preserve three independent Master Data datasets: Reference, Current, Custom.
- Keep CBD strictly Reference vs Current; Custom must not affect CBD or Selected Comparison.
- Use generic Clone From where active dataset is destination and user chooses source.
- Keep identity matching, shared Standard Cost engine, missing-input handling, statuses, and reconciliation intact.
- Support Candidate selection and RCA Cases with 1..N Candidates, case-level Root Cause and Action, and completion without Simulation.
- Make Simulation optional and independent, able to start from Reference/Current/Custom, with locked structure and Current vs SIM comparison.
- Allow only BOM Price/Usage/Loss and Routing Manning/Capacity/Yield as Parameter factors; Work Center rates remain Master Data-owned.
- Separate Action Cost/Evaluation Quantity economics from Standard Cost; preserve required-saving, Economic Margin, commercial formulas, and negative OP.
- Keep flexible scenario counts; exact A/B is not mandatory.
- Preserve compatible finalized UI, spreadsheet, workbook, accessibility, and visual requirements.
- Deliver phase-level commits and a final normal push of `codex/final-logic-implementation`; never merge to main or force-push.

## Repository and requirement findings

- Current requested baseline exists and is the current documentation branch tip: `665099b71319ec98c537a0859336dc01b9acc118` on `codex/costbreakdown-spec-source`.
- Target implementation branch did not exist locally or on the checked remote heads when inspected; a new isolated worktree and local branch were created from the supplied baseline.
- The original checkout contains pre-existing untracked scratch files, planning material, and an operational workbook. They are not present in the isolated worktree and must not be staged.
- `HANDOFF.md` is stale: its current checkpoint lists baseline `9de6bce...` and says implementation audit is pending. This task's supplied baseline is `665099b...`; update the handoff only after actual implementation and verification.
- `FINAL_LOGIC_SPEC.md` (2026-10-08) and canonical page specs are the behavior authority. In particular, scenario A/B is optional, RCA is optional to Simulation, and Custom is not a CBD comparison side.
- `docs/specs/FINAL_LOGIC_SPEC.md` has 797 lines and was read completely before source changes.

## Technical decisions

| Decision | Rationale |
|---|---|
| Use a separate Git worktree based on the exact baseline. | Preserves the source branch and unrelated untracked work. |
| Reuse existing snapshot, calculation, workbook, and state helpers wherever behavior matches. | Avoids duplicated cost engines and parallel CRUD paths. |
| Treat undefined lifecycle/calculation semantics as blockers only when a concrete implementation depends on them. | Avoids guessing business behavior; user authorized asking `CBD Simu #4` if stuck. |
| Keep RCA Case entry in the Candidate workflow and make Case selection independent from the Controllable flag. | This directly supports selecting 1..N active-pool Candidates, while keeping ranking advisory and RCA completable without Simulation. |

## Issues and questions

- No unresolved business question has been identified yet; escalate only if code implementation depends on one.

## Phase 6 findings

- Candidate Case creation accepts only Candidate keys in the currently derived Candidate pool. The pool may already be constrained by Selected Comparison; the Case stores Candidate identities only, not the comparison scope itself.
- Selection is a separate control from Controllable; no Controllable state filters eligibility.
- Case-level saves patch only the active product session's RCA Case data. They do not increment the Ref/Cur Master Data revision or mutate the comparison pair.
- The Case editor remains within Candidate/RCA. The old RCA-and-scenarios page still exists temporarily for the upcoming Simulation extraction/removal phases; it is not the entry point for the new RCA Case flow.
- Focused Candidate, RCA Case, comparison view/full-flow, typecheck, and production build checks passed. Build continues to emit the baseline ExcelJS browser externalization warnings.

## Phase 7 findings

- Simulation is a session-oriented workspace held separately from product Master Data and RCA data. Start copies the selected role's Working snapshot into that workspace.
- The invalidation basis consists of the chosen source Working snapshot and Current Working snapshot because Current is the finalized Simulation comparison reference. Editing either resets the active SIM to the empty start state; changes in the third dataset do not.
- The new Simulation route does not import or restore the old `RcaSimulationPageState`; legacy `rca` / `dashboard` active-tab values navigate to Simulation. The old implementation files remain temporarily until final caller inspection and retirement in Phase 11.

## Phase 8 findings

- Current-vs-SIM comparison calls the canonical identity-aware `compareSnapshots(current, sim)` function. The existing comparison's left/right semantics make `ADDED` SIM-only and `REMOVED` Current-only, matching the finalized editability rule.
- The shared comparison reports ambiguous or unmatched business identities separately from the four canonical record statuses. Such rows remain visible as identity issues and are not editable; the engine never resolves them by row position or an arbitrary ID.
- Parameter edits target exactly one SIM-side row ID only after confirming its comparison identity and selected factor. The shared full-snapshot comparison recalculates both complete costs after the edit.
- Parameter Saving uses `Current.total - SIM.total`; negative values are kept, while unavailable totals produce `null`.

## Baseline verification discoveries

- `npm run build` passed at baseline (`tsc -b && vite build`; exit 0). Vite emitted the existing ExcelJS `fs`/`crypto` browser-externalization warnings; 2,035 modules transformed.
- All applicable current verifiers passed at baseline: 49 TypeScript + 2 MJS = 51/51, including `verify_neutral_dataset_workbook.ts` for the canonical four-sheet workbook.
- `git diff --check` passed. It reported only Git's line-ending notice for `.planning/.active_plan` (LF will be converted to CRLF), not a whitespace error.
- There are 53 tracked `verify*` scripts. A repository CJS TypeScript-verifier shim exists under the original checkout's ignored `node_modules/.cache/codex-cbd-verifiers-20261006-final/` and `jiti` is installed.
- The legacy `scripts/build_excel_models.js` generates populated operational-looking model workbooks and `npm run excel` invokes that generator. Do not run it as a baseline check because it writes generated workbook files and its source includes detailed operational data. Prefer read-only verifiers for the canonical neutral workbook path and record legacy model coverage separately.
- The two legacy Excel model verifiers do not validate the current canonical workbook path: the v1 verifier requires root workbook files that are absent; the v2 verifier targets the superseded five-sheet workbook. They were excluded. The canonical neutral workbook verifier passed.
