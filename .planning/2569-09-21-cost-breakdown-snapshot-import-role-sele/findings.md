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

## Fresh Implementation Verification

- Browser smoke: the rendered panel exposes exactly two role controls; Current is selected initially; clicking Reference changes the selected state and dropzone copy to `Importing as Reference`; Tab reaches Current and Space changes the selection back to Current.
- `npx tsc -b --pretty false`: exit 0 after the UI change.
- `npm run build`: exit 0; Vite transformed 1,667 modules. The existing large-bundle warning remains.
- `node scripts/test_comprehensive_audit.js`: exit 0; 31/31 checks passed.
- `npm run excel`: exit 0; generated workbook audit passed with 100% formula shielding and zero errors. The two generated root workbooks were removed after verification and confirmed absent.
- Browser console log inspection is [Unverified] because the available computer-use browser surface exposes accessibility state but not console logs.
- Full browser workbook upload and the complete Reference -> Current -> Compare data-flow are [Unverified] in this slice; parser/store wiring was already present and the UI role boundary was verified.

## Full Flow Extension Discovery

- The prior slice is clean on `codex/snapshot-import-role-selector`; no code diff was present before starting this extension.
- Graphify full extraction initially stopped because 17 non-code files required semantic extraction and no supported LLM key was configured. Following its documented fallback, code-only AST extraction completed with 732 nodes, 1,648 edges, and 49 communities.
- The graph query confirms the relevant surfaces: `ExcelImportPanel`, `ExcelUploadDropzone`, `snapshot-parser.ts`, `state/store.tsx`, `SnapshotComparisonCard.tsx`, `snapshot-comparison.ts`, and `comparison-export.ts`.
- The full-flow fixture and first runtime failure are not identified yet; do not claim the upload/compare/export flow is complete until those are exercised.
- Safe local fixtures are available at `public/CostModel_SYNTHETIC_MOCK_v2.xlsx` and `public/CostModel_RGOM-024_v2.xlsx`; they are repository-owned test inputs and are not user data.
- The browser computer-use surface rendered the upload panel, but clicking the hidden file input did not expose a controllable native file picker. Do not claim browser file upload from that action alone.
- `node_modules/.bin/esbuild` is available while Playwright and TS runners are absent, so existing/new TypeScript flow checks can be bundled locally without adding a dependency.
- The new bundled fixture check passes: Reference synthetic workbook parses as a legacy snapshot with 10 BOM / 15 routing / 4 WC; Current RGOM workbook parses with 16 BOM / 39 routing / 4 WC; comparison produces 26 BOM / 35 routing / 8 Work Center findings; export produces a readable four-sheet workbook of 18,542 bytes.
- No production change was needed for parser, snapshot comparison, or export in this extension; the missing proof is browser-native file selection and post-upload UI state, not a demonstrated code failure.
- Browser seeded comparison smoke showed the existing `Reference vs Current Snapshot` card with non-empty costs/findings and an `Export Comparison (.xlsx)` action. This verifies the rendered comparison/export surface, but it is not proof that a newly uploaded workbook reached the page.
- The seeded browser export click produced no observable accessibility-state change or downloaded file in the available automation surface; export remains verified by the bundled workbook check and browser button availability, while native download observation is [Unverified].
- After adding the verification script: `npx tsc -b --pretty false`, `npm run build`, and `node scripts/test_comprehensive_audit.js` all passed. The existing Vite large-bundle warning remains.

## Missing-Rate Safety Extension

- The user's request to continue before final acceptance extends this plan beyond the completed snapshot-import checkpoint.
- The active application path is `src/App.tsx` → `src/state/store.tsx` → `src/core`; the parallel `src/lib` and `src/pages` implementation is not imported by the active entry point and remains outside this extension.
- Before the fix, four active core calculation surfaces fabricated conversion costs when a routing Work Center was absent from the rate map: `cost-engine.ts`, `detailed-breakdown.ts`, `top-drivers.ts`, and `whatif-simulator.ts`.
- The focused RED check reproduced the defect: an `UNKNOWN-WC` routing row received `105.29` labor and `95.00` burden rather than zero.
- The implemented policy is explicit and conservative: a missing or blank Work Center resolves to zero labor/burden, the primary breakdown collects unique missing Work Center keys, and the Cost Breakdown page displays a warning telling the user which rows need rates.
- `src/core/calculations/work-center-rate.ts` now owns the shared lookup so all active calculation surfaces use the same behavior.
- The focused check also proves known rates remain unchanged: a configured `10` labor / `20` burden rate yields the expected routing costs and no missing key.

## Fresh Missing-Rate Verification

- Bundled `scripts/verify_missing_work_center_rate.ts`: PASS. It covers primary totals, detailed routing rows, top-driver filtering, What-if simulation, missing-key reporting, and known-rate preservation.
- `npx tsc -b --pretty false`: exit 0.
- `npm run build`: exit 0; Vite transformed 1,668 modules. Existing large-bundle warning remains; output was approximately 1,635.14 kB JS / 476.44 kB gzip.
- `node scripts/test_comprehensive_audit.js`: PASS, 31/31 checks.
- Full snapshot fixture flow after the change: PASS; Reference 10 BOM / 15 routing / 4 WC, Current 16 BOM / 39 routing / 4 WC, findings 26 / 35 / 8, four-sheet export 18,542 bytes.
- `npm run excel`: PASS; generated workbook audit reported 100% formula shielding and zero errors. Generated root workbooks were removed afterward.
- Browser runtime smoke on the updated build: Cost Breakdown rendered seeded Reference `33.6936`, Current `41.9528`, Exact Cost Gap `+8.2592`, 50 matched rows, one review row, and the export action. Browser console inspection returned zero error/warn entries.
- Native workbook file selection and observable native download remain [Unverified] because the available manual acceptance path still requires the user's browser interaction.

## Final Browser Acceptance Evidence

- A fresh in-app browser tab exercised both real repository-owned workbook uploads through the actual file input path.
- Reference import succeeded with `4 Work Centers, 10 BOM Items, 15 Routing Steps` from `public/CostModel_SYNTHETIC_MOCK_v2.xlsx`.
- Current import succeeded with `4 Work Centers, 16 BOM Items, 39 Routing Steps` from `public/CostModel_RGOM-024_v2.xlsx`.
- The uploaded Comparison page rendered Reference `18.9610`, Current `41.9528`, Exact Cost Gap `+22.9918`, `69` review rows, detailed BOM `26`, Routing `35`, and Work Center `4` sections, plus the export action.
- The first imported run exposed duplicate React row-key warnings. The root cause was that reference/current legacy adapters could provide the same source ID for different merged BOM or Routing keys. `projectSnapshotPairToLegacySession` now allocates deterministic collision-safe IDs, and `scripts/verify_snapshot_projection.ts` asserts BOM and Routing projection IDs are unique.
- After the fix, the fresh uploaded flow returned no browser error or warning entries. The focused projection check, TypeScript build, production build, full-flow fixture check, comprehensive audit, missing-rate check, and Excel audit were already GREEN before the code checkpoint.
- Clicking `Export Comparison (.xlsx)` produced no user-facing export error. The available browser adapter did not expose a native download artifact and the Downloads folder remained empty, so native download observation stays [Unverified]. The bundled export check independently produced a readable four-sheet workbook of `18,543` bytes.
- AI-run browser evidence is not human acceptance; the user still needs to inspect the final Comparison page and, if required, confirm the downloaded workbook through their normal browser.
