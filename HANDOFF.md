# Current Handoff — Master Data refresh and Selected Comparison (2026-10-05)

## Active implementation checkpoint

- Repository: `E:\COSTBREAKDOWN`; active branch: `codex/costbreakdown-spec-source`. UI work starts from checkpoint `2bf5ec5` (warning-density UI decision), whose parent `bd967b5` removes warning clutter. `design.md` was created on this branch from the HAWS template, using `feature/taste-frontend-ui@f873540` as a read-only UX reference and the user's screenshot for page composition. No new branch was created and the reference branch was not used as the delivery branch.
- UI commits after the design-only checkpoint: `9b39e22` (Master Data toolbar and metadata) and `2fd57ea` (RCA and Simulation layout). The existing dark navigation rail, pinned status footer, sticky Master Data toolbar/metadata, Cost Breakdown warning disclosure, and Candidate comparison-scope UI were already present at the implementation checkpoint and remain in use.
- Requirements authority is defined in `docs/REQUIREMENTS_INDEX.md`: latest user decisions, the two current Markdown documents, the two linked source conversations, then the 80-topic crosswalk. Older `agreements/` files are historical references only. The source-to-implementation status/evidence ledger is `tasks/source-crosswalk-80.md`; it records 55 PASS, 8 PARTIAL, 2 OPEN, 13 DEFERRED, and 2 RECORDED topics.
- Master Data follows the screenshot's order: dataset/action toolbar, product metadata, active table, and pinned workspace footer. The current metadata row includes Product Code, Product Name, UOM, Selling Price, SG&A, and Dataset Remark. Work Centers, BOM, Routing, and All Tables remain supported. Master Data tables contain no warning prose, row issue badges, or warning-count footers; invalid cells remain marked locally and dataset notices stay outside tables. `#` stays left and the reorder-only drag handle is the rightmost column.
- Cost Breakdown retains the warning-density refinement: no redundant top warning banner, and the full warning list is behind the collapsed `Review warnings (N)` disclosure. Full Comparison and Selected Comparison continue to use the current scope-specific gap; Candidate Prioritization retains its scope label and filters. RCA & Simulation now presents candidate context, calculation basis, and A/B/C scenarios before the compact Trial handoff control. The Master Data header exposes Product Code in its existing Edit mode; calculation, comparison, candidate, scenario, and workbook logic are unchanged.
- Excel templates and exports now contain exactly four dataset sheets in order: `META`, `BOM`, `ROUTING`, `WORK_CENTER`. Product Name, UOM, Selling Price, SG&A, and Dataset Remark share `META`. A separate `COST_CALCULATION` view links to these sheets and does not participate in import. Formulas mirror the current engine: Material = Usage × Price × (1 + Loss); Routing Factor = Manning ÷ (Capacity × Yield); Labor/Burden = Factor × matching Work Center rate; Total Standard Cost = Material + Labor + Burden. Missing/invalid values and duplicate Work Center matches remain unavailable. No financial formulas were added and the in-app engine was not changed.
- Earlier focused checks passed on the pre-refinement commit: `verify_workflow_status.ts`, `verify_snapshot_routing_identity.ts`, `verify_comparison_reconciliation.ts`, `verify_candidate_prioritization.ts`, `verify_master_data_handoff.ts`, `verify_master_data_clear_dataset.ts`, `verify_neutral_dataset_workbook.ts`, and `verify_dataset_sizing_and_clone.ts`.
- UI-pass verification: `npm run build` passed after the Master Data slice and again after the RCA & Simulation slice (2,032 modules; latest main entry 411.98 kB, 105.20 kB gzip; CSS 35.88 kB, 7.00 kB gzip). `git diff --check` passed before both UI commits. No automated UI checks or tests were run for this pass. The earlier `node scripts/verify_cost_breakdown_review_feedback.mjs` result at the warning-density checkpoint still covers cell-level invalid cues, no inline table warning prose, row-control order, and collapsed Cost Breakdown warning details. Vite still reports existing ExcelJS `fs`/`crypto` browser-externalization warnings; there is no 500 kB chunk advisory.
- Synthetic Excel workbooks were recalculated using installed Microsoft Excel automation after the bundled recalculation helper failed on the Python runtime and LibreOffice was unavailable. The sample total matched the app calculation (23.578947 THB/pc); blank, missing-input, and duplicate-Work-Center cases stayed unavailable; formula scans found zero cell errors. No operational workbook or factory data was used.
- Browser-only reset/import/export/clone confirmations, template download capture, and rendered status-link checks remain PARTIAL/OPEN in the crosswalk. `[Unverified]` The new UI pass has not received browser-rendered visual review; the existing local-browser inspection restriction says not to retry through another browser surface. Human UX acceptance remains pending.
- Local synthetic verification scratch files (`.make-synthetic-verification.mjs`, `.verify-*.mjs`, `.synthetic-*.xlsx`) remain untracked because the environment blocked the cleanup operation. They are synthetic-only, excluded from commits/push, and not required to run the application.
- Resume by checking `git status -sb`, `git log -1`, and the remote tip. The user explicitly authorized pushing this branch; keep the branch separate from the default branch. Continue only the PARTIAL/OPEN items in `tasks/source-crosswalk-80.md`, and do not infer human UX acceptance from automated checks.

## Previous checkpoint — cost breakdown review-fix batch (2026-10-02)

### Prior review-fix checkpoint details

- Repository: `E:\COSTBREAKDOWN`; that review-fix batch used branch `current`, starting from `2a08e98395776080307cbc1791afd53e09bbce91`, which matched `origin/current` at the time.
- The batch implements the seven findings reviewed in ChatGPT “บูมเอง 4” and fixes the additional Low revision-comparison edge case. The follow-up review confirmed the Low finding is closed and reported no remaining concrete finding within this batch scope; it was not a new full-repository audit.
- Focused verifiers passed: `verify_scenario_input_mapping.ts`, `verify_dataset_sizing_preservation.ts`, `verify_dataset_sizing_noop.ts`, `verify_simulation_context.ts`, and `verify_cost_breakdown_review_feedback.mjs`. After the Low fix, `verify_simulation_context.ts` passed through the local Vite SSR loader because `tsx` is not installed and npm registry access was unavailable. `npm run build` and `git diff --check` passed. The build retains existing ExcelJS externalized `fs`/`crypto` warnings; Git reports the existing LF-to-CRLF working-copy warnings.
- Browser checks passed for the three dialogs: initial focus, Tab/Shift+Tab trap, Escape close, focus restoration, and rejection of a sizing count of 501. These automated and agent-run checks are not human acceptance.
- Human UX/UI acceptance for that batch remained pending. The user authorized committing and pushing that batch on `current`; no merge to the default branch was requested.
- Product behavior remains governed by `docs/REQUIREMENTS_INDEX.md` and the four current files in `agreements/`. This handoff records status and evidence, not new product requirements.

## Previous checkpoint summary (2026-10-01)

