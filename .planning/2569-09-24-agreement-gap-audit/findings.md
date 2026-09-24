# Findings & Decisions

## Requirements
- User direction: the four documents in `agreements/` define the new product contract; old material should be removed unless still necessary.
- Current task: compare the application with that contract and create the next implementation plan. This step does not authorize changing app behavior.

## Research Findings
- The prior cleanup preserved the four agreement files, updated concise current project context, and removed obsolete planning/specification records.
- The current working-tree diff at task start contained documentation cleanup changes; no application source changes were present in the reported diff.
- The prior implementation evidence describes the former contract and must not be treated as acceptance evidence for the new one.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Report code behavior only when source evidence supports the claim; label uncertain behavior unverified. | Avoids converting old handoff claims into current compliance claims. |
| Make the roadmap dependency-ordered and include observable acceptance criteria. | The user needs a practical next action after the audit. |
| Preserve Trial as out of scope until its agreement defines the workflow. | Avoids inventing requirements beyond the signed-off material. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|

## Resources
- `agreements/MASTER_DATA_FLOW_SPEC.md`
- `agreements/COSTBREAKDOWN_COMPARISON_PRINCIPLES.md`
- `agreements/CANDIDATE_PRIORITIZATION_SPEC.md`
- `agreements/RCA_SIMULATION_SPEC.md`
- `HANDOFF.md`

## Codebase Map (Graphify Structural Pass)
- The app routes to Master Data, Cost Breakdown, Candidate Prioritization, and RCA & Simulation pages (`src/App.tsx`; graph nodes confirmed in `src/` graph).
- Main flow modules include `src/features/master-data/MasterDataPage.tsx`, `src/core/calculations/snapshot-comparison.ts`, `src/features/candidate-selection/CandidateSelectionPage.tsx`, `src/features/rca-simulation/RCASimulationPage.tsx`, and shared `src/state/store.tsx`.
- Snapshot/import/calculation handoffs also pass through `src/services/excel/snapshot-parser.ts`, `src/core/calculations/snapshot-cost.ts`, `src/features/candidate-selection/driver-selection.ts`, and `src/features/rca-simulation/scenario-draft.ts`.
- The structural graph contains 577 nodes and 1,643 edges across 13 communities. It is navigation evidence only; requirements and current behavior are being checked directly against source lines.
- Graphify's structural output was temporary navigation evidence and was removed after the source audit; no graph artifact is intended to remain in the project.

## Master Data Audit Summary
- Main conflict is the product-session lifecycle and seeded product workspace, while the contract starts with two empty, directly usable sides.
- Reusable behavior includes side-specific editing, copy, replacement import, browser-session storage, and template generation.
- Blocking gaps are the mandatory Product readiness/header gate and the absence of a per-side export of the latest edited Working Dataset.

