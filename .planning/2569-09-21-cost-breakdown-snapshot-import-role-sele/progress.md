# Progress Log

## Session: 2569-09-21 - Full Flow Extension

### Current Status

- **Phase:** 9 - Delivery & Checkpoint (complete)
- **Plan ID:** 2569-09-21-cost-breakdown-snapshot-import-role-sele
- **Started:** 2569-09-21
- **Last update:** Full-flow verification, type-check, build, audit, and seeded comparison smoke are GREEN; final worktree is clean.

### Actions Taken

- Read the requested planning-with-files skill and selected implementation, testing, frontend, Git, browser, and verification guidance.
- Initialized the named plan directory under .planning/.
- Recorded the current Git checkpoint and the exact role-selector gap.
- Recorded fresh baseline build, Excel audit, and comprehensive audit evidence from the previous inspection.
- Attempted the existing webapp-testing server helper and native Python Playwright path; this machine exposes only a non-runnable Windows Store Python stub and no py launcher.
- Started the local Vite app and inspected the active Master Data panel in Chrome. The current UI shows `Importing as Current` but exposes no Reference/Current selector.
- Committed the named planning records as `c38bf8b` before the implementation edit.
- Reviewed the bounded `ExcelImportPanel.tsx` edit: local `current` default, two `aria-pressed` role controls, and `importRole` prop wiring only.
- Verified browser selection behavior with click and keyboard actions; the dropzone copy followed Reference and Current selections.
- Committed the UI atomically as `e01b2f5` and the final verification records as `d121d40`.
- Confirmed `git status --short --branch` is clean on `codex/snapshot-import-role-selector`.
- Re-resolved the selected planning directory before continuing, as required by planning-with-files.
- Attempted the full graphify pipeline; it stopped on missing semantic-extraction credentials. Switched to the documented `--code-only` fallback and built the code graph.
- Queried the graph for the workbook import-to-comparison/export path and recorded the relevant modules in `findings.md`.
- Confirmed repository-owned workbook fixtures under `public/` and `excel_models/`.
- Confirmed `esbuild` is installed locally; Playwright, tsx, and ts-node are not available.
- Attempted to open the browser's hidden file input through computer-use automation; no controllable native picker appeared, so browser upload remains a separate explicit limitation.
- Added `scripts/verify_snapshot_full_flow.ts` as a no-new-dependency verification check for fixture parsing, comparison findings, and workbook export.
- Bundled the check with local esbuild and ran it successfully against both public fixtures.
- Navigated the running app to Cost Breakdown; the seeded comparison card rendered non-empty Reference/Current totals, findings, and the Export Comparison action.
- Attempted the seeded export button; no browser download artifact was observable through the available automation surface, so native download observation remains [Unverified].
- Committed the runnable verification script as `0fe259d`.
- Committed the full-flow evidence as `a56554b`.
- Confirmed `git status --short --branch` is clean on `codex/snapshot-import-role-selector` with no remote push.

