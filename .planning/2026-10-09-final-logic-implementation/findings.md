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

## Phase 9 findings

- Simulation now presents its source and Current comparison basis, six factor controls, identity-aware Current/SIM parameter rows, and full-snapshot cost results.
- The factor checkboxes control which SIM-side values can be edited. They do not filter the calculation. Parameter edits continue through the Phase 8 engine and the shared Standard Cost calculation.
- ADDED rows have a SIM-side record and can be edited; REMOVED rows have no SIM-side record and render without an editor. Ambiguous and unmatched identities remain visible as issues and cannot be edited.
- A temporary UI preview confirmed the SIM input changes without changing Current. With no Routing rows in that deliberately minimal preview, the shared engine reported missing Routing and left Standard Cost / Parameter Saving unavailable; no fallback value was fabricated.

## Phase 10 findings

- Economic Simulation keeps Action Cost and Evaluation Quantity outside the shared Standard Cost calculation. Required Saving / pc is calculated only from finite Action Cost and a positive Evaluation Quantity; zero or negative quantity and non-finite results are unavailable with a calculation note.
- Economic-only analysis works after starting a SIM even when no Parameter factors are selected or edited. Required Saving is independent; Economic Margin remains unavailable until Parameter Saving is available.
- Blank Selling Price and SG&A overrides use Current snapshot values. A non-finite nonblank override stays unavailable and does not silently fall back. Existing `calculateScenarioBusinessMetrics` remains the single implementation of SG&A Amount and OP; negative OP remains a numeric loss.
- With no override entered, commercial metrics unavailable in Current are omitted from the compact output; invalid calculations remain available under collapsed Calculation notes. This avoids presenting repeated empty fields.
- `design.md` still requires the three-state Reference → Current → Simulated story graph. The older A/B comparison selector can be retired, but the compatible three-state story must be retained in active Simulation.

## Phase 11 findings

- The three-state story graph is now an active Simulation component. It receives Reference, Current, and the full-calculation active SIM values; gaps remain adjacent (`Current − Reference`, `Simulated − Current`).
- The graph owns the Selling Price, SG&A, and OP display for all three states. Economic Simulation owns only Action Cost, Evaluation Quantity, Required Saving, and advisory Economic Margin. Parameter Saving is shown once, with duplicated MAT/LB/BD/Standard Cost details available on demand.
- `src/features/rca-simulation` and its old A/B cost/economics calculators had no active product route or legitimate active caller after Phase 7. The whole feature was removed; its historical script checks now target the current architecture.
- Legacy saved `candidateRcaRecords` remain readable only by the one-way migration into `rcaCases`; the store no longer exposes the old per-Candidate notes or write method. Legacy persisted source fields remain intact for migration compatibility.
- A repository search of active `src/` found no old A/B, Trial, categorized economics, Work Center rate override, or `rca-simulation` references. The separate legacy storage migration is intentionally retained.

## Baseline verification discoveries

- `npm run build` passed at baseline (`tsc -b && vite build`; exit 0). Vite emitted the existing ExcelJS `fs`/`crypto` browser-externalization warnings; 2,035 modules transformed.
- All applicable current verifiers passed at baseline: 49 TypeScript + 2 MJS = 51/51, including `verify_neutral_dataset_workbook.ts` for the canonical four-sheet workbook.
- `git diff --check` passed. It reported only Git's line-ending notice for `.planning/.active_plan` (LF will be converted to CRLF), not a whitespace error.
- There are 53 tracked `verify*` scripts. A repository CJS TypeScript-verifier shim exists under the original checkout's ignored `node_modules/.cache/codex-cbd-verifiers-20261006-final/` and `jiti` is installed.
- The legacy `scripts/build_excel_models.js` generates populated operational-looking model workbooks and `npm run excel` invokes that generator. Do not run it as a baseline check because it writes generated workbook files and its source includes detailed operational data. Prefer read-only verifiers for the canonical neutral workbook path and record legacy model coverage separately.
- The two legacy Excel model verifiers do not validate the current canonical workbook path: the v1 verifier requires root workbook files that are absent; the v2 verifier targets the superseded five-sheet workbook. They were excluded. The canonical neutral workbook verifier passed.

## Phase 1 A–H Audit Results

Read-only audit of checklist Sections A–H at branch codex/final-logic-implementation, HEAD 1e4bdbf35f8ade3ab1c5d4f97d51f80cdc107f8d.

No verifier commands were run during this audit. Test references below are existing test-source evidence inspected statically, not execution results. The working-tree task_plan.md modification was already present and was not made by this audit. The pre-existing src/graphify-out/ entry was left untouched during this append.

### Evidence keys

Each section’s Spec key supplies the precise spec evidence for every ID in that section.

| Key | Spec evidence |
|---|---|
| SA | docs/REQUIREMENTS_INDEX.md#L5-L49; docs/specs/FINAL_LOGIC_SPEC.md#L10-L51 |
| SB | docs/specs/FINAL_LOGIC_SPEC.md#L136-L255; docs/specs/CROSS_CUTTING.md#L15-L52 |
| SC | docs/specs/FINAL_LOGIC_SPEC.md#L259-L311; docs/specs/MASTER_DATA.md#L5-L52 |
| SD | docs/specs/MASTER_DATA.md#L35-L52; docs/specs/FINAL_LOGIC_SPEC.md#L280-L293 |
| SE | docs/specs/MASTER_DATA.md#L54-L73; docs/specs/FINAL_LOGIC_SPEC.md#L287-L293 |
| SF | docs/specs/MASTER_DATA.md#L98-L107; docs/specs/FINAL_LOGIC_SPEC.md#L295-L311 |
| SG | docs/specs/MASTER_DATA.md#L109-L131; docs/specs/FINAL_LOGIC_SPEC.md#L313-L327 |
| SH | docs/specs/MASTER_DATA.md#L133-L165; docs/specs/FINAL_LOGIC_SPEC.md#L328-L337 |

| Code key | Code evidence |
|---|---|
| C0 | Authority/provisional policy is documented in SA; these IDs do not describe runtime behavior. |
| C1 | Active dataset shape and data flow: src/core/types/product.types.ts#L63-L105; src/core/types/snapshot.types.ts#L70-L102; src/state/master-data-datasets.ts#L69-L140; src/state/store.tsx#L531-L542. |
| C2 | Legacy parallel path: src/state/store.tsx#L28-L45, #L449-L475, #L525, #L1465, #L1548; src/core/calculations/cost-engine.ts#L25-L110; src/state/working-datasets.ts#L11-L57; src/core/calculations/key-based-comparison.ts#L18-L142. |
| C3 | Canonical calculations and comparisons: src/core/calculations/snapshot-cost.ts#L16-L160; src/core/calculations/snapshot-comparison.ts#L140-L259, #L297-L320, #L473-L596; src/core/calculations/comparison-status.ts#L11-L25; src/features/cost-breakdown/components/SnapshotComparisonCard.tsx#L75-L127; src/features/simulation/simulation-engine.ts#L81-L90. |
| C4 | Master Data actions: src/state/store.tsx#L788-L869, #L1331-L1367; src/state/clear-master-data-dataset.ts#L10-L56; src/features/master-data/components/MasterDataWorkspaceHeader.tsx#L81-L113, #L267-L334. |
| C5 | Clone: src/state/master-data-datasets.ts#L30-L67; UI destination/source: src/state/store.tsx#L959-L965; src/features/master-data/components/MasterDataWorkspaceHeader.tsx#L281-L302. |
| C6 | Sizing and imports: src/state/dataset-sizing.ts#L18-L56, #L191-L214; src/state/store.tsx#L967-L1057, #L1331-L1367; src/features/master-data/components/DatasetSizingModal.tsx#L32-L108, #L215-L235; src/features/master-data/dataset-sizing-form.ts#L6-L39. |
| C7 | Workbook/parser: src/services/excel/master-data-workbook.ts#L41-L94, #L104-L153, #L216-L224; src/services/excel/snapshot-parser.ts#L381-L419, #L425-L492, #L509-L560. |
| C8 | Table interaction code: src/features/master-data/hooks/useTableKeyboardNav.ts#L57-L273; useDragSelect.ts#L16-L103; useSpreadsheetEditing.ts#L25-L64; table components under src/features/master-data/components/. |
| C9 | Master Data UI/search/validation: src/features/master-data/MasterDataPage.tsx#L57-L60, #L191-L317; BOMTable.tsx#L37-L54, #L126-L130; RoutingTable.tsx#L38-L60, #L130-L135, #L245-L263; table-validation.ts#L1-L42. |
| C10 | Reordering and structural handlers: src/state/store.tsx#L97-L114, #L1059-L1225; src/features/master-data/components/BOMTable.tsx#L185-L186, #L323-L343. |
| C11 | Shared UI state: src/features/master-data/master-data-ui-state.ts#L1-L34; src/state/store.tsx#L385-L407, #L488-L495; src/features/master-data/MasterDataPage.tsx#L197-L225, #L241-L262. |
| C12 | Session storage: src/state/store.tsx#L385-L398, #L488-L495; src/services/storage/session-storage.ts#L14-L28. |
| C13 | Workbook label mismatch: src/services/excel/master-data-workbook.ts#L133-L144; verifier expectation: scripts/verify_neutral_dataset_workbook.ts#L136-L141. |

| Test key | Existing test-source evidence |
|---|---|
| T0 | No application test applies to documentary authority requirements. |
| T1 | scripts/verify_numeric_integrity.ts#L56-L165; scripts/verify_snapshot_quality.ts#L32-L103; scripts/verify_snapshot_bom_detail.ts#L1-L31; scripts/verify_snapshot_routing_detail.ts#L1-L49. |
| T2 | scripts/verify_comparison_reconciliation.ts#L90-L208; scripts/verify_snapshot_comparison_dynamic_fields.ts#L171-L216; scripts/verify_snapshot_routing_identity.ts#L40-L158. |
| T3 | scripts/verify_workspace_initialization.ts#L9-L92; scripts/verify_master_data_custom_dataset.ts#L44-L102; scripts/verify_master_data_clear_dataset.ts#L87-L135. |
| T4 | scripts/verify_dataset_sizing_noop.ts#L1-L60; scripts/verify_dataset_sizing_preservation.ts#L130-L247, #L267-L299; scripts/verify_sizing_placeholders_ignored.ts#L62-L150. |
| T5 | scripts/verify_master_data_custom_dataset.ts#L87-L102; scripts/verify_master_data_clone_readiness.ts#L20-L110. These exercise Custom↔Current; they do not cover all six Clone From directions. |
| T6 | scripts/verify_import_mismatch_export.ts#L233-L246; scripts/verify_neutral_dataset_workbook.ts#L65-L88, #L220-L379. |
| T7 | scripts/verify_neutral_dataset_workbook.ts#L112-L211, #L220-L379. |
| T8 | scripts/verify_master_data_edit_history.ts#L1-L113; scripts/verify_master_data_ui_state.mjs#L141-L237. |
| T9 | scripts/verify_cost_breakdown_review_feedback.mjs#L258-L312. |
| T10 | scripts/verify_candidate_prioritization.ts#L308-L329. |
| T11 | scripts/verify_master_data_spreadsheet_batch.ts#L1-L50; this tests batch preparation, not browser event handling. |

### A. Authority and Architecture

All A IDs use SA.

| ID | Status | Code evidence | Test evidence |
|---|---|---|---|
| A-01 | PASS | C0 | T0 — documentary requirement |
| A-02 | PASS | C0 | T0 — documentary requirement |
| A-03 | PASS | C0 | T0 — documentary requirement |
| A-04 | PASS | C0 | T0 — documentary requirement |
| A-05 | FINDING | C2 | verify_numeric_integrity.ts#L1-L8, #L68-L80 exercises legacy calculations; no test confirms those results are excluded from active application logic. |
| A-06 | FINDING | C1, C2 | T3 verifies canonical snapshots, but no test excludes the parallel legacy Reference/Current WorkingDataset state. |
| A-07 | PASS | C1, C3 | T1, T2; canonical snapshot cost feeds CBD and Simulation. |
| A-08 | FINDING | C2, C3 | verify_numeric_integrity.ts#L1-L8, #L68-L80 directly tests the legacy engine as well as canonical calculations. |
| A-09 | PASS | C1, C3 | verify_snapshot_full_flow.ts; verify_snapshot_comparison_view.ts; T3 verifies Custom’s separation from the Ref/Cur pair. |

### B. Shared Calculation and Identity Rules

All B IDs use SB. Tests are T1/T2 unless otherwise specified.

| ID | Status | Code evidence | Test evidence |
|---|---|---|---|
| B-01 | PASS | C3 — BOM key uses normalized description (parser’s Name field). | T2 |
| B-02 | PASS | C3 — Work Center key uses normalized workCenterCode. | T2 |
| B-03 | PASS | C3 — Routing key uses normalized processName. | T2 |
| B-04 | PASS | C3 — matching uses business keys, not row indices or sequence. | T2 |
| B-05 | PASS | C3 — duplicate identities produce ambiguous findings/warnings. | T2 |
| B-06 | PASS | C3 — missing identities stay unmatched and warn. | T2 |
| B-07 | PASS | C3 — note fields are excluded from business diffs. | T2 |
| B-08 | PASS | C3 — canonical status mapping returns only the four required statuses or null for ambiguous/missing records. | T2 |
| B-09 | PASS | C3 | T2 |
| B-10 | PASS | C3 — status and cost gap are computed separately. | T2 |
| B-11 | PASS | C3 | T1, T2 — includes zero total Gap, positive/negative absent-side effects, and unavailable effects. |
| B-12 | PASS | C3 | T1 |
| B-13 | PASS | C3 | T1 |
| B-14 | PASS | C3 | T1 |
| B-15 | PASS | C3 | T1 |
| B-16 | PASS | C3 | T1 |
| B-17 | PASS | C3 — Conversion is presented as Labor + Burden. | T1, T2 |
| B-18 | PASS | C3 — total is Material + Labor + Burden. | T1, T2 |
| B-19 | PASS | C3 — the subtotal is not added again to Standard Cost. | T2 |
| B-20 | PASS | C3 | T1 |
| B-21 | PASS | C3 | T1 |
| B-22 | PASS | C3 | T1 |
| B-23 | PASS | C3 | T1 |
| B-24 | PASS | C3 | T1 |
| B-25 | PASS | C3 | T1 |
| B-26 | PASS | C3 | T2 |
| B-27 | PASS | C3 | T2 |

### C. Master Data Workspace Model

All C IDs use SC.

| ID | Status | Code evidence | Test evidence |
|---|---|---|---|
| C-01 | PASS | C1 | T3 |
| C-02 | PASS | C1, C3 | T3 |
| C-03 | PASS | C1, C3 | T3 |
| C-04 | PASS | C1 — Custom has no fixed business role. | T3 |
| C-05 | PASS | C1 | T3 |
| C-06 | PASS | C1 | T3 |
| C-07 | PASS | C1 | T3 |
| C-08 | PASS | C1 — all three actual workspaces use CostSnapshot. | T3 |
| C-09 | PASS | C1, C4 | T3 |
| C-10 | NOT VERIFIED | C1, C4 — save path exists. | No focused test of Save creating an independent Last Saved copy for each role. |
| C-11 | PASS | C1, C4 | T3 |
| C-12 | PASS | store.tsx#L228-L242, #L385-L398; seed-data.ts#L110-L145. | verify_workspace_initialization.ts#L9-L39; verify_master_data_ui_state.mjs#L141-L153. |
| C-13 | PASS | MasterDataPage.tsx#L14-L60; MasterDataWorkspaceHeader.tsx#L90-L148; Navbar.tsx#L21-L54. | verify_master_data_ui_state.mjs#L141-L177 renders the direct Master Data entry state. |
| C-14 | NOT VERIFIED | MasterDataWorkspaceHeader.tsx#L90-L148; product metadata is in Sizing rather than a separate selector. | No assertion specifically verifies absence of a separate Product selector. |
| C-15 | PASS | C11 | verify_master_data_ui_state.mjs#L141-L153 |
| C-16 | PASS | MasterDataPage.tsx#L191-L195, #L302-L317 | verify_master_data_ui_state.mjs#L160-L177 |
| C-17 | PASS | C9, C11 — any table can be selected directly. | verify_master_data_ui_state.mjs#L212-L217 verifies a single Routing table view can be selected. |
| C-18 | PASS | C1, C3 — CBD comparison is computed from the active snapshot pair, without reading Last Saved. | verify_snapshot_full_flow.ts; verify_snapshot_comparison_view.ts. |
| C-19 | FINDING | C12 | No test checks a fresh application restart clears Master Data data. |

### D. Master Data Actions

All D IDs use SD.

| ID | Status | Code evidence | Test evidence |
|---|---|---|---|
| D-01 | NOT VERIFIED | C4 | No focused Save-scope test. |
| D-02 | NOT VERIFIED | C4 | No focused Working→Last Saved test. |
| D-03 | NOT VERIFIED | C4 | No test verifies Save leaves the other datasets unchanged. |
| D-04 | NOT VERIFIED | C4 | No focused Reset-scope test. |
| D-05 | NOT VERIFIED | C4 | No focused Last Saved→Working test. |
| D-06 | PASS | C4, C6 | verify_import_mismatch_export.ts#L233-L246 verifies selected-side replacement and opposite-side preservation. |
| D-07 | NOT VERIFIED | C4, C6 | No focused test verifies import leaves Last Saved unchanged. |
| D-08 | PASS | C6 | T4, T6 |
| D-09 | NOT VERIFIED | C4, C7 — export receives the lastSavedSnapshot. | No test verifies the UI action exports the viewed Last Saved snapshot. |
| D-10 | NOT VERIFIED | C4, C7 | No test changes Working after Save and asserts the exported workbook still uses Last Saved. |
| D-11 | PASS | C4 | verify_master_data_clear_dataset.ts#L87-L128; verify_master_data_custom_dataset.ts#L66-L72. |
| D-12 | PASS | C4 | Same clear tests assert metadata, remark, rows, and Sizing reset. |
| D-13 | PASS | C4 | verify_master_data_clear_dataset.ts#L88-L91, #L110-L113; verify_master_data_custom_dataset.ts#L67-L70. |
| D-14 | PASS | C4 | verify_master_data_clear_dataset.ts#L92-L106, #L114-L128; verify_master_data_custom_dataset.ts#L70-L72. |

