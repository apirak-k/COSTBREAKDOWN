# Provisional Implementation Decisions

**Status:** Implementation guidance only. Every entry marked `PROVISIONAL — AI CHOICE` was selected by AI because the user had not fixed that implementation detail. These choices remain reversible, do not become user requirements when implemented, and never override [`REQUIREMENTS_INDEX.md`](REQUIREMENTS_INDEX.md) or a canonical product spec.

The user does not need to approve ordinary layout, wording, component, or implementation details individually. Make a safe choice from the available context, record its rationale and constraints here, and continue. Product business rules, formulas, and boundaries are finalized in [`FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md) and the canonical specs under `docs/specs/`. Items outside defined scope (e.g. unagreed metrics or Trial execution engines) are classified as OUT OF SCOPE.

## Decision Record Format

For each new AI-selected behavior or presentation detail, record:

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** the concrete implementation/presentation being used
- **Why:** why it is the safest useful choice from current context
- **Must preserve:** the user-finalized decisions and important constraints
- **Reversible:** what would change if the user later decides differently
- **Review trigger:** what evidence or explicit decision should cause reconsideration

Do not promote an entry to a user decision based on implementation, test results, elapsed time, or omission from a later summary. Only an explicit user decision can settle the behavior it addresses.

## Choice Records (Active and Superseded)

### P-001 — One record-level material monetary candidate with visible factor details

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** represent a changed BOM/material finding as one monetary candidate using the comparison layer's Reference material cost, Current material cost, and record-level Gap. Show each changed input separately as Reference → Current explanatory detail underneath the record.
- **Why:** this keeps one meaningful material cost value for ranking without repeating that whole Gap as if it were a separate THB effect for Price, Usage, Loss, or every changed input.
- **Must preserve:** the finalized comparison identity and cost; `Gap = Current - Reference`; meaningful changed inputs remain visible and inspectable; added/removed/changed findings remain distinct; no field-level monetary attribution is implied.
- **Reversible:** the page may later show distinct factor findings if an explicit attribution method or a better presentation is agreed. Until then, do not assign a per-factor monetary Gap.
- **Review trigger:** a future explicit user decision about material monetary attribution or candidate grouping.
- **Related contract:** [`CANDIDATE.md`](specs/CANDIDATE.md#material-and-processing-candidates).

### P-002 — Engineering-first Dashboard composition

- **Status:** Superseded by the user's later decision to integrate the Dashboard overview into Simulation and remove the separate workflow page. This AI choice is retained as provenance only.
- **Choice:** start the current Dashboard with settled Standard Cost results, explain Material and Processing causes, and provide BOM/Work Center/Process detail. Any Dashboard scenario summary is supplemental.
- **Why:** it provides a useful dashboard from settled calculations while only the remaining unfinalized business metrics remain unresolved.
- **Must preserve:** the confirmed interactive/live, executive-overview, `Result → Cause → Detail` direction; source datasets are not changed by simulation; finalized Selling Price, SG&A, and OP formulas are used; out-of-scope metrics are not fabricated.
- **Reversible:** the ordering, layout, chart/card choices, and detail presentation can change without changing calculation rules or product flow.
- **Review trigger:** explicit dashboard design decisions or human visual acceptance.
- **Related contract:** [`CROSS_CUTTING.md`](specs/CROSS_CUTTING.md) and [`design.md`](../design.md).

### P-003 — Work Center Labor/Burden Rate scenario overrides (superseded)

- **Status:** Superseded by the latest finalized Simulation scope in [`FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md) and [`SIMULATION.md`](specs/SIMULATION.md). Work Center Labor Rate and Burden Rate are **not SIM-editable**. Rate adjustments are prepared in Master Data / Custom prior to starting Simulation. The former AI-choice record is retained here only as provenance.

### P-004 — Current-branch visual system and page composition

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** use the light slate/white, compact industrial-console design, typography, spacing rhythm, table density, controls, and shared page composition described in [`design.md`](../design.md). The HAWS `DESIGN.md` template was used. `feature/taste-frontend-ui` is only a read-only visual-language reference.
- **Why:** this adapts the confirmed engineering/industrial direction and the reference's useful density, contrast, and alignment to the current information architecture.
- **Must preserve:** all canonical behavior; dense data remains readable; keyboard focus and responsive access remain clear; no old product logic, lifecycle, formula, or branding is copied; the separate Excel yellow-cell rule does not affect web-table styling.
- **Reversible:** exact token values, chart types, card arrangements, and responsive composition may change during implementation or human visual review.
- **Review trigger:** a conflict with a canonical behavior requirement, accessibility/contrast findings, or human visual acceptance.

