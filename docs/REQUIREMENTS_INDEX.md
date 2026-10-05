# Requirements Index

**Updated:** 2026-10-05

## Authority order

Resolve conflicting requirements in this order:

1. The user's latest explicit decision.
2. An intentional behavior change directly requested by the user and supported by a matching commit. A commit alone does not establish intent.
3. The applicable canonical specification under [`specs/`](specs/).
4. Historical agreements and discussion/context snapshots.
5. Existing code, as implementation evidence only; code does not create requirements.

When a behavior is not settled by an authoritative source, keep it `PENDING/TBD`. If code differs from an agreed specification without a user decision that explains the change, record an unresolved gap; do not rewrite the specification to match the code.

## Reading order

1. Read this index.
2. Read [`specs/CROSS_CUTTING.md`](specs/CROSS_CUTTING.md), then the canonical page specification(s): [Master Data](specs/MASTER_DATA.md), [Cost Breakdown](specs/COST_BREAKDOWN.md), [Candidate](specs/CANDIDATE.md), and [RCA & Simulation](specs/RCA_SIMULATION.md).
3. Read [`tasks/source-crosswalk-80.md`](../tasks/source-crosswalk-80.md) for requirement-to-commit traceability and implementation/verification status. It is not a requirements source or feature backlog.
4. Read [`HANDOFF.md`](../HANDOFF.md) for the active repository checkpoint and resume instructions. It is operational only.
5. Consult [`agreements/`](../agreements/) and [`docs/history/`](history/) only as historical evidence.

## Original source conversations

- [COSTBREAKDOWN review](https://chatgpt.com/share/6ac1e3f9-b5e0-83ec-b2ac-b6ce7da95726)
- [80-topic follow-up](https://chatgpt.com/s/t_6ac26aba193481918961c062fca76357)

The source conversations carry the user's original decisions. Canonical specs consolidate only confirmed behavior; unresolved matters remain `PENDING/TBD`.
