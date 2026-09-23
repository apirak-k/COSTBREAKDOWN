# Master Data Implementation Tasks

Plan: [`tasks/master-data-plan.md`](master-data-plan.md)
Spec: [`docs/specs/master-data.md`](../docs/specs/master-data.md)
Dataset contract: [`docs/superpowers/specs/2026-09-23-master-data-excel-dataset-contract.md`](../docs/superpowers/specs/2026-09-23-master-data-excel-dataset-contract.md)
Requirements authority: [`docs/REQUIREMENTS_INDEX.md`](../docs/REQUIREMENTS_INDEX.md)

## Phase 1: Contract and import foundation

- [x] Task 1: Record the Master Data contract and execution plan
  - Verification: `git diff --check` and document review.
- [x] Task 2: Make canonical import validation authoritative
  - Acceptance: Product mismatch blocks without mutation; null/invalid values remain visible; routing references are validated.
  - Verification: focused import fixtures and `npm run build`.

## Checkpoint A

- [x] Canonical import tests pass.
- [x] Product mismatch is proven non-mutating.
- [x] Build succeeds.

## Phase 2: Canonical Excel template

- [x] Task 3: Replace the downloaded input template
  - Acceptance: one Product Dataset workbook, no Base/Active input pairs, round-trip parser support.
  - Verification: inspect generated workbook with `xlsx` tooling.

## Phase 3: Role-aware Master Data editing

- [x] Task 4: Add role-aware Draft editing
  - Acceptance: Reference/Current are independent; Draft-only edits; Clone supported; legacy Base/Active controls removed.
  - Verification: build and browser walkthrough.
- [x] Task 5: Show source/data-quality state in the page
  - Acceptance: source/working and Missing/Invalid/Warning states are visible.
  - Verification: browser walkthrough with problematic fixture values.

## Phase 4: Downstream handoff and regression

- [ ] Task 6: Gate the handoff to Cost Breakdown
  - Acceptance: comparison stays downstream and incomplete role pairs are not silently compared.
  - Verification: browser walkthrough with zero, one, and two roles.

## Completion checkpoint

- [ ] Master Data acceptance criteria are evidenced.
- [x] `npm run build` succeeds.
- [x] Canonical Excel generation/import verification passes.
- [x] Browser walkthrough passes.
- [x] All increments are committed separately.