### E. Generic Clone From

All E IDs use SE.

| ID | Status | Code evidence | Test evidence |
|---|---|---|---|
| E-01 | NOT VERIFIED | C5 — UI wording is Clone From. | No focused UI test of generic action wording. |
| E-02 | PASS | C5 — viewed role is destination. | T5 |
| E-03 | NOT VERIFIED | C5 — UI offers the other roles as source. | No focused test of source-choice UI. |
| E-04 | PASS | C5 — clone helper copies source snapshot to destination Working. | T5 verifies Current→Custom and Custom→Current. |
| E-05 | PASS | C5 — helper leaves destination Last Saved fields untouched. | T5 |
| E-06 | PASS | C5 — clone deep-copies the source data. | T5 |
| E-07 | PASS | C5 — Sizing is copied. | T5 |
| E-08 | PASS | C5 — readiness is recalculated from copied content. | verify_master_data_custom_dataset.ts#L95-L101; verify_master_data_clone_readiness.ts#L20-L110. |
| E-09 | PASS | C5 | Same readiness tests. |
| E-10 | NOT VERIFIED | C5 — confirmation is shown for populated destination Working data. | No interaction test exercises confirmation or cancellation. |
| E-11 | NOT VERIFIED | C5 — generic helper supports the direction. | No focused test of Reference←Current using the actual clone helper. |
| E-12 | NOT VERIFIED | C5 | No focused test of Reference←Custom using the actual clone helper. |
| E-13 | NOT VERIFIED | C5 | No focused test of Current←Reference using the actual clone helper. |
| E-14 | PASS | C5 | T5 |
| E-15 | NOT VERIFIED | C5 | No focused test of Custom←Reference using the actual clone helper. |
| E-16 | PASS | C5 | T5 |
| E-17 | PASS | C5 — source selector excludes destination; helper treats same-role clone as no-op. | verify_master_data_custom_dataset.ts#L102. |
| E-18 | PASS | rg scan of active src/ found no Promote Trial action. | Static source scan; no dedicated automated scan test found. |
| E-19 | PASS | rg scan of active src/ found no Approve Trial action. | Static source scan; no dedicated automated scan test found. |
| E-20 | PASS | rg scan of active src/ found no Set Scenario as Current action. | Static source scan; no dedicated automated scan test found. |
| E-21 | PASS | C5 | verify_master_data_custom_dataset.ts#L95-L101 covers Current←Custom. |

### F. Master Data Structural Editing and Sizing

All F IDs use SF.

| ID | Status | Code evidence | Test evidence |
|---|---|---|---|
| F-01 | NOT VERIFIED | C9, C10 — row-add handlers exist in Master Data. | No focused test verifies the actual table add actions are limited to Master Data. |
| F-02 | NOT VERIFIED | C9, C10 — row-delete handlers exist in Master Data. | No focused test verifies the actual table delete actions are limited to Master Data. |
| F-03 | PASS | C6 | T4 |
| F-04 | PASS | C9, C10 — reorder handles are in Master Data tables. | verify_cost_breakdown_review_feedback.mjs#L258-L288 verifies handle placement. |
| F-05 | NOT VERIFIED | C1, C9 — Custom uses the shared Master Data table components. | No focused test performs structural edits in Custom. |
| F-06 | PASS | C6 — row counts are applied independently to each table. | T4 |
| F-07 | PASS | C1, C6 | verify_dataset_sizing_and_clone.ts#L9-L65; verify_master_data_custom_dataset.ts#L44-L52. |
| F-08 | PASS | C6 — parser and modal enforce minimum 1. | verify_dataset_sizing_noop.ts#L31-L57 rejects zero and fractional counts. |
| F-09 | PASS | C6 | T4 |
| F-10 | PASS | C6 | verify_dataset_sizing_preservation.ts#L195-L203 |
| F-11 | PASS | C6 | verify_dataset_sizing_preservation.ts#L229-L247 |
| F-12 | PASS | C6 | verify_dataset_sizing_preservation.ts#L229-L247 |
| F-13 | PASS | C6, C10 — add/delete handlers synchronize counts. | verify_dataset_sizing_preservation.ts#L146-L160 |
| F-14 | PASS | C6 | verify_dataset_sizing_preservation.ts#L153-L160 |
| F-15 | PASS | table-validation.ts#L19-L31; table components use the returned ordinals as placeholder text. | verify_dataset_sizing_preservation.ts#L184-L193; verify_sizing_placeholders_ignored.ts#L124-L130. |
| F-16 | PASS | table-validation.ts#L19-L31; row display number is independently derived in BOMTable.tsx#L190-L199. | Same ordinal tests. |
| F-17 | PASS | C3, C9 — only business-key fields feed comparison identity. | T2; verify_sizing_placeholders_ignored.ts#L111-L150. |
| F-18 | PASS | C6, C9 | verify_sizing_placeholders_ignored.ts#L62-L115. |
| F-19 | PASS | C3 | verify_sizing_placeholders_ignored.ts#L62-L83. |

### G. Workbook / Excel Round-Trip

All G IDs use SG.

| ID | Status | Code evidence | Test evidence |
|---|---|---|---|
| G-01 | PASS | C7 — only META, BOM, WORK_CENTER, ROUTING are added. | verify_neutral_dataset_workbook.ts#L112-L115, #L247-L250. |
| G-02 | PASS | C7 — sheets are added in required order. | Same sheet-order assertion. |
| G-03 | PASS | C7 — no calculation sheet is added. | Exact sheet-name assertion in verify_neutral_dataset_workbook.ts#L112-L115. |
| G-04 | PASS | C7 | verify_neutral_dataset_workbook.ts#L136-L141. |
| G-05 | FINDING | C13 | verify_neutral_dataset_workbook.ts#L139-L141 repeats the incorrect MATERIAL label. |
| G-06 | PASS | C7 | verify_neutral_dataset_workbook.ts#L157-L158, #L194-L211. |
| G-07 | PASS | C7 | verify_neutral_dataset_workbook.ts#L157-L158. |
| G-08 | NOT VERIFIED | C7 — formulas are wrapped to return blank for incomplete/invalid sources. | verify_neutral_dataset_workbook.ts#L207-L209 inspects formula text but does not evaluate formulas in Excel. |
| G-09 | NOT VERIFIED | C7 — formula guards use ISNUMBER, which is compatible with zero. | No Excel runtime test evaluates explicit zero in workbook formulas. |
| G-10 | PASS | C7 — input stored as percentage points. | verify_neutral_dataset_workbook.ts#L72, #L160. |
| G-11 | PASS | C7 — SG&A formula divides percentage points by 100. | verify_neutral_dataset_workbook.ts#L200. |
| G-12 | NOT VERIFIED | C7 — OP formula is not clamped. | verify_neutral_dataset_workbook.ts#L201, #L211 checks formula structure, but no Excel runtime test evaluates negative OP. |
| G-13 | PASS | C7 | verify_neutral_dataset_workbook.ts#L65-L78. |
| G-14 | PASS | C7 | verify_neutral_dataset_workbook.ts#L75-L78. |
| G-15 | PASS | C3, C7 | verify_neutral_dataset_workbook.ts#L80-L88; #L370-L377 recalculates through application engine. |
| G-16 | PASS | C7 | verify_neutral_dataset_workbook.ts#L169. |
| G-17 | PASS | C7 | verify_neutral_dataset_workbook.ts#L170. |
| G-18 | PASS | C7 | verify_neutral_dataset_workbook.ts#L171. |
| G-19 | PASS | C7 | verify_neutral_dataset_workbook.ts#L229-L238, #L350-L379. |
| G-20 | PASS | C7 | verify_neutral_dataset_workbook.ts#L68, #L231, #L286, #L364. |
| G-21 | PASS | C3, C7 | verify_snapshot_comparison_dynamic_fields.ts#L171-L200; workbook round-trip T7. |
| G-22 | PASS | C3, C7 | T2; verify_neutral_dataset_workbook.ts#L80-L88. |
| G-23 | PASS | C7 | verify_neutral_dataset_workbook.ts#L121-L124, #L143-L149. |
| G-24 | PASS | C7 | verify_neutral_dataset_workbook.ts#L144-L149, #L186-L188. |
| G-25 | PASS | C7 | verify_neutral_dataset_workbook.ts#L151-L158. |
| G-26 | PASS | C7 | verify_neutral_dataset_workbook.ts#L163-L164. |
| G-27 | PASS | C7 | verify_neutral_dataset_workbook.ts#L127-L129, #L166-L171; sheet-name assertions verify no extra sheet. |

### H. Master Data Spreadsheet Interaction

All H IDs use SH.

| ID | Status | Code evidence | Test evidence |
|---|---|---|---|
| H-01 | NOT VERIFIED | C9 — View branches render values instead of editable controls. | No interaction test asserts edits are impossible in View Mode. |
| H-02 | NOT VERIFIED | C8, C9 — Edit branches bind direct inputs to update callbacks. | No direct-edit browser/DOM test. |
| H-03 | NOT VERIFIED | C8 | No keyboard-event test. |
| H-04 | NOT VERIFIED | C8 | No keyboard-event test. |
| H-05 | NOT VERIFIED | C8 | No keyboard-event test. |
| H-06 | NOT VERIFIED | C8 | No keyboard-event test. |
| H-07 | NOT VERIFIED | C8 | No keyboard-event test. |
| H-08 | NOT VERIFIED | C8 | No keyboard-event test for Escape behavior. |
| H-09 | NOT VERIFIED | C8 | No clipboard-event test. |
| H-10 | NOT VERIFIED | C8 | No clipboard-event test. |
| H-11 | NOT VERIFIED | C8 — TSV matrix parsing and paste handling exist. | T11 only tests batch preparation; no multi-cell browser paste test. |
| H-12 | NOT VERIFIED | C8, C9 — fields validate locally and paste updates route through field handlers. | No paste test exercises invalid cells while other cells succeed. |
| H-13 | PASS | C8, C11 — one shared history and toolbar callbacks. | verify_master_data_edit_history.ts#L40-L113; verify_master_data_ui_state.mjs#L150-L158. |
| H-14 | PASS | C8, C11 | Same history tests. |
| H-15 | NOT VERIFIED | C8, C11 | No focused test performs Undo/Redo across different tables. |
| H-16 | NOT VERIFIED | C8 — selected-row applyCellUpdate applies the same field change to selected IDs. | T11 does not test row selection or bulk-edit interactions. |
| H-17 | NOT VERIFIED | C8 — row-number button starts selection. | No row-selection event test. |
| H-18 | NOT VERIFIED | C8 — Shift-click range code exists. | No selection event test. |
| H-19 | NOT VERIFIED | C8 — Ctrl/Cmd-click toggle code exists. | No selection event test. |
| H-20 | NOT VERIFIED | C8 — drag row-header selection is implemented. | No drag-selection browser test. |
| H-21 | NOT VERIFIED | C8, C10 — separate row-selection button and reorder handle. | verify_cost_breakdown_review_feedback.mjs#L264-L288 verifies placement, not interaction separation. |
| H-22 | PASS | C10 — reorder column follows Actions. | verify_cost_breakdown_review_feedback.mjs#L264-L288. |
| H-23 | NOT VERIFIED | C8, C10 — reorder accepts selected row IDs and uses moveSnapshotRows. | No test verifies multi-row order preservation. |
| H-24 | PASS | C3 — comparison matches on business identity. | verify_candidate_prioritization.ts#L308-L329 verifies array reorder alone creates no Process Candidate. |
| H-25 | NOT VERIFIED | C9 — tables filter presentation using local search terms. | No focused search interaction test. |
| H-26 | NOT VERIFIED | C9 — filtered arrays are used for rendering; stored datasets remain the source for updates. | No test asserts search does not alter data. |
| H-27 | NOT VERIFIED | C9 — Routing WC uses known-rate options and displays unknown values. | No focused typo-prevention interaction test. |
| H-28 | PASS | C9 — validation is field-local and does not gate page navigation. | verify_cost_breakdown_review_feedback.mjs#L258-L261, #L290-L312 verifies local cues and no row-level warning prose. |
| H-29 | PASS | C9 | verify_cost_breakdown_review_feedback.mjs#L258-L261. |
| H-30 | PASS | C9 | verify_cost_breakdown_review_feedback.mjs#L258-L260 asserts validation prose is absent from dense rows. |
| H-31 | NOT VERIFIED | MasterDataPage.tsx#L264-L294 renders dataset notices outside the tables. | No focused page test verifies the notice placement. |
| H-32 | NOT VERIFIED | C11 — UI state is held by the provider and not stored on business sessions. | verify_master_data_ui_state.mjs#L179-L236 manually passes retained state to a remounted page; it explicitly leaves browser-driven navigation unverified. |

### Concrete A–H findings

#### A-05 — Legacy calculation path exposes unfinalized calculations

- Impact: Medium; competing logic can diverge or be consumed later.
- Current behavior: The active store calls and exposes calculateCostBreakdown; that legacy engine also calculates fields such as MPV/MLV and Base/Active totals.
- Required behavior: Use the canonical Standard Cost engine and do not introduce competing or unapproved formulas.
- Evidence: src/state/store.tsx#L525, #L1465; src/core/calculations/cost-engine.ts#L25-L110.
- Conflict: The store computes a second cost result alongside compareSnapshots; no current page consumer was found, but the result remains in the application context.
- Smallest safe change: Remove the unused legacy calculation and context field, or migrate any confirmed consumer to canonical snapshot calculations before removing it.

#### A-06 — Parallel legacy Reference/Current data shape remains in the provider

- Impact: Medium; shadow datasets and the canonical three-workspace model can drift.
- Current behavior: AppProvider separately loads and saves a sample-seeded WorkingDataset Reference/Current pair, while canonical Reference/Current/Custom use CostSnapshot.
- Required behavior: Reference, Current, and Custom use one canonical dataset shape.
- Evidence: src/state/store.tsx#L449-L475, #L1548; src/state/working-datasets.ts#L11-L57; canonical src/core/types/product.types.ts#L63-L105.
- Conflict: The old two-dataset state is initialized, persisted, and exposed separately from the canonical workspaces; it has a different schema and no Custom workspace.
- Smallest safe change: Remove the disconnected legacy state, its persistence, and the old comparison path if no external consumer remains.

#### A-08 — A second Standard Cost engine still runs

- Impact: Medium; future consumers may receive results that differ from canonical logic.
- Current behavior: store.tsx invokes calculateCostBreakdown while also computing canonical comparisons with compareSnapshots.
- Required behavior: One shared Standard Cost engine, with no competing engine.
- Evidence: src/state/store.tsx#L525, #L532, #L1465; src/core/calculations/cost-engine.ts#L25-L110.
- Conflict: Two engines are present in the active store calculation path.
- Smallest safe change: Remove the legacy engine invocation and unused context value after confirming no page depends on it.

#### C-19 — Master Data survives an application reload through sessionStorage

- Impact: High; this conflicts with the finalized non-persistence boundary.
- Current behavior: AppProvider loads product sessions from sessionStorage and writes session changes back to it.
- Required behavior: Master Data state is in-session memory and is cleared when the application restarts.
- Evidence: src/state/store.tsx#L385-L398, #L488-L495; src/services/storage/session-storage.ts#L14-L28; docs/specs/MASTER_DATA.md#L20-L34.
- Conflict: Reloading the application in the same tab rehydrates the prior business session from sessionStorage.
- Smallest safe change: Keep business state in memory only, or clear business-session storage on application bootstrap while preserving same-session SPA navigation.

#### G-05 — Workbook META output uses MATERIAL instead of MAT

- Impact: Low/medium; workbook label fails the canonical schema and locks the mismatch into its verifier.
- Current behavior: META output label is MATERIAL.
- Required behavior: The label is MAT.
- Evidence: src/services/excel/master-data-workbook.ts#L133-L144; docs/specs/MASTER_DATA.md#L118; scripts/verify_neutral_dataset_workbook.ts#L139-L141.
- Conflict: The workbook and verifier assert the superseded label.
- Smallest safe change: Change the output label to MAT and update the workbook verifier expectation.

### NOT VERIFIED items

The principal verification gap is spreadsheet UI behavior: no browser/DOM tests exercise keyboard navigation, clipboard events, selection, paste validation, drag-selection, multi-row reorder, or the actual navigation lifecycle. The save/reset/export action wiring also lacks focused action tests. Workbook formula tests inspect formula structure but do not execute formulas in Excel, leaving G-08, G-09, and G-12 unverified.

### A–H section totals

- A: 6 PASS, 3 FINDING
- B: 27 PASS
- C: 16 PASS, 1 FINDING, 2 NOT VERIFIED
- D: 6 PASS, 8 NOT VERIFIED
- E: 14 PASS, 7 NOT VERIFIED
- F: 16 PASS, 3 NOT VERIFIED
- G: 23 PASS, 1 FINDING, 3 NOT VERIFIED
- H: 7 PASS, 25 NOT VERIFIED

Total A–H: 115 PASS, 5 FINDING, 48 NOT VERIFIED, 0 N/A — PROVISIONAL/UI ONLY.

Skills used for this append: planning-with-files (SKILL.md read; existing task-specific findings.md inspected and preserved). The prior read-only audit used Graphify for code navigation. Tests remain unexecuted; this append records static audit evidence only.