## Master Data Audit — Evidence
| Agreement behavior | Status | Current code evidence | Assessment |
|--------------------|--------|----------------------|------------|
| First-use workspace starts empty | **Conflict** | `src/state/store.tsx:154-168,254-272`; `src/state/seed-data.ts:10-15,25-42,44-99` | With no saved session the app creates a populated RGOM-024 dataset and selects it. `clearAllData` empties only the active session; it does not change the first-use seed (`store.tsx:935-949`). |
| Temporary Reference/Current datasets and direct manual editing | **Partial / conflict** | `src/features/master-data/components/DatasetRoleSelector.tsx:64-98`; `src/state/store.tsx:522-545,573-604`; `src/features/master-data/MasterDataPage.tsx:43-69,140-167` | Role-specific editing, add/delete controls for Work Center, BOM, and Routing, and a Reference → Current copy exist. The workspace is still wrapped in product sessions and Draft/Active/Archived lifecycle; only Draft is editable. |
| Import replaces the chosen side, without merging; imported data remains editable | **Partial** | `src/state/store.tsx:862-916`; `src/features/master-data/components/ExcelImportPanel.tsx:66-80` | For an independent Draft pair, import replaces only the selected role and leaves the opposite role. For non-Draft/legacy sessions it creates a new Draft session. Direct follow-up editing is possible only through the Draft flow. |
| Product mismatch warns but does not block comparison/import | **Conflict** | `src/services/excel/snapshot-parser.ts:426-434`; `src/shared/ui/ExcelUploadDropzone.tsx:43-60`; `src/features/master-data/MasterDataPage.tsx:88-136` | A differing Product Code returns `success:false`, shown as an error. Comparison is also disabled until handoff readiness says it can compare. |
| No required Product-first order; no Product lifecycle as core flow | **Conflict** | `src/features/master-data/components/DatasetRoleSelector.tsx:45-52`; `src/features/master-data/components/ExcelImportPanel.tsx:43-45,63-70`; `src/features/master-data/MasterDataPage.tsx:88-136` | The page is product-led, validates imports/readiness against one Header Product, and puts a Ready gate before Comparison. The current source pass did not establish that every manual table blocks entry until Product fields are filled; the seeded/product-session workflow itself conflicts with the requested empty, product-light workspace. |
| Browser/session-only data, no permanent application storage | **Implemented at storage layer; workflow conflict remains** | `src/services/storage/session-storage.ts:12-27`; `src/state/store.tsx:282-289` | The active adapter uses browser `sessionStorage`, consistent with losing working data when the browser session ends. Product/version sessions are still modeled in that temporary store, which is separately outside the agreed flow. No account/server persistence was found in the active source pass. |
| Download template | **Implemented** | `src/features/master-data/components/ExcelImportPanel.tsx:24-55` | The template action calls the existing Excel template generator using the selected side's model. |
| Optional export of latest edited side | **Missing** | `src/features/master-data/components/ExcelImportPanel.tsx:24-80`; `src/services/excel/comparison-export.ts:375-447`; `src/services/excel/index.ts:1-5` | Repository search found a template action and whole-comparison export, but no action or generator that exports the latest Reference or Current Working Dataset independently. Comparison export is not a restoreable single-side dataset export. |
| Import/edit/compare use one working dataset shape; comparison needs no save/activate step | **Partial / conflict** | `src/features/master-data/MasterDataPage.tsx:43-69,79-86,88-136,140-167`; `src/services/excel/snapshot-parser.ts:387-475` | Imported snapshots and the selected side feed the same page state and comparison handoff, but comparison is gated on Product readiness and lifecycle-managed sessions rather than using the two visible working datasets immediately. |

## Comparison Audit Summary
- Reusable behavior includes independent snapshot calculations, `Current - Reference` totals, side-specific required-input warnings, and identity-key union handling for additions/removals.
- Contract gaps are unstable/synthetic identity fallback, non-contract statuses, no separate match-validation warnings, null rather than zero for absent-side row cost, no comparison-layer record cost effects/reconciliation, and binary rather than status-specific filtering.
- Comparison exports have per-field input differences and snapshot summary gaps, but not signed record-level cost effects for added/removed items.

