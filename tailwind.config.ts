import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        rdc: {
          blue: "#1a3a6b",
          orange: "#e8541a",
          light: "#f0f4ff",
        },
      },
    },
  },
  plugins: [],
};
export default config;