## Phase 1 I–M Audit Results

This appendix covers frozen checklist IDs I-01 through M-18 (115 requirements). The audit was static; verifier files were inspected but not run. Status labels are PASS, FINDING, and NOT VERIFIED. No item in this range is N/A.

### Evidence keys

Each matrix entry lists spec, code, and test evidence keys. The keys resolve to the following exact paths and lines.

#### Spec evidence

- SI — docs/specs/COST_BREAKDOWN.md:9-58 (CBD scope, status, Gap, processing, and detail behavior); :60-85 (Selected Comparison, Candidate boundary, warning and result-to-detail behavior); docs/specs/FINAL_LOGIC_SPEC.md:339-363.
- SJ — docs/specs/COST_BREAKDOWN.md:60-71; docs/specs/CROSS_CUTTING.md:54-62,127-137; docs/specs/FINAL_LOGIC_SPEC.md:351-363.
- SK — docs/specs/CANDIDATE.md:24-60; docs/specs/FINAL_LOGIC_SPEC.md:367-376.
- SL — docs/specs/CANDIDATE.md:64-109; docs/specs/FINAL_LOGIC_SPEC.md:378-420.
- SM — docs/specs/CANDIDATE.md:111-116; docs/specs/FINAL_LOGIC_SPEC.md:422-427.

#### Code evidence

- CI — Active Reference/Current comparison and selected-scope derivation: src/state/store.tsx:531-578. Identity matching: src/core/calculations/snapshot-comparison.ts:140-245. Routing detail: src/core/calculations/snapshot-routing-detail.ts:33-86.
- CSTATUS — Canonical status ordering: src/core/calculations/comparison-status.ts:11-31. The early missing-confidence return is the I-13/K-02 finding.
- CIWC — Work Center aggregation: src/core/calculations/snapshot-comparison.ts:406-470. Work Center groups and Routing drill-down: src/features/cost-breakdown/components/WorkCenterProcessingTable.tsx:233-285.
- CJ — Selected-scope filtering: src/core/calculations/selected-comparison.ts:6-45; active scope, source fingerprint, apply, and clear: src/state/store.tsx:452,531-578; selection controls: src/features/cost-breakdown/CostBreakdownPage.tsx:53-83.
- CK — Candidate logic: src/core/calculations/material-candidates.ts:75-172; src/core/calculations/processing-candidates.ts:95-145; src/core/calculations/candidate-prioritization.ts:25-59. Candidate page controls: src/features/candidate-selection/CandidateSelectionPage.tsx:33-81.
- CL — RCA types and lifecycle: src/core/types/product.types.ts:40-54,62-80; src/state/rca-cases.ts:20-101; session migration: src/state/store.tsx:384-400; workspace save/proceed: src/features/rca/RcaCaseWorkspace.tsx:38-55.
- CM — RCA handoff/context/product guard: src/App.tsx:34-48,111-127. Simulation source and Factor UI: src/features/simulation/SimulationPage.tsx:352-425.
- CBOUNDARY — Scope is not cleared on RCA Case or Simulation entry: src/features/candidate-selection/CandidateSelectionPage.tsx:77-81,102-109; src/App.tsx:111-127; src/state/store.tsx:493-496; direct tab navigation: src/shared/layout/Navbar.tsx:88-91.
- CHANDOFF — Handoff context is stored and product-filtered, but not cleared on tab navigation: src/App.tsx:34-48,111-127; direct tab navigation: src/shared/layout/Navbar.tsx:88-91.

#### Test / verifier evidence

- TI — scripts/verify_comparison_reconciliation.ts:91-155 tests canonical statuses, complete ADDED/REMOVED absent-side zero, reconciliation, and status filters; :157-208 tests missing business identities. scripts/verify_candidate_prioritization.ts:183-262 tests incomplete matched records and record-level effects; :416-489 tests Work Center-rate-dependent Process Candidates.
- TIUI — scripts/verify_cost_breakdown_review_feedback.mjs:141-159,193-235,290-312 tests Candidate/details presentation, BOM/Routing Reference→Current details, and collapsed warnings. It does not verify CBD Result→Cause→Detail ordering or absence of a duplicate top banner.
- TSEL — No selected-comparison-specific verifier was found. Existing comparison verifiers test comparison status/reconciliation, not selected-scope controls, lifecycle, export/save, or navigation boundaries.
- TK — scripts/verify_candidate_prioritization.ts:63-150 tests Candidate creation, default controllability, signed Gap ordering, and status filtering; :152-262 tests identity, incomplete matched material, and record-level monetary Gap; :416-489 tests rate dependencies and Process identity.
- TL — scripts/verify_rca_case_domain.ts:11-68 tests one/many Candidates, completion, and migration; scripts/verify_rca_candidate_notes.ts:7-32 checks case-level fields and legacy per-Candidate UI absence; scripts/verify_rca_handoff.ts:9-61 tests handoff context/draft and RCA completion without SIM.
- TM — scripts/verify_rca_handoff.ts:9-61; scripts/verify_simulation_story_view.ts:78-197 tests standalone Simulation, RCA context, Current-first source choice, other available sources, and selectable factors. No verifier tests handoff-context clearing on navigation or product switching.

### I. Cost Breakdown Core

| ID | Status | Spec / code / test evidence |
|---|---|---|
| I-01 | PASS | SI / CI / TI |
| I-02 | NOT VERIFIED | SI / CI / No test verifies that Custom is unavailable as a CBD side. |
| I-03 | PASS | SI / CI / TI |
| I-04 | PASS | SI / CI / TI |
| I-05 | PASS | SI / CI / TI |
| I-06 | PASS | SI / CI / TI |
| I-07 | PASS | SI / CI / TK |
| I-08 | PASS | SI / CI / scripts/verify_numeric_integrity.ts:56-74 |
| I-09 | PASS | SI / CI / TI |
| I-10 | PASS | SI / CI / TI |
| I-11 | PASS | SI / CI / TI, TK |
| I-12 | PASS | SI / CSTATUS / TI |
| I-13 | FINDING | SI / CSTATUS / TI covers only complete structural additions/removals. |
| I-14 | NOT VERIFIED | SI / src/features/cost-breakdown/CostBreakdownPage.tsx / No test verifies that All is the UI default. |
| I-15 | PASS | SI / CIWC / TI |
| I-16 | PASS | SI / CIWC / TI |
| I-17 | PASS | SI / CIWC / TI |
| I-18 | NOT VERIFIED | SI / CIWC / Existing tests do not verify WC aggregation when Process matching is not one-to-one. |
| I-19 | PASS | SI / CIWC / TK |
| I-20 | PASS | SI, SK / CK / TK |
| I-21 | PASS | SI / CIWC, CK / TK |
| I-22 | NOT VERIFIED | SI / CIWC / TIUI covers BOM/Routing details, not full record and Work Center Reference→Current details. |
| I-23 | PASS | SI / CK / TK |
| I-24 | PASS | SI / CI, CIWC / TI, TK |
| I-25 | NOT VERIFIED | SI / src/features/cost-breakdown/components/VarianceTreeCard.tsx:44-123; src/features/cost-breakdown/CostBreakdownPage.tsx:132-176,229-253 / No test verifies Result→Cause→Detail order. |
| I-26 | NOT VERIFIED | SI / src/features/cost-breakdown/components/SnapshotComparisonCard.tsx:16-49; CostBreakdownPage.tsx composition / TIUI tests the disclosure but not duplicate-banner absence. |
| I-27 | PASS | SI / src/features/cost-breakdown/components/SnapshotComparisonCard.tsx:72-149 / TIUI |

### J. Selected Comparison

| ID | Status | Spec / code / test evidence |
|---|---|---|
| J-01 | NOT VERIFIED | SJ / CJ / TSEL |
| J-02 | NOT VERIFIED | SJ / CJ / TSEL |
| J-03 | NOT VERIFIED | SJ / CJ / TSEL |
| J-04 | NOT VERIFIED | SJ / CJ / TSEL |
| J-05 | NOT VERIFIED | SJ / CJ / TSEL |
| J-06 | NOT VERIFIED | SJ / CJ / TSEL |
| J-07 | NOT VERIFIED | SJ / CJ / TSEL |
| J-08 | NOT VERIFIED | SJ / CJ / TSEL |
| J-09 | NOT VERIFIED | SJ / CJ / TSEL |
| J-10 | NOT VERIFIED | SJ / CJ / TSEL |
| J-11 | NOT VERIFIED | SJ / CJ / TSEL |
| J-12 | NOT VERIFIED | SJ / CJ / TSEL |
| J-13 | NOT VERIFIED | SJ / CJ; src/services/excel/comparison-export.ts has no active caller found / TSEL |
| J-14 | NOT VERIFIED | SJ / CJ / TSEL |
| J-15 | NOT VERIFIED | SJ / CJ / TSEL |
| J-16 | NOT VERIFIED | SJ / CJ / TSEL |
| J-17 | NOT VERIFIED | SJ / CJ / TSEL |
| J-18 | NOT VERIFIED | SJ / CJ, CK / TSEL |
| J-19 | NOT VERIFIED | SJ / CJ / TSEL |
| J-20 | NOT VERIFIED | SJ / CJ, CL / TSEL |
| J-21 | NOT VERIFIED | SJ / CJ, CL / TSEL |
| J-22 | NOT VERIFIED | SJ / CJ, CM / TSEL |
| J-23 | FINDING | SJ / CBOUNDARY / TSEL |
| J-24 | FINDING | SJ / CBOUNDARY / TSEL |

### K. Candidate Prioritization

| ID | Status | Spec / code / test evidence |
|---|---|---|
| K-01 | NOT VERIFIED | SK / CJ, CK / TK does not test active Full-vs-Selected Candidate pool. |
| K-02 | FINDING | SK / CSTATUS; material-candidates.ts:90-99; processing-candidates.ts:106-115 / TK has no incomplete ADDED/REMOVED case. |
| K-03 | PASS | SK / CK / TK |
| K-04 | PASS | SK / CK / TK |
| K-05 | PASS | SK / CK / TK |
| K-06 | PASS | SK / CK / TK |
| K-07 | PASS | SK / CK / TK |
| K-08 | PASS | SK / CK / TK |
| K-09 | PASS | SK / CK / TK |
| K-10 | PASS | SK / CK / TK, TIUI |
| K-11 | PASS | SK / CK / TK |
| K-12 | PASS | SK / CK / TK |
| K-13 | NOT VERIFIED | SK / CK / No test verifies visibility of a zero-gap CHANGED Candidate. |
| K-14 | PASS | SK / CK / TK |
| K-15 | PASS | SK / CK / TK |
| K-16 | PASS | SK / CK / TK |
| K-17 | PASS | SK / CK / TK exercises positive and negative signed ordering. |
| K-18 | NOT VERIFIED | SK / src/features/candidate-selection/CandidateSelectionPage.tsx:33-43 / No test verifies rank #1 is not auto-selected. |
| K-19 | NOT VERIFIED | SK / CandidateSelectionPage.tsx:86-88 / No test verifies ranking remains advisory. |
| K-20 | PASS | SK / CK / TK |
| K-21 | NOT VERIFIED | SK / src/features/candidate-selection/components/CandidateRow.tsx:137-160; CandidateSelectionPage.tsx:68-74 / No test verifies unchecking does not hide/delete a Candidate. |
| K-22 | PASS | SK / CK / TK |
| K-23 | NOT VERIFIED | SK / CandidateSelectionPage.tsx:33,61-66 / No test verifies All is the UI default. |
| K-24 | PASS | SK / CK / TK tests a combined Changed+Added filter. |
| K-25 | NOT VERIFIED | SK / CandidateSelectionPage.tsx:62-66 / No negative UI test verifies the absence of a type filter. |
| K-26 | NOT VERIFIED | SK / CandidateSelectionPage.tsx:62-66 / No negative UI test verifies the absence of a controllability filter. |
| K-27 | NOT VERIFIED | SK / CandidateSelectionPage.tsx:62-66 / No negative UI test verifies the absence of a cost-direction filter. |
| K-28 | NOT VERIFIED | SK / CandidateSelectionPage.tsx:62-66 / No negative UI test verifies the absence of a feasibility filter. |
| K-29 | NOT VERIFIED | SK / CK / No test verifies neutral ADDED interpretation. |
| K-30 | NOT VERIFIED | SK / CK / No test verifies neutral REMOVED interpretation. |

### L. RCA Case

| ID | Status | Spec / code / test evidence |
|---|---|---|
| L-01 | PASS | SL / CL / TL |
| L-02 | PASS | SL / CL / TL |
| L-03 | PASS | SL / CL / TL |
| L-04 | PASS | SL / CL / TL |
| L-05 | PASS | SL / CL / TL |
| L-06 | PASS | SL / CL / TL |
| L-07 | PASS | SL / CL / TL |
| L-08 | NOT VERIFIED | SL / src/features/rca/RcaCaseWorkspace.tsx:57-147 / No targeted verifier asserts absence of Bulk Note. |
| L-09 | NOT VERIFIED | SL / Master Data annotations are separate from RcaCaseRecord (product.types.ts:40-54) / No targeted separation test. |
| L-10 | PASS | SL / CL / TL |
| L-11 | PASS | SL / CL / TL |
| L-12 | PASS | SL / CL / TL |
| L-13 | PASS | SL / CL / TL |
| L-14 | PASS | SL / CL / TL |
| L-15 | NOT VERIFIED | SL / CJ, CL / TL does not test Selected Comparison→RCA separation. |
| L-16 | PASS | SL / store.tsx:384-400; rca-cases.ts:81-101 / TL |

### M. RCA → Simulation Handoff

| ID | Status | Spec / code / test evidence |
|---|---|---|
| M-01 | PASS | SM / CM / TM |
| M-02 | PASS | SM / CL, CM / TM |
| M-03 | PASS | SM / CL, CM / TM |
| M-04 | PASS | SM / CL / TM |
| M-05 | PASS | SM / CL / TM |
| M-06 | PASS | SM / RcaCaseWorkspace.tsx:40-50 / TM |
| M-07 | PASS | SM / CM / TM |
| M-08 | PASS | SM / CM / TM |
| M-09 | PASS | SM / CM / TM |
| M-10 | PASS | SM / CM / TM |
| M-11 | PASS | SM / CM / TM |
| M-12 | PASS | SM / CM / TM |
| M-13 | PASS | SM / CM / TM |
| M-14 | PASS | SM / No Candidate→Factor mapping exists in CM / TM confirms no preselection. |
| M-15 | PASS | SM / CL / TM |
| M-16 | FINDING | SM / CHANDOFF / TM has no direct-entry-after-handoff test. |
| M-17 | NOT VERIFIED | SM / App.tsx:34-48 filters context by product ID / No product-switch regression test. |
| M-18 | FINDING | SM / CHANDOFF / No test covers leaving/re-entering Simulation or the RCA-context lifecycle. |

### I–M concrete findings

#### I-13 / K-02 — ADDED/REMOVED status is suppressed by missing confidence

- Severity/impact: Medium. Incomplete structural additions/removals may disappear from their canonical status filter and Candidate pool even though their record identity establishes their status.
- Current behavior: getCanonicalComparisonStatus returns null when confidence is missing before it checks matchStatus for added or removed. Candidate builders skip findings with null canonical status.
- Required behavior: Presence defines ADDED/REMOVED independently of whether the present record has a calculable cost. The affected Gap remains unavailable when required cost inputs are missing.
- Evidence: docs/specs/FINAL_LOGIC_SPEC.md:184-213; src/core/calculations/comparison-status.ts:11-14; src/core/calculations/material-candidates.ts:90-99; src/core/calculations/processing-candidates.ts:106-115. Existing complete-row tests are in scripts/verify_comparison_reconciliation.ts:103-113; missing-identity tests at :157-208 are not incomplete ADDED/REMOVED tests.
- Conflict: The early missing-confidence return couples comparison status to calculation confidence, contrary to the canonical presence-based status and status/Gap independence rules.
- Smallest safe change: Return ADDED/REMOVED from matchStatus before applying missing-confidence handling for matched rows; add incomplete ADDED and REMOVED regression cases for filtering and Candidate generation.

#### J-23 / J-24 — Selected Comparison remains active at the RCA/Simulation boundary

- Severity/impact: High. Active scope and its status can persist into RCA and Simulation, contrary to the explicit lifecycle boundary.
- Current behavior: Candidate Case creation opens the RCA workspace without clearing selected scope; RCA→Simulation sets handoff context and changes tabs without clearing scope; setActiveTab itself only changes/stores the tab.
- Required behavior: End active Selected Comparison upon RCA entry or Simulation opening. RCA/Simulation may retain origin context only and must not show/apply active selected-scope behavior.
- Evidence: docs/specs/CROSS_CUTTING.md:127-137; src/features/candidate-selection/CandidateSelectionPage.tsx:77-81,102-109; src/App.tsx:111-127; src/state/store.tsx:493-496; src/shared/layout/Navbar.tsx:88-91. No selected-boundary verifier was found.
- Conflict: Stored scope is independent of active tab and is only cleared by explicit scope clear or source fingerprint invalidation. RCA and SIM transitions do not call that clear action.
- Smallest safe change: Clear selected scope at RCA Case entry and both direct and handoff Simulation entry; add transition tests asserting the status/scope is absent after each boundary.

#### M-16 / M-18 — RCA handoff context can remain stale for later direct Simulation entry

