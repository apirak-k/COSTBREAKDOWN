# Requirement Review Report

## Scope

- Branch: `codex/snapshot-import-role-selector`
- Commit reviewed: `c633cf0`
- Review mode: read-only source review
- Source code was not modified
- Overall scope: the complete active web path under `src/App.tsx`
- Findings are grouped by page and shared flow; the Excel section was reviewed first
- Browser visual verification is `[Unverified]` because the available browser provider was unavailable in this environment

## Requirement 1 — One Excel format, choose the target role during import

Expected behavior from the project requirements:

- Use one canonical snapshot workbook structure for both sides.
- Let the web UI choose whether the imported workbook becomes `Reference` or `Current`.
- The workbook downloaded from the web should be compatible with the same canonical import contract.

### Mismatches

1. **[High] The active Download Template still generates the legacy paired workbook.**

   `ExcelImportPanel` calls `generateDynamicExcelTemplate`, but that generator creates the old workbook with `1_MASTER_RATES`, `2_BOM_BREAKDOWN`, `3_ROUTING_BREAKDOWN`, and `4_SUMMARY_&_COMPARISON`. Its input columns still contain paired `Base` / `Active` values such as `Base Price P0`, `Active Price P1`, `Base Loss L0`, and `Active Loss L1`.

   Evidence:

   - `src/features/master-data/components/ExcelImportPanel.tsx:33-43`
   - `src/services/excel/dynamic-excel-generator.ts:49-51, 109, 122, 207, 220, 308, 318`

2. **[High] Download and Import do not use the same workbook contract.**

   The canonical parser recognizes `META`, `PRODUCT`, `WORK_CENTER`, `BOM`, and `ROUTING`, while the downloaded template does not produce those sheets. A downloaded template therefore goes through the legacy fallback adapter instead of the canonical snapshot path.

   Evidence:

   - `src/services/excel/snapshot-parser.ts:19, 295, 309-335`
   - `src/services/excel/snapshot-parser.ts:348-390`

3. **[Medium] The role selector exists, but it currently selects a role for a legacy paired workbook as well as for a canonical snapshot workbook.**

   The UI passes `Reference` / `Current` into the parser, but the parser can still return `format: 'legacy'` and emit a warning that the file was imported through the legacy paired adapter. This means the visible role selection does not guarantee that the user is working with the intended single-snapshot format.

   Evidence:

   - `src/features/master-data/components/ExcelImportPanel.tsx:31, 88-112`
   - `src/shared/ui/ExcelUploadDropzone.tsx:8, 36, 119`
   - `src/services/excel/snapshot-parser.ts:348-390`

## Shared App Shell and Initial Page

4. **[High] The active web has no Workspace / snapshot context / import-first entry point.**

   The application router exposes only four tabs, and the navigation exposes only `Master Data`, `Cost Breakdown`, `Candidate Selection`, and `RCA & Simulation`. There is no visible workspace containing Reference/Current snapshots, Import, Clone, and Export actions. The default active tab is `master`, so the first route is the legacy data editor rather than the snapshot workflow.

   Evidence:

   - `src/App.tsx:12-19`
   - `src/shared/layout/Navbar.tsx:29-34`
   - `src/state/store.tsx:215-216`
   - `COSTBREAKDOWN_REDESIGN_REVIEW.md:437-457`

5. **[Medium] The first page is not deterministic because the last tab is restored from session storage.**

   The stored `costbreakdown_active_tab` value overrides the `master` fallback. A user can reopen the web on Cost Breakdown, Candidate Selection, or RCA instead of the intended starting workspace, which makes the first-screen behavior dependent on the previous browser session.

   Evidence:

   - `src/state/store.tsx:215-230`
   - `src/services/storage/session-storage.ts:5-26`

6. **[Medium] The shared status bar still presents the old Base/Active model and an unqualified parity claim.**

   The footer displays `Base`, `Active`, `Net Gap`, and `Excel v2 Parity: 100%` on every page, even though the active import/template path and the snapshot comparison path use different workbook/data contracts.

   Evidence:

   - `src/shared/layout/AppLayout.tsx:40-52`

