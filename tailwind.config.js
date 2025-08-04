/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        fadeInMove: {
          "0%": { opacity: "0", transform: "translateY(-3px) scale(0.95)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        fadeInMove: "fadeInMove 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};