- Severity/impact: Medium. Opening Simulation directly after a prior handoff can display unrelated prior RCA Case context.
- Current behavior: App stores simulationRcaHandoff in component state and exposes it whenever its product ID matches the active product. Tab navigation does not clear it. Leaving Simulation and later opening it directly for that product therefore reuses the old context.
- Required behavior: Direct Simulation entry after a prior handoff must not inherit stale RCA context; leaving/re-entering Simulation must follow an explicit deterministic handoff-context lifecycle, and context must not leak across products.
- Evidence: docs/specs/CANDIDATE.md:111-116; docs/specs/FINAL_LOGIC_SPEC.md:422-427; src/App.tsx:34-48,111-127; src/shared/layout/Navbar.tsx:88-91. scripts/verify_rca_handoff.ts and scripts/verify_simulation_story_view.ts cover handoff and standalone entry separately, but not their sequence.
- Conflict: Context lifetime is tied to product ID and App component lifetime, not to the explicit RCA→Simulation transition. Same-product direct entry after navigation still receives the prior handoff context.
- Smallest safe change: Define and implement context clearing/consumption for later direct entry and navigation away; test same-product re-entry and product switching while preserving context for the explicit handoff transition.

### I–M audit totals

- I: 20 PASS, 1 FINDING, 6 NOT VERIFIED
- J: 0 PASS, 2 FINDING, 22 NOT VERIFIED
- K: 17 PASS, 1 FINDING, 12 NOT VERIFIED
- L: 13 PASS, 0 FINDING, 3 NOT VERIFIED
- M: 15 PASS, 2 FINDING, 1 NOT VERIFIED
- Total I–M: 65 PASS, 6 FINDING, 44 NOT VERIFIED, 0 N/A.

Audit commands were read-only PowerShell Get-Content, ripgrep searches, git status, and git rev-parse. No verifier or application test was run for this static audit.

## Phase 1 N–W Audit Results

This appendix covers frozen checklist IDs N-01 through W-33 (192 requirements). Audit target: codex/final-logic-implementation, HEAD 1e4bdbf35f8ade3ab1c5d4f97d51f80cdc107f8d. The audit was read-only with respect to application code and tests. Evidence paths below identify the source of each status; the status is an audit result, not a change to the frozen checklist.

### Evidence keys

#### Spec evidence

- SP0 — docs/specs/SIMULATION.md:5-20.
- SP1 — docs/specs/SIMULATION.md:31-61.
- SP2 — docs/specs/SIMULATION.md:63-102.
- SP3 — docs/specs/SIMULATION.md:106-150.
- SP4 — docs/specs/SIMULATION.md:154-163.
- SP5 — docs/specs/SIMULATION.md:167-183.
- FL1 — docs/specs/FINAL_LOGIC_SPEC.md:422-427; docs/specs/CANDIDATE.md:103-116.
- FL2 — docs/specs/FINAL_LOGIC_SPEC.md:431-549.
- FL3 — docs/specs/FINAL_LOGIC_SPEC.md:351-363; docs/specs/CROSS_CUTTING.md:129-138.
- FL4 — docs/specs/FINAL_LOGIC_SPEC.md:665-680.
- DES — design.md:28-35,55-68,112-130,216-230,261-278,282-309.
- MDspec — docs/specs/MASTER_DATA.md:7-9,79-81,118-129.
- GATE — .planning/2026-10-09-final-logic-implementation/task_plan.md:697-729, the frozen W-01 through W-33 gate.

#### Code evidence

- APP — src/App.tsx:34-134; per-product SIM state, RCA handoff state, start/reset/update wiring, and routes.
- SSTATE — src/features/simulation/simulation-state.ts:12-141; record-factor types, cloning, basis fingerprint, state reconciliation, and economic inputs.
- SENGINE — src/features/simulation/simulation-engine.ts:38-150; current-vs-SIM statuses, calculation, parameter whitelist, and selected-record update guard.
- SPAGE — src/features/simulation/SimulationPage.tsx:28-443; start choices, economic-only/combined presentation, RCA context, factors, and BOM/Routing editors.
- ECO — src/features/simulation/simulation-economics.ts:1-123; independent economic calculation and commercial override handling.
- EPANEL — src/features/simulation/EconomicSimulationPanel.tsx:20-95; economic inputs, unavailable/zero display branches, and advisory margin presentation.
- STORY — src/core/calculations/scenario-story.ts:3-51; src/features/simulation/SimulationStoryGraph.tsx:6-18,33-156.
- RCA — src/state/rca-cases.ts:3-101; src/features/rca/RcaCaseWorkspace.tsx:46-142; src/features/candidate-selection/CandidateSelectionPage.tsx:68-115.
- STORE — src/state/store.tsx:493-553,1285-1303; tab handling, Selected Comparison fingerprint/scope, and RCA Case creation.
- WF — src/shared/layout/workflow-status.ts:16-53; src/shared/layout/Navbar.tsx:28-100; src/shared/layout/AppLayout.tsx:21-67.
- CANDcode — src/core/calculations/candidate-prioritization.ts:20-67.
- NAV — src/shared/layout/Navbar.tsx:5-9; active page list is Master Data, Cost Breakdown, Candidate / RCA, and Simulation.
- MDUI — src/features/master-data/components/MasterDataWorkspaceHeader.tsx:117-329,368-457; src/features/master-data/MasterDataPage.tsx:238-265.
- MDcells — src/features/master-data/components/BOMTable.tsx:201,242-288; src/features/master-data/components/WorkCenterRatesTable.tsx:195,240-256; src/features/master-data/components/RoutingTable.tsx:206,273-305.
- Active-source scan — git grep over tracked src/ for the retired Trial/A-B/RCA-Simulation identifiers and excluded metrics returned no matches. This is scan evidence, not a dedicated automated test.

#### Test / verifier evidence

- TH — scripts/verify_rca_handoff.ts:15-58; also scripts/verify_rca_case_domain.ts and scripts/verify_rca_record.ts. The three verifiers were run and passed.
- TSV — scripts/verify_simulation_story_view.ts:34-216; rendered Simulation, economic-only, standalone, handoff-context, factor-selection, and combined-mode checks. Run and passed.
- TSC — scripts/verify_simulation_context.ts:25-43; product-scoped SIM state and standalone route checks. Run and passed.
- TSW — scripts/verify_simulation_workspace.ts:35-66; isolated source clone, source/current invalidation, economic input retention, and Ref/Cur/Custom. Run and passed.
- TSE — scripts/verify_parameter_simulation_engine.ts:57-138; status rows, parameters, selected record, full recalculation, missing values, identity ambiguity, and legacy factor sanitization. Run and passed.
- TEC — scripts/verify_simulation_economics.ts:20-90; economic-only, positive/negative margin, invalid values, division limits, Action Cost isolation, and business outputs. Run and passed.
- TBIZ — scripts/verify_scenario_business_metrics.ts:4-24 and scripts/verify_scenario_cost_overrides.ts:10-24; includes negative and zero OP and unchanged WC rates. Both were run and passed.
- TSTORY — scripts/verify_scenario_story.ts; run and passed.
- TWF — scripts/verify_workflow_status.ts:11-41; status priority and destinations. Run and passed.
- TCAND — scripts/verify_candidate_prioritization.ts; run and passed.
- TUI — scripts/verify_master_data_ui_state.mjs and scripts/verify_cost_breakdown_review_feedback.mjs; both were run and passed.
- THIST — HANDOFF.md:25-39 and progress.md:199-201 record the historical full-suite run: all 55 TypeScript verifiers, both MJS verifiers, typecheck, production build, and diff-check passed at the latest application checkpoint. The full suite/typecheck/build were not rerun during this N-W audit.

### N. Parameter Simulation Core

| ID | Status | Spec / code / test evidence |
|---|---|---|
| N-01 | PASS | SP0 / APP, SPAGE / TSC |
| N-02 | PASS | SP0 / APP, SPAGE:339-375 / TSV:109-131 |
| N-03 | PASS | SP1 / SPAGE:28-39,352-367; SSTATE:49-62 / TSW:35-46 |
| N-04 | PASS | SP1 / SPAGE:28-39,352-367; SSTATE:49-62 / TSW:63-64 |
| N-05 | PASS | SP1 / SPAGE:28-39,352-367; SSTATE:49-62 / TSW:59-61 |
| N-06 | PASS | SP1 / SSTATE:49-62 / TSW:35-40 |
| N-07 | PASS | SP1 / SSTATE:49-62; SENGINE:109-150 / TSW:37-40 |
| N-08 | PASS | SP1 / SPAGE:352-443; SSTATE:49-62 / TSE:59-62 |
| N-09 | PASS | SP1 / SPAGE:352-443 / TSE:59-62 |
| N-10 | PASS | SP1 / SPAGE:352-443 / TSE:59-62 |
| N-11 | PASS | SP1 / SPAGE:352-443 / TSE:59-62 |
| N-12 | PASS | SP1 / SPAGE:352-443 / TSE:59-62 |
| N-13 | PASS | SP1 / SPAGE:352-389 / TSW:48-61 |
| N-14 | PASS | SP1 / SENGINE:77-97 / TSE:63-66 |
| N-15 | PASS | SP1 / SENGINE:77-97 / TSE:63-66 |
| N-16 | PASS | SP1 / SENGINE:77-97 / TSE:63-66 |
| N-17 | PASS | SP1 / SENGINE:77-97 / TSE:128-131 |
| N-18 | PASS | SP1 / SENGINE:77-97 / TSE:128-131 |
| N-19 | PASS | SP1 / SSTATE:45-47,83-113 / TSW:41-48 |
| N-20 | PASS | SP0 / APP:38-64 / TSC:33-43; THIST browser navigation/reload record |

### O. Current-vs-SIM Record Status and Factors

| ID | Status | Spec / code / test evidence |
|---|---|---|
| O-01 | PASS | SP2 / SENGINE:38-74; SPAGE:190-204 / TSE:68-76 |
| O-02 | PASS | SP2 / SENGINE:109-150; SPAGE:206-225 / TSE:84-86 |
| O-03 | PASS | SP2 / SENGINE:38-74; SPAGE:190-204 / TSE:70 |
| O-04 | FINDING | SP2 / SENGINE:109-150 / TSE:91 only rejects an unselected stable record; no assertion selects and edits an UNCHANGED record. |
| O-05 | PASS | SP2 / SENGINE:54-74; SPAGE:190-204 / TSE:71 |
| O-06 | FINDING | SP2 / SENGINE:109-150 / TSE:71 verifies ADDED status, but no assertion selects and edits an ADDED record. |
| O-07 | PASS | SP2 / SENGINE:54-74; SPAGE:190-204 / TSE:72-76 |
| O-08 | PASS | SP2 / SENGINE:109-123 / TSE:90 |
| O-09 | PASS | SP2 / SENGINE:77-97 / TSE:63-76 |
| O-10 | PASS | SP2 / SSTATE:10-20; SPAGE:309-418 / TSE:80-83; TSV:169-197 |
| O-11 | PASS | SP2 / SPAGE:309-324; SSTATE:116-124 / TSV:179-197 |
| O-12 | PASS | SP2 / SPAGE:206-225,309-324 / TSV:91-105 |
| O-13 | PASS | SP2 / SPAGE:406-418; SENGINE:77-97 / TSE:112-116 |
| O-14 | PASS | SP2 / SENGINE:77-97,109-150 / TSE:112-115 |
| O-15 | PASS | SP2 / SSTATE:12-15; SENGINE:100-106 / TSE:59-61,84-88 |
| O-16 | PASS | SP2 / SSTATE:12-15; SENGINE:100-106 / TSE:96-102 |
| O-17 | PASS | SP2 / SSTATE:12-15; SENGINE:100-106 / TSE:96-102 |
| O-18 | PASS | SP2 / SSTATE:12-15; SENGINE:100-106 / TSE:112-115 |
| O-19 | PASS | SP2 / SSTATE:12-15; SENGINE:100-106 / TSE:104-110 |
| O-20 | PASS | SP2 / SSTATE:12-15; SENGINE:100-106 / TSE:104-110 |
| O-21 | PASS | SP2 / SSTATE:12-15; SENGINE:100-106 / TBIZ |
| O-22 | PASS | SP2 / SSTATE:12-15; SENGINE:100-106 / TBIZ |
| O-23 | PASS | SP2 / SPAGE:309-418; ECO:20-25 / TSV:106-107 |
| O-24 | PASS | SP2 / SPAGE:309-418; ECO:20-25 / TSV:106-107 |
| O-25 | PASS | SP2 / SSTATE:65-80 / TSE:120-126 |

### P. Economic Simulation

| ID | Status | Spec / code / test evidence |
|---|---|---|
| P-01 | PASS | SP0 / SPAGE:352-443 / TSV:109-131 |
| P-02 | PASS | SP0, SP3 / SPAGE:352-375 / TSV:109-131 |
| P-03 | PASS | SP0, SP3 / SPAGE:377-400 / TSV:199-215 |
| P-04 | PASS | SP3:124-126 / SPAGE:352-375 / TSV:109-128 |
| P-05 | PASS | SP3:112-117 / ECO; SPAGE:370-375 / TEC:16-18 |
| P-06 | PASS | SP3:112-117 / ECO; SPAGE:370-375 / TEC:16-18 |
| P-07 | PASS | SP3:116-117 / ECO:71-80 / TEC:35,50-58 |
| P-08 | PASS | SP3:112-117 / ECO:36-44,71-80 / TEC:63-64 |
| P-09 | PASS | SP3:112-117 / ECO:36-44,71-80 / TEC:53-58 |
| P-10 | PASS | SP3:112-117 / ECO:73-80 / TEC:53-58 |
| P-11 | PASS | SP3:119-122 / SPAGE:370-400; ECO:20-25 / TSV:106-107 |
| P-12 | PASS | SP3:119-122 / ECO:64-123 / TEC:29 |
| P-13 | PASS | SP3:119-122 / ECO:64-123 / TEC:29 |
| P-14 | PASS | SP3:119-122 / ECO:64-123 / TEC:29 |
| P-15 | PASS | SP3:119-122 / ECO:64-123 / TEC:29 |
| P-16 | PASS | SP3:119-122 / ECO:64-123 / TEC:29 |
| P-17 | PASS | SP3:124-126 / ECO:82-89; SPAGE:370-375 / TEC:35-38 |
| P-18 | PASS | SP3:124-126 / ECO:82-89; EPANEL:74-86 / TEC:35-38 |
| P-19 | PASS | SP3:124-126 / APP:66-73; SSTATE:49-62 / TSW:51-54; TSV:199-201 |
| P-20 | PASS | SP3:132-138 / SENGINE:77-97 / TEC:20-32 |
| P-21 | PASS | SP3:132-138 / ECO:82-89 / TEC:20-32 |
| P-22 | PASS | SP3:140-147 / EPANEL:74-84 / TEC:20-24 |
| P-23 | FINDING | SP3:140-147 / EPANEL:74-79 renders numeric zero because it checks null; no test asserts a zero Economic Margin is displayed. |
| P-24 | PASS | SP3:140-147 / EPANEL:74-84 / TEC:31-32 |
| P-25 | PASS | SP3:144-147 / EPANEL:80-84 / TSV:213-215 |
| P-26 | PASS | SP3:144-147 / EPANEL:74-84 / TEC:31-32 |
| P-27 | PASS | SP3:144-147 / RCA; SPAGE:327-443 / TH:38-39; TSV:107 |
| P-28 | PASS | SP3:149-150 / EPANEL:20-25,37-64 / TSV:123-128 |

### Q. Selling Price / SG&A / OP

| ID | Status | Spec / code / test evidence |
|---|---|---|
| Q-01 | PASS | SP4 / ECO:92-111; EPANEL:20-25 / TEC:66-70 |
| Q-02 | PASS | SP4 / ECO:98-111; EPANEL:20-25 / TEC:66-70 |
| Q-03 | PASS | SP4 / ECO:46-54 / TEC:66-70; TBIZ |
| Q-04 | PASS | SP4 / ECO:46-54 / TEC:66-70; TBIZ |
| Q-05 | PASS | SP4 / src/core/calculations/scenario-business.ts:23-45 / TBIZ:4-6 |
| Q-06 | PASS | SP4 / scenario-business.ts:23-45 / TBIZ:4-6 |
| Q-07 | PASS | SP4 / scenario-business.ts:23-45 / TBIZ:4-12 |
| Q-08 | PASS | SP4 / STORY:88-156 / TBIZ:8-9 |
| Q-09 | PASS | SP4 / scenario-business.ts:23-45 / TBIZ:11-12 |
| Q-10 | PASS | SP4 / ECO:92-111 / TEC:29 |
| Q-11 | PASS | SP2:95-98; SP4 / SPAGE:309-418; ECO:20-25 / TSV:106-107 |

### R. Simulation Story / Result Presentation Requirements

| ID | Status | Spec / code / test evidence |
|---|---|---|
| R-01 | PASS | DES:63-68,282-286 / SPAGE:379-443 / TSV:78-81 |
| R-02 | PASS | DES:63-68,124-130 / SPAGE:393-443; STORY / TSV:78-81 |
| R-03 | PASS | SP1; DES:112-122 / STORY:33-73 / TSV:34-42,78-81 |
| R-04 | PASS | DES:114-122 / SPAGE:278-306; STORY:3-16 / TSV:26-42 |
| R-05 | PASS | SP4; DES:114-128 / STORY; SimulationStoryGraph.tsx:6-13,52-55,117-125 / TSV:34-42 |
| R-06 | PASS | DES:120-122,126-130 / SimulationStoryGraph.tsx:33-156 / TSV:34-42 |
| R-07 | PASS | DES:120-122 / SimulationStoryGraph.tsx:6-18,133-156 / TUI; TSV:34-42 |
| R-08 | PASS | SP5 / SPAGE:352-443 / TSV:42,107 |
| R-09 | PASS | SP5 / SPAGE:352-443 / TSV:78-81,107 |
| R-10 | N/A — PROVISIONAL/UI ONLY | SP5 permits optional A/B; current implementation has one active SIM, so optional A/B UI is not required by current logic. |
| R-11 | N/A — PROVISIONAL/UI ONLY | SP5 permits multiple scenarios but does not require them; no multi-scenario architecture is implemented. |
| R-12 | PASS | SP5 / PAGE; APP / TH:57-58; TSV:42,107 |

