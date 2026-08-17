# Engineering Handoff & Project Checkpoint — Checkpoint 9

**Date Updated**: 2026-08-17  
**Status**: **Web App Phase 1 Complete — Excel Logic Ported to Web ✅**  
**Governing Documents**:
- [`PROJECT_SPECIFIC.md`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/PROJECT_SPECIFIC.md)
- [`docs/standards/HAWS.md`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/docs/standards/HAWS.md)
- [`docs/standards/WORK_INSTRUCTIONS.md`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/docs/standards/WORK_INSTRUCTIONS.md)

---

## 1. สถานะระบบ ณ ปัจจุบัน (What Is Done)

### 1.1 Excel Model (100% สมบูรณ์ — ล็อคแล้ว ห้ามแตะ)

| Sheet | สถานะ | หมายเหตุ |
| :--- | :---: | :--- |
| `1_MASTER_RATES` | ✅ LOCKED | Product Info Row 5 + Rates Rows 9–12 |
| `2_BOM_BREAKDOWN` | ✅ LOCKED | 16 BOM Items, Rows 5–20 Input + Rows 24–39 Calc |
| `3_ROUTING_BREAKDOWN` | ✅ LOCKED | 39 Steps flat, Rows 5–43 Input + Rows 47–85 Calc |
| `4_SUMMARY_&_COMPARISON` | ✅ LOCKED | Top 10 Dynamic + Action Plan (Col J, no formula) |
| `_CALC_ENGINE` | ✅ LOCKED | 49 candidates (16 BOM + 39 Routing), tie-breaker scoring |

**Verified files** (ทำ Audit Passed แล้ว):
- [`excel_models/v2_modular/CostModel_BLANK_TEMPLATE_v2.xlsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/excel_models/v2_modular/CostModel_BLANK_TEMPLATE_v2.xlsx)
- [`excel_models/v2_modular/CostModel_RGOM-024_v2.xlsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/excel_models/v2_modular/CostModel_RGOM-024_v2.xlsx)

### 1.2 Web App (Phase 1 เสร็จ — 2026-08-17)

| หน้า / ไฟล์ | สถานะ | รายละเอียด |
| :--- | :---: | :--- |
| Master Data (Tab 1) | ✅ DONE | กรอก Product / WC Rates / BOM / Routing + Import Excel v2 |
| Cost Breakdown (Tab 2) | ✅ DONE | KPI Cards + Variance Tree Level 0–3 |
| Top Drivers / Candidate (Tab 3) | ✅ DONE | ดึงข้อมูลจริงจาก Engine, Controllability Dropdown, Action Plan |
| RCA & Trial (Tab 4) | ⚠️ PARTIAL | ยังเป็น Hardcode seed data (RGOM-024 only) ยังไม่ Dynamic |
| Excel Parser (Import) | ✅ DONE | อ่าน v2 sheet structure ถูกต้อง |
| Cost Engine | ✅ DONE | `calculateTopDrivers()` + Tie-Breaker + RCA Text auto-gen |
| Download Template | ✅ DONE | ชี้ไปที่ `_v2.xlsx` แล้ว |

---

## 2. โครงสร้างข้อมูล (Data Model) ที่ใช้อยู่

```
src/lib/types.ts
├── ProductMaster       { productCode, productDescription, uom, customer, effectiveDate }
├── WorkCenterRate      { wc (= dept name), description, laborRate, burdenRate, effectiveDate, sourceRef }
├── BOMItem             { id, itemCode, description, consumption, unit, basePrice, activePrice, baseLoss, activeLoss, sourceRef }
├── RoutingStep         { id, opSeq, description, wc, manning, baseCap, activeCap, baseYield, activeYield, sourceRef }
├── CostDriver          { id, category, driverName, rcaParameter, baseParameter, activeParameter,
│                         costGap, tieBreakerScore, rank, pctContribution,
│                         controllability, actionPlan }   ← NEW
├── KaizenOption        (legacy — ยังอยู่, ใช้ใน Tab 4 เท่านั้น)
└── ExcelImportResult
```