### P-005 — Keep Master Data UI state in application memory across Reference, Current, and Custom

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** keep the selected dataset (`Reference`, `Current`, or `Custom`), View/Edit mode, and table view in transient `AppProvider` state for the life of the current application session. Initialize a fresh provider with Current, View, and All Tables.
- **Why:** `MasterDataPage` unmounts during navigation, so component-local state resets; the provider remains mounted while page content changes.
- **Must preserve:** same-session navigation restores the selection; this state is UI-only, is not stored on a dataset or `ProductSession`, does not enter Save/Last Saved history, and does not persist across application restart. Reference, Current, and Custom datasets remain independent.
- **Reversible:** the internal state owner may change later as long as the same visible behavior and non-persistence boundary remain.
- **Review trigger:** an explicit session-lifecycle decision or evidence that provider state does not cover the required application session.
- **Related contract:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#page-structure-and-metadata).

### P-006 — Session-wide Master Data edit-history mechanics

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** keep one in-memory LIFO history for the active product session. A single cell edit, a pasted range, a selected-row bulk edit/delete, a reorder, metadata edit, sizing change, import, clone, clear, or reset is one Working-state history entry. The stack spans Reference, Current, and Custom across BOM/Work Centers/Routing. Save changes only Last Saved and is not an Undo entry. Retain at most 100 entries.
- **Why:** the finalized requirement puts Undo/Redo at page level, and storing complete before/after snapshots makes an action made in one table reversible from the shared toolbar without coupling history to individual table components.
- **Must preserve:** history is transient and limited to Master Data Working state; it never rewrites Last Saved, creates dataset-version history, persists across restart, or changes formulas, identities, comparison semantics, or independent dataset snapshots.
- **Reversible:** stack capacity and which atomic controls create one entry can change later while retaining page-level Working history and the finalized non-persistence boundary.
- **Review trigger:** an explicit history-scope decision or evidence that the snapshot-based behavior does not match the user's editing flow.
- **Related contract:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#tables-identity-and-spreadsheet-editing).

### P-007 — Reset and Export presentation before Last Saved exists

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** disable Reset and Export when the viewed dataset has no `Last Saved` dataset, and provide a short title explaining that Reset has no saved state to restore or that the user must Save before Export.
- **Why:** both actions lack a valid source in that state, so disabling them avoids a no-op while keeping the reason discoverable.
- **Must preserve:** Reset acts only on the viewed dataset's Working state and uses that dataset's Last Saved snapshot; Export reads only that dataset's Last Saved snapshot. This presentation does not create Save requirements for comparison or change dataset lifecycle.
- **Reversible:** button availability and explanatory copy can change after user feedback while keeping the finalized Reset/Export data sources intact.
- **Review trigger:** explicit user feedback or an accessibility/usability finding.
- **Related contract:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#dataset-lifecycle).

### P-008 — Confirm Master Data Clear

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** ask for confirmation before clearing the viewed dataset's Working state, including when it appears empty.
- **Why:** Clear is an explicitly destructive action and one consistent prompt reduces accidental data loss without changing what Clear removes.
- **Must preserve:** after confirmation, only the viewed dataset's Working metadata, Dataset Remark, rows, and Sizing are cleared; its Last Saved state and other datasets remain unchanged.
- **Reversible:** the prompt can become conditional or be removed after an explicit interaction decision; it does not alter the Clear operation itself.
- **Review trigger:** explicit user feedback about confirmation frequency or a confirmed interaction rule.
- **Related contract:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#dataset-lifecycle).

### P-009 — Full-width compact Master Data work surface

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** let the shared workspace and Master Data tables use the available viewport width; keep horizontal scrolling inside each table region; target 36-pixel table rows with 32-pixel editable controls and compact cell padding.
- **Why:** nested page-width caps and tall editable rows leave less room for the dense engineering data the page is meant to support.
- **Must preserve:** BOM → Work Centers → Routing order, sticky identity/selection column, table-local scrolling, visible focus states, operable action controls, and the finalized spreadsheet editing and selection interactions.
- **Reversible:** page gutters, width behavior, row height, and padding can be adjusted after visual review without changing table data or interaction behavior.
- **Review trigger:** human visual acceptance, responsive review, or accessibility/usability findings.
- **Related contract:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#page-structure-and-metadata) and [`design.md`](../design.md).

