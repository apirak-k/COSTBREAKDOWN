# Requirements Index

**Updated:** 2026-10-05

## Decision authority and migration protection

Use chronology and the original decision status to resolve behavior:

1. The user's latest explicit decision supersedes an earlier decision only for the behavior it explicitly changes.
2. A previously `FINALIZED` decision in a source conversation or `agreements/` remains valid unless a later explicit user decision supersedes it.
3. `docs/specs/` is the consolidated, user-readable destination for current behavior. If a finalized decision is missing there, that is a migration gap; absence does not make the decision `PENDING/TBD` or invalidate its source.
4. Preserve source labels: `FINALIZED`, `CONFIRMED`, `CURRENT BASELINE`, `DESIGN DIRECTION`, `PENDING`, and `UNDECIDED` are not interchangeable. Do not promote a baseline/direction to a requirement or downgrade a finalized decision because it is absent from a newer summary.
5. When sources conflict, compare their dates and explicit user decisions. A commit can help establish when an implementation changed, but a commit alone does not prove user intent. Existing code is implementation evidence only and creates no requirement.
6. If two actual user decisions conflict and chronology cannot show which supersedes the other, record only that specific conflict for review. Do not reopen unrelated settled topics.

`tasks/source-crosswalk-80.md` is traceability and implementation/verification status only. It is not a requirements source or an 80-feature backlog. `HANDOFF.md`, `tasks/plan.md`, and `tasks/todo.md` are operational records and cannot supersede a product decision.

## Agreement migration

Do not call an agreement obsolete merely because it is older or its decision is absent from `docs/specs/`. Before describing `agreements/` as historical provenance, migrate every still-valid finalized decision into the relevant canonical spec and identify only the specific behaviors later superseded. The original agreement remains evidence of its decision and status after migration.

The later finalized Master Data source supersedes specific earlier Master Data agreement details: the Product/BOM/WC/Routing fields and identities, the earlier workbook shape, and Working-state export (current export uses Last Saved). It also adds the four-data-sheet workbook with its separate calculation view and the rightmost reorder handle. Other compatible finalized Master Data decisions remain valid. The old Cost Comparison routing identity based on Operation Code/Sequence is superseded by the later approved Routing `Process` identity. These specific changes do not invalidate the rest of either source.

The latest user correction also removes MatVAR, LBVAR, and BDVAR from current scope. They are not pending formulas or deferred features.

## Reading order

1. Read this index and the latest explicit user decisions for the task.
2. Check the relevant source decision records in `agreements/` and the dated source context under `docs/history/`; retain their original status and chronology.
3. Read the relevant consolidated behavior in [`specs/CROSS_CUTTING.md`](specs/CROSS_CUTTING.md) and the page specs: [Master Data](specs/MASTER_DATA.md), [Cost Breakdown](specs/COST_BREAKDOWN.md), [Candidate](specs/CANDIDATE.md), and [RCA & Simulation](specs/RCA_SIMULATION.md). Report and repair any migration gap before implementation.
4. Read [`tasks/source-crosswalk-80.md`](../tasks/source-crosswalk-80.md) only for traceability, implementation status, verification evidence, and gaps.
5. Read [`HANDOFF.md`](../HANDOFF.md) for the active checkpoint. Consult `tasks/plan.md` and `tasks/todo.md` for operational history only.

## Original source conversations

- [COSTBREAKDOWN review](https://chatgpt.com/share/6ac1e3f9-b5e0-83ec-b2ac-b6ce7da95726)
- [80-topic follow-up](https://chatgpt.com/s/t_6ac26aba193481918961c062fca76357)

These conversations are primary records of the user's decisions. Preserve finalized and confirmed decisions when consolidating them; leave only genuinely undecided behavior as `PENDING/TBD`.
