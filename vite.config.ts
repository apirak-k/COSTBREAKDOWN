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
          /(^|\r?\n)(\s*)if\s*\(!import\.meta\.env\.DEV\)\s*return\s*(?=\r?\n)/,
          '$1'
        )
        transformed = transformed.replace(
          /const\s+mockAction\s*=\s*import\.meta\.env\.DEV\s*\?\s*\(/,
          'const mockAction = ('
        )
        transformed = transformed.replace(
          'aria-label="Development mock datasets"',
          'aria-label="Built-in mock datasets"'
        )
        transformed = transformed.replace(
          /\)\s*:\s*undefined(\r?\n\s*const referenceStandardCost)/,
          ')$1'
        )

        if (transformed.includes('const mockAction = import.meta.env.DEV')
          || /handleLoadMockData[\s\S]{0,200}if\s*\(!import\.meta\.env\.DEV\)\s*return/.test(transformed)) {
          throw new Error('Built-in Mock must remain a user-facing feature; AppLayout DEV guard was not removed.')
        }
        return transformed
      }

      if (normalizedId.endsWith('/src/state/store.tsx')) {
        const transformed = code.replace(
          /(const\s+loadDevelopmentMockData\s*=\s*\(pair:\s*SnapshotPair\)\s*=>\s*\{\s*\r?\n)\s*if\s*\(!import\.meta\.env\.DEV\)\s*return\s*\r?\n/,
          '$1'
        )

        if (/loadDevelopmentMockData[\s\S]{0,200}if\s*\(!import\.meta\.env\.DEV\)\s*return/.test(transformed)) {
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
  // Complete/Incomplete Mock is a user-facing product feature and must remain
  // available in production and standalone offline builds. This transform only
  // neutralizes the historical DEV-only guards while source cleanup is pending.
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
