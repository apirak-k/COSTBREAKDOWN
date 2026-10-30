import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function buildFullSizeTestScenario() {
  const templatePath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_BLANK_TEMPLATE_v2.xlsx')
  const outputPath = path.join(__dirname, '..', 'excel_models', 'v2_modular', 'CostModel_TEST_SCENARIOS_v2.xlsx')

  console.log('Loading Blank Template...')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(templatePath)

  console.log('Injecting Full-Size (16 BOM & 39 Routing) Automotive EV Sensor Simulation Dataset...')

  // 1. MASTER RATES (4 Distinct Cleanroom Work Centers)
  const ws1 = wb.getWorksheet('1_MASTER_RATES')
  ws1.getCell('A5').value = 'APEX-EV-TOUCH-SENSOR'
  ws1.getCell('B5').value = 'AUTOSEN-9920-X'
  ws1.getCell('C5').value = 'Capacitive Multi-Touch Sensor for EV Dashboard Display'
  ws1.getCell('D5').value = 'PC'
  ws1.getCell('E5').value = 'Automotive Mass Production Standard PR-2025'

  const rates = [
    { row: 9, dept: 'Precision Cutting', labor: 120.00, burden: 155.00, eff: '2025-06-01', ref: 'EV Work Center Row 9' },
    { row: 10, dept: 'Cleanroom Printing', labor: 115.00, burden: 110.00, eff: '2025-06-01', ref: 'EV Work Center Row 10' },
    { row: 11, dept: 'Module Assembly', labor: 110.00, burden: 98.00, eff: '2025-06-01', ref: 'EV Work Center Row 11' },
    { row: 12, dept: 'Quality Assurance', labor: 110.00, burden: 88.00, eff: '2025-06-01', ref: 'EV Work Center Row 12' }
  ]

  rates.forEach(r => {
    ws1.getCell(`A${r.row}`).value = r.dept
    ws1.getCell(`B${r.row}`).value = r.labor
    ws1.getCell(`C${r.row}`).value = r.burden
    ws1.getCell(`D${r.row}`).value = r.eff
    ws1.getCell(`E${r.row}`).value = r.ref
  })

  // 2. BOM BREAKDOWN: FULL 16 DIRECT MATERIALS
  const ws2 = wb.getWorksheet('2_BOM_BREAKDOWN')
  const bomData = [
    { no: 1, code: 'RAW-ITO-FILM-125', desc: 'Optical ITO PET Film 125um', q: 0.0450, uom: 'SM', p0: 85.00, p1: 145.00, loss0: 0.15, loss1: 0.15, ref: 'Market ITO Price Spike (+70.6%)' },
    { no: 2, code: 'CHEM-NANO-AG-88', desc: 'Nano-Silver Conductive Paste', q: 0.3500, uom: 'GM', p0: 120.00, p1: 185.00, loss0: 0.10, loss1: 0.22, ref: 'Double Variance (Price Up + Scrap Up)' },
    { no: 3, code: 'OPT-OCA-250', desc: 'Optically Clear Adhesive (OCA) 250um', q: 0.0420, uom: 'SM', p0: 65.00, p1: 65.00, loss0: 0.08, loss1: 0.25, ref: 'Cleanroom Bubble Scrap (+17%)' },
    { no: 4, code: 'RAW-FPC-CON-6P', desc: 'Flexible Printed Circuit (FPC) 6-Pin', q: 1.0000, uom: 'PC', p0: 18.50, p1: 26.00, loss0: 0.05, loss1: 0.05, ref: 'Copper Tariffs (+40.5%)' },
    { no: 5, code: 'CHEM-UV-DIELEC', desc: 'UV Dielectric Overcoat Resin', q: 0.0850, uom: 'GM', p0: 45.00, p1: 36.00, loss0: 0.10, loss1: 0.10, ref: 'Local Sourcing Cost Reduction (-20%)' },
    { no: 6, code: 'RAW-POL-ANTI-GL', desc: 'Anti-Glare Polarizer Sheet', q: 0.0410, uom: 'SM', p0: 75.00, p1: 75.00, loss0: 0.20, loss1: 0.08, ref: 'Cutting Optimization Yield Gain (-12%)' },
    { no: 7, code: 'CHEM-BLACK-BEZ', desc: 'Black Matrix Bezel Ink', q: 0.1200, uom: 'GM', p0: 22.00, p1: 22.00, loss0: 0.10, loss1: 0.24, ref: 'Alignment Smear Scrap (+14%)' },
    { no: 8, code: 'CHEM-SOLV-IPA', desc: 'High-Purity Electronic IPA Solvent', q: 0.0080, uom: 'GM', p0: 1.80, p1: 1.80, loss0: 0.05, loss1: 0.05, ref: 'Stable Benchmark' },
    { no: 9, code: 'RAW-COPPER-FOIL', desc: 'EMI Shielding Copper Foil Tape', q: 0.0150, uom: 'SM', p0: 12.00, p1: 16.50, loss0: 0.05, loss1: 0.05, ref: 'Metal Raw Material Spike (+37.5%)' },
    { no: 10, code: 'CHEM-PRIMER-80', desc: 'Adhesion Promoter Primer', q: 0.0050, uom: 'GM', p0: 3.50, p1: 3.50, loss0: 0.05, loss1: 0.05, ref: 'Stable' },
    { no: 11, code: 'CHEM-ACF-TAPE', desc: 'Anisotropic Conductive Film (ACF)', q: 0.0060, uom: 'M', p0: 14.00, p1: 14.00, loss0: 0.08, loss1: 0.20, ref: 'Bonding Scrap Increase (+12%)' },
    { no: 12, code: 'RAW-LINER-PET', desc: 'Silicone Fluorosilicone Release Liner', q: 0.0480, uom: 'SM', p0: 8.50, p1: 7.20, loss0: 0.05, loss1: 0.05, ref: 'Bulk Roll Purchase Savings (-15.3%)' },
    { no: 13, code: 'CHEM-HARD-COAT', desc: 'Optical Hard-Coat Solution 3H', q: 0.0350, uom: 'GM', p0: 55.00, p1: 68.00, loss0: 0.12, loss1: 0.12, ref: 'Chemical Supplier Price Up (+23.6%)' },
    { no: 14, code: 'RAW-BARCODE-QR', desc: 'High-Temp QR Serial Label', q: 1.0000, uom: 'PC', p0: 0.35, p1: 0.35, loss0: 0.02, loss1: 0.02, ref: 'Stable' },
    { no: 15, code: 'RAW-DUMMY-CAR', desc: 'Surface Protection Carrier Masking', q: 0.0520, uom: 'SM', p0: 3.80, p1: 3.10, loss0: 0.05, loss1: 0.05, ref: 'Alternative Vendor Savings (-18.4%)' },
    { no: 16, code: 'CHEM-MARK-UV', desc: 'UV Traceability Marking Ink', q: 0.0025, uom: 'GM', p0: 6.20, p1: 6.20, loss0: 0.05, loss1: 0.05, ref: 'Stable' }
  ]

  bomData.forEach((m, idx) => {
    const row = 5 + idx
    ws2.getCell(`A${row}`).value = m.no
    ws2.getCell(`B${row}`).value = m.code
    ws2.getCell(`C${row}`).value = m.desc
    ws2.getCell(`D${row}`).value = m.q
    ws2.getCell(`E${row}`).value = m.uom
    ws2.getCell(`F${row}`).value = m.p0
    ws2.getCell(`G${row}`).value = m.p1
    ws2.getCell(`H${row}`).value = m.loss0
    ws2.getCell(`I${row}`).value = m.loss1
    ws2.getCell(`J${row}`).value = m.ref
  })

  // 3. ROUTING BREAKDOWN: FULL 39 PROCESS STEPS
  const ws3 = wb.getWorksheet('3_ROUTING_BREAKDOWN')
  const routingData = [
    // PRINTING Line (22 steps)
    { seq: 1, sec: 'PRINTING Line', name: 'Laser Precision ITO Substrate Sizing', dept: 'Precision Cutting', m: 1.0, cap0: 4500, cap1: 4500, y0: 1.00, y1: 1.00, ref: 'Stable Benchmark' },
    { seq: 2, sec: 'PRINTING Line', name: 'High-Temp Nitrogen Thermal Annealing', dept: 'Precision Cutting', m: 1.0, cap0: 2200, cap1: 1600, y0: 1.00, y1: 1.00, ref: 'Oven Temperature Limit (-27.3%)' },
    { seq: 3, sec: 'PRINTING Line', name: 'Static Elimination & Plasma Surface Activation', dept: 'Cleanroom Printing', m: 1.0, cap0: 3600, cap1: 3600, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 4, sec: 'PRINTING Line', name: 'Roller Clean & Micro-Dust Elimination 1', dept: 'Cleanroom Printing', m: 1.0, cap0: 5500, cap1: 5500, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 5, sec: 'PRINTING Line', name: 'Screen Print - Nano-Silver Drive Lines (Tx)', dept: 'Cleanroom Printing', m: 4.0, cap0: 1650, cap1: 1150, y0: 1.00, y1: 1.00, ref: 'Screen Mesh Clogging Drop (-30.3%)' },
    { seq: 6, sec: 'PRINTING Line', name: 'Roller Clean & Micro-Dust Elimination 2', dept: 'Cleanroom Printing', m: 1.0, cap0: 5500, cap1: 5500, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 7, sec: 'PRINTING Line', name: 'UV Light Curing - Tx Grid Line', dept: 'Cleanroom Printing', m: 2.0, cap0: 2400, cap1: 2400, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 8, sec: 'PRINTING Line', name: 'Roller Clean & Micro-Dust Elimination 3', dept: 'Cleanroom Printing', m: 1.0, cap0: 5500, cap1: 5500, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 9, sec: 'PRINTING Line', name: 'Screen Print - Dielectric Interlayer Bridge 1', dept: 'Cleanroom Printing', m: 3.0, cap0: 1750, cap1: 1750, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 10, sec: 'PRINTING Line', name: 'Roller Clean & Micro-Dust Elimination 4', dept: 'Cleanroom Printing', m: 1.0, cap0: 5500, cap1: 5500, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 11, sec: 'PRINTING Line', name: 'Screen Print - Dielectric Interlayer Bridge 2', dept: 'Cleanroom Printing', m: 3.0, cap0: 1750, cap1: 1750, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 12, sec: 'PRINTING Line', name: 'Roller Clean & Micro-Dust Elimination 5', dept: 'Cleanroom Printing', m: 1.0, cap0: 5500, cap1: 5500, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 13, sec: 'PRINTING Line', name: 'Intermediate Hot Air Tunnel Baking #1', dept: 'Cleanroom Printing', m: 1.0, cap0: 3000, cap1: 3000, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 14, sec: 'PRINTING Line', name: 'Roller Clean & Micro-Dust Elimination 6', dept: 'Cleanroom Printing', m: 1.0, cap0: 5500, cap1: 5500, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 15, sec: 'PRINTING Line', name: 'Screen Print - Nano-Silver Sense Lines (Rx)', dept: 'Cleanroom Printing', m: 6.0, cap0: 1400, cap1: 1050, y0: 1.00, y1: 0.90, ref: 'Double Variance (Cap -25% + Yield -10%)' },
    { seq: 16, sec: 'PRINTING Line', name: 'Roller Clean & Micro-Dust Elimination 7', dept: 'Cleanroom Printing', m: 1.0, cap0: 5500, cap1: 5500, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 17, sec: 'PRINTING Line', name: 'Screen Print - Black Opaque Masking Bezel', dept: 'Cleanroom Printing', m: 2.0, cap0: 1900, cap1: 1900, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 18, sec: 'PRINTING Line', name: 'Roller Clean & Micro-Dust Elimination 8', dept: 'Cleanroom Printing', m: 1.0, cap0: 5500, cap1: 5500, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 19, sec: 'PRINTING Line', name: 'Final Multi-Zone Curing & Polymerization', dept: 'Cleanroom Printing', m: 1.0, cap0: 2800, cap1: 2800, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 20, sec: 'PRINTING Line', name: 'Roller Clean & Micro-Dust Elimination 9', dept: 'Cleanroom Printing', m: 1.0, cap0: 5500, cap1: 5500, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 21, sec: 'PRINTING Line', name: 'Roll-to-Sheet Carrier Protective Lamination', dept: 'Cleanroom Printing', m: 4.0, cap0: 2500, cap1: 2500, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 22, sec: 'PRINTING Line', name: 'Cooling Tunnel & De-tack Stabilization', dept: 'Cleanroom Printing', m: 1.0, cap0: 4200, cap1: 4200, y0: 1.00, y1: 1.00, ref: 'Stable' },

    // Material Prep & Cutting (5 steps)
    { seq: 23, sec: 'Material Prep & Cutting', name: 'Optical Hard-Coat Sheet CNC Routing', dept: 'Precision Cutting', m: 1.0, cap0: 9500, cap1: 9500, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 24, sec: 'Material Prep & Cutting', name: 'Polarizer Film Precision Rotary Shearing', dept: 'Precision Cutting', m: 1.0, cap0: 8200, cap1: 8200, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 25, sec: 'Material Prep & Cutting', name: 'FPC Connector Tail Kiss-Cutting', dept: 'Module Assembly', m: 0.5, cap0: 4200, cap1: 4200, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 26, sec: 'Material Prep & Cutting', name: 'Multi-Cavity Hydraulic Die Blanking', dept: 'Module Assembly', m: 1.0, cap0: 1750, cap1: 1750, y0: 1.00, y1: 1.00, ref: 'Stable' },
    { seq: 27, sec: 'Material Prep & Cutting', name: 'Copper Shielding Foil Slit & Strip', dept: 'Precision Cutting', m: 1.0, cap0: 6500, cap1: 6500, y0: 0.0820, y1: 0.0820, ref: 'Stable' },

    // Digital Assembly Line (9 steps)
    { seq: 28, sec: 'Digital Assembly Line', name: 'Automated Vision 3D Grid Pattern AOI', dept: 'Module Assembly', m: 4.0, cap0: 550, cap1: 550, y0: 0.85, y1: 0.65, ref: 'Major Vision Yield Drop (-20%)' },
    { seq: 29, sec: 'Digital Assembly Line', name: 'High-Precision ACF Anisotropic Pre-Tacking', dept: 'Module Assembly', m: 2.0, cap0: 550, cap1: 550, y0: 0.92, y1: 0.92, ref: 'Stable' },
    { seq: 30, sec: 'Digital Assembly Line', name: 'Automated FPC Hot-Bar Thermode Bonding', dept: 'Module Assembly', m: 4.0, cap0: 500, cap1: 360, y0: 0.90, y1: 0.90, ref: 'Thermode Alignment Speed Drop (-28%)' },
    { seq: 31, sec: 'Digital Assembly Line', name: 'Vacuum Autoclave Debubbling Chamber', dept: 'Module Assembly', m: 1.0, cap0: 550, cap1: 550, y0: 0.95, y1: 0.95, ref: 'Stable' },
    { seq: 32, sec: 'Digital Assembly Line', name: 'Post-Bonding Micro-Resistance Probing', dept: 'Module Assembly', m: 2.0, cap0: 520, cap1: 520, y0: 0.92, y1: 0.81, ref: 'Contact Resistance Yield Drop (-11%)' },
    { seq: 33, sec: 'Digital Assembly Line', name: 'Capacitive Multi-Touch Coordinate Scanning', dept: 'Module Assembly', m: 4.0, cap0: 480, cap1: 380, y0: 0.94, y1: 0.86, ref: 'Double Variance (Cap -20.8% + Yield -8%)' },
    { seq: 34, sec: 'Digital Assembly Line', name: 'Optical Clarity Spectrophotometer Test', dept: 'Module Assembly', m: 1.0, cap0: 550, cap1: 550, y0: 0.96, y1: 0.96, ref: 'Stable' },
    { seq: 35, sec: 'Digital Assembly Line', name: 'High-Speed UV Laser Traceability Marking', dept: 'Module Assembly', m: 1.0, cap0: 550, cap1: 550, y0: 0.98, y1: 0.98, ref: 'Stable' },
    { seq: 36, sec: 'Digital Assembly Line', name: 'ESD Grounding Shield Tape Application', dept: 'Module Assembly', m: 2.0, cap0: 550, cap1: 550, y0: 0.96, y1: 0.96, ref: 'Stable' },

    // Supporting Line (2 steps)
    { seq: 37, sec: 'Supporting Line', name: 'FPC Tail Heat-Stake Stiffener Jig', dept: 'Module Assembly', m: 1.0, cap0: 450, cap1: 350, y0: 1.00, y1: 1.00, ref: 'Cycle Time Slowdown (-22.2%)' },
    { seq: 38, sec: 'Supporting Line', name: 'Anti-Static Protective Film Application', dept: 'Module Assembly', m: 0.5, cap0: 3800, cap1: 3800, y0: 1.00, y1: 1.00, ref: 'Stable' },

    // QA & Packing Line (1 step)
    { seq: 39, sec: 'QA & Packing Line', name: '100% Outgoing OQA Functional & Clean Packaging', dept: 'Quality Assurance', m: 5.0, cap0: 480, cap1: 390, y0: 0.9950, y1: 0.9800, ref: 'Double Variance (Cap -18.8% + Yield -1.5%)' }
  ]

  routingData.forEach((r, idx) => {
    const row = 5 + idx
    ws3.getCell(`A${row}`).value = r.seq
    ws3.getCell(`B${row}`).value = r.sec
    ws3.getCell(`C${row}`).value = r.name
    ws3.getCell(`D${row}`).value = r.dept
    ws3.getCell(`E${row}`).value = r.m
    ws3.getCell(`F${row}`).value = r.cap0
    ws3.getCell(`G${row}`).value = r.cap1
    ws3.getCell(`H${row}`).value = r.y0
    ws3.getCell(`I${row}`).value = r.y1
    ws3.getCell(`J${row}`).value = r.ref
  })

  // 4. SUMMARY & COMPARISON (Populate Realistic Action Plans across all Top 10 Drivers)
  const ws4 = wb.getWorksheet('4_SUMMARY_&_COMPARISON')
  const actionPlans = [
    { row: 13, ctrl: 'Uncontrollable', plan: 'Purchasing: Qualify Tier-2 ITO Film Supplier in Taiwan' },
    { row: 14, ctrl: 'Uncontrollable', plan: 'R&D / Purchasing: Optimize Paste Viscosity & Negotiate Volume Discount' },
    { row: 15, ctrl: 'Controllable', plan: 'IE / Automation: Recalibrate AOI Optical Light Polarization' },
    { row: 16, ctrl: 'Uncontrollable', plan: 'Purchasing: Request Blanket Order Rebate on FPC Connectors' },
    { row: 17, ctrl: 'Controllable', plan: 'Process Engineering: Upgrade Screen Mesh & Adjust Squeegee Pressure' },
    { row: 18, ctrl: 'Controllable', plan: 'Quality / Cleanroom: Reduce OCA Bubble via Pre-Lamination Ionizer' },
    { row: 19, ctrl: 'Controllable', plan: 'Production / Maintenance: Replace Hot-Bar Thermode Heating Element' },
    { row: 20, ctrl: 'Controllable', plan: 'Testing IE: Upgrade Capacitive Scan Multiplexer Firmware' },
    { row: 21, ctrl: 'Controllable', plan: 'OQA / Packaging: Streamline Final Inspection Fixture & Ergonomics' },
    { row: 22, ctrl: 'Controllable', plan: 'Process Engineering: Retrain Resistance Probe Pin Alignment' }
  ]

  actionPlans.forEach(ap => {
    ws4.getCell(`I${ap.row}`).value = ap.ctrl
    ws4.getCell(`J${ap.row}`).value = ap.plan
  })

  console.log('Writing full-size automotive test workbook...')
  await wb.xlsx.writeFile(outputPath)
  console.log('[SUCCESS] Rebuilt CostModel_TEST_SCENARIOS_v2.xlsx with FULL-SIZE (16 BOM & 39 Routing) dataset!')
}

buildFullSizeTestScenario().catch(console.error)
