# Product Cost Breakdown & Variance Analysis Platform

A standard product cost breakdown and variance analysis system for industrial manufacturing, modeling the 3 Pillars of Cost (**Direct Material**, **Direct Labor**, and **Manufacturing Burden**) with atomic Level 1-3 variance decomposition.

> **Current requirements:** Read [`docs/REQUIREMENTS_INDEX.md`](docs/REQUIREMENTS_INDEX.md) before interpreting or changing the product. This README contains project history and the legacy Excel model reference; it is not the page-level target specification.

---

## 📌 Core Engineering Philosophy & Strategy

1. **Verified Excel Calculation Reference First**:
   * The underlying Excel workbooks (`CostModel_RGOM-024.xlsx` and `CostModel_BLANK_TEMPLATE.xlsx`) serve as the verified mathematical bedrock and external source evidence.
   * Every calculation, formula, and variance tree on the web platform strictly mirrors the verified Excel logic.
2. **Real-World Factory Usability & Add-On Capability**:
   * Built for actual factory workflow: Users can start with existing master data or import Excel templates, and easily **Add-On** new BOM items or Routing operations.
   * Focuses on the core utility: **Standard Cost Comparison (Reference vs. Current Gap)** and **Detailed Cost Breakdown (Item-by-item BOM & Op-by-op Routing)**. Once this core comparison and breakdown are solid, all downstream features (simulation, what-if, candidate ranking) become straightforward extensions.
31. **Poka-Yoke & Mistake-Proofing**:
   * Input validation blocks invalid values (zero negative pricing, yield $\le 100\%$, formula shielding against `#VALUE!` and `#DIV/0!`).
   * Automated Balance Reconciliation check ensures $\Delta C_{\text{Total}} - \sum \text{Variances} = 0.0000\text{ THB/pc}$ (100% Balanced).

---

## 📂 Legacy Excel Model Structure (4 Worksheets)

The table below describes the checked-in legacy model used for calculation reference. The current Master Data import contract is a one-Product dataset workbook with a role selected in the web Header; it is not a Base/Active comparison workbook.

| Sheet | Name | Purpose | Key Standards |
| :--- | :--- | :--- | :--- |
| **Sheet 1** | `1_INPUT_DATA` | Master Data Input | 100% Pure yellow input cells. Zero calculations. Product info, WC Rates, BOM items, Routing steps. |
| **Sheet 2** | `2_COST_BREAKDOWN` | Cost Engine & Variance Tree | 100% Dynamic Excel formulas. BOM Material ($C_M$), Routing ($C_L, C_B$), 3-Pillar Roll-up, Level 3 Variance Tree (MPV, MLV, LRV, LEV, BRV, BEV). |
| **Sheet 3** | `3_EXECUTIVE_SUMMARY` | Executive Cost Bridge | Waterfall Cost Bridge from Baseline Std ($33.71$ THB) $\rightarrow$ Active Std ($36.71$ THB) $\rightarrow$ Target ($36.35$ THB). |
| **Sheet 4** | `4_WHAT_IF_SIMULATOR` | RCA & Scenario Simulation | Root Cause Analysis (RCA) diagnosis for screen printing yield drops and multi-option ROI simulation (Options A, B, C). |


---

## 🛠️ Web Prototype Tech Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS (Industrial Slate/Emerald palette)
* **Icons**: Lucide React
* **Data Parsing**: Client-side SheetJS (`xlsx`) for `.xlsx` import/export
* **State Management**: React Context synced with browser `sessionStorage` (Persists on refresh, auto-cleans on session close)

---

## 🚀 Quickstart

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build production bundle
npm run build

# Rebuild and test Excel models
node scripts/build_and_test_all.js
```