### S. Shared Status / Context

| ID | Status | Spec / code / test evidence |
|---|---|---|
| S-01 | PASS | FL3; CROSS_CUTTING.md:127-135 / WF:41-53 / TWF:32-41 |
| S-02 | PASS | CROSS_CUTTING.md:129-138 / WF:25-30; Navbar.tsx:28-78 / TWF:17-21 |
| S-03 | PASS | CROSS_CUTTING.md:129-135 / WF:33-39 / TWF:23-29 |
| S-04 | PASS | FL3 / STORE:534-553; Navbar.tsx:28-33 / TWF:11-14 |
| S-05 | PASS | CROSS_CUTTING.md:135-138 / Navbar.tsx:69-78 / TWF:11-39 |
| S-06 | PASS | CROSS_CUTTING.md:122,135-138 / Navbar.tsx:82-100 / TWF:32-41 |
| S-07 | PASS | CROSS_CUTTING.md:122,135 / Navbar.tsx:69-100 / TWF:32-41 |
| S-08 | FINDING | CROSS_CUTTING.md:133-138 / STORE:493-496,534-553,1285-1303 / no boundary test. Active scope remains through Candidate/RCA and Simulation. |
| S-09 | PASS | CROSS_CUTTING.md:120-123 / WF; src/features/cost-breakdown/components/SnapshotComparisonCard.tsx:139-149 / TWF; TUI |

### T. Navigation and Cross-Flow State

| ID | Status | Spec / code / test evidence |
|---|---|---|
| T-01 | PASS | MDspec:9 / src/state/store.tsx:510-533 / THIST |
| T-02 | PASS | FL3; FINAL_LOGIC_SPEC.md:369-376 / CandidateSelectionPage.tsx:24-60; CANDcode / TCAND |
| T-03 | PASS | FINAL_LOGIC_SPEC.md:378-420 / RCA:42-56; CandidateSelectionPage.tsx:68-79 / TH |
| T-04 | FINDING | FL3; FL1 / STORE:493-496,534-553; APP:111-134. Scope is not ended on RCA/Simulation entry. |
| T-05 | PASS | SP0 / APP:116-134 / TSC:38-43; TSV:109-131 |
| T-06 | PASS | SP0; SP3 / APP:66-73,97-108 / TSW:51-54; TSV:199-215 |
| T-07 | PASS | SP0 / SPAGE:352-443 / TSV:109-131 |
| T-08 | PASS | SP0 / APP:38-64 / THIST records browser navigation/reload |
| T-09 | PASS | SP0 / APP:38-64; src/services/storage/session-storage.ts:5-26 / THIST |
| T-10 | PASS | SP0 / APP:38-60; SSTATE:136-141 / TSC:33-37 |
| T-11 | FINDING | FL1; CROSS_CUTTING.md:133-138 / APP:34-48 filters context by product ID / no regression assertion exercises RCA context after product switching. |
| T-12 | FINDING | FL3:359-363 / STORE:531-553 fingerprints and invalidates scope on source change / no test exercises this invalidation. |
| T-13 | PASS | SP1 / SSTATE:45-47,83-113 / TSW:41-48,59-64 |
| T-14 | FINDING | SP1 / APP:76-80; SSTATE:34-42 / no direct test asserts Reset clears intended SIM state without changing Master Data. |
| T-15 | FINDING | FL1; FL3 / APP:34-48,111-134. Handoff context remains in router state and is reused for later same-product direct Simulation entry; no stale-context test. |
| T-16 | NOT VERIFIED | FL4; SP1 / SSTATE:65-113 sanitizes known legacy factors, missing economics, invalid role/fingerprint / no test covers all incompatible legacy serialized SIM shapes. |

### U. Explicitly Superseded / Forbidden Active Behavior

| ID | Status | Spec / code / test evidence |
|---|---|---|
| U-01 | PASS | FL4 / NAV:5-9 / active-source scan; TSV:42 |
| U-02 | PASS | FL4 / APP; NAV / active-source scan; TH:57-58; TSV:42 |
| U-03 | PASS | FL4 / APP; NAV / active-source scan; TH:57-58 |
| U-04 | PASS | FL4 / APP; NAV / active-source scan |
| U-05 | PASS | FL4 / RCA; APP / active-source scan; TH:57-58 |
| U-06 | PASS | FL4 / NAV; APP / active-source scan; TSV:42 |
| U-07 | PASS | FL1; FINAL_LOGIC_SPEC.md:412-420 / RCA:90-142 / TH:38-39,50 |
| U-08 | PASS | FL4 / APP:66-109; SSTATE:49-62 / TSW:37-40 |
| U-09 | PASS | FL1 / RCA:3-17; STORE:1285-1303 / TH |
| U-10 | PASS | FL3 / STORE:1285-1303; CandidateSelectionPage.tsx:68-79 / TH |
| U-11 | PASS | FL4; CANDIDATE.md:95-101 / RCA:3-17; MasterDataWorkspaceHeader.tsx:446-457 / verify_rca_case_domain.ts |
| U-12 | PASS | FL2; FL4 / SPAGE:352-443; SSTATE:49-62 / TSE:59-62 |
| U-13 | PASS | FL2; FL4 / SSTATE:12-15; SENGINE:100-106 / TBIZ |
| U-14 | PASS | FL2; FL4 / SSTATE:12-15; SENGINE:100-106 / TBIZ |
| U-15 | PASS | SP3; FL4 / ECO:64-123 / TEC:29 |
| U-16 | PASS | SP3; FL4 / SPAGE:370-400; ECO:20-25 / TSV:106-107 |
| U-17 | PASS | SP0; FL4 / APP:116-134; SPAGE:352-400 / TSV:109-131 |
| U-18 | PASS | FL4 / APP; SPAGE / active-source scan; TSV:42 |
| U-19 | PASS | FL3 / src/features/cost-breakdown/CostBreakdownPage.tsx; src/state/store.tsx:531-542 / THIST |
| U-20 | PASS | FL4 / MDUI:368-457 / MASTER_DATA.md:7,86-91; TUI |
| U-21 | PASS | SP1; FL4 / SENGINE:77-97; SPAGE:379-389 / TSE:63-66 |
| U-22 | PASS | FL1; FL4 / src/state/rca-cases.ts:20-56 / TH:19-27 |
| U-23 | PASS | SP5; FL4 / SPAGE:352-443 / active-source scan; TSV:42,107 |
| U-24 | PASS | FL4; FINAL_LOGIC_SPEC.md:369-376 / CANDcode:48-51 / TCAND |
| U-25 | PASS | FL2; FL4 / STORY:3-16; SimulationStoryGraph.tsx:6-18 / active-source scan |
| U-26 | PASS | FL2; FL4 / STORY; SimulationStoryGraph.tsx:6-18 / active-source scan |
| U-27 | PASS | FL2; FL4 / STORY; SimulationStoryGraph.tsx:6-18 / active-source scan |
| U-28 | PASS | FL2; FL4 / scenario-business.ts:23-45; SimulationStoryGraph.tsx:6-18 / active-source scan |

### V. Compatible UI/Interaction Preservation Gate

| ID | Status | Spec / code / test evidence |
|---|---|---|
| V-01 | PASS | DES:28-50 / APP; PAGE; WF / TUI; TSV. Static evidence supports compact engineering-console direction; human visual acceptance remains pending under V-10. |
| V-02 | NOT VERIFIED | DES:48-53 / no full baseline-to-HEAD diff review in this subtask; see W-29. |
| V-03 | PASS | MDspec; DES:208-211 / MDUI:117-329,368-390 / TUI |
| V-04 | PASS | DES:208-230 / AppLayout.tsx:21-67 / TUI |
| V-05 | PASS | GATE:152-160,686 / HANDOFF.md:14,69 |
| V-06 | PASS | DES:28-53,225-227 / NAV:5-9 / active-source scan |
| V-07 | PASS | DES:169-170,271-272 / SPAGE:215-225 / TSV:34-42 |
| V-08 | PASS | DES:268-275 / SPAGE:190-204 / TSV:34-42 |
| V-09 | PASS | MDspec:126-129 / MDcells / TUI. Editable cells default white; amber indicates invalid input, not Excel-style editable yellow. |
| V-10 | PASS | docs/specs/CROSS_CUTTING.md:155-157 / HANDOFF.md:32-39 explicitly records unperformed browser click and pending visual review. |

### W. Final Verification / Evidence Gate

| ID | Status | Spec / code / test evidence |
|---|---|---|
| W-01 | PASS | GATE:697-698 / Spec evidence keys are recorded for every A-01 through W-33 matrix row in this complete audit. |
| W-02 | PASS | GATE:697-698 / Code evidence keys are recorded for every implemented A-01 through W-33 matrix row in this complete audit. |
| W-03 | FINDING | GATE:699 / O-04/O-06, P-23, T-11/T-12/T-14/T-15 lack direct assertions; S-08/T-04 and stale RCA context are uncovered lifecycle defects. |
| W-04 | NOT VERIFIED | GATE:700 / HANDOFF.md:32-39 records browser click and human visual acceptance as unperformed. |
| W-05 | PASS | GATE:701 / progress.md:199-201 records 55 TypeScript verifiers passing; relevant engine verifiers rerun in this audit. |
| W-06 | PASS | GATE:702 / THIST full-suite record; verify_master_data_ui_state.mjs rerun and passed. |
| W-07 | PASS | GATE:703 / THIST full-suite record. |
| W-08 | PASS | GATE:704 / THIST records the canonical neutral workbook verifier in the 55-script suite. |
| W-09 | PASS | GATE:705 / THIST full-suite record. |
| W-10 | FINDING | GATE:706 / no Selected Comparison lifecycle verifier found; scope is not ended at RCA/Simulation boundary (S-08/T-04). |
| W-11 | PASS | GATE:707 / TCAND rerun and passed. |
| W-12 | PASS | GATE:708 / TH; RCA domain and record verifiers rerun and passed. |
| W-13 | PASS | GATE:709 / TH:24,38-39 |
| W-14 | PASS | GATE:710 / TH:15-58, rerun and passed. |
| W-15 | PASS | GATE:711 / TSC:38-43; TSV:109-131 |
| W-16 | PASS | GATE:712 / TSW:35-64 |
| W-17 | FINDING | GATE:713 / TSE covers the four statuses but does not test editing a selected UNCHANGED or ADDED record (O-04/O-06). |
| W-18 | PASS | GATE:714 / TSE:80-83; TSV:91-105,169-197 |
| W-19 | PASS | GATE:715 / TSE:112-116 |
| W-20 | PASS | GATE:716 / TEC:35-38; TSV:109-128 |
| W-21 | PASS | GATE:717 / TEC:20-32; TSV:199-215 |
| W-22 | PASS | GATE:718 / TEC:29 |
| W-23 | PASS | GATE:719 / TBIZ:4-24; TEC:66-70 |
| W-24 | FINDING | GATE:720 / TSC covers SIM per-product state and THIST records browser navigation/reload, but neither tests stale RCA-context re-entry or Selected Comparison boundary clearing. |
| W-25 | PASS | GATE:721 / active-source git grep scan returned no prohibited active strings. |
| W-26 | PASS | GATE:722 / HANDOFF.md and progress.md:199-201 record npx tsc --noEmit --pretty false passing at latest application checkpoint. |
| W-27 | PASS | GATE:723 / HANDOFF.md and progress.md:199-201 record production build passing, 2,032 modules. |
| W-28 | PASS | GATE:724 / current git diff --check exited 0; only line-ending notice. |
| W-29 | NOT VERIFIED | GATE:725 / full baseline-to-HEAD diff was not reviewed in this subtask. |
| W-30 | PASS | GATE:726 / HANDOFF.md:32-39 documents browser/test limits and existing Vite ExcelJS fs/crypto warnings. |
| W-31 | FINDING | GATE:727 / The complete audit still contains finalized requirements marked NOT VERIFIED; these are listed by ID in the consolidated verification gaps. |
| W-32 | FINDING | GATE:728 / open lifecycle and test-coverage findings remain. |
| W-33 | PASS | GATE:729 / HANDOFF.md:14,69 says independent reviewer approval is pending; no final approval was issued. This is not final clearance. |

### N–W concrete findings

#### S-08 / T-04 / W-10 / W-24 — Selected Comparison remains active at the RCA/Simulation boundary

- Severity/impact: High. The selected scope and active-scope status can persist into RCA and Simulation, contrary to the explicit lifecycle boundary. This is the same underlying finding recorded as J-23/J-24 in the I-M audit.
- Current behavior: Candidate Case creation opens the RCA workspace without clearing the Selected Comparison scope. RCA→Simulation sets handoff context and changes tabs without clearing it. setActiveTab only changes/stores the tab; the scope remains active until explicit clear or source fingerprint invalidation.
- Required behavior: End active Selected Comparison when entering RCA or Simulation. RCA/Simulation may retain origin context, but must not show or apply active selected-scope behavior.
- Evidence: docs/specs/CROSS_CUTTING.md:133-138; src/features/candidate-selection/CandidateSelectionPage.tsx:77-81,102-109; src/App.tsx:111-127; src/state/store.tsx:493-496,534-553. No boundary regression test was found.
- Why it conflicts: SelectedComparisonScope is independent of activeTab, and neither Case entry nor direct/handoff Simulation navigation invokes clearSelectedComparison.
- Smallest safe change: Clear scope on the specified RCA/Simulation boundary while keeping selected Candidate origin/context; add tests for Case creation and both direct and RCA-handoff Simulation entry.

#### T-15 — Prior RCA context is reused on later direct Simulation entry

- Severity/impact: Medium. A later direct entry can display unrelated prior RCA Case context.
- Current behavior: App stores simulationRcaHandoff in component state and exposes its context whenever its productId matches the active product. Tab navigation does not clear the value. Leaving Simulation and later opening it directly for that product reuses the old context.
- Required behavior: Direct Simulation entry after a prior handoff must not inherit stale RCA context; leaving/re-entering Simulation must have a deterministic context lifecycle, and context must not leak across product sessions.
- Evidence: docs/specs/CANDIDATE.md:111-116; docs/specs/FINAL_LOGIC_SPEC.md:422-427; src/App.tsx:34-48,111-127; src/shared/layout/Navbar.tsx:88-91. verify_rca_handoff.ts and verify_simulation_story_view.ts test handoff and standalone entry separately, not their sequence.
- Why it conflicts: Context lifetime is tied to matching product ID and App component lifetime, not the explicit handoff transition. A later direct entry for the same product still receives it.
- Smallest safe change: Define and implement a finite handoff-context lifetime, clearing/consuming it on navigation away or later direct entry; add same-product re-entry and product-switch tests while preserving the explicit handoff transition.

#### O-04 / O-06 / W-17 — Selected UNCHANGED/ADDED editability lacks direct test coverage

- Severity/impact: Low, verification gap. The engine appears to permit edits when the record exists in SIM and its Factor is selected, but the two explicit status/editability cases are not independently regression-tested.
- Current behavior: Tests assert UNCHANGED and ADDED status; they demonstrate editing other selected records, but do not select and edit an UNCHANGED record or an ADDED record.
- Required behavior: Both records remain editable when present in SIM and selected.
- Evidence: docs/specs/SIMULATION.md:65-74; src/features/simulation/simulation-engine.ts:109-150; scripts/verify_parameter_simulation_engine.ts:68-115.
- Why it conflicts: Checklist O-04/O-06 and W-17 require status-specific editability evidence; status assertions alone do not demonstrate update behavior.
- Smallest safe change: Add one selected UNCHANGED edit and one selected ADDED edit to the existing engine verifier, asserting the SIM row changes and full-snapshot cost is recalculated.

#### P-23 — Exact zero Economic Margin lacks a regression assertion

- Severity/impact: Low, edge-case test gap. Current render branch treats zero as a valid numeric margin, but the exact boundary is not asserted.
- Current behavior: Economic tests cover positive and negative margins. EPANEL formats any non-null margin, including zero, but no test uses exact break-even inputs and verifies zero display.
- Required behavior: Zero Economic Margin remains numeric and visible.
- Evidence: docs/specs/SIMULATION.md:138-147; src/features/simulation/EconomicSimulationPanel.tsx:74-84; scripts/verify_simulation_economics.ts:20-38.
- Why it conflicts: P-23 names the zero boundary explicitly and current tests do not pin that boundary.
- Smallest safe change: Add an exact-break-even fixture and assert a numeric zero result and rendered zero value.

#### T-11 / T-12 / T-14 — Cross-flow transition coverage gaps

- Severity/impact: Low to medium, test gaps. Product scoping, source invalidation, and reset logic are present, but the listed transitions lack direct assertions.
- Current behavior: APP filters RCA context by productId; STORE fingerprints comparison inputs; Reset writes createEmptySimulationState for the active product. Existing tests cover SIM product-keyed state and source/current SIM invalidation, but not RCA-context product switching, Selected Comparison source invalidation, or Reset preserving Master Data.
- Required behavior: Product switching must not leak RCA context; source changes must invalidate Selected Comparison; SIM Reset must clear intended Simulation state without mutating Master Data.
- Evidence: docs/specs/CROSS_CUTTING.md:133-138; docs/specs/FINAL_LOGIC_SPEC.md:655-661; src/App.tsx:34-48,76-80; src/state/store.tsx:531-553; scripts/verify_simulation_context.ts:33-43; scripts/verify_simulation_workspace.ts:41-48.
- Why it conflicts: T-11/T-12/T-14 and W-03 ask for transition-level evidence, and the available tests do not exercise these exact branches.
- Smallest safe change: Add focused state/provider tests for each transition, verifying no cross-product context leak, scope invalidation on actual source change, and reset isolation from Master Data.

### N–W audit totals

