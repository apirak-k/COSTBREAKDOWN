# Project Specific Rules: Cost Breakdown
**Date Updated**: 2026-08-24  
**Purpose**: Defines the stable constraints, security rules, and design systems specific to the Cost Breakdown project. All AI agents MUST strictly adhere to these rules.

## Governing Standards (MANDATORY)
All AI agents MUST strictly comply with:
- [`Human-AI-Working-Standard/HAWS.md`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/Human-AI-Working-Standard/HAWS.md)
- [`Human-AI-Working-Standard/WORK_INSTRUCTIONS.md`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/Human-AI-Working-Standard/WORK_INSTRUCTIONS.md)

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

## 4. Anti-AI & High-Taste Design System (Visual Clarity & Comfort)
* **Design Lead Standard**: Refer to [`Human-AI-Working-Standard/skills/taste-frontend.md`](Human-AI-Working-Standard/skills/taste-frontend.md) for detailed UI token planning, signature element definition, and anti-slop verification.
* **Visual Clarity Over Dogma**: The primary UI goal is to be **easy to scan, easy to understand, and comfortable on the eyes without visual noise or fatigue**.
* **Anti-Slop Standard**: STRICTLY FORBIDDEN: Generative AI design clichés (e.g., dark-purple neon gradients, textureless flat surfaces, nested cards 3+ levels deep, excessive blurry drop-shadows, meaningless `01/02/03` numbering).
* **Balanced & Refined Geometry**: Use natural, modern rounded corners (`rounded-lg` for cards/panels, `rounded-md` for inputs/buttons, `rounded-full` or `rounded-sm` for badges). Avoid awkward bubbly shapes or suffocating rigid boxes.
* **Restrained Industrial Palette**: Clean neutral base (Slate, Zinc, White, Off-white), with semantic accents used strictly for financial/status meaning (Emerald for savings/verified, Rose for cost overruns, Amber for editable active inputs).
* **Tabular Numbers & Legibility**: All financial amounts, variances, and cycle times MUST use `font-mono tabular-nums` to ensure exact decimal alignment.
* **Intentional Microcopy**: Use clear, user-centric action verbs for all buttons and controls (e.g., `"Export Excel"`, `"Save changes"` instead of generic `"Submit"`). Error and empty states must provide a single clear action to proceed.
* **Fluid Responsiveness**: Layouts must dynamically adjust to any screen size (Mobile to Ultrawide) using fluid utility classes (`w-full`, `max-w-7xl`, `grid`, `flex-wrap`).




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

---

## 7. Data Versioning Standard
* **Three-State Model**: Every dataset instance (per product) MUST be in exactly one of three states: **Archived** (retained history, read-only), **Active** (the single source used for live calculation), or **Draft** (being edited, not yet used for calculation).
* **Single Active Constraint**: Only ONE Active version may exist per product at any time. Promoting a Draft to Active must archive the previously Active version rather than deleting it.
* **One-Way Data Flow**: Data flows Excel → Import → Web. The web application must never auto-write changes back to the source Excel file. To update the source of truth, the user edits the Excel file directly and re-imports it.

## 8. Data Confidence Standard
* **Per-Field Confidence Tag**: Every input field MUST carry one of three confidence statuses: **Verified** (backed by a real source reference), **Estimated** (a placeholder or assumption, with a stated basis), or **Missing** (not yet provided).
* **Non-Blocking**: Estimated or Missing values must never block calculation or navigation. The system must always compute and display a result using the best available data.
* **Visible Roll-Up**: Confidence status must be visually distinguished per field (e.g. badge/color) and rolled up into a summary confidence metric (e.g. "Data Confidence: 82% Verified") at the KPI/summary level.
* **Candidate Selection Warning**: When ranking cost drivers for candidate selection, the system must flag any candidate whose cost gap is materially derived from Estimated or Missing fields, so it is not mistaken for a verified finding.

