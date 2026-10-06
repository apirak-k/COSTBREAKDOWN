# Design System Specification — COSTBREAKDOWN

> HAWS Design Spec template, adapted for the current Cost Breakdown UI pass.
> This file describes visual presentation; product behavior remains defined by
> `docs/specs/`.

**Implementation target:** the current working branch. At the time of this
document's inspection, that was `codex/costbreakdown-spec-source`. Continue UI
work on the current branch; do not switch to or merge `feature/taste-frontend-ui`.

**Read-only visual reference:** `feature/taste-frontend-ui` at
`f873540a6fa2bd1564c070a1164f457857762752`. It is a visual/design-language
reference only. Its product behavior, data model, calculations, wording, and
lifecycle are not requirements for this branch.

**Decision labels:**

- `FINALIZED — USER DECISION` and `CONFIRMED DIRECTION — USER DECISION` identify
  the product and visual boundaries that future UI work must preserve.
- `PROVISIONAL — AI CHOICE` identifies reversible visual choices below. They
  explain the starting design for implementation; they are not user decisions
  and do not become finalized when implemented.
- `PENDING — USER DECISION NEEDED` is reserved for unresolved product semantics.
  This visual contract does not invent those semantics.

## 1. Visual Theme & Philosophy

* **Aesthetic Direction:** `CONFIRMED DIRECTION — USER DECISION`: an
  engineering/industrial console. Keep the interface compact and information
  dense, reduce unnecessary visual weight and whitespace, fix table alignment
  and horizontal-scroll issues, and remove the old `CB`, `Product Cost
  Analysis`, and bottom-left `Workspace` chrome. Master Data totals for
  Reference and Current must be visible in a useful place; their exact
  placement is not finalized. These directions are recorded in
  [`MASTER_DATA.md`](docs/specs/MASTER_DATA.md#uxui-directions) [L34-L41].
* **Mood & Atmosphere — PROVISIONAL — AI CHOICE:** precise, calm, operational,
  and easy to scan. Use cool neutral surfaces, strong text hierarchy, crisp
  dividers, restrained semantic color, and minimal elevation. The content is
  engineering data, so the page should lead with the actual comparison or task,
  not a marketing hero or decorative illustration.
* **Target Reference:** the visual language in `feature/taste-frontend-ui` at
  the commit above. The reference uses a cool slate canvas, white work
  surfaces, dark navigation/status bands, compact typography, tabular numbers,
  and small borders [reference `src/index.css`:L5-L42;
  `src/shared/layout/AppLayout.tsx`:L14-L22; `src/shared/layout/Navbar.tsx`:L160-L172;
  `src/shared/ui/KPIStatCard.tsx`:L23-L53]. Its `Inter` and `JetBrains Mono`
  font stacks are also visual evidence [reference `tailwind.config.ts`:L10-L13].
* **Adaptation Boundary:** keep the useful density, contrast, structure, and
  industrial-console feel. Do not copy the reference's old product selector,
  dataset/version lifecycle, workflow, formulas, page behavior, or branding.
  Current product contracts are in
  [`REQUIREMENTS_INDEX.md`](docs/REQUIREMENTS_INDEX.md) and
  [`docs/specs/`](docs/specs/).

### Product and information-hierarchy anchors

These are product constraints used to place visual emphasis, not new layout
requirements:

- `FINALIZED — USER DECISION`: on first entry to Master Data in a session,
  **All Tables** is the default and displays BOM → Work Centers → Routing
  vertically [`MASTER_DATA.md`:L7, L28-L30, L67-L68].
- `CONFIRMED DIRECTION — USER DECISION`: the dashboard tells a
  **Result → Cause → Detail** story, gives an executive overview with details
  on demand, and updates with simulation. A bar-chart-first dashboard is only
  a design direction, not a finalized chart specification
  [`CROSS_CUTTING.md`:L72-L76].
- Keep Cost Breakdown's path from total Gap through category and BOM/Work
  Center/Process detail to changed fields, and keep `Review warnings (N)` as a
  collapsed disclosure [`COST_BREAKDOWN.md`:L31-L50;
  `CROSS_CUTTING.md`:L64-L68].
- Until business formulas are finalized, do not show guessed COGS, GP, margin,
  OP, or Sales values as zero. Use an explicit unavailable label such as
  **“Not calculated — formula pending”**. Do not invent financial calculations
  to fill a visual slot [`CROSS_CUTTING.md`:L72-L88].
- For a material finding, show the record-level comparison Gap and the changed
  inputs as Reference → Current details. Do not attach invented THB effects to
  Price, Usage, Loss, or another individual factor; do not repeat the whole
  material Gap beside each factor [`CANDIDATE.md`:L13-L22].
- RCA begins with a human-selected candidate; Root Cause and Action are
  optional notes, and Scenario A/B/C are independent views from Current. Do not
  use visual emphasis or default selection to imply an automatic RCA target
  [`RCA_SIMULATION.md`:L7-L23].

### Shared page composition — PROVISIONAL — AI CHOICE

Use this as a reversible layout starting point. It applies the confirmed
result-to-detail direction without fixing a specific chart, card count, or
page geometry:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Primary page navigation                         compact context │
├─────────────────────────────────────────────────────────────────┤
│ Page title and task actions                                      │
│ Scope / dataset / filter controls when the page requires them    │
├─────────────────────────────────────────────────────────────────┤
│ Result summary                                                   │
│ Cause or comparison explanation                                  │
│ Detail table / drill-down / disclosure                           │
└─────────────────────────────────────────────────────────────────┘
```

Keep page content left-aligned. Use grouped summary metrics only where they
help answer the page's main question; use detail on demand. This composition
may be revised when it conflicts with an explicit product requirement or
human visual review.

## 2. Color Palette & Semantic Tokens

**PROVISIONAL — AI CHOICE:** start with the following light workspace palette.
The slate values are drawn from the read-only visual reference and existing
current-branch shell (`src/index.css`:L5-L11). The exact values and pairings
have not been finalized by the user. Verify actual text/background pairings
for WCAG AA before release; do not use low-contrast border colors for text.

| Token | Value | Usage |
| :--- | :--- | :--- |
| `bg-canvas` | `#f1f5f9` | Main application canvas |
| `bg-surface` | `#ffffff` | Tables, grouped panels, dialogs |
| `bg-surface-muted` | `#e2e8f0` | Table headers, selected/quiet control surfaces |
| `bg-chrome` | `#0f172a` | Compact navigation and status surfaces |
| `text-primary` | `#0f172a` | Main text on light surfaces |
| `text-secondary` | `#475569` | Supporting text with readable contrast |
| `border-subtle` | `#cbd5e1` | Table rules, panel borders, control outlines |
| `action-focus` | `#2563eb` | Keyboard focus ring and active action accent |
| `status-positive` | `#047857` | Favorable/lower-cost direction when applicable |
| `status-negative` | `#be123c` | Unfavorable/higher-cost direction when applicable |
| `status-warning` | `#92400e` | Warnings and attention states |

Use semantic colors with text labels or icons as well as color. Do not assign
positive/negative meaning to an arbitrary status; comparison meaning comes
from the specs. A complete dark theme is not specified: the dark chrome above
is a surface within the light workspace, not a second theme.

## 3. Typography & Hierarchy

**PROVISIONAL — AI CHOICE:** retain the reference/current stack because it is
already present and suits dense engineering data:

- **Primary sans:** `Inter`, then system sans-serif fallbacks. Use for headings,
  labels, explanatory text, and most controls.
- **Data mono:** `JetBrains Mono`, then `Fira Code`, `Consolas`, and monospace
  fallbacks. Reserve for aligned quantities, compact technical identifiers,
  and short status readouts; do not set every label in monospace.
- **Numbers:** use tabular numerals; align quantities and currency values on
  the right and state the unit with the value.

Suggested scale for the dense workspace:

| Element | Starting size / weight |
| :--- | :--- |
| Page title | 20–22 px, semibold |
| Section heading | 14–16 px, semibold |
| Body and controls | 12–14 px, regular/medium |
| Table header | 11–12 px, medium/semibold |
| Table data | 12–13 px, regular |
| Supporting/status text | 11–12 px; avoid smaller text for essential content |
| Key numeric summary | 20–24 px, semibold, tabular numerals |

Prefer sentence case and short labels. Reserve all caps for established compact
identifiers such as `REF` and `CUR`, not repeated decorative eyebrows. Keep
paragraphs and helper copy short and left-aligned.

## 4. Spacing, Radius & Elevation

**PROVISIONAL — AI CHOICE:** use a 4 px base rhythm: 4, 8, 12, 16, 20, and 24
px. The values below express density while leaving component geometry easy to
adjust:

- **Content width:** fluid width with a starting maximum of 80 rem where a
  centered reading area helps; do not constrain wide tables to that maximum
when the app frame has usable width.
- **Responsive gutters:** 12 px on narrow screens, 16 px at medium widths, and
  24 px on wide screens.
- **Section gaps:** 12–16 px between related dense regions; 20–24 px only when
  separating major tasks.
- **Table density:** target roughly 32–36 px row heights with clear row rules
  and consistent column alignment. Keep dense controls close to their table.
- **Radius:** 2–4 px for panels, buttons, and inputs; 4–6 px for menus and
  dialogs. Avoid pills and a single large radius on every surface.
- **Elevation:** use a thin border as the default separation. Reserve a small
  shadow for overlays and floating menus; do not put a shadow on every card.

Keep the app header and footer in the shared frame while the main workspace
scrolls. Master Data's selected-dataset toolbar and metadata stay together at
the top of its content scroll area, as required by
[`MASTER_DATA.md`](docs/specs/MASTER_DATA.md#page-structure-and-metadata)
[L28-L30]. Keep the footer visually quiet and do not label it `Workspace`.

## 5. Component Anatomy & UI Guidelines

### Navigation and shared frame

- **PROVISIONAL — AI CHOICE:** use a compact dark-slate top navigation band with
  the current page clearly marked. Keep the page navigation usable at narrow
  widths by allowing it to scroll or reflow without covering page content.
- Remove `CB`, `Product Cost Analysis`, and the bottom-left `Workspace` label
  per the confirmed Master Data visual direction. Do not replace them with a
  decorative slogan or redundant branding.
- Keep the footer behavior and placement already specified for the application
  frame; this design contract does not add footer messages or behavior. The
  Reference/Current totals must be visible somewhere useful. A shared summary
  area is one provisional placement option, but its exact location remains
  open.

### Buttons

- **Primary:** dark slate fill, white text, concise action wording, visible
  hover and keyboard-focus states.
- **Secondary:** white/light surface, slate border, primary text.
- **Quiet:** text or subtle-surface action for non-primary controls.
- Keep action sizing compact but operable. Icon-only Undo/Redo controls in
  Master Data must include accessible names and visible focus, while remaining
  compact as finalized in [`MASTER_DATA.md`](docs/specs/MASTER_DATA.md#tables-identity-and-editing)
  [L77-L79].
- Do not use hover as the only way to reveal an action.

### Panels, summaries, and forms

- Use a white surface, thin cool-gray border, and compact internal spacing.
- Use cards for top-level summaries only when they improve scanning. Avoid
  slicing every detail into identical rounded cards; tables and grouped text
  should remain the primary surface for dense data.
- Keep labels adjacent to controls. Use a clear focus ring and a distinct
  invalid-value cue. Keep validation explanation outside dense table rows when
  the spec requires dataset-level notices.
- Show actual money units next to monetary values. Never style a changed
  Price/Usage/Loss input as a separate monetary contribution unless an
  attribution method is explicitly approved. Changed inputs are explanatory
  Reference → Current details; monetary Gap remains at its agreed record or
  Work Center level.

### Tables and data display

- Keep Master Data's All Tables sections in the finalized BOM → Work Centers →
  Routing order. Use compact section toolbars, consistent column alignment,
  restrained row rules, and clear edit/focus/selection states.
- Confine horizontal scrolling to the relevant table region. Prevent the
  scrollbar from shifting or misaligning the header, body, or table actions.
- Use a subtly tinted table header and white rows. A hover/selection state may
  use a light slate fill, but it must remain distinct from invalid and
  comparison-status cues.
- Align names and descriptions left; align quantities, rates, costs, and gaps
  right using tabular numerals. Show units without implying any conversion.
- Keep comparison statuses as readable text; color may reinforce them but
  must not be their only distinction. Preserve the specs' difference between
  a changed input and its cost Gap.
- Web Master Data editable cells must not inherit the yellow editable-cell
  convention from Excel. That convention is for workbook presentation only
  [`MASTER_DATA.md`:L63-L63].

### Dashboard, Candidate, and RCA presentation

- **Dashboard — PROVISIONAL — AI CHOICE:** start with settled engineering
  results, then expose cost causes and their relevant BOM/Work Center/Process
  detail. Keep business metrics visibly unavailable while their formulas are
  pending. Do not make a particular chart type or number of summary cards a
  permanent requirement.
- **Candidate — PROVISIONAL — AI CHOICE:** a material finding may be displayed
  as one record-level monetary item with changed input details nested beneath
  it. This presentation is reversible; keep each changed factor visible as
  Reference → Current and never repeat the record Gap as a factor-level THB
  effect. Follow [`CANDIDATE.md`](docs/specs/CANDIDATE.md) for the actual
  finding/ranking behavior.
- **RCA & Simulation:** visually distinguish the human-selected candidate,
  optional Root Cause/Action notes, and independent Scenario A/B/C areas. Do
  not use the design to imply that a scenario is approved, promoted, or sent to
  Trial automatically [`RCA_SIMULATION.md`](docs/specs/RCA_SIMULATION.md).

### Responsive behavior and interaction

- Use fluid layout for phone, tablet, and desktop widths. Do not introduce a
  fixed-width page or require a wide viewport for navigation.
- At narrow widths, stack the page context and controls, allow navigation to
  reflow or scroll, and keep table horizontal scroll local to the table.
- Keep essential actions visible or reachable by keyboard; include semantic
  labels, visible focus, and accessible status text.
- Use motion only to acknowledge an explicit interaction. Respect
  `prefers-reduced-motion`; avoid pulsing status indicators or decorative
  entrance animations.
- Keep contrast at WCAG AA for normal text and do not rely on color alone to
  express status.

## 6. Frontend Execution Rule for AI Agents

1. Treat this file as the visual reference for UI work on the **current
   working branch**. `feature/taste-frontend-ui` stays read-only and visual-only.
2. Product behavior comes from `docs/REQUIREMENTS_INDEX.md` and
   `docs/specs/`. If this document conflicts with a product spec, the product
   spec wins; revise the visual implementation to preserve it.
3. All choices explicitly marked `PROVISIONAL — AI CHOICE` are reversible
   presentation decisions. They were not made by the user and must not be
   upgraded to requirements because code uses them.
4. Do not copy old reference-branch behavior, formulas, data model, workflow,
   or branding. Extract visual language and adapt it to this branch's current
   information architecture.
5. Preserve honest calculation states, identity, comparison, selection,
   dataset, and scenario semantics while changing presentation. A visual slot
   does not authorize an invented formula, field attribution, persistence
   rule, destructive action, or Trial workflow.
6. Verify actual contrast, keyboard focus, reduced-motion behavior, and
   responsive table alignment during the UI pass. This document was created
   from source inspection; browser screenshot review and human visual
   acceptance are still pending.
