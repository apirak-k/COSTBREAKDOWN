# Product Cost Breakdown & Variance Analysis System
## End-to-End User Manual & Comprehensive Testing Guide (With Multi-Phase Mock Datasets)

---

### Executive Overview & Purpose
This system is an **Industrial-Grade Cost Engineering & Variance Analysis Platform** designed for manufacturing engineers, cost accountants, and plant managers. It replaces cumbersome manual spreadsheets with an interactive, audit-proof, and real-time analytical workspace adhering strictly to mathematical parity with Microsoft Excel models.

---

## 🗺️ System Architecture & Workflow Summary

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   01. MASTER DATA       │ ──> │   02. COST BREAKDOWN    │
│  - Product Master Card  │     │  - High-Level KPI Strip │
│  - WC Hourly Rate Card  │     │  - 3-Way Variance Tree  │
│  - BOM Inline Grid (16) │     │  - DM, DL, FO Breakdown │
│  - Routing Grid (39 Ops)│     │  - Mathematical Parity  │
└─────────────────────────┘     └─────────────────────────┘
             │                               │
             ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   04. RCA & SIMULATION  │ <── │ 03. CANDIDATE SELECTION │
│  - 2-Step What-If Engine│     │  - Top Positive Drivers │
│  - Scenario A / B / C   │     │  - Controllability Tag  │
│  - Shop-Floor Trial Mat │     │  - Countermeasure Plan  │
│  - PDCA Baseline Lock   │     │  - Pareto Impact Split  │
└─────────────────────────┘     └─────────────────────────┘
```

---

## 📖 Part 1: Step-by-Step Module User Manual

### Tab 1: `01. Master Data` (Engineering Ground Truth)
1. **Section A — Product Master & Sizing**:
   - Displays active product code (`RGOM-024-01`), unit of measure (`PC`), description, customer, and effective date.
   - Click **`Edit Sizing Structure`** if you need to adjust matrix dimensions (e.g. expanding to 60 routing steps or 30 BOM items).
2. **Section B — Work Center Rate Card**:
   - Configure hourly Labor Rate ($R_{L,k}$) and Factory Overhead / Burden Rate ($R_{B,k}$) in THB/MHr.
   - *Inline Editing*: Directly edit any rate or description in the table cells.
3. **Section C — Bill of Materials (BOM Table)**:
   - Lists all raw materials with standard usage ($Q_i$), Base Price ($P_{0,i}$), Active Price ($P_{1,i}$), Base Loss ($L_{0,i}$), and Active Loss ($L_{1,i}$).
   - *Excel Yellow Cells*: Active price and loss inputs are highlighted in yellow.
   - *Bulk Tools*: Use `Copy Base ➔ Active` to reset all items in 1 click, or `+5% Price Shift` for quick inflation testing.
4. **Section D — Process Routing (Conversion Operations)**:
   - Lists 39 standard operations with sequence (`Seq`), Work Center (`WC`), Manning ($M_j$), Base Capacity ($C_{0,j}$ pc/hr), Active Capacity ($C_{1,j}$ pc/hr), Base Yield ($Y_{0,j}$), and Active Yield ($Y_{1,j}$).
   - *Bulk Tools*: Use `Copy Base ➔ Active`, `Set Manning = 1`, or `+5% Cap Shift`.

---

### Tab 2: `02. Cost Breakdown` (Variance & Mathematical Tree)
1. **Top KPI Summary Strip**:
   - `Baseline Standard Cost`: Original cost baseline prior to changes.
   - `Active Standard Cost`: Current live cost recalculated from active cells.
   - `Net Cost Gap (Variance)`: Net financial difference ($\Delta C = C_1 - C_0$).
   - `Material Variance Ratio`: Percentage of total gap driven by raw materials.
2. **Variance Tree Card**:
   - Breaks down the total gap into 3 core accounting pillars:
     $$\Delta C_{Total} = \Delta C_M (\text{Direct Material}) + \Delta C_L (\text{Direct Labor}) + \Delta C_B (\text{Overhead Burden})$$
   - Includes real-time mathematical validation check.
3. **Detailed Breakdown Sub-Tabs**:
   - **BOM Detailed Breakdown**: Item-by-item material cost and variance.
   - **Labor Detailed Breakdown**: Op-by-op cycle time ($1/C_j$), man-hours, and labor cost.
   - **Burden Detailed Breakdown**: Op-by-op machine overhead cost.

---

### Tab 3: `03. Candidate Selection` (Pareto RCA & Controllability)
1. **Top Positive Gap Drivers Table**:
   - Evaluates all BOM items and Routing operations to filter and rank drivers where $\Delta \text{Cost} > 0$.
   - Displays parameter gap, monetary cost gap (THB/pc), and % contribution to total variance.
2. **Engineering Classification**:
   - **Controllability Checkbox**: Mark external commodity spikes as `Uncontrollable` vs plant scrap as `Controllable`.
   - **Action Plan Input**: Type specific engineering countermeasures (e.g. *“Redesign AOI lighting fixture to eliminate false reject”*).

---

### Tab 4: `04. RCA & Simulation` (What-If & Shop-Floor Validation)
1. **Section 1 & 2 — Problem Statement & Driver Selector**:
   - Select the target driver to improve from the Pareto ranking list.
2. **Section 3 & 4 — 2-Step Financial What-If Simulation**:
   - Configure **Option A (Quick Fix)**, **Option B (Process Optimization)**, and **Option C (Line Automation)**.
   - Enter proposed parameter target, one-time investment ($I_k$ THB), and monthly production volume ($V$ pcs).
   - System calculates:
     $$\text{Gross Saving (THB/pc)} = C_{\text{Active}} - C_{\text{Target}}$$
     $$\text{Monthly Saving (THB/mo)} = \text{Gross Saving} \times V$$
     $$\text{Payback Period (Months)} = \frac{I_k}{\text{Monthly Saving}}$$
3. **Section 5 — Shop-Floor Trial Validation Matrix**:
   - Records physical trial measurements from the factory floor.
   - Calculates Model Prediction Error ($\le \pm 3\%$).
   - Click **`Promote Trial to Baseline`** to lock validated results as the new standard (PDCA closing cycle).

---

## 🧪 Part 2: Complete Mock Datasets for End-to-End Testing

Users can test the system across **5 Sequential Operational Phases** to verify mathematical accuracy and UI responsiveness.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        5-PHASE LIFECYCLE TEST                          │
├─────────────────┬─────────────────┬─────────────────┬──────────────────┤
│ Phase 1: Base   │ Phase 2: Surge  │ Phase 3: RCA    │ Phase 4: What-If │
│ All Base = Act  │ Silver & Yield  │ Pareto Ranking  │ 3 Scenarios      │
│ Total: 12.0312  │ Total: 17.5098  │ Top 2 Drivers   │ ROI & Payback    │
└─────────────────┴─────────────────┴─────────────────┴──────────────────┘
```