- The import/RCA follow-up started from clean `current` at `1ba82d396bc2251e04c7382161d449901a65d484`, matching `origin/current`; its implementation is `ee98cdd1a6a9e0e47c547fc3b8be1ca26eac8ff7`. The stale RCA revision fix is in `bd4d448`. ChatGPT's follow-up review of `64cf4f5` found no Medium/High mismatches and noted two Low items: orphan RCA state after deleting a product session and imprecise wording about Excel imports. The cleanup fix is in `6d58a15`; the current handoff and cross-cutting decision record those clarifications. Verify the live tip before continuing.
- ChatGPT “บูมเอง 4” reviewed the pushed range through `a487a8d` and found a Medium issue: applying unchanged Dataset Setup values still advanced Master Data revision and cleared RCA drafts. The focused fix is in `ff4f35b`; unchanged Apply and already-empty Reset now avoid writes, while real changes still update Master Data. Remote review confirmed the fix, and the targeted browser smoke evidence is recorded below.

## 2026-10-01 comparison-display review follow-up

- A source-only ChatGPT audit of pushed `current@f4a4153` found one Medium comparison-detail issue and two Low issues: changed fields were not exposed consistently, Routing could show Reference when a Current field was missing, warnings after the first three were not visible, and the earlier remote-review sentence was stale.
- Detailed comparison rows now expose every `fieldDiffs` value; Routing displays Reference and Current Sequence and Manning separately; missing Current-side labels no longer fall back to Reference. The snapshot card renders every warning, and the stale review sentence is updated.
- Local verification passed: `node scripts/verify_cost_breakdown_review_feedback.mjs` (server-rendered component checks), `npx jiti scripts/verify_snapshot_comparison_dynamic_fields.ts`, `npm run build` (2,028 modules; main entry 382.79 kB, no 500 kB advisory), and `git diff --check`. The build still reports the existing externalized `fs`/`crypto` imports from ExcelJS.
- `[Unverified]` ChatGPT did not execute tests in its audit. The legacy BOM/Routing/Work Center view verifiers could not resolve their TSX imports under the installed `jiti` runner. Browser smoke could not be completed: bundled Python lacks Playwright, and the isolated in-app browser timed out after the mock-fixture confirmation dialog.
- ChatGPT's review of pushed `9ffe4d1` confirmed the substantive comparison fixes, found no new High/Medium issue, and identified two Low follow-ups: stale build-size documentation and the warnings list being inside a `role="status"` live region. This checkpoint updates the documented main bundle size and limits that live region to the warning count.
- Follow-up verification passed: `node scripts/verify_cost_breakdown_review_feedback.mjs` confirms all five warnings render while only the warning-count summary is a live region; `npm run build` passed with 2,028 modules, a 382.79 kB main entry (95.96 kB gzip), and no 500 kB advisory; `git diff --check` passed. Existing externalized `fs`/`crypto` warnings remain.
- Human UX/UI acceptance remains pending.

## AI-side implementation delivered

1. **Template counts follow the selected dataset.** The modal displays saved `DatasetSizing` counts as read-only; users edit counts in Dataset Setup. Product identity fields remain editable.
2. **Generated sizing placeholders are omitted from dataset exports.** Export filters only rows with `isGeneratedSizingPlaceholder === true` in Work Center rates, BOM, and Routing. Incomplete rows without that marker remain exportable. Excel filter ranges use the same filtered rows. The round-trip verifier covers a Routing placeholder that otherwise has a sequence and Work Center.
3. **A development-only synthetic mock fixture is available.** “Load mock review data” resets the dedicated `ps-dev-review-fixture` session and preserves the previously active session. “Return to working session” restores it. The fixture provides unchanged, changed, added, and removed BOM/Routing rows and a changed Work Center rate.
4. **Excel actions load on demand.** Excel parsing, template creation, and export load only when used; the existing feature-page loading behavior stays unchanged. The browser-safe ExcelJS shims load at the action boundary. The production build no longer emits Vite's default `> 500 kB` chunk advisory. Do not increase the warning limit.
5. **Follow-up import and RCA fixes.** Data-bearing Work Center/BOM rows without a business code are retained with warnings; routing rows receive unique internal IDs when imported IDs collide; selected candidate, Trial handoff, and scenario drafts survive page navigation within the browser session while their source data stays unchanged.
6. **Stale RCA state is invalidated and cleaned up.** Existing product sessions carry a Master Data revision that advances on effective Master Data edits, snapshot imports into that session, Reference/Current copy operations, sizing changes, clears, and resets. Applying unchanged values or resetting already-unset sizing does not advance it. A revision mismatch clears the selected candidate, Trial handoff, and scenario drafts for that product; navigation still preserves them when the data has not changed. Legacy Excel import creates a new session ID, so it has no old RCA state to invalidate. Deleting a session prunes its orphaned RCA state.

The product choices and unresolved questions are recorded in [docs/CROSS_CUTTING_DECISIONS.md](docs/CROSS_CUTTING_DECISIONS.md). The four agreements remain authoritative.

## Verification on this checkpoint

- All 41 `scripts/verify_*.ts` verifiers passed on the preceding checkpoint. For commit `bd4d448`, `verify_simulation_context.ts`, `verify_master_data_clear_dataset.ts`, `verify_snapshot_routing_identity.ts`, `verify_rca_candidate_notes.ts`, `verify_rca_handoff.ts`, and `verify_scenario_draft.ts` passed. After the deletion cleanup in `6d58a15`, `npx jiti scripts/verify_simulation_context.ts` passed with coverage for pruning deleted product state. A fresh `verify_snapshot_import.ts` run under the local `jiti` runner failed before assertions while loading ExcelJS bare (`Cannot read properties of undefined`) during template generation; its earlier successful run is historical, not fresh verification of this follow-up.
- `npm run excel` passed: both generated workbooks passed formula shielding and template-input checks. The generated workbooks were removed after verification because they were new untracked outputs, not part of this change.
- The latest `npm run build` passed after the no-op sizing fix (2,026 modules): main entry 381.23 kB (95.61 kB gzip), snapshot parser 381.40 kB (128.46 kB gzip), ExcelJS bare 431.35 kB (123.19 kB gzip), and Excel stream 104.43 kB (32.67 kB gzip). It emits no `> 500 kB` advisory; the threshold was not changed. Vite still reports externalized `fs` and `crypto` imports from ExcelJS.
- Fresh focused checks passed after `ff4f35b`: `verify_dataset_sizing_noop.ts`, `verify_simulation_context.ts`, and `verify_dataset_sizing_preservation.ts`. The new no-op verifier covers unchanged and changed sizing/product values, Reset on configured sizing, and the modal's Apply/Reset guards. `git diff --check` passed before the fix commit.
- Production assets do not contain the mock fixture records, factory name, or development button label.
- Production-preview Template action was clicked with the latest assets; workbook generation completed and closed the dialog without a new browser exception. The browser harness did not expose a download event, so the saved file is not confirmed here. The user's UX/UI and flow-logic review remains pending. Automated verification and ChatGPT feedback are not human acceptance.
- An isolated in-app browser smoke check loaded the synthetic fixture, selected MAT-NEW, set Scenario A label/price and Trial handoff, navigated away and back, and confirmed all three persisted. Editing Current MAT-NEW price then returning to RCA reset the candidate; after reselecting it, the scenario inputs and Trial choice were blank. Multi-product switching and each individual mutation control were not separately exercised in the browser; per-product retention and state pruning have focused verifier coverage.
- A targeted browser smoke after `ff4f35b`, in a new agent-created tab using the development-only fixture, verified the sizing feedback cases: Apply with unchanged values preserved the candidate, Scenario A label/price, and Trial handoff; Reset with configured sizing cleared them; Reset when sizing was already unset preserved them; an actual sizing-count change and a Product UOM change each cleared them. The test used a separate browser session and did not touch the user's working session.
- `git diff --check` is part of the final pre-commit verification.

