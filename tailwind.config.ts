import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      maxWidth: {
        mobile: "430px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15,23,42,0.04)",
        nav: "0 -4px 16px rgba(15, 23, 42, 0.08)",
      },
      borderRadius: {
        "24": "24px",
      },
    },
  },
  plugins: [],
};
export default config;
