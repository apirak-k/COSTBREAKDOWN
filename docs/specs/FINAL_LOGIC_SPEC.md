# COSTBREAKDOWN — Final Logic Specification & Implementation Checklist

**Status:** FINALIZED LOGIC — USER DECISION
**Date:** 2026-10-08
**Scope:** Canonical business logic, calculations, comparison behavior, analysis scope, page-to-page flow, simulation logic, economics logic, graph/data logic, examples, edge cases, and acceptance checklist.
**Not a visual redesign specification.**

---

## 0. Purpose, Authority, and Precedence

This document is the consolidated **logic-only source of truth** for the COSTBREAKDOWN application, establishing the latest user-finalized business logic.

It is intended to be usable directly by Codex or another implementation/review agent for:

- implementation audit,
- regression review,
- implementation planning,
- code changes,
- test planning,
- and logic verification.

### 0.1 Logic-only authority

This document finalizes **logic and behavior only**.

Existing finalized or accepted behavior outside this logic scope remains valid when it does not conflict with this document, including:

- UX/UI structure,
- visual style and engineering-console direction under `design.md`,
- component styling,
- wording and label typography,
- navigation presentation,
- interaction details,
- spreadsheet table editing behavior,
- keyboard navigation,
- compact/dense engineering-console direction,
- reversible implementation choices in `docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md`,
- and other previously finalized page behavior.

Do **not** interpret this document as permission to redesign the application.

### 0.2 Conflict rule

Use this precedence rule:

1. The latest explicit logic decision in this document wins for the specific behavior it changes.
2. Existing finalized behavior remains valid if it does not conflict.
3. A conflict supersedes only the conflicting behavior; it does not invalidate the entire older specification.
4. Existing code is implementation evidence, not a requirement source.
5. Do not infer additional formulas, identities, lifecycle rules, or workflow states that are not defined here or preserved by a non-conflicting finalized source.

### 0.3 Important supersessions introduced by this final logic review

This document explicitly supersedes older behavior in the following areas:

- **Master Data supports Reference, Current, and Custom:** `Custom` is a free dataset workspace with no hard-coded semantic meaning (not locked to Trial, Simulation, Proposal, or Future).
- **Master Data owns structural changes:** Adding, removing, resizing, or altering dataset structure belongs in Master Data / Custom, not in Simulation.
- **Clone action semantics:** The active dataset is the destination; the user selects the source dataset. No special promotion workflow.
- **Cost Breakdown (Phase 2 update — 2026-10-19 user decision):** CBD independently compares Before and After from the latest Reference, Current, and Custom Master Data Working datasets. All nine ordered pairs including self-comparison are supported; Reference → Current remains default. Gap = After − Before, ADDED means After-only, and REMOVED means Before-only. Selector state is CBD analysis state and does not edit or create datasets.
- **Selected Comparison is analysis scope/view only:** It is neither a new dataset nor a persistent case.
- **Candidate findings belong inside CBD:** Findings may still be called Candidates, but there is no standalone Candidate or RCA page in the current product flow.
- **Legacy RCA/session compatibility:** Existing RCA case data may retain its historical domain rules; it is not an active visible product stage.
- **No new RCA Note system:** Existing Master Data Note/Remark behavior remains separate; do not create duplicate RCA Note/Candidate Note workflows.
- **Simulation architecture and UI (Phases 3–4, 2026-10-19 user decision):** There is no fourth persistent SIM dataset. Simulation stores role-keyed parameter overrides and Business/Economic drafts over latest Reference, Current, and Custom Working datasets. Effective snapshots are derived; each role uses its own rates. Parameter edits and parameter history target `activeDataset`; Result and Economic calculations use `comparisonBefore → comparisonAfter`, and the After role owns the Business/Economic draft and history. Parameter editor status and cost effects use the active role's own Working basis and rates. Rebase only the role whose Working basis changed. `activeDataset` is independent from both comparison roles; all nine ordered pairs are valid. Defaults are active Current and Reference → Current. The fixed graph is Reference | GAP 1 | Current | GAP 2 | Custom, its role labels select only `activeDataset`, and Result exposes independent Before/After selectors with dynamic role headers.
- **Simulation structure is Master Data-owned:** Simulation cannot add, remove, or resize rows. It always uses the current structure of the selected role's Master Data Working dataset.
- **Simulation comparisons:** Result and Economic calculations use any effective Before/After pair; dynamic Result headers show the selected roles. The fixed graph is Reference | GAP 1 | Current | GAP 2 | Custom, with GAP 1 = Current − Reference and GAP 2 = Custom − Current. Graph role values use their own effective snapshots, rates, and role-local business drafts. Graph label selection changes `activeDataset` only; the independent pair remains unchanged.
- **Direct parameter editing:** There is no Factors to Simulate selector. Eligible BOM and Routing parameters are edited directly; Work Center rates are locked and remain owned by each matching Master Data role.
- **Simulation-editable parameters are finalized:** BOM (Price, Usage/Consumption, Loss) and Routing (Manning, Capacity, Yield). Work Center Labor Rate and Burden Rate are not editable in Simulation (change them in Master Data / Custom).
- **Scenario count is flexible:** Exactly Scenario A and Scenario B is not a mandatory business requirement.
- **Economic Simulation uses implementation inputs:** Fixed Action Cost, Variable Action Cost / pc, positive integer Batch Size, Selling Price override, and SG&A % override. Required Saving / pc is Fixed Action Cost / Batch Size + Variable Action Cost / pc.
- **Economics is separate from Standard Cost:** Economic inputs do NOT alter MAT, LB, BD, Conversion, or Standard Cost.
- **Simulation Send/Reset (Phases 3–4):** Graph labels select `activeDataset` without cloning data or changing the comparison pair. Direct Send uses only that active role and maps it to the same Master Data Working role; Send All maps all three roles atomically. Send changes Working only, preserves Last Saved, and rebases only the matching Simulation role and history. Reset clears active-role parameter overrides; Reset All clears all three roles' parameter overrides while retaining valid economic drafts whose bases remain valid. The primary action tooltips are exactly `Send` and `Reset`; the compact secondary actions are `Send all datasets` and `Reset all datasets`. Legacy single-SIM persistence migrates only when a safe unchanged-Current parameter-only migration can be proven; otherwise it is discarded.
- **Simulation input domains are enforced at entry and calculation boundaries:** costs, prices, usage and manning are nonnegative; Loss and SG&A are 0–100%; Yield is greater than 0% and at most 100%; Capacity and Batch Size are positive; Batch Size is an integer. Missing required values stay unavailable.
- **Simulation display contract:** Result Change is effective After − effective Before; Result % = (Change / effective Before) × 100 when Before is available and nonzero. Parameter Saving is effective Before − effective After. The fixed graph is Reference | GAP 1 | Current | GAP 2 | Custom, independent of Result pair and Business/Economic After context. BOM/RTG tables and the page must not introduce horizontal scrolling.
- **Economic result is advisory:** A scenario below break-even remains visible and selectable. The system informs; the engineer decides.
- **No special Trial lifecycle:** Custom may hold trial data if the user wants; to use it as Current, open Current, choose `Clone`, and select Custom.
- **MatVAR, LBVAR, and BDVAR remain out of scope.**