## Human review and remaining decisions

- **UX/UI and flow-logic review:** load mock review data in a development build and review the actual flows. After use, select “Return to working session.” The dedicated fixture session is retained for repeat review.
- **Import and `DatasetSizing`:** preserve the existing behavior until the owner defines how imports affect saved sizing. Do not infer configured counts from imported rows.
- **Current placeholders in Cost Breakdown:** keep the current display until UX review decides whether they should be visible.
- **Partial comparison:** remains deferred. Define its effect on totals, Gaps, and candidate findings before implementation.
- **Blank user-owned rows:** round-trip remains unresolved because an empty user row is indistinguishable from an empty template row in the workbook; do not change the import rule without an agreed representation or policy.
- Record any accepted product changes in the agreements, then implement only those decisions. Keep human acceptance separate from automated `PASS` results.

---

# Historical Handoff — Cross-device continuation (2026-09-29)

> The checkpoint below predates the local continuation above. Its branch instructions and statement that no application-code fix had been made are historical; use the current checkpoint at the top of this file.

## Branch checkpoint

- Repository: `C:\Users\ai-project\Desktop\SC0434\Cost Breakdown`; branch: `codex/rca-task-14`.
- Review base: `b3327a73795a255f49e981218f2f2a5ecb236efd`. At the start of this update, `HEAD` and freshly fetched `origin/codex/rca-task-14` matched this SHA and the worktree was clean.
- This handoff records the review results and continuation plan; no application-code fix has been made for the findings below. It has been committed and pushed. On the receiving device, fetch `origin` and verify `HEAD` against `origin/codex/rca-task-14` before continuing.
- Requirements authority: read `docs/REQUIREMENTS_INDEX.md`; the four files in `agreements/` are the product contract. This handoff records status and evidence, not new requirements.

## Review result — ChatGPT “บูมเอง 2” plus independent checks

The remote review is ready to report, but the branch is not ready to close as SPEC-complete. Two functional mismatches were reproduced against the review base:

1. **Sizing metadata can create a false `CHANGED` status.** Editing a generated sizing row sets `isGeneratedSizingPlaceholder: false` (`src/state/dataset-sizing.ts`), while snapshot comparison does not ignore that internal marker and compares it as a field (`src/core/calculations/snapshot-comparison.ts`). Status then becomes `CHANGED` despite equal business data and zero Gap (`src/core/calculations/comparison-status.ts`). A read-only probe reproduced this. `verify_sizing_placeholders_ignored` passes, but only covers untouched blank sizing rows; it lacks the cross-origin/equivalent-business-data case. Fix the comparison contract and add that regression case.
2. **Product Name is not used as the documented identity fallback for mismatch warnings.** `agreements/MASTER_DATA_FLOW_SPEC.md` §9 allows identifying information such as Product Code and/or Product Name and defines the mismatch warning as non-blocking. `src/core/calculations/master-data-handoff.ts` currently warns about missing codes but only compares codes. With both codes blank and different names, a probe produced no mismatch warning. Extend the warning logic and cover missing-code/same-name, missing-code/different-name, and missing-identifier cases.

Additional items to carry forward:

- **Navigation wording:** the navbar says “Candidate Selection” while the page and current requirement terminology say “Candidate Prioritization” (`src/shared/layout/Navbar.tsx`, `src/features/candidate-selection/CandidateSelectionPage.tsx`). Align the label.
- **All-filter behavior needs a product decision recorded in an Agreement.** The current agreements define All as select-all; the “บูมเอง 2” discussion captures a preference for a true select/deselect toggle with an indeterminate partial state. Current filters only select all and show no partial state (`CostBreakdownPage.tsx`, `CandidateSelectionPage.tsx`). Confirm/formalize the intended behavior, then apply consistently to both pages.
- **Custom `additionalFields` status policy is unspecified.** Current comparison treats differing extra fields as field differences and can mark a row `CHANGED`; Master Data Flow §74 leaves arbitrary-field behavior out of scope. Decide in the Agreement whether these fields affect canonical status or are retained for review only before changing behavior.

Confirmed matches include independent Reference/Current calculations, separate Status and Gap meanings, warnings outside canonical status, candidate calculations consuming canonical comparison findings, and RCA starting without an auto-selected candidate. Detailed Trial workflow remains outside current Agreement scope.

## Verification and limits

- Focused checks passed: `verify_sizing_placeholders_ignored`, `verify_master_data_handoff`, and `verify_candidate_prioritization`. The first two do not cover the reproductions above; add targeted regression tests rather than treating these passes as resolution.
- The full verifier sweep was 34/40. Six UI/store verifiers remain **Unverified** because the installed `jiti` runner fails to parse their TSX imports before assertions: `verify_bom_comparison_view`, `verify_direct_dataset_editing`, `verify_routing_comparison_view`, `verify_snapshot_comparison_view`, `verify_work_center_comparison_view`, and `verify_workspace_initialization`. This is a runner limitation, not evidence those behaviors pass or fail.
- Production build passed with Vite 6.4.3 using `npm run build -- --configLoader runner`; the existing large-bundle advisory remains. Prior representative-data browser flow is recorded in the historical audit below, but this review did not complete a fresh full UX/accessibility acceptance pass. No operational workbook was reviewed.

## Continue on the receiving device

If the repository is already cloned, open its project folder and run:

```powershell
git fetch origin
git switch codex/rca-task-14
git pull --ff-only origin codex/rca-task-14
git status --short --branch
git rev-parse HEAD
git rev-parse origin/codex/rca-task-14
```

Confirm the two SHAs match and the branch is clean, then read this handoff and `docs/REQUIREMENTS_INDEX.md`. If the repository is not cloned on that device, clone `https://github.com/apirak-k/COSTBREAKDOWN.git`, switch to `codex/rca-task-14`, and follow the same checks. Resume with the two reproduced fixes and regression tests above; resolve the two Agreement-level decisions before implementing those behaviors.

---

# Previous Handoff — Four-Agreement SPEC Audit (2026-09-29)

> Historical checkpoint superseded by the review findings above. The earlier “no confirmed mismatch” conclusion and the review-only prompt below are no longer current.

## Repository and Git state

- Active checkout: `C:\Users\ai-project\Desktop\SC0434\Cost Breakdown` on branch `codex/rca-task-14`.
- Starting SHA for the implementation follow-up: `bf339c24769715b33dcd9d76dd6af3b8226057b7`. Before preparing this reviewer handoff, local HEAD was `e8c874d`, six commits ahead of the cached local `origin/codex/rca-task-14` ref. The cached ref is not a live GitHub check; a direct GitHub query failed to connect. No push had been made at the time this handoff update was prepared.
- Local implementation commits, in order: `e8cd0e6` Comparison view alignment; `ecf806c` retain changed material findings; `8e382df` derive Processing candidates from Comparison findings; `9f07367` retain material candidates when attribution inputs are missing; `8732eeb` reconcile factor Reference/Current costs with Gap.
- Sections below this checkpoint are historical records from earlier checkout states.

