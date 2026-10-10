# Design System Specification — COSTBREAKDOWN

> HAWS Design Spec template, adapted for the current Cost Breakdown UI pass.
> This file describes visual presentation; product behavior remains defined by
> `docs/specs/`.

**Implementation target:** the active COSTBREAKDOWN implementation selected by
the current task. This design contract is branch-agnostic. Keep
`feature/taste-frontend-ui` as a read-only visual reference; do not switch to or
merge it as the implementation target.

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
  Reference, Current, and Custom must be visible in a useful place; their exact
  placement is not finalized. These directions are recorded in
  [`MASTER_DATA.md`](docs/specs/MASTER_DATA.md).
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
- `CONFIRMED DIRECTION — USER DECISION`: the Dashboard/result overview is
  integrated into the Simulation result flow. It tells a **Result → Cause →
  Detail** story, gives an executive overview with details on demand, and
  updates with simulation. The user-supplied reference confirms a left-side
  stacked vertical cost chart with Selling Price as a line. The current
  Reference/Current data does not provide monthly history, and formulas remain
  governed by [`CROSS_CUTTING.md`](docs/specs/CROSS_CUTTING.md).
- Keep Cost Breakdown's path from total Gap through category and BOM/Work
  Center/Process detail to changed fields, and keep `Review warnings (N)` as a
  collapsed disclosure [`COST_BREAKDOWN.md`:L31-L50;
  `CROSS_CUTTING.md`:L64-L68].
- Follow the finalized Selling Price, SG&A, and OP formulas in
  [`FINAL_LOGIC_SPEC.md`](docs/specs/FINAL_LOGIC_SPEC.md). Metrics classified as
  OUT OF SCOPE remain unavailable and must not be implied; never fill a visual
  slot with guessed values [`CROSS_CUTTING.md`](docs/specs/CROSS_CUTTING.md).
- For a material finding, show the record-level comparison Gap and the changed
  inputs as Reference → Current details. Do not attach invented THB effects to
  Price, Usage, Loss, or another individual factor; do not repeat the whole
  material Gap beside each factor [`CANDIDATE.md`:L13-L22].
- An RCA Case is formed from human-selected Candidate(s) (1 or multiple) and
  completes with Root Cause / Why? and Action; Simulation is optional and
  independent. Do not use visual emphasis or default selection to imply an
  automatic RCA target [`CANDIDATE.md`](docs/specs/CANDIDATE.md) and [`SIMULATION.md`](docs/specs/SIMULATION.md).

### Shared page composition — PROVISIONAL — AI CHOICE

Use this as a reversible layout starting point. It keeps the confirmed chart
on the left, with the headline comparison beside it on wide screens. Exact
geometry remains provisional and the layout stacks with the chart first on
narrow screens:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Primary page navigation                         compact context │
├─────────────────────────────────────────────────────────────────┤
│ Page title and task actions                                      │
│ Scope / dataset / filter controls when the page requires them    │
├─────────────────────────────────────────────────────────────────┤
│ Left: stacked cost chart                Right: result summary     │
│ Cause or comparison explanation                                  │
│ Detail table / drill-down / disclosure                           │
└─────────────────────────────────────────────────────────────────┘
```

Keep page content left-aligned. Use grouped summary metrics only where they
help answer the page's main question; use detail on demand. This composition
may be revised when it conflicts with an explicit product requirement or
human visual review.

### Simulation storytelling graph

The left-side stacked bar and Selling Price line are confirmed visual direction.
The finalized three-state story adapts that direction to Reference → Current →
Simulated after a scenario is selected. Component colors, numeric scale,
incomplete input handling, and responsive geometry are `PROVISIONAL — AI CHOICE`;
the superseded two-state dashboard chart remains provenance in
[`PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md#p-011--adapt-the-left-side-dashboard-chart-to-the-available-snapshots).
Use only settled Material, Labor, and Burden calculations. Do not add excluded
variance categories or guessed business measures. Do not present snapshots as a
monthly trend.

### Simulation story order

Use the finalized flow: Simulation supports flexible scenario evaluation (single scenario, A/B comparison, or multiple scenarios; exact A/B is not mandatory). When a scenario is viewed or selected, show it as Simulated in the Reference → Current → Simulated story. Keep
supporting detail available on demand, show finalized Selling Price, SG&A, and
OP when inputs permit, and preserve negative OP as a loss. Avoid repeating
candidate details already available in Cost Breakdown and Candidate
Prioritization. Do not add invented financial values or historical periods.

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

