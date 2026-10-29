import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Worktrees can share a hoisted node_modules directory. Keep Vite's optimized
  // dependency cache scoped to this checkout to prevent sibling dev servers
  // from invalidating each other's pre-bundled ExcelJS browser shims.
  cacheDir: process.env.COSTBREAKDOWN_VITE_CACHE_DIR ?? 'node_modules/.vite-cbd',
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
