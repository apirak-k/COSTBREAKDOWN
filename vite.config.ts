import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function builtInMockUserFeaturePlugin() {
  return {
    name: 'costbreakdown-built-in-mock-user-feature',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      const normalizedId = id.replace(/\\/g, '/')
      if (!normalizedId.endsWith('/src/state/store.tsx')) return undefined

      const transformed = code.replace(
        /(const\s+loadDevelopmentMockData\s*=\s*\(pair:\s*SnapshotPair\)\s*=>\s*\{\s*\r?\n)\s*if\s*\(!import\.meta\.env\.DEV\)\s*return\s*\r?\n/,
        '$1'
      )

      if (/loadDevelopmentMockData[\s\S]{0,200}if\s*\(!import\.meta\.env\.DEV\)\s*return/.test(transformed)) {
        throw new Error('Built-in Mock must remain available in production; store DEV guard was not removed.')
      }
      return transformed
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [builtInMockUserFeaturePlugin(), react()],
  // Complete/Incomplete Mock is a user-facing product feature. The remaining
  // transform only neutralizes the legacy store guard until that internal API
  // is renamed/cleaned up; the UI itself is no longer DEV-gated in source.
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
