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

## Genuine pending boundaries

These are not AI choices and must not be inferred away:

- Business metric formulas and any financial treatment required for COGS, GP, GP Margin, OP, OP Margin, Sales, and Volume/Quantity.
- Trial execution, validation, approval, and promotion.
- The Master Data lifecycle/interaction items explicitly listed under `PENDING — USER DECISION NEEDED` in [`MASTER_DATA.md`](specs/MASTER_DATA.md#pending-user-decision-needed).
- Final human visual acceptance after the UI pass.

See [`REQUIREMENTS_INDEX.md`](REQUIREMENTS_INDEX.md) for the authority rules and the exact boundary between user decisions, AI choices, and genuine pending decisions.
