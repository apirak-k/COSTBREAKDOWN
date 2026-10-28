import { readFile, writeFile } from 'node:fs/promises'

const [intelPath, armPath, outputPath] = process.argv.slice(2)
if (!intelPath || !armPath || !outputPath) {
  throw new Error('Usage: node scripts/combine_universal_macho.mjs <x86_64-binary> <arm64-binary> <output>')
}

const architectures = [
  { path: intelPath, cpuType: 0x01000007, name: 'x86_64' },
  { path: armPath, cpuType: 0x0100000c, name: 'arm64' },
]

for (const architecture of architectures) {
  architecture.bytes = await readFile(architecture.path)
  if (architecture.bytes.length < 32) throw new Error(`${architecture.name} input is not a complete 64-bit Mach-O`)
  const magic = architecture.bytes.readUInt32LE(0)
  const bigEndianMagic = architecture.bytes.readUInt32BE(0)
  if (magic !== 0xfeedfacf && bigEndianMagic !== 0xfeedfacf) {
    throw new Error(`${architecture.name} input does not have a 64-bit Mach-O header`)
  }
  architecture.bigEndian = magic !== 0xfeedfacf
  architecture.actualCPU = architecture.bigEndian
    ? architecture.bytes.readUInt32BE(4)
    : architecture.bytes.readUInt32LE(4)
  architecture.cpuSubtype = architecture.bigEndian
    ? architecture.bytes.readUInt32BE(8)
    : architecture.bytes.readUInt32LE(8)
  if (architecture.actualCPU !== architecture.cpuType) {
    throw new Error(`${architecture.name} input has unexpected CPU type 0x${architecture.actualCPU.toString(16)}`)
  }
}

const align = value => Math.ceil(value / 4096) * 4096
const headerSize = 8 + architectures.length * 32
let nextOffset = align(headerSize)
for (const architecture of architectures) {
  architecture.offset = nextOffset
  nextOffset = align(nextOffset + architecture.bytes.length)
}

const universal = Buffer.alloc(architectures[1].offset + architectures[1].bytes.length)
universal.writeUInt32BE(0xcafebabf, 0)
universal.writeUInt32BE(architectures.length, 4)
architectures.forEach((architecture, index) => {
  const entry = 8 + index * 32
  universal.writeUInt32BE(architecture.cpuType, entry)
  universal.writeUInt32BE(architecture.cpuSubtype, entry + 4)
  universal.writeBigUInt64BE(BigInt(architecture.offset), entry + 8)
  universal.writeBigUInt64BE(BigInt(architecture.bytes.length), entry + 16)
  universal.writeUInt32BE(12, entry + 24)
  universal.writeUInt32BE(0, entry + 28)
  architecture.bytes.copy(universal, architecture.offset)
})

await writeFile(outputPath, universal)
console.log(`Created universal Mach-O with x86_64 and arm64 slices: ${outputPath}`)
