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

// The normal production build deliberately uses manualChunks for Excel code.
// A single-file offline build must instead use inlineDynamicImports, and Rollup
// does not allow those two options together. Remove the normal chunking rules
// entirely for this build target rather than trying to override them with
// undefined (Vite's config merge can retain the original value).
const { output: _baseOutput, ...rollupWithoutOutput } = baseRollupOptions
const { manualChunks: _manualChunks, ...outputWithoutManualChunks } = baseOutput

await build({
  ...baseConfig,
  // We already loaded the project config above. Prevent Vite from loading and
  // merging vite.config.ts a second time, which would reintroduce manualChunks.
  configFile: false,
  base: './',
  build: {
    ...baseBuild,
    outDir,
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    modulePreload: false,
    rollupOptions: {
      ...rollupWithoutOutput,
      output: {
        ...outputWithoutManualChunks,
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

// Validate only the remaining HTML markup. The bundled JavaScript can contain
// literal strings such as src="./assets/app.js"; those are just text inside the
// script and must not be mistaken for external HTML asset references.
const htmlMarkupOnly = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>')

const unresolvedBuiltAssets = [
  ...htmlMarkupOnly.matchAll(/\b(?:src|href)=["'][^"']*assets\/[^"']+["']/gi),
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
