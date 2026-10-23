# Requirements Index

**Updated:** 2026-10-23

## Final Logic Authority

[`specs/FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md) is the latest authority for product logic and behavior, consolidating the user-finalized business logic decisions. It finalizes logic/behavior only; it does not replace the rest of the product contract. If an older specification, agreement, design document, implementation decision, or current code conflicts with Final Logic on product logic, follow Final Logic only for that conflicting behavior. Existing finalized or accepted UX/UI, layout, visual style, wording, interaction behavior, and other requirements remain valid when compatible. Absence from Final Logic does not automatically remove an older non-conflicting finalized requirement. Existing code is implementation evidence, not requirements authority.

## Canonical Specifications Map

The active canonical specifications are:

1. [`specs/FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md) — Master product logic authority, calculation engine, examples, edge cases, and acceptance checklist.
2. [`specs/CROSS_CUTTING.md`](specs/CROSS_CUTTING.md) — Shared formulas, business identities, comparison statuses, processing aggregation, and system boundaries.
3. [`specs/MASTER_DATA.md`](specs/MASTER_DATA.md) — Reference, Current, and Custom datasets; Clone semantics; structural editing; Sizing; 4-sheet workbook format; spreadsheet editing.
   - [`specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md`](specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md) — Historical accepted shared Header and toolbar presentation source. Its Cost Breakdown and Candidate/RCA portions are superseded by the current `COST_BREAKDOWN.md` and `FINAL_LOGIC_SPEC.md`.
4. [`specs/COST_BREAKDOWN.md`](specs/COST_BREAKDOWN.md) — Generic Before / After comparison across Reference, Current, and Custom; pair-aware Selected Comparison, processing drill-down, and Gap reconciliation.
5. [`specs/CANDIDATE.md`](specs/CANDIDATE.md) — Legacy Candidate/RCA domain and session compatibility only; current finding UX is in [`specs/COST_BREAKDOWN.md`](specs/COST_BREAKDOWN.md). It does not define a visible standalone product stage.
6. [`specs/SIMULATION.md`](specs/SIMULATION.md) — Reference / Current / Custom role-local Simulation overrides, effective datasets, generic comparison state, lifecycle, calculations, and phase status.