## Comparison Audit — Evidence
| Agreement behavior | Status | Current code evidence | Assessment |
|--------------------|--------|----------------------|------------|
| Independent cost calculation and `Current - Reference` | **Implemented** | `src/core/calculations/snapshot-comparison.ts:216-240`; `src/core/calculations/snapshot-cost.ts:32-107` | The engine calculates each snapshot, then derives total and element gaps. Missing required values remain `null` with warnings. |
| Compare by business identity, not row position | **Partial** | `src/core/calculations/snapshot-comparison.ts:111-184`; `src/services/excel/snapshot-parser.ts:285-289,338-356` | Matching uses BOM item code, Work Center code, and Routing operation/process code or name; sequence is not used as a key. Blank keys fall back to IDs (`snapshot-comparison.ts:174-184`), which are not guaranteed to be stable business identities. Parser validation warns and skips some rows with missing keys; duplicate comparison keys become `ambiguous`, and the comparison result does not expose a separate identity-validation warning. |
| Field changes are details of CHANGED, not extra statuses | **Conflict / partial** | `src/core/calculations/snapshot-comparison.ts:79-95,190-202`; `src/core/calculations/comparison-status.ts:3-26`; `src/core/types/snapshot.types.ts:87-103` | Field differences and routing change flags exist, but sequence and Work Center changes are also emitted as separate `Reordered` and `Moved Work Center` labels rather than details under a single `Changed` status. |
| Only four comparison statuses; validation issues separate | **Conflict** | `src/core/types/snapshot.types.ts:85-110`; `src/core/calculations/comparison-status.ts:3-26`; `src/services/excel/comparison-export.ts:133-157,367-380` | The internal model has `matched/added/removed/ambiguous/unmatched`; the UI/export status vocabulary exposes Unchanged, Modified, Added, Removed, Reordered, Moved Work Center, and Need Review. The export count model also includes `review`. |
| Different row counts/structures compare; no automatic split/merge inference | **Partial** | `src/core/calculations/snapshot-comparison.ts:111-171`; `src/core/types/snapshot.types.ts:85-103` | A union of keys yields added/removed findings without relying on row order, and the code does not infer split/merge genealogy. Duplicate identities become `ambiguous`; that is stored as a match state rather than a separate validation warning. |
| Absent record contributes zero; required absent value remains a data-quality issue | **Partial / conflict** | `src/core/calculations/snapshot-bom-detail.ts:15-30`; `src/core/calculations/snapshot-routing-detail.ts:32-80`; `src/core/calculations/snapshot-cost.ts:32-107` | Missing required values correctly remain unavailable and produce calculation warnings. A wholly absent BOM or Routing side also returns `null`, however, so Added/Removed effects do not receive the required zero contribution. |
| Detailed effects reconcile to totals and are produced by the comparison layer | **Partial / conflict** | `src/core/types/snapshot.types.ts:94-124`; `src/core/calculations/snapshot-comparison.ts:111-171,216-241`; `src/features/cost-breakdown/components/BOMDetailedTable.tsx:39-79`; `src/features/cost-breakdown/components/RoutingDetailedTable.tsx:44-86` | BOM/Routing tables recalculate matched row cost gaps for display, but `compareRows` does not populate the finding's optional `costGap`, and no reconciliation result/check is returned by `CostComparison`. For added/removed rows, side values remain null; the nullable footer sum then displays no total when any visible row is null. The whole-snapshot totals and element gaps are calculated separately. |
| Full comparison view, drill-down, and status filtering | **Partial / conflict** | `src/features/cost-breakdown/CostBreakdownPage.tsx:85-105,146-186`; `src/features/cost-breakdown/components/BOMDetailedTable.tsx:76-79,112-149`; `src/features/cost-breakdown/components/RoutingDetailedTable.tsx:83-86`; `src/features/cost-breakdown/components/WorkCenterComparisonTable.tsx:48-78` | The page shows the total/element summary and BOM, Routing, and Work Center detail tables; the default All view retains unchanged rows. Its only detail filter is All/Changed Only, not the four status choices or their combinations. Row fields are displayed, but added/removed cost effects do not reconcile in the detail tables. |
| Comparison export preserves statuses and record cost effects | **Partial / conflict** | `src/services/excel/comparison-export.ts:133-157,202-245,261-306,322-361,408-447` | It exports snapshot totals/element gaps, individual input-value gaps, and status labels, but has no per-record cost-gap column; absent-side inputs/gaps are null, and status counts include a `review` group. |

## Candidate Prioritization Audit Summary
- The page is still built from the old Base/Active driver calculator. Its retained behaviors are descending gap ranking, negative/zero visibility, and a checked-by-default controllability checkbox.
- Contract gaps include comparison-derived candidates/statuses and Reference/Current cost values, factor-granular material findings, processing aggregation by Work Center, explicit `controllable = true`, and status-only filtering.
- RCA selection, Action, and the RCA form are embedded on this page even though the agreement moves that work to the next stage.

## User Steering
- Do not draft the implementation roadmap until the code-to-agreement audit is complete for all four agreements.
- Do not change app behavior during this audit-and-roadmap task.