### กฎ WC = Department Name (สำคัญมาก)
ใน v2 Excel `wc` field **ไม่ใช่รหัส** เช่น `BZP01` แต่เป็น **ชื่อ Dept** ที่ตรงกับ `1_MASTER_RATES`:
```
"Cutting"              labor=105.29  burden=138.48
"Printing-Digital RGOM" labor=105.29  burden=97.69
"Assembly Digital RGOM"  labor=105.29  burden=90.93
"OQA-Digital"           labor=105.29  burden=82.74
```

---

## 3. สูตรหลักที่เว็บใช้ (Mirror Excel Exactly)

### BOM Material Cost:
```
Base Cost   = Q × P0 × (1 + L0)
Active Cost = Q × P1 × (1 + L1)
MPV = (P1 - P0) × Q × (1 + L1)   ← Price Variance
MLV = (L1 - L0) × Q × P0         ← Loss Variance
```

### Routing Conversion Cost:
```
Base Runtime   = Manning / (Cap0 × Y0)   MHr/Unit
Active Runtime = Manning / (Cap1 × Y1)   MHr/Unit
Labor Cost = Runtime × LaborRate
Burden Cost = Runtime × BurdenRate
```

### Top Driver Tie-Breaker (Rank Engine):
```
TieBreaker = CostGap + (55 - ID) × 0.00000001
Sort DESC by TieBreaker → Rank #1–10 (positive gap only)
```

---

## 4. สิ่งที่ยังต้องทำต่อ (Next Steps)

### Priority 1 — ใกล้เสร็จ (Low effort)
- [ ] **Tab 4 (RCA & Trial) ทำให้ Dynamic**  
  ตอนนี้ hardcode RGOM-024 เท่านั้น  
  ต้องให้ดึง driver ที่ user เลือก (Controllable อันดับ 1) จาก `topDrivers` ใน store  
  แล้วแสดง Option A/B/C เป็น What-If simulator ที่ user กรอก Target Yield/Cap เองได้

- [ ] **ปุ่ม "Promote to Baseline" ใน Tab 1**  
  ให้ copy Active → Base ทั้งหมด (BOM: P1→P0, L1→L0 / Routing: Cap1→Cap0, Y1→Y0)  
  มี Confirm Modal ก่อน  
  Reset costGap = 0 → เริ่ม PDCA รอบใหม่

### Priority 2 — Medium effort
- [ ] **VarianceTree (Tab 2) ทำให้ Dynamic ระดับ Item**  
  ตอนนี้แสดงแค่ยอดรวม Material / Labor / Burden  
  ต้องขยายให้ drill-down ได้ระดับ BOM item-by-item และ Routing step-by-step  
  เหมือน Table 2 ใน Sheet 2 & 3 ของ Excel

- [ ] **Export PDF / Print-Ready Report**  
  ให้ Tab 2 + Tab 3 พิมพ์ออกมาเป็น Report ได้  
  ใช้ `window.print()` + print CSS หรือ `jspdf`

### Priority 3 — Future feature
- [ ] **Dynamic Template Generator**  
  User เลือก N BOM items + M Routing steps แล้วสร้าง `.xlsx` template ขนาดนั้น  
  ใช้ `exceljs` หรือ `xlsx` library ฝั่ง client
- [ ] **Multi-Product Management**  
  รองรับหลาย Product Code ใน session เดียว (ตอนนี้รองรับแค่ 1 product ต่อ session)

---

## 5. กฎที่ต้องจำตลอด (Immutable Rules)

