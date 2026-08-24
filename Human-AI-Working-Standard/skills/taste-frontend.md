# Taste Frontend Skill — High-Taste & Anti-Slop UI Guidelines

**Purpose**: Guides AI agents to produce elegant, human-crafted, and highly readable web interfaces for engineering, analytical, and enterprise dashboards. Eliminates generic "AI slop" tropes and ensures maximum visual clarity without eye fatigue.

---

## 1. Core Design Philosophy: Clarity, Breathing Room & Visual Comfort

The ultimate metric of UI quality is **how effortlessly a human can scan, understand, and interact with the data without visual exhaustion**:

1. **Generous Breathing Room (Whitespace is Functional)**:
   - Avoid cramming data into suffocating micro-boxes.
   - Use consistent padding scales (`p-4` to `p-6` for cards, `py-2.5` to `py-3` for table rows).
   - Maintain healthy separation between distinct logical sections (`space-y-4` or `space-y-6`).

2. **Intentional Typographic Hierarchy & Tabular Numerics**:
   - **Body & Headings**: Clean, high-legibility sans-serif (`font-sans` like Inter, Geist, or system UI).
   - **Numbers & Currencies**: Always use tabular numbers (`font-mono tabular-nums`) so decimal points align vertically across rows.
   - **Weight Hierarchy**: Primary totals in bold high-contrast (`text-slate-900 font-bold`), supporting labels in muted tones (`text-slate-500 font-normal`).

3. **Restrained, Purposeful Color Palette**:
   - **Base Canvas**: Soft off-white backgrounds (`bg-slate-50/50` or `bg-slate-100/60`) with crisp pure white card surfaces (`bg-white`).
   - **Borders & Dividers**: Subtle, crisp borders (`border border-slate-200` or `border-slate-300/70`).
   - **Semantic Color Coding (Only When Meaningful)**:
     - 🟢 **Emerald**: Favorable variances, cost savings, verified confidence.
     - 🔴 **Rose**: Unfavorable cost surges, alerts, gaps.
     - 🟡 **Amber**: Editable active input cells (`bg-amber-50/80`), estimated flags.
     - 🔵 **Sky / Slate**: Neutral interactive focus states and active navigation.

4. **Natural, Refined Elevation & Geometry**:
   - Avoid aggressive 0px brutalist sharp cuts unless specifically needed, and avoid bubbly child-like pill radiuses.
   - Use balanced, modern radiuses (`rounded-lg` for cards, `rounded-md` for buttons/inputs, `rounded-sm` for tags).
   - Use subtle, elegant shadows (`shadow-xs` / `shadow-sm`) instead of blurry dark drop shadows.

5. **Crisp Micro-Interactions & Focus States**:
   - Smooth, fast feedback on interactive elements (`transition-colors duration-150 ease-out`).
   - Obvious, accessible focus rings on inputs (`focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800`).

---

## 2. Component Guidelines for High-Taste Analytics & Tables

### 2.1 Table Rows & Grid Cells
- Zebra striping or subtle row hover: `hover:bg-slate-50/70 transition-colors`.
- Editable input cells: Highlighted in soft amber `bg-amber-50/80 border border-amber-200/80 rounded focus:bg-white focus:ring-1 focus:ring-amber-500`.
- Alignment: Left-align text descriptions, Right-align numerical values and financial amounts, Center-align sequence numbers and badges.

### 2.2 KPI Summary Cards
- Prominent metric value (`text-xl font-bold font-mono tracking-tight text-slate-900`).
- Clear descriptive sub-label (`text-xs text-slate-500 font-medium uppercase tracking-wide`).
- Compact delta badge with icon and explicit direction.

### 2.3 Status Badges & Pill Indicators
- Compact, high-contrast, non-distracting badges (`px-2 py-0.5 text-[11px] font-mono font-medium rounded-full` or `rounded-md`).
- Avoid giant neon blocks that distract from the underlying data.

---

## 3. Anti-Slop Verification Checklist
- [ ] No generic dark purple neon glow gradients.
- [ ] No nested card borders 3+ layers deep.
- [ ] Decimals and numbers are aligned with tabular monospace styling.
- [ ] Colors convey specific business meaning rather than decoration.
- [ ] Sufficient whitespace around text and data tables.
