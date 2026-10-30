# Simulation Graph — Final Requirements

**Status:** Requirement CLOSED / Finalized  
**Implementation status at the recorded checkpoint:** Implemented; Chrome responsive browser verification PASS at 1440×900, 1280×900, 768×900, and 390×844 (2026-10-17). Physical MacBook Neo display scaling, touch, and screen-reader behavior were NOT VERIFIED at that checkpoint. Later verification records are maintained on `dev`.
**Primary concept:** `Simulation Cost Structure`

---

## 1. Purpose

This document defines the finalized visual, interaction, calculation-display, filtering, tooltip, ruler, and auto-fit requirements for the Simulation cost structure graph.

This is a Graph/view-layer requirement. It must not reopen or alter Simulation business logic.

---

# 2. Scope Boundaries

## In scope

- graph title
- visible cost structure composition
- REF / CUR / SIM state bars
- GAP 1 / GAP 2 bars
- Standard Cost display
- Legend view filtering
- Material / Labor / Burden / SG&A / Profit display
- Selling Price overlay
- Y-axis and unit
- graph auto-fit / scale
- Ruler
- tooltips
- color treatment
- responsive rendering
- accessibility/interaction behavior
- verifier expectations for the Graph

## Out of scope

Do **not** change:

- Simulation source data
- Result data
- ScenarioStory source values
- formulas
- Gap formulas
- economics
- Clone / Send / Reset semantics
- Master Data
- Cost Breakdown business logic

The Graph is a **view of existing data**, not a second calculation system.

---

# 3. Title

The title must be exactly:

```text
Simulation Cost Structure
```

In the graph header, keep the title on the left. The title/legend layout and divider must switch at the same responsive breakpoint: use a subtle 1px vertical divider when they are side-by-side, and horizontal separation with no vertical divider when they are stacked. Preserve wrapping and prevent an intermediate state where side-by-side content still has a top border or the page overflows horizontally.

---

# 4. Graph Structure

The graph presents five horizontal categories/states in order:

```text
REF   GAP 1   CUR   GAP 2   SIM
```

Meaning:

```text
REF   = Reference Cost Structure
CUR   = Current Cost Structure
SIM   = Simulation Cost Structure
GAP 1 = Current − Reference
GAP 2 = Simulation − Current
```

The Gap formulas are finalized and must not be redefined.

---

# 5. Standard Cost Semantics

## 5.1 Standard Cost composition

Standard Cost is:

```text
Material + Labor + Burden
```

SG&A and Profit are **not** part of Standard Cost.

## 5.2 REF / CUR / SIM Standard Cost display

REF, CUR, and SIM must each show a clearly readable Standard Cost value at the boundary where the visible Material + Labor + Burden stack ends.

Preferred final placement:

```text
        Profit
        SG&A
 65.00  ← displayed Standard Cost value/boundary
        Burden
        Labor
        Material
        REF
```

Important:

- the Standard Cost value is associated with the top of the Material/Labor/Burden portion
- the visible Material/Labor/Burden region is grouped with a subtle neutral/slate outline, following the currently visible contributors
- the outline is not filled and is not another cost segment
- SG&A / Profit may continue visually above it
- do not add an unnecessary heavy black divider merely to represent Standard Cost
- do not make the group outline compete with the ruler
- leave a small visible gap between the Standard Cost number and the outline; move only the number, not the bar or outline
- Standard Cost text/value styling should follow the Cost Breakdown Standard Cost visual language

## 5.3 State-specific tooltip

The Standard Cost value must have concise state-specific meaning:

```text
Reference Standard Cost
Current Standard Cost
Simulation Standard Cost
```

A concise value line may be included, for example:

```text
Current Standard Cost
84.25 THB/PC
```

Do not use long explanatory paragraphs.

---

# 6. Legend = Graph View Filter Only

This is a critical finalized rule.

Legend toggles control **what is visible in the Graph only**.

