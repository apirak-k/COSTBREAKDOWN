# Cost Breakdown Requirements Index

**Updated:** 2026-10-05

## Current source of truth

Apply sources in this order:

1. The user's latest explicit decisions in the active conversation. A later direct decision overrides an older summary or source when they conflict.
2. [MASTER_DATA_SPEC.md](MASTER_DATA_SPEC.md) and [COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md](COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md). Respect the status labels in the review context; design directions and deferred items are not finalized behavior.
3. The user's two source conversations: [COSTBREAKDOWN review](https://chatgpt.com/share/6ac1e3f9-b5e0-83ec-b2ac-b6ce7da95726) and [80-topic follow-up](https://chatgpt.com/s/t_6ac26aba193481918961c062fca76357). Use them to trace the discussion and later decisions.
4. [source-crosswalk-80.md](../tasks/source-crosswalk-80.md), the single row-by-row record of the 80 topics, current implementation status, evidence, and next actions. The 80 rows are a coverage checklist, not 80 simultaneous implementation tickets.

The older files in `agreements/` are historical references only. The user said they are outdated and directed current work to follow the 80-topic checklist, the two source conversations, and the two newer Markdown documents. Do not use an old agreement to override those sources or to invent a decision they leave open.

## Current implementation decisions

- Keep Reference and Current independent, each with Working and one Last Saved dataset in the current browser session.
- Match BOM by Name, Work Centers by WC, and Routing by Process. Never infer identity from row position or legacy Operation Code / Sequence.
- Full Comparison is the default. Selected Comparison shows only the selected-scope Gap; it does not show the Full Gap alongside it.
- Preserve the current Standard Cost engine. Missing required inputs remain unavailable; do not substitute zero.
- Excel templates and exports use four data tabs in this order: `META`, `BOM`, `ROUTING`, `WORK_CENTER`. Product metadata and Dataset Remark share `META`. `COST_CALCULATION` is a separate formula-linked view.
- The Excel calculation view mirrors the current Cost Engine: Material = Usage × Price × (1 + Loss); Labor and Burden = Manning ÷ (Capacity × Yield) × the matching Work Center rate. It is an inspectable Standard Cost calculation, not a new accounting model. GP/COGS/OP, margin, and monetary SG&A formulas remain deferred.
- Use the supplied screenshot as the layout direction for the complete Master Data page. Its displayed BOM table is an example, not the only table. Keep the Master Data toolbar and metadata summary together at the top of its scroll region and keep the workspace footer at the bottom of the application frame.
- Keep warning prose/counts out of Master Data table rows and footers; retain cell-level invalid cues and show dataset notices outside tables. Keep `#` at the left and the reorder-only drag handle in the rightmost table column. Collapse Cost Breakdown warning details behind a concise count by default and remove duplicate alert copy.

## Supporting project documents

- [MASTER_DATA_SPEC.md](MASTER_DATA_SPEC.md) — current Master Data behavior, schemas, workbook format, and Selected Comparison decisions.
- [COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md](COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md) — source-discussion context and status-qualified decisions.
- [PROJECT_SPECIFIC.md](../PROJECT_SPECIFIC.md) — project safeguards.
- [plan.md](../tasks/plan.md) — ordered implementation plan.
- [todo.md](../tasks/todo.md) — task-level work and verification notes; it does not duplicate per-topic status.
- [source-crosswalk-80.md](../tasks/source-crosswalk-80.md) — the sole 80-topic status/evidence ledger.
- [HANDOFF.md](../HANDOFF.md) — live branch checkpoint and cross-device resume instructions; it does not define product behavior.
- `agreements/` — historical context only; no longer the active requirements authority.

If the current sources do not settle a behavior, leave it undecided or deferred and record the exact question in the crosswalk. Do not fill the gap with a historical agreement, an old workbook formula, or an implementation guess.
