# Current Handoff — Documentation & State Consolidation

**Updated:** 2026-10-08
**Working Branch:** `codex/costbreakdown-spec-source`
**HEAD Status:** Clean working tree following documentation consolidation
**Remote Target:** `origin/codex/costbreakdown-spec-source`
**PENDING PRODUCT DECISIONS: 0**

---

## 1. What to Read First (Authority Chain)

Documentation operates under the cumulative authority model defined in [`docs/REQUIREMENTS_INDEX.md`](docs/REQUIREMENTS_INDEX.md):

1. **Latest Logic Authority:** [`docs/specs/FINAL_LOGIC_SPEC.md`](docs/specs/FINAL_LOGIC_SPEC.md) — contains latest finalized decisions for product logic and calculations.
2. **Canonical Specifications:**
   - [`docs/specs/MASTER_DATA.md`](docs/specs/MASTER_DATA.md): Master Data schema, sizing, lifecycle, workbook, and tables.
   - [`docs/specs/COST_BREAKDOWN.md`](docs/specs/COST_BREAKDOWN.md): Comparison findings, drill-down, and Selected Comparison scope.
   - [`docs/specs/CANDIDATE.md`](docs/specs/CANDIDATE.md): Candidate prioritization, Process/Routing candidate identity, controllable flag, and ranking.
   - [`docs/specs/RCA_SIMULATION.md`](docs/specs/RCA_SIMULATION.md): Candidate selection at RCA entry, Scenario A/B simulation, and storytelling.
   - [`docs/specs/CROSS_CUTTING.md`](docs/specs/CROSS_CUTTING.md): Shared calculations, Standard Cost formulas, and product boundaries.
3. **Traceability & Verification Ledger:** [`tasks/source-crosswalk-80.md`](tasks/source-crosswalk-80.md) — tracks implementation and verification status only (not requirements).
4. **Visual / Design Contract:** [`design.md`](design.md) and [`docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md) — compact industrial console visual system.
5. **Historical Records:** `docs/history/` and `agreements/` — preserved decision evidence and provenance.

---

## 2. Product Decisions Status

`PENDING PRODUCT DECISIONS: 0`

All product decisions are finalized and reconciled across active documentation:

- **Master Data Sizing:** Exact row counts. Increasing appends blank rows; decreasing removes rows from the end, including populated rows. Import initializes sizing counts from imported row counts. Direct row add/delete keeps sizing state aligned. Blank/incomplete required records are MISSING (never silently treated as valid zero). Excel round-trip behavior is fully finalized.
- **Canonical Excel Workbook:** Exactly 4 sheets in order: `META`, `BOM`, `WORK_CENTER`, `ROUTING`. There is no fifth `COST_CALCULATION` sheet. META contains inputs and calculated formula outputs (MAT, Labor, Burden, Standard Cost, SG&A Amount, OP).
- **Candidate / Ranking / RCA Boundary:** Ranking performs prioritization, filtering, ranking, and controllability review. Work Center is NOT a Candidate. Processing Candidate identity is Process / Routing. Selection of exactly ONE Candidate for RCA occurs at RCA entry in RCA & Simulation, not in Ranking.
- **Simulation:** Exactly Scenario A and Scenario B. Both independently start from Current. Simulation uses full Current baseline, not Selected Comparison scope. Structural simulation is out of current scope. Human explicitly selects the chosen scenario. Final storytelling compares Reference → Current → Simulated with Gap1 = Current - Reference and Gap2 = Simulated - Current.
- **Trial Scope:** Current product scope contains only the Trial handoff/marker behavior. Complete Trial execution engines, validation processes, approval flows, and promotion flows are classified as **OUT OF SCOPE**.
- **Additional Business Metrics:** Finalized scope focuses on Selling Price, MAT, LB, BD, Standard Cost, SG&A, and OP. Additional metrics (COGS, GP, GP Margin, OP Margin, Sales, historical monthly metrics, Volume beyond Evaluation Quantity) are classified as **OUT OF SCOPE**.

---

## 3. Current Implementation Status

Core application code implements the finalized product requirements:
- Batches 1–7 completed and verified.
- Master Data opens on All Tables (BOM → Work Centers → Routing) with transient UI state preserved during same-session navigation.
- Page-level Undo/Redo spans Working edits across all tables.
- Clone copies opposite Working dataset without source-readiness gating and recalculates destination readiness.
- Candidate material findings display record-level cost Gap with changed input details.
- Processing Candidates are Process/Routing; Work Center provides calculation and aggregation context.
- Selected Comparison is temporary and clears upon entering RCA with a chosen Candidate.
- Simulation evaluates independent Scenarios A and B from full Current baseline, supporting categorized economics, scenario-local Selling Price and SG&A%, and signed OP (including negative operating loss).
- Human chooses the winning scenario, presenting the 3-state Reference → Current → Simulated story with Gap1 and Gap2.

---

## 4. Remaining Verification Gaps

These are verification and testing gaps, NOT unresolved product decisions:

1. **Browser Download Capture:** Browser file download events for Master Data Export and Sizing Template were not captured by the automated browser adapter due to environment security policies. Model/service export verifiers passed.
2. **Browser Upload / File Picker Interaction:** Automated browser file selection for workbook import was not exercised in live UI. Workbook parser and schema verifiers passed.
3. **Visual Acceptance:** Final human visual review of the compact industrial UI styling and responsive layouts remains open.

---

## 5. Known Technical Debt & Architecture Notes

- **ExcelJS Browser Warnings:** Vite production build reports browser externalization warnings for Node `fs` and `crypto` modules imported by ExcelJS. These are known and harmless in client runtime.
- **Legacy Compatibility Code:** Legacy fields (e.g. `Operation Code`, `Sequence`) remain in some data structures and conversion helpers for backwards compatibility with historical test fixtures, but are excluded from active calculation and comparison signatures.
- **Transitive Dependency Advisories:** Transitive `npm audit` advisories remain in Tailwind/ExcelJS dependencies; breaking major version upgrades were intentionally not applied.
- **Duplicate Economics Effect Warning:** The application warns users against entering economic effects already modeled through direct BOM/Routing/WC inputs; automatic semantic duplicate reconciliation was intentionally not invented.

---

## 6. Verification Commands & Baseline Status

- **Build:** `npm run build` passes (`tsc -b` and Vite production build).
- **TypeScript Verifiers:** 49/49 `scripts/verify_*.ts` passed.
- **MJS Verifiers:** 2/2 `scripts/verify_*.mjs` passed.
- **Audit Suite:** `test_comprehensive_audit.js` passed (31/31 checks).
- **Diff Cleanliness:** `git diff --check` passed with no whitespace or conflict markers.

---

## 7. Next Recommended Work

1. Conduct human visual review of the application interface across pages.
2. Perform manual end-to-end browser smoke test with file upload and download operations in a standard desktop browser environment.
