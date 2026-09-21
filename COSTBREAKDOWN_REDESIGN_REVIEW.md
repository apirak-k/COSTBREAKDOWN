# Cost Breakdown Redesign Review

**Status:** Analysis only — no code changes proposed or applied

**Reviewed against:**

- `COSTBREAKDOWN_REDESIGN_CONCEPT_FOR_CODEX.md`
- `COSTBREAKDOWN_SYSTEM_LOGIC_SOURCE_OF_TRUTH.md`
- Current repository at `main` / `f873540` (`checkpoint-14`)

## 1. Executive Summary

The redesign direction is sound. The current application is a transitional
paired-field model:

```text
One BOM row:    basePrice / activePrice / baseLoss / activeLoss
One Route row:  baseCap / activeCap / baseYield / activeYield
```

The proposed model is:

```text
Reference (Before) snapshot
Current (After) snapshot
        ↓
Independent calculation
        ↓
Matching and diff
        ↓
Cost explanation and reconciliation
```

This is an architectural migration, not a field rename. The repository has
useful calculation primitives, UI structure, Excel libraries, seed data, and
versioning concepts that can be reused, but the state model, calculation
interfaces, diff layer, Excel contract, candidate layer, and trial lifecycle
must change.

No implementation should start before the real Before/Current Cost Declare
schemas and matching keys are confirmed.

## 2. Current Repository Implementation

The active application path is:

```text
src/main.tsx
  → src/App.tsx
  → AppProvider / useAppStore
  → activeTab
  → src/features/*
```

Important active modules:

- `src/core/types/` — current domain types
- `src/core/calculations/` — cost engine, detailed breakdown, drivers, What-If
- `src/state/store.tsx` — product sessions, CRUD, lifecycle, derived values
- `src/services/excel/` — Excel parser and template generator
- `src/features/master-data/`
- `src/features/cost-breakdown/`
- `src/features/candidate-selection/`
- `src/features/rca-simulation/`
- `src/shared/` — layout and shared UI

The following directories appear to be legacy/duplicated implementation paths
and are not imported by the current `src/App.tsx` path:

- `src/pages/`
- `src/components/`
- `src/lib/`

They should not be edited during the first migration slices unless an active
reference is found.

## 3. What Can Be Reused

### Domain and calculation primitives

- Material cost formula: `consumption × price × (1 + loss)`
- Routing runtime formula currently used by the project
- Labor and burden rate lookup concept
- `safeDivide`, numeric guards, formatters, and confidence helpers
- Existing seed data and Excel models as regression fixtures

### Application structure

- React feature shell and navigation
- Master Data editor components as the basis for a snapshot editor
- Cost Breakdown page as the basis for a comparison view
- Existing `draft / active / archived` lifecycle concept
- ExcelJS and SheetJS dependencies
- Browser-only deployment; no backend database is required for this scope

### Transitional adapters

`ProductSession` is close enough to act as an adapter source for a new
`CostSnapshot`, but it should not remain the final comparison model.

## 4. What Must Change

### Types

Current paired fields in `src/core/types/cost.types.ts` must become single-side
snapshot fields.

Affected concepts:

- `BOMItem`
- `RoutingStep`
- `WorkCenterRate`
- `CostElementBreakdown`
- `CostDriver`
- `ExcelImportResult`
- `ProductSession`
- `TrialValidationRecord`

### Cost engine

`calculateCostBreakdown(bom, routing, rates)` currently calculates Base and
Active from the same arrays. It must become an independent snapshot calculator
followed by a comparison step.

Current limitations:

- Base and Active rates are the same rate array.
- Labor-rate variance and burden-rate variance are hard-coded to zero.
- Missing Work Center rates silently use fallback values.
- Material usage and routing resource input are not paired fields, so their
  cross-side changes cannot currently be represented.

### State

`useAppStore` currently exposes one active session. The redesigned state needs
workspace-level references such as:

```text
referenceSnapshotId
currentSnapshotId
comparison
candidateDecisions
rcaRecords
whatIfScenarios
trialRecords
```

Business comparison and application lifecycle must remain separate:

```text
Business:  Reference vs Current
Lifecycle: Draft / Active / Archived
```

### Candidate and RCA

`calculateTopDrivers` currently returns only the top ten positive paired-row
drivers. The redesigned candidate layer must collect all relevant findings,
including Added, Removed, Reordered, Work Center changes, and multiple changed
fields on one row. Cost impact should prioritize findings, not silently remove
the rest.

RCA should begin only after a human selects a finding.

### Trial

The current `TrialValidationCard` keeps trial values in local React state and
its Promote action calls `promoteActiveToBaseline`. This conflicts with the
required lifecycle:

```text
Trial Actual → Review → New Draft → Validate → Activate
```

Trial Actual must not directly overwrite the official Current snapshot.

## 5. Proposed Data Model

The raw snapshot should contain business inputs only. Calculated values should
be a separate derived artifact to avoid stale stored calculations.

```ts
type SnapshotRole = 'reference' | 'current'
type LifecycleStatus = 'draft' | 'active' | 'archived'

interface CostSnapshot {
  id: string
  product: ProductSnapshot
  effectiveDate?: string
  revision?: string
  source: SnapshotSource
  workCenters: WorkCenterSnapshot[]
  bom: BOMSnapshotItem[]
  routing: RoutingSnapshotOperation[]
  status: LifecycleStatus
}
```

```ts
interface BOMSnapshotItem {
  lineId: string
  itemCode: string
  description: string
  consumption: number
  unit: string
  price: number
  loss: number
  sourceRef?: string
  confidence: DataConfidence
}

interface RoutingSnapshotOperation {
  operationId?: string
  processCode?: string
  sequence: number
  description: string
  workCenterId: string
  resourceInput: number // preserve current MHr/Manning value until verified
  capacity: number
  yield: number
  sourceRef?: string
  confidence: DataConfidence
}

interface WorkCenterSnapshot {
  workCenterId: string
  name: string
  laborRate: number
  burdenRate: number
  effectiveDate?: string
  sourceRef?: string
  confidence: DataConfidence
}
```

```ts
interface SnapshotCost {
  material: number
  labor: number
  burden: number
  total: number
  bomCosts: Record<string, number>
  routingCosts: Record<string, number>
  warnings: CalculationWarning[]
  reconciliationStatus: 'passed' | 'failed' | 'needs_review'
}

interface CostComparison {
  id: string
  referenceSnapshotId: string
  currentSnapshotId: string
  materialGap: number
  laborGap: number
  burdenGap: number
  totalGap: number
  bomDiffs: BOMDiff[]
  routingDiffs: RoutingDiff[]
  workCenterDiffs: WorkCenterDiff[]
  reconciliation: ReconciliationResult
}
```

Per-field source/confidence metadata should be preserved. The current model
mostly stores `sourceRef` and `confidence` at row level, which is insufficient
for a strict per-field confidence requirement.

## 6. Before/After Matching and Comparison

### Calculation order

```text
Calculate Reference independently
Calculate Current independently
Match and classify rows
Compare costs and fields
Reconcile totals
```

Matching must not be required in order to calculate either total.

### BOM matching

Preferred order:

1. Stable material/item code
2. Stable BOM line ID if duplicate item codes are allowed
3. Manual review when ambiguous

Spreadsheet row position and description must not be primary identity.

### Routing matching

Preferred order:

1. Stable operation ID
2. Stable process code
3. Unique normalized process name
4. Manual mapping
5. `NEED_REVIEW` if still ambiguous

Sequence is an attribute, not identity. Work Center should not be required in
the fallback key because an operation may move between Work Centers.

### Diff status design

A single status is not enough because one operation can be both reordered and
modified. Prefer separate match status and change flags:

```ts
interface RoutingDiff {
  key: string
  matchStatus: 'matched' | 'added' | 'removed' | 'need_review'
  changeFlags: Array<'modified' | 'reordered' | 'work_center_changed'>
  before?: RoutingSnapshotOperation
  after?: RoutingSnapshotOperation
  changedFields: FieldDiff[]
  beforeCost: number
  afterCost: number
  costGap: number
  mappingEvidence: MappingEvidence
}
```

