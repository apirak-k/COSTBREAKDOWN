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

- **Status:** `SUPERSEDED — USER DECISION (2026-10-17)`
- **Earlier AI choice:** Disable Reset and Export when the viewed dataset has no `Last Saved` dataset, and explain why through a tooltip.
- **Final decision:** Master Data toolbar actions stay enabled and visually active regardless of dataset state. Reset restores the latest `Last Saved` snapshot when one exists, otherwise the initial `Working` reset baseline. Export always exports the current `Working` snapshot, including unsaved edits.
- **Authority:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#session-lifecycle) and [`MASTER_DATA_TOOLBAR_PREPARE_UX.md`](specs/MASTER_DATA_TOOLBAR_PREPARE_UX.md#master-data-interaction-and-dataset-correction--2026-10-17).

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

### P-013 — First fixed Simulation workspace layout prototype

- **Status:** `SUPERSEDED` by the user's later Simulation decisions in P-014 and P-015.
- **Choice:** at the existing `xl` desktop breakpoint, allocate the upper and lower workspace rows at flex weights `1.25:1` (upper:lower); split the upper row into Graph and right-side block at `1.5:1`, giving approximately 60% to Graph; split the right-side block into Business/Economic and Result/Break-even columns at `0.7:1.3`, giving approximately 14% and 26% of the upper workspace to those areas; split Business and the combined Economic section at `0.95:2.45`; split Result and Break-even heights at `1.2:0.8`. Keep BOM and RTG at `1:1`. Use one outer Business/Economic card with a main split and a lighter inset Outcome divider inside Economic. The two main headings, subordinate Outcome, shared Outcome unit, numeric-only three rows, and Break-even graph-heading result follow the latest explicit user decisions. Display the first Economic input as **Variable Action Cost** with its `THB/<UOM>` unit beside it; display the whole quantity in the Break-even graph heading, with QTY at the axis right end (SVG x=540, y=149, end-aligned, 10px SVG type) and existing accessibility preserved. Inset Outcome by the Economic section’s existing 10px padding. Shift the Main Graph SVG plot content left by 16 SVG units. For the one-row `xl` header documented in [`SIMULATION.md`](specs/SIMULATION.md#5-graph-story), use 4px header and Legend item gaps, an additional 8px Show all margin (12px effective separation), 6px Legend divider padding, and 1px horizontal control padding; place Show all immediately after Ruler; use Copy, Send, and RotateCcw for 32px Result actions, adapting the existing 120ms hover-open/150ms leave delay and click-pin language; retain the 24px control height and 11px label size.
- **Why:** these reversible allocations follow the user's visual direction: a slightly wider Graph and Result, a narrower middle column, cleaner single-card Business/Economic presentation, and less left-side plot whitespace.
- **Must preserve:** the approved column order and independence, current mobile stacking, all existing Simulation calculations, formulas, input state and validation, Result data/actions, Break-even formulas and Batch Size drag/keyboard/accessibility behavior (with visible floating Break-even popups removed per the latest user instruction), main graph calculations, placement and tooltip behavior, and BOM/RTG table behavior.
- **Reversible:** all prototype weights and fixed panel sizing can be tuned after inspection of the rendered layout; they are not finalized UX requirements.
- **Review trigger:** the next visual review of the populated Simulation page or a later explicit user layout decision.
- **Related contract:** [`SIMULATION.md`](specs/SIMULATION.md#6-page-layout-and-navigation) and [`HANDOFF.md`](../HANDOFF.md).

## Product Decisions Are Complete (0 Pending Decisions)

All product requirements and lifecycle boundaries are complete under the finalized authority chain:
- **Master Data:** Reference, Current, and Custom datasets; Clone semantics; structural changes owned by Master Data / Custom; exact Sizing row counts, truncation, blank row semantics, and Excel round-trip behavior.
- **CBD:** Before and After independently select Reference, Current, or Custom; all nine ordered pairs including self-pairs are valid; the default remains Reference → Current; Gap = After − Before. Process/Routing remains the processing Candidate; Work Center remains calculation context.
- **Candidate & RCA:** Legacy saved-case compatibility only. Candidate/finding inspection and selection remain inside CBD; no standalone Candidate/Ranking/RCA page or active RCA-to-Simulation workflow. Compatible historical RCA records may retain one/multiple Candidate associations and Case-level Root Cause / Why? and Action semantics.
- **Simulation — current finalized decisions:** use the current Reference / Current / Custom role-local architecture, defaults, reset behavior, shared comparison selector, fixed graph story, and Result layout in [`SIMULATION.md`](specs/SIMULATION.md) and [`FINAL_LOGIC_SPEC.md`](specs/FINAL_LOGIC_SPEC.md). The older Current/SIM behavior recorded in earlier implementation history is superseded.
- **Simulation — remaining implementation choices:** exact responsive breakpoint, compact spacing, ruler snap tolerance, and minor menu/feedback placement may be adjusted after visual review as long as the explicit behavior above remains intact. The 2026-10-20 table, layout, and Break-even presentation corrections are user-decided in P-015.
- **Business Outputs:** Selling Price overrides, SG&A%, SG&A amount, and OP formulas. Negative OP represents operating loss and remains visible.
- **Out of Scope:** MatVAR/LBVAR/BDVAR, additional business metrics (COGS, GP, GP Margin, OP Margin, Sales, historical time-series), and full Trial execution/validation/approval/promotion workflows are classified as **OUT OF SCOPE**.

### P-014 — Final Simulation upper-workspace proportions

- **Status:** `SUPERSEDED` by the user's 2026-10-20 follow-up recorded in P-015.
- **Choice:** use three direct desktop columns in the ratio `2.82:1.48:1` (about 53.2% Graph, 27.9% Result/Break-even, and 18.9% Business/Economic). Split the middle column vertically at `1.4:1` (about 58.3% Result and 41.7% Break-even). This replaces P-013's first 60% Graph prototype allocation.
- **Why:** the graph remains the primary analytical visual, while Result and Break-even retain a readable shared column and Business/Economic gains practical input width.
- **Must preserve:** fixed graph meaning and geometry, current calculations, compact Result hierarchy, usable Business/Economic controls, mobile stacking, and the existing internally scrolling BOM/RTG tables.
- **Reversible:** the direct grid fractions and split can be tuned after a representative desktop visual review without changing any data or behavior.
- **Review trigger:** a rendered desktop size shows cramped controls, unreadable Result/Break-even content, or unused workspace that materially weakens the hierarchy.

### P-015 — Focused Simulation and Master Data UI correction

- **Status:** `USER-DECIDED — IMPLEMENTED`; supporting visual details remain `PROVISIONAL — AI CHOICE`.
- **User-decided behavior and hierarchy:** restore the actual historical Master Data table header and NONE/ALL `#` control appearance from commit `29b47f5b50d7b91636a0e1a7e1b8da7e828e2be6`; retain canonical NONE/MIXED/ALL semantics and adapt only MIXED. Keep Simulation BOM and Routing as continuous vertical scroll tables with every filtered/ordered row rendered, native scrolling, about four normal desktop rows visible, always-visible independent Material/Process Search, a viewport range derived from actual scrolling, and triangle controls that move one row. Search defines selection scope across all eligible filtered matches, including rows outside the viewport, while hidden selections persist. Separate Economic Outcome's monetary rows from Break-even Qty and display its own unit; preserve the subdued graph heading and current ruler correction. On desktop, Graph remains largest, Business/Economic is narrower than its older layout with readable labels, reclaimed space benefits Result/Break-even, and the workspace uses its width efficiently.
- **Implementation choices:** the current exact grid fractions `2.82:1.63:.85` may remain when visually effective, but were not selected by the user and are not a product requirement. The footer shade and the intermediate mixed-state slate treatment are also implementation choices. Preserve the content-sized minimum on Business/Economic if needed for readable labels.
- **Must preserve:** all data, identity, calculation, validation, history, and selection semantics outside the stated filtered search scope; graph dimensions and all non-ruler geometry; the Result/Break-even vertical split; responsive layouts; no Master Data footer in Simulation.
- **Related contract:** [`SIMULATION.md`](specs/SIMULATION.md), [`Simulation_BOM_RTG_Final_Requirements.md`](161069/Simulation_BOM_RTG_Final_Requirements.md), [`Simulation_Graph_Final_Requirements.md`](161069/Simulation_Graph_Final_Requirements.md), and [`HANDOFF.md`](../HANDOFF.md).

### P-016 — Pre-Round-4B layout, column track, and table minimum geometry

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** concrete implementation geometry used during pre-Round-4B work:
  1. Simulation desktop table column tracks (e.g. `5% | 16.5% | 10.6% | 13.5% | 13.5% | 17% | 18.9% | 5%` or earlier iterations).
  2. Simulation upper workspace grid split and Result/Break-even vertical split (e.g. `1.4:1` or `58% / 42%`).
  3. Cost Breakdown summary table minimum widths (`624px` / `652px`) and Candidate table minimum widths (`1240px` BOM, `1260px` Routing).
- **Why:** these provisional values were chosen by AI to address functional layout targets: single-line BOM/Routing headers, Status gutter `>= 8px`, four-fraction ordinary decimal reserve, signed scientific Total floor, and local panel scrolling without page overflow.
- **Must preserve:**
  - Invariant: `actual rendered header text center = numeric slot/input frame center = ordinary decimal anchor`.
  - Result containment: at normal desktop/tablet layout, Result must NOT have internal horizontal or vertical scrollbars merely to fit the workspace, and must NEVER overflow vertically into or overlap Break-even. Any ratio or layout that causes Result to overlap Break-even is unacceptable.
  - Hierarchy: Main Graph remains largest; Business/Economic remains compact with readable labels; Result and Break-even share the middle column.
  - Ordinary-first presentation: ordinary values (such as `4.00`, `5.00`, `8.00`, `12.00`, `15.00`, `5.00 %`, `84.00 %`, `90.00 %`, `97.00 %`, `98.00 %`) must remain in ordinary notation whenever the rendered region has room, and must never fall back to scientific notation merely due to conservative reservations or fit calculation errors.
  - No horizontal page overflow.
- **Reversible:** all exact column percentages, grid ratios, and table pixel minimums remain reversible AI implementation choices. Implementation may statically rebalance the split or adjust track widths while preserving the required hierarchy and invariants. They do NOT become canonical user requirements merely because they were committed or shipped.
- **Review trigger:** external visual audit findings, layout clipping, Result↔Break-even overlap, or unnecessary scrollbars.
- **Related contracts:** [`CROSS_CUTTING.md`](specs/CROSS_CUTTING.md), [`SIMULATION.md`](specs/SIMULATION.md), and [`COST_BREAKDOWN.md`](specs/COST_BREAKDOWN.md).

## Human Review Checkpoint

Human visual review is an implementation verification checkpoint. It does not make the explicit Simulation decisions above provisional.