7. **[Medium] Product choices in the navigation dropdown are clickable `div` elements without keyboard semantics.**

   Product switching is attached to a non-interactive `div`; the duplicate and delete controls are icon-only buttons relying on `title`. This leaves the shared navigation flow inconsistent with the required keyboard-accessible UI behavior.

   Evidence:

   - `src/shared/layout/Navbar.tsx:95-100`
   - `src/shared/layout/Navbar.tsx:123-134`

## Master Data Page

8. **[High] Master Data is still a paired Base/Active editor rather than an independent Reference/Current snapshot editor.**

   The page renders one product session with paired fields and exposes Base/Active columns for BOM and Routing. It does not show which snapshot is being edited or provide separate Reference/Current snapshot context.

   Evidence:

   - `src/features/master-data/MasterDataPage.tsx:68-125`
   - `src/features/master-data/components/BOMTable.tsx:120-123, 199-249`
   - `src/features/master-data/components/RoutingTable.tsx:215-221, 315-365`

9. **[High] Archived data is labelled read-only but still exposes Edit Mode and update handlers.**

   The archived state shows a read-only message, but the same component still renders the View/Edit mode switch and passes update handlers to the tables. The store update functions patch the active session without checking whether the dataset is archived or active.

   Evidence:

   - `src/features/master-data/components/ProductMasterCard.tsx:59-80, 112-145`
   - `src/state/store.tsx:246-249, 448-486`

10. **[High] Master Data still supports in-place baseline mutation through `Copy Base → Active` and `Promote Active to Baseline`.**

    These controls copy values between paired fields inside the same session and the store overwrites the Base fields with Active values. This is not an independent snapshot transition and conflicts with the required Reference/Current lifecycle.

    Evidence:

    - `src/features/master-data/components/BOMTable.tsx:31-36, 80-86`
    - `src/features/master-data/components/RoutingTable.tsx:64-69, 118-126`
    - `src/features/master-data/components/ExcelImportPanel.tsx:116-148`
    - `src/state/store.tsx:489-502`

11. **[Medium] The Master Data inputs do not show per-field confidence, and the calculated confidence roll-up is not connected to the UI.**

    Source Reference fields are editable, but the Product, Work Center, BOM, and Routing inputs do not display `Verified`, `Estimated`, or `Missing` beside the fields. The confidence summary utility exists but has no active UI consumer.

    Evidence:

    - `PROJECT_SPECIFIC.md:68-72`
    - `src/core/utils/confidence.ts:41-87`
    - `src/features/master-data/components/ProductMasterCard.tsx:152-219`
    - `src/features/master-data/components/BOMTable.tsx:144-276`

## Cost Breakdown Page

12. **[High] The page mixes two calculation sources for the same comparison.**

    The Executive KPI cards and Variance Tree consume the legacy paired `costBreakdown` (`Base` / `Active`), while the Snapshot Comparison card consumes `snapshotComparison` calculated from independent snapshots. The detailed tables also recalculate from projected legacy `BOMItem` and `RoutingStep` rows. These are separate calculation paths on one screen and can disagree when the independent snapshots differ structurally.

    Evidence:

    - `src/features/cost-breakdown/CostBreakdownPage.tsx:21, 47-61, 132-150`
    - `src/features/cost-breakdown/components/ExecutiveKPICards.tsx:10-48`
    - `src/features/cost-breakdown/components/VarianceTreeCard.tsx:8-44`
    - `src/features/cost-breakdown/components/BOMDetailedTable.tsx:36-38`
    - `src/features/cost-breakdown/components/RoutingDetailedTable.tsx:44-46`

13. **[High] Cost Breakdown exports only a comparison report, not a Reference or Current snapshot that can be re-imported.**

    The only export action is `Export Comparison (.xlsx)`. Its workbook uses `Summary`, `BOM Comparison`, `Routing Comparison`, and `Work Center Comparison` sheets, so it is an analysis report rather than the canonical `META` / `PRODUCT` / `WORK_CENTER` / `BOM` / `ROUTING` snapshot contract.

    Evidence:

    - `src/features/cost-breakdown/CostBreakdownPage.tsx:27-36, 81-87`
    - `src/services/excel/comparison-export.ts:620-809`
    - `COSTBREAKDOWN_REDESIGN_REVIEW.md:420-428`

