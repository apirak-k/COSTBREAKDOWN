# COSTBREAKDOWN — SYSTEM LOGIC SOURCE OF TRUTH

**Status:** Historical working specification — superseded for current product requirements
**Version:** 0.2  
**Date:** 2026-09-14  
**Project:** Prototype System for Product Cost Breakdown Analysis  
**Purpose:** เอกสารอ้างอิงหลักสำหรับวิธีคิด โครงสร้างข้อมูล ลำดับการวิเคราะห์ และกติกาการพัฒนาระบบ COSTBREAKDOWN

---

## 0. How to Use This Document

เอกสารนี้เก็บ **ประวัติ System Logic และเหตุผลของสูตรเดิม** สำหรับการพัฒนาระบบ ณ วันที่ระบุด้านบน ไม่ใช่ตัวตัดสิน requirement ปัจจุบัน

สำหรับ requirement ปัจจุบัน ให้เริ่มจาก [`docs/REQUIREMENTS_INDEX.md`](docs/REQUIREMENTS_INDEX.md) และ page specifications ก่อน เอกสารนี้ยังมีประโยชน์สำหรับสูตรและเหตุผลเดิม แต่ถ้าขัดกันให้ถือว่า:

1. **Current page specifications** = requirement ปัจจุบันของแต่ละหน้า
2. **Cross-page contracts** = flow และขอบเขตระหว่างหน้า
3. **เอกสารนี้** = สูตร/เหตุผลเชิงประวัติที่ใช้ประกอบการตรวจสอบ
4. **Current code** = implementation ปัจจุบัน ซึ่งอาจยังไม่ตรงกับ requirement ทั้งหมด

> ห้ามแก้ logic สำคัญจากการเดาเอง หากข้อมูลจากโรงงานหรือสูตรยังไม่ยืนยัน ให้ระบุ `TO VERIFY` แทนการ invent rule ใหม่

---

# 1. Status Labels

ใช้ label ต่อไปนี้ตลอดเอกสาร

| Label | Meaning |
|---|---|
| **CONFIRMED** | ตกลงแล้วและใช้เป็นกติกาหลักของระบบ |
| **WORKING DECISION** | แนวทางที่เลือกใช้ปัจจุบัน แต่ยังปรับได้ถ้ามีหลักฐานใหม่ |
| **TO VERIFY** | ยังต้องยืนยันกับ Cost Declare / โรงงาน / อาจารย์ |
| **DO NOT ASSUME** | ห้ามระบบหรือ Agent สรุปเองจากข้อมูลไม่พอ |

---

# 2. Core Project Goal

## CONFIRMED

ระบบ COSTBREAKDOWN ไม่ใช่เพียง Dashboard แสดงต้นทุน แต่เป็นระบบช่วยวิเคราะห์ตั้งแต่การทำฐานต้นทุนให้สอดคล้องกับสภาพจริง ไปจนถึงการพิสูจน์ผลของการปรับปรุง

Canonical flow:

```text
COMPARISON #1 — BEFORE IMPROVEMENT

Base₁ / Reference Standard
        ↕
Current-condition cost / standard from current data

Gap₁
        ↓
Explain Cost / Structure Gap
        ↓
Identify Cost Drivers / Changed Factors
        ↓
Human Select a Controllable + Feasible Improvement Candidate
        ↓
RCA
        ↓
Improvement Action
        ↓
What-If
        ↓
Predicted Improved Standard / Base₂
        ↓
Real Trial

COMPARISON #2 — AFTER IMPROVEMENT

Base₂ / Predicted Improved Standard
        ↕
Actual₂ / Actual Trial Result

Gap₂
```

หลักสำคัญ:

> **Explain the gap first. Select a suitable factor second. RCA comes after selection.**

Project success ต้องดูสองแกนแยกกัน:

```text
Alignment / model success:
Gap₂ < Gap₁
and ideally Gap₂ → 0

Improvement success:
Cost after improvement is lower than cost before improvement
within the selected improvement scope.
```

ระบบต้องไม่กระโดดจาก Total Cost ไป Root Cause โดยไม่มี trace ของความเปลี่ยนแปลงก่อน

---

# 3. Terminology — ชื่อที่ต้องใช้ให้ตรงกัน

## 3.1 Reference Standard / Base

**CONFIRMED**

หมายถึง Standard Cost จาก Cost Declare ก่อนหน้า / ชุดอ้างอิงเดิมของบริษัท

ชื่อที่ใช้ในระบบ:

```text
Reference Standard
Reference Snapshot
Base
Before Cost Declare
```

คำเหล่านี้หมายถึงฝั่งอ้างอิงเดียวกันตาม context

---

## 3.2 Current Standard

**CONFIRMED**

หมายถึง Standard Cost ที่คำนวณจาก Cost Declare ปัจจุบัน / ข้อมูลปัจจุบันที่ต้องการนำมาเปรียบเทียบ

ชื่อที่ใช้:

```text
Current Standard
Current Snapshot
After Cost Declare
```

### Important

**ห้ามเรียก Current Standard ว่า `Actual`**

เพราะมันยังเป็น Standard Cost ที่คำนวณจากข้อมูล/กติกา ไม่ใช่ผลจริงจาก Improvement Trial

---

## 3.3 Actual Trial Result

**CONFIRMED**

คำว่า `Actual` สงวนไว้สำหรับข้อมูลที่วัดได้จริงหลังนำ Improvement Action ไปทดลองหน้างานแล้ว

```text
Reference Standard
       ↓
Current Standard
       ↓
Improvement Analysis
       ↓
Predicted Result
       ↓
Actual Trial Result
```

---

# 4. Three Different Reference Layers (Historical Model)

เอกสารเดิมแยกคำว่า Source of Truth เป็น 3 ระดับเพื่ออธิบายบริบทในเวลานั้น ปัจจุบันให้ใช้คำศัพท์และลำดับเอกสารจาก `docs/REQUIREMENTS_INDEX.md` เป็นหลัก

