import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          900: "#0f0f13",
          800: "#111118",
          700: "#1a1a26",
        },
        brand: "#7c6dfa",
        income: "#5af0c4",
        danger: "#f05f5f",
        warning: "#f5a623",
        success: "#22c55e",
        whatsapp: "#25D366",
        "cat-supermercado": "#22c55e",
        "cat-restaurantes": "#f97316",
        "cat-transporte": "#3b82f6",
        "cat-salud": "#ef4444",
        "cat-entretenimiento": "#ec4899",
        "cat-ropa": "#06b6d4",
        "cat-otros": "#94a3b8",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 250ms ease-out",
        "slide-up": "slide-up 300ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
