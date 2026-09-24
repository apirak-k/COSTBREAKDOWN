# Engineering Constraints — Cost Breakdown

The behavior contract is in agreements/ and is indexed by docs/REQUIREMENTS_INDEX.md. These constraints describe implementation and verification quality; they do not add product behavior.

## Calculation and data integrity

- Calculate Reference and Current independently before comparing them.
- Match records by business identity. Do not use row position as identity or guess ambiguous matches.
- Use Gap = Current cost - Reference cost.
- A record absent on one side contributes zero on that side. A missing required input is a validation/data-quality issue, not zero.
- Reconcile detailed cost effects to their parent and total gaps.
- Aggregate Processing candidates by Work Center as specified; do not count the same cost effect twice.
- Reuse the verified Cost Engine for scenarios. Keep scenarios isolated from Current and limit overrides to supported measurable inputs.
- Handle predictable missing, invalid, and divide-by-zero cases explicitly. Show a safe status instead of a misleading number.

## Scope boundaries

- Candidate ranking must not select an improvement target automatically.
- Root Cause and Action are optional descriptive fields and are not numeric inputs.
- Structural Simulation and additional financial metrics remain outside the current RCA & Simulation scope.
- UI layout is not fixed by the behavior specifications.

## Verification

- Run npm run build for implementation changes.
- Run npm run excel and relevant formula-parity checks when calculation or workbook behavior changes.
- Check comparison boundaries, missing values, zero values, added and removed records, ambiguous identities, and scenario isolation when those paths change.
- Keep execution evidence distinct from human acceptance.
- Do not add dependencies or test infrastructure without a concrete need.
