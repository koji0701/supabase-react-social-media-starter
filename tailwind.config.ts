import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Modern Vercel-inspired color palette
        vercel: {
          // Deep blacks and grays
          black: "#000000",
          "gray-900": "#0a0a0a",
          "gray-800": "#171717",
          "gray-700": "#262626",
          "gray-600": "#404040",
          "gray-500": "#525252",
          "gray-400": "#737373",
          "gray-300": "#a3a3a3",
          "gray-200": "#d4d4d4",
          "gray-100": "#f5f5f5",

          // Accent colors (updated purple shades)
          blue: "#0070f3",
          "blue-dark": "#0061d5",
          purple: "#E2CBFF",        // ⬅️ new lavender
          "purple-dark": "#4E2CA5", // ⬅️ deeper indigo
          green: "#00d924",
          "green-dark": "#00b01e",
          orange: "#ff6600",
          "orange-dark": "#e55a00",
          red: "#ee0000",
          "red-dark": "#dc2626",

          // Special
          white: "#ffffff",
          "off-white": "#fafafa",
        },
        // Keep existing goon colors for backward compatibility but update them
        goon: {
          purple: "#E2CBFF",        // ⬅️ new lavender
          "dark-purple": "#393BB2", // ⬅️ deeper indigo
          "deep-bg": "#000000",
          gray: "#737373",
          charcoal: "#262626",
          white: "#ffffff",
          "dark-charcoal": "#171717",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