## Four-Agreement audit and implementation

- **Master Data Flow:** audited the neutral dataset schema, independent Reference/Current datasets, import/clone/clear behavior, validation, comparison handoff, session handling, and export paths. No confirmed mismatch was found in the audited flow. The Agreement does not define round-tripping arbitrary extra workbook columns; the importer retains such fields internally while the neutral exporter emits the agreed schema.
- **Snapshot Comparison:** status and Gap remain independent; records match by business identity; missing values are not guessed; warnings remain separate from canonical statuses; and comparison totals reconcile. Cost Breakdown now uses snapshot comparison values. Processing candidates consume canonical Comparison findings instead of recalculating them.
- **Candidate Prioritization:** changed material findings remain visible, including zero-Gap and non-standard-factor changes. When Price/Loss/Usage attribution inputs are available, each row's Reference and Current are factor cost contributions, Gap equals Current minus Reference, and factor Gaps sum to the Comparison material Gap. Missing inputs preserve the finding and produce a null cost effect. Processing candidates preserve Comparison status and Gap.
- **RCA & Simulation:** no candidate is auto-selected; the user chooses from the candidate pool. Root Cause and Action are optional notes, not calculation inputs. A/B/C scenarios start from Current, use the shared Cost Engine and supported measurable overrides, and do not mutate the source snapshot. The user chooses the scenario for handoff. Detailed Trial workflow is outside the Agreement's implementation scope.

## Verification and handoff

- Focused `verify_candidate_prioritization`, `verify_comparison_reconciliation`, `verify_snapshot_full_flow`, and `verify_sizing_placeholders_ignored` passed after the final implementation change. Full `scripts/verify_*.ts` sweep: 34/40 passed.
- Six UI/store verifiers remain **Unverified** because the installed `jiti` runner fails to parse TSX imports before assertions: `verify_bom_comparison_view`, `verify_direct_dataset_editing`, `verify_routing_comparison_view`, `verify_snapshot_comparison_view`, `verify_work_center_comparison_view`, and `verify_workspace_initialization`. Treat these as runner-blocked, not as passing or as confirmed product defects.
- Production build passed with Vite 6.4.3 using `npm run build -- --configLoader runner`. The existing large-bundle advisory remains (1,715.22 kB JavaScript / 497.55 kB gzip). `git diff --check` passed.
- No populated browser visual review has been completed. The next step is human UX/UI and usage-logic acceptance using representative Reference/Current data, especially row badges/details, missing-input display, candidate factor costs, and RCA scenario behavior. Automated code/spec checks do not replace that review.
- AI-side code audit covered all four current Agreements and no confirmed mismatch remains in the audited implementation paths. This does not claim browser-level acceptance. No operational workbook was opened for this audit; fixtures were synthetic/tracked test data.

## Completed reviewer prompt (historical)

After this branch is pushed, inspect the latest remote `codex/rca-task-14` HEAD (verify its SHA; do not rely on a stale local tracking ref). Read `docs/REQUIREMENTS_INDEX.md` first, then audit all four current Agreements against the actual implementation, with particular attention to UX/UI and usage logic. Treat the agreements as the product contract and this handoff as status/context, not as proof of compliance.

Report each finding in three groups: **Matches** (Agreement clause plus code/UI evidence), **Mismatches** (expected versus actual behavior and a reproducible case), and **Unverified** (what could not be exercised and the concrete reason). Do not call a runner/load failure a product defect, and do not claim full runtime acceptance from a code review alone. Review only; make no edits and do not push.

Known verification limits to check independently: 34 of 40 verifier scripts passed; six UI/store scripts did not reach assertions because the local `jiti` runner could not parse TSX imports. Production build passed. No populated browser visual review or operational workbook review was performed. The Agreements do not define round-tripping arbitrary extra workbook columns; detailed Trial workflow is out of scope.

---

# Previous Handoff — Neutral Dataset Review Follow-up (2026-09-29)

> AI implementation and automated verification for this follow-up are complete; human review is the next step. Three implementation checkpoints and this handoff update are local. This follow-up has not been pushed.

## Repository and Git state

- Active checkout: `E:\COSTBREAKDOWN` on branch `codex/rca-task-14`.
- Starting checkpoint: `1a86cda`. The local tracking ref `origin/codex/rca-task-14` also pointed to `1a86cda` when this follow-up began; no live fetch or remote query was made. Treat that as local tracking information, not a live remote confirmation.
- Implementation checkpoints: `6efda54` (neutral master-data UI), `162d2a0` (legacy comparison fields), and `695ad42` (incomplete Product Code import). This handoff update is the fourth local commit after the starting checkpoint.
- No worktree was created or switched to for this follow-up. No push was performed; do not push without the user's explicit authorization.
- No operational workbook under `Sources` was opened, read, staged, or committed. The full-flow verifier reads only tracked mock fixtures in `public/`: `CostModel_SYNTHETIC_MOCK_v2.xlsx` and `CostModel_RGOM-024_v2.xlsx`.

## Existing neutral-dataset baseline

- The role-neutral workbook has exactly five sheets: `META`, `PRODUCT`, `WORK_CENTER`, `BOM`, and `ROUTING`, with the columns defined in `agreements/MASTER_DATA_FLOW_SPEC.md` §5.2. `META.Remark` and each record's `Note` survive import/export and web editing; notes are annotations, not identity or calculation inputs.
- Reference and Current remain independent editable datasets. Copying works in either direction; clearing one side does not clear the other. Dataset sizing preserves populated records.
- Routing records match by Operation Code only. Missing or duplicate keys remain validation findings; comparison statuses remain `UNCHANGED`, `CHANGED`, `ADDED`, and `REMOVED`.

## Completed in this follow-up

- Add Routing/BOM/Work Center forms now use the neutral fields and accept record-level `Note`; legacy Process Code, Source Reference, and Effective Date inputs were removed. The Work Center form labels its name field to match the neutral schema.
- Cost Breakdown no longer shows the Source Groups card or Work Center Source column. The Changed badge count now matches the existing Agreement-defined filter (`CHANGED` + `ADDED` + `REMOVED`).
- Neutral template downloads no longer include a Reference/Current suffix in the filename.
- Legacy `Process Code` and `Effective Date` values no longer create canonical comparison field differences. Process Code is also excluded from processing-candidate equivalence. Operation Code remains the sole Routing identity. Existing arbitrary imported-field review behavior and Note-only behavior remain intact.
- A canonical workbook with one Product row and a blank Product Code imports as editable starting data and retains the existing missing-code warning, instead of being rejected.

## Verification and limits

- Passed focused verifiers: `verify_snapshot_import`, `verify_snapshot_routing_identity`, `verify_snapshot_comparison_dynamic_fields`, `verify_candidate_prioritization`, `verify_comparison_reconciliation`, `verify_neutral_dataset_workbook`, and `verify_snapshot_full_flow`.
- `npm run build` passed with Vite 6.4.3; TypeScript completed and Vite transformed 1,687 modules. The build reports the existing large-bundle advisory (1,704.44 kB JavaScript / 496.51 kB gzip).
- `git diff --check` passed for the final handoff documentation diff and for staged changes before each implementation commit.
- No browser smoke or accessibility test was run in this follow-up. Human acceptance remains pending; automated checks do not establish acceptance.
- `npm run excel` was not run because its legacy script writes unrelated hardcoded cost-model workbooks. The modified import path was covered directly by `verify_snapshot_import`.

