import JSZip from 'jszip'

export type ExactNumericCellValues = Record<string, Map<string, string>>
export type ExactNumericCellChanges = Record<string, Record<string, string>>

interface WorksheetFile {
  name: string
  path: string
}

function attribute(tag: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|\\s)${escaped}="([^"]*)"`).exec(tag)?.[1]
}

function worksheetFiles(workbookXml: string, relationshipsXml: string): WorksheetFile[] {
  const relationships = new Map<string, string>()
  for (const match of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const id = attribute(match[1], 'Id')
    const target = attribute(match[1], 'Target')
    if (id && target) relationships.set(id, target)
  }

  const files: WorksheetFile[] = []
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
    const name = attribute(match[1], 'name')
    const relationId = attribute(match[1], 'r:id')
    const target = relationId ? relationships.get(relationId) : undefined
    if (!name || !target) continue
    const normalizedTarget = target.replace(/^\//, '')
    const path = normalizedTarget.startsWith('xl/') ? normalizedTarget : `xl/${normalizedTarget}`
    files.push({ name, path })
  }
  return files
}

async function readWorksheetFiles(data: ArrayBuffer | Uint8Array) {
  const zip = await JSZip.loadAsync(data)
  const workbookFile = zip.file('xl/workbook.xml')
  const relationshipsFile = zip.file('xl/_rels/workbook.xml.rels')
  if (!workbookFile || !relationshipsFile) return { zip, files: [] as WorksheetFile[] }
  const [workbookXml, relationshipsXml] = await Promise.all([
    workbookFile.async('string'),
    relationshipsFile.async('string')
  ])
  return { zip, files: worksheetFiles(workbookXml, relationshipsXml) }
}

/** Reads the lexical base-10 values from numeric XLSX cells before a JS number parser rounds them. */
export async function readExactNumericCells(data: ArrayBuffer | Uint8Array): Promise<ExactNumericCellValues> {
  const { zip, files } = await readWorksheetFiles(data)
  const result: ExactNumericCellValues = {}
  await Promise.all(files.map(async ({ name, path }) => {
    const worksheet = zip.file(path)
    if (!worksheet) return
    const xml = await worksheet.async('string')
    const cells = new Map<string, string>()
    for (const match of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tag = match[1]
      const address = attribute(tag, 'r')
      const type = attribute(tag, 't')
      if (!address || (type !== undefined && type !== 'n')) continue
      const value = /<v>([\s\S]*?)<\/v>/.exec(match[2] ?? '')?.[1]
      if (value !== undefined && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) {
        cells.set(address, value.trim())
      }
    }
    result[name] = cells
  }))
  return result
}

/** Replaces numeric cell lexemes while retaining their numeric XLSX cell type and styles. */
export async function writeExactNumericCells(
  data: ArrayBuffer | Uint8Array,
  changes: ExactNumericCellChanges
): Promise<Uint8Array> {
  if (Object.keys(changes).length === 0) return data instanceof Uint8Array ? data : new Uint8Array(data)
  const { zip, files } = await readWorksheetFiles(data)
  for (const { name, path } of files) {
    const updates = changes[name]
    const worksheet = zip.file(path)
    if (!updates || !worksheet) continue
    let xml = await worksheet.async('string')
    for (const [address, value] of Object.entries(updates)) {
      const escapedAddress = address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const cellPattern = new RegExp(`<c\\b([^>]*\\br="${escapedAddress}"[^>]*)>([\\s\\S]*?)<\\/c>`)
      xml = xml.replace(cellPattern, (cell, tag: string, contents: string) => {
        const type = attribute(tag, 't')
        if (type !== undefined && type !== 'n') return cell
        if (/<v>[\s\S]*?<\/v>/.test(contents)) {
          return `<c${tag}>${contents.replace(/<v>[\s\S]*?<\/v>/, `<v>${value}</v>`)}</c>`
        }
        return `<c${tag}>${contents}<v>${value}</v></c>`
      })
    }
    zip.file(path, xml)
  }
  return zip.generateAsync({ type: 'uint8array' })
}
