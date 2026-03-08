/** @type {import('tailwindcss').Config} */
module.exports = {
  // Add "./app/**/*.{js,jsx,ts,tsx}" to the array
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        anek: ["AnekMalayalam"],
        muller: ["MullerMedium"],
        "muller-bold": ["MullerBold"],
      },
    },
  },
  plugins: [],
}