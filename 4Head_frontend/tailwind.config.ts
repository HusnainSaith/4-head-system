import type { Config } from "tailwindcss";

/** Semantic utilities map to the values in src/styles/tokens.css. */
export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          ring: "hsl(var(--sidebar-ring))",
          "nav-hover": "hsl(var(--sidebar-nav-hover))",
          "nav-active": "hsl(var(--sidebar-nav-active))",
        },
      },
      spacing: {
        compact: "var(--spacing-compact)",
        control: "var(--spacing-control)",
        section: "var(--spacing-section)",
      },
      borderRadius: {
        sm: "var(--radius-small)",
        md: "var(--radius-medium)",
        lg: "var(--radius-large)",
        xl: "var(--radius-extra-large)",
      },
      fontFamily: {
        sans: "var(--font-family-sans)",
        mono: "var(--font-family-mono)",
      },
      fontSize: {
        xs: ["var(--font-size-xs)", "var(--line-height-xs)"],
        sm: ["var(--font-size-sm)", "var(--line-height-sm)"],
        base: ["var(--font-size-base)", "var(--line-height-base)"],
        lg: ["var(--font-size-lg)", "var(--line-height-lg)"],
        xl: ["var(--font-size-xl)", "var(--line-height-xl)"],
        "2xl": ["var(--font-size-2xl)", "var(--line-height-2xl)"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        soft: "var(--shadow-sm)",
        panel: "var(--shadow-md)",
      },
    },
  },
} satisfies Config;