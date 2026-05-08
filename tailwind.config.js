/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      boxShadow: {
        soft: "0 24px 70px rgba(79, 88, 102, 0.16)",
        card: "0 14px 34px rgba(79, 88, 102, 0.11)",
      },
      colors: {
        cloud: "#f8faf7",
        mist: "#eef4f6",
        sage: "#cfe8dd",
        skysoft: "#d8eafa",
        ink: "#20242a",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
