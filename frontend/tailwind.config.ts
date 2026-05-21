import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0a0f',
          panel: '#111117',
          card: '#1a1a24',
          hover: '#22222e',
        },
        border: {
          DEFAULT: '#2a2a38',
          strong: '#3a3a4e',
        },
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
        },
        severity: {
          low: '#3b82f6',
          medium: '#f59e0b',
          high: '#f97316',
          critical: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}

export default config
