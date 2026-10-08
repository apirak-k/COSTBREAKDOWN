# Engineering Constraints — Cost Breakdown

The behavior contract is in the canonical specs indexed by docs/REQUIREMENTS_INDEX.md. These constraints describe implementation and verification quality; they do not add product behavior.

## Calculation and data integrity

- Follow the calculation and comparison rules in `docs/specs/CROSS_CUTTING.md`; do not derive product formulas from code or old workbooks.
- Match by canonical business identity and do not use row position or guess ambiguous matches.
- Keep missing or invalid required inputs unavailable; do not silently replace them with zero or another plausible value.
- Reconcile detailed cost effects to their parent results whenever the canonical spec defines such a breakdown.
- Handle predictable missing, invalid, and divide-by-zero cases explicitly. Show a safe status instead of a misleading number.

## Scope boundaries

- Follow the current Candidate/RCA (`docs/specs/CANDIDATE.md`) and Simulation (`docs/specs/SIMULATION.md`) specs. Where they say `PENDING/TBD`, do not infer behavior from the existing pages.
- Master Data's agreed structural layout is in `docs/specs/MASTER_DATA.md`; other exact page layouts remain pending where the canonical specs say so.

## Verification

- Run npm run build for implementation changes.
- Run npm run excel and relevant formula-parity checks when calculation or workbook behavior changes.
- Check comparison boundaries, missing values, zero values, added and removed records, ambiguous identities, and scenario isolation when those paths change.
- Keep execution evidence distinct from human acceptance.
- Do not add dependencies or test infrastructure without a concrete need.