14. **[Medium] The comparison view still uses Base/Active/P0/P1 terminology in the detailed and variance sections.**

    The page includes the new `Reference vs Current Snapshot` card, but the same page still labels detailed fields and the variance tree as `Base`, `Active`, `P0`, and `P1`. The user-facing model is therefore inconsistent within one screen.

    Evidence:

    - `src/features/cost-breakdown/components/BOMDetailedTable.tsx:59-62`
    - `src/features/cost-breakdown/components/RoutingDetailedTable.tsx:66-69`
    - `src/features/cost-breakdown/components/VarianceTreeCard.tsx:15-34`

15. **[Medium] Comparison findings do not carry per-finding cost effects.**

    `ComparisonFinding` has an optional `costGap`, but the comparison engine creates findings without assigning a row-level cost gap. The page can show match/field status, but it cannot consistently show the cost effect for each Added, Removed, or Modified finding from the independent comparison result.

    Evidence:

    - `src/core/types/snapshot.types.ts:55-84`
    - `src/core/calculations/snapshot-comparison.ts:55-113, 155-177`

## Candidate Selection Page

16. **[High] Candidate Selection is still generated from the legacy paired model instead of comparison findings.**

    The store calculates `topDrivers` from projected `BOMItem`, `RoutingStep`, and `WorkCenterRate` data. It does not consume `snapshotComparison.bomFindings`, `routingFindings`, or `workCenterFindings`.

    Evidence:

    - `src/state/store.tsx:244-258`
    - `src/core/calculations/top-drivers.ts:1-18`

17. **[High] Candidate Selection drops all but the top ten positive numeric drivers.**

    The engine filters out non-positive gaps and returns `positiveDrivers.slice(0, 10)`. Added, Removed, structural, negative, and lower-ranked findings are not available for human selection even though the target workflow requires all comparison findings to remain visible.

    Evidence:

    - `src/core/calculations/top-drivers.ts:169-178`
    - `COSTBREAKDOWN_REDESIGN_REVIEW.md:556-564`

18. **[Medium] Confidence is calculated for drivers but is not displayed in Candidate Selection.**

    `calculateTopDrivers` assigns a confidence value, but the table has no Confidence column and `DriverRow` renders no confidence badge. A candidate derived from Estimated or Missing inputs therefore looks equivalent to a verified candidate.

    Evidence:

    - `src/core/calculations/top-drivers.ts:75, 92, 147, 164`
    - `src/features/candidate-selection/components/DriversTable.tsx:20-30`
    - `src/features/candidate-selection/components/DriverRow.tsx:1-139`
    - `PROJECT_SPECIFIC.md:71-72`

19. **[Medium] Candidate Selection has no explicit finding-selection state.**

    The page provides a Controllable checkbox and Action input, but no Selected/Pending/Deferred/Rejected decision state. The only persisted human input is attached to the legacy driver row.

    Evidence:

    - `src/features/candidate-selection/components/DriverRow.tsx:93-139`
    - `src/core/types/cost.types.ts:43-65`

20. **[Low] The empty state still instructs users to enter Base vs Active data.**

    The page copy refers to the old model instead of Reference vs Current snapshots.

    Evidence:

    - `src/features/candidate-selection/CandidateSelectionPage.tsx:14-20`

## RCA, What-If, and Trial Page

21. **[High] RCA automatically starts with a default driver instead of requiring an explicit selected finding.**

    The page picks the first controllable driver, or the first driver overall, during initialization and immediately renders the problem statement and simulation for it. There is no gate proving that the human selected a finding from Candidate Selection.

    Evidence:

    - `src/features/rca-simulation/RCASimulationPage.tsx:29-50`
    - `src/features/rca-simulation/RCASimulationPage.tsx:140-150`
    - `COSTBREAKDOWN_REDESIGN_REVIEW.md:445-457`

22. **[Critical] Applying a What-If target directly mutates the Active master data.**

    `Apply Target` calls `updateBOMItem` or `updateRoutingStep` with `activePrice`, `activeLoss`, `activeCap`, or `activeYield`. Those store actions patch the active session. The simulation therefore has a direct path to mutate official Current/Active data instead of remaining a derived scenario.

    Evidence:

    - `src/features/rca-simulation/RCASimulationPage.tsx:100-119`
    - `src/state/store.tsx:246-249, 448-486`
    - `COSTBREAKDOWN_REDESIGN_CONCEPT_FOR_CODEX.md:730-752`

