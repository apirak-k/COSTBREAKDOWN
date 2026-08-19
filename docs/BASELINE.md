# Baseline Specification: Cost Breakdown Project

**Project Name**: Cost Breakdown  
**Repository**: `apirak-k/COSTBREAKDOWN`  
**Document Status**: Official Project Baseline  

---

## 1. Project Overview & Objective
**Cost Breakdown** is an industrial standard costing and variance analysis system. Its core objective is to compare **Base (Pre-Improvement Baseline)** vs. **Active (Current Actual / Post-Improvement)** parameters, quantify cost variances ($\Delta$), isolate root cost drivers, and simulate the economic ROI of action plans before capital commitment.

---

## 2. Core Stakeholder Perspectives

### 2.1 Management & Finance Perspective
- Instant visibility into Total Standard Cost per unit (THB/pc) and Net Variance ($\Delta$).
- Separation of variances into Purchasing (Material Price Variance - MPV), Production/Inventory (Material Loss Variance - MLV), and Manufacturing Process (Labor & Burden Efficiency Variances - LEV, BEV).
- Objective economic trade-off validation: $\text{Net Saving} = \text{Gross Saving} - \frac{\text{Investment}}{\text{Lot Size}}$.

### 2.2 Industrial Engineering (IE) & Operations Perspective
- Atomic row-level granularity: BOM Item-by-Item and Routing Operation-by-Operation.
- Strict Department/Work Center linkage: Routing steps inherit Labor & Burden rates via the `Department` Key.
- Full PDCA closure: "Promote to Baseline" resets active parameters to become the new baseline standard for subsequent improvement cycles.

### 2.3 Software & Data Perspective
- **Dual-Path Parity**: Users can enter data via interactive Web Grid or via Excel Workbook (`.xlsx`) with 100% identical calculation outcomes.
- **Excel as Source of Truth**: All calculation formulas on the web mirror the verified Excel model.
- **Dynamic Sizing**: The system supports custom-sized workbooks matching exact $K$ Work Centers, $N$ BOM items, and $M$ Routing operations.

---

## 3. Data Architecture & Setup Parameters

### 3.1 Initial Setup Requirements (Structure Sizing)
Before data entry, each product defines its structural dimensions:
1. `Product Code` (e.g., `RGOM-024`) & `Product Description`
2. `Unit of Measure (UOM)` (Standardized via UOM Master list)
3. `Number of Work Centers (K)`
4. `Number of BOM Items (N)`
5. `Number of Routing Operations (M)`

*Note: Sizing dimensions are editable anytime with automatic preservation of existing data and dynamic expansion/trimming.*

### 3.2 Operational Inputs (Base vs. Active Pairs)
- **BOM Material Inputs**: Usage ($Q$), Base Price ($P_0$), Active Price ($P_1$), Base Loss ($L_0$), Active Loss ($L_1$), Source Ref.
- **Routing Process Inputs**: Op Seq, Description, Department (WC), Manning ($M$), Base Cap ($C_0$), Active Cap ($C_1$), Base Yield ($Y_0$), Active Yield ($Y_1$), Source Ref.
- **Work Center Master Rates**: Department Name, Description, Labor Rate (THB/MHr), Burden Rate (THB/MHr), Effective Date.

---

## 4. End-to-End User Flow (4 Tabs)

```
[Tab 1: Master Data] ──► [Tab 2: Cost Breakdown] ──► [Tab 3: Candidate Selection] ──► [Tab 4: RCA & Simulation]
```

1. **Tab 1: Master Data**
   - Multi-product switching & setup.
   - Interactive Input Grid (`bg-amber-50` input cells).
   - Dynamic Blank Excel Template Generator (`.xlsx`).
   - Excel Import Dropzone.
   - Promote to Baseline action.

2. **Tab 2: Cost Breakdown**
   - Executive KPI Stat Cards (Baseline, Current, Material, Conversion with Delta Badges).
   - Level 0–3 Variance Decomposition Tree.
   - Detailed Step-by-Step Breakdown Tables (BOM items & Routing steps).

3. **Tab 3: Candidate Selection**
   - Automated Top 10 Cost Drivers ranking based on positive cost gap + tie-breaker score.
   - `Uncontrollable` Checkbox (Default: unchecked / controllable) with amber highlight alerting.
   - Human-annotated Action Plan field.

4. **Tab 4: RCA & What-If Simulation**
   - 5-Whys root cause diagnosis for top controllable drivers.
   - Multi-Option What-If Simulator (Option A, B, C) calculating Net Savings per unit.
   - One-click "Promote to Active" to update operational standards.

---

## 5. Mathematical Specification

$$\text{Direct Material Base} = \sum Q \times P_0 \times (1 + L_0)$$
$$\text{Direct Material Active} = \sum Q \times P_1 \times (1 + L_1)$$
$$\text{Material Price Variance (MPV)} = \sum (P_1 - P_0) \times Q \times (1 + L_1)$$
$$\text{Material Loss Variance (MLV)} = \sum (L_1 - L_0) \times Q \times P_0$$

$$\text{Runtime (Base)} = \frac{M}{C_0 \times Y_0} \quad (\text{MHr/pc})$$
$$\text{Runtime (Active)} = \frac{M}{C_1 \times Y_1} \quad (\text{MHr/pc})$$
$$\text{Direct Labor Cost} = \text{Runtime} \times \text{Labor Rate}$$
$$\text{Manufacturing Burden Cost} = \text{Runtime} \times \text{Burden Rate}$$

$$\text{Top Driver Tie-Breaker Score} = \text{Cost Gap} + (55 - \text{ID}) \times 10^{-8}$$

---

## 6. Immutable Design & Engineering Rules
1. **Project Name**: Strictly **Cost Breakdown**.
2. **Color Palette**: Minimalist industrial palette (Slate, Emerald, Amber, Rose, White). No unnecessary decorative styling.
3. **Input Styling**: Editable input cells must use `bg-amber-50`. Computed output cells must be white/neutral.
4. **Single Source of Truth**: Excel calculations and Web calculations must agree to all decimal places.
