# COSTBREAKDOWN — Analysis & Recommendations

> เอกสารนี้สรุป **ประเด็นวิเคราะห์ + คำแนะนำเชิง implementation** จากการเทียบ 3 แหล่งหลัก
>
> 1. `Proposal-กลุ่ม81.pdf` = สิ่งที่โครงงานสัญญาว่าจะทำ / ขอบเขตทางวิชาการ
> 2. `breakdown_cost_web_final_logic_fixed.pdf` = Target Business Flow / Logic Baseline ที่เว็บควรเดินตาม
> 3. `COSTBREAKDOWN-main.zip` = Implementation ปัจจุบัน
>
> เป้าหมายของเอกสารนี้ไม่ใช่เสนอให้รื้อระบบใหม่ทั้งหมด แต่เพื่อระบุว่า **อะไรถูกแล้ว, อะไรยังไม่ตรง logic, อะไรควรแก้ก่อน, และเกณฑ์ไหนใช้ตรวจว่าแก้เสร็จจริง**

> **Document precedence:** This is an analysis and implementation-recommendation record, not the current target requirements. For current decisions use [`docs/REQUIREMENTS_INDEX.md`](docs/REQUIREMENTS_INDEX.md) and the page specifications. Older `Base/Active`, Excel-SOT, and implementation recommendations in this file are historical unless the current specifications repeat them.

---

## 1. Executive Summary

ภาพรวมของระบบปัจจุบันถือว่า **มี foundation ที่ดีและเดินมาถูกทางในช่วงต้นของ flow** โดยเฉพาะ:

- มีโครงสร้าง `Material + Labor + Burden`
- มี Base/Active comparison
- มี Excel import
- มี Draft / Active / Archived concept
- มี Cost Gap และ Variance
- มี Candidate page
- มี What-If A/B/C พร้อม investment / added cost / predicted cost
- มี Trial UI และแนวคิด Promote baseline

แต่เมื่อเทียบกับ Proposal และ Final Logic Baseline แล้ว ยังมี logic gap ที่สำคัญในช่วง:

**Drill-down → Candidate → RCA → Action → What-if → Trial → New Version**

ประเด็นสำคัญที่สุดคือ **Cost Driver Engine ยังไม่ได้แยก factor แบบ atomic ตาม baseline** เช่น Price, Loss, Consumption, Labor Rate, Burden Rate, Capacity, Yield, Resource/Manning ควรถูกวิเคราะห์เป็น factor แยกกัน แต่ implementation ปัจจุบันยังรวมหลาย factor ไว้ใน item/process เดียวในหลายกรณี

ดังนั้น recommendation หลักคือ:

> **อย่าเริ่มจากแก้ UI หรือเพิ่มหน้าใหม่ก่อน**  
> ให้แก้ **Data Model + Cost Engine + Atomic Driver Model** ก่อน เพราะทุกหน้าหลังจากนั้นพึ่งพาความถูกต้องของ driver ที่ส่งต่อมา

---

## 2. Source of Truth: แต่ละเอกสารมีบทบาทอะไร

### 2.1 Proposal

Proposal เป็นตัวกำหนด **Project Commitment** โดยสาระสำคัญคือ:

- จัดทำ Source of Truth สำหรับข้อมูลต้นทุน
- ใช้ข้อมูล BOM, Material Price, Material Loss, Routing, Capacity, Yield, Cycle Time, จำนวนพนักงาน, จำนวนเครื่องจักร, Labor Rate, Burden Rate
- เปรียบเทียบต้นทุนมาตรฐานเดิมกับต้นทุนมาตรฐานจากข้อมูลปัจจุบัน
- วิเคราะห์ Cost Breakdown
- วิเคราะห์ผลกระทบของ Cost Driver
- คัดเลือก Cost Driver ที่มีผลกระทบและสามารถปรับปรุงได้
- วิเคราะห์สาเหตุ
- เปรียบเทียบทางเลือก
- ทดลองแนวทางปรับปรุงอย่างน้อย 1 แนวทาง
- เปรียบเทียบผลจริงหลังทดลองกับผลที่ prototype คาดการณ์

ดังนั้นสิ่งที่ระบบทำเพิ่มได้ไม่ใช่ปัญหา ตราบใดที่ **ไม่ทำให้ commitment หลักของ Proposal หายหรือผิด logic**

### 2.2 Final Logic Baseline

`breakdown_cost_web_final_logic_fixed.pdf` ควรถูกถือเป็น **Business Flow Baseline** ของเว็บ:

```text
Product + Version
→ Input Data
→ Check Data
→ Calculate Cost
→ Compare Standards
→ Drill Down
→ Collect Candidates
→ Select One
→ RCA
→ Actions
→ What-If
→ Trial + Version
```

กฎสำคัญที่สุด:

