# Taste Frontend Skill — High-Taste, Distinctive & Anti-Slop UI Guidelines

**Purpose**: Guides AI agents to produce elegant, human-crafted, distinctive, and highly readable web interfaces for engineering, analytical, and enterprise dashboards. Eliminates generic "AI slop" tropes and ensures maximum visual clarity, intentional typography, crisp microcopy, and visual comfort.

---

## 1. Core Design Philosophy: Clarity, Distinctiveness & Visual Comfort

Approach UI development as a **Design Lead** who crafts deliberate, distinctive interfaces tailored specifically to the subject matter. The ultimate metric of UI quality is **how effortlessly a human can scan, understand, and interact with the data without visual exhaustion**:

1. **Generous Breathing Room (Whitespace is Functional)**:
   - Avoid cramming data into suffocating micro-boxes.
   - Use consistent padding scales (`p-4` to `p-6` for cards, `py-2.5` to `py-3` for table rows).
   - Maintain healthy separation between distinct logical sections (`space-y-4` or `space-y-6`).

2. **Intentional Typographic Hierarchy & Tabular Numerics**:
   - **Body & Headings**: Clean, high-legibility sans-serif (`font-sans` like Inter, Geist, or system UI).
   - **Numbers & Currencies**: Always use tabular numbers (`font-mono tabular-nums`) so decimal points and digits align vertically across rows.
   - **Weight Hierarchy**: Primary totals in bold high-contrast (`text-slate-900 font-bold`), supporting labels in muted tones (`text-slate-500 font-normal`).
   - Treat type treatment as a memorable part of the design, not just a neutral container.

3. **Restrained, Purposeful Color Palette**:
   - **Base Canvas**: Soft off-white backgrounds (`bg-slate-50/50` or `bg-slate-100/60`) with crisp pure white card surfaces (`bg-white`).
   - **Borders & Dividers**: Subtle, crisp borders (`border border-slate-200` or `border-slate-300/70`).
   - **Semantic Color Coding (Only When Meaningful)**:
     - 🟢 **Emerald**: Favorable variances, cost savings, verified confidence.
     - 🔴 **Rose**: Unfavorable cost surges, alerts, critical gaps.
     - 🟡 **Amber**: Editable active input cells (`bg-amber-50/80`), estimated flags.
     - 🔵 **Sky / Slate**: Neutral interactive focus states, active tab navigation.

4. **Natural, Refined Elevation & Geometry**:
   - Avoid aggressive 0px brutalist sharp cuts unless specifically asked, and avoid bubbly child-like pill radiuses.
   - Use balanced, modern radiuses (`rounded-lg` for cards, `rounded-md` for buttons/inputs, `rounded-sm` for tags).
   - Use subtle, elegant shadows (`shadow-xs` / `shadow-sm`) instead of heavy, blurry dark drop shadows.

5. **Crisp Micro-Interactions & Focus States**:
   - Smooth, fast feedback on interactive elements (`transition-colors duration-150 ease-out`).
   - Obvious, accessible focus rings on inputs (`focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800`).
   - Respect reduced motion and avoid excessive animated flourishes that scream "AI-generated".

---

## 2. Avoiding AI Design Clichés & Templated Slop

AI-generated interfaces tend to fall into repetitive defaults. Be conscious to avoid:
- **Trope 1: Generic Neon Dark-Mode**: Pitch-black canvas with saturated cyan/purple neon glow borders.
- **Trope 2: Pretend Editorial Vintage**: Warm cream `#F4F1EA` with high-contrast serif and terracotta accents on analytical enterprise tools where it doesn't belong.
- **Trope 3: Meaningless Numbered Markers**: Slapping `01 / 02 / 03` on lists or features that are not actually sequential steps.
- **Trope 4: Over-Nested Card Russian Dolls**: Cards inside cards inside cards (3+ border layers deep). Use subtle surface tinting or dividers instead.

---

## 3. UI Microcopy & Intentional Writing

Words are visual and functional design materials. Poor copy makes a great design feel templated:

1. **User-Centric Action Verbs**:
   - Name controls by what happens when clicked: `"Export Excel"`, `"Save changes"`, `"Calculate Breakdown"` — never generic `"Submit"` or `"Proceed"`.
2. **Consistency Across User Flow**:
   - A button that says `"Recalculate"` should trigger a status/toast that says `"Recalculated"`.
3. **Actionable Empty & Error States**:
   - Don't apologize vaguely (*"Oops! Something went wrong"*). State exactly what happened and provide the single clear action to resolve it (*"No cost data found for this product. Upload a BOM or select a template to start."*).
4. **Clean, Uncluttered Labels**:
   - Let each UI element do one job. Avoid noisy helper text when the field label and placeholder already make the intent obvious.

---

## 4. Two-Pass Execution Process (Plan -> Critique -> Build)

When building new components or redesigning screens:

- **Pass 1 (Design Tokens & Signature Element)**:
  1. Identify the **Signature Element** — the 1 memorable, high-value component this screen will be known for (e.g., interactive Cost Tree Waterfall, Live Margin Simulator, Variance Inspector).
  2. Define the token palette (4–6 cohesive colors) and typography scale.
- **Pass 2 (Self-Critique & Implementation)**:
  1. Review against generic defaults: *Does this look like a generic template, or is it custom-tailored to the domain?*
  2. Write clean, accessible Tailwind CSS/React code adhering to the tokens.

---

## 5. Component Patterns for Financial & Engineering Tables

### 5.1 Table Rows & Data Grid
- Zebra striping or subtle row hover: `hover:bg-slate-50/70 transition-colors`.
- **Editable input cells**: Highlighted in soft amber `bg-amber-50/80 border border-amber-200/80 rounded focus:bg-white focus:ring-1 focus:ring-amber-500 font-mono`.
- **Alignment Rules**:
  - Left-align: Text labels, part names, descriptions.
  - Right-align: Numerical quantities, currency amounts, percentages, cost totals.
  - Center-align: Status badges, action icons, sequence numbers.

### 5.2 Metric / KPI Summary Cards
- Prominent metric value (`text-2xl font-bold font-mono tracking-tight text-slate-900`).
- Descriptive sub-label (`text-xs text-slate-500 font-medium uppercase tracking-wide`).
- Compact delta badge with icon and explicit direction (Emerald for reduction/savings, Rose for overrun).

### 5.3 Status Badges & Pill Indicators
- Compact, high-contrast, non-distracting badges (`px-2 py-0.5 text-[11px] font-mono font-medium rounded-md`).

---

## 6. Anti-Slop Verification Checklist
- [ ] Decimals and numbers use `font-mono tabular-nums` and right-alignment.
- [ ] No generic purple/cyan neon glow gradients or meaningless `01/02/03` decorations.
- [ ] No nested card borders 3+ layers deep.
- [ ] Colors convey specific business/cost meaning rather than arbitrary decoration.
- [ ] Button labels and microcopy use explicit action verbs (e.g. "Save changes" vs "Submit").
- [ ] Sufficient whitespace and clear visual hierarchy across all viewports.

