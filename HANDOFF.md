# Current Handoff — Master Data Decision Migration and Cost Breakdown UI

**Updated:** 2026-10-05

## Active checkpoint

- Repository: `E:\COSTBREAKDOWN`.
- Branch: `codex/costbreakdown-spec-source`.
- This work started from `2609f19` (`docs: restore finalized source decisions`).
- Documentation migration and the authorized Cost Breakdown UI slices are committed; push remains the final action for this checkpoint.
- Keep the eight local synthetic verification scratch files untracked and out of commits.

## Completed

- Migrated the latest finalized Master Data decisions into the canonical spec and traceability documents. The dated decision record is in `docs/history/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md` §79. No unresolved contradiction between explicit decisions was found.
- Reworked the Cost Breakdown summary as a Reference / Current / Gap table for material, labor, burden, Conversion subtotal, and Standard Cost. Conversion remains a subtotal and is not counted twice.
- Cleaned the BOM detail table: removed the item code and extra field-difference disclosure, retained status/selection, and showed Reference and Current usage, units, prices, losses, costs, and Gap.
- Combined Routing and Work Center detail under Processing. Work Center totals use the existing core processing findings; Routing Process inputs and matching Work Center rates appear in expandable detail. All rates remain available as calculation context.
- Kept status filters and Selected Comparison controls, left unchanged rows without status badges, and preserved the collapsed `Review warnings (N)` disclosure.

## Scope and verification

- The UI change consumes existing calculations; it does not change core cost formulas, lifecycle behavior, Candidate, or RCA.
- No application tests, build, or browser checks were run or claimed for this checkpoint.
- `git diff --check` passed for the documentation migration and the staged UI slice. Git emitted only LF-to-CRLF normalization notices.
- Local synthetic verification scripts and workbooks remain untracked and were excluded from commits.

## Resume

1. Confirm the remote branch still descends from `2609f19` and push `codex/costbreakdown-spec-source` after this handoff update is committed.
2. Do not include the eight local scratch files in the push.
3. If further Cost Breakdown changes are requested, use the accepted brief in `C:\Users\Boom\.codex\attachments\c5d12e60-ab76-4922-8ad4-630cbf697f85\Pasted text.txt` and `docs/specs/COST_BREAKDOWN.md` as the behavior contract.
