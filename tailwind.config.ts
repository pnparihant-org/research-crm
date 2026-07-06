import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Arihant Capital brand green — anchored on the provided brand values:
        // 50 = rgb(228,255,225) pale bg, 400 = rgb(118,201,138) mid, 600 = #34b350 primary.
        brand: {
          50: "#E4FFE1",
          100: "#C8F5C2",
          200: "#A8E8A8",
          300: "#8ADB98",
          400: "#76C98A",
          500: "#4FC06A",
          600: "#34B350",
          700: "#2B9443",
          800: "#237736",
          900: "#1A5A29",
          DEFAULT: "#34B350",
        },
      },
    },
  },
  plugins: [],
};

export default config;
