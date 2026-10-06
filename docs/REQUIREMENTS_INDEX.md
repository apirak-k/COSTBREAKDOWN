# Requirements Index

**Updated:** 2026-10-06

## Decision authority and migration protection

Use chronology and the original decision status to resolve behavior:

1. The user's latest explicit decision supersedes an earlier decision only for the behavior it explicitly changes.
2. A previously `FINALIZED` decision in a source conversation or `agreements/` remains valid unless a later explicit user decision supersedes it.
3. `docs/specs/` is the consolidated, user-readable destination for current behavior. If a finalized decision is missing there, that is a migration gap; absence does not make it `PENDING — USER DECISION NEEDED` or invalidate its source.
4. Preserve the labels in source records: `FINALIZED`, `CONFIRMED`, `CURRENT BASELINE`, `DESIGN DIRECTION`, `PENDING`, and `UNDECIDED` are not interchangeable. Use the current implementation-status labels below when consolidating a decision; do not promote a baseline/direction to a requirement or downgrade a finalized decision because it is absent from a newer summary.
5. When sources conflict, compare their dates and explicit user decisions. A commit can help establish when an implementation changed, but a commit alone does not prove user intent. Existing code is implementation evidence only and creates no requirement.
6. If two actual user decisions conflict and chronology cannot show which supersedes the other, record only that specific conflict for review. Do not reopen unrelated settled topics.

`tasks/source-crosswalk-80.md` is traceability and implementation/verification status only. It is not a requirements source or an 80-feature backlog. `HANDOFF.md`, `tasks/plan.md`, and `tasks/todo.md` are operational records and cannot supersede a product decision.

## Current decision status and AI implementation choices

Use these labels in the canonical specs and implementation notes:

- **`FINALIZED — USER DECISION`** — the user settled this behavior. Preserve it unless a later explicit user decision changes that specific behavior.
- **`CONFIRMED DIRECTION — USER DECISION`** — the user confirmed the outcome, principle, or visual direction; safe implementation details may still be chosen by AI.
- **`PROVISIONAL — AI CHOICE`** — AI selected a reversible implementation or presentation detail because the user had not fixed it. Record the choice, why it was chosen, the constraints it preserves, and how it can be revised in [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](PROVISIONAL_IMPLEMENTATION_DECISIONS.md). It is not a user requirement, cannot override a user decision, and does not become finalized just because code ships.
- **`PENDING — USER DECISION NEEDED`** — a genuinely unresolved product/business/lifecycle decision that cannot safely be inferred. State the narrow question and source evidence. Continue independent work; do not ask the user to reconstruct prior discussions.

Human visual acceptance is a review checkpoint, not a missing product decision. It may follow implementation of reversible AI choices; it does not block ordinary implementation or promote those choices to user requirements.

Do not require the user to approve ordinary layout, component, wording, or implementation details one by one. Make a safe choice and record it as provisional. Do not use a provisional choice to invent accounting formulas, monetary attribution, identity/matching semantics, persistence/lifecycle behavior, destructive behavior, or Trial approval/promotion workflow.

## Agreement migration

Do not call an agreement obsolete merely because it is older or its decision is absent from `docs/specs/`. Before describing `agreements/` as historical provenance, migrate every still-valid finalized decision into the relevant canonical spec and identify only the specific behaviors later superseded. The original agreement remains evidence of its decision and status after migration.

The later finalized Master Data source supersedes specific earlier Master Data agreement details: the Product/BOM/WC/Routing fields and identities, the earlier workbook shape, and Working-state export (current export uses Last Saved). It also adds the four-data-sheet workbook with its separate calculation view and the rightmost reorder handle. Other compatible finalized Master Data decisions remain valid and must be migrated: confirmation before cloning over a populated destination, using the selected side's Sizing counts for blank template rows, exact keyboard and row-selection gestures, multi-row deletion, and preserving record `Note` / `META.Remark` through editing and workbook round-trip. A later explicit user decision on 2026-10-06 settles Clone readiness: Clone is never gated by source readiness, and destination readiness is recalculated from the copied Working content; see the canonical Master Data spec, review-context §80, and provisional implementation detail P-010. The old Cost Comparison routing identity based on Operation Code/Sequence is superseded by the later approved Routing `Process` identity. These specific changes do not invalidate the rest of either source.

The latest Master Data addendum in the dated review context (§79) finalizes the first-entry default of All Tables, same-session Master Data UI-state preservation, page-level Working-edit Undo/Redo scope, and the Excel yellow-cell rule. It also records UX/UI directions separately from product behavior and pending exact layout details.

The 2026-09-30 cross-cutting snapshot also records a still-open Excel boundary for intentionally blank user-owned rows: without an agreed marker or policy, they cannot be distinguished from blank template rows for round-trip. Keep this separate from the open behavior of generated Sizing rows; the current pending questions are listed in `specs/MASTER_DATA.md`.

The latest user correction also removes MatVAR, LBVAR, and BDVAR from current scope. They are not pending formulas or deferred features.

The Candidate monetary boundary is explicit: a material record's calculated Reference cost, Current cost, and Gap may be used for its current monetary/ranking value. Changed input values remain visible as Reference → Current details, but no per-factor THB attribution method is agreed. Do not derive one from source code or repeat a whole-record Gap as each factor's monetary effect.

## Reading order

1. Read this index and the latest explicit user decisions for the task.
2. Read the canonical behavior in [`specs/CROSS_CUTTING.md`](specs/CROSS_CUTTING.md) and the page specs: [Master Data](specs/MASTER_DATA.md), [Cost Breakdown](specs/COST_BREAKDOWN.md), [Candidate](specs/CANDIDATE.md), and [RCA & Simulation](specs/RCA_SIMULATION.md). Treat these as the normal product contracts.
3. Read [`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](PROVISIONAL_IMPLEMENTATION_DECISIONS.md) for reversible AI choices. It is implementation guidance only and is subordinate to this index and the canonical specs.
4. Consult `agreements/` and `docs/history/` only to recover still-valid finalized detail, repair a migration gap, or resolve chronology. Preserve the source status; do not copy superseded behavior or reopen settled decisions.
5. Read [`tasks/source-crosswalk-80.md`](../tasks/source-crosswalk-80.md) only for traceability, implementation status, verification evidence, and gaps.
6. Read [`HANDOFF.md`](../HANDOFF.md) only for the active work checkpoint. Consult `tasks/plan.md` and `tasks/todo.md` for operational history only.

## Original source conversations

- [COSTBREAKDOWN review](https://chatgpt.com/share/6ac1e3f9-b5e0-83ec-b2ac-b6ce7da95726)
- [80-topic follow-up](https://chatgpt.com/s/t_6ac26aba193481918961c062fca76357)

These conversations are primary records of the user's decisions. Preserve finalized and confirmed decisions when consolidating them; leave only genuinely undecided behavior as `PENDING — USER DECISION NEEDED`.