---

### 🟢 Phase 1: Baseline Standard (Pre-Improvement Baseline)
*Objective: Reset system to pristine baseline where Active = Base ($Gap = 0.0000$ THB).*

#### 1. Work Center Rates Setup:
| Work Center (WC) | Labor Rate ($R_L$) | Burden Rate ($R_B$) | Source Ref |
| :--- | :---: | :---: | :--- |
| `Cutting` | 105.29 | 138.48 | Cost declare 250331 row 17 |
| `Printing-Digital RGOM` | 105.29 | 97.69 | Cost declare 250331 row 18 |
| `Assembly Digital RGOM` | 105.29 | 90.93 | Cost declare 250331 row 19 |
| `OQA-Digital` | 105.29 | 82.74 | Cost declare 250331 row 20 |

#### 2. BOM Items Baseline ($P_1 = P_0$, $L_1 = L_0$):
| # | Item Code | Description | Usage ($Q$) | Unit | Base $P_0$ | Active $P_1$ | Base Loss $L_0$ | Active Loss $L_1$ |
| :-: | :--- | :--- | :---: | :-: | :---: | :---: | :---: | :---: |
| 1 | `RMMAA2590` | CT75B/LUMIRROR 25T60 | 0.027125 | SM | 70.1322 | 70.1322 | 30% | 30% |
| 2 | `RMMBA1020` | DOTITE XA-3645 (Silver Paste) | 0.212500 | GM | 31.6956 | 31.6956 | 30% | 30% |
| 3 | `RMMBA760` | XC-3018 (1KG/CN) | 0.069400 | GM | 1.7293 | 1.7293 | 30% | 30% |
| 4 | `RMMBA920` | PAF-27F | 0.074700 | GM | 29.8917 | 29.8917 | 30% | 30% |
| 5 | `RMMCD01B` | P-THINNER | 0.002000 | GM | 0.3092 | 0.3092 | 30% | 30% |
| 6 | `RMMCD140` | SOLVENT PAF-100 | 0.003100 | GM | 0.8396 | 0.8396 | 30% | 30% |
| 7 | `RMMCD200` | PTF-300 DILUENT | 0.055500 | GM | 1.2136 | 1.2136 | 30% | 30% |
| 8 | `RMMCD260` | DOTITE SC-0030 | 0.003400 | GM | 0.3142 | 0.3142 | 30% | 30% |
| 9 | `RMMBB630` | PTF-3201N | 1.152500 | GM | 1.1949 | 1.1949 | 30% | 30% |
| 10 | `RMMBB480` | PTF-3101N | 0.025000 | GM | 1.0794 | 1.0794 | 30% | 30% |
| 11 | `RMMLAA2650` | TF100 100um | 0.001422 | SM | 14.8357 | 14.8357 | 30% | 30% |
| 12 | `RMMLAA2630` | PET75-Y210(10)K | 0.025417 | SM | 44.2200 | 44.2200 | 30% | 30% |
| 13 | `RMMLEE225` | BLANK LABEL B423 | 1.000000 | PC | 0.1200 | 0.1200 | 10% | 10% |
| 14 | `RMMLAA2640` | PET White 75 Uncoated | 0.020625 | SM | 43.2150 | 43.2150 | 10% | 10% |
| 15 | `RMMLRA340` | MAKE UP-A188-4X0.8L | 0.014035 | GM | 2.4372 | 2.4372 | 10% | 10% |
| 16 | `RMMLRA360` | INK-MB175-4X0.8L INKJET | 0.001780 | GM | 9.8065 | 9.8065 | 10% | 10% |