They must not mutate:

- Simulation source data
- Result
- ScenarioStory
- business calculations

## 6.1 Canonical example

Full visible Standard Cost:

```text
Material = 4
Labor    = 3
Burden   = 3
Visible Standard Cost = 10
```

Hide Labor:

```text
Material = 4
Burden   = 3
Visible Standard Cost = 7
```

Expected Graph behavior:

- Labor disappears
- Labor reserves no empty stack space
- remaining visible stack reflows contiguously
- visible Standard Cost changes from `10` to `7`
- Standard Cost value/marker remains visible and moves to the new visible boundary
- graph scale reacts to the currently visible data
- underlying source/result Standard Cost remains unchanged

Re-enable Labor:

```text
Visible Standard Cost returns to 10
```

## 6.2 SG&A / Profit filters

Hiding or showing SG&A / Profit must not alter Standard Cost because Standard Cost is still Material + Labor + Burden only.

---

# 7. Legend Items

Visible legend labels are exactly:

```text
Material
Labor
Burden
SG&A
Profit +
Profit −
Selling Price
Ruler
```

Use square swatches for the six stacked bar series. Show Selling Price as a solid line with a centered circular marker; show the Ruler as a dashed line without a marker. Do not use square swatches for either line series.

---

# 8. Legend ON / OFF Visual State

The legend must clearly show which items are ON or OFF.

## 8.1 ON

Use a filled color indicator/swatch.

Example:

```text
■ Material   ■ Labor   ■ Burden
```

## 8.2 OFF

Keep the text readable, but show the indicator as visibly inactive.

Preferred treatment:

```text
■ Material   □ Labor   ■ Burden
```

where the OFF item uses an empty/outline indicator rather than making the entire label nearly invisible.

Requirements:

- ON vs OFF must be obvious at a glance
- OFF text must remain readable
- OFF bar-series squares (Material, Labor, Burden, SG&A, Profit +, and Profit −) are hollow with a transparent interior and retain that series' original border color
- OFF line-series samples (Selling Price and Ruler) use a clearly visible neutral/muted gray line and marker
- do not fade the entire item to near-invisibility
- do not make OFF look permanently disabled/unusable

---

# 9. Profit + / Profit −

Profit sign filters are independent.

- positive Profit is visible only when `Profit +` is enabled
- negative Profit is visible only when `Profit −` is enabled
- do not synthesize a sign
- preserve actual sign and stack direction

A negative Profit must remain negative and visually extend in the correct direction.

---

# 10. GAP 1 / GAP 2

## 10.1 Final formulas

```text
Gap 1 = Current Standard Cost − Reference Standard Cost
Gap 2 = Simulation Standard Cost − Current Standard Cost
```

Never redefine Gap 2 as Simulation − Reference.

## 10.2 Gap bars remain three-part Standard Cost gaps

The Gap bars remain composed of the three Standard Cost contributors:

```text
Material contribution
Labor contribution
Burden contribution
```

They retain the three corresponding colors.

Do **not** replace a Gap bar with a single neutral block merely because the total is a Standard Cost gap.

Example concept:

```text
REF                GAP 1                 CUR
┌────────┐        ┌────────┐           ┌────────┐
│ Burden │        │ Burden │           │ Burden │
│ Labor  │        │ Labor  │           │ Labor  │
│Material│        │Material│           │Material│
└────────┘        └────────┘           └────────┘
 STD 65             +16.05               STD 81.05
```

## 10.3 Legend filtering applies to visible Gap geometry

If a Standard Cost contributor is hidden from the Graph, its visible Gap contribution is also hidden, remaining visible Gap parts reflow, and the visible Graph total/geometry adapts.

Underlying Gap calculations do not change.

---

# 11. Remove Unrequested / Redundant Floating Top Values

Do not show ambiguous floating numeric values above the bars when they are not explicitly meaningful to the user.

