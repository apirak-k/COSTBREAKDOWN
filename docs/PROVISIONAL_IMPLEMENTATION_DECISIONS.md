# Provisional Implementation Decisions

**Status:** Implementation guidance only. Every entry marked `PROVISIONAL — AI CHOICE` was selected by AI because the user had not fixed that implementation detail. These choices remain reversible, do not become user requirements when implemented, and never override [`REQUIREMENTS_INDEX.md`](REQUIREMENTS_INDEX.md) or a canonical product spec.

The user does not need to approve ordinary layout, wording, component, or implementation details individually. Make a safe choice from the available context, record its rationale and constraints here, and continue. If a business formula, monetary attribution method, identity/matching rule, persistence/lifecycle behavior, destructive action, or Trial approval/promotion decision cannot be resolved from an explicit source, leave it `PENDING — USER DECISION NEEDED`, prepare the exact narrow question, and continue independent work.

## Decision record format

For each new AI-selected behavior or presentation detail, record:

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** the concrete implementation/presentation being used
- **Why:** why it is the safest useful choice from current context
- **Must preserve:** the user-finalized decisions and important constraints
- **Reversible:** what would change if the user later decides differently
- **Review trigger:** what evidence or explicit decision should cause reconsideration

Do not promote an entry to a user decision based on implementation, test results, elapsed time, or omission from a later summary. Only an explicit user decision can settle the behavior it addresses.

## Active provisional choices