---

# 1. End-to-End Product Flow

The current visible product flow is:

```text
MASTER DATA
  (Reference / Current / Custom)
          │
          ▼
COST BREAKDOWN (Before → After; Reference / Current / Custom)
  ├─ Compare full data
  ├─ Filter and sort findings
  ├─ Inspect details
  ├─ Select 1 or many findings
  └─ Selected Comparison (temporary analysis scope)
          │
          ▼
SIMULATION (separate What-If analysis)
  ├─ Parameter Simulation
  └─ Economic Simulation
```

### 1.1 Core page responsibilities

| Area | Question it answers | Core Responsibility |
|---|---|---|
| Master Data | “What data state do I have?” | Prepare Reference, Current, and Custom snapshots; own structural edits and Sizing; generic Clone. |
| CBD | “What changed between the selected Before and After datasets, and which findings should I inspect?” | Compare any ordered Reference / Current / Custom pair; show Standard Cost gaps by MAT/LB/BD/Conversion; filter, sort, inspect, select findings, and support Full and Selected Comparison views. There is no standalone Candidate or RCA page. |
| Parameter Simulation | “If these parameters had these values, what would the cost become?” | Temporary role-local what-if analysis over Master Data Working; locked structure; independent active dataset and generic effective Before/After comparison. |
| Economic Simulation | “How do implementation costs and commercial assumptions affect per-piece economics?” | Calculate Fixed Cost / pc, Required Saving / pc, Parameter Saving, Economic Margin, SG&A / pc, and OP / pc without altering Standard Cost. |

---

# 2. Shared Data Model and Calculation Rules

## 2.1 Canonical Dataset Shape

Reference, Current, and Custom use the exact same canonical dataset shape:

```text
META
BOM
WORK_CENTER
ROUTING
```

All calculations share one canonical cost engine. Do not create competing calculation engines.

## 2.2 Business Identity

Comparable records are matched strictly by business identity:

```text
BOM         → Name
WORK_CENTER → WC
ROUTING     → Process
```

The display `#` column is an ordinal row number and selection control, not an identity.

Never match by:
- row position,
- visual row number,
- array index,
- display order,
- legacy Operation Code or Sequence,
- guessed positional correspondence.

Duplicate identities introduced through Master Data edits are deterministically suffixed to keep effective identities unique and produce a review warning. Duplicates that remain in imported or legacy data produce data-quality warnings; the system must never guess a match.

## 2.3 Comparison Statuses

Only four comparison statuses exist:

```text
UNCHANGED
CHANGED
ADDED
REMOVED
```

Rules:
- Record exists on both sides with equivalent values → `UNCHANGED`.
- Record exists on both sides with differing values → `CHANGED`.
- Record exists only on the After side → `ADDED`.
- Record exists only on the Before side → `REMOVED`.

Do not create statuses such as `MODIFIED`, `REPLACE`, or `NEED REVIEW`.

### Status and Gap are independent
- A record can be `CHANGED` with positive, negative, zero, or unavailable Gap.
- A Process can be `CHANGED` solely because of a Work Center rate dependency even if its own Routing inputs are unchanged.

### Work Center rate dependency
Work Center is never a Candidate. The processing Candidate identity is always `Process / Routing`; Work Center is the rate owner and calculation/aggregation context.

## 2.4 Gap Convention

Always use:

```text
Gap = After - Before
```

(Simulation parameter edits and Reset use `activeDataset`; its graph label does not change the independent Result pair.)

For absent sides:
- `ADDED` → Before contribution = 0 (record does not exist in Before).
- `REMOVED` → After contribution = 0 (record does not exist in After).

This absent-record zero is **not** the same as missing data.

## 2.5 Standard Cost Engine

### Material
Per BOM row:

$$\text{Material Cost} = \text{Usage} \times \text{Price} \times (1 + \text{Loss})$$

$$\text{Direct Material} = \sum \text{BOM Material Costs}$$

### Routing Factor
Per Routing row:

$$\text{Routing Factor} = \frac{\text{Manning}}{\text{Capacity} \times \text{Yield}}$$

### Labor
$$\text{Labor} = \text{Routing Factor} \times \text{Work Center Labor Rate}$$

### Burden
$$\text{Burden} = \text{Routing Factor} \times \text{Work Center Burden Rate}$$

### Conversion
$$\text{Conversion} = \text{Labor} + \text{Burden}$$

### Standard Cost
$$\text{Standard Cost} = \text{Direct Material} + \text{Labor} + \text{Burden} = \text{Direct Material} + \text{Conversion}$$

Do not double-count Conversion.

## 2.6 Missing / Invalid Required Inputs

