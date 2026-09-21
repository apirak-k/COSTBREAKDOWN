# Findings & Decisions

## Requirements

- User explicitly requested a written plan, execution of that plan, staged commits, and use of useful skills.
- The immediate product objective is the next slice recorded in the current handoff: allow the user to select Reference or Current before Excel import.
- Preserve the existing legacy import path and current UI behavior outside the role-selection boundary.
- Do not push to a remote without explicit authorization.

## Live Repository Evidence

- Repository: E:/COSTBREAKDOWN
- Starting branch: main
- Starting HEAD: c6ecbe1 map
- Latest implementation checkpoint: 85dba08 feat: wire snapshot imports into session state
- Starting worktree: clean; local main and its origin/main tracking ref point at the same commit. No fetch was performed.
- The latest map commit is documentation-only; the snapshot implementation is already present in its parent history.

## Current Implementation

- ExcelUploadDropzone already accepts importRole?: ComparisonRole, defaults to current, passes it to parseSnapshotExcelInputFile, and displays the selected role.
- parseSnapshotExcelInputFile(file, role) already supports canonical and legacy workbook paths.
- importSnapshotFromExcel(result) already places the selected snapshot into the correct side of the existing pair and preserves independent snapshot mode.
- ExcelImportPanel currently renders <ExcelUploadDropzone /> without a role selector, so the UI always imports as Current.
- MasterDataPage is the active path that renders ExcelImportPanel.

## Focused RED Evidence

- Fresh browser smoke against the local Vite app rendered the active Master Data panel with `Importing as Current` and no visible Reference/Current controls.
- The existing dropzone copy proves the current default path is active, while the absence of a selector proves the UI cannot choose the Reference side yet.
- The first planning checkpoint is committed as `c38bf8b` on branch `codex/snapshot-import-role-selector`.

## Baseline Verification Evidence

- npx tsc -b --pretty false: exit 0.
- npm run build: exit 0; Vite transformed 1,667 modules. Existing large-bundle warning remains.
- npm run excel: exit 0; generated workbook audit reported 100% formula shielding with zero errors. Generated root workbooks were removed after verification.
- node scripts/test_comprehensive_audit.js: exit 0; 31/31 checks passed.
- git status --short --branch: clean after removing verification artifacts.

## Verification Limitations

- The repository exposes dev, build, preview, and excel scripts only.
- The existing focused verification files are TypeScript files but have no configured TypeScript runner. Plain Node fails before assertions with ERR_UNKNOWN_FILE_EXTENSION; Node type stripping then fails on extensionless source imports.
- There is no existing browser automation command in package.json. Runtime browser verification must use an available local browser/Playwright path without adding dependencies speculatively.
- The webapp-testing Playwright runner cannot start in this environment: the available python.exe is a Windows Store stub and no py launcher is installed. No test dependency will be added solely to work around this; browser smoke will use the available real-browser automation surface instead.
- Full workbook upload through a browser remains unverified until the runtime flow is exercised.

## Technical Risks Kept Visible

- The legacy paired cost engine still has a hard-coded missing Work Center rate fallback in src/core/calculations/cost-engine.ts; it is outside this slice.
- Snapshot calculation already labels missing Work Center rates and missing numeric inputs in src/core/calculations/snapshot-cost.ts.
- Architecture decisions still pending: UI naming, stable Routing identity, MHr semantics, missing-rate display policy, and canonical workbook layout.

## Acceptance Notes

- AI verification is evidence about execution, not human acceptance.
- The role selector slice should be independently reviewable and revertible.