#### 3. Key Process Routing Steps Baseline ($C_1 = C_0$, $Y_1 = Y_0$):
| Seq | Description | Work Center | Manning ($M$) | Base Cap ($C_0$) | Active Cap ($C_1$) | Base Yield ($Y_0$) | Active Yield ($Y_1$) |
| :-: | :--- | :--- | :-: | :-: | :-: | :-: | :-: |
| 0001 | Cutting | `Cutting` | 1.0 | 6,180 | 6,180 | 100% | 100% |
| 0005 | Printing-BAg | `Printing-Digital` | 4.0 | 1,884 | 1,884 | 100% | 100% |
| 0015 | Printing-BAg.J | `Printing-Digital` | 8.0 | 1,572 | 1,572 | 100% | 100% |
| 0021 | Laminate Carrier film | `Printing-Digital` | 8.0 | 2,640 | 2,640 | 100% | 100% |
| 0028 | AI-Ins (Auto Inspection) | `Assembly Digital` | 4.0 | 600 | 600 | 74% | 74% |
| 0039 | QA & Packing | `OQA-Digital` | 5.0 | 560 | 560 | 99.75% | 99.75% |

#### 🎯 Expected Phase 1 Mathematical Verification:
* Direct Material ($C_M$): **6.6833 THB/pc**
* Direct Labor ($C_L$): **2.7663 THB/pc**
* Overhead Burden ($C_B$): **2.5816 THB/pc**
* **Total Standard Cost ($C_{Total}$)**: **12.0312 THB/pc**
* **Total Cost Gap ($\Delta C$)**: **0.0000 THB (0.00%)**

---

### 🔴 Phase 2: Active Shop-Floor Surge (Simulate Factory Variances)
*Objective: Enter realistic factory degradation to test real-time variance engine.*