Supporting architecture and design documents:
- [`SYSTEM_LOGIC_DIAGRAM.md`](SYSTEM_LOGIC_DIAGRAM.md) — Visual workflow diagrams (Mermaid and text).
- [Repository architecture map](../.archify/architecture-costbreakdown-20261020-160711/costbreakdown-architecture.html) — Source-cited module and browser data-flow map rendered from approved baseline `07a2c86a15d8716beacc20e9761a8073feadf914`.
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
4. **Cost Breakdown Scope (Phase 2 update — 2026-10-19 user decision):** CBD independently selects Before and After from the latest Reference, Current, and Custom Master Data Working datasets. All nine ordered pairs, including self-comparison, are valid; the default remains Reference → Current. Gap is After − Before; ADDED is After-only and REMOVED is Before-only. CBD selection never mutates or creates datasets.
5. **Selected Comparison:** A temporary analysis scope/view of selected BOM and Routing findings. It is neither a new dataset nor an RCA Case.
6. **Legacy RCA session compatibility:** Existing RCA case data may represent one or multiple Candidates and retain Root Cause / Why? and Action at the case level. This is not a current visible product stage.
7. **Legacy RCA completion semantics:** Historical sessions retain their Root Cause + Action completion meaning; the current product flow is Master Data → Cost Breakdown → Simulation, with no standalone RCA page.
8. **No Duplicate RCA Notes:** Existing Master Data annotations (`Note`, `META.Dataset Remark`) remain separate; no duplicate RCA Note system is created.
9. **Simulation Architecture (Phases 3–4):** There is no fourth persistent SIM dataset or copied snapshot. Simulation stores per-product, per-role parameter overrides and Business/Economic drafts over the latest Reference, Current, and Custom Working snapshots. Parameter editing/history target `activeDataset`; Result uses the selected `comparisonBefore → comparisonAfter` pair, whose After role owns Business/Economic drafts/history. Selecting an Active Dataset sets Result After to that role while preserving Before; manually changing either Result selector does not change Active Dataset. Each role uses its own rates and only that role rebases when its Working basis changes. The fixed graph is Reference | GAP 1 | Current | GAP 2 | Custom; its labels select `activeDataset` and synchronize Result After. CBD and Simulation share one Before/After selector with stable 96×32 triggers, popup minimum equal to the trigger and intrinsic growth for longer content. All nine ordered pairs, including self-pairs, remain valid. Fresh defaults are active Custom and Current → Custom.
10. **Simulation Reset and Send (Phase 3–4):** Main Reset affects only the active role: parameter overrides return to that role's current Master Working values; Fixed Action Cost, Variable Action Cost, and Batch Size clear; Selling Price and SG&A return to that role's Master Working defaults. It preserves active role, comparison pair, other roles, Master Data, and same-basis worklist selection; its complete role-local edit is undoable. Reset All applies the same reset to all roles and restores active Custom / Current → Custom. Its secondary label is exactly `Reset all`. Direct Send maps only the active role to its matching Master Data Working role; Send All applies all three same-role mappings atomically. Send updates Working only, preserves Last Saved, and rebases the sent role. Primary tooltips are `Send to Master Data` and `Reset`; Send's secondary label remains `Send all datasets`. No arbitrary Send destination is available. Old single-SIM state is reconciled or discarded only when a safe same-Current migration is provable.
11. **Parameter Simulation Comparison:** Match by business identity, never row position. Normal editable parameter rows show CHANGED or UNCHANGED against the active role's Master Working baseline. Missing, ambiguous, or unsafe comparison rows remain protected; Simulation does not use ADDED or REMOVED as normal editable parameter statuses.
12. **Direct Parameter Editing:** No Factors selector. BOM Price/Usage/Loss and Routing Manning/Capacity/Yield are directly editable within validated domains. Work Center rates are not Simulation-editable and remain owned by their matching Master Data dataset.
13. **Result and Cost Effect:** Core Result calculations accept any selected `comparisonBefore → comparisonAfter` effective pair and calculate each using its own Master rates. Before and After remain independently selectable, with all nine ordered pairs including self-comparison available. Visible Result headers are one compact row: `Cost / Unit | Before | After | Change | %`; selected role names remain in selector accessible names, not repeated as visible columns. `Business Outcome / Unit` remains a compact section divider. Result Change is After − Before. Parameter editor rows/status/effects use `activeDataset` and its own Working values/rates. The graph remains Reference | GAP 1 | Current | GAP 2 | Custom, with GAP 1 = Current − Reference and GAP 2 = Custom − Current; its X geometry uses one widened coordinate system with no duplicate SVG translation.
14. **Economic Simulation:** Business/Economic inputs and defaults belong to `comparisonAfter`; economic outcomes use the effective After cost, while Parameter Saving compares effective Before to effective After. Fixed Action Cost, Variable Action Cost / pc, positive integer Batch Size, Selling Price, and SG&A use `Fixed Cost / pc = Fixed Action Cost / Batch Size` and `Required Saving / pc = Fixed Cost / pc + Variable Action Cost / pc`. Economics never enters Standard Cost.
15. **Combined Feasibility:** `Economic Margin = Parameter Saving − Required Saving`; negative margin and negative OP remain visible. Results are advisory, not an approval gate.
16. **Validation and Layout:** Percentage inputs are limited to 0–100% except Yield, which is greater than 0% and at most 100%. BOM/RTG have no horizontal scroll; the page has no horizontal overflow.
17. **Flexible Scenario Count:** Exactly Scenario A and B is not a mandatory business requirement.
18. **Business Formulas:** SG&A / pc = Selling Price × (SG&A % / 100); OP / pc = Selling Price − effective After Standard Cost − SG&A / pc. Negative OP is valid. MatVAR, LBVAR, and BDVAR remain out of scope.
19. **Trial Lifecycle Boundary:** No dedicated Trial execution, validation, approval, or promotion lifecycle. Custom can store trial data; to copy it into Current, choose `Clone` on Current and select Custom.

## Selected Value / Decimal UX — 2026-10-21