## Candidate Prioritization Audit — Evidence
| Agreement behavior | Status | Current code evidence | Assessment |
|--------------------|--------|----------------------|------------|
| Consume Comparison findings, not old paired rows | **Conflict** | `src/state/store.tsx:314-320`; `src/core/calculations/top-drivers.ts:38-53,113-132`; `src/features/candidate-selection/CandidateSelectionPage.tsx:9-20` | Candidate page receives `topDrivers`; the calculation reads legacy BOM/Routing `base*` and `active*` values rather than `snapshotComparison` findings. |
| Material changes at factor granularity | **Partial / conflict** | `src/core/calculations/top-drivers.ts:38-110` | It derives price/loss impact from legacy fields; when both change it builds one price-focused candidate, usage/consumption is not a candidate factor, and Added/Removed snapshot material findings are not consumed. |
| Processing cost aggregated and compared by Work Center | **Conflict** | `src/core/calculations/top-drivers.ts:113-190` | Each Routing row becomes a candidate (`sourceId: rt.id`, `driverName: rt.description`); no aggregation of Reference/Current operation costs by Work Center appears here. |
| Candidate statuses and Reference / Current / Gap fields | **Missing / partial** | `src/core/types/cost.types.ts:62-97`; `src/core/calculations/top-drivers.ts:89-110,170-190`; `src/features/candidate-selection/components/DriversTable.tsx:30-36`; `DriverRow.tsx:71-85` | No structural `CHANGED/ADDED/REMOVED` status or paired candidate costs exist. The UI shows Base/Active parameter values (such as price or capacity) plus a calculated gap, not the candidate's Reference/Current cost values. Legacy calculation adds valid paired BOM/Routing rows even when their fields did not change, so a zero gap is not proof of a changed candidate. |
| Show zero and negative gaps, sorted Gap descending by default | **Partial / implemented in legacy model** | `src/core/calculations/top-drivers.ts:38-53,113-132,194-210`; `src/features/candidate-selection/CandidateSelectionPage.tsx:21-25` | Legacy ranking retains negative and zero cost gaps and defaults to descending `costGap`. But it also creates rows for unchanged valid source records, and its list is not derived from comparison findings. |
| Controllable checked by default; user can uncheck without hiding candidate | **Partial** | `src/features/candidate-selection/components/DriverRow.tsx:25-29,110-127`; `src/core/calculations/top-drivers.ts:80-85,104-107,161-188`; `src/features/candidate-selection/ranking-view.ts:19-24` | The visible checkbox defaults checked unless explicitly marked Uncontrollable, and no controllability filter removes the row. New candidate data stores blank controllability rather than the required explicit `true`. |
| Only status filtering | **Conflict** | `src/features/candidate-selection/ranking-view.ts:3-23`; `src/features/candidate-selection/CandidateSelectionPage.tsx:83-109` | No candidate-status filter exists; current filters are Category and Impact. |
| Candidate page does not select an RCA target or collect action/RCA | **Conflict** | `src/features/candidate-selection/CandidateSelectionPage.tsx:145-179`; `src/features/candidate-selection/components/DriverRow.tsx:98-157` | Candidate page has Select for RCA, opens an RCA detail panel, and includes an Action input, all expressly outside the agreed Candidate page responsibility. |

## RCA & Simulation Audit Summary
- Reusable behavior includes optional descriptive RCA metadata that does not feed cost formulas, three local non-mutating scenarios, confirmed price/loss/capacity/yield controls, and algebraically consistent improvement-economics formulas.
- Contract gaps are candidate selection on the RCA page, editable notes on the RCA page, missing consumption overrides, use of a driver-level prediction rather than the full Standard Cost engine, and mixing improvement expenses into `Predicted Total`.
- The existing Trial card is outside the new agreed page boundary. Its actual-cost collection and baseline promotion remain unspecified and should not be mistaken for acceptance criteria.
- The active RCA path contains no model for the deferred Sale/COGS/Gross Profit/SG&A/OP/Margin metrics.

