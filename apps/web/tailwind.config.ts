import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: {
          950: "#050b09",
          900: "#0a1512",
          800: "#0f211c",
          700: "#163027",
        },
        grass: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        gold: "#fbbf24",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