A missing or invalid required input makes the affected calculated output **unavailable**.
- Do not silently substitute `0`.
- Do not guess or substitute a plausible default.
- An explicit numeric `0` remains valid where mathematically and logically permitted (e.g. Price = 0, Loss = 0).

## 2.7 Reconciliation Rules

- Sum of BOM material costs must reconcile to Direct Material total.
- Sum of Routing labor and burden costs must reconcile to Labor and Burden totals.
- $\text{Direct Material} + \text{Labor} + \text{Burden} = \text{Standard Cost}$.
- Record-level gaps must reconcile to total Gap.

---

# 3. Master Data Logic

## 3.1 Datasets and Workspaces

Master Data contains three independent datasets:

```text
Reference | Current | Custom
```

- **Reference:** Business reference state used by CBD.
- **Current:** Current operational state used by CBD.
- **Custom:** Free dataset workspace with **no hard-coded semantic meaning**.
  - May be used for proposed future states, sizing experiments, trial data, or structural preparations before Simulation.
  - Must not be forced to mean Trial, Simulation, Approved, or Proposal.

Each dataset has:
- In-session `Working` state.
- In-session `Last Saved` state.
- An initial `Working` reset baseline captured when that dataset is opened or loaded.
- State does not persist across application restarts; closing the session resets the workspace.

## 3.2 Dataset Actions

- **Save:** Copies viewed dataset's `Working` state into its `Last Saved` state.
- **Reset:** Restores viewed dataset's `Working` state from its latest `Last Saved` state when one exists; otherwise restores its initial `Working` reset baseline. Reset is always available. Reset All applies the same rule independently to each dataset.
- **Export:** Exports the viewed dataset's current `Working` state to Excel, including unsaved edits. Export is always available.
- **Import:** Replaces viewed dataset's `Working` state. Initializes Sizing counts from imported rows.
- **Clear:** Clears editable values and metadata in the viewed dataset's `Working` state while preserving every table row, row order, supported row identity, columns, structural fields, and Sizing counts. It retains `Last Saved` and remains undoable; Reset restores the applicable reset baseline.
- **Clone:** Generic dataset copy.
  - Active viewed dataset = Destination.
  - User chooses Source dataset (`Reference`, `Current`, or `Custom`).
  - Destination readiness is recalculated from copied content.
  - Selecting the source performs the copy without a second replacement confirmation.
  - Never mutates `Last Saved`.
  - No special promotion workflow (to use Custom as Current, open Current, choose `Clone`, and select Custom).

## 3.3 Master Data Owns Structural Changes

All structural changes belong in Master Data:
- Adding rows,
- Deleting rows,
- Sizing table row counts,
- Reordering rows.

Clear Dataset clears row values without deleting, compacting, recreating, or reindexing rows. A newline-separated single-column paste fills consecutive rows in that same column from the focused cell without requiring Block Action; pasted values continue through the existing validation and numeric parsing paths.

Custom is the recommended workspace when the user wants to experiment with structural differences without mutating Reference or Current.

## 3.4 Sizing and Templates

- Sizing configures starting row counts for BOM, Work Centers, and Routing (minimum 1 each).
- Applying a count sets that table to exactly that many rows:
  - Increasing adds blank rows.
  - Decreasing truncates from the end (removed data is lost).
- Download Template generates the canonical Excel workbook matching configured Sizing counts.

## 3.5 Workbook Format

Canonical 4-sheet workbook:
1. `META`: Inputs (Product Name, UOM, Selling Price, SG&A %, Dataset Remark); Formulas (MAT, Labor, Burden, Standard Cost, SG&A Amount, OP).
2. `BOM`: `Name | Usage | Unit | Price | Loss | Note`
3. `WORK_CENTER`: `WC | Labor | Burden | Note`
4. `ROUTING`: `Process | WC | Manning | Cap | Yield | Note`

Styling rules:
- Dark background with bold white text for headers.
- Yellow marks user-editable input cells.
- Light gray marks formula-driven META cells.
- Unused cells remain white.
- Web UI styling and Excel workbook styling remain separate.

## 3.6 Spreadsheet Editing and Keyboard Navigation

- View Mode is read-only; Edit Mode allows direct cell editing.
- Keyboard navigation: Arrow keys, Enter / Shift+Enter (down/up), Tab / Shift+Tab (right/left), Escape (cancel).
- Copy / Paste: TSV and multi-cell spreadsheet paste supported.
- Undo / Redo: Page-level history covering Working edits across all tables.
- `#` is the left-pinned row number/selection handle; its header toggles selection of currently visible rows.
- Trash and GripVertical reorder controls share one rightmost Actions column. Selected-row reordering keeps source order; see the current table interaction contract in [`MASTER_DATA_TOOLBAR_PREPARE_UX.md`](MASTER_DATA_TOOLBAR_PREPARE_UX.md).

---

# 4. Cost Breakdown (CBD) Logic

## 4.1 Purpose and Comparison Scope

CBD answers: *“What changed between the selected Before and After datasets, and where does the Standard Cost gap come from?”*

CBD reads the latest Reference, Current, and Custom Master Data Working snapshots. Save is not a publish gate. The Before and After selectors are independent, accept the same role, and never change Master Data. The supported ordered pairs are Reference → Current (default), Current → Reference, Reference → Custom, Custom → Reference, Current → Custom, Custom → Current, Reference → Reference, Current → Current, and Custom → Custom.

The selected Before snapshot is passed as the comparison engine's first argument; the selected After snapshot is passed as its second argument. This preserves the shared calculation engine while making its first/second mapping explicit at the CBD boundary. Every cost, Work Center rate, finding status, parameter delta, effect, and percentage follows Gap = After − Before. Each side uses its own Work Center rates. Self-comparison yields zero gaps where calculations are available, matched records are UNCHANGED, no synthetic ADDED/REMOVED records appear, and zero-denominator percentages stay unavailable.

## 4.2 Full Comparison vs Selected Comparison

