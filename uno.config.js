import { defineConfig, presetUno, presetWind } from 'unocss'
import { presetDaisy } from 'unocss-preset-daisy'

export default defineConfig({
  presets: [
    presetWind({
      preflight: true // Enable CSS reset/normalization
    }),
presetDaisy({
      themes: ["light", "dark", {
        "CDIL-BC": {
          "color-scheme": "light",
          "primary": "#003957",
          "primary-content": "#ffffff",
          "secondary": "#0D5E93", 
          "secondary-content": "#ffffff",
          "accent": "#726158",
          "accent-content": "#ffffff",
          "neutral": "#3D4451",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f2f2f2",
          "base-300": "#e5e6e6",
          "base-content": "#1f2937",
          "info": "#3abff8",
          "info-content": "#002b3d",
          "success": "#36d399",
          "success-content": "#003320",
          "warning": "#fbbd23",
          "warning-content": "#382800",
          "error": "#f87272",
          "error-content": "#470000"
        }
      }]
    })
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'monospace']
    }
  },
  content: {
    filesystem: [
      './pages/**/*.{js,ts,jsx,tsx}',
      './components/**/*.{js,ts,jsx,tsx}',
    ]
  },
  preflights: [
    {
      getCSS: () => `
        a {
          text-decoration: none;
        }
      `
    }
  ]
})