23. **[High] Trial `Save Record` does not persist a Trial record.**

    The submit handler only toggles local `isSaved` state for three seconds. It does not call the store, create a `TrialValidationRecord`, or write to session storage.

    Evidence:

    - `src/features/rca-simulation/components/TrialValidationCard.tsx:24-38, 190-219`
    - `src/core/types/cost.types.ts:126-136`
    - `COSTBREAKDOWN_REDESIGN_REVIEW.md:165-175`

24. **[High] Trial can be promoted directly to the legacy baseline.**

    `Promote Trial to Baseline` calls the same `promoteActiveToBaseline` action that overwrites Base fields with Active fields. There is no separate Trial review, Draft creation, or explicit activation step in this path.

    Evidence:

    - `src/features/rca-simulation/RCASimulationPage.tsx:171-175`
    - `src/features/rca-simulation/components/TrialValidationCard.tsx:212-219`
    - `src/state/store.tsx:489-502`

25. **[Medium] RCA and Trial continue to expose the old Baseline/Active vocabulary instead of the snapshot lifecycle.**

    The page and problem statement use `Baseline`, `Active`, and paired Base/Active parameter values, even though the target workflow separates Reference, Current, derived scenarios, and Trial Actual.

    Evidence:

    - `src/features/rca-simulation/RCASimulationPage.tsx:129-166`
    - `src/features/rca-simulation/components/ProblemStatementCard.tsx:48-62`
    - `src/features/rca-simulation/components/TrialValidationCard.tsx:46-105`

## Cross-Page Data and Import Behavior

26. **[High] The snapshot pair is not the canonical source for all active consumers.**

    The store simultaneously derives legacy `costBreakdown` and `topDrivers` from projected paired session rows, while `snapshotComparison` is calculated independently from the snapshot pair. This leaves multiple sources of truth feeding different pages.

    Evidence:

    - `src/state/store.tsx:244-258`
    - `src/core/migrations/snapshot-to-session.ts:111-145`

27. **[High] The legacy import adapter silently manufactures values when fields are missing.**

    The legacy parser converts invalid numbers to zero, falls back from missing Active values to Base values, and replaces zero routing yield with `1.0` or the Base yield. This can turn missing source data into plausible-looking calculations instead of preserving a visible Missing/Need Review state.

    Evidence:

    - `src/services/excel/excel-parser.ts:41-44`
    - `src/services/excel/excel-parser.ts:161-163`
    - `src/services/excel/excel-parser.ts:222-234`

28. **[Medium] The repository contains parallel legacy and active UI/data paths.**

    The active app imports from `src/features`, `src/services`, and `src/state`, while older page/component/lib implementations remain under `src/pages`, `src/components`, and `src/lib`. The duplicate paths contain different Excel and paired-model assumptions, so the repository does not have one unambiguous implementation surface for the web requirements.

    Evidence:

    - `src/App.tsx:1-20`
    - `COSTBREAKDOWN_REDESIGN_CONCEPT_FOR_CODEX.md:956-980`

## Concept Notes for Follow-up Review

These are concept decisions and deferred scope notes, not implementation fixes.

### Current focus: Master Data

- The global Product selection is the active context for Master Data.
- Each Excel import creates or updates one separate Dataset role: `Reference` or `Current`.
- Import must read the Product Code immediately. If it does not match the selected Product Code, the import is rejected with a clear mismatch message and must not mutate the existing Dataset.
- Manual entry, post-import editing, and cloning `Reference` into a separate editable `Current` Dataset remain valid input paths.
- The input model should support variable row counts, optional tables, and custom fields without reverting to paired `Base` / `Active` columns.
- Product, Work Center, BOM, and Routing data remain editable, while their identities and relationships are validated with warnings instead of silent fallbacks.

### Deferred outside Master Data

- Cost Breakdown will later compare only the selected Product across `Reference` and `Current`, after Product identity has been validated during import.
- The comparison view will later preserve all source data and provide a changed-only view, including indirect effects when Routing depends on Work Center data.
- Candidate Selection and RCA/Trial behavior remain deferred to their own page reviews.
- Export behavior is explicitly deferred for now.

## Verification Note

- `npm run build` passed on the reviewed branch before this report-only pass.
- Browser-level visual and interaction verification remains `[Unverified]` because the local browser provider was unavailable and the bundled Playwright helper requires Python 3 while this environment exposes Python 2.7.
