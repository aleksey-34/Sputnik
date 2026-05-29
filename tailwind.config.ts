import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1A3668",
        accent: "#76D13B",
        "accent-dark": "#5CB82E",
        "accent-light": "#E8F9DC",
        brand: {
          muted: "#64748b",
          bg: "#F4F7FB"
        }
      },
      boxShadow: {
        brand: "0 4px 24px rgba(26, 54, 104, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