## 4.1 Business Data Source of Truth

**HISTORICAL CONTEXT**

Cost Declare และข้อมูลโรงงานที่ได้รับการยืนยัน คือแหล่งข้อมูลธุรกิจต้นทาง

ตัวอย่าง:

- BOM
- Material Price
- Material Loss
- Routing
- Capacity
- Yield
- MHr
- Work Center
- Labor Rate
- Burden Rate
- Effective Date / Period

---

## 4.2 Mathematical Source of Truth

**HISTORICAL CONTEXT**

Excel model ที่ผ่านการตรวจสอบสูตร ใช้เป็น mathematical reference ของ prototype จนกว่าจะมีการยืนยัน formula ใหม่

Web ต้องไม่สร้างสูตรใหม่ที่ขัดกับ verified calculation โดยไม่มี decision/update ในเอกสารนี้

---

## 4.3 System Logic Source of Truth

**SUPERSEDED — HISTORICAL CONTEXT**

ไฟล์นี้เคยเป็นหลักอ้างอิงสำหรับ:

- Data architecture
- Comparison flow
- Diff semantics
- Candidate / RCA / What-If / Trial flow
- Version lifecycle
- Naming
- Guardrails

---

# 5. Canonical Data Model — Snapshot First

## 5.1 Main Decision

**CONFIRMED**

ระบบควรคิดแบบ **Snapshot vs Snapshot** ไม่ใช่บังคับ Before/After อยู่ใน Routing/BOM row เดียวกัน

Canonical concept:

```text
REFERENCE SNAPSHOT
(Before Cost Declare)
├── Product
├── Work Center Rates
├── BOM
└── Routing

CURRENT SNAPSHOT
(After Cost Declare)
├── Product
├── Work Center Rates
├── BOM
└── Routing
```

จากนั้นจึงสร้าง:

```text
COMPARISON
Reference Snapshot ↔ Current Snapshot
```

---

## 5.2 Why Snapshot First

**CONFIRMED**

Cost Declare ปัจจุบันสามารถมีโครงสร้าง Routing หรือ BOM ไม่เหมือน Cost Declare เดิม เช่น:

- operation เพิ่ม
- operation หาย
- sequence เปลี่ยน
- Work Center เปลี่ยน
- parameter เปลี่ยน
- item เพิ่ม/ลบ

ดังนั้น model แบบ:

```text
one row
baseCap + currentCap
baseYield + currentYield
```

จะใช้ได้เฉพาะกรณีที่โครงสร้างสองฝั่งเหมือนกันเท่านั้น

Snapshot model รองรับ structural change ได้ถูกต้องกว่า

---

# 6. Canonical Calculation Order

## CONFIRMED

**คำนวณแต่ละ snapshot แยกกันก่อน แล้วค่อย compare**

```text
Reference Snapshot
→ Calculate Reference Standard Cost

Current Snapshot
→ Calculate Current Standard Cost

Current - Reference
→ Standard Cost Gap
```

ห้ามบังคับให้ rows match กันก่อนเพื่อให้สามารถคำนวณ total cost ได้

แต่ละ snapshot ต้องสามารถคำนวณ independently จากข้อมูลของตัวเอง

---

# 7. Cost Structure

## CONFIRMED

High-level cost structure:

```text
Total Standard Cost
= Direct Material
+ Direct Labor
+ Manufacturing Burden
```

Comparison:

```text
Total Gap
= Current Total Standard Cost
- Reference Total Standard Cost
```

ระบบต้อง reconcile ได้ว่า:

```text
Material Gap
+ Labor Gap
+ Burden Gap
= Total Gap
```

ภายใต้ calculation rules ที่ใช้งานอยู่

---

# 7A. Two Comparison Gaps and Project Success

## 7A.1 Gap₁ — Before Improvement

**CONFIRMED**

Gap₁ ใช้ประเมินความแตกต่างของคู่ก่อนการปรับปรุง:

```text
Base₁ / Reference Standard
        ↕
Current-condition value

Gap₁ = |Current-condition value - Base₁|
```

Gap₁ อาจมีทั้ง favorable และ unfavorable effects จาก Cost Declare comparison เดิม

ระบบสนใจต่อเฉพาะ unfavorable Cost Driver ที่:

```text
Controllable?
Feasible?
Within project scope?
Requirement fit?
Can be trialed?
```

ก่อนเลือกไป RCA

## 7A.2 Base₂ — Improved Standard / Predicted Improved Cost

**CONFIRMED**

หลังเลือก Cost Driver, ทำ RCA และกำหนด Improvement Action แล้ว ระบบใช้ What-If เพื่อคำนวณฐานที่คาดหวังหลังปรับปรุง:

```text
Base₂
= Predicted Improved Standard / Predicted Improved Cost
```

Base₂ เป็นฐานของคู่หลังการปรับปรุง และไม่จำเป็นต้องเท่ากับ Base₁

## 7A.3 Gap₂ — After Improvement

**CONFIRMED**

หลังทดลองจริง:

```text
Gap₂ = |Actual₂ - Base₂|
```

โดย:

```text
Actual₂ = Actual Trial Result / actual result after improvement
```

## 7A.4 Primary Alignment Success Rule

**CONFIRMED**

```text
Gap₂ < Gap₁
```

และ ideal target คือ:

```text
Gap₂ → 0
```

ความหมายคือ หลังมี Source of Truth + Cost Driver Analysis + RCA + Improvement แล้ว ค่า Base/Standard ของช่วงหลังควรสอดคล้องกับสิ่งที่เกิดขึ้นจริงมากกว่าคู่ก่อนการปรับปรุง

## 7A.5 Cost Reduction Is a Separate Success Dimension

**CONFIRMED**

Gap ที่เล็กลงอย่างเดียวไม่พอที่จะพิสูจน์ว่า “ลดต้นทุนสำเร็จ”

ต้องพิจารณาอีกแกนหนึ่ง:

```text
Cost after improvement
<
Cost before improvement
```

อย่างน้อยภายใน selected Cost Driver / improvement scope

ดังนั้น Project Success มีสองแกน:

```text
1. Alignment / Model Success
   Gap₂ < Gap₁
   ideally Gap₂ → 0

2. Improvement Success
   Cost after improvement < Cost before improvement
   within the selected improvement scope
```

---

# 8. BOM Comparison Logic

## 8.1 Snapshot BOM

**CONFIRMED**

แต่ละ snapshot ต้องมี BOM ของตัวเองเต็มชุด

ไม่ควร assume ว่า item set เหมือนกันเสมอ

---

## 8.2 BOM Diff Status

**WORKING DECISION**

แต่ละรายการควรถูก classify เป็น:

```text
UNCHANGED
MODIFIED
ADDED
REMOVED
UNMATCHED / NEED REVIEW
```

ตัวอย่าง:

```text
Reference BOM: M01, M02, M03
Current BOM:   M01, M03, M04

M01 = Modified / Unchanged ตาม field diff
M02 = Removed
M03 = Modified / Unchanged
M04 = Added
```

---

## 8.3 Matching Key

**WORKING DECISION**

ใช้ stable business identifier ก่อน เช่น:

```text
Material Code / Item Code
```

หากไม่มี stable ID ให้ manual review แทนการจับคู่แบบเดา

---

# 9. Routing Comparison Logic

## 9.1 Main Decision

**CONFIRMED**

Routing ต้อง compare เป็น **two complete routing snapshots**

ระบบต้องรองรับว่า Routing Before และ Routing Current มีจำนวน operation หรือโครงสร้างไม่เท่ากัน

---

## 9.2 Routing Diff Status

**WORKING DECISION**

แต่ละ operation สามารถเป็น:

```text
UNCHANGED
MODIFIED
ADDED
REMOVED
MOVED / REORDERED
UNMATCHED / NEED REVIEW
```

`MODIFIED` อาจประกอบด้วย:

```text
Work Center changed
MHr changed
Capacity changed
Yield changed
Other approved routing field changed
```

---

## 9.3 Operation Identity

**CONFIRMED**

**Sequence Number ห้ามใช้เป็น identity หลักโดยลำพัง**

เหตุผล:

```text
Reference
10 Cutting
20 Printing
30 Assembly

Current
10 Cutting
20 Inspection
30 Printing
40 Assembly
```

ถ้า match ด้วย Seq อย่างเดียว จะจับ Printing ↔ Inspection ผิด

---

## 9.4 Preferred Matching Order

**WORKING DECISION**

Priority:

1. Stable Operation ID / Routing ID จาก Cost Declare ถ้ามี
2. Stable Process Code ถ้ามี
3. Composite match เช่น normalized process name + Work Center + supporting attributes
4. ถ้ายัง ambiguous → `NEED REVIEW` และให้มนุษย์ confirm mapping

### DO NOT ASSUME

ระบบห้าม fuzzy-match แล้วประกาศว่า operation สองตัวคือรายการเดียวกันโดยอัตโนมัติ หากความมั่นใจไม่พอ

---

# 10. Structural Change vs Parameter Change

## CONFIRMED

ต้องแยกสองแนวคิดนี้ออกจากกัน

### Structural Change

```text
Operation Added
Operation Removed
Operation Reordered
Routing assignment changed
```

### Parameter Change

```text
MHr changed
Capacity changed
Yield changed
Rate changed
```

Structural change ไม่ควรถูกบังคับให้กลายเป็น Yield/Capacity variance

---

# 11. Cost Effect of Added / Removed Routing

## WORKING DECISION

เมื่อคำนวณทั้งสอง snapshots แยกกันแล้ว สามารถแสดง cost effect ที่ระดับ operation ได้แบบตรงไปตรงมา:

### Matched Operation

```text
Operation Cost Gap
= Current Operation Cost
- Reference Operation Cost
```

### Added Operation

```text
Reference Cost = 0
Current Cost   = Current Operation Cost
Gap            = +Current Cost
```

### Removed Operation

```text
Reference Cost = Reference Operation Cost
Current Cost   = 0
Gap            = -Reference Cost
```

ผลรวม operation-level gap ควร reconcile กับ Routing / Conversion gap

---

# 12. MHr — Current Agreed Treatment

## 12.1 What We Know

**CONFIRMED**

โรงงานมี policy / วิธีการคิด MHr ของตัวเอง และ prototype ปัจจุบันต้อง **preserve วิธีคิดของโรงงาน** ไม่ตีความใหม่เอง

ใน Excel model ปัจจุบัน:

```text
MHr = input ของ Routing
Runtime = MHr / (Capacity × Yield)
```

และ Labor/Burden ใช้ runtime นี้กับ rate ตาม verified model ปัจจุบัน

---

## 12.2 Physical Meaning of MHr

**TO VERIFY**

ความหมายเชิงกายภาพของ `MHr` ยังไม่ยืนยัน 100%

ข้อมูลจากการอธิบายของผู้ใช้ ณ ปัจจุบัน:

- ค่า MHr สามารถเป็นทศนิยม เช่น `0.5`
- `0.5` ไม่ควรถูกตีความง่าย ๆ ว่า “มีคนครึ่งคน”
- มีกรณีที่ทรัพยากร/คนเดียวถูก allocate หรือ share ระหว่างหลายจุดตาม policy โรงงาน
- ค่าทศนิยมในกลุ่มที่สัมพันธ์กันอาจรวมกลับเป็นจำนวนเต็มตามวิธีคิดโรงงาน

### DO NOT ASSUME

ห้าม rename MHr เป็น `Headcount` จนกว่าจะยืนยัน semantics จริง

ห้าม derive จำนวนคนจริงจาก MHr โดยอัตโนมัติ

---

## 12.3 Parallel Processing

**WORKING DECISION / TO VERIFY WITH REAL COST DECLARE**

