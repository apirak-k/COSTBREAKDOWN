# Engineering Handoff & Project Checkpoint (V2 Modular Final Architecture)

**Date**: 2026-08-15  
**Current Status**: **100% Finalized V2 Modular Excel Architecture with Dynamic Ranking Engine & Native COM AutoSize (Passed 0-Error Audit)**  
**Governing Documents**: [`PROJECT_SPECIFIC.md`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/PROJECT_SPECIFIC.md), [`Sources/HAWS.md`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/Sources/HAWS.md), [`Sources/WORK_INSTRUCTIONS.md`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/Sources/WORK_INSTRUCTIONS.md)

---

## 1. Project Goal & System Architecture

The project delivers a **Modular Product Cost Breakdown & Root Cause Analysis Platform** (with Excel models as the mathematical Single Source of Truth, automated via Node.js scripts, and an interactive web workspace).

### Standardized 5-Tier Cost Breakdown Hierarchy:
```
[ LEVEL 0: Total Product Standard Cost & Variance (THB / Unit) ]
   │
   ├── [ LEVEL 1: Cost Elements / Streams ]
   │    ├── Direct Material (Δ Material)
   │    └── Conversion Process (Δ Process = Δ Labor + Δ Burden)
   │
   ├── [ LEVEL 2: Functional Category / Department ]
   │    ├── Material: Direct Material (Inks, Films, Adhesives, Packaging)
   │    └── Process: Printing Line, Material Prep, Digital Assembly, Supporting, QA & Packing
   │
   ├── [ LEVEL 3: Atomic Cost Drivers (★ Leaf Nodes for Ranking) ]
   │    ├── Material: Item 1..10 (e.g. DOTITE XA-3645 Conductive Silver Paste Ink)
   │    └── Process: Step 1..39 (e.g. Step 28: AI-Ins, Step 30: VDO-ins I)
   │
   └── [ LEVEL 4: Gemba Root Cause (RCA) Parameters & Action Governance ]
        ├── Physical Parameters: Unit Price ($), Loss %, Yield %, Capacity (Unit/hr), MHr
        └── Controllability Flow: Default "Controllable" (Internal Action) ➔ "Uncontrollable" when Remark specified (External Negotiation)
```

---

## 2. Finalized V2 Modular Excel Model Architecture

The workbook structure consists of 4 visible user-facing worksheets and 1 dedicated hidden calculation engine:

1. **`1_MASTER_RATES` (Product Info & Accounting Rates)**:
   - Contains Product Info (`Product Code`, `Description`, `UOM = PC`, `Source Reference`).
   - Contains Work Center Rates (`WC-CUT`, `WC-PRT`, `WC-ASY`, `WC-QAP`) with Accounting Standard `Labor Rate (105.29 THB/MHr)` and `Burden Rate`.
   - Single `Source Reference` belongs to the Base Reference Standard (`Cost declare 250331`).
2. **`2_BOM_BREAKDOWN` (Direct Material Breakdown - 10 Items)**:
   - **Table 1 (Input)**: `Item No | Material Code | Description | Consumption | UOM | Base Price | Active Price | Base Loss% | Active Loss% | Source Ref`.
   - **Table 2 (Calculation)**: `Base Cost | Active Cost | Price Var (Δ MPV) | Loss Var (Δ MLV) | Total Mat Var (Δ THB)`.
   - Pristine zero-hiding total row with `IFERROR(IF(SUM(...)=0,"",SUM(...)), "")`.
3. **`3_ROUTING_BREAKDOWN` (Process Conversion Breakdown - Flat 39 Steps)**:
   - **Table 1 (Input)**: 39 continuous steps (Rows 5 to 43) without artificial subtotal breaks.
   - **Table 2 (Calculation - Full 16 Columns)**: Rows 47 to 85.
     `Seq | Dept | Process Name | WC | Base Runtime | Active Runtime | Δ Runtime | Base Labor | Active Labor | Δ Labor | Base Burden | Active Burden | Δ Burden | Base Process Cost | Active Process Cost | Total Process Δ`
   - **Grand Total Row (Row 86)**: `Total Processing Cost` summing all 39 steps, completely hidden/clean on blank states.