## Remaining boundary

- The importer still retains arbitrary extra workbook columns in internal `additionalFields`, while the neutral exporter emits only the agreed schema. The Agreement does not decide whether unknown columns should be rejected, ignored, or retained through export; do not claim arbitrary-column round-trip support until that is resolved.
- At handoff, the local tracking ref is still the starting SHA `1a86cda`; this branch contains four new local commits and has not been pushed. Human review of the changes is the next step.

---

# Historical Handoff — RCA & Simulation Agreement Work (2026-09-27)

> This checkpoint records the active implementation state. Earlier handoffs remain below as history.

## Repository and Git state

- Repository: `COSTBREAKDOWN`.
- Active worktree: `C:\Users\Boom\.codex\worktrees\rca-agreement\COSTBREAKDOWN`.
- Branch: `codex/rca-task-14`, created from `0d7079d`; later agreement-re-audit checkpoints are on this branch.
- The upstream tracking ref was `b81483f` at the start of this re-audit. Checkpoints `2c804d5` and `e83e092` contain the Comparison fixes; this handoff records the completed AI-side Agreement re-audit. The user authorized pushing after the re-audit and documentation closeout are complete.
- The original checkout at `E:\COSTBREAKDOWN` remains unchanged by this feature work.
- `origin/feature/taste-frontend-ui` remains a reference ancestor; this work does not switch to it.

## Goal and scope

The earlier implementation checklist records Tasks 1–18 as completed at their respective checkpoints. A later user-requested re-audit found Comparison gaps despite those checkboxes. This final AI-side re-audit checked the live code against all four current Agreement files; previous checkmarks and ChatGPT's review were treated as leads/evidence, not proof of full compliance. Human acceptance is tracked separately and remains pending.

The maintainability rule is recorded in `PROJECT_SPECIFIC.md`: shared behavior has one canonical implementation imported by consumers; reuse follows matching behavior and meaning; intentional local exceptions carry a nearby note; inspect callers before changing shared modules.

## Task status

- **Task 14 — implemented and verified:** RCA starts without a selected candidate; user chooses from the full candidate pool; optional Root Cause and Action notes are saved by candidate and excluded from numeric calculations. Removed the obsolete Ranking-driven selection path and dead UI/API. Deprecated persisted fields remain only for old-session compatibility.
- **Task 15 — implemented and verified:** independent A/B/C overrides for measurable BOM and Work Center inputs recalculate from the Current snapshot through the shared Standard Cost engine. Consumption is supported; structural edits remain excluded.
- **Task 16 — implemented and verified:** Gross Saving and improvement economics are calculated separately from Standard Cost; A/B/C remain comparable, with no automatic recommendation.
- **Task 17 — implemented and verified:** the user explicitly selects a scenario for handoff; Trial validation, actual-cost fields, baseline promotion, and their unused types are removed.
- **Task 18 — implementation verification complete and checkpointed locally:** synthetic browser workflow, focused checks, build, and final implementation review are recorded below.
- **Human acceptance — pending:** user review is still required; automated results do not establish acceptance.
- **HAWS security gate — cleared by automated audit:** SheetJS is on official 0.20.3 and Vite is on patched 6.4.3. `npm audit --audit-level=high` passes; two Moderate findings remain through ExcelJS/uuid.

## Task 14 verification

At Task 14 close, a fresh run in the active worktree passed all eight focused verifiers:

- `verify_candidate_prioritization`
- `verify_rca_record`
- `verify_rca_candidate_notes` — 8 checks
- `verify_simulation_context` (later refreshed to the Task 15 API and passed again in Task 18)
- `verify_scenario_draft`
- `verify_scenario_variables`
- `verify_snapshot_full_flow`
- `verify_snapshot_bridge`

`npm run build` passed: TypeScript and Vite completed; 1,689 modules transformed. Vite reports the existing large-chunk advisory (1,674.34 kB JavaScript output). `git diff --check` passed; Git reported line-ending normalization warnings only.

At Task 14 close, browser interaction remained unverified. Task 18 later covered the core flow in Chrome; keyboard, screen-reader, and human acceptance remain pending.

## Task 15 verification

Fresh checks in the active worktree passed:

- `verify_scenario_cost_overrides`
- `verify_scenario_input_mapping`
- `verify_scenario_draft`
- `verify_missing_work_center_rate`
- `verify_rca_candidate_notes` — 7 checks
- `npm run build` — TypeScript and Vite completed; 1,692 modules transformed
- `npm run excel` — generated workbook audit passed with zero errors
- `git diff --check` — passed; Git reported line-ending normalization warnings only

Scenario drafts are keyed by product and candidate. Each starts from Current, applies only supported numeric field overrides, and preserves missing values and structure. Scenario values were later browser-verified in Task 18.

## Task 16 verification

Fresh checks in the active worktree passed:

- `verify_scenario_variables` — economics formulas, missing inputs, zero volume, per-scenario isolation, and UI metric mapping
- Task 15 focused verifiers — scenario cost parity, input mapping, draft isolation, missing rate, and candidate-note separation
- `npm run build` — TypeScript and Vite completed; 1,691 modules transformed
- `npm run excel` — generated workbook audit passed with zero errors

Improvement economics reads only the scenario cost outputs and its own assumptions. It does not modify the Standard Cost calculation or inputs.

## Task 17 verification

- `verify_rca_handoff` passed. The Trial choice starts empty and requires a human selection.
- The Trial validation component, baseline-promotion store action, old what-if result types, and Trial validation record type have no remaining source callers and were removed.
- `npm run build` passed; TypeScript and Vite completed with 1,691 modules transformed.
- At Task 17 close, browser verification and human acceptance were pending; Task 18 later verified the core workflow, while human acceptance remains pending.

## Task 18 verification

- The xlsx skill read-only inspection confirmed the generated synthetic Reference and Current files use the canonical META, PRODUCT, WORK_CENTER, BOM, and ROUTING sheets, with one Product, four Work Centers, ten BOM rows, fifteen Routing rows, and no formula cells. The tracked mock workbook was not changed.
- Browser smoke covered Master Data, Cost Breakdown, Candidate Selection, and RCA & Simulation. Both imports reported four Work Centers, ten BOM rows, and fifteen Routing rows.
- Editing Current Product Code showed the mismatch warning while Compare remained available. Editing BOM item MAT-FILM-01 price to 60 produced a 7.5065 cost gap; Candidate Selection showed the same 7.5065 total.
- RCA opened with no selected candidate; a candidate was selected explicitly and notes were saved. Scenario A kept Current Standard Cost at 30.2215 and recalculated Scenario Standard Cost to 28.3465. Entering fixed investment did not change either Standard Cost. Trial handoff started blank and required an explicit choice; no Trial validation or actual-cost flow appeared.
- Browser reported no page errors or console errors. Synthetic workbook creation and browser fixtures stayed in the task visualization folder.

Fresh focused verification passed all 13 checks:

- `verify_simulation_context`
- `verify_rca_candidate_notes`
- `verify_rca_record`
- `verify_scenario_draft`
- `verify_scenario_cost_overrides`
- `verify_scenario_input_mapping`
- `verify_scenario_variables`
- `verify_missing_work_center_rate`
- `verify_rca_handoff`
- `verify_candidate_prioritization`
- `verify_snapshot_bridge`
- `verify_comparison_reconciliation`
- `verify_import_mismatch_export`

- The simulation-context verifier still uses current Task 15 scenario-draft APIs; it had become stale when that API changed and was repaired at this checkpoint.
- `npm run build` passed: TypeScript succeeded; Vite transformed 1,691 modules and built the application. The existing chunk-size advisory remains (1,670.44 kB JavaScript, 486.02 kB gzip).
- At Task 18 close, before the follow-up below, `npm audit --audit-level=high` reported five advisories (three Moderate, two High). The two High findings were prototype pollution and ReDoS in xlsx 0.18.5. The security remediation below closes that gate while preserving the import contract.
- Human acceptance remains pending. The automated browser pass and implementation review are evidence, not user acceptance.

## Agreement re-audit — 2026-09-28

### AI-side result

The four current files in `agreements/` were checked against the current implementation and available verification evidence. No confirmed Agreement mismatch remains in the AI-side review. This is implementation evidence, not human acceptance.

### Comparison

- Business-key matching uses the four agreed statuses. Missing or duplicate keys remain validation findings; they do not produce guessed matches or fabricated zero gaps.
- Row-level Material, Labor, and Burden effects reconcile to their branches; the branches reconcile to Total or surface an explicit unavailable/mismatch issue.
- Comparison tables and workbook rows use the shared finding effects. Material candidates consume comparison findings; processing candidates aggregate Routing detail by Work Center using the shared Routing cost calculator.
- Export read-back verifies row values and effect sums against the Summary gaps.

### Master Data

- Empty Reference and Current datasets remain usable. Direct entry/editing is independent by side; bidirectional cloning creates independent data.
- Per-side sizing and blank-row preservation, selected-side import replacement, non-blocking Product mismatch warnings, and export/import round-trip behavior match the current Master Data agreement.
- Untouched rows allocated by sizing are excluded from cost, comparison, and processing-candidate calculations. User-created blank rows still report missing inputs.
- Current-branch verifiers passed: `verify_direct_dataset_editing`, `verify_dataset_sizing_and_clone`, `verify_dataset_sizing_preservation`, `verify_sizing_placeholders_ignored`, `verify_import_mismatch_export`, `verify_master_data_handoff`, `verify_snapshot_import`, and `verify_workspace_initialization`.

### Candidate Prioritization and RCA & Simulation

- Candidates preserve the agreed status and gap meaning; processing candidates aggregate by Work Center.
- RCA requires the user to choose a candidate. Root Cause and Action notes are optional and separate from calculations. A/B/C scenarios start from Current and use the shared Standard Cost calculation; improvement economics remain separate. Trial handoff requires an explicit user choice.
- Current-branch verifiers passed: `verify_candidate_prioritization`, `verify_missing_work_center_rate`, `verify_rca_candidate_notes`, `verify_rca_handoff`, `verify_rca_record`, `verify_scenario_cost_overrides`, `verify_scenario_draft`, `verify_scenario_input_mapping`, `verify_scenario_variables`, `verify_simulation_context`, `verify_snapshot_bridge`, and `verify_snapshot_full_flow`.

### Navigation and final verification

- With no Reference/Current data, Cost Breakdown, Candidate Selection, and RCA & Simulation were opened in the browser; unavailable values and explanations appeared while navigation remained available. No user data was entered.
- Current-branch Comparison verifiers passed: `verify_comparison_reconciliation`, `verify_candidate_prioritization`, `verify_bom_comparison_view`, `verify_routing_comparison_view`, `verify_work_center_comparison_view`, `verify_snapshot_comparison_view`, and `verify_comparison_export`.
- A fresh `npm run build` passed: TypeScript succeeded and Vite built 1,689 modules. The existing large-bundle advisory remains (1,715.61 kB JavaScript, 499.06 kB gzip).
- The representative-data Chrome workflow was repeated after the latest Comparison and sizing-placeholder fixes. All four pages passed; the exact comparison/candidate gap remained 7.5065, the manual BOM row gap was 0.4375, the scenario changed 30.2215 to 28.3465 while Current stayed 30.2215, and there were no browser or console errors.
- The affected calculation/comparison verifiers passed: `verify_snapshot_quality`, `verify_snapshot_comparison_dynamic_fields`, `verify_comparison_reconciliation`, `verify_candidate_prioritization`, `verify_dataset_sizing_preservation`, `verify_scenario_cost_overrides`, `verify_snapshot_full_flow`, `verify_comparison_export`, and `verify_sizing_placeholders_ignored`.

### Evidence limits and acceptance

- The representative-data browser workflow passed after the latest fixes. Automated verification remains implementation evidence, not human acceptance; page-by-page human review is pending.
- No confirmed implementation gap remains from this AI-side audit.
- Do not promote unapproved audit suggestions into requirements.

## HAWS dependency security remediation (2026-09-27)

- Updated SheetJS to 0.20.3 from the official CDN tarball and Vite to 6.4.3, the first patched release listed by the reviewed Vite advisory. The existing React plugin supports Vite 6.
- Kept the existing parser modules, service API, and `.xls`/`.xlsx` upload contract. No application UI or agreement behavior changed.
- The package lock pins the official SheetJS URL and its SHA-512 integrity. The SheetJS CDN package is not an npm-registry package, so it is not represented in the registry-signature count.
- `npm audit --audit-level=high` passed with zero High/Critical findings. The full audit reports two Moderate findings through `uuid`/ExcelJS.
- `npm audit signatures` passed: 238 registry packages have verified signatures and 40 packages have verified attestations.
- `npm run build` passed with 1,688 modules transformed. Vite still reports the existing large-chunk warning (1,711.30 kB JavaScript, 498.13 kB gzip).
- `scripts/verify_snapshot_import.ts` passed with synthetic canonical `.xlsx` and `.xls` workbooks, legacy import, a non-blocking Product mismatch warning, and blank template rows ignored. The test's former blocking-mismatch and populated-template expectations were stale against the current agreement and template instructions; only those assertions were corrected.
- The verifier type-check passed, and `scripts/verify_import_mismatch_export.ts` passed export/import round-trip, non-blocking mismatch, comparison handoff, and replacement-side isolation.
- The operational RGOM workbook was not opened. Human acceptance remains pending for the user's page-by-page review.

## Resume point

The AI-side Agreement re-audit, implementation fixes, focused verification, browser replay, and evidence update are complete. The user authorized the normal push as the final repository action after this work is complete. Human acceptance remains pending.

---

# Historical Handoff — Master Data Sizing Preservation (2026-09-25)

> This was the current checkpoint at the time. The 2026-09-27 structure checkpoint above supersedes it; retain this record as history and verify its claims against the relevant commit.

## Repository and sync state

- Repository: `COSTBREAKDOWN`; remote `origin` is configured.
- Branch: `codex/snapshot-import-role-selector`.
- Base HEAD at task start: `f83d8d8`; the worktree was clean and the branch matched `origin`.
- The changes below are the current task's uncommitted work. No commit or push was made.

## Current task and scope

