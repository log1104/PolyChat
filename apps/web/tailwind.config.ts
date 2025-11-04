import { tailwindThemeExtension } from "../../design/tailwind.tokens";
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  safelist: [
    "bg-mentor-general",
    "bg-mentor-bible",
    "bg-mentor-chess",
    "bg-mentor-stock",
    "bg-mentor-math",
    "border-mentor-general-accent",
    "border-mentor-bible-accent",
    "border-mentor-chess-accent",
    "border-mentor-stock-accent",
    "border-mentor-math-accent",
  ],
  theme: {
    extend: {
      ...tailwindThemeExtension.extend,
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        bubble: "1rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 23, 42, 0.12)",
      },
      zIndex: {
        60: "60",
        65: "65",
        70: "70",
      },
    },
  },
  plugins: [],
} satisfies Config;