> **Explain the gap first, then select a controllable and feasible factor for RCA.**

และต้องแยกความหมายให้ชัด:

```text
Factor    = อะไรเปลี่ยน
Root Cause = ทำไมมันถึงเปลี่ยน
Action    = เราจะแก้อะไรจากสาเหตุนั้น
```

### 2.3 Current Repository

Implementation ปัจจุบันใช้ architecture ใหม่เป็นหลัก:

```text
src/
├── core/
│   ├── calculations/
│   ├── types/
│   └── utils/
├── state/
├── services/
├── features/
│   ├── master-data/
│   ├── cost-breakdown/
│   ├── candidate-selection/
│   └── rca-simulation/
└── shared/
```

`src/App.tsx` ใช้ `features/state/core/services/shared` แล้ว

แต่ยังมี legacy structure อยู่ด้วย:

```text
src/lib/
src/pages/
src/components/
```

จึงควรระวังไม่ให้ Agent/Developer แก้ไฟล์ผิดชุด

---

# 3. Gap Analysis — ประเด็นหลักที่ควรแก้

## P0-1 — Data Model ยังไม่รองรับ input ตาม Proposal / Final Logic ครบ

### Current

`src/core/types/cost.types.ts`

`BOMItem` มี:

```ts
consumption
basePrice
activePrice
baseLoss
activeLoss
```

แต่ `consumption` มีค่าเดียว ไม่มี Base/Current แยกกัน

`RoutingStep` มี:

```ts
manning
baseCap
activeCap
baseYield
activeYield
```

แต่ยังไม่มี representation ที่ชัดสำหรับ:

- Base vs Current Consumption
- Base vs Current Manning / Resource count
- Cycle Time
- Labor Runtime
- Machine/Resource Runtime
- Base vs Current Labor Rate
- Base vs Current Burden Rate

### Impact

ระบบยังไม่สามารถตอบได้ครบว่า Cost Gap เกิดจาก:

- Consumption change
- Resource/Manning change
- Labor Rate change
- Burden Rate change
- Runtime basis ที่ต่างกันระหว่าง Labor กับ Burden

### Recommendation

ปรับ model ก่อนแตะ Candidate/RCA UI

ตัวอย่างแนวทาง:

```ts
interface BOMItem {
  baseConsumption: number
  currentConsumption: number
  basePrice: number
  currentPrice: number
  baseLoss: number
  currentLoss: number
}
```

สำหรับ Routing **ยังไม่ควร invent company formula เอง** แต่ควรเก็บ input ให้พอรองรับ company rule เช่น:

```ts
interface RoutingStep {
  baseManning: number
  currentManning: number

  baseCapacity: number
  currentCapacity: number

  baseYield: number
  currentYield: number

  baseCycleTime?: number
  currentCycleTime?: number

  baseLaborRuntime?: number
  currentLaborRuntime?: number

  baseResourceRuntime?: number
  currentResourceRuntime?: number
}
```

จากนั้นเลือก formula จริงตาม rule ของบริษัท/อาจารย์ที่ยืนยันแล้ว

### Acceptance Criteria

- System สามารถเก็บ Reference และ Current ของ input ที่ต้องการเปรียบเทียบได้
- Consumption สามารถเปลี่ยนและสร้าง variance ได้
- Resource/Manning สามารถเปลี่ยนและสร้าง variance ได้
- Labor Rate และ Burden Rate สามารถมี Reference/Current ได้
- ไม่ hard-code ว่า Labor Runtime = Burden Runtime โดยไม่มี company rule รองรับ

---

## P0-2 — Labor และ Burden ถูกบังคับให้ใช้ Runtime เดียวกัน

### Current

ใน `src/core/calculations/cost-engine.ts`:

```ts
baseRuntime = manning / (baseCap * baseYield)
activeRuntime = manning / (activeCap * activeYield)

laborCost = runtime * laborRate
burdenCost = runtime * burdenRate
```

Runtime เดียวถูกใช้ทั้ง Labor และ Burden

### Why this matters

Proposal แยกหลักการเป็น:

```text
Labor Cost  = Labor Hours × Labor Rate
Burden Cost = Resource Hours × Burden Rate
```

Final Logic ยังระบุว่า Labor Runtime และ Burden/Machine Runtime **อาจเหมือนหรือต่างกันก็ได้**

### Recommendation

แยก calculation basis:

```text
Labor Runtime / Labor Hours
Resource or Machine Runtime / Resource Hours
```

หาก company rule ยืนยันว่าในกรณีศึกษานี้ใช้ค่าเดียวกันจริง สามารถ map ให้เท่ากันได้ แต่ architecture ไม่ควรบังคับให้เท่ากันตั้งแต่ model level

### Acceptance Criteria