- **Full Comparison:** Evaluates all eligible BOM and Routing records for the selected ordered pair; the default pair is Reference → Current.
- **Selected Comparison:** Temporary analysis scope/view of selected BOM and Routing findings from that same pair.
  - Retains the complete pair's Work Center rates as calculation context.
  - The secondary Selected Gap includes only selected findings; the full comparison remains visible and primary.
  - It is **not** a new dataset, **not** a persistent state, and **not** an RCA Case.
  - Does not mutate source datasets.
  - Changing either selected role or its latest Working data invalidates selected membership. Fingerprints include both selected role identities and source values.
  - A pair change clears comparison-bound manual Candidate order/history and expanded details. Type, Status, and Sort remain selected.

## 4.3 Finding and Selected Comparison Boundary

Candidate is a name that may be used for a CBD finding. Finding analysis stays inside CBD: filter, sort/prioritize, inspect details, select one or many findings, and review Selected Comparison. There is no standalone Candidate or RCA page in the current product. Selected Comparison does not mutate Reference, Current, or Custom and does not redefine Simulation scope. Simulation remains a separate What-If analysis module with graph selection for `activeDataset` and independent Before/After Result selectors.

# 5. Legacy Candidate and RCA Domain / Session Compatibility

This section documents retained legacy domain and session compatibility rules only. It does not describe a current visible product stage or authorize a Candidate page, RCA page, RCA workspace, or CBD Root Cause / Action fields. Current CBD finding analysis is defined in Section 4.

## 5.1 Candidate Pool and Advisory Ranking

- Candidate findings derive from CBD (Full or Selected scope).
- BOM Candidates represent material records with record-level Gap and changed input details. No unsupported per-factor THB attribution is fabricated.
- Processing Candidates represent `Process / Routing` records.
- Work Center is never a Candidate.
- Controllable starts `true` by default; unchecking does not hide the candidate.
- Ranking by Gap descending (highest to lowest) is **advisory only**. The system must never auto-select rank #1 or force top-rank selection.

## 5.2 RCA Case Supports 1 or Many Candidates

One RCA Case may contain:
- **1 Candidate**, or
- **Multiple Candidates**.

*Rationale:* A single real-world structural or engineering change often manifests as multiple comparison findings (e.g. replacing a single old process with two specialized operations).

### Multi-Candidate Example
```text
Reference:
  Process QA1

Current:
  Process QA1.1
  Process QA1.2

CBD findings:
  QA1   → REMOVED
  QA1.1 → ADDED
  QA1.2 → ADDED

RCA Case:
  Candidates: [QA1, QA1.1, QA1.2]
  Root Cause / Why?: Reorganized quality inspection line into two specialized stages.
  Action: Optimize cycle times across QA1.1 and QA1.2.
```

## 5.3 Root Cause / Why? and Action

- Root Cause and Action are recorded at the **RCA Case** level.
- Do not require duplicate Root Cause / Action fields for every individual Candidate in the same case.
- No new RCA Note system is created. Existing Master Data Note/Remark annotations remain separate.

## 5.4 Legacy RCA Completion Semantics

This historical domain rule applies only to existing RCA session data; RCA is not a current visible product stage. In a compatible legacy RCA record, completion meant the engineer had identified:
$$\text{Candidate(s)} + \text{Root Cause / Why?} + \text{Action}$$

- Simulation is **optional**.
- Trial execution is **not required**.
- Approval/promotion is **not required**.
- The business workflow can legitimately end here.

## 5.5 Legacy RCA Session Compatibility

Older saved sessions may contain RCA data or Simulation context. Migration may retain compatible historical RCA domain records, but this is legacy session compatibility only:
- There is no active RCA-to-Simulation handoff.
- The current visible page flow is Master Data → Cost Breakdown → Simulation.
- Legacy RCA data does not constrain Simulation state, scope, or initialization.

---

# 6. Simulation Logic

Simulation is one directly accessible working page with two separate analytical dimensions:

```text
SIMULATION
├─ Parameter Simulation
└─ Economic Simulation
```

The page opens ready to work; there is no start landing screen. Phase 1 initializes active role Current and comparison Reference → Current. Parameter cost and economic calculations remain separate even when shown together.

## 6.1 Parameter Simulation

Parameter Simulation answers: *“If these parameters had these values, what would the resulting cost be?”*

### Role-Local Working Basis (Phases 1 and 3)
The persisted Simulation state is a product-scoped map of role-local parameter overrides, Business/Economic drafts, worklist state, and a fingerprint for each corresponding Master Data Working snapshot. It stores no complete derived SIM snapshots or copied structures. Effective values are calculated as latest Working data plus that role's validated overrides. Reference uses Reference rates, Current uses Current rates, and Custom uses Custom rates.

When a role's Master Working snapshot changes, reconciliation resets only that role to its new basis. The other two roles' state remains. Parameter editing targets `activeDataset`; `comparisonBefore` and `comparisonAfter` independently select the Result/Economic analysis pair. The effective After role owns the Business/Economic draft and defaults. All nine ordered pairs are valid. Default state is active Current and Reference → Current.

Graph Reference, Current, and Custom labels select `activeDataset`; this does not clone data or change either comparison role. Direct Send writes the effective active role only to its matching Master Data Working dataset. Send All maps all three roles to their same-role Working datasets atomically. Reset clears active-role parameter overrides, and Reset All clears all three roles' parameter overrides while preserving valid economic drafts. Send and Send All preserve Last Saved and use the existing Master Working history path; successful sends rebase the sent role and invalidate history tied to its old basis. Role-local economics remain intact while their own basis is unchanged.

Result exposes independent boxed Before and After role selectors, supports all nine ordered pairs including self-pairs, and shows the selected role names in its value columns. The Result values use the effective `comparisonBefore → comparisonAfter` pair. Parameter editor rows, status, and Parameter Cost Effect use `activeDataset` and its own Working snapshot and Work Center rates. The fixed Reference | GAP 1 | Current | GAP 2 | Custom graph is independent of the Result pair and After-selected Business/Economic context.