The previously observed top values that looked like an unexplained full-stack / Selling-Price-equivalent total should be removed.

Requirement:

- do not show a redundant top-of-stack number merely because the full economic stack algebraically reaches Selling Price
- do not duplicate Selling Price numerically on each REF/CUR/SIM bar
- keep only values that have a clear semantic meaning, such as Standard Cost and the dedicated ruler value

---

# 12. Selling Price

Selling Price is a separate graph overlay / reference value, not Standard Cost.

Requirements:

- it participates in Y-axis range only when `Selling Price` legend item is ON
- hiding Selling Price removes it from visible geometry/range considerations
- do not fold Selling Price into Standard Cost
- do not duplicate it as unexplained top labels on state bars

---

# 13. Y-Axis

## 13.1 Visible axis line

The graph must have a clearly visible Y-axis line, not only floating tick labels.

## 13.2 Dynamic unit

Use the resolved unit:

```text
THB/<unit>
```

Examples:

```text
THB/PC
THB/SET
```

If no specific unit can be resolved, use the actual defined fallback such as:

```text
THB/Unit
```

Do not hard-code one unit when another unit is actually resolved.

## 13.3 Axis label placement

The unit label must visually belong to the Y-axis.

Render `THB/<UOM>` horizontally above or at the top of the Y-axis. Do not rotate it vertically beside the axis. Keep it dynamically resolved for the product and visibly attached to the axis.

Concept:

```text
      THB/PC
        │
 250 ───┼────────────
        │
 200 ───┼────────────
        │
 150 ───┼────────────
        │
 100 ───┼────────────
        │
  50 ───┼────────────
        │
   0 ───┼────────────
```

Verify this visually in a real browser at desktop, laptop, narrow, and small/mobile widths; the presence of a matching text node alone is not sufficient evidence.

---

# 14. Auto-Fit / Dynamic Graph Scale

`Auto-fit` means the graph's Y-axis domain/range must adapt to the **currently visible Graph values**.

It must not remain fixed at a stale maximum when visible values change.

## 14.1 Example

If Selling Price is visible and the highest visible value is around 250:

```text
Y max may be approximately 275
```

If Selling Price is hidden and the highest visible graph value becomes around 80:

```text
Y max should shrink to an appropriate range, e.g. around 90–100
```

The bars should use the available vertical space in a balanced way.

Do not leave the graph like this:

```text
275 ─────────────
    │
    │
    │
 80 │ ███
```

when 80 is now the highest visible value.

It should refit closer to:

```text
100 ─────────────
    │
 80 │ ███
    │ ███
    │ ███
  0 └────────────
```

## 14.2 Legend interaction

Auto-fit recalculates when visible series change via legend toggles.

## 14.3 Selling Price

Selling Price affects range only while visible.

## 14.4 Ruler

Ruler must clamp safely into the new valid visible range when the scale changes.

---

# 15. Colors

## 15.1 Standard Cost contributors

Material / Labor / Burden follow the Cost Breakdown visual language.

Known CBD palette reference:

```text
Material: #6F99C6
Labor:    #E5B46A
Burden:   #9A82C6
Standard Cost visual language: #334155
```

## 15.2 Solid-color rule for the whole graph

All visible bar segments should use **normal solid colors**.

Do not achieve softness by reducing opacity and making the entire graph washed out.

Final rule:

```text
lighter shade is acceptable
but opacity remains solid / normal
```

This applies to:

- Material
- Labor
- Burden
- SG&A
- Profit +
- Profit −
- other visible bar segments

## 15.3 Standard Cost styling

Standard Cost text/value/boundary language should visually align with CBD's Standard Cost treatment.

Do not add a heavy black line simply to mark Standard Cost if the value/boundary is already clear.

---

# 16. Ruler

The ruler is a visual comparison guide only.

It must never modify Simulation data.

## 16.1 Visual appearance

The ruler should remain visually clean.