Implement the accepted Master Data rule in `agreements/MASTER_DATA_FLOW_SPEC.md` §7.2: reducing configured counts may remove only surplus unpopulated blank slots; populated records must remain.

## Implemented

- Replaced the `slice(0, target)` truncation for Rates, BOM, and Routing with `src/state/dataset-sizing.ts`. It removes only untouched generated placeholders and retains populated, manual, imported, zero-valued, and explicitly edited rows even when they exceed the configured target.
- Added a placeholder marker to snapshot and legacy row types, carried it through both session projection directions, and synchronized the projected legacy session when sizing changes. This preserves placeholder identity and blank BOM codes across reloads; generated null-to-zero defaults remain removable only while the marker is true.
- The three Master Data row update paths clear the marker. Editing then clearing a generated row therefore preserves that row on a later shrink.
- Updated `scripts/verify_master_data_handoff.ts` to match the current behavior: Product Code differences remain warnings, not comparison blockers; the header Product Code is not an independent gate.
- Updated this checkpoint. The detailed sizing design under `docs/superpowers/specs/` remains **Proposed**; its additional criteria were not implemented.

## Verification

- `scripts/verify_dataset_sizing_preservation.ts`, bundled with the installed esbuild runtime and executed with Node: **passed**. Covers all three sections, sparse and zero-valued inputs, user-edited blank rows, legacy IDs, generated defaults, session-projection round-trip, and growth.
- `node --experimental-strip-types scripts/verify_master_data_handoff.ts`: **passed**.
- `npm run build`: **passed**, 1,689 modules transformed. Vite still reports the existing bundle-size advisory (about 1.67 MB versus the 500 KB advisory threshold).
- Browser smoke on an isolated local session: set each count to 2, added one record per section (including a zero labor rate), reloaded, then reduced counts to 0. The generated rows disappeared; the user records remained and counts stayed synchronized after reload. A generated BOM row edited and cleared also remained blank and was retained after shrink and reload.
- [Unverified] Excel template/import/export round-trip was not exercised.

## Master Data status

- The confirmed data-loss defect on sizing reduction is fixed and verified through helper tests and browser interaction.
- This does not close all Master Data work. Older review items about blank-slot comparison/readiness and template count/max behavior remain outside this accepted fix; additional requirements in the **Proposed** sizing design still need review before implementation.
- Changes remain uncommitted and unpushed. The worktree is based on the current remote branch but only the base commit is available to another device.

## Resume point

Review the current diff and decide whether to continue with the separate Proposed sizing criteria or another accepted Master Data gap. Do not treat this sizing fix as overall Master Data acceptance, and do not push without explicit authorization.

---

# Historical Handoff — Adopt the New Cost Breakdown Agreement

**Updated:** 2026-09-24
**Repository:** E:\COSTBREAKDOWN
**Starting checkout:** branch codex/snapshot-import-role-selector, commit 161dc13

## Current agreement

The user designated all four documents under agreements/ as the current product agreement. See docs/REQUIREMENTS_INDEX.md for the authority order and summary.

The Comparison document retains its own “Working Specification” label. The user's instruction makes it part of the current agreement set for project work.

## Current implementation state

The repository contains code and documentation produced under earlier requirements. In particular, the previous Master Data plan recorded Tasks 1–6 as implemented and verified, including a Product context, role-aware Draft data, and a guarded handoff to Cost Breakdown. Those results describe the earlier behavior and are not acceptance of the new agreement.

The user designated all four agreement files as the current product contract. A static code-to-agreement audit is complete at `.planning/2569-09-24-agreement-gap-audit/findings.md`. The largest gaps are the Product-session Master Data flow, Comparison status/identity/reconciliation behavior, legacy Candidate Prioritization input, and RCA simulation's incomplete use of the agreed cost engine. Do not infer implementation completeness from old plans or test evidence.

The audit did not change application code and did not run tests or a build. The phased implementation roadmap is recorded at `.planning/2569-09-24-agreement-gap-audit/task_plan.md`; the implementation plan and 18-task checklist are in `tasks/plan.md` and `tasks/todo.md`.

## Documentation cleanup

The agreement set and requirements index are the active behavior references. Earlier conflicting page specifications, cross-page designs, task plans, analysis/review documents, old diagrams, and dated handoffs were removed from the working tree. Concise project context, safeguards, quality constraints, and this checkpoint remain.

## Prior verification evidence

The 2026-09-23 handoff recorded successful build, Excel model, focused verifier, and synthetic browser checks for the previous implementation. Those checks were not rerun during this documentation cleanup and do not verify the new agreement.

## Task 1 Completion Checkpoint (2026-09-24)

### Implemented Scope
- Replaced seeded first-use session data with empty initial workspace (`makeEmptySession`, `createEmptySnapshotPair`, `emptyProductMaster`).
- Fresh browser session starts with empty Reference and Current datasets; `resetToDefault` and `clearAllData` reset the active session back to independent empty Reference and Current datasets with `preparedSnapshotRoles: { reference: false, current: false }`.
- Session data is persisted exclusively in `sessionStorage` via `src/services/storage/session-storage.ts`, so closing the browser tab/session clears working data.
- Isolated mutation boundaries: modifying Reference does not mutate Current; cloning Reference to Current creates a deep independent copy, ensuring edits to Current do not mutate Reference.

### Verification Evidence
- Focused Verifier: `scripts/verify_workspace_initialization.ts` executed and passed (`npx tsx scripts/verify_workspace_initialization.ts`).
- Regression Verifier: `scripts/verify_master_data_handoff.ts` executed and passed (`npx tsx scripts/verify_master_data_handoff.ts`).
- Type check & Build: `npm run build` completed cleanly (0 errors, 1685 modules transformed).

### Noted Risks & Observations
- Master Data editing components still enforce `status === 'draft'` gating pending Task 2. Task 2 must remove version status gating (`status === 'draft'`, Draft/Active/Archived badges, clone/activate controls) from Master Data per Section 2 & 10 of `agreements/MASTER_DATA_FLOW_SPEC.md`.
- `evaluateMasterDataHandoff` currently enforces matching Header Product Code between Reference and Current; Task 4 will address turning product mismatch into a non-blocking warning.
- Scope boundaries were strictly observed: Task 2 was not started, and unrelated files/documentation were not modified.

## Task 2 Completion Checkpoint (2026-09-24)

### Implemented Scope
- Removed version lifecycle gating (`activeSession.status !== 'draft'`) from store mutation methods: `updateMasterDataDataset`, `updateMasterDataProduct`, and `cloneReferenceToCurrent`.
- Enabled direct adding, editing, and deleting of Product, Work Center, BOM, and Routing data on either side (Reference and Current) at any time.
- Removed lifecycle UI artifacts from Master Data: Draft/Active/Archived badges, "Clone to Draft" and "Activate Draft" buttons, draft warning alert banners, and dataset status displays.
- Made Product Code directly editable in Edit Mode within `ProductMasterCard.tsx` so users can enter or modify product codes manually without wizard setup.
- Maintained independent copy semantics in `cloneReferenceToCurrent`: cloning Reference creates an isolated deep copy on Current that can be edited, added to, or deleted from without mutating Reference.