- N: 20 PASS, 0 FINDING, 0 NOT VERIFIED, 0 N/A.
- O: 23 PASS, 2 FINDING, 0 NOT VERIFIED, 0 N/A.
- P: 27 PASS, 1 FINDING, 0 NOT VERIFIED, 0 N/A.
- Q: 11 PASS, 0 FINDING, 0 NOT VERIFIED, 0 N/A.
- R: 10 PASS, 0 FINDING, 0 NOT VERIFIED, 2 N/A — PROVISIONAL/UI ONLY.
- S: 8 PASS, 1 FINDING, 0 NOT VERIFIED, 0 N/A.
- T: 10 PASS, 5 FINDING, 1 NOT VERIFIED, 0 N/A.
- U: 28 PASS, 0 FINDING, 0 NOT VERIFIED, 0 N/A.
- V: 9 PASS, 0 FINDING, 1 NOT VERIFIED, 0 N/A.
- W after full-audit reconciliation: 25 PASS, 6 FINDING, 2 NOT VERIFIED, 0 N/A.
- Total N–W after full-audit reconciliation: 171 PASS, 15 FINDING, 4 NOT VERIFIED, 2 N/A — PROVISIONAL/UI ONLY (192 requirements).

### N–W verification results and limitations

- Re-ran and passed 13 TypeScript verifiers: verify_rca_handoff.ts, verify_rca_case_domain.ts, verify_rca_record.ts, verify_candidate_prioritization.ts, verify_simulation_context.ts, verify_simulation_workspace.ts, verify_simulation_story_view.ts, verify_parameter_simulation_engine.ts, verify_simulation_economics.ts, verify_scenario_story.ts, verify_scenario_business_metrics.ts, verify_scenario_cost_overrides.ts, and verify_workflow_status.ts.
- Re-ran and passed both MJS verifiers: verify_master_data_ui_state.mjs and verify_cost_breakdown_review_feedback.mjs.
- git diff --check exited 0; Git printed only an LF-to-CRLF notice for task_plan.md.
- Active-source git grep scan for retired Trial/A-B/RCA-Simulation identifiers and out-of-scope financial metrics returned no matches (exit 1, expected no-match result).
- The TypeScript verifier runner printed Vite dependency-scan close noise while the verifier processes exited 0. The Cost Breakdown MJS verifier reported a WebSocket port-in-use warning and exited 0.
- Historical typecheck, production build, and all-55-TypeScript/two-MJS suite results are recorded in HANDOFF.md and progress.md:199-201. They were not rerun during this N-W subtask.
- At the time of this N–W sub-audit, A–M were outside its assignment; the complete Phase 1 audit now provides W-01/W-02 evidence and confirms W-31 is a finding. W-04 human-only/browser behavior and W-29 baseline-to-HEAD review remain outstanding. W-16 legacy SIM state beyond the known tested migrations is not established. No browser-driven handoff-click/product-switch sequence was performed in this audit.
- The pre-existing modified task_plan.md and untracked src/graphify-out/ were not changed by this append task.

## Phase 2 — Consolidated Initial Audit Findings

### Initial status by section

| Section | PASS | FINDING | NOT VERIFIED | N/A — PROVISIONAL/UI ONLY |
|---|---:|---:|---:|---:|
| A | 6 | 3 | 0 | 0 |
| B | 27 | 0 | 0 | 0 |
| C | 16 | 1 | 2 | 0 |
| D | 6 | 0 | 8 | 0 |
| E | 14 | 0 | 7 | 0 |
| F | 16 | 0 | 3 | 0 |
| G | 23 | 1 | 3 | 0 |
| H | 7 | 0 | 25 | 0 |
| I | 20 | 1 | 6 | 0 |
| J | 0 | 2 | 22 | 0 |
| K | 17 | 1 | 12 | 0 |
| L | 13 | 0 | 3 | 0 |
| M | 15 | 2 | 1 | 0 |
| N | 20 | 0 | 0 | 0 |
| O | 23 | 2 | 0 | 0 |
| P | 27 | 1 | 0 | 0 |
| Q | 11 | 0 | 0 | 0 |
| R | 10 | 0 | 0 | 2 |
| S | 8 | 1 | 0 | 0 |
| T | 10 | 5 | 1 | 0 |
| U | 28 | 0 | 0 | 0 |
| V | 9 | 0 | 1 | 0 |
| W | 25 | 6 | 2 | 0 |
| **Total (475 IDs)** | **351** | **26** | **96** | **2** |

The per-ID matrix above is the detailed initial evidence ledger. The section counts are computed from those matrix rows; any contradictory prose totals in the individual audit appendices have been corrected here (A–H is 115 PASS / 5 FINDING / 48 NOT VERIFIED; N–W is 171 PASS / 15 FINDING / 4 NOT VERIFIED / 2 N/A).

### Consolidated implementation defects

| Finding | Checklist IDs | Impact | Current behavior | Required behavior | Smallest safe change |
|---|---|---|---|---|---|
| Legacy parallel dataset and cost paths | A-05, A-06, A-08 | Medium; parallel state/calculation can drift and exposes unapproved calculations. | The provider initializes, persists, calculates, and exposes a legacy Reference/Current `WorkingDataset` and `calculateCostBreakdown` result alongside canonical `CostSnapshot` and `compareSnapshots`. No active page consumer of the legacy result was found in the audit. | Reference, Current, and Custom use the canonical schema and one shared Standard Cost engine; no competing engine is introduced. | Trace all imports/callers, then remove only the disconnected legacy state, persistence, result field, and calculation path; retarget any verifier still testing retired formulas to the canonical engine. |
| Business data survives app reload | C-19 | High; violates the specified in-memory Master Data lifecycle. | Product sessions are rehydrated from and written to `sessionStorage`, so same-tab reload restores Master Data. | Master Data Working/Last Saved state does not persist across application restart; same-session page navigation remains available. | Remove business-session rehydration/persistence at app bootstrap while retaining in-memory provider state for SPA navigation; keep non-business UI state separate if required. |
| Workbook output label mismatch | G-05 | Low; generated workbook does not match the finalized META output labels. | META output is labeled `MATERIAL`. | META output label is `MAT`. | Change that label and update the neutral workbook verifier expectation. |
| Incomplete ADDED/REMOVED rows lose their status | I-13, K-02 | High; records can disappear from the canonical status filter and Candidate pool when their cost is unavailable. | `getCanonicalComparisonStatus` checks missing confidence before one-sided identity status, returning `null` for incomplete one-sided rows. | ADDED/REMOVED status follows record presence and remains independent of whether its cost/Gap is available. | Resolve one-sided identity status before confidence; keep unavailable cost effects separate; add incomplete ADDED and REMOVED coverage through comparison filters and Candidate generation. |
| Selected Comparison remains active across RCA/Simulation boundary | J-23, J-24, S-08, T-04, W-03, W-10, W-24, W-32 | High; temporary scope incorrectly remains active after its lifecycle boundary. | Case creation and both direct/handoff Simulation navigation change pages without clearing `SelectedComparisonScope`; the active-scope cue can persist. | End active scope on RCA or Simulation entry. Only Candidate/origin context may remain; it cannot filter RCA or Simulation. | Clear active scope at the specified entry transitions while preserving the selected Candidate identities needed by the RCA Case; add boundary and invalidation tests. |
| RCA handoff context persists into later direct Simulation | M-16, M-18, T-11, T-15, W-24 | Medium; later entry can display unrelated prior RCA context for the same product. | `App` retains handoff context for its component lifetime and exposes it whenever the active product ID matches. | Handoff context is limited to its explicit RCA→Simulation transition, product-scoped, and cleared/reconciled deterministically when leaving or entering independently. | Define the in-session context lifecycle, clear it on leaving the handoff Simulation context and on incompatible product/direct entry, and test same-product re-entry plus product switching. |

### Consolidated verification gaps

The following IDs are NOT VERIFIED because existing code was present but the required path or negative condition lacked direct evidence. These are verification tasks unless a new regression test reveals a code defect; they are not assumptions that missing test code alone means the implementation is wrong.

- Master Data model/actions/Clone: C-10, C-14, D-01–D-05, D-07, D-09–D-10, E-01, E-03, E-10–E-13, E-15.
- Structural editing and workbook formula runtime semantics: F-01–F-02, F-05, G-08–G-09, G-12.
- Spreadsheet controls and navigation: H-01–H-12, H-15–H-21, H-23, H-25–H-27, H-31–H-32.
- Cost Breakdown, Selected Comparison, Candidate, RCA: I-02, I-14, I-18, I-22, I-25–I-26, J-01–J-22, K-01, K-13, K-18–K-23, K-25–K-30, L-08–L-09, L-15, M-17.
- Simulation state migration and final gates: T-16, V-02, W-04, W-29.

These statuses will be resolved by targeted automated verifiers or direct manual verification where the checklist requires actual interaction; any behavior that fails that verification becomes an implementation defect and is fixed before final re-audit.

### Documentation conflicts found

| Document | Conflict | Disposition |
|---|---|---|
| `docs/testing/REVIEW_FIXTURES.md:26` | Manual flow says choose one Candidate and compare exactly Scenario A and Scenario B. This conflicts with L-01 (one or many Candidates) and R-08–R-11 (one scenario allowed; A/B optional; multiple scenarios not required). | Update the fixture guide during implementation follow-up to describe independent Parameter/Economic Simulation, optional RCA, flexible scenario count, and one-or-many Candidate Case behavior. Do not change canonical specs. |
| `docs/testing/REVIEW_FIXTURES.md:26` | It says to "follow the selected scope downstream," contradicting J-23/J-24 and the RCA/Simulation boundary. | Change the guide to say scope ends on RCA or Simulation entry and only Candidate/origin context may remain. |
| `docs/testing/REVIEW_FIXTURES.md:49` | Calls import Sizing initialization and blank-row treatment unresolved/pending despite finalized requirements D-08 and F-18/F-19. The broader readiness behavior is not specified by those checklist items and must not be invented. | Remove the false pending-decision claim, cite the finalized import/placeholder rules, and retain only a neutral statement that this fixture does not assert behaviors outside the canonical requirements. |
| `docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md:36` | Superseded Dashboard rationale still says business metrics are unfinalized. | The entry is explicitly marked Superseded and retained as provenance; no active product instruction uses it. Leave its history intact unless a later requirement explicitly asks to revise archival rationale. |

### Phase 2 exit

- Initial audit coverage: all 475 IDs, A-01 through W-33, each appears once in the matrix and has Spec/Code/Test/Status evidence or an explicit evidence limitation.
- Initial status after full-audit reconciliation: 351 PASS, 26 FINDING, 96 NOT VERIFIED, 2 N/A — PROVISIONAL/UI ONLY.
- No application code has been modified during Phases 1–2. Source findings, evidence gaps, and stale test guidance are consolidated above; implementation may begin only after this planning checkpoint is reviewed locally.
## Phase 3 — Complete implementation audit and final re-audit

This section records the final A-01 through W-33 audit. The Phase 1 matrix and Phase 2 findings remain as initial audit history. Frozen requirement wording and IDs remain unchanged in task_plan.md. Each checklist ID below maps to the evidence keys defined here.

### Final evidence key

#### Spec evidence

| Key | Canonical source |
|---|---|
| SA | REQUIREMENTS_INDEX authority; FINAL_LOGIC_SPEC §§0, 0.3. |
| SB | FINAL_LOGIC_SPEC §§2.1–2.7; CROSS_CUTTING identity/calculation rules. |
| SC–SH | MASTER_DATA and FINAL_LOGIC_SPEC §§3.1–3.4; design.md for preserved spreadsheet interaction. |
| SI | COST_BREAKDOWN; FINAL_LOGIC_SPEC §4. |
| SJ | COST_BREAKDOWN Selected Comparison; CROSS_CUTTING lifecycle; FINAL_LOGIC_SPEC §4.6. |
| SK–SM | CANDIDATE; FINAL_LOGIC_SPEC §§5.1–5.6, including RCA Case and Handoff. |
| SN–SR | SIMULATION; FINAL_LOGIC_SPEC §§6–7, including Simulation sources, factors, economics, commercial outputs, and story. |
| SS–ST | CROSS_CUTTING; FINAL_LOGIC_SPEC §§1 and 8. |
| SU | FINAL_LOGIC_SPEC §9 and superseded behavior register. |
| SV | design.md; FINAL_LOGIC_SPEC §0.1; CROSS_CUTTING UI preservation. |
| SW | Frozen completion gate in task_plan.md, W-01 through W-33. |

#### Code evidence

| Key | Implementation inspected |
|---|---|
| CA | snapshot/product types, shared snapshot cost/comparison engine and store; disconnected legacy WorkingDataset/schema/calculation modules deleted. |
| CB | snapshot-cost.ts, snapshot-comparison.ts, comparison-status.ts, snapshot-routing-detail.ts; business-key matching and unavailable-result rules. |
| CC | product.types.ts, snapshot.types.ts, master-data-datasets.ts, store.tsx; independent Reference/Current/Custom state. |
| CD | store.tsx Save/Reset/import; clear-master-data-dataset.ts; MasterDataWorkspaceHeader.tsx. |
| CE | master-data-datasets.ts clone helper; MasterDataWorkspaceHeader.tsx source, destination and confirmation. |
| CF | dataset-sizing.ts, master-data-row-order.ts, sizing modal and Master Data structural handlers. |
| CG | master-data-workbook.ts, snapshot-parser.ts, snapshot-export.ts, dynamic workbook template generator. |
| CH | Master Data components/hooks: useTableKeyboardNav, useDragSelect, useSpreadsheetEditing, BOMTable, WorkCenterRatesTable, RoutingTable. |
| CI | store.tsx, snapshot-comparison.ts, selected-comparison.ts, CostBreakdownPage.tsx and CBD detail components. |
| CJ | store.tsx in-memory Selected Comparison, source fingerprint, tab-boundary clear; Candidate/RCA and Simulation entry handlers. |
| CK | material-candidates.ts, processing-candidates.ts, candidate-prioritization.ts and Candidate page/row controls. |
| CL | rca-cases.ts, RcaCaseWorkspace.tsx and Candidate/RCA page; case-level Root Cause/Action and compatible migration. |
| CM | App.tsx product-scoped handoff lifecycle; RcaCaseWorkspace.tsx; SimulationPage.tsx context/source/factor controls. |
| CM2 | App.tsx handoff reset and RCA-context scope; simulation-state.ts prepareSimulationForRcaHandoff; rca-cases.ts retainRcaSimulationHandoff; SimulationPage.tsx source ordering and unrestricted record-factor controls. |
| CN | simulation-state.ts, simulation-engine.ts, App.tsx and SimulationPage.tsx isolated full-snapshot SIM. |
| CO | simulation-engine.ts/state.ts and SimulationPage.tsx record-based factor IDs, editability and full-dataset calculation. |
| CP | simulation-economics.ts, EconomicSimulationPanel.tsx and SimulationPage.tsx. |
| CQ | scenario-business.ts, simulation-economics.ts, workbook formulas and commercial override presentation. |
| CR | scenario-story.ts, SimulationStoryGraph.tsx and SimulationPage.tsx. |
| CS | workflow-status.ts, Navbar.tsx and AppLayout.tsx shared status/review actions. |
| CT | App.tsx, store.tsx, session normalization, Selected Comparison and SIM lifecycle helpers. |
| CT2 | state/active-tab.ts normalizeActiveTab; store.tsx legacy session initialization and App.tsx lifecycle transition. |
| CU | Active source and navigation scan; no active Trial/A-B/formula lifecycle code. |
| CV | Existing shared frame/page composition; diff has no Footer/layout/style redesign. |
| CW | Full baseline-to-final diff reviewed against frozen requirements and scope. |

#### Test and verification evidence

| Key | Executed evidence |
|---|---|
| TA | Documentary authority review; verify_numeric_integrity.ts and active-source scan. |
| TB | Numeric, missing-rate, snapshot quality/detail, comparison reconciliation and identity verifiers. |
| TC | verify_workspace_initialization.ts, verify_master_data_custom_dataset.ts, verify_master_data_clear_dataset.ts, verify_master_data_ui_state.mjs; fresh isolated browser workspace opened empty. |
| TD | Snapshot import/mismatch, clear, custom dataset and Master Data UI verifiers; isolated browser showed role-specific Save/Reset behavior. |
| TE | verify_master_data_custom_dataset.ts covers all six Clone From directions; clone readiness/UI verifiers; populated destination warning observed and canceled. |
| TF | Dataset sizing/no-op/preservation/placeholders and master-data-row-order verifiers. |
| TG | verify_neutral_dataset_workbook.ts, snapshot import, import mismatch, comparison export and custom dataset verifiers. |
| TH | Master Data UI/history/spreadsheet verifiers; isolated browser exercised View/Edit, keyboard movement, copy/paste, TSV paste with local invalid cue, Search, bulk edit, drag row selection, navigation, Save/Reset. Shift/Ctrl handler wiring is asserted in the UI verifier. |
| TI | Comparison reconciliation, unavailable one-sided status, snapshot comparison/detail and Cost Breakdown UI verifiers. |
| TJ | verify_selected_comparison_lifecycle.ts and verify_selected_comparison_boundary.ts cover pair selection, Added/Removed, selected Gap, WC rates, no mutation/storage/export, and RCA/SIM boundary. |
| TK | Candidate prioritization, identity, population and unavailable Added/Removed verifiers. |
| TL | RCA Case/domain/record/note/handoff verifiers; browser created one- and two-Candidate cases and showed RCA complete from Root Cause + Action. |
| TM | RCA handoff, Simulation story and context-lifecycle verifiers; browser carried latest draft, placed Current first, retained Reference/Custom and allowed an additional Material Factor. |
| TM2 | verify_rca_handoff.ts and verify_rca_simulation_fresh_start.ts exercise one-/multi-Candidate context, prior Current/Reference/Custom SIM reset, cleared Factors, preserved Economic inputs, rendered source order, and additional Material/Process selection. verify_rca_simulation_context_lifecycle.ts exercises handoff expiry and product scoping. |
| TN | Simulation workspace/context/engine verifiers cover all three sources, isolation, locked structure and reset. |
| TO | Parameter engine and story verifiers cover statuses, selected-record editability and full-snapshot recalculation. |
| TP | Economics and story verifiers cover economic-only, invalid/zero/positive/negative and combined margin, Action Cost isolation; browser showed Required Saving 0.1500 before/after Parameter SIM start. |
| TQ | Economic and scenario business/override verifiers plus neutral workbook formula verifier. |
| TR | Simulation story/scenario verifiers confirm flexible Reference → Current → Simulated story with adjacent signed gaps. |
| TS | Workflow-status, Cost Breakdown review and Selected Comparison boundary verifiers. |
| TT | Selected Comparison, RCA/SIM context, simulation workspace/context verifiers; browser checked handoff, direct re-entry without stale RCA context, SIM Reset and retained RCA completion. |
| TT2 | verify_selected_comparison_boundary.ts, verify_rca_simulation_fresh_start.ts, verify_rca_simulation_context_lifecycle.ts, and verify_legacy_active_tab_migration.ts; lifecycle and migration transitions are asserted by behavior, with SSR checks for available Simulation controls. |
| TU | Simulation workspace/numeric-integrity verifiers and active-source scan. |
| TV | Browser checked compatible interactions; source diff reviewed. Human visual acceptance is deferred and not claimed. |
| TW | 62/62 TypeScript verifiers effective pass (60 through cached CJS and 2 through Vite SSR); 2/2 MJS, explicit typecheck, production build, diff check, stale scan and full baseline-to-HEAD diff review. |

