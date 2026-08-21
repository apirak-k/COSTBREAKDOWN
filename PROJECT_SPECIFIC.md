# Project Specific Rules: Cost Breakdown
**Date Updated**: 2026-08-19  
**Purpose**: Defines the stable constraints, security rules, and design systems specific to the Cost Breakdown project. All AI agents MUST strictly adhere to these rules.

---

## 1. Human-AI Safety Gate (Strict Execution Protocol)
* **Default to Explanation**: If the user's prompt is a question, observation, or lacks a clear action verb (e.g., "why is this happening?", "where is the file?"), the AI MUST stay in "Explanation Mode" and is strictly forbidden from modifying files or running modifying commands.
* **Zero Blind Guessing**: If requirements are ambiguous, the AI MUST pause, present the ambiguity, offer a recommended default with engineering rationale, and wait for user confirmation.
* **Review Mode = Read-Only**: When instructed to "Review", the AI must perform a 100% read-only analysis with ZERO file modifications.

---

## 2. Confidentiality & Git Security (Poka-Yoke)
* **Zero Real Data on Remote**: Raw factory data, real pricing, and proprietary workflows must NEVER be committed. 
* **Strict .gitignore**: The `Sources/` directory and any files containing confidential factory data must be strictly ignored. 
* **No Accidental Pushes**: The AI must explicitly verify that no sensitive files are staged before suggesting or executing any Git commit/push commands.

---

## 3. Excel Template Verification Standard
* **Pure Input Rule**: Input templates (e.g., `CostModel_BLANK_TEMPLATE.xlsx`) must have 100% empty yellow input cells before distribution. No dummy data allowed in the blank template.
* **Formula Shielding**: All calculation cells (e.g., in `2_COST_BREAKDOWN`) MUST be wrapped in `=IFERROR(...)` or `=IF(...)` to ensure no `#VALUE!`, `#REF!`, or `#DIV/0!` errors display when input cells are empty.
* **Excel as Primary Source of Truth**: The Excel model is the foundational bedrock. Every calculation, cell reference, and standard in the web platform MUST strictly mirror the verified Excel model.

---

## 4. Anti-AI Design System (Human-Crafted Engineering UI)
* **Minimalist & Functional**: UI must reflect a professional industrial utility. STRICTLY FORBIDDEN: Generative AI design clichés (e.g., dark-purple neon gradients, deep nested cards, excessive shadows like `shadow-lg` or `shadow-xl`).
* **Pure Sharp Industrial Aesthetics (Zero Border Radius)**: All UI elements, buttons, cards, panels, inputs, modals, tags, and badges MUST use strictly 0px border radius (sharp 90-degree corners, `rounded-none`). No rounded or curved corners are permitted.
* **Color Palette**: Stick to neutral and industrial palettes (Slate, Emerald, Amber, White, Gray). 
* **Fluid Responsiveness**: Layouts must dynamically adjust to any screen size (Mobile to Ultrawide). STRICTLY FORBIDDEN: Hardcoded fixed widths (e.g., `w-[500px]`). Use fluid utility classes (`w-full`, `max-w-7xl`, `grid`, `flex-wrap`) to prevent horizontal overflow.


---

## 5. Strategic Development Philosophy (User Directives)
* **Excel-First Validation (Source of Truth)**: Focus on making the Excel models (`CostModel_RGOM-024.xlsx` & `CostModel_BLANK_TEMPLATE.xlsx`) 100% mathematically solid, error-free, and audit-proof before building complex secondary features.
* **Real-World Factory Usability & Add-On Flexibility**:
  * The system must allow users to take existing master data and seamlessly **Add-On** new items, processes, or import external files.
  * The core utility is **Standard Comparison (Reference vs. Active Gap)** and **Detailed Breakdown (BOM item-by-item & Routing op-by-op)**. Once this core is working and robust, other advanced features (What-If, Simulation) will naturally follow with ease.
  * The web interface must simply mirror the verified Excel logic while adding convenient interactive aids (search, modals, Poka-Yoke guards, live recalculation).

---

## 6. System Language Standard (100% Pure English UI)
* **English-Only System Interface**: All system labels, table headers, navigation items, buttons, modal titles, KPI cards, tooltips, and system-generated summaries MUST be strictly in English.
* **User Input Exception**: Thai language is permitted ONLY when entered by human end-users in dynamic input fields (e.g. custom product descriptions, manual action plan text, or operator notes).

