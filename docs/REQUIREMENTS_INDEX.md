# Requirements Index

**Updated:** 2026-10-07

## Final Logic authority

[`specs/FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md) is the latest authority for product logic and behavior. It finalizes logic/behavior only; it does not replace the rest of the product contract. If an older specification, agreement, design document, implementation decision, or current code conflicts with Final Logic on product logic, follow Final Logic only for that conflicting behavior. Existing finalized or accepted UX/UI, layout, visual style, wording, interaction behavior, and other requirements remain valid when compatible. Absence from Final Logic does not automatically remove an older non-conflicting finalized requirement. Existing code is implementation evidence, not requirements authority.

## Decision authority and migration protection

Use the cumulative authority model:

1. **`specs/FINAL_LOGIC_SPEC.md`** contains the latest finalized decisions for the subjects it covers. A newer explicit finalized decision overrides an older conflicting decision.
2. An older finalized requirement remains **VALID** when:
   - it does not conflict with a newer finalized decision;
   - it has not been explicitly superseded, rejected, deprecated, or moved out of scope.
3. Absence from `FINAL_LOGIC_SPEC.md` does NOT automatically mean an older requirement is obsolete.
4. Historical documents are evidence of previous decisions, but must not override current finalized requirements.
5. `docs/specs/` is the consolidated, user-readable destination for current active specifications:
   - [`FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md): Latest logic authority.
   - [`MASTER_DATA.md`](specs/MASTER_DATA.md): Master Data schema, sizing, lifecycle, workbook, and tables.
   - [`COST_BREAKDOWN.md`](specs/COST_BREAKDOWN.md): Comparison findings, drill-down, and Selected Comparison scope.
   - [`CANDIDATE.md`](specs/CANDIDATE.md): Candidate prioritization, Process/Routing candidate identity, controllable flag, and ranking.
   - [`RCA_SIMULATION.md`](specs/RCA_SIMULATION.md): Candidate selection at RCA entry, Scenario A/B simulation, and storytelling.
   - [`CROSS_CUTTING.md`](specs/CROSS_CUTTING.md): Shared calculations, Standard Cost formulas, and product boundaries.
6. Product decisions are complete: **`PENDING PRODUCT DECISIONS: 0`**.
7. Missing test evidence or browser verification is an implementation/verification gap, NOT an unresolved product requirement.

`tasks/source-crosswalk-80.md` is traceability and implementation/verification status only. It is not a requirements source or an 80-feature backlog. `HANDOFF.md`, `tasks/plan.md`, and `tasks/todo.md` are operational records and cannot supersede a product decision.

## Current decision status and classification labels

Use these labels in the canonical specs and implementation notes:

- **`FINALIZED — USER DECISION`** — the user settled this behavior. Preserve it unless a later explicit user decision changes that specific behavior.
- **`CONFIRMED DIRECTION — USER DECISION`** — the user confirmed the outcome, principle, or visual direction; safe implementation details may still be chosen by AI.
- **`PROVISIONAL — AI CHOICE`** — AI selected a reversible implementation or presentation detail because the user had not fixed it. Record the choice, why it was chosen, the constraints it preserves, and how it can be revised in [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](PROVISIONAL_IMPLEMENTATION_DECISIONS.md). It is not a user requirement, cannot override a user decision, and does not become finalized just because code ships.
- **`OUT OF SCOPE`** — items explicitly beyond the finalized product scope (e.g. COGS/GP/margins/sales metrics, full Trial execution/approval engines). They are neither pending decisions nor deferred features.

Human visual acceptance is a review checkpoint, not a missing product decision. It may follow implementation of reversible AI choices; it does not block ordinary implementation or promote those choices to user requirements.

Do not require the user to approve ordinary layout, component, wording, or implementation details one by one. Make a safe choice and record it as provisional. Do not use a provisional choice to invent accounting formulas, monetary attribution, identity/matching semantics, persistence/lifecycle behavior, destructive behavior, or Trial approval/promotion workflow.