จาก policy ที่อธิบาย:

เมื่อ process สามารถ run พร้อมกัน:

```text
Elapsed process time อาจคงเดิม
Capacity เพิ่มขึ้นแทน
```

ตัวอย่าง concept:

```text
1 parallel unit:
Time = 1 hr
Capacity = 100 unit/hr

2 parallel units:
Time = 1 hr
Capacity = 200 unit/hr
```

ดังนั้นระบบไม่ควรสมมุติเองว่า:

```text
parallel count ×2
→ time ÷2
```

ให้ใช้ค่า Capacity / MHr / Yield ตาม Cost Declare และ company policy ที่ได้รับ

---

## 12.4 Canonical MHr Rule for Development

**CONFIRMED**

จนกว่าจะ verify semantics:

1. Preserve field name `MHr`
2. Preserve raw value จาก Cost Declare
3. Preserve current verified formula
4. ไม่ reinterpret เป็น literal people count
5. ไม่สร้าง secondary business meaning ที่ Cost Declare ไม่ได้ระบุ
6. ถ้าพบข้อมูลขัดกับสูตร → mark `TO VERIFY`, ห้ามแก้สูตรเอง

---

# 13. Rate Handling

## CONFIRMED PRINCIPLE

Rate ต้องมาจาก source ที่ trace ได้

```text
Labor Rate
Burden Rate
Work Center / Department
Effective Period
Source Reference
```

### DO NOT ASSUME

ห้ามใช้ silent fallback financial rate แล้วแสดงผลเหมือนข้อมูลจริง

หาก prototype จำเป็นต้องใช้ fallback เพื่อ demo ต้อง tag อย่างชัดเจนว่าเป็น estimated / fallback และแยกจาก verified result

---

# 14. The Diff Layer Comes Before RCA

## CONFIRMED

Canonical flow:

```text
Reference Cost Declare
        ↓
Current Cost Declare
        ↓
Calculate both independently
        ↓
Full Diff
        ↓
Explain Cost Gap
        ↓
Changed Factors / Structural Changes
        ↓
Candidate Selection
        ↓
RCA
```

RCA ไม่ใช่เครื่องมือสำหรับหาว่า “อะไรเปลี่ยน”

Diff / Cost Breakdown ต้องตอบคำถามนั้นก่อน

---

# 15. Drill-Down Model

## CONFIRMED

อย่างน้อยระบบต้องสามารถ drill down จาก:

```text
Total Cost Gap
→ Main Cost Category
→ BOM Item / Routing Process
→ Changed Fields / Factors
```

ตัวอย่าง Material:

```text
Total Gap
→ Material Gap
→ Material M01
→ Price / Loss / Usage changed
```

ตัวอย่าง Routing:

```text
Total Gap
→ Labor/Burden Gap
→ Printing Process
→ MHr / Capacity / Yield / WC changed
```

---

# 16. Exact Cost Attribution vs Changed-Factor Detection

## 16.1 Important Distinction

**CONFIRMED**

มีสองสิ่งที่ต่างกัน:

### A. Exact Snapshot Cost Gap

```text
Current Cost - Reference Cost
```

อันนี้เป็นค่าหลักที่แน่นอนตาม model

### B. Attribution to Individual Variables

เช่น:

```text
Capacity caused +0.08
Yield caused +0.12
MHr caused +0.04
```

กรณีหลาย variable เปลี่ยนพร้อมกัน อาจมี interaction และผล attribution ขึ้นกับ methodology

---

## 16.2 Canonical Safety Rule

**CONFIRMED**

ถ้ายังไม่มี approved decomposition methodology:

ให้ระบบแสดง:

```text
Process Cost Gap = +X
Changed Inputs:
- Capacity A → B
- Yield C → D
- MHr E → F
```

แต่ **ห้ามอ้างว่าแต่ละตัวสร้าง cost effect เท่าไร** ถ้าสูตร attribution ยังไม่ได้รับการยืนยัน

---

## 16.3 Existing Verified Variance Formulas

**WORKING DECISION**

Variance formula ที่ผ่านการ verify ใน Excel สามารถใช้ต่อได้ในขอบเขตที่ assumptions ยังถูกต้อง

ถ้า data architecture เปลี่ยนจน assumptions ไม่เหมือนเดิม ต้อง verify reconciliation ใหม่ก่อนถือเป็น canonical

---

# 17. Candidate Collection

## CONFIRMED

ระบบต้อง collect findings จากทุก branch ก่อนเลือก RCA

ตัวอย่าง:

```text
Material Price changed
Material Loss changed
Material Usage changed
Routing operation added
Routing operation removed
Capacity changed
Yield changed
MHr changed
Rate changed
```

ไม่ควรดูเฉพาะ Top 1 แล้วทิ้ง finding อื่น

---

# 18. Candidate Prioritization

## CONFIRMED

Cost impact ใช้สำหรับ prioritization แต่ **Cost Impact สูงสุดไม่จำเป็นต้องเป็นสิ่งที่เลือกปรับปรุง**

การเลือกต้องคำนึงถึง scope ของโครงงานและความเป็นไปได้จริง

Canonical evaluation:

```text
Cost Impact
Can Influence?
Feasible to Study?
Requirement / Specification Fit?
Within Project Scope?
```

Candidate ที่ไม่ถูกเลือกต้องไม่หาย สามารถอยู่สถานะ:

```text
Pending
Deferred
Rejected with reason
Selected for RCA
```

---

# 19. Factor vs Root Cause vs Action

## CONFIRMED

ต้องแยกชัดเจน:

```text
Factor
= What changed?

Root Cause
= Why did it change?

Action
= What can we change to address the root cause?
```

ตัวอย่าง:

```text
Factor:
Printing Yield 95% → 90%

RCA Question:
Why did Printing Yield decrease?

Root Cause:
Machine setting was unstable

Action:
Standardize machine parameters / add setup check
```

---

# 20. RCA Entry Point

## CONFIRMED

