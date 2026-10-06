# Current Handoff — Spec-Aligned Product Implementation

**Updated:** 2026-10-06

## Active checkpoint

- Repository: `E:\COSTBREAKDOWN`.
- Branch: `codex/costbreakdown-spec-source`.
- The pre-implementation checkpoint tag `checkpoint/pre-overnight-spec-implementation-2026-10-06` points to `3b2d60d` and is present locally and on `origin`.
- The verified implementation slice is committed as `d9d38dd` (`feat: add live cost overview and candidate drilldowns`); the follow-up documentation checkpoint is being committed next.
- The user authorized pushing the completed work to `origin/codex/costbreakdown-spec-source` after final verification.
- Keep these eight local synthetic-verification files untracked and out of commits: `.make-synthetic-verification.mjs`, `.synthetic-current.xlsx`, `.synthetic-mismatch.xlsx`, `.synthetic-reference.xlsx`, `.verify-cost-calc-sample.mjs`, `.verify-duplicate-calc.mjs`, `.verify-neutral-workbook-via-vite.mjs`, and `.verify-sizing-via-vite.mjs`.

## Completed

- Preserved the agreed Cost Breakdown calculations and comparison lifecycle.
- Candidate findings use BOM `Name`, take record-level material costs and Gap from the Comparison layer, and show each changed input as Reference → Current without assigning THB to individual factors.
- Processing candidates remain aggregated by Work Center; their Routing Process drill-down lists each side independently and uses the existing routing-cost calculation.
- Cost Breakdown now exposes changed BOM fields under the Name row. RCA shows record-level Reference/Current cost and the selected Candidate's changed input values. Scenario inputs use the approved BOM Name and call Usage by its approved label.
- Added a Dashboard page with Standard Cost result, Material/Processing causes, BOM and Work Center/Process detail, and live Scenario A/B/C results from the human-selected RCA Candidate. The Dashboard does not select a candidate or scenario automatically.
- Selling Price and SG&A appear as Current context only. COGS, GP, margins, OP, and Sales remain uncalculated while formulas are pending. Trial execution/approval remains out of scope; MatVAR/LBVAR/BDVAR remain removed from scope.
- Updated the 80-topic crosswalk for current implementation and verification evidence; it continues to track status only, not define requirements.

## Verification

- `npm run build` passed (2,033 modules). Vite reports existing ExcelJS browser externalization warnings for `fs` and `crypto`.
- `node scripts/verify_cost_breakdown_review_feedback.mjs` passed, including Candidate/Cost Breakdown details and server-rendered Dashboard checks for live scenarios, pending business formulas, and no auto-selection.
- Focused `npx jiti` verifiers passed for Candidate prioritization, ranking, Cost Breakdown view and reconciliation, scenario input mapping/drafts/economics, RCA record/notes/handoff/simulation context, and global workflow status.
- `git diff --check` passed; Git reported only LF-to-CRLF normalization notices.
- Browser visual inspection and human UI acceptance are not recorded. Local browser navigation was blocked by the browser policy, so no rendered-browser or human-acceptance claim is made.

## Remaining boundaries

- Keep business formulas and exact chart composition pending until explicit decisions are recorded.
- Keep Trial execution, validation, approval, and promotion separate and unspecified.
- Exact final page styling and human visual acceptance remain open.

## Next action

Commit this handoff/crosswalk update, then push the completed branch to `origin/codex/costbreakdown-spec-source` and verify the remote tip. Do not merge.