- สามารถคำนวณ Labor และ Burden จาก runtime คนละตัวได้
- ถ้าใช้ค่าเดียวกัน ต้องเป็น explicit rule/config ไม่ใช่ implicit assumption

---

## P0-3 — Labor Rate Variance / Burden Rate Variance ถูก hard-code เป็น 0

### Current

ใน `src/core/calculations/cost-engine.ts`:

```ts
const lrv = 0
const lev = laborActive - laborBase - lrv
const brv = 0
const bev = burdenActive - burdenBase - brv
```

และ `WorkCenterRate` มีเพียง:

```ts
laborRate
burdenRate
```

ไม่มี Reference/Current rate สองชุด

### Problem

หน้า Variance อาจแสดง LRV/BRV เหมือนรองรับแล้ว แต่ engine ไม่มีทางสร้างค่าจริงได้

Final Logic ต้องสามารถแยก:

```text
Labor Gap  → Rate Effect + Runtime-related Effect
Burden Gap → Rate Effect + Runtime-related Effect
```

### Recommendation

เปลี่ยน Rate model ให้รองรับ Reference/Current หรือ versioned rate dataset อย่างชัดเจน

เช่น:

```ts
baseLaborRate
currentLaborRate
baseBurdenRate
currentBurdenRate
```

หรือใช้ version snapshot ถ้าต้องการรักษา architecture แบบ dataset version

### Acceptance Criteria

สร้าง test case ที่:

- Runtime ไม่เปลี่ยน
- Labor Rate เพิ่ม
- Burden Rate เพิ่ม

แล้วระบบต้องแสดง Cost Gap ที่เกิดจาก Rate Effect โดยไม่โยนทั้งหมดไป Efficiency Effect

---

## P0-4 — Missing Rate มี fallback ที่สร้างตัวเลขขึ้นมาเอง

### Current

พบ fallback เช่น:

```ts
rateMap.get(rt.wc) || { labor: 105.29, burden: 95.00 }
```

ทั้งใน cost engine และ simulation

### Risk

ถ้า Work Center ไม่มี rate จริง ระบบยังสามารถคำนวณ cost ออกมาได้ด้วยค่า default ทำให้ user เข้าใจว่าเป็นข้อมูลจริง

นี่สวนทางกับแนวคิด Source of Truth ที่ต้องตรวจสอบ:

- Source
- Unit
- Effective period
- Data completeness

### Recommendation

**เอา fallback ทางการเงินออกจาก calculation engine**

ให้ใช้ validation error เช่น:

```text
Missing Labor/Burden Rate for WC: Printing
Calculation blocked until rate is supplied.
```

สำหรับ mock/demo data สามารถสร้าง seed data ได้ แต่ไม่ควร fallback เงียบ ๆ ใน production calculation

### Acceptance Criteria

- Missing WC Rate → Calculation ถูก block หรือ mark invalid
- ห้าม silently ใช้ 105.29 / 95.00
- UI แสดงว่า field ไหนขาดและมาจาก Work Center ไหน

---

# 4. Atomic Cost Driver Engine

## P0-5 — Candidate ปัจจุบันยังเป็น Item/Process Gap มากกว่า Atomic Driver

### Current — Material

`src/core/calculations/top-drivers.ts`

ระบบสร้าง candidate 1 ตัวต่อ BOM item

ถ้า Price และ Loss เปลี่ยนพร้อมกัน:

```text
Material M01
Price changed
Loss changed
```

ระบบยังสร้าง driver เดียว และ `rcaParameter` เลือกอธิบาย Price เป็นหลัก

### Expected

Final Logic ต้องได้:

```text
M01 — Price        +0.70
M01 — Loss         +0.30
M02 — Consumption  +0.50
```

แต่ละ factor คือ finding แยกกัน

### Current — Routing

ถ้า Capacity และ Yield เปลี่ยนพร้อมกัน ก็รวมอยู่ใน process candidate เดียวเช่นกัน

### Recommendation

เปลี่ยนจาก model:

```text
1 item/process = 1 CostDriver
```

เป็น:

```text
1 changed variable = 1 AtomicCostDriver
```

ตัวอย่าง:

```ts
interface AtomicCostDriver {
  id: string
  sourceType: 'material' | 'routing' | 'rate'
  sourceId: string
  process?: string
  itemCode?: string

  factor:
    | 'price'
    | 'loss'
    | 'consumption'
    | 'labor_rate'
    | 'burden_rate'
    | 'capacity'
    | 'yield'
    | 'manning'
    | 'cycle_time'

  referenceValue: number
  currentValue: number
  costEffect: number
  sourceRef: string
  confidence: DataConfidence
}
```

### Acceptance Criteria

ถ้า M01 มี Price + Loss เปลี่ยนพร้อมกัน ต้องได้ 2 drivers