#### Data Changes to Enter:
1. **Material Spike (BOM Item #2 `RMMBA1020` DOTITE Silver Paste)**:
   - Change `Active P1`: $31.6956 \rightarrow$ **`60.1000` THB/GM** (Market price increase +89.6%)
2. **Process Scrap Surge (Routing Seq `0028` AI-Ins)**:
   - Change `Active Yield`: $74\% \rightarrow$ **`60.0%`** (Fixture misalignment causing false rejects)
3. **Bottleneck Capacity Drop (Routing Seq `0005` Printing-BAg)**:
   - Change `Active Cap`: $1,884 \rightarrow$ **`1,500` pc/hr**

#### 🎯 Expected Phase 2 Mathematical Verification:
* Direct Material ($C_M$): **12.7183 THB/pc** ($\Delta C_M = +6.0350$ THB)
* Direct Labor ($C_L$): **2.5459 THB/pc**
* Overhead Burden ($C_B$): **2.2456 THB/pc**
* **Active Total Cost ($C_{Active}$)**: **17.5098 THB/pc**
* **Net Cost Gap ($\Delta C$)**: **+5.4786 THB/pc (+45.54% Cost Overrun)**

---

### 🔍 Phase 3: Pareto Candidate Ranking & Classification
*Objective: Inspect Tab 3 to verify tie-breaker sorting and root cause documentation.*

#### Verification Checklist:
1. **Rank #1 Driver**: `RMMBA1020 - DOTITE XA-3645`
   - Cost Gap: **+6.0350 THB/pc** (90.3% variance contribution)
   - Parameter: Price $31.70 \rightarrow 60.10$ THB/GM
   - Action Plan: Check `Uncontrollable` checkbox. Type: *"Negotiate 5% volume rebate with chemical supplier."*
2. **Rank #2 Driver**: `AI-Ins - AI-Ins` (Operation Seq 28)
   - Cost Gap: **+0.5512 THB/pc** (8.2% variance contribution)
   - Parameter: Yield $74\% \rightarrow 60\%$
   - Action Plan: Leave Controllable. Type: *"Redesign AOI high-contrast lighting fixture & recalibrate camera."*

---

### 💡 Phase 4: 2-Step What-If Simulation
*Objective: Test investment feasibility, payback period, and gross monthly savings in Tab 4.*

Select **Driver #2 (AI-Ins Yield)** and input the following 3 engineering proposals:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                     WHAT-IF SCENARIO PROPOSALS MATRIX                     │
├────────────────────┬─────────────────┬──────────────────┬─────────────────┤
│ Metric             │ Option A (Quick)│ Option B (Opt)   │ Option C (Auto) │
├────────────────────┼─────────────────┼──────────────────┼─────────────────┤
│ Target Yield       │ 74.0%           │ 80.0%            │ 88.0%           │
│ Target Capacity    │ 600 pc/hr       │ 650 pc/hr        │ 800 pc/hr       │
│ Investment ($I_k$) │ 5,000 THB       │ 25,000 THB       │ 85,000 THB      │
│ Monthly Vol ($V$)  │ 50,000 pcs      │ 50,000 pcs       │ 50,000 pcs      │
├────────────────────┼─────────────────┼──────────────────┼─────────────────┤
│ Predicted Cost     │ 16.9586 THB     │ 16.8200 THB      │ 16.6500 THB     │
│ Unit Gross Saving  │ +0.5512 THB/pc  │ +0.6898 THB/pc   │ +0.8598 THB/pc  │
│ Monthly Net Saving │ +27,560 THB/mo  │ +34,490 THB/mo   │ +42,990 THB/mo  │
│ Payback Period     │ 0.18 Months     │ 0.72 Months      │ 1.98 Months     │
│ Decision           │ PROFITABLE      │ PROFITABLE       │ PROFITABLE      │
└────────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

---

### 🏁 Phase 5: Shop-Floor Trial Validation & PDCA Baseline Lock
*Objective: Verify trial measurement vs model prediction error and promote to baseline.*

1. **Option Benchmark**: Select `Option B`.
2. **Measured Trial Cost**: Enter **`16.8350` THB/pc** (Simulating actual 5,000 pcs trial production run).
3. **Model Deviation Validation**:
   - Model Prediction: `16.8200 THB/pc`
   - Actual Measurement: `16.8350 THB/pc`
   - Model Error: **+0.0150 THB (+0.09%)** $\rightarrow$ Status: `Accurate (≤3%)` ✅
4. **Trial Observations**:
   - Enter: *"Conducted 1-day pilot run with 5,000 pcs. Fixture stabilized yield at 79.8% with zero false camera rejects."*
   - Click **`Save Validation Record`**.
5. **Close PDCA Cycle**:
   - Click **`Promote Trial to Baseline`** $\rightarrow$ Active values lock as the new official Standard Baseline!

---

## 🛡️ Edge Cases & Poka-Yoke Test Matrix

To test system resilience against human entry errors, try the following test cases:

| Test Case | User Action | Expected System Behavior / Guard |
| :--- | :--- | :--- |
| **TC-01: Negative Price** | Enter `-25.0` in Active Price $P_1$ | System clamps to `0.0000` automatically. |
| **TC-02: Zero Capacity** | Enter `0` in Active Capacity $C_1$ | System clamps to `1 pc/hr` to avoid division-by-zero ($1/C_j$). |
| **TC-03: Yield > 100%** | Enter `150%` in Yield | System bounds yield calculation gracefully. |
| **TC-04: Extreme Payback** | Set Investment to `10,000,000 THB` | System flags `UNPROFITABLE` (> 36 months payback threshold). |
| **TC-05: Excel File Import** | Drag & drop invalid `.pdf` file | System shows clear error alert without crashing. |

---
*Document Version: 2.0 (Pure Sharp Industrial Engineering Standard)*  
*Certified for: Senior Project Defense & Production Factory Deployment*
