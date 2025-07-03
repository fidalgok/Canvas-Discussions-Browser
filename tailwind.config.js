/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("daisyui")
  ],
  daisyui: {
    themes: [
      {
        "CDIL-BC": {
          "primary": "#003957",
          "primary-content": "#ffffff",
          "secondary": "#0D5E93", 
          "secondary-content": "#ffffff",
          "accent": "#37CDBE",
          "accent-content": "#000000",
          "neutral": "#3D4451",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f2f2f2",
          "base-300": "#e6e6e6",
          "base-content": "#1f2937",
          "info": "#3ABFF8",
          "info-content": "#000000",
          "success": "#36D399",
          "success-content": "#000000",
          "warning": "#FBBD23",
          "warning-content": "#000000",
          "error": "#F87272",
          "error-content": "#000000"
        }
      }
    ],
    defaultTheme: "CDIL-BC",
    base: true,
    styled: true,
    utils: true,
  }
};