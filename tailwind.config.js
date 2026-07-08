/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // tailwindcss-animate — provides animate-in / fade-in / zoom-in-95 etc.
    require("tailwindcss-animate"),
  ],
}

