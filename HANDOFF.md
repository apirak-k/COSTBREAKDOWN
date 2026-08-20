# Engineering Handoff & Project Checkpoint — Checkpoint 10

**Date Updated**: 2026-08-20  
**Status**: **Clean Architecture Modularization Complete — Multi-Product & Dynamic What-If Ready ✅**  
**Governing Documents**:
- [`PROJECT_SPECIFIC.md`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/PROJECT_SPECIFIC.md)
- [`Human-AI-Working-Standard/HAWS.md`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/Human-AI-Working-Standard/HAWS.md)
- [`Human-AI-Working-Standard/WORK_INSTRUCTIONS.md`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/Human-AI-Working-Standard/WORK_INSTRUCTIONS.md)

---

## 1. สถานะระบบ ณ ปัจจุบัน (What Is Done)

### 1.1 Excel Model (100% สมบูรณ์ — Ground Truth ล็อคแล้ว)

| Sheet | สถานะ | รายละเอียดการคำนวณ |
| :--- | :---: | :--- |
| `1_MASTER_RATES` | ✅ LOCKED | Product Info Row 5 + Work Center Rates Rows 9–12 |
| `2_BOM_BREAKDOWN` | ✅ LOCKED | 16 BOM Items, Input Rows 5–20 + Calc Rows 24–39 (MPV, MLV) |
| `3_ROUTING_BREAKDOWN` | ✅ LOCKED | 39 Steps flat, Input Rows 5–43 + Calc Rows 47–85 (LEV, BEV) |
| `4_SUMMARY_&_COMPARISON` | ✅ LOCKED | Top 10 Drivers + Executive Summary + Action Plan (Col J) |
| `_CALC_ENGINE` | ✅ LOCKED | 55 candidates (16 BOM + 39 Routing), tie-breaker scoring |

**Verified Model Files**:
- [`excel_models/v2_modular/CostModel_BLANK_TEMPLATE_v2.xlsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/excel_models/v2_modular/CostModel_BLANK_TEMPLATE_v2.xlsx)
- [`excel_models/v2_modular/CostModel_RGOM-024_v2.xlsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/excel_models/v2_modular/CostModel_RGOM-024_v2.xlsx)

---

### 1.2 Web App Modular Architecture (4-Layer Clean Architecture)

| Layer | โฟลเดอร์ | รายละเอียดความรับผิดชอบ |
| :--- | :--- | :--- |
| **Layer 1: Core Domain** | `src/core/` | **Pure Mathematical Engines & Types** (ไม่มี UI เจือปน):<br>• `cost-engine.ts`: คำนวณ BOM, Routing, Variance Level 1–3<br>• `top-drivers.ts`: จัดอันดับ Top 10 Driver ด้วย Tie-breaker<br>• `whatif-simulator.ts`: เครื่องมือคำนวณ ROI 3 Scenario<br>• `detailed-breakdown.ts`: คำนวณตารางแยกระดับ Item/Op<br>• `formatters.ts` & `guards.ts`: ป้องกัน `#DIV/0!`, `#VALUE!` |
| **Layer 2: Services** | `src/services/` | **I/O & File Adapters**:<br>• `excel-parser.ts`: นำเข้าไฟล์ Excel v2 อัตโนมัติ<br>• `dynamic-excel-generator.ts`: สร้าง Template `.xlsx` ตามขนาดสินค้า<br>• `session-storage.ts`: บันทึกสถานะ Multi-product ลง SessionStorage |
| **Layer 3: State** | `src/state/` | **Application Store & Seed Data**:<br>• `store.tsx`: จัดการ Multi-Product Sessions, CRUD, Promote Baseline<br>• `seed-data.ts`: ชุดข้อมูลมาตรฐาน RGOM-024 |
| **Layer 4: Features & Shared** | `src/features/`<br>`src/shared/` | **Modular UI Features**:<br>• `master-data/`: Section A (Product), B (Rates), C (BOM), D (Routing), Modals<br>• `cost-breakdown/`: Executive KPIs, Variance Tree, Detailed Tables<br>• `candidate-selection/`: Top Drivers Table, Controllability Filter, Action Plan<br>• `rca-simulation/`: Driver Selector, Problem Statement, What-If 3-Scenario Grid, Apply to Active Button |

---

## 2. สูตรหลักที่ระบบใช้ (100% Parity กับ Excel)

### 🔹 Direct Material Cost ($C_M$):
$$\text{Cost}_M = Q \times P \times (1 + L)$$
$$\text{Material Price Variance (MPV)} = (P_1 - P_0) \times Q \times (1 + L_1)$$
$$\text{Material Loss Variance (MLV)} = (L_1 - L_0) \times Q \times P_0$$

### 🔹 Conversion Process Cost ($C_{\text{Conv}} = C_L + C_B$):
$$\text{Runtime per Unit} = \frac{M}{C \times Y} \quad (\text{ชั่วโมงคน / ชิ้น})$$
$$\text{Labor Cost / Unit} = \text{Runtime} \times \text{Labor Rate (THB/MHr)}$$
$$\text{Burden Cost / Unit} = \text{Runtime} \times \text{Burden Rate (THB/MHr)}$$
$$\text{Efficiency Variance (LEV + BEV)} = (\text{Active Runtime} - \text{Base Runtime}) \times (\text{Labor Rate} + \text{Burden Rate})$$

### 🔹 Top Driver Tie-Breaker Scoring:
$$\text{Score} = \text{Cost Gap} + (55 - \text{ID}) \times 10^{-8}$$
*(จัดอันดับเฉพาะค่า Gap ที่เป็นบวกจากมากไปน้อย Top 10)*

---

## 3. คำสั่งสำหรับการรันบน Local เครื่องอื่น (Dev Setup)

```powershell
# 1. ติดตั้ง Dependencies
npm install

# 2. รัน Dev Server
npm run dev

# 3. ตรวจสอบ Type Check (TypeScript)
npx tsc --noEmit

# 4. Build สำหรับ Production
npm run build
```

---

## 4. กฎเหล็กที่ต้องรักษาเสมอ (Immutable Rules)

1. **คำว่า "Kaizen" ห้ามใช้ทุกกรณี** — ใช้คำว่า `Action Plan`, `Internal Action`, `Trial`, หรือ `Promote to Baseline`
2. **Input Cells = สีเหลืองอ่อน (`bg-amber-50` หรือ `#FEF9C3`)** / Output Cells = สีขาว
3. **Excel v2 เป็น Single Source of Truth** — ตัวเลขบนเว็บต้องตรงกับ Excel ทุกทศนิยม
4. **Work Center ต้องเป็นชื่อแผนก (Department Name)** เช่น `Cutting`, `Printing-Digital RGOM`, `Assembly Digital RGOM`, `OQA-Digital`
5. **ทุกสูตรต้องมี Guard ป้องกันการหารด้วยศูนย์ (`safeDivide`)**
