# Project Specific Rules: Cost Breakdown
**Date Updated**: 2026-09-23
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
* **Excel as Verified Calculation Reference**: The verified Excel model is the mathematical reference and an external input/evidence source. The application's canonical working dataset is `CostSnapshot`; source values and provenance MUST remain available, and the web platform MUST NOT silently write back to the source workbook.

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
* **Excel-First Validation (Calculation Reference)**: Focus on making the verified Excel calculations (`CostModel_RGOM-024.xlsx` & `CostModel_BLANK_TEMPLATE.xlsx`) mathematically solid, error-free, and audit-proof while the web uses validated Product Datasets for working edits and comparison.
* **Real-World Factory Usability & Add-On Flexibility**:
  * The system must allow users to take existing master data and seamlessly **Add-On** new items, processes, or import external files.
  * The core utility is **Standard Comparison (Reference vs. Current Gap)** and **Detailed Breakdown (BOM item-by-item & Routing op-by-op)**. Once this core is working and robust, other advanced features (What-If, Simulation) will naturally follow with ease.
  * The web interface must simply mirror the verified Excel logic while adding convenient interactive aids (search, modals, Poka-Yoke guards, live recalculation).

---

## 6. System Language Standard (100% Pure English UI)
* **English-Only System Interface**: All system labels, table headers, navigation items, buttons, modal titles, KPI cards, tooltips, and system-generated summaries MUST be strictly in English.
* **User Input Exception**: Thai language is permitted ONLY when entered by human end-users in dynamic input fields (e.g. custom product descriptions, manual action plan text, or operator notes).

---

## 7. Data Versioning Standard
* **Three-State Model**: Every dataset instance (per product) MUST be in exactly one of three states: **Archived** (retained history, read-only), **Active** (the single source used for live calculation), or **Draft** (being edited, not yet used for calculation).
* **Single Active Constraint**: Only ONE Active version may exist per product at any time. Promoting a Draft to Active must archive the previously Active version rather than deleting it.
* **One-Way Source Exchange**: Excel can enter the system through the canonical one-Product import contract, and the web must never auto-write changes back to the source workbook. Manual edits and clones are allowed in Draft `CostSnapshot` datasets; they remain distinguishable from the original source values.

## 8. Data Confidence Standard
* **Per-Field Confidence Tag**: Every input field MUST carry one of three confidence statuses: **Verified** (backed by a real source reference), **Estimated** (a placeholder or assumption, with a stated basis), or **Missing** (not yet provided).
* **Visible Quality State**: Estimated, Missing, Invalid, Warning, and Needs Review values must remain visible. The system must not invent a fallback value; affected calculations may show `N/A` or a review state while unaffected valid data continues to calculate.
* **Visible Roll-Up**: Data-quality status must be visually distinguishable per field or row and rolled up into an actionable summary; the UI must not imply verification merely because a numeric fallback was produced.
* **Candidate Selection Warning**: When ranking cost drivers for candidate selection, the system must flag any candidate whose cost gap is materially derived from Estimated or Missing fields, so it is not mistaken for a verified finding.