RCA เริ่ม **หลังจาก Human Selection**

```text
All Findings
→ Scope / Feasibility Review
→ Select one suitable factor/path
→ RCA
```

ไม่ควรทำ RCA ทุก diff โดยอัตโนมัติ

---

# 21. What-If Logic

## CONFIRMED

What-If ต้องจำลอง **Improvement Action** ไม่ใช่เพียงเปลี่ยนเลข parameter โดยไม่มีที่มา

```text
Root Cause
→ Action Option
→ Expected Parameter / Process Change
→ Added Cost / Investment / Risk
→ Predicted Standard Cost
```

Scenario A/B/C ยังใช้ได้

---

# 22. What-If Must Not Change Official Current Data

## CONFIRMED

What-If = Prediction

ดังนั้น:

```text
Simulation Target ≠ Current Standard
```

ห้ามกด simulation แล้ว mutate Current / Active source-of-truth dataset โดยตรง

หากต้องใช้ scenario ต่อในการทดลอง ให้สร้าง:

```text
Trial Plan / Scenario Draft
```

แยกจาก official Current Snapshot

---

# 23. Trial Logic

## CONFIRMED

Proposal ต้องการทดลองแนวทางปรับปรุงอย่างน้อยหนึ่งแนวทางภายใต้ขอบเขตที่บริษัทอนุญาต

Canonical trial flow:

```text
Selected Factor
→ RCA
→ Selected Action
→ Predicted Improved Standard / Base₂
→ Real Shop-Floor Trial
→ Actual₂ / Actual Trial Result
→ Calculate Gap₂
→ Compare Gap₂ with Gap₁
→ Review Prediction vs Actual
```

หลัง Trial ต้องตรวจอย่างน้อย:

```text
Gap₂ < Gap₁
```

และตรวจแยกว่าการปรับปรุงทำให้ต้นทุนของ selected improvement scope ลดลงจริงหรือไม่

Trial ควรเก็บข้อมูล relevant ต่อ action เช่น:

- actual cost
- yield
- usage / consumption
- loss
- capacity
- MHr / runtime field ที่เกี่ยวข้อง
- quality result
- notes / evidence

ไม่จำเป็นต้องบังคับทุก field หาก action ไม่เกี่ยวข้อง แต่ต้องเก็บพอพิสูจน์ผล

---

# 24. Actual Trial Is Not Automatically a New Standard

## CONFIRMED

ผลทดลองจริงยังต้องผ่าน review ก่อน

```text
Actual Trial Result
→ Review
→ Validated?
   ├─ No → keep as trial record
   └─ Yes → create new Draft dataset
             ↓
           Check
             ↓
           Activate
```

ห้าม promote trial เป็น baseline โดยข้าม review/version lifecycle

---

# 25. Version Lifecycle

## CONFIRMED

Canonical application lifecycle:

```text
ARCHIVED
Historical snapshot
Read-only

ACTIVE
Current approved dataset / source used for official analysis
Read-only for direct edits

DRAFT
Working copy
Editable
```

Flow:

```text
Active
→ Clone / Import as Draft
→ Edit / Validate
→ Activate Draft
→ Previous Active becomes Archived
```

---

# 26. Snapshot Comparison vs App Version State

## CONFIRMED

ต้องแยกสองแนวคิด:

### Business Comparison

```text
Reference Snapshot vs Current Snapshot
```

### Application Lifecycle

```text
Draft / Active / Archived
```

สองอย่างนี้ไม่ควรซ้อนกันแบบสับสน

Long-term canonical model คือ **แต่ละ version เป็น complete snapshot** แล้ว comparison object อ้างอิง snapshot สองตัว

---

# 27. Current Implementation Is Transitional

## CURRENT STATE — NOT CANONICAL

โค้ดปัจจุบันยังเก็บ Before/Current หลาย field ไว้ใน row เดียว เช่น:

```text
basePrice / activePrice
baseLoss / activeLoss
baseCap / activeCap
baseYield / activeYield
```

และ Routing ใช้ structure เดียวกันทั้งสองฝั่ง

นี่ถือเป็น **transitional implementation** ไม่ใช่ final canonical data architecture เพราะไม่รองรับ routing structural diff ได้ครบ

---

# 28. Recommended Canonical Data Objects

## WORKING DECISION

Conceptual model:

```ts
CostSnapshot {
  id
  product
  effectiveDate
  sourceReference
  rates[]
  bom[]
  routing[]
  status // draft | active | archived
}
```

```ts
CostComparison {
  id
  referenceSnapshotId
  currentSnapshotId
  totalGap
  materialGap
  laborGap
  burdenGap
  bomDiff[]
  routingDiff[]
  rateDiff[]
}
```

```ts
RoutingDiff {
  matchStatus
  referenceOperation?
  currentOperation?
  changedFields[]
  referenceCost
  currentCost
  costGap
  mappingConfidence
}
```

Exact TypeScript naming canเปลี่ยนได้ แต่ semantics ต้องรักษาไว้

---

# 29. Matching Must Be Auditable

## CONFIRMED

ทุก matched routing operation ต้องสามารถตอบได้ว่า:

```text
Why did the system consider these the same operation?
```

ควรเก็บ metadata เช่น:

```text
Matched by Operation ID
Matched by Process Code
Manually confirmed
Composite match — review required
```

ห้ามมี invisible matching logic ที่ user audit ไม่ได้

---

# 30. Reconciliation Rules

## CONFIRMED

ทุกชั้นของ breakdown ที่อ้างเป็น cost attribution ต้อง reconcile กับ parent

อย่างน้อย:

```text
Material + Labor + Burden = Total
```

และหากแสดง routing operation gaps:

```text
Σ Routing Operation Gap
= Routing / Conversion Gap
```

หากไม่ reconcile ให้ระบบแสดง discrepancy ไม่ควรซ่อน

---

# 31. Data Quality / Confidence

## WORKING DECISION

ข้อมูลควร trace ได้ว่า:

```text
Source Reference
Effective Date / Period
Confidence / Verification State
```

แต่ confidence indicator เป็น metadata ไม่ควรเปลี่ยนค่าทางคณิตศาสตร์เอง

หากใช้ estimated value ต้องสื่อให้ชัดเจน

---

# 32. Handling Missing Data

## WORKING DECISION

ห้ามสร้าง verified-looking financial result จากค่า default ที่ไม่มี source

ทางเลือกที่ถูกต้อง:

```text
A. Block calculation เฉพาะส่วนที่คำนวณไม่ได้
B. Use explicit estimated/fallback value + visible warning/source
```

### DO NOT ASSUME

ห้าม silent fallback

---

# 33. Primary User Story

## CONFIRMED

System story ที่ต้องสามารถสาธิตได้:

```text
1. Import / select Before Cost Declare
2. Build Reference Snapshot / Base₁
3. Import / select Current Cost Declare
4. Build Current Snapshot
5. Calculate both independently
6. Calculate Gap₁ and show Reference vs Current gap
7. Drill into Material / Labor / Burden
8. Show BOM / Routing / Rate diff
9. Identify added / removed / modified structures
10. Identify favorable and unfavorable changes
11. Review scope / influence / feasibility
12. Select one unfavorable, controllable, feasible factor/path to improve
13. RCA
14. Define actions from root cause
15. What-If A/B/C
16. Calculate Predicted Improved Standard / Base₂
17. Choose action for real trial
18. Record Actual₂ / Actual Trial Result
19. Calculate Gap₂ = |Actual₂ - Base₂|
20. Verify Gap₂ < Gap₁
21. Verify cost reduction within the selected improvement scope
22. Compare Predicted vs Actual and review trial evidence
23. Create new Draft snapshot if validated
24. Activate new version
25. Archive prior Active version
```

---

# 34. Example Routing Diff Story

## Reference

```text
10 Cutting
20 Printing
30 Inspection
40 Assembly
```

## Current

```text
10 Cutting
20 Printing
30 Laser Process
40 Assembly
```

## Expected Diff

```text
Cutting       → matched, parameters compare
Printing      → matched, parameters compare
Inspection    → REMOVED
Laser Process → ADDED
Assembly      → matched, parameters compare
```

Cost should be calculated per snapshot first, then diffed

---

# 35. Example Parameter Diff Story

```text
Printing — Reference
MHr      = 0.5
Capacity = 100
Yield    = 95%

Printing — Current
MHr      = 0.5
Capacity = 200
Yield    = 95%
```

Expected interpretation:

```text
MHr      = unchanged
Capacity = changed
Yield    = unchanged
```

### DO NOT ASSUME

ห้ามสรุปว่า elapsed time ลด 50% หาก Cost Declare / company rule ไม่ได้บอกแบบนั้น

---

# 36. Example Multi-Variable Change

```text
Printing — Reference
MHr      = 1
Capacity = 1000
Yield    = 95%

Printing — Current
MHr      = 1.5
Capacity = 800
Yield    = 88%
```

Canonical display ก่อนมี approved decomposition:

```text
Process Cost Gap = Current Process Cost - Reference Process Cost

Changed Fields:
- MHr: 1 → 1.5
- Capacity: 1000 → 800
- Yield: 95% → 88%
```

ระบบยังไม่ควร declare ว่าแต่ละ field สร้าง cost gap กี่บาทจนกว่า attribution method จะถูกยืนยัน

---

# 37. Decision on “Top Driver”

## CONFIRMED

`Top Driver` เป็น **prioritization aid** ไม่ใช่ automatic RCA decision

ระบบสามารถ sort ตาม Cost Gap เพื่อช่วยดูประเด็นใหญ่ก่อน แต่การเลือกต้องผ่าน human review

```text
Highest Cost Gap
≠ Automatically Best Improvement Candidate
```

---

# 38. Project Scope Filter

## CONFIRMED

หลัง explain diff ครบแล้ว ให้คัดเลือกสิ่งที่เหมาะกับ scope เช่น:

```text
Controllable within plant?
Feasible to investigate?
Within project time?
Allowed by product/process requirement?
Can be trialed under company permission?
```

การคัดเลือกตาม scope เป็นส่วนที่ Proposal ต้องการ ไม่ใช่ข้อผิดพลาดที่ไม่เลือกตัวเลขสูงสุด

---

# 39. What the System Must Not Do

## DO NOT ASSUME / GUARDRAILS

ระบบและ AI Agent ห้าม:

1. เรียก Current Standard ว่า Actual Trial
2. ใช้ Sequence เป็น routing identity อย่างเดียว
3. บังคับ Before/Current routing ให้มี rows เท่ากัน
4. ตีความ MHr เป็น literal headcount โดยไม่มีหลักฐาน
5. ตีความ parallel processing ว่า time ต้องหารตามจำนวน parallel unit
6. ทำ RCA ก่อน explain cost / structure diff
7. เลือก highest cost gap เป็น RCA target อัตโนมัติ
8. เขียน What-If target ทับ Current Snapshot
9. Promote Trial เป็น official standard โดยไม่ review
10. สร้าง formula หรือ cost attribution ใหม่จากการเดา
11. ใช้ silent financial fallback แล้วแสดงเหมือน verified data
12. ซ่อน reconciliation error
13. ใช้ Base₁ เป็นฐานของ Gap₂ โดยอัตโนมัติ ทั้งที่คู่หลังต้องอิง Base₂ ของหลังปรับปรุง
14. สรุปว่าลดต้นทุนสำเร็จจาก Gap₂ < Gap₁ เพียงอย่างเดียว โดยไม่ตรวจ cost reduction ของ selected improvement scope

---

# 40. Current Open Questions

หัวข้อต่อไปนี้ยัง **TO VERIFY** และต้องไม่ถูกปิดด้วย assumption

## Q1 — Exact MHr Definition

