# Product Cost Breakdown & Variance Analysis Platform

A standard product cost breakdown and variance analysis system for industrial manufacturing, modeling the 3 Pillars of Cost (**Direct Material**, **Direct Labor**, and **Manufacturing Burden**) with atomic Level 1-3 variance decomposition.

---

## 📌 Core Engineering Philosophy & Strategy

1. **Excel Model as the Source of Truth First**:
   * The underlying Excel workbooks (`CostModel_RGOM-024.xlsx` and `CostModel_BLANK_TEMPLATE.xlsx`) serve as the verified mathematical bedrock.
   * Every calculation, formula, and variance tree on the web platform strictly mirrors the verified Excel logic.
2. **Real-World Factory Usability & Add-On Capability**:
   * Built for actual factory workflow: Users can start with existing master data or import Excel templates, and easily **Add-On** new BOM items or Routing operations.
   * Focuses on the core utility: **Standard Cost Comparison (Reference vs. Active Gap)** and **Detailed Cost Breakdown (Item-by-item BOM & Op-by-op Routing)**. Once this core comparison and breakdown are solid, all downstream features (simulation, what-if, candidate ranking) become straightforward extensions.
3. **Poka-Yoke & Mistake-Proofing**:
   * Input validation blocks invalid values (zero negative pricing, yield $\le 100\%$, formula shielding against `#VALUE!` and `#DIV/0!`).
   * Automated Balance Reconciliation check ensures $\Delta C_{\text{Total}} - \sum \text{Variances} = 0.0000\text{ ฿/pc}$ (100% Balanced).

---

## 📂 Excel Model Structure (4 Worksheets)

| Sheet | Name | Purpose | Key Standards |
| :--- | :--- | :--- | :--- |
| **Sheet 1** | `1_INPUT_DATA` | Master Data Input | 100% Pure yellow input cells. Zero calculations. Product info, WC Rates, BOM items, Routing steps. |
| **Sheet 2** | `2_COST_BREAKDOWN` | Cost Engine & Variance Tree | 100% Dynamic Excel formulas. BOM Material ($C_M$), Routing ($C_L, C_B$), 3-Pillar Roll-up, Level 3 Variance Tree (MPV, MLV, LRV, LEV, BRV, BEV). |
| **Sheet 3** | `3_EXECUTIVE_SUMMARY` | Executive Cost Bridge | Waterfall Cost Bridge from Baseline Std ($33.71$ ฿) $\rightarrow$ Active Std ($36.71$ ฿) $\rightarrow$ Post-Kaizen Target ($36.35$ ฿). |
| **Sheet 4** | `4_WHAT_IF_SIMULATOR` | RCA & Kaizen Simulation | Root Cause Analysis (RCA) diagnosis for screen printing yield drops and multi-option ROI simulation (Options A, B, C). |

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