`FINALIZED — USER DECISION`: the Selected Value / Decimal UX contract, including hover-preview-first priority, focus-owned writer, transient preview, and pinned read-only value lifecycles, is in [`CROSS_CUTTING.md`](specs/CROSS_CUTTING.md#numeric-display-and-editing). Master Data Round 2 retains its finalized 350ms Header preview dwell, prompt cancellation, stable Header numeric / `%` / spinner regions, and calm editable affordance. Round 3's shared no-focus `SelectedNumber` is transparent at rest, uses `#E9EEF4` only on direct pointer hover, and keeps Pin at `blue-100`; Candidate row hover alone does not trigger Number Hover. Eligible CHANGED-row whitespace—including unused space in numeric, `#`, and reorder cells—expands/collapses and preserves Pin, while each actual control performs only its own action. Header Preview still begins after the shared 350ms dwell. The same pin toggles off, and a genuinely blank/background click discards Pin while intentional controls preserve it. Round 1, Round 2 — Master Data, Round 3 — Cost Breakdown, and the original five-item Round 4A — Simulation UI Polish are CLOSED. The pre-Round-4B regression correction gate remains open (**PRE-4B EXTERNAL AUDIT FAILED / CORRECTION REQUIRED**); Round 4B — Simulation Selected Value / Decimal UX is **NOT STARTED / BLOCKED**; Round 5 is **NOT STARTED**. The operational order, gates, history, and current checkpoint are recorded in [`PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md`](PHASE_2_SELECTED_VALUE_DECIMAL_UX_PLAN.md); that plan and [`HANDOFF.md`](../HANDOFF.md) do not override this or other canonical product requirements. Numeric domains, formulas, dataset/comparison lifecycle, and history semantics remain unchanged.

Two additional global numeric UX decisions are recorded in [`CROSS_CUTTING.md`](specs/CROSS_CUTTING.md#numeric-display-and-editing): editing/focus must hydrate the authoritative full value rather than the rounded display string, and the entire displayed value of a directly edited unsaved cell must be blue until its owning save/commit succeeds while calculated/derived-only changes retain normal text color. Authoritative-full-value-on-edit and full-precision stepping are **IMPLEMENTED / EXTERNALLY ACCEPTED** from their separate prior corrections. The direct-edit blue-value indicator remains **NOT STARTED**. The compact Numeric Display-Fit / Alignment / Fixed Sizing pass and subsequent centerline correction are part of the open pre-Round-4B gate (**PRE-4B EXTERNAL AUDIT FAILED / CORRECTION REQUIRED**): canonical uppercase scientific fallback, post-rounding capacities, shared Edit/View alignment, static numeric sets, and fixed Simulation frames are specified in the same section. The latest finalized centerline direction requires actual numeric header text center = fixed numeric region/input center = ordinary decimal anchor across applicable Master Data, Cost Breakdown, and Simulation columns. Ordinary-first measured rendered fit replaces arbitrary integer capacities; four fractional positions and scientific minimum widths must fit fixed regions, with stationary external suffixes and preserved Status gutters. Previous exact Simulation geometry is not accepted merely because it was documented. This correction does not implement Round 4B or the direct-edit blue-value indicator.

## Pre-Round-4B Regression Cleanup — Current Status

- **Status:** Round 1 CLOSED; Round 2 CLOSED; Round 3 CLOSED; original Round 4A historical work remains closed; current pre-Round-4B correction gate is **OPEN** (**EXTERNAL AUDIT FAILED / CORRECTIVE IMPLEMENTATION REQUIRED**); Round 4B **NOT STARTED / BLOCKED**; global direct-edit blue-value indicator **NOT STARTED**; Round 5 **NOT STARTED**.
- **Audited remote baseline:** `3af57b05e8518d7777d921f6b31ef50bce6ebf76` on branch `feat/selected-value-ux`.
- **Requirements reconciliation:**
  1. **Simulation Result & Break-even:** Result must remain contained without vertical overlap into Break-even; at normal desktop/tablet layout, Result must not have internal vertical or horizontal scrollbars merely to fit the workspace; removing scrollbars and letting content spill over into Break-even is unacceptable; layout may be rebalanced while preserving established visual hierarchy.
  2. **Ordinary-first numeric presentation:** ordinary notation is default; values such as `4.00`, `5.00`, `8.00`, `12.00`, `15.00`, `5.00 %`, `84.00 %`, `90.00 %`, `97.00 %`, `98.00 %` must remain ordinary when they fit and never fall back to scientific notation (`4.00E+0`, `1.20E+1`, `5.00E+0`) merely due to conservative reservations or fit miscalculations.
  3. **Floating-point noise:** machine noise (e.g. `9.000000000000004` -> 9; `0.09` vs `0.09000000000000004` UNCHANGED vs `0.091` CHANGED; residual `Δ Loss -8.88E-16` -> `0.00`) must not create false CHANGED states or fake effects; intentional precision (`12.3456789`) must be preserved on focus/edit; blanket destructive methods (`toFixed`, global epsilon) are prohibited.
  4. **Simulation Total label/value separation:** semantic green/red applies strictly to the numeric Total value; the word `Total` remains neutral text.
  5. **CBD Δ Loss `%` spacing:** requires a small stable adjacent gap (`5.00 %`) visually belonging to the number, matching the calm rhythm of Yield/%GAP; latest audit confirms current spacing remains NOT ACCEPTED.
  6. **Collateral cleanup:** restore unrequested Outcome green shade change (`emerald-700` back to standard semantic treatment); verify shared `#` selection caller visual weight in CBD/Simulation without collateral regression.

## Reading Order

1. Read this index for authority, migration rules, and canonical spec mapping.
2. Read [`specs/FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md) for the latest finalized product logic, calculations, examples, and acceptance checklist.
3. Read the page-specific canonical specs: [Cross-Cutting](specs/CROSS_CUTTING.md), [Master Data](specs/MASTER_DATA.md), [Cost Breakdown](specs/COST_BREAKDOWN.md), [Candidate & RCA](specs/CANDIDATE.md), and [Simulation](specs/SIMULATION.md).
4. Read [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](PROVISIONAL_IMPLEMENTATION_DECISIONS.md) where relevant for reversible AI choices.
5. Consult `agreements/` and `docs/history/` only for provenance, recovery of compatible finalized detail, or chronology. Do not copy superseded behavior as current.
6. Read implementation/crosswalk/handoff documents only for operational records and verification evidence: [`tasks/source-crosswalk-80.md`](../tasks/source-crosswalk-80.md) and [`HANDOFF.md`](../HANDOFF.md). They do not define requirements.