ถ้า Printing มี Yield + Capacity เปลี่ยนพร้อมกัน ต้องได้ 2 findings หรือ decomposition ที่พิสูจน์ได้ว่าผลรวมตรงกับ Process Gap

ผลรวม Atomic Effects ต้อง reconcile กับ Category Gap / Total Gap ภายใต้ decomposition rule ที่เลือก

---

## P0-6 — Consumption Change วิเคราะห์ไม่ได้

### Current

```ts
consumption: number
```

มีค่าเดียว

### Expected

Final Logic ยก Consumption เป็น candidate factor โดยตรง

### Recommendation

เพิ่ม Reference/Current Consumption แล้วเพิ่ม Consumption Effect ใน variance decomposition

### Acceptance Criteria

กรณี:

```text
Reference Consumption = 0.20
Current Consumption   = 0.25
Price/Loss unchanged
```

ต้องสร้าง Consumption Cost Driver ได้อย่างเดียว และ Cost Effect reconcile กับ Material Gap

---

# 5. Drill-down Flow

## P1-1 — Process Drill-down ยังข้ามชั้น

### Target Flow

Final Logic ต้องเดินประมาณ:

```text
Total Cost Gap
  ↓
Material / Labor / Burden
  ↓
Item / Process
  ↓
Rate Effect / Runtime-related Effect
  ↓
Runtime Inputs
  ↓
Capacity / Yield / Resource / Cycle Time
  ↓
Candidate Factor
```

### Current

เว็บมี detailed BOM/Routing tables และ conversion gap แล้ว แต่ยังไม่ได้สร้าง chain นี้ครบแบบ explicit

### Recommendation

อย่าให้ Candidate page เป็นที่แรกที่ user เห็น factor

ควรทำ Drill-down data model / selector ให้ trace ได้ว่า driver มาจากไหน เช่น:

```text
Total Gap +3.00
→ Processing +1.20
→ Printing +0.65
→ Labor +0.40 / Burden +0.25
→ Runtime-related +0.27
→ Yield 95% → 90%
→ Candidate: Printing Yield
```

### Acceptance Criteria

ทุก Candidate ต้องมี trace path ย้อนกลับได้ถึง Total Gap

ตัวอย่าง metadata:

```ts
tracePath: [
  'Total',
  'Processing',
  'Printing',
  'Runtime Effect',
  'Yield'
]
```

---

# 6. Candidate Selection

## P1-2 — Selection Criteria ยังไม่ครบ และค่า default ไม่เหมาะ

### Current

Candidate row มี:

- Measurable
- Can Influence
- Requirement Fit
- Action Plan

แต่ไม่มี:

- Feasible to Study

และใน `top-drivers.ts` default:

```ts
canInfluence: true
requirementFit: true
```

### Problem

Final Logic เริ่มสถานะเหล่านี้เป็น **Need Review** ไม่ควร auto-pass

### Recommendation

ใช้ tri-state:

```ts
type ReviewDecision = 'pending' | 'yes' | 'no'
```

criteria:

```text
Measurable
Can Influence?
Feasible to Study?
Requirement Fit?
```

และให้ user เลือก **หนึ่ง factor เพื่อศึกษาเป็นอันดับแรก**

factor ที่ไม่ถูกเลือกไม่ควรหาย แต่เก็บเป็น Pending Candidate

### Acceptance Criteria

- default = pending
- factor ยังไม่เข้า RCA จนกว่าจะผ่าน required criteria
- user เลือก Selected Factor ได้ 1 ตัว
- candidate อื่นยังคงอยู่ในรายการพร้อมสถานะ pending/rejected/deferred

---

## P1-3 — Action Plan อยู่ก่อน RCA ผิดลำดับ

### Current

`src/features/candidate-selection/components/DriverRow.tsx` ให้กรอก `Action Plan` ใน Candidate stage

### Correct Logic

```text
Candidate Factor
→ Select One
→ RCA: Why did it change?
→ Root Cause
→ Action from Cause
→ What-If
```

### Recommendation

เอา Action Plan ออกจาก Candidate selection หรือเปลี่ยนชื่อเป็น `Preliminary Note` หากต้องเก็บความเห็นก่อน

Action จริงต้องอยู่หลัง Root Cause

### Acceptance Criteria

- Candidate stage ไม่มี approved corrective action
- Action ต้อง reference RCA/rootCauseId

---

# 7. RCA

## P1-4 — หน้า “RCA & Simulation” ยังไม่มี RCA data structure จริง

### Current

`ProblemStatementCard` แสดง:

- Driver
- RCA Parameter & Symptom
- Base → Active
- Registered Action Plan

แต่ยังไม่มี object สำหรับ:

- RCA Question
- Root Cause
- Possible Causes
- Evidence
- Process Owner
- RCA Notes

### Recommendation

