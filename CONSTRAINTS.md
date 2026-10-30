# Engineering Constraints — Cost Breakdown

The behavior contract is in the canonical specs indexed by docs/REQUIREMENTS_INDEX.md. These constraints describe implementation and verification quality; they do not add product behavior.

## Calculation and data integrity

- Follow the calculation and comparison rules in `docs/specs/CROSS_CUTTING.md`; do not derive product formulas from code or old workbooks.
- Match by canonical business identity and do not use row position or guess ambiguous matches.
- Keep missing or invalid required inputs unavailable; do not silently replace them with zero or another plausible value.
- Reconcile detailed cost effects to their parent results whenever the canonical spec defines such a breakdown.
- Handle predictable missing, invalid, and divide-by-zero cases explicitly. Show a safe status instead of a misleading number.

## Scope boundaries

- Follow `docs/REQUIREMENTS_INDEX.md`, `docs/specs/FINAL_LOGIC_SPEC.md`, and the relevant current page specs. Older agreements and task records are provenance; do not implement content that conflicts with the current canonical specs.
- Do not infer formulas or behaviors for metrics classified as OUT OF SCOPE. Preserve compatible finalized UI/interaction requirements; a later human visual review is a UI acceptance checkpoint, not an unresolved business requirement.

## Verification

- Run relevant canonical `scripts/verify_*` verifiers for the behavior being changed.
- Run `npx tsc --noEmit --pretty false`, `npm run build`, and `git diff --check` for implementation changes.
- Check comparison boundaries, missing values, zero values, added and removed records, ambiguous identities, and scenario isolation when those paths change.
- `npm run excel` is specialized legacy model generation plus its verifier,
  not canonical workbook verification. It can generate old operational-looking
  workbook artifacts; run it only when specifically working on those legacy
  model files.
- Keep execution evidence distinct from human acceptance.
- Do not add dependencies or test infrastructure without a concrete need.