### Structure Is Owned by Master Data
Simulation has no structural copy or editing behavior. It always derives each role from that role's latest Working snapshot. To test a structural alternative, edit/clone it in Master Data (typically Custom), then select Custom as the active Simulation dataset.

### Comparison Basis
The calculation API accepts any effective Before/After pair. The default prepared comparison is:

$$\text{Reference} \longrightarrow \text{Current}$$

`activeDataset` is the parameter-editing context and does not change the comparison pair. The After role supplies the Business assumptions and effective Standard Cost. Result headers use the selected role names; the fixed graph labels remain Reference, GAP 1, Current, GAP 2, and Custom regardless of the selected pair.

### Record Editability Matrix in SIM

| Status in Before vs After | Visible in Simulation | Selectable / Editable | Reason |
|---|---|---|---|
| `CHANGED` | Yes | Yes | Record exists in effective After |
| `UNCHANGED` | Yes | Yes | Record exists in effective After; editing makes it CHANGED |
| `ADDED` | Yes | Yes | Record exists in effective After |
| `REMOVED` | Yes | **No** | Record exists in effective Before; affects Gap only |

### Identity, Status, and Editing
Match records by canonical business identity (BOM material/name identity, Work Center identity, Routing Process identity), never by row position. Missing, duplicate, or ambiguous identity protects affected records from guessed editing or attribution.

| Status in Before vs After | Visible | Editable | Record location |
|---|---|---|---|
| `UNCHANGED` | Yes | Yes | Exists in effective Before and After |
| `CHANGED` | Yes | Yes | Exists in effective Before and After |
| `ADDED` | Yes | Yes | Exists in effective After only |
| `REMOVED` | Yes | No | Exists in effective Before only |

Ambiguous or unsafe matches remain protected and do not receive fabricated attribution. Every valid input change recalculates the effective active-role dataset through the shared Standard Cost engine.

### Finalized Simulation-Editable Parameters
- **BOM:** `Price` (THB), `Usage / Consumption`, `Loss` (%)
- **Routing:** `Manning`, `Capacity`, `Yield` (%)
- **Work Center Rates:** `Labor Rate` and `Burden Rate` are rates owned by Master Data and are not editable in Simulation (modify them in Master Data / Custom).
- **Zero Structural Edits:** Simulation contains zero structural editing capabilities (cannot add/delete rows or change row counts). Master Data Sizing owns all structural changes.
- **Selling Price and SG&A % Placement:** Selling Price and SG&A % are economic/commercial parameters and may be overridden in the Simulation Economic panel (see Section 7), NOT as BOM or Routing parameter inputs. They determine SG&A Amount and OP, and do not alter Standard Cost (MAT, LB, BD).

### Shared Cost Formulas and Result
- BOM Material Cost = Usage × Price × (1 + Loss)
- Routing Factor = Manning / (Capacity × Yield)
- Labor = Routing Factor × the snapshot's own Work Center Labor Rate; Burden = Routing Factor × its own Work Center Burden Rate
- Conversion = Labor + Burden
- Standard Cost = Material + Labor + Burden
- Result Change = effective After − effective Before; Result % = (Change / effective Before) × 100, or unavailable when Before is zero/unavailable.
- Missing or invalid required values make the result unavailable. Zero is not substituted for missing inputs. Genuine ADDED/REMOVED comparison sides may use zero only for the absent side.

### Parameter Cost Effect
BOM change is attributed to Price, Usage, and Loss; Routing Conversion change is attributed to Manning, Capacity, and Yield, using the Before and After snapshots' own Work Center rates. Effects must reconcile to After − Before within floating-point tolerance. Display absolute THB/pc parameter effects only. Show `100%` only beside an available, non-zero total; otherwise show `—`. Added/removed, ambiguous, missing, invalid, or unreconciled effects are unavailable.

### Story Graph
The exact graph story is `Reference → GAP 1 → Current → GAP 2 → Custom`. GAP 1 = Current − Reference; GAP 2 = Custom − Current. Graph states use each role’s effective snapshot, own Work Center rates, and role-local business draft, independently of the Result pair and After-selected economic panel. Dataset bars show MAT, LB, BD, SG&A, and OP separately; Standard Cost is MAT + LB + BD only. Gap bars contain signed MAT/LB/BD differences only. Selling Price is a separate marker. Negative OP is valid. The draggable THB/pc ruler is visual-only and cannot change data or calculations.

## 6.2 Economic Simulation

Economic evaluates action cost and savings; Business evaluates commercial outcomes. These remain separate from engineering Standard Cost and from one another.

### Economic inputs and formulas
- Fixed Action Cost: finite and `>= 0`.
- Batch Size: positive whole production quantity in the product UOM.
- Variable Action Cost / Unit: finite and `>= 0`.
- Parameter Saving / Unit = effective Before Standard Cost − effective After Standard Cost.
- Required Saving / Unit = (Fixed Action Cost / Batch Size) + Variable Action Cost / Unit.
- Economic Margin / Unit = Parameter Saving / Unit − Required Saving / Unit.
- Break-even Quantity = Fixed Action Cost / (Parameter Saving / Unit − Variable Action Cost / Unit).

Batch Size changes Required Saving and Economic Margin, but does not change Break-even Quantity. If Parameter Saving / Unit is less than or equal to Variable Action Cost / Unit, positive-quantity break-even is not achievable. A zero Fixed Action Cost with positive net saving has a valid zero Break-even Quantity. Missing required inputs remain unavailable, never fake zero. Whole-unit production Break-even is displayed as the ceiling of the precise internal result so the displayed quantity reaches or exceeds break-even.

The graph uses Cumulative Parameter Saving(Q) = Parameter Saving / Unit × Q and Total Action Cost(Q) = Fixed Action Cost + Variable Action Cost / Unit × Q. Its intersection is derived from the same precise Break-even calculation. Selling Price and SG&A do not participate in these formulas.