### Verification Evidence
- Focused Verifier: `scripts/verify_direct_dataset_editing.ts` created and executed successfully via `npx tsx`:
  - Verified manual entry on Reference works without status gate and does not mutate Current.
  - Verified Reference -> Current produces independent copy; editing Current preserves Reference.
  - Verified adding and deleting rows on Current works independently of Reference.
  - Verified lifecycle gating removed: direct dataset editing does not require draft status.
- Regressions check: `scripts/verify_workspace_initialization.ts` executed and passed.
- Type check & Build: `npm run build` completed cleanly (0 errors, 1685 modules transformed).

## Phase 1 Completion Checkpoint (Tasks 1–5, Master Data) (2026-09-24)

### Implemented Scope
- **Task 1:** Replaced seeded demo data with clean empty initial state (`makeEmptySession`, `createEmptySnapshotPair`, `emptyProductMaster`). Browser tab session storage isolation via `sessionStorage`.
- **Task 2:** Removed lifecycle status gating (`status === 'draft'`) from store mutations (`updateMasterDataDataset`, `updateMasterDataProduct`, `cloneReferenceToCurrent`). Removed obsolete badges/buttons/banners from UI and made Product Code editable.
- **Task 3:** Implemented full Working Dataset replacement on Excel import. Importing into Reference replaces only Reference; importing into Current replaces only Current; manual data is not merged.
- **Task 4:** Converted Product Code/Name mismatch during import and comparison handoff from blocking errors to non-blocking advisory warnings. Comparison can proceed even with differing product codes per agreement Section 9. Missing calculation inputs remain warnings and are not coerced to zero.
- **Task 5:** Added full dataset export (`exportSnapshotToExcel` in `src/services/excel/snapshot-export.ts`) via "Export Dataset" button on Master Data page. Round-trip export/import verified.

### Verification Evidence
- `scripts/verify_workspace_initialization.ts` passed.
- `scripts/verify_direct_dataset_editing.ts` passed.
- `scripts/verify_import_mismatch_export.ts` passed:
  - Verified Export -> Import round-trip preserves Product, Rates, BOM, and Routing.
  - Verified Product mismatch is a non-blocking warning for both import and comparison handoff.
  - Verified import replaces selected side without affecting opposite side.
- Build: `npm run build` passed cleanly (0 errors, 1686 modules transformed).

## Phase 2 Completion Checkpoint (Tasks 6–10, Comparison & Reconciliation) (2026-09-24)

### Implemented Scope
- **Task 6 (Canonical 4 Statuses):** Standardized exact comparison statuses `UNCHANGED`, `CHANGED`, `ADDED`, `REMOVED` via `CanonicalComparisonStatus` in `src/core/calculations/comparison-status.ts`. Reordering rows or sequence changes remain details under `CHANGED`. Ambiguous/duplicate keys produce validation warnings without guessing matches.
- **Task 7 (Absent-side zero & Record-level effects):** Updated `src/core/calculations/snapshot-bom-detail.ts`, `src/core/calculations/snapshot-routing-detail.ts`, and `snapshot-comparison.ts` to compute record effects as `Current - Reference` with absent-side zero (`0 → Current` for ADDED, `Reference → 0` for REMOVED) without coercing missing required calculation values (null remains null).
- **Task 8 (Explicit Reconciliation):** Implemented `ComparisonReconciliation` in `src/core/calculations/snapshot-comparison.ts` checking `totalGap === materialGap + laborGap + burdenGap` within 0.0001 tolerance, emitting `RECONCILIATION_MISMATCH` warning when violated.
- **Task 9 & 10 (Comparison view, status filters, and export alignment):**
  - Updated `comparison-view.ts` and `CostBreakdownPage.tsx` to support canonical status filters (`all`, `changed`, `added`, `removed`, `unchanged`) with real-time record counts.
  - Aligned `src/services/excel/comparison-export.ts` with canonical 4 statuses and verified export model generation.

### Verification Evidence
- `scripts/verify_comparison_reconciliation.ts` passed:
  - Verified 4 canonical statuses.
  - Verified absent-side zero calculation for ADDED ($0 \to \text{Cur}$) and REMOVED ($\text{Ref} \to 0$).
  - Verified exact reconciliation (`Material + Labor + Burden = Total Gap`).
  - Verified status filtering logic in `comparison-view.ts`.
- `scripts/verify_snapshot_comparison_view.ts` passed.
- `scripts/verify_import_mismatch_export.ts` passed.
- Build: `npm run build` completed cleanly (0 errors, 1686 modules transformed).

## Phase 3 Completion Checkpoint (Tasks 11–13, Candidate Prioritization) (2026-09-24)

### Implemented Scope
- **Task 11 (Material Candidates):** Implemented `buildMaterialCandidates` in `src/core/calculations/material-candidates.ts`. Converts meaningful material comparison findings into candidates with `CHANGED/ADDED/REMOVED` statuses. Unchanged materials do not become candidates. Multiple changed factors (Price, Loss, Usage) are exposed as distinct factor candidates. Added items calculate Reference = 0; Removed items calculate Current = 0.
- **Task 12 (Processing Candidates aggregated by Work Center):** Implemented `buildProcessingCandidates` in `src/core/calculations/processing-candidates.ts`. Aggregates Reference and Current processing costs by Work Center. Uses `Current - Reference` gap without requiring 1:1 Routing step matching or manual split/merge mapping. Different Routing structures still aggregate to clean Work Center candidates.
- **Task 13 (Consolidated candidates, ranking, and controllability):**
  - Implemented `buildPrioritizationCandidates` in `src/core/calculations/candidate-prioritization.ts` sorting candidates descending by Gap (+Gap -> -Gap) while keeping zero and negative gaps visible.
  - All candidates start with `controllable = true` by default. Unchecking `Controllable` updates the state without removing or hiding the row.
  - Simplified `CandidateSelectionPage.tsx` and created `CandidatesTable.tsx` & `CandidateRow.tsx` displaying only agreed fields: Rank, Candidate / Finding, Status (`CHANGED/ADDED/REMOVED`), Reference, Current, Gap (THB), and Controllable.
  - Removed all Action, Root Cause, Requirement Fit, and Feasibility controls from Candidate Prioritization.

### Verification Evidence
- `scripts/verify_candidate_prioritization.ts` created and passed:
  - Verified Material candidate generation, factor breakdown, and absence of unchanged items.
  - Verified Processing candidates aggregated by Work Center without 1:1 Routing match.
  - Verified default `controllable: true` and descending Gap sort.
  - Verified status filtering (`all`, `CHANGED`, `ADDED`, `REMOVED`).
- Regressions check: `scripts/verify_import_mismatch_export.ts` and `scripts/verify_comparison_reconciliation.ts` both passed.
- Build: `npm run build` completed cleanly (0 errors, 1687 modules transformed).

## Current status (2026-09-28)

- Tasks 1–18 and the Agreement re-audit are implemented and verified on `codex/rca-task-14`.
- The final sizing-placeholder regression, affected focused verifiers, production build, and representative-data browser workflow passed.
- The user asked for the push after all work is complete; human acceptance remains pending their review.

## Open specification boundary

The current agreements hand off to Trial but do not define its validation or baseline-promotion workflow. The stable Routing business key for rows without Operation Code or Process Code also needs agreement. Keep Trial behavior and future financial metrics out of scope until specified.
