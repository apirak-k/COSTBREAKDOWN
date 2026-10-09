import type ExcelJS from 'exceljs'

/** Load ExcelJS with the small browser shims its bare build expects. */
export async function loadExcelJS(): Promise<typeof ExcelJS> {
  const [{ Buffer }, processModule] = await Promise.all([import('buffer'), import('process')])
  Object.assign(globalThis, { Buffer, process: processModule.default ?? processModule })

  const excelModule = await import('exceljs/lib/exceljs.bare.js')
  return (excelModule.default ?? excelModule) as typeof ExcelJS
}
