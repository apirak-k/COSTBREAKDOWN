# Current Handoff — Simulation Finalization

**Updated:** 2026-10-15

**Repository:** `apirak-k/COSTBREAKDOWN`

**Worktree / branch:** `.worktrees/CBD-CANDIDATE-INTEGRATION` / `codex/cbd-candidate-integration`

**Starting baseline:** `e46a08d15a50195c4274ea6f3be19f6c32cfd52b` (`chore: checkpoint partial Simulation integration`), parent `4601b3666a81399543488d550f14f7a3ad09be43`.

**Primary implementation commit:** to be recorded after commit; the following handoff checkpoint will contain its SHA.
**Push status:** pending final commit and remote equality check.

## Current Product Flow

The visible product has exactly three top-level pages: Master Data → Cost Breakdown → Simulation. Finding analysis remains inside Cost Breakdown. Legacy Candidate/RCA domain data is retained only where needed for saved-session compatibility; there is no active RCA-to-Simulation handoff or Simulation context strip.

## Simulation Finalization

- **Logic/state:** Simulation opens ready to work and initializes an absent or stale SIM from Current. The analytical baseline is always Current → SIM. Current changes invalidate/reconcile the snapshot; Reference- or Custom-only changes preserve it. Economic drafts are retained when valid. State is scoped per product, and deleted products are pruned.
- **Clone/Send integration:** `Clone from` copies Reference, Current, or Custom structure and parameters into SIM, then applies Current Work Center rates. `Send to` copies the full SIM snapshot, structure, and Current-rate context to only the chosen Reference/Current/Custom Working dataset, reconciles sizing, and records through Master Data Working history without overwriting Last Saved. Reference/Custom sends preserve the SIM baseline; Current sends cause Current-baseline reconciliation.
- **Parameter/result logic:** Structure and Work Center rates are locked. BOM Price/Usage/Loss and Routing Manning/Capacity/Yield are directly editable. Identity-based statuses protect removed/ambiguous records. The shared Standard Cost engine remains in use. Result Change/GAP 2 are SIM − Current; Parameter Saving is Current − SIM. BOM and Routing attribution uses the existing multiplicative attribution helper, displays absolute THB/pc effects, and reconciles to the cost delta.
- **Economics/validation:** Fixed Cost / pc = Fixed Action Cost / Batch Size; Required Saving / pc = Fixed Cost / pc + Variable Action Cost / pc; Parameter Saving / pc = Current SC − SIM SC; Economic Margin / pc = Parameter Saving − Required Saving; SG&A / pc = Selling Price × SG&A % / 100; OP / pc = Selling Price − SIM SC − SG&A / pc. Economics remains separate from engineering cost. Negative Economic Margin and OP are allowed. UI and logic boundaries reject invalid, non-finite, negative, out-of-domain, or zero-batch inputs without clamping or replacing missing values with zero. Shared SG&A range is 0–100%.
- **UI/layout:** Removed the large Simulation heading; placed compact Clone from / Send to controls in the Result header. Kept the REF → GAP 1 → CUR → GAP 2 → SIM graph, Result, Economic, BOM, and RTG. BOM/RTG tables fit their panels without horizontal scrolling, use internal vertical scrolling, and reflow to editable cards on narrow screens. No active RCA UI was restored.

## Documentation Updated

- `docs/specs/SIMULATION.md` — current lifecycle, validation, results, cost effects, economics, graph, and layout.
- `docs/specs/FINAL_LOGIC_SPEC.md`, `docs/REQUIREMENTS_INDEX.md`, and `docs/specs/CROSS_CUTTING.md` — corrected current Simulation rules and legacy RCA boundaries.
- `docs/SYSTEM_LOGIC_DIAGRAM.md` — current three-page flow and finalized formulas.
- `docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md` — distinguishes explicit user decisions from reversible presentation details.
- `docs/specs/CANDIDATE.md`, `docs/specs/COST_BREAKDOWN.md`, and `docs/specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md` — clarified current page boundaries and legacy compatibility.

## Verification Evidence

