import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,vue,ts}',
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        // Primary navy blue from YourTrustedPlanner.com
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#0A2540', // Primary brand color
          950: '#071b2e'
        },
        // Accent red for CTAs (matches the red from the website)
        accent: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#C41E3A', // CTA red from website
          600: '#b01a32',
          700: '#9c1629',
          800: '#7f1220',
          900: '#5a0d17'
        },
        // Keep burgundy as alias for compatibility
        burgundy: {
          500: '#C41E3A',
          600: '#b01a32',
          700: '#9c1629'
        },
        // Primary color pointing to navy
        primary: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#486581',
          600: '#334e68',
          700: '#243b53',
          800: '#102a43',
          900: '#0A2540'
        }
      }
    }
  },
  plugins: []
} satisfies Config

