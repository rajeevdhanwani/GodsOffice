// Design System Configuration
// Place this file at: client/src/theme/designSystem.js

export const designSystem = {
  // Color Palette
  colors: {
    // Primary Colors
    primary: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
      main: "#2563eb",
      light: "#60a5fa",
      dark: "#1d4ed8",
    },

    // Secondary Colors
    secondary: {
      50: "#fdf2f8",
      100: "#fce7f3",
      200: "#fbcfe8",
      300: "#f9a8d4",
      400: "#f472b6",
      500: "#ec4899",
      600: "#db2777",
      700: "#be185d",
      800: "#9d174d",
      900: "#831843",
      main: "#db2777",
      light: "#f472b6",
      dark: "#be185d",
    },

    // Success Colors
    success: {
      50: "#f0fdf4",
      100: "#dcfce7",
      200: "#bbf7d0",
      300: "#86efac",
      400: "#4ade80",
      500: "#22c55e",
      600: "#16a34a",
      700: "#15803d",
      800: "#166534",
      900: "#14532d",
      main: "#16a34a",
      light: "#4ade80",
      dark: "#15803d",
    },

    // Warning Colors
    warning: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
      main: "#f59e0b",
      light: "#fbbf24",
      dark: "#d97706",
    },

    // Error Colors
    error: {
      50: "#fef2f2",
      100: "#fee2e2",
      200: "#fecaca",
      300: "#fca5a5",
      400: "#f87171",
      500: "#ef4444",
      600: "#dc2626",
      700: "#b91c1c",
      800: "#991b1b",
      900: "#7f1d1d",
      main: "#dc2626",
      light: "#f87171",
      dark: "#b91c1c",
    },

    // Info Colors
    info: {
      50: "#f0f9ff",
      100: "#e0f2fe",
      200: "#bae6fd",
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#0ea5e9",
      600: "#0284c7",
      700: "#0369a1",
      800: "#075985",
      900: "#0c4a6e",
      main: "#0ea5e9",
      light: "#38bdf8",
      dark: "#0369a1",
    },

    // Blue Colors (Additional)
    blue: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
      main: "#3b82f6",
    },

    // Grey Colors
    grey: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
      main: "#6b7280",
    },

    // Text Colors
    text: {
      primary: "#111827",
      secondary: "#6b7280",
      disabled: "#9ca3af",
      hint: "#d1d5db",
    },

    // Background Colors
    background: {
      default: "#ffffff",
      paper: "#ffffff",
      primaryGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      secondaryGradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      successGradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      warningGradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      errorGradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      infoGradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    },
  },

  // Status Color Configurations
  status: {
    paid: {
      color: "#16a34a",
      background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
    },
    unpaid: {
      color: "#dc2626",
      background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
    },
    partial: {
      color: "#d97706",
      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
    },
    overdue: {
      color: "#be185d",
      background: "linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)",
    },
    cancelled: {
      color: "#6b7280",
      background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
    },
  },

  // Typography
  typography: {
    fontFamily:
      '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
    fontSizes: {
      xs: "0.75rem", // 12px
      sm: "0.875rem", // 14px
      base: "1rem", // 16px
      lg: "1.125rem", // 18px
      xl: "1.25rem", // 20px
      "2xl": "1.5rem", // 24px
      "3xl": "1.875rem", // 30px
      "4xl": "2.25rem", // 36px
      "5xl": "3rem", // 48px
    },
    fontWeights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },
    lineHeights: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },

  // Spacing (in rem units)
  spacing: {
    0: "0",
    1: "0.25rem", // 4px
    2: "0.5rem", // 8px
    3: "0.75rem", // 12px
    4: "1rem", // 16px
    5: "1.25rem", // 20px
    6: "1.5rem", // 24px
    8: "2rem", // 32px
    10: "2.5rem", // 40px
    12: "3rem", // 48px
    16: "4rem", // 64px
    20: "5rem", // 80px
    24: "6rem", // 96px
    32: "8rem", // 128px
  },

  // Border Radius
  borderRadius: {
    none: "0",
    sm: "0.125rem", // 2px
    base: "0.25rem", // 4px
    md: "0.375rem", // 6px
    lg: "0.5rem", // 8px
    xl: "0.75rem", // 12px
    "2xl": "1rem", // 16px
    "3xl": "1.5rem", // 24px
    full: "9999px",
  },

  // Shadows
  shadows: {
    none: "none",
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    xxl: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
  },

  // Transitions
  transitions: {
    fast: "all 0.15s ease-in-out",
    normal: "all 0.3s ease-in-out",
    slow: "all 0.5s ease-in-out",
  },

  // Z-Index Scale
  zIndex: {
    hide: -1,
    auto: "auto",
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },

  // Breakpoints
  breakpoints: {
    xs: "0px",
    sm: "600px",
    md: "900px",
    lg: "1200px",
    xl: "1536px",
  },
};

export default designSystem;