## Agreement migration and reconciled decisions

Do not call an agreement obsolete merely because it is older or its decision is absent from `docs/specs/`. Before describing `agreements/` as historical provenance, migrate every still-valid finalized decision into the relevant canonical spec and identify only the specific behaviors later superseded. The original agreement remains evidence of its decision and status after migration.

Key reconciled decisions:
- **Canonical workbook:** Exactly 4 sheets in order: `META`, `BOM`, `WORK_CENTER`, `ROUTING`. There is no fifth `COST_CALCULATION` sheet in the current canonical workbook.
- **Master Data sizing:** Sizing counts represent exact row counts. Increasing count appends blank rows; decreasing count removes rows from the end, including populated rows. Import initializes sizing counts from imported row counts. Direct row add/delete keeps sizing state aligned. Blank/incomplete required records are MISSING (never silently treated as valid calculated zero values). Excel round-trip behavior for these rows is fully finalized.
- **Candidate / Ranking / RCA boundary:** Candidate Prioritization performs prioritization, filtering, ranking, and controllability review. Work Center is NOT a Candidate. Processing Candidate identity is Process / Routing. Selection of exactly ONE Candidate for RCA occurs at RCA entry (RCA & Simulation flow), not in Ranking.
- **Simulation:** Exactly Scenario A and Scenario B. Both independently start from Current. Simulation uses full Current baseline, not Selected Comparison scope. Structural simulation is out of current scope. Human explicitly selects the chosen scenario. Final storytelling compares Reference → Current → Simulated with Gap1 = Current - Reference and Gap2 = Simulated - Current.
- **Trial:** Current product scope contains only the Trial handoff/marker behavior. Complete Trial execution engine, validation process, approval flow, and promotion flow are OUT OF SCOPE.
- **Additional business metrics:** Finalized scope focuses on Selling Price, MAT, LB, BD, Standard Cost, SG&A, and OP. Additional metrics (COGS, GP, GP Margin, OP Margin, Sales, historical monthly metrics, Volume beyond Evaluation Quantity) are OUT OF SCOPE.
- **Candidate monetary Gap:** Material records show calculated Reference cost, Current cost, and Gap. Changed input values remain visible as Reference → Current explanatory details; no per-factor THB attribution method is agreed.

## Reading order

1. Read this index for authority, migration, and project-level requirements safeguards.
2. Read [`specs/FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md) for the latest finalized product logic and its detailed checklist.
3. Read the page-specific canonical specs: [Cross-Cutting](specs/CROSS_CUTTING.md), [Master Data](specs/MASTER_DATA.md), [Cost Breakdown](specs/COST_BREAKDOWN.md), [Candidate](specs/CANDIDATE.md), and [RCA & Simulation](specs/RCA_SIMULATION.md). They retain compatible finalized requirements and page details.
4. Read [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](PROVISIONAL_IMPLEMENTATION_DECISIONS.md) where relevant for reversible AI choices. It is implementation guidance only and is subordinate to the user decisions and canonical specs.
5. Consult `agreements/` and `docs/history/` only for provenance, recovery of compatible finalized detail, migration-gap repair, or chronology. Preserve historical content and source status; do not copy superseded behavior as current.
6. Read implementation/crosswalk/handoff documents only for implementation evidence, traceability, verification status, and the active work checkpoint: [`tasks/source-crosswalk-80.md`](../tasks/source-crosswalk-80.md), [`HANDOFF.md`](../HANDOFF.md), `tasks/plan.md`, and `tasks/todo.md`. They do not define requirements.

## Original source conversations

- [COSTBREAKDOWN review](https://chatgpt.com/share/6ac1e3f9-b5e0-83ec-b2ac-b6ce7da95726)
- [80-topic follow-up](https://chatgpt.com/s/t_6ac26aba193481918961c062fca76357)

These conversations are primary records of the user's decisions. All product decisions are finalized across active specifications (PENDING PRODUCT DECISIONS: 0); items outside defined scope are classified as OUT OF SCOPE.