No visible interaction frame should appear around the graph/ruler when:

- clicked
- pressed
- dragged
- focused by keyboard
- reached via Tab

Do not show:

- focus outline
- ring
- focus box
- large interaction rectangle

The ruler itself should remain visually unchanged while interacting.

## 16.2 Invisible hit area is allowed

A larger invisible hit target may exist to make pointer/touch interaction easier.

The interaction area must not become a visible box.

## 16.3 Interaction support

Preserve:

- pointer drag
- keyboard accessibility
- narrow/local interaction ownership
- gentle snapping

Snap softly to every visible cost-stack boundary in REF / CUR / SIM (zero, each visible Material/Labor/Burden cumulative boundary, visible Standard Cost, SG&A end, Profit end), visible Selling Price, and applicable GAP boundaries. The ruler remains freely movable between boundaries and snaps only when close; do not turn it into discrete steps.

Do not create a full-plot transparent interaction layer.

## 16.4 Ruler value on the right

The ruler must show its current numeric value immediately to the right of `plotRight`, in a dedicated inset gutter. Start-align the value at the gutter's left edge and bound its rendered text width within the right side of the SVG viewBox so it remains visible without clipping. Keep the dashed line endpoint at the graph plot edge; the numeric label occupies the separate gutter.

Example:

```text
275 ─────────────────────────────── 275.00
```

When moved:

```text
183 ─────────────────────────────── 183.00
```

The value follows the ruler position.

---

# 17. Tooltips

Tooltips must be **short, specific, and useful**.

Do not write long explanatory paragraphs.

Use a controlled tooltip for graph data that appears immediately on hover or keyboard focus and disappears immediately on leave/blur. Keep it stable while the pointer moves between adjacent graph segments. Remove native SVG `<title>` tooltips from data elements and do not show a tooltip over blank graph space. Preserve the graph name and description for assistive technology with ARIA or equivalent hidden accessible content.

The visible category labels themselves use this same custom tooltip behavior, with the exact mappings below. Informational graph targets use the normal/default cursor; do not use `cursor-help` or a pointer cursor. The draggable ruler retains `ns-resize`.

## 17.1 State labels

```text
REF → Reference Cost Structure
CUR → Current Cost Structure
SIM → Simulation Cost Structure
```

## 17.2 Gap labels

```text
GAP 1 → Current − Reference
GAP 2 → Simulation − Current
```

A concise value line may be added:

```text
Gap 1 · Current − Reference
+16.05 THB/PC
```

## 17.3 Standard Cost

```text
Reference Standard Cost
Current Standard Cost
Simulation Standard Cost
```

Optional concise value line:

```text
Current Standard Cost
84.25 THB/PC
```

## 17.4 No meaningless verbosity

Avoid tooltips that restate obvious UI text, explain implementation details, or contain unnecessary prose.

---

# 18. Responsive Rendering

The graph should remain usable as its container changes size.

Requirements:

- categories remain readable
- bars remain visually balanced
- labels do not collide unnecessarily
- legend remains usable
- graph does not depend on a fixed pixel width
- Selling Price marker remains circular, lines and text do not visibly distort, the grouped Standard Cost outline remains aligned, and no horizontal overflow appears

Retain the current SVG viewBox scaling unless browser inspection shows actual visible distortion. Verify the rendered UI at desktop-wide, laptop, narrow, and small/mobile widths.

Chrome inspection found visible circle and text distortion with the previous non-uniform scaling. The graph now preserves its aspect ratio, uses intrinsic SVG height below 640px, and slightly enlarges SVG text on small screens. Re-check these behaviors in the browser after future changes.

This responsive behavior is separate from the **data-driven Y-axis auto-fit** requirement in Section 14.

---

# 19. Source / Result Immutability

Legend interaction, tooltips, ruler movement, and graph auto-fit are view-layer actions only.

They must not mutate:

- Simulation source snapshot
- Result
- ScenarioStory
- Reference / Current / Simulation business values

Example:

```text
Actual source Standard Cost = 10
Hide Labor in Graph
Visible Graph Standard Cost = 7
Actual source Standard Cost remains 10
```

---

# 20. Example — Desired Graph Semantics

Illustrative concept only:

```text
Simulation Cost Structure

 THB/PC │
        │                         ───────── Selling Price
        │
        │        Profit                Profit                 Profit
        │        SG&A                  SG&A                   SG&A
        │        65.00                 81.05                  118.51
        │   [visible STD boundary] [visible STD boundary] [visible STD boundary]
        │       Burden                Burden                 Burden
        │       Labor                 Labor                  Labor
        │       Material              Material               Material
        │           │       GAP 1         │       GAP 2          │
        └────────────────────────────────────────────────────────────
                    REF                CUR                    SIM

Gap 1 remains a Material/Labor/Burden contribution bar.
Gap 2 remains a Material/Labor/Burden contribution bar.
```

If Labor is hidden:

```text
visible REF/CUR/SIM Standard Cost values reduce by visible Labor amount
Labor segments disappear everywhere in the Graph view
Gap Labor contribution disappears from visible Gap geometry
remaining visible segments reflow contiguously
source data remains unchanged
Y-axis auto-fits to the remaining visible values
```

---

# 21. Graph Verification Checklist

- [ ] Title is exactly `Simulation Cost Structure`
- [ ] REF tooltip says `Reference Cost Structure`
- [ ] CUR tooltip says `Current Cost Structure`
- [ ] SIM tooltip says `Simulation Cost Structure`
- [ ] GAP 1 tooltip clearly says `Current − Reference`
- [ ] GAP 2 tooltip clearly says `Simulation − Current`
- [ ] Gap 1 formula remains Current − Reference
- [ ] Gap 2 formula remains Simulation − Current
- [ ] Gap bars retain Material/Labor/Burden contribution colors
- [ ] REF/CUR/SIM show Standard Cost at the MAT+LB+BD boundary
- [ ] Standard Cost values have a small deliberate visual gap from their outlines without moving the bars or outlines
- [ ] visible MAT/LB/BD region has a neutral outline without an added fill/segment
- [ ] Reference Standard Cost tooltip is correct
- [ ] Current Standard Cost tooltip is correct
- [ ] Simulation Standard Cost tooltip is correct
- [ ] Standard Cost excludes SG&A and Profit
- [ ] Hide Labor changes visible Standard Cost (e.g. 10 → 7)
- [ ] Standard Cost display does not disappear when one cost contributor is hidden
- [ ] Hidden cost contributor reserves no stack space
- [ ] Remaining visible stack reflows contiguously
- [ ] Hiding SG&A does not change Standard Cost
- [ ] Hiding Profit does not change Standard Cost
- [ ] Source/Result/ScenarioStory does not mutate from legend filtering
- [ ] Legend labels are full names
- [ ] ON vs OFF legend state is immediately distinguishable
- [ ] OFF text remains readable
- [ ] OFF bar-series squares are hollow and retain their original series-colored borders
- [ ] OFF Selling Price and Ruler line samples are clearly visible in neutral/muted gray
- [ ] Selling Price legend uses a solid line with a centered circle
- [ ] Ruler legend uses a dashed line without a marker
- [ ] Legend is in the graph header with a responsive title divider
- [ ] Side-by-side title/legend has a vertical divider; stacked title/legend has horizontal separation and no vertical divider at the same breakpoint as the layout change
- [ ] Profit + only controls positive Profit
- [ ] Profit − only controls negative Profit
- [ ] Actual Profit sign is preserved
- [ ] Unexplained/redundant floating top values are removed
- [ ] Selling Price remains separate from Standard Cost
- [ ] Selling Price influences scale only while visible
- [ ] Y-axis line is visibly present
- [ ] Y-axis UOM resolves dynamically as THB/<unit>
- [ ] Y-axis unit is visually associated with the axis at multiple browser widths
- [ ] Y-axis unit is horizontal above/at the top of the axis, never rotated vertically beside it
- [ ] Graph auto-fits to currently visible values
- [ ] Hide Selling Price causes range to refit when appropriate
- [ ] Legend changes cause range to refit
- [ ] Ruler clamps safely after range changes
- [ ] All bar colors are solid, not faded by low opacity
- [ ] Material/Labor/Burden remain consistent with CBD visual language
- [ ] Standard Cost styling aligns with CBD visual language
- [ ] Ruler stays visually clean during click/drag/focus/Tab
- [ ] No visible focus frame/outline/ring covers the ruler/graph
- [ ] Invisible larger hit area may exist without becoming visible
- [ ] Ruler keeps pointer drag
- [ ] Ruler keeps keyboard interaction
- [ ] Ruler value is visible on the right and follows the ruler
- [ ] Ruler softly snaps to every visible stack boundary and remains free-moving between boundaries
- [ ] Tooltip wording remains concise
- [ ] Data tooltips appear immediately on hover/focus and disappear on leave/blur
- [ ] The five category labels themselves map REF → Reference Cost Structure, GAP 1 → Current − Reference, CUR → Current Cost Structure, GAP 2 → Simulation − Current, and SIM → Simulation Cost Structure
- [ ] Informational tooltip targets use the normal/default cursor; the ruler retains `ns-resize`
- [ ] Blank SVG space shows no native Simulation Cost Structure tooltip
- [ ] Graph remains responsive to container width
- [ ] Selling Price circle, graph geometry, and text remain undistorted across tested widths
- [ ] No horizontal overflow appears across tested widths
- [ ] No Graph interaction changes business data

