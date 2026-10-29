import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function builtInMockUserFeaturePlugin() {
  return {
    name: 'costbreakdown-built-in-mock-user-feature',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      const normalizedId = id.replace(/\\/g, '/')

      if (normalizedId.endsWith('/src/shared/layout/AppLayout.tsx')) {
        let transformed = code
        transformed = transformed.replace(
          "  const handleLoadMockData = async (fixture: 'complete' | 'incomplete') => {\n    if (!import.meta.env.DEV) return\n",
          "  const handleLoadMockData = async (fixture: 'complete' | 'incomplete') => {\n"
        )
        transformed = transformed.replace(
          '  const mockAction = import.meta.env.DEV ? (\n',
          '  const mockAction = (\n'
        )
        transformed = transformed.replace(
          'aria-label="Development mock datasets"',
          'aria-label="Built-in mock datasets"'
        )
        transformed = transformed.replace(
          '  ) : undefined\n  const referenceStandardCost',
          '  )\n  const referenceStandardCost'
        )

        if (transformed === code || transformed.includes('const mockAction = import.meta.env.DEV')) {
          throw new Error('Built-in Mock must remain a user-facing feature; AppLayout DEV guard was not removed.')
        }
        return transformed
      }

      if (normalizedId.endsWith('/src/state/store.tsx')) {
        const transformed = code.replace(
          "  const loadDevelopmentMockData = (pair: SnapshotPair) => {\n    if (!import.meta.env.DEV) return\n",
          "  const loadDevelopmentMockData = (pair: SnapshotPair) => {\n"
        )

        if (transformed === code || transformed.includes('const loadDevelopmentMockData = (pair: SnapshotPair) => {\n    if (!import.meta.env.DEV) return')) {
          throw new Error('Built-in Mock must remain available in production; store DEV guard was not removed.')
        }
        return transformed
      }

      return undefined
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [builtInMockUserFeaturePlugin(), react()],
  // Built-in Complete/Incomplete Mock is a user-facing product feature. The
  // pre-transform above protects production/offline builds from historical
  // DEV-only guards until those legacy names/guards are removed from source.
  // Worktrees can share a hoisted node_modules directory. Keep Vite's optimized
  // dependency cache scoped to this checkout to prevent sibling dev servers
  // from invalidating each other's pre-bundled ExcelJS browser shims.
  cacheDir: 'node_modules/.vite-cbd',
  optimizeDeps: {
    include: ['buffer', 'process', 'exceljs/lib/exceljs.bare.js'],
  },
  resolve: {
    alias: [
      { find: /^events$/, replacement: 'events/' },
      { find: /^process$/, replacement: 'process/browser' },
      { find: /^stream$/, replacement: 'readable-stream/readable-browser.js' },
      { find: /^util$/, replacement: 'util/' },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/readable-stream/')) return 'excel-stream'
        },
      },
    },
  },
})