- **Simulation:** PASS — `verify_simulation_workspace.ts`, `verify_simulation_context.ts`, `verify_parameter_simulation_engine.ts`, `verify_simulation_economics.ts`, `verify_simulation_story_view.ts`.
- **Legacy RCA/session compatibility:** PASS — `verify_rca_case_domain.ts`, `verify_rca_handoff.ts`, `verify_rca_simulation_context_lifecycle.ts`, `verify_rca_simulation_fresh_start.ts`, `verify_legacy_active_tab_migration.ts`.
- **Master Data/shared numeric:** PASS — `verify_master_data_toolbar_prepare_ux.ts`, `verify_master_data_edit_history.ts`, `verify_master_data_custom_dataset.ts`, `verify_master_data_clone_readiness.ts`, `verify_master_data_ui_state.mjs`, `verify_numeric_input.mjs`, `verify_numeric_integrity.ts`, `verify_master_data_handoff.ts`, `verify_master_data_clear_dataset.ts`.
- **CBD/shared business metrics:** PASS — `verify_scenario_business_metrics.ts`, `verify_scenario_cost_overrides.ts`, `verify_scenario_draft.ts`, `verify_scenario_variables.ts`, `verify_cost_breakdown_view.ts`, `verify_cost_breakdown_sort.ts`, `verify_cbd_summary_ux.ts`, `verify_cbd_parameter_cost_effect.mjs`.
- **Build:** PASS — `npm run build` (`tsc -b && vite build`, 2,043 modules). Existing ExcelJS browser-externalization warnings for `fs` and `crypto` remain.
- **Diff sanity:** `git diff --check` passed after the final whitespace correction.
- **Browser:** PASS — isolated test origin at 1920×920, 1440×900, 900×900, and 390×844. Populated flow verified Clone from Custom, Current-rate lock, editable ADDED row, BOM cost-effect reconciliation (+4.20), rejected invalid inputs, negative Economic Margin/OP, Send to Reference/Custom/Current Working side effects, and preservation of valid economic drafts after Current reconciliation. At desktop, page/table client widths matched scroll widths, BOM and RTG had no horizontal scrollbar; 16 routing rows scrolled vertically under a sticky header. Mobile retained all editable fields in cards. No Candidate/RCA navigation appeared. Test data stayed on the isolated `127.0.0.1:5197` origin.

## Regression, Audit, and Delivery Status

- **Master Data regression:** PASS — three datasets, Working/history, Custom isolation, sizing, clone/handoff, and numeric behavior verifiers passed.
- **CBD regression:** PASS — summary, view/sort, parameter cost effect, scenario business metrics, and shared parameter calculation verifiers passed.
- **Navigation/session migration:** PASS — exact current flow and legacy active-tab/session migration verifiers passed.
- **Security audit:** `npm audit --audit-level=high` reports 5 High and 4 Moderate development-dependency findings; `npm audit --omit=dev --audit-level=high` reports 0 High/Critical and 2 Moderate. `npm audit fix --dry-run` indicates the available High fix requires the breaking Tailwind 4 upgrade. No unrelated dependency changes were made.
- **Unrelated user file:** Preserve the untracked `tasks/master-data-cbd-final-audit.md`; it was not edited, moved, staged, or committed.
- **Delivery:** The requested primary commit message is `feat(simulation): finalize Current-to-SIM workflow and UX`. Record its SHA after commit in the next handoff checkpoint. Push only to `origin/codex/cbd-candidate-integration`, then fetch and confirm local/remote equality. No branch switch, force push, or merge to main.

## Historical Final Logic Checklist Evidence — 2026-10-09

The following evidence belongs to the earlier `codex/final-logic-implementation` checkpoint. It is retained for traceability and does not prove that the current post-merge integration branch has re-passed these checks.

- **Historical repository:** `apirak-k/COSTBREAKDOWN`
- **Historical implementation branch / delivery target:** `codex/final-logic-implementation` → `origin/codex/final-logic-implementation`.
- **Historical worktree:** `.worktrees/codex-final-logic-implementation`.
- **Independent review correction base:** `4a1968db841d97ff8d6c44b3aadf929f73e01be1`.
- **Latest application source commit in that checkpoint:** `15379d92a2815fa6bea89f2b9cad56ec29347148` (`fix: reset Parameter SIM on RCA handoff`).
- **Full implementation baseline:** `665099b71319ec98c537a0859336dc01b9acc118`.
- **User-reported approval:** The user reported that Final Logic implementation commit `9c25906435ed14eee6b67692e3bfd8d1a43695de` was independently approved at that time.
- The Frozen Final Requirement Traceability Checklist v1.0 and implementation re-audit are recorded in `.planning/2026-10-09-final-logic-implementation/findings.md`. That audit reported 473 PASS, 2 N/A — PROVISIONAL/UI ONLY (R-10 and R-11), 0 open FINDING, and 0 NOT VERIFIED for its checkpoint.