### Business assumptions and formulas
- Selling Price override: finite and `>= 0`; belongs to `comparisonAfter` and blank falls back to effective After Selling Price.
- SG&A override: `0–100%` inclusive; belongs to `comparisonAfter` and blank falls back to effective After SG&A %.
- Effective After Standard Cost comes from the Before/After cost calculation.
- SG&A / Unit = Effective Selling Price × Effective SG&A % / 100.
- Operating Profit / Unit = Effective After Selling Price − Effective After Standard Cost − SG&A / Unit.

### Principles
- Negative Economic Margin and negative Operating Profit are valid and remain visible; zero is neutral.
- **Economic and Business inputs are NOT folded into Standard Cost:** they do not alter MAT, LB, BD, Conversion, or Standard Cost.
- Business outputs do not alter Parameter Saving, Required Saving, Economic Margin, Break-even Quantity, or Break-even graph geometry.
- Standard Cost (engineering/physics), Action Economics, and Business outcome are separate dimensions.

## 6.3 Combined Evaluation (Parameter + Economic)

When both dimensions are used together, the system compares outputs:

$$\text{Parameter Saving / pc} = \text{effective Before Standard Cost} - \text{effective After Standard Cost}$$

$$\text{Required Saving / pc} = \frac{\text{Fixed Action Cost}}{\text{Batch Size}} + \text{Variable Action Cost / pc}$$

$$\text{Economic Margin} = \text{Parameter Saving / pc} - \text{Required Saving / pc}$$

- Negative margin means required savings exceed modeled parameter savings; it remains advisory and visible.

### Advisory Outcome
The economic result is **advisory / informational**, NOT an approval gate.
- A scenario below break-even remains completely visible and selectable.
- The system informs; the engineer decides.

### Avoid Double-Counting
If a cost effect is already modeled in Parameter Simulation (e.g. Manning 2 → 3), do not enter that same recurring effect again as Variable Action Cost / pc.

## 6.4 Scenario Count Flexibility
Exact Scenario A and Scenario B is **not a mandatory business requirement**. The system may support single scenarios, A/B comparisons, or multiple scenarios without being constrained to a fixed pair.

---

# 7. Business Outputs (Selling Price, SG&A, OP)

Preserve compatible finalized business formulas:

$$\text{SG&A amount / pc} = \text{Selling Price} \times \frac{\text{SG\&A \%}}{100}$$

$$\text{OP (Operating Profit) / pc} = \text{effective After Selling Price} - \text{effective After Standard Cost} - \text{SG\&A amount / pc}$$

- **Negative OP is valid:** Represents an operating loss. Must remain clearly displayed and never clamped or converted to unavailable.
- Selling Price and SG&A % may be overridden in the Simulation Economic panel.
- Other financial metrics (COGS, GP, GP Margin, Volume history, MatVAR, LBVAR, BDVAR) remain out of current scope.

---

# 8. Worked Concrete Examples

### Example 1: Master Data Clone
1. Engineer opens `Custom`.
2. Chooses `Clone` and selects Current as the source. Current dataset is copied into Custom.
3. In Custom, engineer deletes process `Welding` and adds process `Laser Cutting`.
4. If this configuration is later approved for operations: Engineer opens `Current`, chooses `Clone`, and selects Custom as the source.

### Example 2: CBD Comparison Findings
```text
Reference           Current            Status      Gap
MAT-Steel (10 THB)  MAT-Steel (12 THB) CHANGED     +2.00 THB/pc
MAT-Bolt (1 THB)    MAT-Bolt (1 THB)   UNCHANGED    0.00 THB/pc
—                   MAT-Gasket         ADDED       +0.50 THB/pc
MAT-Washer          —                  REMOVED     -0.20 THB/pc
```

### Example 3: Legacy RCA Session Data (not current product flow)
```text
Comparison finds:
- QA1: REMOVED (Reference 5 THB)
- QA1.1: ADDED (Current 2.5 THB)
- QA1.2: ADDED (Current 3.0 THB)

RCA Case created with all three findings:
Root Cause: Line rebalancing split inspection into mechanical (QA1.1) and optical (QA1.2).
Action: Benchmark cycle time of optical inspection.
```

### Example 4: Current → Custom Parameter Simulation
```text
Effective Reference Standard Cost = 110.00 THB/pc
Effective Current Standard Cost = 100.00 THB/pc
Effective Custom Standard Cost = 90.00 THB/pc

Graph:
  GAP 1 = Current − Reference = −10.00 THB/pc
  GAP 2 = Custom − Current = −10.00 THB/pc

Set activeDataset = Current; the graph highlight and parameter editor follow Current.
Set Result to Reference → Custom:
  Result Change = Custom − Reference = −20.00 THB/pc
  Parameter Saving = Reference − Custom = +20.00 THB/pc
```

### Example 5: Custom Structural Difference
```text
Current Routing: [Cut, Form]
Custom Routing:  [Cut, Form, Polish]

Select Custom from the graph to make it active:
Result comparison: Current → Custom
- Cut and Form exist in the active Custom dataset and remain editable against Custom's Working basis.
- Polish is visible as ADDED in the Current → Custom Result comparison.
```
If Custom omitted `Form`:
- If Custom omits Form, it remains visible as REMOVED in the Current → Custom comparison and is protected from editing when it is absent from the active role.

### Example 6: Economic-Only Evaluation
```text
Fixed Action Cost = 1,000 THB
Variable Action Cost / pc = 1.00 THB/pc
Batch Size = 100 pcs

Fixed Cost / pc = 1,000 / 100 = 10.00 THB/pc
Required Saving / pc = 10.00 + 1.00 = 11.00 THB/pc.
```

### Example 7: Combined Parameter + Economic Evaluation
```text
Parameter Simulation:
  Current Standard Cost = 10.00 THB/pc
  Custom Standard Cost  = 8.50 THB/pc
  If Result is Current → Custom, Parameter Saving = 1.50 THB/pc

Economic Simulation:
  Fixed Action Cost = 1,000 THB
  Variable Action Cost / pc = 1.00 THB/pc
  Batch Size = 100 pcs
  Required Saving = 11.00 THB/pc

Combined Result:
  Parameter Saving: 1.50 THB/pc
  Required Saving: 11.00 THB/pc
  Economic Margin: −9.50 THB/pc (valid advisory result)
```

