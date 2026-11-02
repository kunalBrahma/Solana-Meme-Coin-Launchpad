import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          main: "#0b0a10",
          card: "#12111a",
          input: "#181724",
          border: "rgba(255, 255, 255, 0.08)",
        },
        brand: {
          primary: "#9945FF",
          secondary: "#14F195",
          accent: "#00C2FF",
        },
        status: {
          success: "#10B981",
          error: "#EF4444",
          warning: "#F59E0B",
        },
      },
    },
  },
  plugins: [],
};

export default config;