ต้องยืนยันว่าใน Cost Declare ของโรงงาน `MHr` มีนิยามทางการว่าอะไร

คำถามที่ต้องตอบ:

- Machine Hour?
- Man Hour?
- Combined machine-and-man policy value?
- Allocation factor?
- มี rule การรวมค่า 0.5 + 0.5 แบบใด?

จนกว่าจะรู้ ให้ preserve raw value + current company calculation policy

---

## Q2 — Stable Routing Identifier

ต้องตรวจ Cost Declare Before / Current จริงว่า field ไหนใช้ match operation ได้ดีที่สุด

Priority candidate:

```text
Operation ID
Process Code
Process Name + Work Center
Manual mapping
```

---

## Q3 — Cycle Time

Proposal พูดถึง Cycle Time แต่ current model หลักใช้ MHr / Capacity / Yield

ต้องยืนยันว่า:

- Cost Declare มี Cycle Time จริงหรือไม่
- Cycle Time เป็น input หรือ derived value
- ใช้ใน company cost formula หรือใช้เพียง operational analysis

ห้ามเพิ่ม field เพียงเพราะ Proposal มีคำนี้ หาก data source จริงไม่มีหรือ company formula ไม่ใช้

---

## Q4 — Labor vs Burden Runtime

Proposal เชิงทฤษฎีแยก Labor Hours และ Resource Hours แต่ current Excel model ใช้ runtime เดียวกับ Labor/Burden

ต้องยืนยันกับ company costing rule ว่า:

```text
Labor Runtime == Burden Runtime
```

เป็น policy จริงสำหรับ case study หรือเป็น simplification ของ prototype

จนกว่าจะยืนยัน ห้ามเปลี่ยน formula เอง

---

## Q5 — Rate Changes Between Cost Declares

ต้องตรวจว่า Before และ Current Cost Declare มี Labor/Burden Rate คนละช่วงหรือไม่

ถ้ามี ต้อง compare rate snapshot-to-snapshot

---

## Q6 — Multi-Variable Cost Attribution Method

ถ้า MHr + Capacity + Yield เปลี่ยนพร้อมกัน จะ attribute Cost Gap ต่อ factor อย่างไร?

ตัวเลือกที่ต้องได้รับการอนุมัติก่อน implement เช่น:

- sequential substitution
- fixed-order variance decomposition
- Shapley-style allocation
- one-factor sensitivity only
- no atomic monetary attribution; show changed fields only

ปัจจุบัน canonical default คือ:

> **Show exact process cost gap + changed fields. Do not invent individual monetary attribution.**

---

# 41. Inputs Needed to Close Open Questions

ลำดับข้อมูลที่ควรนำมาตรวจต่อ:

1. Cost Declare Before จริง
2. Cost Declare Current จริง
3. ตัวอย่าง Routing ที่เพิ่ม/ลบ/เปลี่ยนจริง
4. Header / field names จริง
5. สูตรหรือคำอธิบาย MHr จากโรงงาน ถ้ามี
6. ตัวอย่างกรณี parallel process
7. Work Center rate period / rate history

หลังได้ข้อมูลสอง Cost Declare ให้ทำ **read-only real diff review ก่อนแก้ code**

---

# 42. Implementation Priority from This Source of Truth

## Phase 0 — Real Data Mapping Review

```text
Before Cost Declare
vs
Current Cost Declare
```

ตรวจ:

- schema
- routing key
- added/removed rows
- BOM key
- rate differences
- MHr behavior

**Do not code first.**

---

## Phase 1 — Snapshot Model

สร้าง full independent snapshot model

```text
Reference Snapshot
Current Snapshot
```

---

## Phase 2 — Comparison / Diff Engine

รองรับ:

```text
BOM Diff
Routing Diff
Rate Diff
Cost Diff
```

พร้อม status:

```text
Added / Removed / Modified / Unchanged / Need Review
```

---

## Phase 3 — Reconciliation + Drill Down

```text
Total
→ Main category
→ Item / Process
→ Changed fields
```

---

## Phase 4 — Candidate / Scope Selection

Human chooses suitable improvement target

---

## Phase 5 — RCA / Action

RCA after candidate selection only

---

## Phase 6 — What-If / Trial

Simulation separate from official Current Snapshot

---

## Phase 7 — Version Closure

Validated trial → Draft → Review → Activate → Archive previous Active

---

# 43. Acceptance Criteria for Snapshot Comparison

ระบบ comparison ถือว่าใช้ได้เมื่อผ่านกรณีต่อไปนี้:

### Case A — Same Routing, Parameter Changed

```text
same operation
Capacity changed
```

Expected:

```text
MODIFIED
changedFields = [Capacity]
```

---

### Case B — Operation Added

Expected:

```text
ADDED
referenceCost = 0
currentCost = new operation cost
```

---

### Case C — Operation Removed

Expected:

```text
REMOVED
referenceCost = old operation cost
currentCost = 0
```

---

### Case D — Sequence Changed Only

ถ้า stable ID เดิม:

Expected:

```text
same operation
MOVED / REORDERED
not remove + add
```

---

### Case E — Ambiguous Match

Expected:

```text
NEED REVIEW
```

ระบบห้าม auto-commit mapping

---

### Case F — Total Reconciliation

Expected:

```text
Σ Cost Diff
= Current Total - Reference Total
```

ภายใน tolerance ที่กำหนด

---

### Case G — Gap Improvement

ก่อนปรับปรุง:

```text
Gap₁ = |Current₁ - Base₁|
```

หลังปรับปรุง:

```text
Gap₂ = |Actual₂ - Base₂|
```

Expected:

```text
Gap₂ < Gap₁
```

---

### Case H — Improvement Cost Reduction

Expected:

```text
Cost after improvement
<
Cost before improvement
```

ภายใน selected improvement scope

---

# 44. Decision Log

## D-001 — Use Before / Current Cost Declare as Two Snapshots

**Date:** 2026-09-14  
**Status:** CONFIRMED

Decision:

```text
Before Cost Declare = Reference Standard / Base
Current Cost Declare = Current Standard
```

Reason:

Routing/BOM structure can change between Cost Declares; independent snapshots handle this naturally

---

## D-002 — Reserve “Actual” for Real Trial Result

**Date:** 2026-09-14  
**Status:** CONFIRMED

Reason:

Prevents confusion between recalculated standard and measured improvement result

---

## D-003 — Diff Before Candidate / RCA

**Date:** 2026-09-14  
**Status:** CONFIRMED

Decision:

```text
Calculate → Diff → Explain → Select → RCA
```

---

## D-004 — Routing Must Support Structural Change

**Date:** 2026-09-14  
**Status:** CONFIRMED

Added/Removed/Modified operations must be first-class comparison results

---

## D-005 — Sequence Is Not Sufficient Identity

**Date:** 2026-09-14  
**Status:** CONFIRMED

Need stable key or manual confirmation

---

## D-006 — Preserve MHr; Do Not Reinterpret Yet

**Date:** 2026-09-14  
**Status:** CONFIRMED

Current company policy and verified calculation are preserved; exact semantics remain TO VERIFY

---

## D-007 — Parallelism Expressed Through Source Data, Not Assumed Time Division

**Date:** 2026-09-14  
**Status:** WORKING DECISION

Based on current factory-policy explanation, parallel operation is expected to appear primarily through Capacity while elapsed time basis may remain unchanged

Must be verified against real Cost Declare examples

---

## D-008 — No Unapproved Monetary Attribution for Interacting Variables

**Date:** 2026-09-14  
**Status:** CONFIRMED

Exact process gap may be shown; per-variable THB attribution requires approved decomposition method

---

## D-009 — Use Two Comparison Pairs for Project Evaluation

**Date:** 2026-09-14  
**Status:** CONFIRMED

Decision:

```text
Comparison #1:
Base₁ ↔ Current₁
→ Gap₁

Comparison #2:
Base₂ ↔ Actual₂
→ Gap₂
```

Base₂ is the predicted/improved standard for the post-improvement state and does not have to equal Base₁.

Primary alignment criterion:

```text
Gap₂ < Gap₁
```

Ideal:

```text
Gap₂ → 0
```

---

## D-010 — Gap Reduction and Cost Reduction Are Separate Success Metrics

**Date:** 2026-09-14  
**Status:** CONFIRMED

Decision:

```text
Alignment / model success:
Gap₂ < Gap₁

Improvement success:
Cost after improvement < Cost before improvement
within the selected improvement scope
```

Both should be reported separately.

---

# 45. Source Documents

This specification is derived from:

1. `Proposal-กลุ่ม81.pdf`
   - Objectives / Scope / Methodology
   - especially sections 2, 3, 5, 6

2. `breakdown_cost_web_final_logic_fixed.pdf`
   - Reference vs Current vs Actual Trial
   - Full Flow
   - Gap Drill-down
   - Candidate Selection
   - RCA
   - What-If
   - Trial + Version

3. `COSTBREAKDOWN-feature-taste-frontend-ui.zip`
   - Latest reviewed implementation snapshot
   - Current React/TypeScript model
   - Current Excel v2 calculation model
   - Current HANDOFF / PROJECT_SPECIFIC rules

4. Current project decisions discussed with the project owner on 2026-09-14

---

# 46. Final Canonical Summary

ระบบที่ตกลงกันปัจจุบันมีหลักคิดดังนี้:

```text
COMPARISON #1 — BEFORE IMPROVEMENT

Base₁ / Reference Standard
        ↕
Current-condition value
        │
        ▼
Gap₁
        │
        ├─ Favorable changes → record / keep
        └─ Unfavorable changes → evaluate
                                  │
                                  ▼
                     Controllable + Feasible + In Scope?
                                  │
                                  ▼
                           Selected Factor
                                  │
                                  ▼
                               RCA — Why?
                                  │
                                  ▼
                              Root Cause
                                  │
                                  ▼
                         Improvement Actions
                                  │
                                  ▼
                         What-If Prediction
                                  │
                                  ▼
                 Base₂ / Predicted Improved Standard
                                  │
                                  ▼
                              Real Trial
                                  │
                                  ▼
                    Actual₂ / Actual Trial Result

COMPARISON #2 — AFTER IMPROVEMENT

Base₂ / Predicted Improved Standard
        ↕
Actual₂ / Actual Trial Result
        │
        ▼
Gap₂

SUCCESS CHECK

Alignment:
Gap₂ < Gap₁
ideally Gap₂ → 0

Improvement:
Cost after improvement
<
Cost before improvement
within the selected improvement scope

If validated:
Trial result
→ Review
→ New Draft
→ Check
→ Activate
→ Previous Active archived
```

**Key rules:**

- สิ่งที่ข้อมูลบอกว่าเปลี่ยน = Factor / Finding
- ทำไมมันเปลี่ยน = Root Cause
- จะทำอะไรเพื่อแก้ = Improvement Action
- Gap₁ และ Gap₂ เป็นคนละคู่เปรียบเทียบและอิง Base ของช่วงตัวเอง
- Gap reduction และ cost reduction ต้องรายงานแยกกัน
- What-If เป็น prediction และต้องไม่เขียนทับ official current data

---

# 47. Next Required Review

ก่อนเปลี่ยน core architecture ให้ทำ review กับไฟล์ Cost Declare จริงสองชุด:

```text
Before Cost Declare
Current Cost Declare
```

Output ที่ต้องได้ก่อนเริ่ม implementation:

```text
1. Real schema map
2. Routing matching key
3. Added / Removed / Modified example rows
4. BOM matching behavior
5. Rate period behavior
6. MHr examples including decimal / shared-resource cases
7. Parallel-process example
8. Final confirmed formulas / unresolved formula questions
```

เมื่อ review นี้เสร็จ ให้ update Decision Log ในไฟล์นี้ก่อนเริ่ม code change