เพิ่ม model แยกจาก CostDriver

เช่น:

```ts
interface RCARecord {
  id: string
  driverId: string
  question: string
  possibleCauses: string[]
  selectedRootCause: string
  evidence: string
  owner: string
  notes: string
  status: 'draft' | 'reviewed'
}
```

และ Action ต้องผูกกับ RCA:

```ts
interface ImprovementAction {
  id: string
  rcaId: string
  description: string
  expectedChange: string
  addedCost?: number
  risk?: string
}
```

### Acceptance Criteria

ระบบสามารถแสดง story นี้ได้จริง:

```text
Factor: Printing Yield 95% → 90%
Question: Why is Yield lower?
Root Cause: Machine setting is not stable
Evidence: ...
Action: Standardize machine parameters
```

---

# 8. What-If

## Strength — ส่วนนี้ถือว่าดีและควรเก็บไว้

Current implementation รองรับ:

- Scenario A/B/C
- Target value
- Fixed Investment
- Variable Added Cost
- Lot Size
- Gross Saving
- Net Saving
- Predicted Total
- Total Net Benefit

ซึ่งทำได้มากกว่า baseline และมีประโยชน์ต่อ feasibility analysis

## P1-5 — What-If ต้องเริ่มจาก Action ไม่ใช่แค่ปรับ parameter

### Target

Final Logic บอกว่า:

> Actions must come from the cause.

จึงควรให้ Scenario represent:

```text
Root Cause
→ Action Option
→ Expected input change
→ Added Cost / Risk / Trial time
→ Predicted Cost
```

ไม่ใช่เพียง:

```text
Yield 90% → 95%
```

### Recommendation

Scenario model ควร reference `ImprovementAction`

---

## P1-6 — “Apply Target to Active” ไม่ควรแก้ Active Source of Truth โดยตรง

### Current

หน้า simulation มีปุ่ม:

```text
Apply Target to Active
```

และเขียนกลับ Master Data

### Problem

Version rule คือ:

```text
Active
→ Clone to Draft
→ Edit Draft
→ Check
→ Activate
→ Previous Active becomes Archived
```

Simulation เป็น prediction ไม่ใช่ observed reality

### Recommendation

เปลี่ยน behavior เป็นอย่างใดอย่างหนึ่ง:

1. `Apply to Scenario Draft` หรือ
2. `Create Trial Draft from Scenario`

ห้าม mutate Active official dataset จาก What-If โดยตรง

### Acceptance Criteria

- What-if ไม่เปลี่ยน Active Source of Truth
- Scenario ทดลองได้โดยไม่เปลี่ยน official data

---

# 9. Trial Validation

## P0/P1 — Trial เป็น requirement ของ Proposal โดยตรง

Proposal ต้องการอย่างน้อย 1 improvement trial และเปรียบเทียบผลจริงกับ prototype prediction

Final Logic ต้องบันทึกอย่างน้อยแนวคิด:

- Yield
- Usage
- Runtime
- Quality result
- Predicted Cost
- Actual Trial Result

### Current

`TrialValidationCard.tsx` เก็บเพียง:

```text
Actual Trial Cost
Trial Notes
```

และ `Save Record` ทำเพียง:

```ts
setIsSaved(true)
```

ไม่มีการ persist record ลง state/store

แม้มี type `TrialValidationRecord` อยู่แล้ว แต่ยังไม่ได้ต่อใช้งานจริง

### Recommendation

เพิ่ม persisted TrialRecord:

```ts
interface TrialRecord {
  id: string
  selectedDriverId: string
  rcaId: string
  actionId: string
  scenarioId: string

  predictedCost: number
  actualCost: number

  measuredInputs: {
    yield?: number
    consumption?: number
    loss?: number
    capacity?: number
    cycleTime?: number
    laborRuntime?: number
    resourceRuntime?: number
  }

  qualityResult: string
  notes: string
  trialDate: string
  reviewed: boolean
}
```

### Acceptance Criteria

- Save Record ต้อง persist จริง
- refresh / เปลี่ยนหน้าแล้ว record ยังอยู่ใน session storage ตาม architecture ปัจจุบัน
- สามารถ compare Predicted vs Actual ได้
- สามารถ trace ไปยัง Driver → RCA → Action → Scenario ได้

---

# 10. Version Lifecycle

## P0/P1 — Version UI มีแล้ว แต่ enforcement ยังไม่ครบ

### Current Strength

ใน store มี:

```text
cloneActiveToDraft()
activateDraft()
```

และ Activate จะ archive previous active ซึ่ง direction ถูกต้อง

### Current Problem

CRUD functions เช่น:

```ts
updateBOMItem()
updateRoutingStep()
updateWorkCenterRate()
```

เรียก `patchActive()` โดยไม่มี guard ว่า session ต้องเป็น `draft`

