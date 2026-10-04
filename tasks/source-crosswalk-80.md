# Follow-up Chat Checklist Crosswalk

**Source:** [Follow-up 80-topic checklist conversation](https://chatgpt.com/s/t_6ac26aba193481918961c062fca76357)

**Compared with:** [review context](../docs/COSTBREAKDOWN_REVIEW_CONTEXT_FOR_CODEX.md), [Master Data specification](../docs/MASTER_DATA_SPEC.md), [requirements index](../docs/REQUIREMENTS_INDEX.md), [active plan](plan.md), and [task-level implementation details](todo.md).

**Status snapshot:** 2026-10-05.

**Purpose:** Keep one current row per source topic, combining context coverage, agreed scope, and implementation evidence. This is a traceability/status ledger, not an 80-feature backlog.

## How to read this crosswalk

- **Context coverage** tracks whether the context document preserves the source topic: Covered, Partial, or Missing. It does not indicate implementation status.
- **[x] PASS** means the in-scope decision or behavior has supporting evidence; it does not mean human UX acceptance.
- **[ ] PARTIAL** means some in-scope evidence or lifecycle verification remains; the row names what is still missing.
- **[ ] OPEN** means an accepted in-scope behavior still needs implementation or runtime verification.
- **DEFERRED** means the source leaves the topic for a later review or decision; it is not a current implementation failure.
- **RECORDED** means the topic is process/reference context, not a feature to implement.
- The detailed per-topic status and evidence live only in this file. [todo.md](todo.md) keeps task-level implementation/verification detail; [HANDOFF.md](../HANDOFF.md) keeps checkpoint and resume information.

## Topics 1–20

| # | Source topic | Context coverage | Decision / scope | Status | Evidence / next action |
|---:|---|---|---|---|---|
| 1 | Repository, branches, and references reviewed | Covered — context §§2.1–2.2 | Baseline/design provenance. Current branch is documented in `HANDOFF.md`; branch names do not create product requirements. | [x] PASS | Repository, branch, and source review recorded. |
| 2 | Source of truth and older agreements | Covered — context §73 and `docs/REQUIREMENTS_INDEX.md` | Older agreements continue to govern unaffected pages; later decisions supersede only the behavior they cover. | [x] PASS | Authority order and later-over-older source precedence recorded. |
| 3 | Current system baseline, including Master Data, Cost Breakdown, Candidate, RCA/Simulation | Covered — context §§3–4, 43, 52–53 | Record the existing four-page baseline so it stays distinct from new requirements. | [x] PASS | Existing four-page baseline captured. |
| 4 | Hidden ProductSession and revision state | Covered — context §§71–72 | Existing architecture is a refactor hotspot. Final session architecture and non-Selected downstream invalidation remain pending. | DEFERRED | ProductSession/revision architecture remains a future refactor decision. |
| 5 | Page-by-page review process and decision labels | Partial — context §1 describes the sequence but omits the explicit KEEP / CHANGE / REMOVE / ADD / UNDECIDED labels | Preserve the five labels for the remaining page reviews; do not collapse pending decisions into requirements. | DEFERRED | Apply KEEP / CHANGE / REMOVE / ADD / UNDECIDED during later page reviews. |
| 6 | Mentor requirement for an interactive business dashboard | Covered — context §54 | Confirmed future direction: live graph updates, executive-first story, detail on demand. Detailed dashboard design is pending. | DEFERRED | Interactive business dashboard is a future direction; detailed design remains open. |
| 7 | Business metrics mentioned by the mentor | Covered — context §§55, 62 | Metrics are required concepts; formulas and behavior remain pending. | DEFERRED | Business metrics are noted; formulas remain unspecified. |
| 8 | OP can be negative | Covered — context §56 | Confirmed requirement; formula remains pending and negative OP must not be clamped to zero. | DEFERRED | Negative OP is permitted; OP formula remains unspecified. |
| 9 | Concrete dashboard reference: Sell / Profit / Quantity, context/comments, detail chart | Partial — context §58 preserves the storytelling pattern but not these reference elements | Retain as design-reference context only; do not copy the original layout or treat it as a final chart spec. | DEFERRED | Dashboard reference elements remain design context, not a final chart spec. |
| 10 | Bar chart direction | Covered — context §57 | Design direction only; final chart form is pending. | DEFERRED | Bar-chart direction recorded; final chart choice remains open. |
| 11 | Separate engineering Cost Engine and business/P&L layer | Covered — context §§59–60 | Architecture direction; keep formulas out of UI components. Detailed business calculations remain pending. | DEFERRED | Cost Engine/P&L separation is a future architecture direction; formulas remain open. |
| 12 | MatVAR / LBVAR / BDVAR | Covered — context §63 | Explicitly undecided; do not equate them with Reference–Current Gap. | DEFERRED | MatVAR / LBVAR / BDVAR remain undecided. |
| 13 | Selling Price and SG&A metadata; possible scenario overrides | Covered — context §§17–18, 61 | Dataset metadata is agreed; business-scenario overrides are future behavior pending page review. | [x] PASS | Current Selling Price/SG&A metadata is represented in the approved schema and workbook checks. Scenario overrides are future scope under #71. |
| 14 | SG&A input as a percentage of Selling Price | Covered — context §18 | Confirmed input format; monetary treatment/formula is pending. | [x] PASS | Percent-point SG&A input was implemented and tested. Monetary treatment has no approved formula and remains deferred. |
| 15 | THB currency scope | Covered — context §§17, 64 | THB only for now; no multi-currency selector. | [x] PASS | THB-only scope is recorded; no currency selector was added. |
| 16 | Current focus and calculation correctness | Covered — context §§1, 60, 69 | Calculation integrity and domain/UI separation remain governing principles. | [x] PASS | Calculation integrity and domain/UI separation remain governing constraints. |
| 17 | Master Data Save model and session lifetime | Covered — context §§6–7 | Use session-only state with independent Reference/Current datasets and Working/Last Saved copies; no database or history. | [ ] PARTIAL | Reference and Current Save were checked separately; complete Save/Reset/Import/Export/Clear/Clone replay remains open. |
| 18 | Save Reference / Save Current independently | Covered — context §8 | Finalized; isolated-browser checks saved Reference and Current separately and showed each side enabling its own Reset/Export controls. Full lifecycle replay remains tracked under #17 and #19–23. | [x] PASS | Saved Reference and Current separately in isolated browser tabs; each side's saved state enabled its own Reset/Export controls. |
| 19 | Reset to that side's Last Saved | Covered — context §9 | Reset restores that side's Last Saved dataset. | [ ] PARTIAL | Reset confirmation was triggered, but the browser controller timed out before restoration could be observed; before-first-Save behavior also remains open. |
| 20 | Export from Last Saved only | Covered — context §10 | Export uses Last Saved data, not unsaved Working data. | [ ] OPEN | Current Save enables Export; capture the actual download and verify it contains Last Saved data. |

## Topics 21–40

| # | Source topic | Context coverage | Decision / scope | Status | Evidence / next action |
|---:|---|---|---|---|---|
| 21 | Import into current Working state | Covered — context §11 | Import replaces only the selected side's Working dataset; the opposite side remains unchanged. | [ ] OPEN | Parser/workbook checks pass; browser replacement and opposite-side isolation remain unverified. Chrome blocked local file attachment because the extension lacks file-URL access; that permission stays off. |
| 22 | Clear Working while retaining Last Saved | Covered — context §12 | Clear removes Working data while retaining Last Saved. | [ ] OPEN | Clear is implemented to affect Working only; verify the post-confirmation state and that Last Saved remains available. |
| 23 | Clone the other dataset into the currently viewed dataset | Covered — context §13 | Clone copies the opposite dataset into the viewed side, including when the source is unprepared; the destination inherits its preparation state. | [ ] PARTIAL | Clone data/sizing/isolation passed in the model verifier; both UI directions are enabled for unprepared sides, but confirmation results and readiness propagation remain unverified in the app. |
| 24 | Replace Setup with Sizing | Covered — context §19 | Replace Setup with Sizing. | [x] PASS | Sizing opened and Apply created the requested BOM/WC/Routing row counts in an isolated browser tab. |
| 25 | Put Download Template inside Sizing | Covered — context §21 | Place Download Template in the Sizing workflow. | [ ] PARTIAL | Script-level workbook/template checks passed; browser download event was not captured, and import of that browser download remains open. |
| 26 | Sizing metadata shares Master Data state | Covered — context §20 | Sizing and Master Data share one metadata state; do not duplicate metadata. | [ ] PARTIAL | Applying Product Name in Sizing updated the Master Data summary; verify both sides and the full lifecycle replay. |
| 27 | Sizing contents: metadata, row counts, Apply, template | Covered — context §19 | Sizing includes shared metadata, row counts, Apply, and template download. | [ ] PARTIAL | Metadata/counts/Apply passed in browser; actual template download and remaining sizing checks are open. |
| 28 | Remove Product Note | Covered — context §16 | Finalized; included in the approved metadata/schema reduction. | [x] PASS | Product Note was removed from the approved Product schema. |
| 29 | Replace Product Code and separate Description with Product Name | Covered — context §16 | Finalized; Product Name-based mismatch is the current rule. | [x] PASS | Product Name is the current product identity/mismatch basis. |
| 30 | Product mismatch is a non-blocking warning | Covered — context §41 | Confirmed; continue navigation and do not silently equate different products. | [x] PASS | Product mismatch remains a non-blocking warning; handoff verifier passed. |
| 31 | BOM → WC → Routing order | Covered — context §22 | Master Data table order is BOM → Work Centers → Routing. | [x] PASS | BOM → Work Centers → Routing order was checked in prior browser review. |
| 32 | BOM schema | Covered — context §23 | BOM uses the approved minimal schema. | [x] PASS | BOM schema matches the approved fields; build and workbook verifier passed. |
| 33 | WC schema | Covered — context §23 | Work Centers use the approved minimal schema. | [x] PASS | Work Center schema matches the approved fields; build and workbook verifier passed. |
| 34 | Routing schema | Covered — context §23 | Routing uses the approved minimal schema. | [x] PASS | Routing schema matches the approved fields; build and workbook verifier passed. |
| 35 | Remove legacy fields that are not needed | Covered — context §§16, 23 | Finalized principle. Operation Code and Sequence remain only as legacy compatibility data and no longer affect active Routing/Work Center processing status; the regression verifier passed in the latest bundle. | [x] PASS | Legacy Operation Code/Sequence no longer affect processing status; regression verifier passed. |
| 36 | Display-only row number `#` | Covered — context §24 | The row number is display-only; it is not identity, business data, or Routing sequence. | [x] PASS | `#` is a display/selection row number, not identity; source and browser behavior reviewed. |
| 37 | Reorder rows by drag and recalculate display number | Covered — context §25 | Dragging a selected row moves the selected group and recalculates the display row number. | [x] PASS | Dragged a selected group after another BOM row; the selected rows moved together and kept their source order. |
| 38 | Row order does not determine comparison | Covered — context §§25–26 | Comparison matches by business identity, not display order. | [x] PASS | After reordering, Full Comparison still matched BOM rows by identity rather than display position; legacy Sequence regression verifier also passed. |
| 39 | Identity keys: BOM Name, WC name, Routing Process | Covered — context §26 | Use BOM Name, Work Center name, and Routing Process as identity keys; duplicates warn instead of guessing. | [x] PASS | Process/name identity rules are in place; Routing identity and Candidate verifiers passed. |
| 40 | Excel-like table editing | Covered — context §27 | Excel-like editing includes keyboard navigation, clipboard operations, local feedback, bulk editing, and undo/redo. | [x] PASS | Isolated browser review covered keyboard navigation, clipboard editing, invalid-cell feedback, bulk edits, and undo/redo. |

## Topics 41–60

| # | Source topic | Context coverage | Decision / scope | Status | Evidence / next action |
|---:|---|---|---|---|---|
| 41 | Arrow-key navigation | Covered — context §27 | Arrow-key navigation moves through editable cells. | [x] PASS | ArrowDown/Tab/Enter moved focus through editable cells and rows in the isolated browser tab. |
| 42 | Excel copy/paste and local invalid-cell feedback | Covered — context §28 | Support Excel-style copy/paste with visible local invalid-cell feedback. | [x] PASS | TSV paste and copy/paste worked; an invalid price produced a visible cell warning and undo restored the prior value. |
| 43 | Undo/Redo is Working-edit history, not Save history | Covered — context §29 | Undo/Redo applies to Working edits, not Save history. | [x] PASS | Undo restored the prior bulk edit and Redo reapplied it in the isolated browser tab. |
| 44 | Bulk edit the edited column across selected rows | Covered — context §34 | Bulk edit applies the edited column value to selected rows. | [x] PASS | Editing one value applied it to the selected rows; Undo/Redo restored and reapplied the bulk change. |
| 45 | Apply bulk-edit behavior to all three tables | Covered — context §34 | Apply bulk-edit behavior consistently to BOM, Work Centers, and Routing. | [x] PASS | Same-column bulk edit was checked in BOM, Work Centers, and Routing. |
| 46 | Separate row selection from row reorder gestures | Covered — context §30 | Row selection and row reordering use separate gestures. | [x] PASS | Row-number selection and the separate reorder handle worked independently during range selection and group movement. |
| 47 | Dedicated row-control gutter | Covered — context §30 | Keep the dedicated reorder/row-number gutter visible during horizontal table scrolling. | [x] PASS | At 700px, horizontal scrolling kept the reorder handle and row number pinned in BOM, Work Centers, and Routing. |
| 48 | Row selection gestures | Covered — context §32 | Support row and range selection; selection does not mutate source data. | [x] PASS | Selected a Current BOM row, switched to Reference and back, and confirmed the row checkbox reset to unselected in an isolated browser tab. |
| 49 | Reorder-only drag handle; selected group may move together | Covered — context §31 | Use a dedicated reorder handle; selected rows may move together while preserving their order. | [x] PASS | The reorder-only handle moved both selected BOM rows together while preserving their order. |
| 50 | Data cells remain for editing and spreadsheet interactions | Covered — context §33 | Keep data cells directly editable and available for spreadsheet interactions. | [x] PASS | Data cells accepted direct edits and keyboard/clipboard interactions; invalid input remained visibly flagged. |
| 51 | Add rows and delete selected rows | Covered — context §35 | Allow adding and deleting rows in all three Master Data tables. | [x] PASS | Added and deleted rows in BOM, Work Centers, and Routing in an isolated browser tab. |
| 52 | Search only; no separate Master Data filter | Covered — context §36 | Search is the only Master Data query control; do not add a separate filter. | [x] PASS | Search is the single Master Data query control; no separate filter was added. |
| 53 | Routing.WC references the WC table | Covered — context §38 | Resolve Routing Work Center references against the Work Center table. | [x] PASS | Routing references Work Center data; missing-rate verifier passed without invented cost. |
| 54 | Local, non-blocking validation | Covered — context §37 | Validation is local and non-blocking; do not invent missing cost values. | [x] PASS | Local validation remains non-blocking; data-quality and missing-rate verifiers passed. |
| 55 | Master Data mockup defines the non-table page structure | Covered — context §66 | Use the screenshot for the full page structure; its BOM table is illustrative, not the only table or schema. | [x] PASS | Screenshot structure was applied across views; prior browser review checked table order/layout. |
| 56 | Header and footer roles | Covered — context §39 | The header provides application context; the Footer remains at the viewport bottom. | [x] PASS | Browser review confirmed toolbar/metadata stay pinned below navigation and the Footer stays at the viewport bottom; human visual acceptance remains separate. |
| 57 | Global status/context and links to relevant pages | Covered — context §67 | Show global status/context and links to relevant pages; exact placement is pending UX review. | [ ] OPEN | The global status/context concept is recorded; review the exact placement in the UI. |
| 58 | Warnings do not normally block navigation | Covered — context §§40, 42 | Warnings should not normally block navigation. | [x] PASS | Warnings do not block normal navigation; mismatch flow remains available. |
| 59 | Selected Comparison is optional; Full Comparison is default | Covered — context §44 | Full Comparison is the default; Selected Comparison is optional. | [x] PASS | Full Comparison is default and Selected Comparison is optional. |
| 60 | Selected scope is temporary and unrelated to Save | Covered — context §47 | Selected scope is temporary and independent of Save, export, and persistence. | [x] PASS | Selected scope is temporary and separate from Save/export state. |

## Topics 61–80

| # | Source topic | Context coverage | Decision / scope | Status | Evidence / next action |
|---:|---|---|---|---|---|
| 61 | Select BOM/Routing only; use all WC as context | Covered — context §45 | Select BOM and Routing; retain all Work Centers as calculation context. | [x] PASS | BOM/Routing are selectable and all Work Centers remain calculation context. |
| 62 | CHANGED/UNCHANGED selection is an atomic Ref/Current pair | Covered — context §46 | Select CHANGED/UNCHANGED findings as an atomic Reference/Current pair. | [x] PASS | CHANGED/UNCHANGED selection is treated as a paired Reference/Current finding. |
| 63 | ADDED/REMOVED findings are independently selectable | Covered — context §46 | ADDED and REMOVED findings are independently selectable. | [x] PASS | ADDED/REMOVED findings can be selected independently. |
| 64 | Partial selection does not remove or mutate source records | Covered — context §48 | Partial selection must not remove or mutate source records. | [x] PASS | Selected analysis preserves full source datasets and Work Center context. |
| 65 | Carry Selected scope through Cost Breakdown → Candidate → RCA/Simulation | Covered — context §49 | Carry Selected scope through Cost Breakdown → Candidate → RCA/Simulation, retaining all Work Centers as calculation context. | [x] PASS | A valid +4.0000 THB/pc Selected Gap was traced through Cost Breakdown, Candidate, and RCA/Simulation. |
| 66 | Show that Selected mode is active downstream | Covered — context §50 | Show when Selected mode is active downstream; exact indicator placement is pending UX review. | [ ] OPEN | The Selected-mode concept is recorded; review the exact indicator placement in downstream pages. |
| 67 | Exit Selected mode and return to Full Comparison | Covered — context §50 | Exiting Selected mode returns to Full Comparison. | [x] PASS | Exiting Selected mode returns to Full Comparison in prior browser review. |
| 68 | Source edits immediately clear Selected scope | Covered — context §51 | Source edits immediately clear Selected scope. | [x] PASS | Source edits cleared Selected mode in the browser; dataset-side switching also cleared row selection (#48). |
| 69 | Select Visible / Clear Visible / Use All / counts are examples, not locked controls | Missing — context §46 gives selection rules but omits these provisional control examples and their status | Select Visible, Clear Visible, Use All, and counts remain provisional examples, not locked controls. | RECORDED | Select Visible / Clear Visible / Use All stay provisional examples, not requirements. |
| 70 | Full Product result vs Selected result presentation | Covered historically — context §75 marks it pending | Selected Comparison displays only the selected-scope Gap; the later direct user decision supersedes the checklist's historical pending label. | [x] PASS | With a valid fixture, Selected mode showed only the +4.0000 THB/pc selected-scope Gap, without the Full Gap. |
| 71 | Simulation may override Selling Price and SG&A; blank falls back to Current | Covered — context §61 | Future confirmed direction; business-input simulation is not part of the active implementation scope. | DEFERRED | Selling Price/SG&A scenario overrides remain for future page review. |
| 72 | Figma is optional; sketch is acceptable; keep spec/design/plan separate | Partial — context §1 records the separation, but not that Figma is optional or sketches are acceptable | Preserve as process guidance only; no Figma dependency or design deliverable is required by this source. | RECORDED | Figma remains optional and sketches acceptable; no Figma deliverable is required. |
| 73 | Do not lock exact UX/UI before page behavior is reviewed | Covered — context §65 | Process direction; Master Data behavior is closed, while other page redesigns remain for later review. | DEFERRED | Defer locking downstream UX until each remaining page behavior is reviewed. |
| 74 | Master Data behavior/data review is closed | Covered — context §5 | Finalized; visual UX/UI and accounting formulas are outside that closure. | [x] PASS | Master Data behavior/data review is closed by the source; remaining UX acceptance is separate. |
| 75 | Consolidated list of closed Master Data decisions | Covered — context §74 | Finalized; represented in `MASTER_DATA_SPEC.md` and active Tasks 1–5. | [x] PASS | Consolidated Master Data decisions are recorded in the current spec. |
| 76 | Other pages were touched but not closed/re-reviewed | Partial — context §§43, 52–53, 75 mark redesigns pending but do not state the review status as explicitly | Candidate/RCA page redesign and Trial workflow remain later review work; Selected-scope propagation is the limited confirmed cross-page work in active Tasks 6–7. | DEFERRED | Candidate/RCA redesign and Trial review remain later scope. |
| 77 | Do not finalize listed accounting, dashboard, UX, Trial, and ProductSession items | Covered — context §75 and related §§62–72 | Keep these items pending/undecided unless a later user decision closes them. | DEFERRED | Do not finalize formulas, dashboard details, or Trial behavior without a later decision. |
| 78 | Prefer simple behavior; no unnecessary recovery/checkpoints/legacy fields | Covered — context §§16, 23, 51, 76 | Finalized design principle; invalidate Selected mode on source change without complex recovery. | [x] PASS | Simplicity/no unnecessary checkpoints principle is recorded; legacy fields are excluded from active behavior. |
| 79 | Calculation correctness before UI convenience | Covered — context §§48, 60, 69 | Confirmed; no fabricated missing-input results, no partial-scope dataset mutation, domain logic separate from presentation. | [x] PASS | Calculation correctness takes priority; missing inputs stay unavailable rather than fabricated. |
| 80 | Context file must distinguish baseline, decisions, directions, and pending items | Covered — context introduction and §76 | This status separation governs the full handoff; this crosswalk preserves it topic by topic. | [x] PASS | Baseline, decisions, directions, and pending items are separated in the source context and this checklist. |

## Audit result

- All 80 source topics appear exactly once in the combined status table. Context coverage and implementation status are separate axes.
- Current counts: **54 PASS, 6 PARTIAL, 5 OPEN, 13 DEFERRED, 2 RECORDED** (80 total). The 11 PARTIAL/OPEN rows are the active follow-up set; deferred and recorded rows are not active implementation tickets.
- Items #13–14 pass for their agreed metadata/input behavior. Scenario overrides (#71) and SG&A monetary treatment remain deferred because their formulas/behavior are not specified.
- Context-traceability gaps remain noted in the relevant rows: review-label vocabulary (#5), dashboard-reference details (#9), provisional selection-control examples (#69), and explicit not-yet-reviewed Candidate/RCA status (#76); Figma optionality (#72) is also recorded.
- The old “Full vs Selected Gap pending” note is superseded by the later direct decision in #70: Selected mode displays only the selected-scope Gap.
- Human UX acceptance remains separate from implementation evidence.