## Historical Frozen Checklist Completion Evidence

- All initially confirmed implementation findings and applicable evidence gaps were addressed. The complete per-ID final matrix is in `findings.md`; the frozen requirement wording and IDs in `task_plan.md` are unchanged.
- The active review fixture and system logic diagram were corrected. Superseded agreement/history documents remain retained and are called out in the audit ledger rather than rewritten as current requirements.
- TypeScript verifiers: 62/62 effective PASS (60 through the cached CJS runner; 2 SSR verifiers through Vite). MJS verifiers: 2/2 PASS.
- `npx tsc --noEmit --pretty false`: PASS. `npm run build`: PASS, 2,028 modules. Active-source superseded-logic scan: PASS. Baseline-to-HEAD review and `git diff --check`: PASS.
- Isolated browser checks covered the Master Data spreadsheet interactions, including Shift/Ctrl row selection, and the RCA/Simulation, Selected Comparison, Economic-only, standalone Simulation, and context lifecycle flows. The original user tab was not modified.

## Independent Review Findings Corrected

This section records the earlier review loop and remains historical implementation evidence. The full frozen checklist audit below supersedes its narrower completion checkpoint; it does not invalidate these individual fixes.

1. **Factors to Simulate are business records.** The selector now lists eligible Material and Process/Routing records. Selecting a record exposes all three applicable BOM or Routing parameter inputs on that record. The calculation still recalculates the full SIM snapshot, and Work Center rates remain excluded. Existing stored parameter-type selections are discarded during state reconciliation.
2. **Economic-only Simulation is independent.** Action Cost and Evaluation Quantity are available before Parameter SIM starts; Required Saving is calculated without a SIM snapshot. Starting Parameter SIM preserves those inputs. Economic Margin is shown only when Parameter Simulation exists, alongside the Parameter Saving result. Action Cost remains outside Standard Cost.
3. **RCA Case can proceed to Simulation.** The active Case ID, Candidate keys, and latest Root Cause/Action draft are carried into Simulation. RCA remains complete without Simulation, and no completion gate is added. For a new SIM after this handoff, Current is the first/default source choice while Reference and Custom stay available. Candidate context does not lock or preselect Factors; all Material and Process records remain selectable.
4. **RCA handoff always starts a fresh Parameter SIM state.** An explicit handoff now clears any pre-existing Current, Reference, or Custom Parameter snapshot, selected Factors, source, fingerprint, and start time rather than reusing them. Reconciled Economic inputs are preserved. The legacy `activeTab='rca'` value now returns to the Candidate/RCA workflow; `dashboard` still maps to Simulation.

## Historical Verification

- All 62 TypeScript verifiers pass effectively; 60 use the cached CJS runner and two SSR verifiers pass through Vite. Both MJS verifiers pass (2/2).
- `npx tsc --noEmit --pretty false` passes. `npm run build` passes with 2,028 modules transformed. The build continues to report ExcelJS browser externalization warnings for `fs`, `crypto`, and `fast-csv`.
- The final A-01 through W-33 matrix contains 475 unique IDs with no missing or duplicate IDs. Status is 473 PASS, 2 N/A (R-10/R-11), 0 FINDING, 0 NOT VERIFIED.
- `git diff --check`, stale/superseded active-source scan, and full baseline-to-HEAD diff review pass.
- Targeted tests cover Master Data lifecycle and all six Clone From directions; workbook formulas/round-trip; CBD identity/status/reconciliation; Selected Comparison lifecycle; candidate ranking; single/multi-Candidate RCA; RCA completion without SIM; RCA→SIM handoff; standalone and three-source Simulation; record-based factors/full-dataset recalculation; Economic-only and combined modes; Action Cost isolation; commercial formulas; state migration and cross-flow context.
- Isolated browser checks confirmed Master Data editing/navigation/paste/bulk actions and Shift/Ctrl row selection; one-/multi-Candidate RCA handoff; Current-first with Reference/Custom available; additional Factor selection; Economic-only inputs before Parameter SIM and their persistence into combined mode; direct Simulation without stale RCA context.
- Phase 16 targeted regressions directly exercise resetting pre-existing Current/Reference/Custom Parameter SIM states before RCA handoff, clearing old Factors, retaining Economic inputs, showing Current first with Reference/Custom available, unrestricted Material/Process Factor selection, RCA-context expiry, and legacy active-tab migration. The exact old-SIM→RCA→Proceed integration was not separately clicked through in a browser during this correction batch.