### P-010 — Determine Clone readiness from copied content

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** when executing `Clone` (copying the chosen source Working state into the destination viewed Working state), mark the destination Prepared when it contains entered/imported metadata or business rows; ignore untouched generated Sizing placeholders and generated defaults alone. The destination status is recalculated from the copied snapshot and does not inherit the source readiness flag.
- **Why:** the user finalized that Clone must copy regardless of the source's readiness status and adopted the recommendation to recalculate destination readiness from the copied data.
- **Must preserve:** Clone is never gated by source readiness; copies all source Working content and Sizing; does not overwrite destination Last Saved or mutate the source; does not alter calculation, comparison, or cost semantics.
- **Reversible:** the readiness content-detection criterion can change if the user clarifies what should count as prepared; the generic Clone source/destination behavior remains user-finalized.
- **Review trigger:** a later explicit user decision about readiness, or evidence that metadata/record detection mislabels a copied dataset.
- **Related contract:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#generic-clone-from-semantics).

### P-011 — Adapt the left-side dashboard chart to the available snapshots

- **Status:** Superseded by the user's later decision to place the dashboard/story graph in the Simulation result flow. The visual direction remains compatible and is applied to the three-state story; the old standalone Reference/Current chart is not a separate view.
- **Choice:** render a stacked vertical bar for Reference and Current using Material, Labor, and Burden; show Selling Price as a line on the same THB/pc scale when values are available.
- **Why:** follows confirmed left-side stacked-bar visual direction and Selling Price line using existing snapshot data.
- **Must preserve:** do not include MatVAR/LBVAR/BDVAR; calculate finalized SG&A and OP only from approved inputs/formulas; do not turn missing values into zero; keep Labor + Burden as the Conversion subtotal; do not invent monthly history.
- **Reversible:** snapshot labels, chart geometry, colors, and axis ticks can change after visual review.
- **Review trigger:** human visual review or a later approved time-series data source.
- **Related contract:** [`CROSS_CUTTING.md`](specs/CROSS_CUTTING.md) and [`design.md`](../design.md).

### P-012 — Lead the Dashboard with the result and largest cost movement

- **Status:** Superseded by the user's later decision to integrate the Dashboard overview into Simulation and remove the separate workflow page. This AI choice is retained as provenance only.
- **Choice:** show the net Reference/Current Standard Cost result first, state whether Current is higher or lower, identify the largest known Material or Processing component Gap, then present the chart, relevant input context, cause breakdown, and record/process detail.
- **Why:** make the confirmed `Result → Cause → Detail` story understandable at a glance.
- **Must preserve:** Gap remains Current − Reference; positive and negative directions stay explicit; missing required inputs remain unavailable; use finalized Selling Price, SG&A, and OP formulas.
- **Reversible:** headline wording, emphasis, and layout may change after visual review without changing calculation behavior.
- **Review trigger:** human visual review.
- **Related contract:** [`CROSS_CUTTING.md`](specs/CROSS_CUTTING.md) and [`design.md`](../design.md).

## Product Decisions Are Complete (0 Pending Decisions)

All product requirements and lifecycle boundaries are complete under the finalized authority chain:
- **Master Data:** Reference, Current, and Custom datasets; Clone semantics; structural changes owned by Master Data / Custom; exact Sizing row counts, truncation, blank row semantics, and Excel round-trip behavior.
- **CBD:** Compares Reference vs Current only; Full and Selected Comparison scopes; Process/Routing as processing Candidate; Work Center as calculation context.
- **Candidate & RCA:** One RCA Case supports 1 or multiple Candidates; Root Cause / Why? and Action recorded at RCA Case level; RCA legitimately completes upon recording root cause and action; no duplicate RCA Note system.
- **Simulation:** Parameter Simulation and Economic Simulation; Start SIM From Reference, Current, or Custom; structure locked in SIM; Factors to Simulate for editing visibility with live full-dataset recalculation; BOM and Routing parameters editable; Work Center rates not editable in SIM; Economic Simulation uses Action Cost and Evaluation Quantity; economics separate from Standard Cost (not folded into MAT/LB/BD); advisory feasibility result; flexible scenario count.
- **Business Outputs:** Selling Price overrides, SG&A%, SG&A amount, and OP formulas. Negative OP represents operating loss and remains visible.
- **Out of Scope:** MatVAR/LBVAR/BDVAR, additional business metrics (COGS, GP, GP Margin, OP Margin, Sales, historical time-series), and full Trial execution/validation/approval/promotion workflows are classified as **OUT OF SCOPE**.

## Human Review Checkpoint

Final human visual acceptance after the UI pass has not been recorded. This is an implementation/verification review checkpoint, not an unresolved product decision or a reason to pause reversible implementation choices.