### Final requirement-by-requirement status

| ID | Spec Evidence | Code Evidence | Test / verification Evidence | Status |
|---|---|---|---|---|
| A-01 | SA | CA | TA | PASS |
| A-02 | SA | CA | TA | PASS |
| A-03 | SA | CA | TA | PASS |
| A-04 | SA | CA | TA | PASS |
| A-05 | SA | CA | TA | PASS |
| A-06 | SA | CA | TA | PASS |
| A-07 | SA | CA | TA | PASS |
| A-08 | SA | CA | TA | PASS |
| A-09 | SA | CA | TA | PASS |
| B-01 | SB | CB | TB | PASS |
| B-02 | SB | CB | TB | PASS |
| B-03 | SB | CB | TB | PASS |
| B-04 | SB | CB | TB | PASS |
| B-05 | SB | CB | TB | PASS |
| B-06 | SB | CB | TB | PASS |
| B-07 | SB | CB | TB | PASS |
| B-08 | SB | CB | TB | PASS |
| B-09 | SB | CB | TB | PASS |
| B-10 | SB | CB | TB | PASS |
| B-11 | SB | CB | TB | PASS |
| B-12 | SB | CB | TB | PASS |
| B-13 | SB | CB | TB | PASS |
| B-14 | SB | CB | TB | PASS |
| B-15 | SB | CB | TB | PASS |
| B-16 | SB | CB | TB | PASS |
| B-17 | SB | CB | TB | PASS |
| B-18 | SB | CB | TB | PASS |
| B-19 | SB | CB | TB | PASS |
| B-20 | SB | CB | TB | PASS |
| B-21 | SB | CB | TB | PASS |
| B-22 | SB | CB | TB | PASS |
| B-23 | SB | CB | TB | PASS |
| B-24 | SB | CB | TB | PASS |
| B-25 | SB | CB | TB | PASS |
| B-26 | SB | CB | TB | PASS |
| B-27 | SB | CB | TB | PASS |
| C-01 | SC–SH | CC | TC | PASS |
| C-02 | SC–SH | CC | TC | PASS |
| C-03 | SC–SH | CC | TC | PASS |
| C-04 | SC–SH | CC | TC | PASS |
| C-05 | SC–SH | CC | TC | PASS |
| C-06 | SC–SH | CC | TC | PASS |
| C-07 | SC–SH | CC | TC | PASS |
| C-08 | SC–SH | CC | TC | PASS |
| C-09 | SC–SH | CC | TC | PASS |
| C-10 | SC–SH | CC | TC | PASS |
| C-11 | SC–SH | CC | TC | PASS |
| C-12 | SC–SH | CC | TC | PASS |
| C-13 | SC–SH | CC | TC | PASS |
| C-14 | SC–SH | CC | TC | PASS |
| C-15 | SC–SH | CC | TC | PASS |
| C-16 | SC–SH | CC | TC | PASS |
| C-17 | SC–SH | CC | TC | PASS |
| C-18 | SC–SH | CC | TC | PASS |
| C-19 | SC–SH | CC | TC | PASS |
| D-01 | SC–SH | CD | TD | PASS |
| D-02 | SC–SH | CD | TD | PASS |
| D-03 | SC–SH | CD | TD | PASS |
| D-04 | SC–SH | CD | TD | PASS |
| D-05 | SC–SH | CD | TD | PASS |
| D-06 | SC–SH | CD | TD | PASS |
| D-07 | SC–SH | CD | TD | PASS |
| D-08 | SC–SH | CD | TD | PASS |
| D-09 | SC–SH | CD | TD | PASS |
| D-10 | SC–SH | CD | TD | PASS |
| D-11 | SC–SH | CD | TD | PASS |
| D-12 | SC–SH | CD | TD | PASS |
| D-13 | SC–SH | CD | TD | PASS |
| D-14 | SC–SH | CD | TD | PASS |
| E-01 | SC–SH | CE | TE | PASS |
| E-02 | SC–SH | CE | TE | PASS |
| E-03 | SC–SH | CE | TE | PASS |
| E-04 | SC–SH | CE | TE | PASS |
| E-05 | SC–SH | CE | TE | PASS |
| E-06 | SC–SH | CE | TE | PASS |
| E-07 | SC–SH | CE | TE | PASS |
| E-08 | SC–SH | CE | TE | PASS |
| E-09 | SC–SH | CE | TE | PASS |
| E-10 | SC–SH | CE | TE | PASS |
| E-11 | SC–SH | CE | TE | PASS |
| E-12 | SC–SH | CE | TE | PASS |
| E-13 | SC–SH | CE | TE | PASS |
| E-14 | SC–SH | CE | TE | PASS |
| E-15 | SC–SH | CE | TE | PASS |
| E-16 | SC–SH | CE | TE | PASS |
| E-17 | SC–SH | CE | TE | PASS |
| E-18 | SC–SH | CE | TE | PASS |
| E-19 | SC–SH | CE | TE | PASS |
| E-20 | SC–SH | CE | TE | PASS |
| E-21 | SC–SH | CE | TE | PASS |
| F-01 | SC–SH | CF | TF | PASS |
| F-02 | SC–SH | CF | TF | PASS |
| F-03 | SC–SH | CF | TF | PASS |
| F-04 | SC–SH | CF | TF | PASS |
| F-05 | SC–SH | CF | TF | PASS |
| F-06 | SC–SH | CF | TF | PASS |
| F-07 | SC–SH | CF | TF | PASS |
| F-08 | SC–SH | CF | TF | PASS |
| F-09 | SC–SH | CF | TF | PASS |
| F-10 | SC–SH | CF | TF | PASS |
| F-11 | SC–SH | CF | TF | PASS |
| F-12 | SC–SH | CF | TF | PASS |
| F-13 | SC–SH | CF | TF | PASS |
| F-14 | SC–SH | CF | TF | PASS |
| F-15 | SC–SH | CF | TF | PASS |
| F-16 | SC–SH | CF | TF | PASS |
| F-17 | SC–SH | CF | TF | PASS |
| F-18 | SC–SH | CF | TF | PASS |
| F-19 | SC–SH | CF | TF | PASS |
| G-01 | SC–SH | CG | TG | PASS |
| G-02 | SC–SH | CG | TG | PASS |
| G-03 | SC–SH | CG | TG | PASS |
| G-04 | SC–SH | CG | TG | PASS |
| G-05 | SC–SH | CG | TG | PASS |
| G-06 | SC–SH | CG | TG | PASS |
| G-07 | SC–SH | CG | TG | PASS |
| G-08 | SC–SH | CG | TG | PASS |
| G-09 | SC–SH | CG | TG | PASS |
| G-10 | SC–SH | CG | TG | PASS |
| G-11 | SC–SH | CG | TG | PASS |
| G-12 | SC–SH | CG | TG | PASS |
| G-13 | SC–SH | CG | TG | PASS |
| G-14 | SC–SH | CG | TG | PASS |
| G-15 | SC–SH | CG | TG | PASS |
| G-16 | SC–SH | CG | TG | PASS |
| G-17 | SC–SH | CG | TG | PASS |
| G-18 | SC–SH | CG | TG | PASS |
| G-19 | SC–SH | CG | TG | PASS |
| G-20 | SC–SH | CG | TG | PASS |
| G-21 | SC–SH | CG | TG | PASS |
| G-22 | SC–SH | CG | TG | PASS |
| G-23 | SC–SH | CG | TG | PASS |
| G-24 | SC–SH | CG | TG | PASS |
| G-25 | SC–SH | CG | TG | PASS |
| G-26 | SC–SH | CG | TG | PASS |
| G-27 | SC–SH | CG | TG | PASS |
| H-01 | SC–SH | CH | TH | PASS |
| H-02 | SC–SH | CH | TH | PASS |
| H-03 | SC–SH | CH | TH | PASS |
| H-04 | SC–SH | CH | TH | PASS |
| H-05 | SC–SH | CH | TH | PASS |
| H-06 | SC–SH | CH | TH | PASS |
| H-07 | SC–SH | CH | TH | PASS |
| H-08 | SC–SH | CH | TH | PASS |
| H-09 | SC–SH | CH | TH | PASS |
| H-10 | SC–SH | CH | TH | PASS |
| H-11 | SC–SH | CH | TH | PASS |
| H-12 | SC–SH | CH | TH | PASS |
| H-13 | SC–SH | CH | TH | PASS |
| H-14 | SC–SH | CH | TH | PASS |
| H-15 | SC–SH | CH | TH | PASS |
| H-16 | SC–SH | CH | TH | PASS |
| H-17 | SC–SH | CH | TH | PASS |
| H-18 | SC–SH | CH | TH | PASS |
| H-19 | SC–SH | CH | TH | PASS |
| H-20 | SC–SH | CH | TH | PASS |
| H-21 | SC–SH | CH | TH | PASS |
| H-22 | SC–SH | CH | TH | PASS |
| H-23 | SC–SH | CH | TH | PASS |
| H-24 | SC–SH | CH | TH | PASS |
| H-25 | SC–SH | CH | TH | PASS |
| H-26 | SC–SH | CH | TH | PASS |
| H-27 | SC–SH | CH | TH | PASS |
| H-28 | SC–SH | CH | TH | PASS |
| H-29 | SC–SH | CH | TH | PASS |
| H-30 | SC–SH | CH | TH | PASS |
| H-31 | SC–SH | CH | TH | PASS |
| H-32 | SC–SH | CH | TH | PASS |
| I-01 | SI | CI | TI | PASS |
| I-02 | SI | CI | TI | PASS |
| I-03 | SI | CI | TI | PASS |
| I-04 | SI | CI | TI | PASS |
| I-05 | SI | CI | TI | PASS |
| I-06 | SI | CI | TI | PASS |
| I-07 | SI | CI | TI | PASS |
| I-08 | SI | CI | TI | PASS |
| I-09 | SI | CI | TI | PASS |
| I-10 | SI | CI | TI | PASS |
| I-11 | SI | CI | TI | PASS |
| I-12 | SI | CI | TI | PASS |
| I-13 | SI | CI | TI | PASS |
| I-14 | SI | CI | TI | PASS |
| I-15 | SI | CI | TI | PASS |
| I-16 | SI | CI | TI | PASS |
| I-17 | SI | CI | TI | PASS |
| I-18 | SI | CI | TI | PASS |
| I-19 | SI | CI | TI | PASS |
| I-20 | SI | CI | TI | PASS |
| I-21 | SI | CI | TI | PASS |
| I-22 | SI | CI | TI | PASS |
| I-23 | SI | CI | TI | PASS |
| I-24 | SI | CI | TI | PASS |
| I-25 | SI | CI | TI | PASS |
| I-26 | SI | CI | TI | PASS |
| I-27 | SI | CI | TI | PASS |
| J-01 | SJ | CJ | TJ | PASS |
| J-02 | SJ | CJ | TJ | PASS |
| J-03 | SJ | CJ | TJ | PASS |
| J-04 | SJ | CJ | TJ | PASS |
| J-05 | SJ | CJ | TJ | PASS |
| J-06 | SJ | CJ | TJ | PASS |
| J-07 | SJ | CJ | TJ | PASS |
| J-08 | SJ | CJ | TJ | PASS |
| J-09 | SJ | CJ | TJ | PASS |
| J-10 | SJ | CJ | TJ | PASS |
| J-11 | SJ | CJ | TJ | PASS |
| J-12 | SJ | CJ | TJ | PASS |
| J-13 | SJ | CJ | TJ | PASS |
| J-14 | SJ | CJ | TJ | PASS |
| J-15 | SJ | CJ | TJ | PASS |
| J-16 | SJ | CJ | TJ | PASS |
| J-17 | SJ | CJ | TJ | PASS |
| J-18 | SJ | CJ | TJ | PASS |
| J-19 | SJ | CJ | TJ | PASS |
| J-20 | SJ | CJ | TJ | PASS |
| J-21 | SJ | CJ | TJ | PASS |
| J-22 | SJ | CJ | TJ | PASS |
| J-23 | SJ | CJ | TJ | PASS |
| J-24 | SJ | CJ | TJ | PASS |
| K-01 | SK–SM | CK | TK | PASS |
| K-02 | SK–SM | CK | TK | PASS |
| K-03 | SK–SM | CK | TK | PASS |
| K-04 | SK–SM | CK | TK | PASS |
| K-05 | SK–SM | CK | TK | PASS |
| K-06 | SK–SM | CK | TK | PASS |
| K-07 | SK–SM | CK | TK | PASS |
| K-08 | SK–SM | CK | TK | PASS |
| K-09 | SK–SM | CK | TK | PASS |
| K-10 | SK–SM | CK | TK | PASS |
| K-11 | SK–SM | CK | TK | PASS |
| K-12 | SK–SM | CK | TK | PASS |
| K-13 | SK–SM | CK | TK | PASS |
| K-14 | SK–SM | CK | TK | PASS |
| K-15 | SK–SM | CK | TK | PASS |
| K-16 | SK–SM | CK | TK | PASS |
| K-17 | SK–SM | CK | TK | PASS |
| K-18 | SK–SM | CK | TK | PASS |
| K-19 | SK–SM | CK | TK | PASS |
| K-20 | SK–SM | CK | TK | PASS |
| K-21 | SK–SM | CK | TK | PASS |
| K-22 | SK–SM | CK | TK | PASS |
| K-23 | SK–SM | CK | TK | PASS |
| K-24 | SK–SM | CK | TK | PASS |
| K-25 | SK–SM | CK | TK | PASS |
| K-26 | SK–SM | CK | TK | PASS |
| K-27 | SK–SM | CK | TK | PASS |
| K-28 | SK–SM | CK | TK | PASS |
| K-29 | SK–SM | CK | TK | PASS |
| K-30 | SK–SM | CK | TK | PASS |
| L-01 | SK–SM | CL | TL | PASS |
| L-02 | SK–SM | CL | TL | PASS |
| L-03 | SK–SM | CL | TL | PASS |
| L-04 | SK–SM | CL | TL | PASS |
| L-05 | SK–SM | CL | TL | PASS |
| L-06 | SK–SM | CL | TL | PASS |
| L-07 | SK–SM | CL | TL | PASS |
| L-08 | SK–SM | CL | TL | PASS |
| L-09 | SK–SM | CL | TL | PASS |
| L-10 | SK–SM | CL | TL | PASS |
| L-11 | SK–SM | CL | TL | PASS |
| L-12 | SK–SM | CL | TL | PASS |
| L-13 | SK–SM | CL | TL | PASS |
| L-14 | SK–SM | CL | TL | PASS |
| L-15 | SK–SM | CL | TL | PASS |
| L-16 | SK–SM | CL | TL | PASS |
| M-01 | SK–SM | CM | TM | PASS |
| M-02 | SK–SM | CM2 | TM2 | PASS |
| M-03 | SK–SM | CM2 | TM2 | PASS |
| M-04 | SK–SM | CM2 | TM2 | PASS |
| M-05 | SK–SM | CM2 | TM2 | PASS |
| M-06 | SK–SM | CM2 | TM2 | PASS |
| M-07 | SK–SM | CM2 | TM2 | PASS |
| M-08 | SK–SM | CM2 | TM2 | PASS |
| M-09 | SK–SM | CM2 | TM2 | PASS |
| M-10 | SK–SM | CM2 | TM2 | PASS |
| M-11 | SK–SM | CM | TM | PASS |
| M-12 | SK–SM | CM | TM | PASS |
| M-13 | SK–SM | CM | TM | PASS |
| M-14 | SK–SM | CM | TM | PASS |
| M-15 | SK–SM | CM | TM | PASS |
| M-16 | SK–SM | CM2 | TM2 | PASS |
| M-17 | SK–SM | CM2 | TM2 | PASS |
| M-18 | SK–SM | CM2 | TM2 | PASS |
| N-01 | SN–SR | CN | TN | PASS |
| N-02 | SN–SR | CN | TN | PASS |
| N-03 | SN–SR | CN | TN | PASS |
| N-04 | SN–SR | CN | TN | PASS |
| N-05 | SN–SR | CN | TN | PASS |
| N-06 | SN–SR | CN | TN | PASS |
| N-07 | SN–SR | CN | TN | PASS |
| N-08 | SN–SR | CN | TN | PASS |
| N-09 | SN–SR | CN | TN | PASS |
| N-10 | SN–SR | CN | TN | PASS |
| N-11 | SN–SR | CN | TN | PASS |
| N-12 | SN–SR | CN | TN | PASS |
| N-13 | SN–SR | CN | TN | PASS |
| N-14 | SN–SR | CN | TN | PASS |
| N-15 | SN–SR | CN | TN | PASS |
| N-16 | SN–SR | CN | TN | PASS |
| N-17 | SN–SR | CN | TN | PASS |
| N-18 | SN–SR | CN | TN | PASS |
| N-19 | SN–SR | CN | TN | PASS |
| N-20 | SN–SR | CN | TN | PASS |
| O-01 | SN–SR | CO | TO | PASS |
| O-02 | SN–SR | CO | TO | PASS |
| O-03 | SN–SR | CO | TO | PASS |
| O-04 | SN–SR | CO | TO | PASS |
| O-05 | SN–SR | CO | TO | PASS |
| O-06 | SN–SR | CO | TO | PASS |
| O-07 | SN–SR | CO | TO | PASS |
| O-08 | SN–SR | CO | TO | PASS |
| O-09 | SN–SR | CO | TO | PASS |
| O-10 | SN–SR | CO | TO | PASS |
| O-11 | SN–SR | CO | TO | PASS |
| O-12 | SN–SR | CO | TO | PASS |
| O-13 | SN–SR | CO | TO | PASS |
| O-14 | SN–SR | CO | TO | PASS |
| O-15 | SN–SR | CO | TO | PASS |
| O-16 | SN–SR | CO | TO | PASS |
| O-17 | SN–SR | CO | TO | PASS |
| O-18 | SN–SR | CO | TO | PASS |
| O-19 | SN–SR | CO | TO | PASS |
| O-20 | SN–SR | CO | TO | PASS |
| O-21 | SN–SR | CO | TO | PASS |
| O-22 | SN–SR | CO | TO | PASS |
| O-23 | SN–SR | CO | TO | PASS |
| O-24 | SN–SR | CO | TO | PASS |
| O-25 | SN–SR | CO | TO | PASS |
| P-01 | SN–SR | CP | TP | PASS |
| P-02 | SN–SR | CP | TP | PASS |
| P-03 | SN–SR | CP | TP | PASS |
| P-04 | SN–SR | CP | TP | PASS |
| P-05 | SN–SR | CP | TP | PASS |
| P-06 | SN–SR | CP | TP | PASS |
| P-07 | SN–SR | CP | TP | PASS |
| P-08 | SN–SR | CP | TP | PASS |
| P-09 | SN–SR | CP | TP | PASS |
| P-10 | SN–SR | CP | TP | PASS |
| P-11 | SN–SR | CP | TP | PASS |
| P-12 | SN–SR | CP | TP | PASS |
| P-13 | SN–SR | CP | TP | PASS |
| P-14 | SN–SR | CP | TP | PASS |
| P-15 | SN–SR | CP | TP | PASS |
| P-16 | SN–SR | CP | TP | PASS |
| P-17 | SN–SR | CP | TP | PASS |
| P-18 | SN–SR | CP | TP | PASS |
| P-19 | SN–SR | CP | TP | PASS |
| P-20 | SN–SR | CP | TP | PASS |
| P-21 | SN–SR | CP | TP | PASS |
| P-22 | SN–SR | CP | TP | PASS |
| P-23 | SN–SR | CP | TP | PASS |
| P-24 | SN–SR | CP | TP | PASS |
| P-25 | SN–SR | CP | TP | PASS |
| P-26 | SN–SR | CP | TP | PASS |
| P-27 | SN–SR | CP | TP | PASS |
| P-28 | SN–SR | CP | TP | PASS |
| Q-01 | SN–SR | CQ | TQ | PASS |
| Q-02 | SN–SR | CQ | TQ | PASS |
| Q-03 | SN–SR | CQ | TQ | PASS |
| Q-04 | SN–SR | CQ | TQ | PASS |
| Q-05 | SN–SR | CQ | TQ | PASS |
| Q-06 | SN–SR | CQ | TQ | PASS |
| Q-07 | SN–SR | CQ | TQ | PASS |
| Q-08 | SN–SR | CQ | TQ | PASS |
| Q-09 | SN–SR | CQ | TQ | PASS |
| Q-10 | SN–SR | CQ | TQ | PASS |
| Q-11 | SN–SR | CQ | TQ | PASS |
| R-01 | SN–SR | CR | TR | PASS |
| R-02 | SN–SR | CR | TR | PASS |
| R-03 | SN–SR | CR | TR | PASS |
| R-04 | SN–SR | CR | TR | PASS |
| R-05 | SN–SR | CR | TR | PASS |
| R-06 | SN–SR | CR | TR | PASS |
| R-07 | SN–SR | CR | TR | PASS |
| R-08 | SN–SR | CR | TR | PASS |
| R-09 | SN–SR | CR | TR | PASS |
| R-10 | SN–SR | CR | TR | N/A — PROVISIONAL/UI ONLY |
| R-11 | SN–SR | CR | TR | N/A — PROVISIONAL/UI ONLY |
| R-12 | SN–SR | CR | TR | PASS |
| S-01 | SS–ST | CS | TS | PASS |
| S-02 | SS–ST | CS | TS | PASS |
| S-03 | SS–ST | CS | TS | PASS |
| S-04 | SS–ST | CS | TS | PASS |
| S-05 | SS–ST | CS | TS | PASS |
| S-06 | SS–ST | CS | TS | PASS |
| S-07 | SS–ST | CS | TS | PASS |
| S-08 | SS–ST | CS | TS | PASS |
| S-09 | SS–ST | CS | TS | PASS |
| T-01 | SS–ST | CT | TT | PASS |
| T-02 | SS–ST | CT | TT | PASS |
| T-03 | SS–ST | CT | TT | PASS |
| T-04 | SS–ST | CJ / CM2 | TJ / TT2 | PASS |
| T-05 | SS–ST | CN / CM2 | TN / TT2 | PASS |
| T-06 | SS–ST | CT | TT | PASS |
| T-07 | SS–ST | CT | TT | PASS |
| T-08 | SS–ST | CT | TT | PASS |
| T-09 | SS–ST | CT | TT | PASS |
| T-10 | SS–ST | CT | TT | PASS |
| T-11 | SS–ST | CT | TT | PASS |
| T-12 | SS–ST | CT | TT | PASS |
| T-13 | SS–ST | CT | TT | PASS |
| T-14 | SS–ST | CT | TT | PASS |
| T-15 | SS–ST | CT2 | TT2 | PASS |
| T-16 | SS–ST | CT2 | TT2 | PASS |
| U-01 | SU | CU | TU | PASS |
| U-02 | SU | CU | TU | PASS |
| U-03 | SU | CU | TU | PASS |
| U-04 | SU | CU | TU | PASS |
| U-05 | SU | CU | TU | PASS |
| U-06 | SU | CU | TU | PASS |
| U-07 | SU | CU | TU | PASS |
| U-08 | SU | CU | TU | PASS |
| U-09 | SU | CU | TU | PASS |
| U-10 | SU | CU | TU | PASS |
| U-11 | SU | CU | TU | PASS |
| U-12 | SU | CU | TU | PASS |
| U-13 | SU | CU | TU | PASS |
| U-14 | SU | CU | TU | PASS |
| U-15 | SU | CU | TU | PASS |
| U-16 | SU | CU | TU | PASS |
| U-17 | SU | CU | TU | PASS |
| U-18 | SU | CU | TU | PASS |
| U-19 | SU | CU | TU | PASS |
| U-20 | SU | CU | TU | PASS |
| U-21 | SU | CU | TU | PASS |
| U-22 | SU | CU | TU | PASS |
| U-23 | SU | CU | TU | PASS |
| U-24 | SU | CU | TU | PASS |
| U-25 | SU | CU | TU | PASS |
| U-26 | SU | CU | TU | PASS |
| U-27 | SU | CU | TU | PASS |
| U-28 | SU | CU | TU | PASS |
| V-01 | SV | CV | TV | PASS |
| V-02 | SV | CV | TV | PASS |
| V-03 | SV | CV | TV | PASS |
| V-04 | SV | CV | TV | PASS |
| V-05 | SV | CV | TV | PASS |
| V-06 | SV | CV | TV | PASS |
| V-07 | SV | CV | TV | PASS |
| V-08 | SV | CV | TV | PASS |
| V-09 | SV | CV | TV | PASS |
| V-10 | SV | CV | TV | PASS |
| W-01 | SW | CW | TW | PASS |
| W-02 | SW | CW | TW | PASS |
| W-03 | SW | CW | TW | PASS |
| W-04 | SW | CW | TW | PASS |
| W-05 | SW | CW | TW | PASS |
| W-06 | SW | CW | TW | PASS |
| W-07 | SW | CW | TW | PASS |
| W-08 | SW | CW | TW | PASS |
| W-09 | SW | CW | TW | PASS |
| W-10 | SW | CW | TW | PASS |
| W-11 | SW | CW | TW | PASS |
| W-12 | SW | CW | TW | PASS |
| W-13 | SW | CW | TW | PASS |
| W-14 | SW | CM2 | TM2 | PASS |
| W-15 | SW | CW | TW | PASS |
| W-16 | SW | CW | TW | PASS |
| W-17 | SW | CW | TW | PASS |
| W-18 | SW | CW | TW | PASS |
| W-19 | SW | CW | TW | PASS |
| W-20 | SW | CW | TW | PASS |
| W-21 | SW | CW | TW | PASS |
| W-22 | SW | CW | TW | PASS |
| W-23 | SW | CW | TW | PASS |
| W-24 | SW | CJ / CT2 | TJ / TT2 | PASS |
| W-25 | SW | CW | TW | PASS |
| W-26 | SW | CW | TW | PASS |
| W-27 | SW | CW | TW | PASS |
| W-28 | SW | CW | TW | PASS |
| W-29 | SW | CW | TW | PASS |
| W-30 | SW | CW | TW | PASS |
| W-31 | SW | CW | TW | PASS |
| W-32 | SW | CW | TW | PASS |
| W-33 | SW | CW | TW | PASS |