## Historical Verification Limits and Build Notes

- Native Excel was not launched; generated workbook formulas, notes, styles, and round-trip behavior were checked by the workbook verifiers. Human visual acceptance remains a later checkpoint and was not represented as complete.
- Phase 16 exercised the handoff state transition and server-rendered controls; no browser click-through of each old-SIM source sequence was performed in this correction batch.
- Vite reports the existing ExcelJS `fs` / `crypto` browser-externalization warnings during build; the production build completes successfully.
- `npm audit --audit-level=high` reports 5 High development-dependency findings and 4 Moderate findings overall. The production-only audit has no High findings but reports 2 Moderate ExcelJS/uuid findings. npm's full automatic remediation proposes breaking dependency changes, so no dependency update was included in the frozen logic scope.
- The worktree contains an unrelated untracked `src/graphify-out/` directory generated by tooling. It was preserved and excluded from commits.

## Historical Final Logic Baseline Summary

This summary describes the finalized logic baseline represented by the historical audit above. The current canonical product specifications remain the authority for behavior.

1. **Master Data:** Reference, Current, and independent Custom workspaces. The active dataset is the destination for Clone From; structural edits stay in Master Data.
2. **Cost Breakdown:** Reference vs Current only. Selected Comparison remains a temporary analysis scope and does not carry into Simulation.
3. **RCA:** One Case can include one or multiple Candidates. Root Cause and Action complete RCA; Simulation is optional. An active Case can pass context into Simulation without locking scope; a new SIM naturally starts from Current, with Reference and Custom still selectable. Existing Master Data notes remain separate.
4. **Simulation:** One independent module starts from Reference, Current, or Custom; its structure is locked and Current vs SIM is the parameter comparison. Factors to Simulate are Material/Process records; selection controls visibility of that record's editable parameters. The six parameter types are BOM Price/Usage/Loss and Routing Manning/Capacity/Yield. The full SIM recalculates; Work Center rates are not editable.
5. **Economics:** Economic-only mode calculates Required Saving from Action Cost / Evaluation Quantity without a Parameter SIM snapshot. Combined mode also shows Parameter Saving and Economic Margin (`Parameter Saving - Required Saving`); results remain advisory and Action Cost does not enter Standard Cost.
6. **Business formulas:** SG&A amount = Selling Price × SG&A%; OP = Selling Price − Standard Cost − SG&A amount. Negative OP remains visible. The Reference → Current → Simulated graph stays active and shows adjacent signed gaps.
7. **Superseded workflows:** Scenario A/B is not mandatory. The dedicated Trial lifecycle and old combined A/B simulation flow are retired; Custom remains a general-purpose workspace.

## Historical Implementation Commit Map

- `19303af` — Custom workspace state
- `b2b4be3` — Custom Master Data actions and isolation
- `eadc775` — Generic Clone From
- `368128b` — Multi-Candidate RCA Case domain
- `74843ed` — Candidate selection and RCA Case workflow
- `f82a693` — Independent Simulation state and navigation
- `4910176`, `e770f8d` — Parameter Simulation engine and nullable inputs
- `cca628e` — Parameter Simulation UI
- `fd559a0` — Independent Economic Simulation
- `a72570a`, `8e0944c` — Retire superseded active paths; final fixture/verifier correction
- `c907efd` — Phase documentation correction
- `fd870f8` — Correct record-based Factors to Simulate and independent Economic-only mode
- `56935a9` — Add optional RCA Case context handoff to Simulation
- `3abb6f8` — Close frozen final logic audit findings; add regression evidence and remove disconnected competing state/engines
- `15379d9` — Fresh Parameter SIM reset on RCA handoff and legacy active-tab migration

## Current Work Focus

The CBD overview UX refinement is the active bounded pass on `codex/cbd-candidate-integration`, starting at `97fe2e36edc4fbea6aea7d2f8b315da50b6b5138`. The latest delivery report and Git HEAD on that branch are authoritative for its commit and push status. Address any external-audit findings as a separate bounded pass.