### P-001 — One record-level material monetary candidate with visible factor details

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** represent a changed BOM/material finding as one monetary candidate using the comparison layer's Reference material cost, Current material cost, and record-level Gap. Show each changed input separately as Reference → Current explanatory detail underneath the record.
- **Why:** this keeps one meaningful material cost value for ranking without repeating that whole Gap as if it were a separate THB effect for Price, Usage, Loss, or every changed input.
- **Must preserve:** the finalized comparison identity and cost; `Gap = Current - Reference`; meaningful changed inputs remain visible and inspectable; added/removed/changed findings remain distinct; no field-level monetary attribution is implied.
- **Reversible:** the page may later show distinct factor findings if an explicit attribution method or a better presentation is agreed. Until then, do not assign a per-factor monetary Gap.
- **Review trigger:** a future explicit user decision about material monetary attribution or candidate grouping.
- **Related contract:** [`CANDIDATE.md`](specs/CANDIDATE.md#material-monetary-gap-and-factor-details-finalized--user-decision).

### P-002 — Engineering-first Dashboard composition

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** start the current Dashboard with settled Standard Cost results, explain Material and Processing causes, provide BOM/Work Center/Process detail, and show live Scenario A/B/C cost results when a human has selected an RCA candidate.
- **Why:** it provides a useful current dashboard from calculations that are already settled while the future business formulas remain unresolved.
- **Must preserve:** the confirmed interactive/live, executive-overview, `Result → Cause → Detail` direction; source datasets are not changed by simulation; the dashboard does not select a candidate or scenario; unresolved COGS, GP, margins, OP, Sales, and Volume/Quantity results remain explicitly unavailable, never fabricated as zero.
- **Reversible:** the ordering, layout, chart/card choices, and detail presentation can change without changing calculation rules or product flow.
- **Review trigger:** final business formulas, explicit dashboard design decisions, or human visual acceptance.
- **Related contract:** [`CROSS_CUTTING.md`](specs/CROSS_CUTTING.md#engineering-first-dashboard-while-business-formulas-are-pending) and [`design.md`](../design.md).

### P-003 — Work Center Labor/Burden Rate scenario overrides

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** keep Work Center Labor Rate and Burden Rate available as scenario-local overrides for the selected Work Center processing candidate.
- **Why:** those rates are measurable inputs to the existing Standard Cost engine, and changing a scenario copy can reuse the settled calculation without inventing a new formula.
- **Must preserve:** scenarios start from Current; they never mutate Reference or Current; cost remains calculated by the existing Standard Cost rules; only measurable existing inputs are exposed; the canonical user-finalized examples remain BOM Usage/Price/Loss and Routing Manning/Capacity/Yield.
- **Reversible:** remove or narrow the rate fields if the user later decides that scenarios should edit only the explicitly named BOM/Routing parameters.
- **Review trigger:** an explicit user decision on the scenario-editable input set.
- **Related contract:** [`RCA_SIMULATION.md`](specs/RCA_SIMULATION.md#scenarios-and-simulation-inputs).

### P-004 — Current-branch visual system and page composition

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** use the light slate/white, compact industrial-console design, typography, spacing rhythm, table density, controls, and shared page composition described in [`design.md`](../design.md). The HAWS `DESIGN.md` template was used. `feature/taste-frontend-ui` is only a read-only visual-language reference.
- **Why:** this adapts the confirmed engineering/industrial direction and the reference's useful density, contrast, and alignment to the current information architecture.
- **Must preserve:** all canonical behavior; dense data remains readable; keyboard focus and responsive access remain clear; no old product logic, lifecycle, formula, or branding is copied; the separate Excel yellow-cell rule does not affect web-table styling.
- **Reversible:** exact token values, chart types, card arrangements, and responsive composition may change during implementation or human visual review.
- **Review trigger:** a conflict with a canonical behavior requirement, accessibility/contrast findings, or human visual acceptance.

### P-005 — Keep Master Data UI state in application memory

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** keep the selected dataset side, View/Edit mode, and table view in transient `AppProvider` state for the life of the current application session. Initialize a fresh provider with Current, View, and All Tables.
- **Why:** `MasterDataPage` unmounts during navigation, so component-local state resets; the provider remains mounted while page content changes.
- **Must preserve:** same-session navigation restores the selection; this state is UI-only, is not stored on a dataset or `ProductSession`, does not enter Save/Last Saved history, and does not persist across application restart. Reference and Current data remain independent.
- **Reversible:** the internal state owner may change later as long as the same visible behavior and non-persistence boundary remain.
- **Review trigger:** an explicit session-lifecycle decision or evidence that provider state does not cover the required application session.
- **Related contract:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#page-structure-and-metadata).

### P-006 — Session-wide Master Data edit-history mechanics

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** keep one in-memory LIFO history for the active product session. A single cell edit, a pasted range, a selected-row bulk edit/delete, a reorder, metadata edit, sizing change, import, clone, clear, or reset is one Working-state history entry. The stack spans Reference/Current and BOM/Work Centers/Routing. Save changes only Last Saved and is not an Undo entry. Retain at most 100 entries.
- **Why:** the finalized requirement puts Undo/Redo at page level, and storing complete before/after snapshots makes an action made in one table reversible from the shared toolbar without coupling history to individual table components.
- **Must preserve:** history is transient and limited to Master Data Working state; it never rewrites Last Saved, creates dataset-version history, persists across restart, or changes formulas, identities, comparison semantics, or the independent Reference/Current datasets.
- **Reversible:** stack capacity and which atomic controls create one entry can change later while retaining page-level Working history and the finalized non-persistence boundary.
- **Review trigger:** an explicit history-scope decision or evidence that the snapshot-based behavior does not match the user's editing flow.
- **Related contract:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#spreadsheet-style-editing-and-row-order).

### P-007 — Reset and Export presentation before Last Saved exists

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** disable Reset and Export when the selected side has no `Last Saved` dataset, and provide a short title explaining that Reset has no saved state to restore or that the user must Save before Export.
- **Why:** both actions lack a valid source in that state, so disabling them avoids a no-op while keeping the reason discoverable.
- **Must preserve:** Reset acts only on the selected side's Working dataset and uses that side's Last Saved snapshot; Export reads only that side's Last Saved snapshot. This presentation does not create Save requirements for comparison or change dataset lifecycle.
- **Reversible:** button availability and explanatory copy can change after user feedback while keeping the finalized Reset/Export data sources intact.
- **Review trigger:** explicit user feedback or an accessibility/usability finding.
- **Related contract:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#dataset-lifecycle).

### P-008 — Confirm Master Data Clear

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** ask for confirmation before clearing the viewed side's Working dataset, including when it appears empty.
- **Why:** Clear is an explicitly destructive action and the source agreement permits a confirmation; one consistent prompt reduces accidental activation without changing what Clear removes.
- **Must preserve:** after confirmation, only the viewed side's Working metadata, Dataset Remark, rows, and Sizing are cleared; its Last Saved state and the other side remain unchanged.
- **Reversible:** the prompt can become conditional or be removed after an explicit interaction decision; it does not alter the Clear operation itself.
- **Review trigger:** explicit user feedback about confirmation frequency or a confirmed interaction rule.
- **Related contract:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#dataset-lifecycle).

### P-009 — Full-width compact Master Data work surface

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** let the shared workspace and Master Data tables use the available viewport width; keep horizontal scrolling inside each table region; target 36-pixel table rows with 32-pixel editable controls and compact cell padding.
- **Why:** the nested page-width caps and 52-pixel editable rows leave less room for the dense engineering data the page is meant to support.
- **Must preserve:** BOM → Work Centers → Routing order, sticky identity/selection column, table-local scrolling, visible focus states, operable action controls, and the finalized spreadsheet editing and selection interactions.
- **Reversible:** page gutters, width behavior, row height, and padding can be adjusted after visual review without changing table data or interaction behavior.
- **Review trigger:** human visual acceptance, responsive review, or accessibility/usability findings.
- **Related contract:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#uxui-directions) and [`design.md`](../design.md#4-spacing-radius--elevation).

### P-010 — Determine Clone readiness from copied content

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** after either Clone direction copies the opposite Working snapshot, mark the destination Prepared when it contains entered/imported metadata or business rows; ignore untouched generated Sizing placeholders and generated defaults alone. The destination status is recalculated from the copied snapshot and does not inherit the source readiness flag.
- **Why:** the user finalized that Clone must copy regardless of the source's readiness status and adopted the recommendation to recalculate destination readiness from the copied data. Existing placeholder checks distinguish generated empty sizing rows from entered/imported rows without treating them as business input.
- **Must preserve:** Clone is never gated by source readiness; copy all opposite-side Working content and its Sizing; do not change destination Last Saved or the other side; do not change calculation, comparison, matching, or cost semantics; leave missing cost inputs visible and non-blocking.
- **Reversible:** the readiness content-detection criterion can change if the user clarifies what should count as prepared; the two-way copy and no-gate behavior remain user-finalized.
- **Review trigger:** a later explicit user decision about readiness, or evidence that metadata/record detection mislabels a copied dataset.
- **Related contract:** [`MASTER_DATA.md`](specs/MASTER_DATA.md#dataset-lifecycle).

### P-011 — Adapt the left-side dashboard chart to the available snapshots

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** render a stacked vertical bar for Reference and Current using Material, Labor, and Burden; show Selling Price as a line on the same THB/pc scale when values are available. Label the chart as a Reference/Current comparison, not a monthly trend. If a snapshot's required cost components are unavailable, do not draw a complete-looking total bar for that side.
- **Why:** this follows the user's confirmed left-side stacked-bar visual direction and the reference's Selling Price line while using only the existing snapshot pair, settled Standard Cost components, and already-entered Selling Price metadata.
- **Must preserve:** do not include MatVAR/LBVAR/BDVAR; do not calculate monetary SG&A, COGS, GP, GP Margin, OP, OP Margin, Sales, or Volume/Quantity from guesses; do not turn missing values into zero; keep Labor + Burden as the Processing/Conversion subtotal without counting that subtotal as another stack segment; do not invent monthly history or period averages.
- **Reversible:** the snapshot labels, exact chart geometry, colors, axis ticks, and whether the Selling Price line is shown can change after visual review without changing product calculations or dataset behavior.
- **Review trigger:** human visual review or a later approved time-series data source/business formula.
- **Related contract:** [`CROSS_CUTTING.md`](specs/CROSS_CUTTING.md#business-analysis-confirmed-direction-and-scope) and [`design.md`](../design.md#dashboard-chart).

### P-012 — Lead the Dashboard with the result and largest cost movement

- **Status:** `PROVISIONAL — AI CHOICE`
- **Choice:** show the net Reference/Current Standard Cost result first, state whether Current is higher or lower, identify the largest known Material or Processing component Gap, then present the chart, relevant input context, cause breakdown, and record/process detail.
- **Why:** make the confirmed `Result → Cause → Detail` story understandable at a glance while using only settled comparison values.
- **Must preserve:** Gap remains Current − Reference; positive and negative directions stay explicit; missing values remain unavailable; OP remains a required metric and can be negative, but its numeric value stays unavailable until its formula is confirmed; do not add unrelated metrics, new business formulas, or fabricated periods.
- **Reversible:** headline wording, emphasis, component summary placement, and responsive layout may change after visual review without changing calculation behavior.
- **Review trigger:** human visual review of whether the result and its main cost movement are clear on first view.
- **Related contract:** [`CROSS_CUTTING.md`](specs/CROSS_CUTTING.md#business-analysis-confirmed-direction-and-scope) and [`design.md`](../design.md#dashboard-story-order).

## Genuine pending boundaries

These are not AI choices and must not be inferred away:

- Business metric formulas and any financial treatment required for COGS, GP, GP Margin, OP, OP Margin, Sales, and Volume/Quantity.
- Trial execution, validation, approval, and promotion.
- The Master Data lifecycle/interaction items explicitly listed under `PENDING — USER DECISION NEEDED` in [`MASTER_DATA.md`](specs/MASTER_DATA.md#pending-user-decision-needed).

## Human review checkpoint

Final human visual acceptance after the UI pass has not been recorded. This is a review checkpoint, not a product rule or a reason to pause reversible implementation choices.

See [`REQUIREMENTS_INDEX.md`](REQUIREMENTS_INDEX.md) for the authority rules and the exact boundary between user decisions, AI choices, and genuine pending decisions.
