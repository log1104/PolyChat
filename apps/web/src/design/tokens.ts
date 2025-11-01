export const mentorColorTokens = {
  general: {
    base: '#1f2933', // slate-800
    accent: '#9aa5b1', // slate-400
    gradient: ['#0f172a', '#1e293b']
  },
  bible: {
    base: '#f59e0b', // amber-500
    accent: '#fcd34d', // amber-300
    gradient: ['#78350f', '#f59e0b']
  },
  chess: {
    base: '#4338ca', // indigo-600
    accent: '#a5b4fc', // indigo-300
    gradient: ['#1e1b4b', '#4338ca']
  },
  stock: {
    base: '#10b981', // emerald-500
    accent: '#6ee7b7', // emerald-300
    gradient: ['#064e3b', '#10b981']
  },
  math: {
    base: '#7c3aed', // violet-600
    accent: '#c4b5fd', // violet-300
    gradient: ['#312e81', '#7c3aed']
  }
} as const;

export type MentorThemeKey = keyof typeof mentorColorTokens;

export const tailwindThemeExtension = {
  extend: {
    colors: Object.fromEntries(
      Object.entries(mentorColorTokens).map(([key, value]) => [
        `mentor-${key}`,
        {
          DEFAULT: value.base,
          accent: value.accent
        }
      ])
    ),
    backgroundImage: Object.fromEntries(
      Object.entries(mentorColorTokens).map(([key, value]) => [
        `mentor-${key}`,
        `linear-gradient(135deg, ${value.gradient[0]}, ${value.gradient[1]})`
      ])
    )
  }
};

export function getMentorThemeClasses(mentor: MentorThemeKey) {
  return {
    bubble: `bg-mentor-${mentor} text-white`,
    accentBorder: `border-mentor-${mentor}-accent`,
    badge: `bg-mentor-${mentor}-accent text-mentor-${mentor}`
  };
}
