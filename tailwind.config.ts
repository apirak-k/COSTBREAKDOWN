import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#fbfaf6',
          100: '#f3f0e8',
          200: '#e4dfd5',
          300: '#cec7ba',
          400: '#a29b8f',
          500: '#777a73',
          600: '#5c635f',
          700: '#414c49',
          800: '#2b3936',
          900: '#1f2c29',
          950: '#151f1d',
        },
        blue: {
          50: '#eff5f1',
          100: '#dcebe2',
          200: '#bfd8c9',
          300: '#95bba6',
          400: '#6c9b82',
          500: '#4b7e67',
          600: '#356a55',
          700: '#285644',
          800: '#214538',
          900: '#1c392f',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        display: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
