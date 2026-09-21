# Engineering Quality Constraints & Contracts — Cost Breakdown

> **Document status:** Draft implementation contract  
> **Applies to:** Snapshot redesign and all code added after the approved `ARCHITECTURE.md`  
> **Principle:** Extend the current system safely. Do not lower the existing Excel, data-safety, or traceability requirements to make a phase pass.

## 1. Non-Negotiable Quality Gates

| Dimension | Required standard | Verification | Enforcement |
| :--- | :--- | :--- | :--- |
| **Calculation parity** | Web and verified Excel produce the same result for the same inputs | `npm run excel` where the workbook is in scope, plus representative comparisons | Block phase completion |
| **Build integrity** | TypeScript/Vite build exits successfully | `npm run build` | Block phase completion |
| **Snapshot isolation** | Changing a Draft/Trial snapshot never mutates its Reference, Current, or Active source | Pure migration/calculation checks and UI acceptance | Block phase completion |
| **Lifecycle safety** | Only Draft/Trial is editable; activating a Draft archives the prior Active version | Store/lifecycle checks | Block phase completion |
| **Input provenance** | Important inputs carry Verified, Estimated, or Missing status and source/basis where available | Import and model checks | Block silent data loss; warnings may remain non-blocking |
| **Missing-data behavior** | Missing/Estimated data remains navigable and visibly labeled; no hidden numeric fallback | Boundary checks for empty, zero, invalid, and missing values | Block misleading results |
| **Matching safety** | Duplicate or ambiguous BOM/Routing identities produce visible review findings | Matching checks | Block silent merges |
| **Excel compatibility** | Existing supported paired workbooks remain importable through the legacy adapter | Representative workbook import checks | Block regression |
| **UI language** | System labels and generated summaries remain English | Manual UI review | Block release of affected UI |
| **Confidentiality** | No raw factory data, credentials, or proprietary source workbook is staged | `git status` and staged-file review | Block commit/push |

### Current tooling limitation

The repository currently exposes `dev`, `build`, `preview`, and `excel` scripts only. There is no dedicated `test`, `lint`, or `typecheck` script yet. Do not claim those checks passed. Add a test command only when the first logic slice needs it and the command can run against the actual implementation without duplicating business formulas.

## 2. Hard Anti-Patterns in This Codebase

- Do not replace the current application with a parallel rewrite.
- Do not remove the legacy Excel import path until the new adapter has passed parity checks.
- Do not store Reference and Current values back in one new paired row as the canonical model.
- Do not use array position, row order, or Work Center alone as Routing identity.
- Do not silently apply hard-coded Work Center rates, yields, capacities, or prices.
- Do not mutate Active data to simulate a Trial or promote a Trial by overwriting historical values.
- Do not invent monetary attribution for interacting variables.
- Do not update both the active `src/core` path and the legacy-looking `src/lib` path without first declaring which path is canonical for the change.
- Do not add a dependency when existing TypeScript, browser APIs, or installed packages are sufficient.
- Do not use real factory data to create tests, fixtures, screenshots, or committed examples.
- Do not add `@ts-ignore`, `eslint-disable`, skipped tests, or broad type assertions to suppress a failure.
- Do not delete or rewrite unrelated comments, documentation, or user changes.

## 3. Required Data and Calculation Contracts

1. A `CostSnapshot` is independently calculable and independently traceable.
2. `DatasetStatus` (`draft`, `active`, `archived`) is separate from comparison role (`reference`, `current`).
3. Exact total and element gaps are separated from explanatory driver attribution.
4. Work Center rate changes are reported separately from Routing runtime/yield changes to avoid double counting.
5. Confidence is metadata. It may explain or warn about a result but must not silently change the mathematical formula.
6. Estimated/Missing inputs are non-blocking according to the project rules, but the resulting status must remain visible.
7. Import must preserve source references and report rows or fields it could not match confidently.
8. Excel remains the source input. Web edits do not auto-write back to the source workbook.

## 4. Phase-Gated Verification

### Phase 1: Snapshot and migration foundation

- Target types compile.
- Legacy paired data maps to Reference and Current snapshots without losing IDs, source references, or values.
- Reference and Current objects are independent after conversion.
- Confidence/basis is explicit for values produced by legacy defaulting.
- A small runnable self-check covers a normal row, a missing value, and a changed Base/Active value.
- `npm run build` passes.

### Phase 2: Calculation and comparison core

- Snapshot calculation matches the current verified formula for unchanged inputs.
- Added, removed, changed, reordered, duplicate, and ambiguous rows are covered.
- Missing Work Center rate behavior is explicit and visible.
- No double-counting occurs in Work Center/Routing findings.

### Phase 3: Excel compatibility

- Blank, synthetic, test, and representative supported workbooks are checked where authorized.
- Legacy paired sheets still import.
- New canonical mapping is documented before changing export behavior.
- Formula errors and silent row loss are checked.

### Phase 4: Lifecycle and UI

- Active data is read-only in the new workflow.
- Draft activation archives the previous Active version.
- Reference → Current → Difference is understandable without reading internal documentation.
- Confidence and matching warnings appear at the affected field/row and summary level.

## 5. Definition of Done for Each Change

Every implementation slice must report:

- files changed;
- behavior added or changed;
- checks executed and their results;
- unverified paths;
- remaining risks or pending decisions;
- the next smallest slice.

## 6. First Implementation Slice

The first code slice is intentionally narrow:

1. Add the canonical snapshot types defined in `ARCHITECTURE.md`.
2. Add a pure adapter from the current paired model to two independent snapshots.
3. Export the new types/adapter from the active `src/core` path.
4. Do not change the current store, calculation engine, Excel parser, or UI yet.
5. Verify with the build and one small runnable migration self-check.

The current paired model remains the application source until a later phase replaces it behind the adapter.
