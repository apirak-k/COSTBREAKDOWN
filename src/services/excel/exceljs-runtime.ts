import type ExcelJS from 'exceljs'
import { Buffer } from 'buffer'
import process from 'process'

/** Load ExcelJS with the small browser shims its bare build expects. */
export async function loadExcelJS(): Promise<typeof ExcelJS> {
  Object.assign(globalThis, { Buffer, process })

  const excelModule = await import('exceljs/lib/exceljs.bare.js')
  return (excelModule.default ?? excelModule) as typeof ExcelJS
}

export function writeExcelJSBuffer(workbook: ExcelJS.Workbook) {
  // ExcelJS's declarations omit JSZip's output type. ArrayBuffer works in browsers before Buffer polyfills load.
  const options = { zip: { type: 'arraybuffer' } } as unknown as Parameters<typeof workbook.xlsx.writeBuffer>[0]
  return workbook.xlsx.writeBuffer(options)
}