### Example 8: Cost Effect and Commercial Outputs
```text
BOM Current: Price 10 × Usage 2 × (1 + Loss 5%) = 21.00 THB/pc
BOM Custom:  Price 12 × Usage 2 × (1 + Loss 5%) = 25.20 THB/pc
Price effect +4.20; Usage 0.00; Loss 0.00; Total +4.20 THB/pc

Routing Current: Manning 1 / (Capacity 100 × Yield 100%) = 0.01
Current rates: Labor 100, Burden 50 → Conversion 1.50 THB/pc
Routing Custom: Manning 0.8 / (100 × 100%) = 0.008
→ Conversion 1.20 THB/pc; change and attributed effects = −0.30 THB/pc

Selling Price 80; effective After Standard Cost 90; SG&A 10%
SG&A / pc = 8; OP / pc = 80 − 90 − 8 = −18 THB/pc (valid)
```

---

# 9. Edge Cases and Integrity Rules

## 9.1 Data Quality and Matching
- **Duplicate Identity:** Master Data edits auto-rename new duplicate business identities with the next available suffix and report the change as a warning. If duplicate identities remain in imported or legacy snapshots, warn and mark affected matching unavailable. Never guess by row position.
- **Missing Required Input:** If Usage, Price, Manning, Capacity, or Yield is missing, mark cost unavailable. Never replace with zero.
- **Explicit Zero:** An explicit zero is valid where logically permitted (e.g. Loss = 0).

## 9.2 CBD Integrity
- Different row counts between the selected Before and After datasets are normal.
- `ADDED` and `REMOVED` rows correctly calculate against an absent-side zero.
- Selected Comparison must never mutate any underlying dataset.

## 9.3 Legacy RCA Session Integrity
- An RCA Case can hold 1 Candidate or many Candidates.
- Ranking is advisory; rank #1 is never forced.
- RCA completion does not depend on Simulation or Trial.

## 9.4 Simulation Integrity
- Structure comes from the active role's latest Master Data Working dataset; Simulation cannot add or delete rows.
- Core Before/After comparisons handle ADDED (editable) and REMOVED (visible, disabled); current Result headers show the selected role names and the fixed graph remains Reference | GAP 1 | Current | GAP 2 | Custom.
- Records match by business identity, never row position; unsafe/ambiguous identity is protected.
- Reference, Current, and Custom have independent parameter overrides and own Work Center rates. A changed Master Working basis rebases only that role.
- Parameter edits and Reset target `activeDataset`; Business/Economic drafts target `comparisonAfter`; Result and Economic calculations use the independent comparison pair. All nine ordered pairs are supported. Reset active and Reset All affect only parameter overrides.
- Send and Send All map each Simulation role to the same Master Working role; Last Saved remains unchanged.
- Work Center rates are not editable in Simulation.
- Economic inputs are never added into MAT, LB, BD, Conversion, or Standard Cost.
- Negative economic margin and OP remain visible; economic results are advisory.
- Invalid inputs are rejected at UI and logic boundaries; missing required values remain unavailable.

---

# 10. Explicitly Superseded Legacy Logic

The following older rules are **explicitly superseded** and must not be reintroduced:

1. **Exactly one Candidate per RCA:** Superseded. An RCA Case may contain 1 or multiple Candidates.
2. **Mandatory RCA → Simulation:** Superseded. Legacy RCA session data is not a current visible product stage or required Simulation handoff.
3. **Simulation always has exactly Scenario A and B:** Superseded. Exact A/B is not mandatory.
4. **One cloned SIM snapshot defines the analytical baseline:** Superseded by the 2026-10-19 Phase 1 user decision. Role-local overrides derive from the latest same-role Working dataset; active editing and comparison pair are independent.
5. **Structural editing inside Simulation:** Superseded. Simulation derives structure from Master Data Working; structural edits happen in Master Data / Custom.
6. **Work Center rates editable in Simulation:** Superseded. Rates are not Simulation-editable; each effective role uses its own Master Data rates.
7. **Old Action Cost / Evaluation Quantity economics:** Superseded by Fixed Action Cost, Variable Action Cost / pc, Batch Size, Selling Price, and SG&A inputs. Economic outputs stay separate from Standard Cost.
8. **Special Trial lifecycle (Trial → Approve → Promote):** Superseded. Custom may store trial data; use the Master Data Clone action to copy it into Current.
9. **Duplicate RCA Note system:** Superseded. Existing Master Data annotations remain separate.
10. **MatVAR / LBVAR / BDVAR:** Superseded and removed from current scope.
11. **Standalone Candidate / RCA stage:** Retired. Candidate findings remain inside CBD; the current visible flow is Master Data → Cost Breakdown → Simulation.

---

# 11. System-Level Acceptance Checklist

### Master Data
- [ ] Reference, Current, and Custom exist and share the same canonical schema.
- [ ] Custom has no hard-coded semantic meaning.
- [ ] Structural editing (add/remove/sizing) belongs in Master Data / Custom.
- [ ] Clone semantics: active dataset is destination, user chooses source.
- [ ] User can clone Current → Custom, Reference → Custom, Custom → Current.
- [ ] Sizing and Excel template generation preserved.
- [ ] 4-sheet workbook format (`META`, `BOM`, `WORK_CENTER`, `ROUTING`) preserved with yellow editable cells.

