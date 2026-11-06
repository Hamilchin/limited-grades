import colors from "tailwindcss/colors";

// Same palette as limitedgrades.com: neutral greys, rarity colors, and one color per grade.
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  plugins: [],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      black: colors.black,
      white: colors.white,
      neutral: colors.neutral,
      amber: { 400: colors.amber["400"], 500: colors.amber["500"], 600: colors.amber["600"] },
      blue: { 400: colors.blue["400"], 500: colors.blue["500"], 600: colors.blue["600"] },
      emerald: { 500: colors.emerald["500"], 600: colors.emerald["600"] },
      rose: { 500: colors.rose["500"], 600: colors.rose["600"] },
      common: "#1a1718",
      uncommon: "#707883",
      rare: "#a58e4a",
      mythic: "#bf4427",
      "A+": "#23c552",
      A: "#41c755",
      "A-": "#60ca58",
      "B+": "#7ecc5b",
      B: "#9ccf5f",
      "B-": "#bad162",
      "C+": "#d9d465",
      C: "#f7d668",
      "C-": "#eeaf5d",
      "D+": "#e68751",
      D: "#dd6046",
      "D-": "#d5383a",
      F: "#cc112f",
    },
    extend: {
      blur: { xs: "2px" },
      fontFamily: { belerenSmallCaps: "Beleren SmallCaps Bold" },
      screens: { "1.5xl": "1300px" },
      transitionTimingFunction: { DEFAULT: "ease" },
    },
  },
};