### Test Results

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| npx tsc -b --pretty false | Exit 0 | Exit 0 | PASS |
| npm run build | Exit 0 | Exit 0; 1,667 modules | PASS |
| npm run excel | No audit errors | 100% formula shielding; zero errors | PASS |
| node scripts/test_comprehensive_audit.js | All checks pass | 31/31 passed | PASS |
| Existing .ts self-checks under plain Node | Assertions execute | ERR_UNKNOWN_FILE_EXTENSION before assertions | BLOCKED |
| Python Playwright runner discovery | Existing helper starts | No usable Python runtime / py launcher | BLOCKED |
| Pre-change browser smoke | Two import-role controls are visible | Only Current copy is visible; no role controls | RED / EXPECTED |
| npx tsc -b --pretty false after UI edit | Exit 0 | Exit 0 | PASS |
| npm run build after UI edit | Exit 0 | Exit 0; 1,667 modules; existing bundle warning | PASS |
| node scripts/test_comprehensive_audit.js | 31/31 checks pass | 31/31 passed | PASS |
| npm run excel | Zero audit errors | 100% formula shielding; zero errors | PASS |
| Browser role-selector smoke | Default Current, switch Reference, keyboard return Current | Observed in accessibility tree and dropzone copy | PASS |
| Browser console logs | No new errors/warnings | Automation surface does not expose logs | UNVERIFIED |
| Graphify full extraction | Code and docs graph | Stopped because semantic extraction key was unavailable | BLOCKED / ALTERNATIVE USED |
| Graphify code-only extraction | Code graph exists | 732 nodes; 1,648 edges; 49 communities | PASS |
| Fixture discovery | Safe local workbook inputs exist | Two public `.xlsx` fixtures found | PASS |
| Browser file-picker action | Native picker is controllable | Picker did not appear through available surface | BLOCKED |
| TypeScript full-flow runner | Existing runtime available | esbuild bundler available; no TS runner | ALTERNATIVE AVAILABLE |
| Bundled full-flow fixture check | Parse both roles, compare, export readable workbook | PASS; 26 BOM / 35 routing / 8 WC findings; 18,542-byte four-sheet workbook |
| npx tsc -b --pretty false after verification script | Exit 0 | Exit 0 | PASS |
| npm run build after verification script | Exit 0 | Exit 0; 1,667 modules; existing bundle warning | PASS |
| node scripts/test_comprehensive_audit.js after verification script | 31/31 checks pass | 31/31 passed | PASS |
| Browser seeded comparison page | Non-empty comparison and export action visible | Reference/Current totals, findings, and export button visible | PASS |
| Browser native export observation | Download artifact visible | No observable download through available surface | UNVERIFIED |

### Errors

| Error | Resolution |
|-------|------------|
| TypeScript self-check runner unavailable | Carry into Phase 2; use a different bounded verification path and mark any remaining gap [Unverified]. |
| Python Playwright runner unavailable | Use the available browser automation surface for runtime smoke; do not add a dependency just for the runner. |

### Next Action

Continue Phase 11: replace hard-coded missing Work Center fallbacks in the active core calculation paths, then run the new regression check GREEN before the full verification checkpoint.

## Session: 2569-09-21 - Missing-Rate Safety Extension

### Current Status

- **Phase:** 11 - Active Core Calculation Hardening (in progress)
- **Plan ID:** 2569-09-21-cost-breakdown-snapshot-import-role-sele
- **Last update:** Active calculation consumers traced; focused missing-rate regression check is RED against the current hard-coded fallback.

### Actions Taken

- Re-opened the completed plan before accepting the user's request to continue beyond the prior checkpoint.
- Traced the active `src/core` consumers: primary cost breakdown, routing detail rows, top drivers, and what-if simulation.
- Defined the safety policy: an unknown or blank Work Center must not receive an invented rate; the conversion contribution is zero and the primary breakdown reports the missing key.
- Added `scripts/verify_missing_work_center_rate.ts` as a focused no-new-dependency regression check.
- Bundled and ran the check inside the workspace; it failed as expected because the current primary breakdown uses `105.29` / `95.00` for an unknown Work Center.
- First attempt to run a bundle under the Windows temp directory failed with `EPERM` while Node resolved `C:\Users\Boom`; switched to a workspace-local temporary bundle and captured the intended RED result.

### Test Results

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Bundled missing Work Center self-check before implementation | Fail on fabricated fallback | Failed at primary base labor: actual `1.0529`, expected `0` | RED / expected |

### Next Action

Implement the shared active-core rate resolver and wire the four calculation surfaces, then re-run the focused check.

## Session Update: Missing-Rate Safety Implementation

### Current Status

- **Phase:** 12 - Verification & Checkpoint (complete; manual human acceptance remains)
- **Last update:** Implementation, focused regression, build, full-flow, Excel audit, browser smoke, and staged commits are GREEN.

### Actions Taken

- Added `src/core/calculations/work-center-rate.ts` with one explicit rate-resolution policy for active core calculations.
- Replaced hard-coded missing-rate literals in the active primary cost, routing detail, top-driver, and What-if calculators.
- Added `missingWorkCenters` to the active `CostElementBreakdown` result and a user-facing warning on Cost Breakdown.
- Extended the focused regression check to prove both missing-rate safety and known-rate preservation.
- Ran the focused check GREEN after implementation.
- Ran `npx tsc -b --pretty false` GREEN.
- Ran `npm run build` GREEN; Vite transformed 1,668 modules and retained the existing large-bundle warning.
- Ran the full snapshot fixture parse → compare → four-sheet export check GREEN: 26 BOM / 35 routing / 8 Work Center findings, 18,542-byte workbook.
- Ran `node scripts/test_comprehensive_audit.js` GREEN at 31/31.
- Ran `npm run excel` GREEN with 100% formula shielding and zero errors, then removed the two generated root workbooks.
- Started the updated app on the isolated Vite port 4175, opened Cost Breakdown, and observed seeded Reference `33.6936`, Current `41.9528`, Exact Gap `+8.2592`, comparison rows, and export action.
- Read browser console logs through the available browser surface; no error or warning entries were returned.

