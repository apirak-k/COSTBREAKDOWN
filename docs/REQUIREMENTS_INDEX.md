# Requirements Index

**Updated:** 2026-10-08

## Final Logic Authority

[`specs/FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md) is the latest authority for product logic and behavior, consolidating the user-finalized business logic decisions. It finalizes logic/behavior only; it does not replace the rest of the product contract. If an older specification, agreement, design document, implementation decision, or current code conflicts with Final Logic on product logic, follow Final Logic only for that conflicting behavior. Existing finalized or accepted UX/UI, layout, visual style, wording, interaction behavior, and other requirements remain valid when compatible. Absence from Final Logic does not automatically remove an older non-conflicting finalized requirement. Existing code is implementation evidence, not requirements authority.

## Canonical Specifications Map

The active canonical specifications are:

1. [`specs/FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md) — Master product logic authority, calculation engine, examples, edge cases, and acceptance checklist.
2. [`specs/CROSS_CUTTING.md`](specs/CROSS_CUTTING.md) — Shared formulas, business identities, comparison statuses, processing aggregation, and system boundaries.
3. [`specs/MASTER_DATA.md`](specs/MASTER_DATA.md) — Reference, Current, and Custom datasets; Clone semantics; structural editing; Sizing; 4-sheet workbook format; spreadsheet editing.
   - [`specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md`](specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md) — Current toolbar, preparation/status/warning, mock, and action-confirmation contract for this UX round.
4. [`specs/COST_BREAKDOWN.md`](specs/COST_BREAKDOWN.md) — Reference vs Current comparison, Full vs Selected Comparison scope, processing drill-down, and Gap reconciliation.
5. [`specs/CANDIDATE.md`](specs/CANDIDATE.md) — Candidate Prioritization and Multi-Candidate RCA Cases (Root Cause / Why? and Action).
6. [`specs/SIMULATION.md`](specs/SIMULATION.md) — Parameter Simulation and Economic Simulation dimensions, Start SIM From Ref/Cur/Custom, locked structure, and economic break-even evaluation.

Supporting architecture and design documents:
- [`SYSTEM_LOGIC_DIAGRAM.md`](SYSTEM_LOGIC_DIAGRAM.md) — Visual workflow diagrams (Mermaid and text).
- [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](PROVISIONAL_IMPLEMENTATION_DECISIONS.md) — Reversible AI implementation and presentation details.
- [`design.md`](../design.md) — Visual design tokens, typography, layout density, and styling system.

## Decision Authority and Migration Protection

Use chronology and original decision status to resolve behavior:

1. Apply the latest explicit user decision to the behavior it changes. For product logic, [`FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md) is the latest finalized authority and supersedes only conflicting logic.
2. A previously `FINALIZED` decision in a source conversation or `agreements/` remains valid unless a later explicit user decision supersedes it.
3. `docs/specs/` is the consolidated, user-readable destination for current behavior. If a finalized decision is missing there, that is a migration gap; absence does not make it `PENDING — USER DECISION NEEDED` or invalidate its source.
4. Preserve the labels in source records: `FINALIZED`, `CONFIRMED`, `CURRENT BASELINE`, `DESIGN DIRECTION`, `PENDING`, and `UNDECIDED` are not interchangeable. Use the current implementation-status labels below when consolidating a decision; do not promote a baseline/direction to a requirement or downgrade a finalized decision because it is absent from a newer summary.
5. When sources conflict, compare their dates and explicit user decisions. A commit can help establish when an implementation changed, but a commit alone does not prove user intent. Existing code is implementation evidence only and creates no requirement.
6. If two actual user decisions conflict and chronology cannot show which supersedes the other, record only that specific conflict for review. Do not reopen unrelated settled topics.

`tasks/source-crosswalk-80.md` is traceability and implementation/verification status only. It is not a requirements source or an 80-feature backlog. `HANDOFF.md`, `tasks/plan.md`, and `tasks/todo.md` are operational records and cannot supersede a product decision.

## Current Decision Status and AI Implementation Choices

Use these labels in canonical specs and implementation notes:

- **`FINALIZED — USER DECISION`** — The user settled this behavior. Preserve it unless a later explicit user decision changes that specific behavior.
- **`CONFIRMED DIRECTION — USER DECISION`** — The user confirmed the outcome, principle, or visual direction; safe implementation details may still be chosen by AI.
- **`PROVISIONAL — AI CHOICE`** — AI selected a reversible implementation or presentation detail because the user had not fixed it. Record the choice, why it was chosen, the constraints it preserves, and how it can be revised in [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](PROVISIONAL_IMPLEMENTATION_DECISIONS.md). It is not a user requirement, cannot override a user decision, and does not become finalized just because code ships.
- **`PENDING — USER DECISION NEEDED`** — A genuinely unresolved product/business/lifecycle decision that cannot safely be inferred. State the narrow question and source evidence. Continue independent work; do not ask the user to reconstruct prior discussions.

Human visual acceptance is a review checkpoint, not a missing product decision. It may follow implementation of reversible AI choices; it does not block ordinary implementation or promote those choices to user requirements.

Do not require the user to approve ordinary layout, component, wording, or implementation details one by one. Make a safe choice and record it as provisional. Do not use a provisional choice to invent accounting formulas, monetary attribution, identity/matching semantics, persistence/lifecycle behavior, destructive behavior, or Trial approval/promotion workflow.

## Key Reconciled Product Decisions

The latest finalized logic establishes:

1. **Master Data Workspaces:** Three independent datasets (`Reference`, `Current`, `Custom`). `Custom` is a free workspace with no forced semantic meaning (not locked to Trial, Simulation, Proposal, or Future).
2. **Master Data Owns Structural Changes:** Adding, deleting, resizing, or altering table structures belongs in Master Data / Custom. Simulation cannot alter dataset structure.
3. **Generic Clone Semantics:** The active viewed dataset is the destination; the user selects the source. No separate promotion workflows. The Master Data UX contract defines the toolbar label and interaction.
4. **Cost Breakdown Scope:** CBD compares strictly `Reference` vs `Current`. `Custom` is not compared directly in CBD.
5. **Selected Comparison:** A temporary analysis scope/view of selected BOM and Routing findings. It is neither a new dataset nor an RCA Case.
6. **Multi-Candidate RCA Cases:** One RCA Case can contain one or multiple Candidates. Root Cause / Why? and Action are captured at the RCA Case level.
7. **RCA Ends at Root Cause + Action:** RCA legitimately completes upon recording root causes and actions. Simulation is optional; Trial is not required.
8. **No Duplicate RCA Notes:** Existing Master Data annotations (`Note`, `META.Dataset Remark`) remain separate; no duplicate RCA Note system is created.
9. **Simulation Architecture:** Single module with two dimensions: Parameter Simulation and Economic Simulation. Can be used Parameter-only, Economic-only, or combined.
10. **Start SIM From:** Can start from `Reference`, `Current`, or `Custom`. Structure is locked once inside SIM.
11. **Parameter Simulation Comparison:** Primary comparison is `Current vs SIM`. CHANGED, UNCHANGED, and ADDED are visible and editable; REMOVED is visible (affects Gap) but disabled from editing.
12. **Factors to Simulate:** Users select factors for editing visibility; the full SIM dataset recalculates live through the shared cost engine.
13. **SIM-Editable Inputs:** BOM (Price, Usage, Loss), Routing (Manning, Capacity, Yield). Work Center rates are **not** SIM-editable.
14. **Economic Simulation:** $\text{Required Saving / pc} = \frac{\text{Action Cost}}{\text{Evaluation Quantity}}$. Action Cost is **not** folded into Standard Cost.
15. **Combined Feasibility:** Compares Parameter Saving vs Required Saving to calculate Economic Margin. Result is advisory, not an approval gate.
16. **Flexible Scenario Count:** Exactly Scenario A and B is not a mandatory business requirement.
17. **Business Formulas:** $\text{SG&A amount} = \text{Selling Price} \times \text{SG\&A \%}$, $\text{OP} = \text{Selling Price} - \text{Standard Cost} - \text{SG\&A amount}$. Negative OP represents operating loss and is valid. MatVAR, LBVAR, and BDVAR remain out of scope.
18. **Trial Lifecycle Boundary:** No dedicated Trial execution, validation, approval, or promotion lifecycle. Custom can store trial data; to use it as Current, choose `Clone` on Current and select Custom.

## Reading Order

1. Read this index for authority, migration rules, and canonical spec mapping.
2. Read [`specs/FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md) for the latest finalized product logic, calculations, examples, and acceptance checklist.
3. Read the page-specific canonical specs: [Cross-Cutting](specs/CROSS_CUTTING.md), [Master Data](specs/MASTER_DATA.md), [Cost Breakdown](specs/COST_BREAKDOWN.md), [Candidate & RCA](specs/CANDIDATE.md), and [Simulation](specs/SIMULATION.md).
4. Read [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](PROVISIONAL_IMPLEMENTATION_DECISIONS.md) where relevant for reversible AI choices.
5. Consult `agreements/` and `docs/history/` only for provenance, recovery of compatible finalized detail, or chronology. Do not copy superseded behavior as current.
6. Read implementation/crosswalk/handoff documents only for operational records and verification evidence: [`tasks/source-crosswalk-80.md`](../tasks/source-crosswalk-80.md) and [`HANDOFF.md`](../HANDOFF.md). They do not define requirements.