The app uses a viewport-height shell: Header at the top, an internally scrolling
Main region, and a non-overlay Footer locked to the bottom. Header, Main, and
Footer content share the centered `max-w-[1440px]` frame. Master Data's
selected-dataset toolbar and metadata stay together at the top of its content
scroll area, as required by
[`MASTER_DATA.md`](docs/specs/MASTER_DATA.md#page-structure-and-metadata)
[L28-L30]. Keep the footer visually quiet and do not label it `Workspace`.

## 5. Component Anatomy & UI Guidelines

### Navigation and shared frame

- **PROVISIONAL — AI CHOICE:** use a compact dark-slate top navigation band with
  the current page clearly marked. Keep the page navigation usable at narrow
  widths by allowing it to scroll or reflow without covering page content.
- Keep the confirmed shared workflow status/context and active Selected
  Comparison state recognizable where relevant, outside the Global Header.
  Their placement, wording, and control styling remain governed by
  [`CROSS_CUTTING.md`](docs/specs/CROSS_CUTTING.md#shared-status-and-analysis-context)
  where the latest explicit page contract does not define them.
- Treat the shared Header as one compact workspace bar with three desktop zones:
  `COSTBREAKDOWN` and safely resolved Product (Unit) context at the left;
  centered Master Data / Cost Breakdown / Candidate / Simulation navigation;
  and Undo, Redo, then an icon-only Info control for Prepare Dataset at the
  right. Give the product name stronger visual weight than its smaller,
  lighter secondary product context. Reflow below desktop widths. Do not place Search, workflow status, a
  workflow CTA, warning text, or additional navigation in the Header. Undo and
  Redo stay visible but are enabled only on Master Data when the existing
  history allows them. Keep Search local to the Master Data toolbar.
- Remove `CB`, `Product Cost Analysis`, and the bottom-left `Workspace` label
  per the confirmed Master Data visual direction. Do not replace them with a
  decorative slogan or redundant branding.
- Keep the Footer at the bottom of the viewport without overlaying Main content.
  Its compact status and Reference/Current totals stay inside the same centered
  frame; the dark Footer background spans the viewport width.

### Buttons

- **Primary:** dark slate fill, white text, concise action wording, visible
  hover and keyboard-focus states.
- **Secondary:** white/light surface, slate border, primary text.
- **Quiet:** text or subtle-surface action for non-primary controls.
- Keep action sizing compact but operable. Icon-only actions use consistent
  neutral controls with accessible names, tooltips, and visible focus. Header
  Undo/Redo stay visible and are enabled only for available Master Data
  history. Master Data Search stays near the table controls it filters.
- Do not use hover as the only way to reveal an action.

### Panels, summaries, and forms

- Use a white surface, thin cool-gray border, and compact internal spacing.
- Use cards for top-level summaries only when they improve scanning. Avoid
  slicing every detail into identical rounded cards; tables and grouped text
  should remain the primary surface for dense data.
- Keep labels adjacent to controls. Use a clear focus ring and a distinct
  invalid-value cue. Keep validation explanation outside dense table rows when
  the spec requires dataset-level notices.
- Display non-edit numeric values with at most two decimal places and omit
  unnecessary trailing zeros. Keep calculation and stored input precision
  unchanged; show non-finite values as unavailable rather than formatting them
  as zero.
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

### Simulation, Candidate, and RCA presentation

- **Simulation result overview:** integrate the live Result → Cause → Detail
  view with Simulation. Do not add a separate Dashboard workflow or repeat
  details available in Cost Breakdown and Candidate Prioritization. Preserve
  the confirmed chart visual direction, show finalized metrics when their
  inputs permit, and omit metrics classified as OUT OF SCOPE.
- **Candidate — PROVISIONAL — AI CHOICE:** a material finding may be displayed
  as one record-level monetary item with changed input details nested beneath
  it. This presentation is reversible; keep each changed factor visible as
  Reference → Current and never repeat the record Gap as a factor-level THB
  effect. Follow [`CANDIDATE.md`](docs/specs/CANDIDATE.md) for the actual
  finding/ranking behavior.
- **Candidate, RCA Case, and Simulation:** visually distinguish Candidate
  findings, the multi-candidate RCA Case area, and Parameter/Economic
  Simulation dimensions. Do not imply scenario approval, promotion, or a Trial
  lifecycle [`CANDIDATE.md`](docs/specs/CANDIDATE.md) and
  [`SIMULATION.md`](docs/specs/SIMULATION.md).

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
   rule, destructive action, or approval/promotion lifecycle.
6. Verify actual contrast, keyboard focus, reduced-motion behavior, and
   responsive table alignment during the UI pass. This document was created
   from source inspection; browser screenshot review and human visual
   acceptance remain a later UI review checkpoint, not an unresolved business
   requirement.
