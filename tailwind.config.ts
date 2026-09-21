import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Arial', 'Helvetica Neue', 'sans-serif'],
        mono: ['Consolas', 'SFMono-Regular', 'Liberation Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