ดังนั้น Active หรือ Archived ยังมีทางถูกแก้ได้

UI แม้เขียนว่า Archived เป็น read-only reference แต่ business rule ยังไม่ได้ enforce ใน state layer

### Recommendation

ให้ state layer เป็นผู้ enforce ไม่ใช่แค่ UI

```ts
function assertDraft(session: ProductSession) {
  if (session.status !== 'draft') {
    throw new Error('Only Draft dataset is editable')
  }
}
```

CRUD ทุกตัวต้องผ่าน rule นี้

### Acceptance Criteria

- Draft = editable
- Active = read-only Source of Truth
- Archived = immutable history
- การเปลี่ยน Active ต้อง Clone → Draft

---

## P1-7 — `Promote Trial to Baseline` ปัจจุบัน bypass version flow

### Current

`promoteActiveToBaseline()` ทำประมาณ:

```ts
basePrice = activePrice
baseLoss = activeLoss
baseCap = activeCap
baseYield = activeYield
```

แล้ว clear drivers

### Problem

สิ่งนี้ไม่ใช่ flow ที่ Final Logic ต้องการ

Target คือ:

```text
Selected Action
→ Trial
→ Actual Measurement
→ Review
→ Create Draft
→ Update using validated actual data
→ Check
→ Activate
→ Old Active archived
```

### Recommendation

เลิกใช้ direct “copy active to base” เป็น lifecycle หลัก

เปลี่ยนเป็น:

```text
Create Draft from Validated Trial
```

แล้วให้ user review ก่อน Activate

### Acceptance Criteria

- Trial ไม่เปลี่ยน baseline ทันที
- ต้องมี review gate
- new version ถูกสร้างผ่าน Draft
- previous Active ถูก archive เมื่อ Activate เท่านั้น

---

# 11. Source of Truth & Data Quality

## P1-8 — Data Confidence เป็น feature ที่ดี ควรเก็บและต่อยอด

Current system มี:

```text
verified
estimated
missing
```

แนวคิดนี้สอดคล้องกับความต้องการเรื่องความน่าเชื่อถือของข้อมูล

### Recommendation

เพิ่ม validation gate ก่อน Activate:

```text
[ ] No missing required fields
[ ] All Work Centers have valid rates
[ ] Units valid
[ ] Effective dates available
[ ] Source references available
[ ] Required confidence threshold passed
[ ] Calculation reconciliation passed
```

### Acceptance Criteria

Draft ที่มี critical missing data ไม่สามารถ Activate ได้

---

# 12. Architecture / Repository Cleanup

## P2 — Legacy code ทำให้เสี่ยงแก้ผิดไฟล์

ปัจจุบันมีทั้ง:

```text
src/core + src/features + src/state + src/services
```

และ:

```text
src/lib + src/pages + src/components
```

### Recommendation

หลัง logic หลักนิ่งแล้ว:

1. ตรวจว่า legacy files ไม่มี import จาก active app
2. ย้าย/ลบ legacy safely
3. update README/HANDOFF ให้บอก canonical path
4. ห้ามทำ cleanup พร้อมกับ logic refactor ก้อนใหญ่ เพราะจะทำ diff อ่านยาก

### Acceptance Criteria

Developer/Agent อ่าน README แล้วรู้ทันทีว่าแก้ไฟล์ชุดใด

---

# 13. Documentation Drift

README บางส่วนอ้าง Excel generation เก่ากว่า implementation v2

Current implementation/parser ใช้แนว sheet เช่น:

```text
1_MASTER_RATES
2_BOM_BREAKDOWN
3_ROUTING_BREAKDOWN
_CALC_ENGINE
4_SUMMARY_&_COMPARISON
```

### Recommendation

หลัง engine logic ถูก finalize ให้ update documentation ครั้งเดียวเพื่อไม่ให้ README กลายเป็น source ที่ขัดกับ code

---

# 14. สิ่งที่ไม่ควรรื้อ

ส่วนต่อไปนี้ถือว่ามีประโยชน์และควร preserve:

- `core / state / services / features / shared` architecture
- Excel Import → Draft direction
- Base vs Active calculation concept
- Material / Labor / Burden high-level breakdown
- Data Confidence
- Detailed BOM/Routing table
- Scenario A/B/C
- Investment / Added Cost / Lot Size / Net Benefit
- Draft / Active / Archived concept

Recommendation คือ **แก้ semantics และ enforcement** ไม่ใช่ rewrite ทั้งระบบ

---

# 15. Recommended Implementation Order

## Phase 1 — Calculation Foundation (P0)

ทำก่อนทุกอย่าง:

1. ปรับ Data Model ให้รองรับ Reference/Current inputs ครบ
2. แยก Labor Runtime กับ Resource/Burden Runtime
3. รองรับ Reference/Current Rates
4. เอา silent Rate fallback ออก
5. เพิ่ม validation ของ missing data
6. เพิ่ม unit tests สำหรับ cost formulas

**ห้ามข้าม Phase 1 ไปทำ RCA UI ก่อน**

---

## Phase 2 — Atomic Variance / Driver Engine (P0)

1. Material:
   - Price Effect
   - Loss Effect
   - Consumption Effect
2. Conversion:
   - Labor Rate Effect
   - Burden Rate Effect
   - Runtime-related Effect
3. Runtime inputs:
   - Capacity
   - Yield
   - Manning/Resource
   - Cycle Time (ถ้า company rule ใช้)
4. Reconciliation tests

Output ของ Phase 2 ต้องเป็น **atomic findings**

---

## Phase 3 — Drill-down Trace (P1)

สร้าง trace:

```text
Total → Category → Item/Process → Cost Effect → Input Factor
```

Candidate ทุกตัวต้องย้อนกลับไปหา Cost Gap ได้

---

## Phase 4 — Candidate Selection + RCA (P1)

1. Candidate status = Pending by default
2. เพิ่ม Feasible to Study
3. เลือก 1 factor
4. RCA Record
5. Evidence / Owner / Notes
6. Action หลัง Root Cause เท่านั้น

---

## Phase 5 — What-If + Trial (P1)

1. Scenario ผูกกับ Action
2. What-if ไม่แก้ Active
3. Trial Record persist จริง
4. เก็บ measured inputs
5. Predicted vs Actual
6. Review gate

---

## Phase 6 — Version Enforcement (P1)

1. Draft editable only
2. Active read-only
3. Archived immutable
4. Validated Trial → Create Draft
5. Check → Activate
6. Previous Active → Archived

---

## Phase 7 — Cleanup / Documentation (P2)

1. Remove legacy structure หลังยืนยันว่าไม่ได้ใช้
2. Update README
3. Update HANDOFF
4. Update Excel documentation
5. Add end-to-end acceptance scenario

---

# 16. Recommended Tests

## Test A — Material Price Only

```text
Consumption: same
Loss: same
Price: 10 → 12
```

Expected:

- only Price Driver
- material gap = price effect

---

## Test B — Material Loss Only

```text
Price: same
Consumption: same
Loss: 2% → 5%
```

Expected:

- only Loss Driver

---

## Test C — Price + Loss Together

Expected:

- 2 atomic drivers
- effects sum/reconcile with item material gap under chosen decomposition rule

---

## Test D — Consumption Only

```text
0.20 → 0.25
```

Expected:

- Consumption Driver exists

---

## Test E — Labor Rate Only

Runtime unchanged, Labor Rate changes

Expected:

- LRV non-zero
- LEV ≈ 0

---

## Test F — Yield Only

Capacity / Resource / Rates unchanged

Expected chain:

```text
Yield change
→ Runtime change
→ Labor/Burden effect
→ Candidate = Yield
```

---

## Test G — Missing Rate

Expected:

- calculation invalid / blocked
- no hard-coded fallback result

---

## Test H — Version Integrity

Attempt edit:

- Draft → allowed
- Active → rejected
- Archived → rejected

---

## Test I — Trial Persistence

1. Save Actual Trial
2. change tab / refresh session
3. reopen

Expected:

- Trial record remains

---

## Test J — End-to-End Project Story

```text
Reference Standard
→ Current Standard
→ Gap
→ Drill-down
→ Atomic Candidate
→ Select one
→ RCA
→ Root Cause
→ Action A/B/C
→ What-if
→ Trial
→ Actual vs Predicted
→ Review
→ New Draft
→ Activate
→ Archive old Active
```

ถ้า Test J เดินครบและข้อมูลทุก step trace ย้อนกลับได้ ถือว่า implementation ใกล้เคียง Final Logic มาก

---

# 17. Priority Summary

| Priority | Issue | Why |
|---|---|---|
| **P0** | Data Model ไม่ครบ | ทำให้ factor บางชนิดวิเคราะห์ไม่ได้ตั้งแต่ต้น |
| **P0** | Labor/Burden Runtime ถูกบังคับเป็นตัวเดียว | กระทบ core cost model |
| **P0** | Rate Variance hard-coded 0 | Variance tree ไม่สะท้อน rate change จริง |
| **P0** | Silent fallback rate | เสี่ยงสร้าง cost จากข้อมูลที่ไม่มีจริง |
| **P0** | Atomic Driver ยังรวมหลาย factor | RCA อาจเริ่มจาก driver ผิดตัว |
| **P0** | Consumption ไม่มี Reference/Current | ไม่ตรง baseline example |
| **P1** | Drill-down chain ไม่ครบ | trace เหตุผลของ gap ไม่ชัด |
| **P1** | Candidate criteria / default | selection ผ่านง่ายเกิน logic |
| **P1** | Action มาก่อน RCA | flow กลับด้าน |
| **P1** | RCA ไม่มี record จริง | ชื่อหน้า RCA แต่ยังไม่มี root-cause model |
| **P1** | What-if mutate Active | simulation ไปแก้ Source of Truth |
| **P1** | Trial ไม่ persist | ไม่ตอบ requirement การทดลอง/ประเมินผลจริง |
| **P1** | Version ไม่ enforce read-only | Active/Archived history ไม่ปลอดภัย |
| **P1** | Promote bypass Draft/Review | ปิด PDCA ผิด lifecycle |
| **P2** | Legacy folders | เสี่ยงแก้ผิดชุด / maintenance ยาก |
| **P2** | Docs drift | README อาจทำให้ agent/developer เข้าใจผิด |