Added and Removed rows participate in reconciliation with a zero on the absent
side.

### Attribution safety

The exact snapshot gap is reliable:

```text
Current total - Reference total
```

Per-variable monetary attribution is not automatically reliable when several
inputs change together. Until an approved methodology exists, show exact row
gaps and changed fields, but do not claim that each field caused a specific
THB amount.

## 7. Work Center and Routing Relationship

Work Center is both:

1. A first-class calculation dependency for Routing
2. An aggregate reporting/drill-down view

Each routing operation should reference a stable `workCenterId`, while each
snapshot owns its own Work Center master/rates:

```text
Reference Routing → Reference Work Center rates
Current Routing   → Current Work Center rates
```

Important cases:

- Routing parameter changed, same Work Center → operation modified
- Same operation moved to another Work Center → matched plus
  `work_center_changed`
- Routing unchanged, Work Center rate changed → rate diff affects all affected
  operation calculations

Work Center aggregate gaps must not be added on top of operation gaps, or the
same cost will be counted twice.

The current silent fallback rate (`105.29 / 95.00`) conflicts with the Source of
Truth requirement. Missing rate references should be validation errors or
explicitly marked estimated.

## 8. Excel Import and Export

The current parser expects a paired workbook:

```text
1_MASTER_RATES
2_BOM_BREAKDOWN
3_ROUTING_BREAKDOWN
```

The current Excel models also contain `_CALC_ENGINE` and
`4_SUMMARY_&_COMPARISON`, while the dynamic template generator does not produce
exactly the same sheet set. This schema mismatch should be resolved before the
new import contract is finalized.

Recommended canonical snapshot workbook:

```text
META
PRODUCT
WORK_CENTER
BOM
ROUTING
```

The import UI, not an Excel role field, should be authoritative for choosing
Reference/Before versus Current/After.

Recommended adapters:

```text
CanonicalSnapshotWorkbookAdapter
LegacyPairedWorkbookAdapter
```

The legacy adapter can map:

```text
base*   → Reference snapshot
active* → Current snapshot
```

Import flow:

```text
Select file
→ Detect schema version
→ Parse
→ Validate
→ Show errors/warnings
→ Choose Before or After
→ Create Draft snapshot
```

Export should support:

- Export Reference/Before snapshot
- Export Current/After snapshot
- Later: Export comparison report

The input workbook should not be polluted with generated comparison statuses.

## 9. Proposed UI Flow

Reuse the current navigation shell, but add workspace/snapshot context:

```text
Workspace
  ├── Before snapshot
  ├── After snapshot
  ├── Import
  ├── Clone Before → After
  └── Export
```

Suggested flow:

1. Choose bundled project data or import a snapshot.
2. Select or create Before/Reference.
3. Clone Before to After or import an independent After workbook.
4. Validate both snapshots.
5. Calculate both snapshots.
6. Show comparison summary and reconciliation.
7. Drill down through category, Work Center, BOM, Routing, and fields.
8. Show all candidate findings.
9. Let the human select a finding.
10. Run RCA and What-If against a derived scenario.
11. Record Trial Actual separately.
12. Review the trial before creating and activating a new Draft.

The current `MasterDataPage` can become a reusable snapshot editor instead of
creating two unrelated copies of the page.

## 10. Migration Strategy

Use an incremental migration rather than a big-bang rewrite:

1. Freeze current RGOM-024 outputs as regression fixtures.
2. Add snapshot types beside the old paired types.
3. Add an adapter from current `ProductSession` to two snapshots.
4. Implement and verify per-snapshot calculation parity.
5. Add matching and diff as a separate deep module.
6. Add a workspace store with `referenceSnapshotId` and
   `currentSnapshotId`.
7. Add canonical and legacy Excel adapters.
8. Migrate Cost Breakdown UI to consume comparison results.
9. Migrate candidate findings, RCA, What-If, and Trial records.
10. Add session-storage schema migration for existing paired data.
11. Remove paired fields only after all active consumers are migrated.
12. Revisit legacy `src/pages`, `src/components`, and `src/lib` only after
    confirming they are unused.

