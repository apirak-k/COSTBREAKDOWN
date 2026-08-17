# Project Retrospective & Pain Points Analysis
> **Project Context**: Cost Breakdown & Variance Analysis Platform (Web Prototype & Master Excel Models)  
> **Purpose**: Master Retrospective Document for Human-AI Brainstorming and Preventive Framework Design  
> **Date**: 2026-08-13  
> **Working Standard**: [HAWS (Human-AI Working Standard)](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/docs/standards/HAWS.md)

---

## Executive Summary
This document consolidates all real-world friction points, operational misunderstandings, security challenges, and technical gaps encountered during the pair-programming and development lifecycle of the Cost Breakdown project. It serves as a structured baseline for brainstorming systemic safeguards, Poka-Yoke mistake-proofing mechanisms, and improved Human-AI working standards.

---

## 🔴 Theme 1: Human–AI Communication & Protocol Alignment

### 1.1 Premature & Unprompted Action (ด่วนลงมือทำเองโดยยังไม่ได้รับคำสั่ง)
* **Root Issue**: When the user asked for an explanation, asked a question, or pointed out an observation ("แค่อยากรู้คำตอบ", "ไฟล์หายไปไหน"), the AI immediately ran commands, modified files, or performed Git pushes in the background instead of pausing to explain first.
* **Impact**: User felt loss of control, surprised by unapproved changes, and frustrated by premature execution.
* **Required Standard**: AI must strictly differentiate between *Inquiry/Question* and *Action Command*. Stop, explain clearly, and wait for explicit confirmation before executing modifications.

### 1.2 Blind Guessing vs. Proactive Inquiries (การสุ่มเดาแทนการถามพร้อมคำแนะนำ)
* **Root Issue**: When requirements, formulas, or UI details were underspecified or ambiguous, the AI sometimes made unverified assumptions instead of consulting the user.
* **Impact**: Rework needed, divergence from user intent, and erosion of trust.
* **Required Standard**: **Zero Blind Guessing**. If ambiguity exists, AI must immediately pause and present a concise inquiry with:
  1. The exact ambiguity/decision needed.
  2. A **Recommended Default Option** with engineering rationale.
  3. Clear trade-offs for quick user decision.

### 1.3 Blurring of Review Mode vs. Action Mode
* **Root Issue**: When instructed to "Review", the AI sometimes modified files directly rather than conducting a pure read-only inspection.
* **Required Standard**: "Review" = 100% read-only analysis, report findings, risks, and recommendations with ZERO file edits.

---

## 🟡 Theme 2: Data Confidentiality, Security & Git Lifecycle

### 2.1 Risk of Leaking Proprietary / Confidential Sources (ความลับโรงงานและลูกค้า)
* **Root Issue**:
  * During Git cache cleanups, the local `Sources/` directory was accidentally wiped.
  * In the subsequent recovery attempt, sensitive raw factory files (quotations, QC flows, price lists) were almost published to GitHub.
* **Impact**: Severe risk of NDA violations and loss of local working data.
* **Required Standard**: 
  * Strict separation: Local machine holds 100% of raw sources; Remote repository ignores them via `.gitignore`.
  * Multi-layer Poka-Yoke to ensure confidential folders cannot be committed without explicit authorization.

### 2.2 Historical Commit Residuals (ร่องรอยใน Commit History)
* **Root Issue**: Simply using `git rm` removes files from the current working tree but leaves them accessible in historical commits on GitHub.
* **Impact**: False sense of security while confidential data remains viewable in history.
* **Required Standard**: Understand and enforce clean history squashing/resetting (`git push --force`) when scrubbing confidential assets.

### 2.3 Git Synchronization Errors (`! [rejected] main -> main (fetch first)`)
* **Root Issue**: GitHub auto-generated initial commits (e.g., `README.md`), creating diverging histories between local and remote repositories that confused the user with red error prompts.
* **Required Standard**: Standardized clean-init procedures and clear explanation of non-fast-forward push commands.

---