1. **คำว่า "Kaizen" ห้ามใช้ทุกกรณี** — ใช้: `Action Plan`, `Internal Action`, `Trial`, `Promote to Baseline`
2. **Input cells = พื้นสีเหลือง** `bg-amber-50` หรือ `#FEF9C3` — Output cells = ขาว
3. **Excel เป็น Source of Truth** — สูตรเว็บต้องได้ผลเลขตรงกับ Excel ทุกหลัก
4. **WC field = Department Name** (ห้ามใช้รหัส) — VLOOKUP กับ 1_MASTER_RATES
5. **ห้าม Hardcode ข้อมูล** ในทุก Page (ยกเว้น Tab 4 ที่ยังค้างอยู่)
6. **Workflow ไม่เปลี่ยน** — User flow: Tab1 Input → Tab2 Breakdown → Tab3 Select → Tab4 Simulate
7. **Formula ทุกตัวต้องมี Guard** — ถ้า base = 0 หรือ active = 0 ห้าม divide-by-zero crash

---

## 6. Key File Map

| ไฟล์ | หน้าที่ |
| :--- | :--- |
| [`src/lib/types.ts`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/src/lib/types.ts) | Type definitions ทั้งหมด |
| [`src/lib/cost-engine.ts`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/src/lib/cost-engine.ts) | สูตรคำนวณ — `calculateCostBreakdown()` + `calculateTopDrivers()` |
| [`src/lib/excel-parser.ts`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/src/lib/excel-parser.ts) | อ่านไฟล์ Excel v2 |
| [`src/lib/store.tsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/src/lib/store.tsx) | Global state (React Context) |
| [`src/lib/seed-data.ts`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/src/lib/seed-data.ts) | Default data RGOM-024 |
| [`src/pages/DataMasterPage.tsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/src/pages/DataMasterPage.tsx) | Tab 1 — Input Grid + Excel Import |
| [`src/pages/CostBreakdownPage.tsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/src/pages/CostBreakdownPage.tsx) | Tab 2 — KPI + Variance Tree |
| [`src/pages/CandidateSelectionPage.tsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/src/pages/CandidateSelectionPage.tsx) | Tab 3 — Top 10 Drivers + Controllability + Action Plan |
| [`src/pages/RCAAndTrialPage.tsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/src/pages/RCAAndTrialPage.tsx) | Tab 4 — RCA & What-If Simulator (⚠️ ยัง Hardcode) |
| [`src/components/VarianceTree.tsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/src/components/VarianceTree.tsx) | Level 0–3 Variance breakdown tree |
| [`scripts/build_excel_models_v2.js`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/scripts/build_excel_models_v2.js) | สร้าง Excel ทั้ง 2 ไฟล์ |
| [`public/CostModel_BLANK_TEMPLATE_v2.xlsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/public/CostModel_BLANK_TEMPLATE_v2.xlsx) | Template ให้ User download |
| [`public/CostModel_RGOM-024_v2.xlsx`](file:///c:/Users/ai-project/Documents/Cost%20Breakdown%20Project/public/CostModel_RGOM-024_v2.xlsx) | Reference ให้ User download |

---

## 7. คำสั่งรัน Dev

```powershell
# Start dev server (port อาจเปลี่ยนเป็น 5174 ถ้า 5173 ถูกใช้อยู่)
node node_modules/vite/bin/vite.js --port 5173

# TypeScript type check (ไม่ต้อง build)
node node_modules/typescript/bin/tsc --noEmit

# Rebuild Excel models (ถ้าแก้ build script)
node scripts/build_excel_models_v2.js
```

---

## 8. Context สำหรับ AI Agent รอบต่อไป

เมื่อเริ่ม session ใหม่ให้อ่านไฟล์เหล่านี้ก่อนทำงานทุกครั้ง:
1. **`HANDOFF.md`** (ไฟล์นี้) — สถานะปัจจุบัน
2. **`PROJECT_SPECIFIC.md`** — กฎห้ามละเมิด
3. **`docs/standards/HAWS.md`** — Protocol การทำงาน
4. **`src/lib/types.ts`** — Data model ทั้งหมด
5. **`src/lib/cost-engine.ts`** — Engine สูตรหลัก

**คำสั่งแรกที่ควรพิมพ์ใน session ใหม่คือ:**
> "อ่าน HANDOFF.md ก่อนแล้วรายงานสถานะที่เข้าใจ"
