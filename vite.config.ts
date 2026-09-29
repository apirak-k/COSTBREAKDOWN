import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