### Test Results

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Missing Work Center focused check | No fabricated costs; missing key reported; known rates preserved | PASS | GREEN |
| `npx tsc -b --pretty false` | Exit 0 | Exit 0 | PASS |
| `npm run build` | Production bundle succeeds | Exit 0; 1,668 modules; existing chunk warning | PASS |
| Snapshot full-flow fixture check | Parse, compare, export readable four-sheet workbook | PASS; 18,542 bytes | PASS |
| `node scripts/test_comprehensive_audit.js` | All checks pass | 31/31 | PASS |
| `npm run excel` | Formula shielding and workbook audit pass | 100% shielding; zero errors | PASS |
| Browser Cost Breakdown smoke | Seeded comparison and export action visible | Reference `33.6936`, Current `41.9528`, gap `+8.2592`, export visible | PASS |
| Browser console | No runtime error/warn entries | Empty error/warn result | PASS |

### Checkpoint Commits

- `3afcc31 test: add missing Work Center rate regression check`
- `6ec8abb feat: make active calculations explicit about missing rates`
- Documentation checkpoint remains to be committed after this final plan update.

### Remaining

- Keep native Reference/Current workbook upload and observable native download explicitly [Unverified] until final human acceptance.
- Stop the temporary local Vite process after the runtime evidence is recorded.

## Session: 2569-09-21 - Final Browser Acceptance Run

### Current Status

- **Phase:** 13 - Final Browser Acceptance Evidence
- **Branch:** `codex/snapshot-import-role-selector`
- **Latest code checkpoint:** `f649996 fix: keep projected snapshot row ids unique`
- **Status:** Upload and comparison flow passed in the in-app browser; native downloaded-file observation remains harness-limited; human acceptance remains separate.

### Actions Taken

- Started the updated Vite app on isolated port 4176 and opened a fresh browser tab.
- Uploaded the repository-owned `public/CostModel_SYNTHETIC_MOCK_v2.xlsx` as Reference.
- Uploaded the repository-owned `public/CostModel_RGOM-024_v2.xlsx` as Current.
- Opened Cost Breakdown and verified the uploaded Reference vs Current comparison rendered with non-empty totals, findings, detailed BOM/Routing/Work Center sections, and the export action.
- Found duplicate React row-key warnings during the first imported run; traced them to colliding legacy source IDs across merged snapshot rows.
- Added deterministic collision-safe projection IDs and a focused regression check, then committed the fix separately.

### Test Results

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Reference workbook upload | Reference snapshot imported | `4 Work Centers, 10 BOM Items, 15 Routing Steps` | PASS |
| Current workbook upload | Current snapshot imported | `4 Work Centers, 16 BOM Items, 39 Routing Steps` | PASS |
| Uploaded comparison UI | Totals, gap, findings, details, and export visible | Reference `18.9610`, Current `41.9528`, gap `+22.9918`, `69` review rows, BOM `26`, Routing `35`, Work Center `4` | PASS |
| Fresh browser console | No runtime errors or warnings after the fix | Empty error/warn result | PASS |
| Export action | No user-facing export error | Export button completed without visible error | PASS |
| Native downloaded-file observation | Download artifact visible to the browser adapter | No artifact exposed; Downloads folder remained empty | UNVERIFIED / harness limitation |
| Bundled export verification | Readable four-sheet workbook | `18,543` bytes; Summary, BOM Comparison, Routing Comparison, Work Center Comparison | PASS |

### Remaining

- Human acceptance is still required for the final user-facing review.
- Native download artifact observation remains [Unverified] in this browser adapter; the export generator itself is covered by the bundled four-sheet check.