### Cost Breakdown (CBD)
- [ ] CBD supports all nine ordered Reference / Current / Custom pairs, including self-comparison; default is Reference → Current.
- [ ] Matching uses business identity (`Name`, `WC`, `Process`), never row index.
- [ ] Exactly four statuses: `UNCHANGED`, `CHANGED`, `ADDED`, `REMOVED`; ADDED is After-only and REMOVED is Before-only.
- [ ] $\text{Gap} = \text{After} - \text{Before}$ for all CBD gaps, effects, and parameter deltas.
- [ ] Each selected dataset uses its own Work Center rates; self-comparison safely yields zero gaps where calculable.
- [ ] Full Comparison and pair-aware Selected Comparison supported; role or Working-data changes invalidate stale selection.
- [ ] Pair changes clear manual reorder/history and expanded details while preserving type/status/sort.
- [ ] CBD selectors use the existing one-row Subheader and shared popover; visible cost/finding semantics use Before / After or the actual direction.
- [ ] CBD findings may be referred to as Candidates; filtering, sorting, detail inspection, row selection, and Selected Comparison remain inside CBD.
- [ ] There is no standalone Candidate or RCA page in the current visible product flow.
- [ ] Selected Comparison is temporary analysis scope only, not a dataset or persistent case.

### Simulation (Parameter & Economic)
- [x] Simulation includes Parameter Simulation and Economic Simulation.
- [x] Phase 1 stores per-product Reference, Current, and Custom parameter overrides over Master Data Working, with no persistent fourth SIM dataset.
- [x] Each role's effective values retain that role's own Work Center rates; a changed Master basis rebases only its matching Simulation role.
- [x] `activeDataset` is independent of `comparisonBefore`/`comparisonAfter`; all nine ordered comparison pairs, including self-pairs, are representable.
- [x] Reset active and Reset All state operations clear only corresponding parameter overrides.
- [x] Send and Send All prepare same-role mappings into Master Working; the store path preserves Last Saved and commits all three atomically for Send All.
- [x] Simulation structure is always derived from Master Data Working; Simulation cannot edit structural rows.
- [x] BOM and Routing overrides are edited directly and generic comparisons accept any effective snapshot pair.
- [x] Editable parameters: BOM (Price, Usage, Loss), Routing (Manning, Cap, Yield).
- [x] Work Center Labor and Burden rates are not editable in Simulation.
- [x] Generic Before/After comparisons use existing identity protections and handle CHANGED, UNCHANGED, ADDED (editable), and REMOVED (visible, disabled).
- [x] Graph labels select only `activeDataset`; independent Before/After selectors preserve all nine Result pairs and dynamic role headers.
- [x] BOM/RTG Parameter Cost Effect reconciles to its respective cost delta and shows absolute effects only.
- [x] Economic formulas use Fixed Cost / pc = Fixed Action Cost / Batch Size and Required Saving = Fixed Cost / pc + Variable Action Cost / pc.
- [x] SG&A / pc = After Selling Price × After SG&A % / 100; OP / pc = After Selling Price − effective After Standard Cost − SG&A / pc.
- [x] Economic inputs do NOT alter MAT, LB, BD, Conversion, or Standard Cost.
- [x] Economic results are advisory, not an approval gate.
- [x] Input domains are validated in both UI and logic; invalid values never become zero and negative analytic outputs remain valid.
- [x] Story graph is Reference → GAP 1 → Current → GAP 2 → Custom, with signed engineering-only gap bars and separate Selling Price / economic series.
- [x] BOM/RTG and page have no horizontal overflow; tables may scroll vertically or reflow responsively.
- [x] Exactly A/B scenario count is not mandatory.

### Shared & Integrity
- [ ] One shared calculation engine for all features.
- [ ] Missing inputs make outputs unavailable (never substituted with zero).
- [ ] Reversible implementation details documented in provisional ledger.

---

# 12. Implementation Progress Checklist Template

This tracks execution progress across future implementation phases.

Allowed statuses: `TODO`, `IN PROGRESS`, `IMPLEMENTED`, `VERIFIED`, `BLOCKED — BUSINESS QUESTION`.

### Phase 0 — Baseline
- [ ] Confirm active branch.
- [ ] Record baseline commit SHA.
- [ ] Confirm expected worktree state.
- [ ] Read repository agent instructions.
- [ ] Read requirements authority and canonical specs.
- [ ] Record baseline build/test status.

### Phase 1 — Documentation Alignment
- [x] Migrate `FINAL_LOGIC_SPEC.md` to latest finalized logic.
- [x] Update `REQUIREMENTS_INDEX.md`.
- [x] Update `MASTER_DATA.md` (Ref / Cur / Custom, Clone).
- [x] Update `COST_BREAKDOWN.md` (Ref vs Cur, Selected scope).
- [x] Update `CANDIDATE.md` (Candidate + Multi-Candidate RCA).
- [x] Rename/rewrite `RCA_SIMULATION.md` → `SIMULATION.md` (Parameter + Economic).
- [x] Update `CROSS_CUTTING.md`.
- [x] Update `SYSTEM_LOGIC_DIAGRAM.md`.
- [x] Reconcile provisional decisions and design references.
- [x] Update `HANDOFF.md`.
- [x] Verify cross-document consistency.

### Phase 2+ — Implementation
(To be executed during code audit and implementation phase).

---

# 13. Ambiguity and Escalation Rule

If an implementation detail is reversible and does not alter business semantics:
> Make a safe implementation choice, preserve established patterns, record it as provisional if materially important, and continue.

If a question alters:
- business logic,
- calculations,
- matching identity,
- dataset lifecycle,
- persistence,
- destructive behavior,
- RCA meaning,
- Simulation or Economic meaning,
- Standard Cost meaning,

then:
> **DO NOT GUESS. DO NOT INVENT A RULE.**
> Mark as `BLOCKED — BUSINESS QUESTION` and report the exact context and question for external user resolution.

---

# 14. Definition of Done

The documentation migration is complete only when:
$$\text{Final Logic} = \text{Canonical Active Docs} = \text{Implementation Target}$$

and:
1. No active canonical document contradicts this specification.
2. Historical agreements remain preserved as provenance.
3. Compatible existing requirements are preserved intact.
4. Current implementation status is accurately described without false completion claims.
5. Verification evidence is recorded before handoff.
