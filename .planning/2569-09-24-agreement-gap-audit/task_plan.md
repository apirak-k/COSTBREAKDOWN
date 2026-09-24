# Task Plan: Agreement Gap Audit and Implementation Plan

## Goal
Compare the current application with the four documents in `agreements/`, then produce an evidence-based, phased implementation plan without changing application behavior.

## Next Step
Begin Task 1 in `tasks/todo.md` in a follow-up implementation session.

## Current Phase
Complete: Audit and Implementation Roadmap Delivered

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm user direction: the new `agreements/` documents are authoritative; keep required current project context.
- [x] Re-read the four agreements and record acceptance rules, dependencies, and open decisions.
- [x] Identify app entry points and state/data-flow modules.
- **Status:** complete

### Phase 2: Code-to-Agreement Audit
- [x] Trace current behavior from source code and classify each agreement area as implemented, partial, missing, conflicting, or unverified.
- [x] Record exact file and line evidence for each classification.
- [x] Do not edit application code or run application tests.
- **Status:** complete

### Phase 3: Implementation Roadmap
- [x] Order work by dependencies and user workflow.
- [x] Define scope, acceptance criteria, and verification approach for each implementation phase.
- [x] Call out unresolved product decisions and keep Trial out of committed scope while its behavior remains undefined.
- **Status:** complete

### Phase 4: Deliverable Review
- [x] Review audit evidence against the agreement text.
- [x] Ensure the plan is understandable, actionable, and stored as the active plan.
- [x] Update `HANDOFF.md` with the completed audit and next action.
- **Status:** complete

## Proposed Implementation Roadmap

Implement in the data-flow order below. Each phase should be reviewed against its acceptance criteria before beginning the next dependent phase. This is a future execution plan; no application changes or tests were run while preparing it.

The small implementation tasks and verification steps are maintained in `tasks/plan.md` and `tasks/todo.md`.

### Phase 1 — Replace the Product Session Flow with a Temporary Two-Sided Workspace

**Scope**
- Start with empty Reference and Current Working Datasets; remove the seeded RGOM startup dependency and the Draft/Active/Archived, clone-to-draft, activate, and Header Product readiness workflow from the active path.
- Keep both sides independently editable for Product, Work Center, BOM, and Routing data. Preserve copy Reference → Current as an independent copy.
- Make Excel import replace only the selected side, then continue editing the imported Working Dataset through the same page model as manual data.
- Keep Product mismatch as a visible warning while allowing comparison.
- Retain browser-session-only storage, the existing template action, and add optional export of either side's latest edited dataset in a re-importable format.

**Acceptance criteria**
- First open shows an empty, immediately usable two-sided workspace with no product setup or activation step.
- Manual and imported values use the same Working Dataset structure; editing one side never mutates the other.
- Import replaces the selected side without merging and leaves the opposite side unchanged; the imported side remains editable.
- A Product mismatch is warned about but does not block comparison.
- Exporting Reference or Current produces that side's latest edits and can restore it through import; closing/resetting the browser session clears in-app working data.
- Template generation remains available using the shared data model.

**Verification approach**
- Use isolated state fixtures for empty initialization, independent copy/edit, replacement import, mismatch warning, session reset, and export/re-import round trip.
- Run a browser workflow from blank workspace through manual/import/edit/compare navigation after the implementation is complete.

### Phase 2 — Make Comparison Findings the Complete, Reconciled Source of Truth

**Scope**
- Match by stable business identity; validate missing, duplicate, and invalid keys separately and never silently guess or fall back to row order/sequence or unstable generated IDs.
- Use only `UNCHANGED`, `CHANGED`, `ADDED`, and `REMOVED`; keep changed fields such as price, sequence, capacity, yield, and Work Center as details under `CHANGED`.
- Preserve independent Reference and Current cost calculations and the `Current - Reference` convention. Treat an absent record side as zero contribution while retaining null/warnings for missing required values.
- Return field-level differences, record-level cost effects, and an explicit reconciliation result from the comparison layer. Make detail tables and comparison export consume that result rather than recalculate separate statuses or cost effects.
- Add filtering by each status while preserving the default full view and unchanged rows.

**Acceptance criteria**
- Reordering rows or changing routing sequence never pairs different operations; structural additions/removals appear as `ADDED`/`REMOVED`, with no inferred split/merge relationships.
- Every comparable record has exactly one contract status. Identity problems appear as validation warnings outside the status vocabulary.
- Added/removed records show zero on the absent side; missing required inputs remain data-quality issues.
- BOM, Labor, Burden, and Total detail effects reconcile to their corresponding gaps; a mismatch is surfaced as a calculation/validation issue.
- All, Changed, Added, Removed, and Unchanged filters produce the expected rows; export uses the same statuses and reconciled record gaps.

**Verification approach**
- Use fixtures for unchanged/changed/added/removed BOM, Work Center, and Routing records; changed sequence; duplicate/missing identity; missing cost input; and row reorder.
- Assert `Current - Reference`, absent-side zero, validation separation, filter membership, and record-to-branch-to-total reconciliation.
- Review the generated comparison workbook against the same fixture results.

### Phase 3 — Derive Candidate Prioritization from Comparison Findings