### Final totals

| Section | PASS | FINDING | NOT VERIFIED | N/A — PROVISIONAL/UI ONLY |
|---|---:|---:|---:|---:|
| A | 9 | 0 | 0 | 0 |
| B | 27 | 0 | 0 | 0 |
| C | 19 | 0 | 0 | 0 |
| D | 14 | 0 | 0 | 0 |
| E | 21 | 0 | 0 | 0 |
| F | 19 | 0 | 0 | 0 |
| G | 27 | 0 | 0 | 0 |
| H | 32 | 0 | 0 | 0 |
| I | 27 | 0 | 0 | 0 |
| J | 24 | 0 | 0 | 0 |
| K | 30 | 0 | 0 | 0 |
| L | 16 | 0 | 0 | 0 |
| M | 18 | 0 | 0 | 0 |
| N | 20 | 0 | 0 | 0 |
| O | 25 | 0 | 0 | 0 |
| P | 28 | 0 | 0 | 0 |
| Q | 11 | 0 | 0 | 0 |
| R | 10 | 0 | 0 | 2 |
| S | 9 | 0 | 0 | 0 |
| T | 16 | 0 | 0 | 0 |
| U | 28 | 0 | 0 | 0 |
| V | 10 | 0 | 0 | 0 |
| W | 33 | 0 | 0 | 0 |
| **Total (475 IDs)** | **473** | **0** | **0** | **2** |

### Findings disposition and limitations

- Closed A-05/A-06/A-08 by removing the disconnected legacy WorkingDataset and competing calculation/driver/detail engines; old verifier scripts now test canonical snapshots and assert retired modules are absent.
- C-19 was an incorrect initial finding: Master Data uses transient sessionStorage, not permanent DB/history/version storage; a fresh isolated browser context opened empty.
- Closed G-05 with workbook label MAT, and I-13/K-02 by resolving one-sided ADDED/REMOVED identity status separately from calculation confidence.
- Closed J-23/J-24/S-08/T-04 by ending Selected Comparison when RCA Case workspace or Simulation opens; source fingerprint changes invalidate stale scope.
- Closed M-16/M-18/T-11/T-15 by clearing handoff context when leaving Simulation or changing product; direct Simulation re-entry showed no unrelated RCA context.
- Independent review of `4a1968db841d97ff8d6c44b3aadf929f73e01be1` found that a new RCA handoff could retain an unrelated Parameter SIM and that legacy `activeTab='rca'` migrated to Simulation. Both were corrected in Phase 16: the explicit handoff now starts from a fresh Parameter SIM state, and legacy RCA navigation maps to Candidate.
- The handoff reset clears Parameter source, snapshot, source fingerprint, start time, and selected Factors while preserving the reconciled Economic inputs. Current is first; Reference and Custom remain available; RCA Candidate context does not constrain Material or Process selection. A behavior-level verifier covers prior Current, Reference, and Custom SIM states and renders the fresh handoff choices.
- Legacy tab migration now maps `dashboard` → `simulation` and `rca` → `candidate`; current tabs pass through and unknown/incompatible values fall back to `master`. Direct normalization tests cover these outcomes.
- Remaining evidence gaps were covered with focused Master Data, Selected Comparison, RCA context, Simulation editability/economics and cross-flow verifiers; the relevant suite passed.
- Workbook formulas were inspected in generated workbooks and checked by the workbook verifier plus shared-engine truth cases; native Excel calculation was not launched. No finalized item remains NOT VERIFIED.
- Shift-click and Ctrl-click row selection were exercised in the isolated browser review tab. Ctrl-clicking BOM row 2 after selecting row 1 displayed `2 rows selected`; the temporary selection was cleared afterward. The original user tab was not changed.
- Full baseline-to-current diff review found all changed paths map to finalized implementation, focused verification, active review guidance, or planning/handoff evidence. No stylesheet, Footer component, package manifest, or lockfile change was present; Footer/frontend styling remains deferred.

### Documentation conflicts and disposition

| Document | Superseded statement | Disposition |
|---|---|---|
| docs/testing/REVIEW_FIXTURES.md (corrected) | Previously prescribed one Candidate, downstream Selected Comparison scope, exactly Scenario A/B and pending finalized import/placeholder behavior. | Active instructions now describe one-or-many Candidates, scope boundary, optional Simulation/flexible scenarios and finalized import/Sizing behavior. |
| docs/SYSTEM_LOGIC_DIAGRAM.md (corrected) | Omitted direct Simulation entry and left the Selected Comparison boundary unstated. | Updated to show standalone Simulation and the RCA/Simulation boundary. |
| agreements/CANDIDATE_PRIORITIZATION_SPEC.md:418 | Historical requirement says processing Candidates are aggregated by Work Center. | Superseded by current canonical Process/Routing Candidate rule; retained as agreement provenance. |
| docs/history/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md:1353,1388,1461 | Historical business/OP formulas are marked pending. | Superseded by FINAL_LOGIC_SPEC finalized Selling Price/SG&A/OP rules; retained as archived history. |
| docs/history/HANDOFF_ARCHIVE_2026-10-05.md:522,532 | Historical checkpoint describes processing Candidates aggregated by Work Center. | Superseded by current canonical Process/Routing Candidate rule; retained as historical record. |
| docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md:34-43,52-54 | Old Dashboard rationale mentions unfinalized metrics and an old Work Center override choice. | Entries are explicitly Superseded/provisional; current decisions reflect finalized economics and Work Center edit restrictions. Kept as provenance. |

No finalized requirement remains FINDING or NOT VERIFIED. R-10 and R-11 are N/A only because the frozen checklist makes A/B and multi-scenario UI optional, not required. This audit does not issue independent reviewer approval.

### Verification results

- TypeScript: 62/62 effective PASS; 60 passed through the cached CJS runner and 2 SSR verifiers (`verify_simulation_story_view.ts`, `verify_rca_simulation_fresh_start.ts`) passed through Vite.
- MJS: 2/2 PASS.
- npx tsc --noEmit --pretty false: PASS.
- npm run build: PASS; 2,028 modules transformed. Existing ExcelJS browser externalization warnings for `fs`, `crypto`, and `fast-csv` remain.
- Baseline-to-current and final worktree `git diff --check`: PASS after planning/handoff updates; only Git line-ending conversion notices remain.
- Active-source scan found no superseded Trial/A-B/MatVAR/LBVAR/BDVAR/COGS or Work Center Candidate logic. Generic formatVariance identifiers are false positives for MatVAR.
- Targeted lifecycle regression reruns: fresh RCA SIM start, legacy active-tab migration, RCA context expiry/product scope, and independent Simulation workspace all passed; the two new behavioral Vite/CJS checks also passed in the full suite.
- The fresh-start regression directly exercises the reset transition for existing Current/Reference/Custom SIM states and server-renders the resulting source/factor controls. App route wiring is additionally asserted; a browser click-through of each old-SIM-to-RCA sequence was not run in this correction batch.
- Browser checks used an isolated local review tab with synthetic data; the user original browser tab was not mutated.
- `npm audit --audit-level=high` reports 5 High findings in the development Tailwind dependency chain and 4 Moderate findings overall. `npm audit --omit=dev --audit-level=high` exits successfully but reports 2 Moderate findings through ExcelJS 4.4.0 → uuid 8.3.2. `npm audit fix --dry-run` indicates its full automatic remediation requires `--force` and proposes a Tailwind major upgrade / ExcelJS downgrade; no dependency changes were made as part of the frozen logic scope. This remains a documented dependency-security limitation, separate from the finalized product-logic checklist.
- Human visual acceptance remains a later checkpoint under V-10. It is not represented as completed by this logic audit.