## 11. Phased Implementation Plan

### Phase 0 — Real schema and formula review

No code changes.

- Compare real Before/Current Cost Declare files.
- Confirm BOM identity and duplicate behavior.
- Confirm routing identity.
- Confirm rate periods.
- Confirm MHr/Manning semantics.
- Confirm labor/burden formula assumptions.
- Produce sanitized fixtures and expected totals.

Acceptance: open questions are documented instead of guessed.

### Phase 1 — Snapshot domain and test seam

- Add snapshot, provenance, diff, and workspace types.
- Add direct tests for the new interfaces.
- Keep old types compiling through an adapter.

Acceptance: type check passes and no existing behavior changes.

### Phase 2 — Independent calculation

- Implement `calculateSnapshotCost(snapshot)`.
- Reuse verified formulas.
- Make missing Work Center/rate behavior explicit.
- Add parity tests against the current seed/Excel model.

Acceptance: Reference and Current calculate independently and reconcile.

### Phase 3 — Matching and diff

- BOM matching
- Routing matching
- Work Center/rate diff
- Added/Removed/Modified/Reordered/Need Review
- Mapping evidence and confidence
- Zero-side structural cost

Acceptance: numeric and structural scenarios A–H pass.

### Phase 4 — Workspace and Excel

- Before/After import target
- Clone Before → After
- Legacy paired workbook adapter
- Canonical snapshot workbook adapter
- Snapshot export
- Session-storage migration

Acceptance: import → edit → export → re-import preserves intended values.

### Phase 5 — Comparison UI

- Snapshot selector/context
- Validation warnings
- Executive gap summary
- Work Center aggregate
- BOM/Routing diff drill-down

Acceptance: users can see both numeric and structural causes of the gap.

### Phase 6 — Candidate findings

- Generate findings from diff results.
- Preserve all findings, not only Top 10.
- Add Pending/Deferred/Rejected/Selected states.
- Persist human decisions.

Acceptance: RCA cannot start without a selected finding.

### Phase 7 — RCA, What-If, and Trial

- Link RCA to a selected finding.
- Represent What-If as a scenario/derived snapshot.
- Prevent mutation of official Current data.
- Persist Trial records.
- Require review before Draft → Active.

Acceptance: Trial Actual remains separate from official Current data.

### Phase 8 — Cleanup and documentation

- Update Base/Active terminology.
- Update user manual, HANDOFF, and README.
- Remove paired fields after migration.
- Remove or archive unused legacy modules only with evidence.

## 12. Risks and Conflicts

1. The proposal's single `DiffStatus` should become match status plus change
   flags.
2. `processName + Work Center` matching conflicts with the requirement that an
   operation may move Work Center.
3. Work Center rate impact can be double-counted if added to operation gaps.
4. Current formulas do not define approved attribution for multiple simultaneous
   variable changes.
5. MHr/Manning meaning remains unresolved.
6. Current parser generates new routing IDs on every import, so cross-file
   routing matching is not currently possible by ID.
7. Duplicate BOM item codes require a line-level identity.
8. Current parsing and calculation silently default missing values.
9. Current Active dataset can be edited directly despite the intended lifecycle.
10. Trial data is not persisted and can be promoted directly to baseline.
11. Current Excel generator, parser, and checked-in models do not share one
    exact schema.
12. Existing audit scripts duplicate calculation logic rather than directly
    testing the TypeScript core modules.
13. `sessionStorage` is temporary; Excel export must be implemented if Excel is
    the durable workflow.
14. Current documentation still describes the paired Base/Active model.

## 13. Recommendation

Approve the direction, but start only with Phase 0 and Phase 1.

The first implementation seam should be a deep calculation/comparison module:

```text
calculateSnapshotCost(snapshot)
compareSnapshots(reference, current)
```

The UI should consume its results and should not infer matching or cost status
from raw arrays.

The safest order is:

```text
Real schema mapping
→ Snapshot types
→ Per-snapshot cost parity
→ Diff engine
→ Excel adapters
→ UI
→ Candidate/RCA/Trial
```