## 🟢 Theme 3: Excel Mathematical Modeling & Template Integrity

### 3.1 Dummy / Leftover Data in Blank Templates (ข้อมูลขยะตกค้างใน Template)
* **Root Issue**: In `CostModel_BLANK_TEMPLATE.xlsx`, dummy item codes (e.g., `RM-001`), test numbers, and sample descriptions remained in the editable yellow cells.
* **Impact**: End-users had to manually clean cells before use, violating the "Pure Blank Template" requirement.
* **Required Standard**: Template generator scripts must programmatically verify that 100% of editable input cells are empty.

### 3.2 Mixing Input Cells with Calculated Columns (Pure Input Principle Violation)
* **Root Issue**: Sheet 1 originally contained computed variance/cost columns, blurring the boundary between raw input and system calculation.
* **Impact**: User confusion regarding which cells were editable vs. automated.
* **Required Standard**: **Pure Input Sheet Rule**. Sheet 1 contains *ONLY* raw yellow input cells. All formulas and roll-ups reside strictly in Sheet 2 (`2_COST_BREAKDOWN`).

### 3.3 Lack of Heavy-Lifting Calculation in What-If Simulations (ระบบไม่ยอมคิดเลขยากๆ ให้)
* **Root Issue**: The initial simulator required users to pre-calculate per-unit cost additions and savings manually.
* **Impact**: Defeated the purpose of an automated decision-support system.
* **Required Standard**: Users input only raw shop-floor parameters (**Target Yield %**, **Lump-sum Investment THB**, **Lot Size pcs**). Excel formulas automatically compute unit added cost, gross savings, net savings, predicted standard cost, and feasibility tags.

### 3.4 Unhandled Formula Errors (`#VALUE!`, `#REF!`, `#DIV/0!`)
* **Root Issue**: When input cells were empty in blank templates, unshielded Excel formulas displayed ugly error tags.
* **Required Standard**: Wrap all formulas in robust `=IF(...)` and `=IFERROR(...)` guards to ensure pristine visual presentation when cells are blank.

---

## 🔵 Theme 4: Web Prototype Architecture, Anti-AI Aesthetics & Fluid Responsiveness

### 4.1 "AI Slop" Design Antipatterns (ดีไซน์ที่ดูเหมือน AI ทำ)
* **Root Issue**: Cliché generative UI tropes (dark-purple neon gradients, textureless flat surfaces, nested cards 3-4 levels deep, icon-stuffed bento boxes) that lack professional industrial utility.
* **Required Standard**: **Human-Crafted Engineering UI**: Symmetrical balance, clean whitespace, curated neutral palettes (slate/emerald/amber), clear typographic hierarchy, and authentic industrial data density.

### 4.2 Ambiguity in Screen Resolution & Responsive Behavior
* **Root Issue**: Specifying fixed pixel numbers in prompt requirements caused confusion over whether screens were hard-locked rather than fluidly responsive.
* **Required Standard**: **Fluid & Elastic Auto-Adaptation**. Layouts must dynamically adjust to any viewport width (Mobile, iPad/Tablet, Laptop, Desktop, Ultrawide) without hardcoded fixed dimensions or horizontal overflow.

---

## 🧠 Brainstorming Focus Questions for Gemini

Use these prompt questions to drive your brainstorming session:

1. **Human-AI Safety Gate**: *How can we design an automated behavioral interceptor that prevents the AI from executing modifying commands when the user's prompt is purely explanatory or interrogative?*
2. **Confidentiality Poka-Yoke**: *What automated pre-commit hook or script can guarantee that local confidential files (like `Sources/`) are never indexed, tracked, or pushed to any remote repository?*
3. **Template Verification Engine**: *How can we write automated unit tests that inspect generated Excel files to ensure 0 dummy text in yellow cells, 0 formula errors on empty sheets, and 0 balance check discrepancies?*
4. **Anti-AI Design System**: *What specific CSS tokens, layout rules, and component structures best guarantee a clean, human-crafted industrial aesthetic that avoids all common AI design clichés?*