4. **`4_SUMMARY_&_COMPARISON` (Summary & Dynamic Action Leaderboard)**:
   - **Table 1 (Summary Elements)**: `Material | Labor | Burden | Std Total` comparing Base Ref Std vs Active Current Std.
   - **Table 2 (Top Cost Drivers Ranking - Rank #1 to #10)**:
     `Rank | Level 2 Category | Level 3 Cost Driver | Level 4 RCA Parameter Changed | Base Param | Active Param | Cost Gap (THB/Unit) | % Contrib | Controllability | Remark`
     - **Pure English Headers**: Standard `Remark` column.
     - **100% Center-Aligned**: Horizontal and vertical center alignment.
     - **Zero Truncation**: Generous column widths (12, 32, 52, 44, 18, 18, 22, 16, 18, 48).
     - **Automated Controllability**: `=IF(G13="","", IF(J13="","Controllable","Uncontrollable"))`.
5. **`_CALC_ENGINE` (Dedicated Hidden Calculation Engine)**:
   - Evaluates all 49 candidate nodes (10 BOM items + 39 Routing steps) dynamically.
   - Supplies tie-breaker scores and dynamic `LARGE()` & `INDEX/MATCH` queries to Sheet 4.
   - Set to `state = 'hidden'` for a clean user experience.

---

## 3. The Golden Rules & Vocabulary Conventions

1. **The Golden Rule of Driver Selection**:
   - The Driver is always selected at the **final atomic node before RCA** (BOM Item Level 3 for Material; 39 Process Steps Level 3 for Routing).
2. **Ranked Fallback & Controllability Workflow**:
   - Every driver with a Cost Gap is ranked in descending order (Rank #1 to #10).
   - If Rank #1 is marked as `Uncontrollable` via a reason in `Remark` (e.g. *Customer Approved Drawing Spec*), engineers immediately fall back to Rank #2 (`Controllable` - e.g. Step 28 `AI-Ins` Yield Drop) as the primary internal action target.
3. **Universal Engineering RCA Taxonomy**:
   - $P_1 > P_0 \rightarrow$ **`Unit Price Inflation ($Base ➔ $Active)`**
   - $L_1 > L_0 \rightarrow$ **`Material Loss % Increase`**
   - $Y_1 < Y_0 \rightarrow$ **`Yield Drop (Base% ➔ Active%)`**
   - $C_1 < C_0 \rightarrow$ **`Capacity / Speed Drop`**
4. **Forbidden Terms**:
   - The word "Kaizen" is permanently banned. Use standard neutral terms: `Internal Action`, `Action Plan`, `External Negotiation`.
5. **Standard Unit**:
   - Use `'Unit'` (and `THB / Unit`, `Unit/hr`) universally (replaces `'pc'`).

---

## 4. Key Files & Tooling Suite

- **[`excel_models/v2_modular/CostModel_RGOM-024_v2.xlsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/excel_models/v2_modular/CostModel_RGOM-024_v2.xlsx)**: Fully populated reference model for `RGOM-024` with live dynamic rankings.
- **[`excel_models/v2_modular/CostModel_BLANK_TEMPLATE_v2.xlsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/excel_models/v2_modular/CostModel_BLANK_TEMPLATE_v2.xlsx)**: 100% clean pristine template with zero floating zeros and active dynamic ranking engine.
- **[`scripts/build_excel_models_v2.js`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/scripts/build_excel_models_v2.js)**: Automated generator script for both populated and template workbooks.
- **[`scripts/verify_excel_models_v2.js`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/scripts/verify_excel_models_v2.js)**: Comprehensive audit suite verifying formula shielding, 16-column layout, dynamic engine, and pure template rules.
- **[`scripts/apply_excel_autosize.ps1`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/scripts/apply_excel_autosize.ps1)**: Native PowerShell COM Automation applying precise Excel AutoFit on column widths and cell padding.

---

## 5. Next Development Phases

1. **Web UI Integration (`src/`)**:
   - Implement interactive dashboard visualizing Level 0-3 Waterfall cost bridge.
   - Dynamic Top Cost Drivers leaderboard with `Controllable` vs `Uncontrollable` action toggles.
   - What-If simulation slider module for Yield, Capacity, Price, and Loss parameters.
2. **Enterprise Excel Import/Export**:
   - Enable users to export populated web scenarios into `CostModel_BLANK_TEMPLATE_v2.xlsx` format directly.
