# Implementation Plan: Master Data Versioned Costing Dataset

## Overview

Bring the Master Data page in line with the agreed Git-like costing workflow: the Header supplies the selected Product context; Master Data prepares one editable Product Dataset at a time as either `Reference` or `Current`; Excel input is one Product per workbook; invalid Product identity blocks the import; Draft data can be edited or cloned; Cost Breakdown remains the downstream comparison surface.

This plan is intentionally separate from `tasks/plan.md`, which tracks the earlier Cross-Page Ranking/RCA/Simulation work.

## Source of truth

- `docs/specs/master-data.md`
- `docs/superpowers/specs/2026-09-23-master-data-excel-dataset-contract.md`
- Existing runtime path: `src/shared/layout/Navbar.tsx` → `src/features/master-data` → `src/services/excel` → `src/state/store.tsx`

## Non-goals

- Cost Breakdown comparison UI
- Candidate Selection, RCA, or Simulation
- Financial variables such as Sale, COGS, Gross Profit, SG&A, OP, and Profit
- Export behavior
- Replacing the core Material/Labor/Burden cost structure

## Architecture decisions

1. The Header Product selection is the only Product context. Master Data consumes it and does not create a second competing context.
2. `CostSnapshot` is the source of truth for Master Data role-specific editing. The legacy paired `base/active` projection remains only as a compatibility boundary for downstream screens until those screens are migrated.
3. `Reference` and `Current` are roles assigned by the UI, not columns inside an Excel workbook.
4. A failed import is transactional: parsing and validation happen before any store mutation.
5. The application-provided canonical workbook is the normal Master Data import path. Legacy paired workbooks are not used by the Master Data upload UI.
6. Manual edits apply only to a Draft dataset. Active data must be cloned before editing.
7. Missing/invalid/warning evidence is preserved on the snapshot and never converted silently to a plausible numeric input.

## Task list

### Phase 1: Contract and import foundation

#### Task 1: Record the Master Data contract and execution plan

**Acceptance criteria:**

- [ ] Dataset identity, role, lifecycle, workbook sheets, validation, and non-goals are written down.
- [ ] The plan is separate from the older Cross-Page plan.

**Verification:** `git diff --check`; review the two Master Data documents.

**Dependencies:** None

**Files:** `docs/superpowers/specs/2026-09-23-master-data-excel-dataset-contract.md`, `tasks/master-data-plan.md`, `tasks/master-data-todo.md`

#### Task 2: Make canonical import validation authoritative

**Description:** Validate the canonical workbook against the selected Header Product before mutation. Require exactly one Product row, preserve nulls and quality findings, validate Routing Work Center references, and keep legacy parsing out of the Master Data upload path.

**Acceptance criteria:**

- [ ] Product Code mismatch returns a blocking error and leaves the existing session unchanged.
- [ ] Missing numeric cells remain `null` with visible data-quality evidence.
- [ ] Unparseable numeric cells are marked invalid rather than becoming zero.
- [ ] Missing/unknown Routing Work Center references are reported.
- [ ] A successful import returns one role-specific snapshot.

**Verification:** focused import fixtures plus `npm run build`.

**Dependencies:** Task 1

**Files likely touched:** `src/core/types`, `src/services/excel/snapshot-parser.ts`, `src/shared/ui/ExcelUploadDropzone.tsx`, `src/state/store.tsx`

#### Checkpoint A

- [ ] Canonical import tests pass.
- [ ] Product mismatch is proven to be non-mutating.
- [ ] Build succeeds.

### Phase 2: Canonical Excel template

#### Task 3: Replace the downloaded input template

**Description:** Generate a workbook for one Product Dataset with `META`, `PRODUCT`, `WORK_CENTER`, `BOM`, `ROUTING`, and an optional retention sheet. Remove Base/Active input pairs, calculation sheets, comparison sheets, and formulas from the input template. Include instructions and examples without treating examples as user data.

**Acceptance criteria:**

- [ ] The workbook contains no Base/Active input headers.
- [ ] The workbook has one Product row and adjustable Work Center/BOM/Routing capacity.
- [ ] The workbook contains a legend and realistic example guidance.
- [ ] A generated workbook can round-trip through the canonical parser.

**Verification:** inspect generated sheet names/headers with `xlsx` tooling and run the round-trip fixture.

**Dependencies:** Task 2

**Files likely touched:** `src/services/excel/dynamic-excel-generator.ts`, `src/core/types/excel.types.ts`, focused verification script

### Phase 3: Role-aware Master Data editing

#### Task 4: Add role-aware Draft editing

**Description:** Make the Master Data page display and edit the selected role's snapshot. Add explicit role/lifecycle indicators, ensure Active data is read-only until cloned, and keep Reference and Current independent.

**Acceptance criteria:**

- [ ] Switching Reference/Current changes the dataset being edited without copying values across roles.
- [ ] Manual edits, additions, and deletions apply only to the selected Draft.
- [ ] Active data cannot be silently mutated.
- [ ] Clone Reference to Current Draft is supported.
- [ ] The page does not show Base/Active input columns or legacy promote-to-baseline actions.

**Verification:** `npm run build` and a browser walkthrough covering both roles, clone, edit, and activation.

**Dependencies:** Tasks 2-3

**Files likely touched:** `src/state/store.tsx`, `src/core/types`, `src/features/master-data/MasterDataPage.tsx`, master-data tables/modals

#### Task 5: Show source/data-quality state in the page

**Description:** Surface source references and data-quality findings for the selected dataset. Keep source values distinct from working values where imported evidence exists and provide an actionable warning summary.

**Acceptance criteria:**

- [ ] Missing, invalid, warning, and review-needed states are visible.
- [ ] Source reference is not overwritten when a working value is edited.
- [ ] Zero is shown only when sourced or explicitly entered.
- [ ] Routing-to-Work-Center errors are visible at row level or in the summary.

**Verification:** browser walkthrough with missing/invalid fixture values and manual edits.

**Dependencies:** Task 4

### Phase 4: Downstream handoff and regression

#### Task 6: Gate the handoff to Cost Breakdown

**Description:** Keep comparison out of Master Data while exposing whether Reference and Current are ready for the downstream page. Do not implement comparison behavior in this task.

**Acceptance criteria:**

- [ ] Master Data remains an input/validation page.
- [ ] The downstream action uses the Header Product context.
- [ ] An incomplete role pair is clearly identified instead of comparing a seed/fallback dataset silently.

**Verification:** browser walkthrough with zero, one, and two prepared roles.

**Dependencies:** Tasks 4-5

#### Checkpoint B / completion

- [ ] All Master Data acceptance criteria in `docs/specs/master-data.md` are evidenced.
- [ ] `npm run build` succeeds.
- [ ] Canonical workbook generation and import verification pass.
- [ ] Browser walkthrough passes for Product, Reference, Current, Draft, Clone, validation, and handoff.
- [ ] Each implementation slice has its own commit and no unrelated changes are included.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Legacy screens consume the paired projection | High | Keep a compatibility projection at the boundary; use snapshots as Master Data source of truth. |
| Existing seed data contains Base/Active pairs | Medium | Treat it as a legacy migration input; never generate new paired input files. |
| Manual UI edits can bypass role selection | High | Route all Master Data mutations through role-aware Draft actions. |
| Existing scripts assume the old template | Medium | Add canonical verification and preserve unrelated Excel model scripts until their consumers are reviewed. |

## Open questions intentionally deferred

- Product-level Sale Price versus separate financial data contract.
- Which optional routing time fields become calculation inputs.
- When `ADDITIONAL_DATA` becomes calculation-aware rather than retention-only.