**Scope**
- Replace the active Base/Active `topDrivers` source with Comparison findings.
- Build material candidates at factor granularity (including price, loss, and supported usage/consumption changes); keep unrelated factors separate and preserve Added/Removed findings.
- Aggregate Routing processing cost by Work Center for Reference and Current; use Routing rows only as drill-down details, without one-to-one routing matching or new routing IDs.
- Show candidate/finding, status, Reference cost, Current cost, Gap, and an explicit `controllable = true` human mark.
- Limit filters to All/Changed/Added/Removed; default to All and Gap descending. Keep zero and negative gaps visible.
- Remove RCA selection, Action/Root Cause forms, and other non-status filters from this page.

**Acceptance criteria**
- Every displayed candidate traces to Comparison findings; unchanged source rows do not become candidates.
- Material factor findings remain separate; processing rows that differ structurally still aggregate correctly by Work Center.
- Candidate status and cost direction remain independent; zero-gap structural changes remain visible.
- Controllability starts checked and unchecking it neither deletes nor hides a candidate.
- Candidate Prioritization ends with ranking/marking; it does not preselect an RCA target or collect RCA/action data.

**Verification approach**
- Feed comparison fixtures with separate material factor changes, structural material changes, routing row changes, and multi-operation Work Centers.
- Verify aggregation, status/gap values, default marks, filter-only behavior, and descending order including zero/negative values.

### Phase 4 — Rebuild RCA & Simulation on the Agreed Cost Engine

**Scope**
- Let the user select any candidate from the full candidate pool on the RCA page; do not choose the top-ranked item automatically.
- Put optional Root Cause and Action notes on this page and keep them out of numeric formulas.
- Create independent A/B/C scenario drafts from Current without mutating Current. Expose only measurable inputs confirmed by the shared Cost Engine, including usage/consumption where the engine supports it; do not simulate adding/removing records or split/merge structures.
- Recalculate each scenario with the full Standard Cost engine (`Material + Labor + Burden`) and show Current Standard Cost, Scenario Standard Cost, and Gross Saving per piece.
- Keep fixed investment, variable added cost, volume, and net benefit as a separate improvement-economics calculation.
- End at an explicit human-selected scenario handoff. Do not implement Trial validation, measured actual cost, or baseline promotion until a separate Trial agreement defines them.

**Acceptance criteria**
- Any candidate can be selected on the RCA page without first marking it on Candidate Prioritization; no candidate or scenario is silently selected as the recommended answer.
- Root Cause/Action are optional notes and do not affect cost calculations.
- Each scenario begins from the same Current data, recalculates from its own overrides, and leaves Current unchanged.
- Scenario Standard Cost matches the shared engine; Gross Saving equals Current Standard Cost minus Scenario Standard Cost.
- Improvement economics match the agreed formulas without changing either Standard Cost value.
- There are no structural simulation controls, additional financial metrics, or embedded Trial workflow.

**Verification approach**
- Use one material and one processing candidate; compare no-override, one-factor, and multiple-factor scenarios across A/B/C.
- Verify cost-engine parity, economic formulas, isolation between scenarios, unchanged source data, optional note behavior, and manual scenario handoff.

### Phase 5 — Cross-Flow Acceptance and Human Review

**Scope**
- Verify the complete path: empty Master Data → Comparison → Candidate Prioritization → RCA & Simulation → human-selected Trial handoff.
- Retire obsolete implementation paths only after checking their remaining references and preserving unrelated working-tree changes.
- Keep user acceptance distinct from automated test/build results.

**Acceptance criteria**
- A synthetic workbook and manual edits can travel through the full flow with identity warnings, four statuses, reconciled cost effects, candidate aggregation, and simulation outputs consistent across pages.
- No Trial behavior or future financial model has been added without its own agreement.
- Automated verification and manual review evidence are recorded; human acceptance is explicitly requested/recorded as a separate gate.

**Verification approach**
- Run focused tests at each phase, then the repository's agreed full verification suite and a browser smoke workflow after integration.
- Record failures, warning cases, final source state, and human acceptance status in the handoff.

### Open Decisions / Boundaries
- Confirm the Routing identity policy when both Operation Code and Process Code are missing or non-unique. Do not use sequence or generated row identity as a substitute without an agreed stable business key.
- Detailed template field-selection rules remain unspecified by the Master Data agreement; retain the shared data model and avoid inventing extra field-selection behavior.
- Trial validation, evidence capture, and final-baseline promotion remain undefined; only a human-selected handoff is in scope.
- Sale, COGS, Gross Profit, SG&A, OP, Margin, and other financial parameters remain future scope.

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Treat the four current agreement documents as the product contract. | User explicitly directed that the new agreements govern. |
| Keep this task read-only with respect to app behavior. | User asked to create the next plan; implementation can follow the evidence-based plan. |
| Finish the complete code audit before drafting the implementation roadmap. | User explicitly corrected the order of work. |
| Store this task under `.planning/2569-09-24-agreement-gap-audit/`. | Keeps the current work reviewable after obsolete plans were removed. |
| Use Graphify structurally on `src/` only. | Maps module relationships without reprocessing business documents or requiring semantic extraction. |

## Errors Encountered
| Error | Resolution |
|-------|------------|

