# Current Handoff โ€” Documentation Migration to Latest Final Logic

**Updated:** 2026-10-08
**Checkpoint:** Documentation Migration Complete; Implementation Audit & Alignment Pending

## Active Checkpoint

- **Repository:** `apirak-k/COSTBREAKDOWN`
- **Working branch:** `codex/costbreakdown-spec-source`
- **Remote target:** `origin/codex/costbreakdown-spec-source`
- **Baseline commit audited:** `9de6bce516d1ce8abcd7b0758cfa5ca424885a28` (`docs: align business concepts summary wording with finalized scope in CROSS_CUTTING.md`)
- **Status:** **Documentation-only requirements migration complete.** The canonical specifications under `docs/specs/`, `docs/REQUIREMENTS_INDEX.md`, `docs/SYSTEM_LOGIC_DIAGRAM.md`, `docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md`, and `design.md` have been updated to reflect the latest user-finalized business logic from `FINAL_LOGIC_INPUT.md`.
- **Implementation Status Notice:** **Application source code has NOT yet been audited or aligned with the newly migrated business logic.** Prior verification passes and the 430-item audit evidence cited below reflect the immediately preceding baseline (which implemented the earlier exact-A/B, single-candidate RCA, and categorized economics model). Do not falsely claim code conformance with the new logic until the code audit and implementation tasks are executed.

## Key Finalized Business Logic Migrated in Canonical Docs

1. **Master Data Workspaces:** `Reference | Current | Custom`. `Custom` is a free semantic workspace without hard-coded meaning (not locked to Trial, Simulation, Proposal, or Future).
2. **Master Data Owns Structural Changes:** Adding/removing records, table resizing, and Sizing adjustments belong in Master Data / Custom. Simulation cannot perform structural changes.
3. **`Clone From` Semantics:** Active dataset is Destination; user selects Source dataset. E.g., `Custom โ’ Clone From Current` and `Current โ’ Clone From Custom`. No separate promotion lifecycle.
4. **CBD Scope:** Cost Breakdown compares strictly `Reference vs Current`. `Custom` is not compared directly in CBD.
5. **Selected Comparison Boundary:** Selected Comparison is a temporary analysis scope, not a dataset and not an RCA Case.
6. **Multi-Candidate RCA Cases:** One RCA Case supports **1 or Multiple Candidates** to represent real-world structural changes (e.g. QA1 REMOVED, QA1.1 ADDED, QA1.2 ADDED analyzed together).
7. **RCA Completion Boundary:** RCA legitimately completes upon recording **Root Cause / Why?** and **Action**. Simulation is optional; Trial is not required.
8. **No Duplicate RCA Notes:** Existing Master Data annotations (`Note`, `META.Dataset Remark`) remain separate; no duplicate RCA Note system is created.
9. **Simulation Architecture:** Single module with two dimensions:
   - **Parameter Simulation:** Starts from `Reference`, `Current`, or `Custom`. Structure is locked. Current vs SIM comparison. Statuses: CHANGED, UNCHANGED, ADDED (editable); REMOVED (visible, disabled). User selects multiple Factors to Simulate (controls editing UI, not calculation scope; full SIM dataset recalculates live). SIM-editable: BOM (Price, Usage, Loss) and Routing (Manning, Cap, Yield). Work Center rates are **not** SIM-editable.
   - **Economic Simulation:** Inputs: Action Cost (THB) and Evaluation Quantity (pcs). Formula: $\text{Required Saving / pc} = \frac{\text{Action Cost}}{\text{Evaluation Quantity}}$. Economics is **separate from Standard Cost** (Action Cost is NOT folded into MAT/LB/BD/Standard Cost).
   - **Combined Evaluation:** Compares Parameter Saving vs Required Saving to calculate Economic Margin. Advisory result; not an approval gate.
10. **Scenario Count:** Exactly Scenario A and B is **not a mandatory business requirement**.
11. **Selling Price, SG&A, and OP:** Preserved finalized formulas: $\text{SG&A amount} = \text{Selling Price} \times \text{SG\&A \%}$; $\text{OP} = \text{Selling Price} - \text{Standard Cost} - \text{SG\&A amount}$ (negative OP = operating loss). MatVAR, LBVAR, BDVAR remain out of scope.
12. **Trial Lifecycle Boundary:** No dedicated Trial execution, validation, approval, or promotion lifecycle. Custom stores trial data; promote via `Clone From Custom`.

## Canonical Documentation Target Structure

The active canonical documentation structure is:

```text
docs/
โ”โ”€โ”€ REQUIREMENTS_INDEX.md
โ”โ”€โ”€ SYSTEM_LOGIC_DIAGRAM.md
โ”โ”€โ”€ PROVISIONAL_IMPLEMENTATION_DECISIONS.md
โ””โ”€โ”€ specs/
    โ”โ”€โ”€ FINAL_LOGIC_SPEC.md
    โ”โ”€โ”€ CROSS_CUTTING.md
    โ”โ”€โ”€ MASTER_DATA.md
    โ”โ”€โ”€ COST_BREAKDOWN.md
    โ”โ”€โ”€ CANDIDATE.md               (Candidate Prioritization & Multi-Candidate RCA)
    โ””โ”€โ”€ SIMULATION.md              (Parameter Simulation & Economic Simulation)
```

## Next Step

1. **External Review:** User review and verification of the migrated documentation against `FINAL_LOGIC_INPUT.md`.
2. **Code Audit:** Perform a systematic code audit of `src/` against the canonical specifications (`docs/specs/`).
3. **Implementation Gap Analysis:** Identify exact code areas requiring updates (e.g., adding `Custom` workspace, `Clone From` UI, Multi-Candidate RCA selection, Parameter/Economic Simulation separation, locking SIM structure, removing rate editing from SIM, removing categorized economics folding).
4. **Implementation Planning & Execution:** Formulate phased implementation plan and execute code updates with focused verification.
