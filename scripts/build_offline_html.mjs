import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, loadConfigFromFile } from 'vite'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(repoRoot, 'dist-offline')
const configFile = resolve(repoRoot, 'vite.config.ts')

const loadedConfig = await loadConfigFromFile(
  { command: 'build', mode: 'production' },
  configFile,
)

if (!loadedConfig) {
  throw new Error('Could not load vite.config.ts for the offline build.')
}

const baseConfig = loadedConfig.config
const baseBuild = baseConfig.build ?? {}
const baseRollupOptions = baseBuild.rollupOptions ?? {}
const baseOutput = Array.isArray(baseRollupOptions.output)
  ? {}
  : (baseRollupOptions.output ?? {})

await build({
  ...baseConfig,
  base: './',
  build: {
    ...baseBuild,
    outDir,
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    modulePreload: false,
    rollupOptions: {
      ...baseRollupOptions,
      output: {
        ...baseOutput,
        manualChunks: undefined,
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
})

const indexPath = resolve(outDir, 'index.html')
let html = await readFile(indexPath, 'utf8')

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'))
  return match?.[1] ?? null
}

function resolveBuiltAsset(reference) {
  const withoutQuery = reference.split(/[?#]/, 1)[0]
  const relativePath = withoutQuery.replace(/^\.\//, '').replace(/^\//, '')
  const resolvedPath = resolve(outDir, relativePath)
  const outPrefix = outDir.endsWith(sep) ? outDir : `${outDir}${sep}`

  if (!resolvedPath.startsWith(outPrefix)) {
    throw new Error(`Offline build referenced a file outside the build directory: ${reference}`)
  }

  return resolvedPath
}

const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0])
for (const tag of linkTags) {
  const rel = getAttribute(tag, 'rel')?.toLowerCase()

  if (rel === 'modulepreload') {
    html = html.replace(tag, '')
    continue
  }

  if (rel !== 'stylesheet') continue

  const href = getAttribute(tag, 'href')
  if (!href) throw new Error(`Stylesheet tag is missing href: ${tag}`)

  const css = await readFile(resolveBuiltAsset(href), 'utf8')
  const safeCss = css.replace(/<\/style/gi, '<\\/style')
  html = html.replace(tag, `<style>\n${safeCss}\n</style>`)
}

const scriptTags = [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(
  (match) => match[0],
)

for (const tag of scriptTags) {
  const src = getAttribute(tag, 'src')
  if (!src) continue

  const script = await readFile(resolveBuiltAsset(src), 'utf8')
  const safeScript = script.replace(/<\/script/gi, '<\\/script')
  const type = getAttribute(tag, 'type')
  const typeAttribute = type ? ` type="${type}"` : ''
  html = html.replace(tag, `<script${typeAttribute}>\n${safeScript}\n</script>`)
}

const unresolvedBuiltAssets = [
  ...html.matchAll(/\b(?:src|href)=["'][^"']*assets\/[^"']+["']/gi),
].map((match) => match[0])

if (unresolvedBuiltAssets.length > 0) {
  throw new Error(
    `Offline HTML still references generated assets: ${unresolvedBuiltAssets.join(', ')}`,
  )
}

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

const standalonePath = resolve(outDir, 'COSTBREAKDOWN.html')
await writeFile(standalonePath, html, 'utf8')

console.log(`Offline standalone build created: ${standalonePath}`)
