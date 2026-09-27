# Task Plan: COSTBREAKDOWN XLSX Security Remediation

## Goal
Resolve High-severity findings in SheetJS and Vite while preserving the agreed workbook import behavior and reaching zero High/Critical audit findings.

## Next Step
Implementation and security verification are complete and committed locally. The user's page-by-page review is the next step; human acceptance remains pending.

## Current Phase
Complete — local checkpoint committed

## Phases

### Phase 1: Requirements and dependency reachability
- [x] Re-read the HAWS vulnerability and lockfile gates.
- [x] Trace production parser imports, file extensions, and legacy path callers.
- [x] Record the accepted import behavior and the security threat boundary in findings.md.
- **Status:** complete

### Phase 2: Source-backed dependency selection
- [x] Compare existing ExcelJS support and the official SheetJS distribution using primary package/documentation sources.
- [x] Select the smallest patched releases that preserve the required workbook formats and supported toolchain.
- **Status:** complete

### Phase 3: Incremental dependency remediation
- [x] Update SheetJS to official 0.20.3 and Vite to 6.4.3; retain the current parser API and implementation.
- [x] Add or run focused synthetic assertions for canonical .xlsx and advertised .xls input.
- **Status:** complete

### Phase 4: Verification
- [x] Verify canonical .xlsx and supported .xls inputs, including errors and mismatch warnings.
- [x] Run focused checks, npm run build, npm audit --audit-level=high, and npm audit signatures if the selected registry supports it.
- [x] Confirm no user-facing import behavior or agreement boundary changed.
- **Status:** complete

### Phase 5: Handoff and local checkpoint
- [x] Record any format limits and all verification evidence in HANDOFF.md/tasks/todo.md.
- [x] Review diff and commit a focused local checkpoint; do not push.
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use synthetic workbooks only for parser migration verification. | Avoid loading the operational RGOM workbook while preserving realistic parser coverage. |
| Do not run npm audit fix --force. | HAWS forbids forced dependency remediation without preview; previous output showed major breaking changes and no xlsx fix. |
| Keep SheetJS and install version 0.20.3 from its official CDN tarball. | SheetJS documents that the npm registry copy is stale at 0.18.5, its CDN is authoritative, and 0.20.3 preserves XLS/XLSX format support; this avoids a parser rewrite. |
| Upgrade Vite to 6.4.3 while retaining the existing React plugin. | The reviewed Vite advisory lists 6.4.3 as patched; the installed React plugin declares compatibility with Vite 6. |
| Preserve the current `.xls` and `.xlsx` upload contract and parser API. | The shared upload control accepts both formats, and the official SheetJS format table lists read support for both. |
| Keep the parser implementation unchanged; correct stale verifier expectations to the current agreement. | Product mismatch is a non-blocking warning, and blank template rows are intentionally ignored. |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| PWF resolver reported PWF_PLAN_AMBIGUOUS_V1 because two named plans existed and .active_plan contained tasks/plan.md rather than a valid plan id. | Created and pinned this dedicated security-remediation plan with the PWF initializer; resolver now selects it explicitly. |
| The focused import verifier expected Product mismatch to fail and blank template rows to be materialized. | Corrected only the verifier assertions to match the approved non-blocking mismatch behavior and the template's “Blank rows are ignored” instruction. |
| The worktree had no local `tsx` command for the focused verifier. | Reused a cached one-off runner; no application dependency was added. |
