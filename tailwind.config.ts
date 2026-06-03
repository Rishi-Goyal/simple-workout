import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        push: "#ef4444",
        pull: "#3b82f6",
        legs: "#22c55e"
      }
    }
  },
  plugins: []
} satisfies Config;