---

# 22. Verifier Requirements

Automated verification must validate the finalized semantics, not preserve stale rendered expectations.

At minimum, a focused Graph verifier should cover:

1. full visible cost stack:

```text
Material 4 + Labor 3 + Burden 3 = visible Standard Cost 10
```

2. hide Labor:

```text
Material 4 + Burden 3 = visible Standard Cost 7
```

3. Standard Cost display remains present at 7

4. hiding SG&A / Profit does not alter Standard Cost

5. hidden segments reserve no visual stack space

6. source story/result values remain unchanged

7. Gap 1 remains Current − Reference

8. Gap 2 remains Simulation − Current

9. Gap visual contributions remain Material/Labor/Burden based

If an existing verifier expects the full economic stack / Selling-Price-equivalent total as the REF/CUR/SIM displayed Standard Cost, that expectation is stale and must be corrected rather than forcing the UI back to the wrong behavior.

The focused verifier must also check that the Y-axis unit is horizontal and at the top of the axis, Standard Cost text has a deliberate non-pixel-fragile gap from its outline, all five category labels use the exact custom tooltip mappings, informational targets do not use `cursor-help`, bar OFF markers keep their own colored outlines while line OFF markers become neutral, and the title/legend divider breakpoint matches the header layout breakpoint.

---

# 23. Closure Criteria

The Graph may be considered **CLOSED** only when:

1. all finalized requirements above are implemented,
2. the visible Standard Cost semantics are correct,
3. Graph filtering does not mutate source data,
4. Standard Cost remains visible and follows current visible MAT/LB/BD,
5. Gap semantics and three-part Gap visual are preserved,
6. ambiguous top labels are removed,
7. Y-axis / unit / auto-fit are visibly correct,
8. ruler is visually clean and still usable,
9. legend ON/OFF state is clear,
10. colors are solid and readable,
11. tooltips are concise and meaningful,
12. focused verifier expectations are updated to match the final contract,
13. browser verification passes for representative legend/ruler/resize interactions,
14. any physically unverified interaction is explicitly reported as `NOT VERIFIED` rather than assumed to pass.

