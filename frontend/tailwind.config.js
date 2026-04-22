/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#ba9eff",
          dim: "#8455ef",
          fixed: "#ae8dff",
        },
        secondary: {
          DEFAULT: "#3adffa",
          container: "#006877",
        },
        surface: {
          DEFAULT: "#0e0e0e",
          container: "#1a1919",
          low: "#131313",
          high: "#201f1f",
          highest: "#262626",
          bright: "#2c2c2c",
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        headline: ['Manrope', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