---

# 18. Recommended Decision

**ไม่แนะนำให้ rewrite repo ใหม่**

แนวทางที่คุ้มที่สุดคือ:

> รักษา UI/architecture ที่ใช้ได้ไว้ แล้ว refactor จากแกนในออกนอก

ลำดับที่แนะนำ:

```text
Data Model
→ Cost Engine
→ Atomic Driver Engine
→ Drill-down
→ Candidate Selection
→ RCA
→ What-if
→ Trial
→ Version Lifecycle
→ Cleanup
```

เหตุผลคือถ้า Cost Driver ที่ส่งเข้า RCA ยังไม่ใช่ factor ที่ถูกต้อง การเพิ่ม RCA/Trial UI ก่อนจะทำให้ต้องย้อนแก้ซ้ำภายหลัง

---

# 19. Guardrails สำหรับ Agent/Developer ที่จะทำต่อ

1. **Proposal คือ scope commitment — ห้ามเปลี่ยนความหมายโดยพลการ**
2. **Final Logic PDF คือ flow baseline — ห้ามกระโดดจาก Total Cost ไป RCA**
3. **ห้าม invent company cost formula ที่เอกสารยังไม่ยืนยัน**
4. **ห้ามใช้ default financial rates แบบ silent fallback**
5. **ห้ามแก้ Active/Archived โดยตรง**
6. **What-if เป็น prediction ไม่ใช่ actual data**
7. **Factor ≠ Root Cause ≠ Action**
8. **Candidate ต้องมาจาก explainable Cost Gap**
9. **ทุกผลรวม variance ต้อง reconcile กับ parent gap**
10. **ทำทีละ phase และ test ก่อนเริ่ม phase ถัดไป**

---

# 20. Definition of Done ระดับโปรเจกต์

ระบบจะถือว่า “ตรง Proposal + Final Logic” ในระดับ prototype เมื่อสามารถสาธิต story ต่อไปนี้ได้โดยไม่ข้าม step:

```text
1. เลือก Product + Version
2. แสดง Source of Truth และ data provenance
3. คำนวณ Reference Standard
4. คำนวณ Current Standard
5. แสดง Total Gap
6. Drill-down จนเจอ changed input factors
7. รวบรวม candidate จากทุก branch
8. Human review และเลือก 1 factor
9. ทำ RCA เพื่อหา why
10. สร้าง Action จาก Root Cause
11. Compare What-if options
12. เลือกแนวทางทดลอง
13. บันทึก Actual Trial Result + measured inputs
14. เปรียบเทียบ Predicted vs Actual
15. Review ผล
16. สร้าง Draft version ใหม่จาก validated result
17. Check Draft
18. Activate
19. Archive previous Active
20. มี version/history และ trace ย้อนกลับได้
```

ถ้าทำครบ flow นี้ได้ ระบบจะไม่ใช่แค่ “Cost Dashboard” แต่จะตรงกับเจตนาของโครงงานว่าเป็น **Prototype System for Product Cost Breakdown Analysis and Improvement Decision Support** อย่างเป็นระบบ

---

## Files / Code Paths Reviewed

### Documents

- `Proposal-กลุ่ม81.pdf`
- `breakdown_cost_web_final_logic_fixed.pdf`

### Repository key paths

- `src/App.tsx`
- `src/core/types/cost.types.ts`
- `src/core/types/product.types.ts`
- `src/core/calculations/cost-engine.ts`
- `src/core/calculations/top-drivers.ts`
- `src/core/calculations/whatif-simulator.ts`
- `src/state/store.tsx`
- `src/features/candidate-selection/`
- `src/features/rca-simulation/`
- `src/features/master-data/`
- `src/services/excel/`

---

**Recommended next action:** เริ่มจาก Phase 1–2 เท่านั้น และยังไม่แตะ UX/RCA redesign จนกว่า Cost Engine และ Atomic Driver Engine จะผ่าน reconciliation tests
