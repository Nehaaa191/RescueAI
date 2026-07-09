/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0B0D",
        surface: {
          DEFAULT: "#141519",
          elevated: "#1C1E23",
        },
        border: "#26282E",
        primary: {
          DEFAULT: "#3B82F6",
          hover: "#2563EB",
        },
        status: {
          critical: "#EF4444",
          high: "#F97316",
          moderate: "#EAB308",
          low: "#22C55E",
        },
        text: {
          primary: "#F4F4F5",
          secondary: "#9CA3AF",
          muted: "#6B7280",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "8px",
        btn: "6px",
      }
    },
  },
  plugins: [],
}
