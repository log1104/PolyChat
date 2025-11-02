export const mentorColorTokens = {
  general: {
    base: "#1f2937", // slate-800 closer to mock
    accent: "#94a3b8", // slate-400/bluegray
    gradient: ["#0b1220", "#1e293b"], // deeper start for dark card
  },
  bible: {
    base: "#f59e0b", // amber-500
    accent: "#fbbf24", // amber-400 for accents
    gradient: ["#b45309", "#f59e0b"], // warm amber gradient like mock
  },
  chess: {
    base: "#4f46e5", // indigo-600 slightly brighter
    accent: "#a5b4fc", // indigo-300
    gradient: ["#3730a3", "#4f46e5"],
  },
  stock: {
    base: "#10b981", // emerald-500
    accent: "#34d399", // emerald-400
    gradient: ["#065f46", "#10b981"],
  },
  math: {
    base: "#7c3aed", // violet-600
    accent: "#c4b5fd", // violet-300
    gradient: ["#3730a3", "#7c3aed"],
  },
} as const;

export type MentorThemeKey = keyof typeof mentorColorTokens;

export const tailwindThemeExtension = {
  extend: {
    colors: Object.fromEntries(
      Object.entries(mentorColorTokens).map(([key, value]) => [
        `mentor-${key}`,
        {
          DEFAULT: value.base,
          accent: value.accent,
        },
      ]),
    ),
    backgroundImage: Object.fromEntries(
      Object.entries(mentorColorTokens).map(([key, value]) => [
        `mentor-${key}`,
        `linear-gradient(135deg, ${value.gradient[0]}, ${value.gradient[1]})`,
      ]),
    ),
  },
};

export function getMentorThemeClasses(mentor: MentorThemeKey) {
  return {
    bubble: `bg-mentor-${mentor} text-white`,
    accentBorder: `border-mentor-${mentor}-accent`,
    badge: `bg-mentor-${mentor}-accent text-mentor-${mentor}`,
  };
}