## RCA & Simulation Audit — Evidence
| Agreement behavior | Status | Current code evidence | Assessment |
|--------------------|--------|----------------------|------------|
| Human selects a candidate from the whole Candidate pool on RCA page | **Partial / conflict** | `src/features/rca-simulation/RCASimulationPage.tsx:21-47,132-147`; `src/features/candidate-selection/CandidateSelectionPage.tsx:145-179` | RCA page can switch among the subset selected on Candidate Prioritization. It initializes to the first selected key and asks the user to return to Candidate Selection if none are selected, so it does not provide the full pool for human selection on the RCA page. |
| Root Cause and Action are optional descriptive notes, not formula inputs | **Partial** | `src/features/candidate-selection/components/RcaDetailPanel.tsx:53-103`; `src/state/store.tsx:825-834`; `src/features/rca-simulation/components/ProblemStatementCard.tsx:51-72` | The text fields are optional and saved as RCA metadata. They are placed on the prohibited Candidate page; the RCA page has no editable fields and only displays Action, not Root Cause. The cost simulator does not receive these fields. |
| Three scenarios A/B/C start from Current and do not mutate Current | **Partial / implemented in existing model** | `src/features/rca-simulation/scenario-draft.ts:3-23`; `src/features/rca-simulation/RCASimulationPage.tsx:58-87,128-130` | Three independent local drafts and non-mutating simulation are present. Calculations use the old Active values as the current baseline, and drafts hold target overrides rather than a copied snapshot object. |
| Simulate verified measurable inputs | **Partial** | `src/core/calculations/whatif-simulator.ts:15-20,82-130`; `src/features/rca-simulation/components/ScenarioCard.tsx:101-130` | Supports price, loss, capacity, yield, and optional routing Manning; does not expose material usage/consumption overrides. |
| No structural simulation | **Within boundary** | `src/core/calculations/whatif-simulator.ts:80-131`; `src/features/rca-simulation/components/ScenarioCard.tsx:101-130` | Scenario controls change measurable values for an existing BOM or Routing row; this active simulator does not add/remove BOM or Routing records or model split/merge structure. |
| Reuse Standard Cost engine; keep economics separate from Standard Cost | **Conflict** | `src/core/calculations/cost-engine.ts:12-70`; `src/core/calculations/whatif-simulator.ts:80-138`; `src/core/calculations/scenario-variables.ts:73-95` | Main engine calculates Material + Labor + Burden. Simulation computes one driver's cost separately and uses `totalActiveCost - netSaving` for Predicted Total, so fixed and variable improvement costs change the displayed predicted cost. The agreement keeps scenario Standard Cost and improvement economics separate. |
| Display Current Standard Cost, Scenario Standard Cost, and Gross Saving per piece | **Partial** | `src/features/rca-simulation/RCASimulationPage.tsx:163-170`; `src/features/rca-simulation/components/ScenarioCard.tsx:178-228` | Current cost is shown once outside the scenarios; each scenario shows Predicted Cost and Gross Saving, but it does not show the full scenario cost as a separate core-engine result. |
| Improvement economics formulas | **Implemented algebraically** | `src/core/calculations/whatif-simulator.ts:133-138`; `src/core/calculations/scenario-variables.ts:57-102` | Fixed cost equivalent, net saving per piece, and total net benefit correspond to the agreement's formulas, subject to the predicted-cost separation gap above. |
| Human chooses a scenario for Trial; no automatic scenario selection | **Partial / conflict** | `src/features/rca-simulation/components/TrialValidationCard.tsx:17-28,54-79`; `src/features/rca-simulation/RCASimulationPage.tsx:173-179` | Trial validation initializes to the first profitable scenario or Scenario A, although the user can choose from the dropdown. The agreed handoff leaves the choice to human review. |
| Trial is separate and remains undefined until specified | **Out of contract / conflict** | `src/features/rca-simulation/RCASimulationPage.tsx:173-179`; `src/features/rca-simulation/components/TrialValidationCard.tsx:41-79,135-220`; `src/state/store.tsx:766-783` | Current code embeds measured-cost input, notes, save feedback, and Promote Trial to Baseline in the RCA page. The agreement defines only a separate Trial handoff and no validation or baseline-promotion behavior, so these details are existing behavior, not agreed acceptance criteria. |
| Additional financial parameters remain future scope | **Within boundary** | `agreements/RCA_SIMULATION_SPEC.md:426-449`; active page scope `src/features/rca-simulation/RCASimulationPage.tsx:116-179` | No Sale/COGS/Gross Profit/SG&A/OP/Margin model was found in the active RCA & Simulation path, consistent with the agreement's future-only boundary. |

## Coverage Boundary
- Reviewed the active route path and implementation evidence across all four agreements, including their final baseline sections and stated non-goals.
- Findings are a static source audit; no application code was changed and no tests/build were run.
- `Trial` and future financial analysis remain agreement boundaries. Their current implementation details are documented as existing behavior, not as committed scope.
