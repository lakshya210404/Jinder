import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "system-ui",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        surface: {
          DEFAULT: "#000000",
          raised: "#0a0a0a",
          card: "#111111",
          border: "#222222",
          tag: "#1a1a1a",
        },
        ink: {
          DEFAULT: "#FFFFFF",
          secondary: "#999999",
        },
      },
    },
  },
  plugins: [],
};

export default config;
