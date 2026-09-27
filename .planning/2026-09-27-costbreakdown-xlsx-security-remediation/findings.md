# Findings & Decisions

## Requirements
- HAWS core/HAWS.md § dependency controls requires npm audit to report zero High or Critical findings before milestone completion.
- HAWS requires package-lock.json to remain committed and forbids silently deleting or regenerating it to avoid dependency errors.
- The four agreements describe importing an Excel file into Reference/Current but do not narrow the file extension.
- The current shared upload control accepts .xlsx and .xls. Preserve this UI contract unless official parser capabilities show a limitation that requires an explicit product decision.
- Current user-facing import calls parseSnapshotExcelInputFile with allowLegacy:false. The canonical parser still uses xlsx. The legacy parser path also imports xlsx and is exercised by synthetic verifier cases.
- Use synthetic workbook data only. Do not run verify_snapshot_full_flow.ts because it reads the operational CostModel_RGOM-024_v2.xlsx fixture.

## Research Findings
- Baseline `npm audit --json` reported five findings: High in xlsx 0.18.5 (prototype pollution and ReDoS), High in Vite 5.4.14 (Windows `server.fs.deny` path bypass), and three Moderate findings (esbuild through Vite and uuid through ExcelJS).
- The Vite advisory identifies 6.4.3 as the first patched release. `@vitejs/plugin-react@4.3.4` declares compatibility with Vite `^6.0.0`, and Vite 6.4.3 supports the current Node 22 runtime.
- Official SheetJS Node installation docs identify CDN tarball `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` as version 0.20.3, say the npm registry is stale at 0.18.5, and name the CDN as authoritative.
- Official SheetJS format documentation lists read support for XLSX and legacy XLS formats; the parser API remains `XLSX.read(data, { type: 'array' })`.
- Final `npm audit --audit-level=high` exits successfully with zero High/Critical findings. The full audit retains two Moderate findings through uuid/ExcelJS.
- Final `npm audit signatures` completed successfully: 238 registry packages have verified signatures and 40 have verified attestations. The official SheetJS CDN package is pinned in the lockfile with a SHA-512 integrity value but is not covered by npm registry signatures.
- Final installed versions are `xlsx@0.20.3` and `vite@6.4.3`; `package-lock.json` points xlsx to the official CDN tarball.
- `npm run build` succeeds (1,688 modules transformed); the existing large-chunk warning remains.
- The focused `verify_snapshot_import.ts` passes using synthetic data for canonical XLSX, canonical legacy binary XLS, legacy XLSX import, mismatch warning, invalid data, and blank-template behavior.
- The separate `verify_import_mismatch_export.ts` passes export/import round-trip, non-blocking product mismatch import and comparison, and replacement-side isolation.
- `npm audit fix --force` was not run. Its prior output proposed breaking major updates and did not offer an xlsx fix.
- xlsx imports exist in src/services/excel/snapshot-parser.ts and src/services/excel/excel-parser.ts. ExcelJS is already installed and serves current export paths.
- The current threat boundary is browser-side parsing of user-selected workbooks; preserve the upload contract, validation behavior, and parser entry point.
- The official SheetJS distribution and patched Vite version are selected; current parser imports and implementation should remain unchanged.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Keep SheetJS and update it to the official 0.20.3 CDN tarball. | This is the minimal compatible update: it preserves XLS/XLSX support and the existing parser API while leaving the stale npm-registry release behind. |
| Upgrade Vite to 6.4.3 and retain the current React plugin. | 6.4.3 is listed as patched, and the current plugin explicitly supports Vite 6. |
| Preserve `parseSnapshotExcelInputFile` and the `.xls`/`.xlsx` upload contract. | The canonical parser is already behind this service API and the upload UI accepts both file types. |
| Use synthetic workbooks only. | Avoid loading the operational RGOM workbook while checking the supported formats and existing warnings/errors. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| The baseline audit also found a High Vite advisory. | Updated Vite to 6.4.3, which is listed as patched; final high-level audit passes. |
| The focused verifier had stale expectations for Product mismatch and empty template rows. | Kept production behavior unchanged and corrected the verifier to match the current agreement and the template's blank-row instruction. |

## Resources
- HAWS: core/HAWS.md § dependency controls; core/WORK_INSTRUCTIONS.md § git protocols.
- Product: agreements/MASTER_DATA_FLOW_SPEC.md §5.2 and §6.
- Current source: src/shared/ui/ExcelUploadDropzone.tsx; src/services/excel/snapshot-parser.ts; src/services/excel/excel-parser.ts.
- Current task status: HANDOFF.md; tasks/todo.md Task 18 and final checkpoint.
