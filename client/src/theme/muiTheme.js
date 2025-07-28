// Material-UI Theme Configuration with Design System Integration
// Place this file at: client/src/theme/muiTheme.js

import { createTheme } from "@mui/material/styles";
import { designSystem } from "./designSystem";

export const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: designSystem.colors.primary.main,
      light: designSystem.colors.primary.light,
      dark: designSystem.colors.primary.dark,
      50: designSystem.colors.primary[50],
      100: designSystem.colors.primary[100],
      200: designSystem.colors.primary[200],
      300: designSystem.colors.primary[300],
      400: designSystem.colors.primary[400],
      500: designSystem.colors.primary[500],
      600: designSystem.colors.primary[600],
      700: designSystem.colors.primary[700],
      800: designSystem.colors.primary[800],
      900: designSystem.colors.primary[900],
    },
    secondary: {
      main: designSystem.colors.secondary.main,
      light: designSystem.colors.secondary.light,
      dark: designSystem.colors.secondary.dark,
      50: designSystem.colors.secondary[50],
      100: designSystem.colors.secondary[100],
      200: designSystem.colors.secondary[200],
      300: designSystem.colors.secondary[300],
      400: designSystem.colors.secondary[400],
      500: designSystem.colors.secondary[500],
      600: designSystem.colors.secondary[600],
      700: designSystem.colors.secondary[700],
      800: designSystem.colors.secondary[800],
      900: designSystem.colors.secondary[900],
    },
    success: {
      main: designSystem.colors.success.main,
      light: designSystem.colors.success.light,
      dark: designSystem.colors.success.dark,
      50: designSystem.colors.success[50],
      100: designSystem.colors.success[100],
      200: designSystem.colors.success[200],
      300: designSystem.colors.success[300],
      400: designSystem.colors.success[400],
      500: designSystem.colors.success[500],
      600: designSystem.colors.success[600],
      700: designSystem.colors.success[700],
      800: designSystem.colors.success[800],
      900: designSystem.colors.success[900],
    },
    warning: {
      main: designSystem.colors.warning.main,
      light: designSystem.colors.warning.light,
      dark: designSystem.colors.warning.dark,
      50: designSystem.colors.warning[50],
      100: designSystem.colors.warning[100],
      200: designSystem.colors.warning[200],
      300: designSystem.colors.warning[300],
      400: designSystem.colors.warning[400],
      500: designSystem.colors.warning[500],
      600: designSystem.colors.warning[600],
      700: designSystem.colors.warning[700],
      800: designSystem.colors.warning[800],
      900: designSystem.colors.warning[900],
    },
    error: {
      main: designSystem.colors.error.main,
      light: designSystem.colors.error.light,
      dark: designSystem.colors.error.dark,
      50: designSystem.colors.error[50],
      100: designSystem.colors.error[100],
      200: designSystem.colors.error[200],
      300: designSystem.colors.error[300],
      400: designSystem.colors.error[400],
      500: designSystem.colors.error[500],
      600: designSystem.colors.error[600],
      700: designSystem.colors.error[700],
      800: designSystem.colors.error[800],
      900: designSystem.colors.error[900],
    },
    info: {
      main: designSystem.colors.info.main,
      light: designSystem.colors.info.light,
      dark: designSystem.colors.info.dark,
      50: designSystem.colors.info[50],
      100: designSystem.colors.info[100],
      200: designSystem.colors.info[200],
      300: designSystem.colors.info[300],
      400: designSystem.colors.info[400],
      500: designSystem.colors.info[500],
      600: designSystem.colors.info[600],
      700: designSystem.colors.info[700],
      800: designSystem.colors.info[800],
      900: designSystem.colors.info[900],
    },
    grey: {
      50: designSystem.colors.grey[50],
      100: designSystem.colors.grey[100],
      200: designSystem.colors.grey[200],
      300: designSystem.colors.grey[300],
      400: designSystem.colors.grey[400],
      500: designSystem.colors.grey[500],
      600: designSystem.colors.grey[600],
      700: designSystem.colors.grey[700],
      800: designSystem.colors.grey[800],
      900: designSystem.colors.grey[900],
    },
    text: {
      primary: designSystem.colors.text.primary,
      secondary: designSystem.colors.text.secondary,
      disabled: designSystem.colors.text.disabled,
    },
    background: {
      default: designSystem.colors.background.default,
      paper: designSystem.colors.background.paper,
    },
    divider: designSystem.colors.grey[200],
  },

  typography: {
    fontFamily: designSystem.typography.fontFamily,
    h1: {
      fontSize: designSystem.typography.fontSizes["5xl"],
      fontWeight: designSystem.typography.fontWeights.extrabold,
      lineHeight: designSystem.typography.lineHeights.tight,
      letterSpacing: "-0.025em",
    },
    h2: {
      fontSize: designSystem.typography.fontSizes["4xl"],
      fontWeight: designSystem.typography.fontWeights.bold,
      lineHeight: designSystem.typography.lineHeights.tight,
      letterSpacing: "-0.025em",
    },
    h3: {
      fontSize: designSystem.typography.fontSizes["3xl"],
      fontWeight: designSystem.typography.fontWeights.bold,
      lineHeight: designSystem.typography.lineHeights.snug,
    },
    h4: {
      fontSize: designSystem.typography.fontSizes["2xl"],
      fontWeight: designSystem.typography.fontWeights.semibold,
      lineHeight: designSystem.typography.lineHeights.snug,
    },
    h5: {
      fontSize: designSystem.typography.fontSizes.xl,
      fontWeight: designSystem.typography.fontWeights.semibold,
      lineHeight: designSystem.typography.lineHeights.snug,
    },
    h6: {
      fontSize: designSystem.typography.fontSizes.lg,
      fontWeight: designSystem.typography.fontWeights.semibold,
      lineHeight: designSystem.typography.lineHeights.normal,
    },
    body1: {
      fontSize: designSystem.typography.fontSizes.base,
      fontWeight: designSystem.typography.fontWeights.normal,
      lineHeight: designSystem.typography.lineHeights.relaxed,
    },
    body2: {
      fontSize: designSystem.typography.fontSizes.sm,
      fontWeight: designSystem.typography.fontWeights.normal,
      lineHeight: designSystem.typography.lineHeights.normal,
    },
    subtitle1: {
      fontSize: designSystem.typography.fontSizes.base,
      fontWeight: designSystem.typography.fontWeights.medium,
      lineHeight: designSystem.typography.lineHeights.normal,
    },
    subtitle2: {
      fontSize: designSystem.typography.fontSizes.sm,
      fontWeight: designSystem.typography.fontWeights.medium,
      lineHeight: designSystem.typography.lineHeights.normal,
    },
    caption: {
      fontSize: designSystem.typography.fontSizes.xs,
      fontWeight: designSystem.typography.fontWeights.normal,
      lineHeight: designSystem.typography.lineHeights.normal,
    },
    overline: {
      fontSize: designSystem.typography.fontSizes.xs,
      fontWeight: designSystem.typography.fontWeights.medium,
      lineHeight: designSystem.typography.lineHeights.normal,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
    },
    button: {
      fontSize: designSystem.typography.fontSizes.sm,
      fontWeight: designSystem.typography.fontWeights.semibold,
      lineHeight: designSystem.typography.lineHeights.normal,
      textTransform: "none",
    },
  },

  shape: {
    borderRadius:
      parseInt(designSystem.borderRadius.md.replace("rem", "")) * 16, // Convert rem to px
  },

  spacing: (factor) => {
    const baseSpacing = 8; // 8px base
    return `${baseSpacing * factor}px`;
  },

  breakpoints: {
    values: {
      xs: parseInt(designSystem.breakpoints.xs),
      sm: parseInt(designSystem.breakpoints.sm),
      md: parseInt(designSystem.breakpoints.md),
      lg: parseInt(designSystem.breakpoints.lg),
      xl: parseInt(designSystem.breakpoints.xl),
    },
  },

  shadows: [
    "none",
    designSystem.shadows.sm,
    designSystem.shadows.base,
    designSystem.shadows.md,
    designSystem.shadows.lg,
    designSystem.shadows.xl,
    designSystem.shadows.xxl,
    // Additional shadow levels for Material-UI
    "0 7px 14px rgba(0, 0, 0, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08)",
    "0 8px 16px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)",
    "0 9px 18px rgba(0, 0, 0, 0.12), 0 5px 10px rgba(0, 0, 0, 0.08)",
    "0 10px 20px rgba(0, 0, 0, 0.12), 0 6px 12px rgba(0, 0, 0, 0.08)",
    "0 11px 22px rgba(0, 0, 0, 0.12), 0 7px 14px rgba(0, 0, 0, 0.08)",
    "0 12px 24px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08)",
    "0 13px 26px rgba(0, 0, 0, 0.12), 0 9px 18px rgba(0, 0, 0, 0.08)",
    "0 14px 28px rgba(0, 0, 0, 0.12), 0 10px 20px rgba(0, 0, 0, 0.08)",
    "0 15px 30px rgba(0, 0, 0, 0.12), 0 11px 22px rgba(0, 0, 0, 0.08)",
    "0 16px 32px rgba(0, 0, 0, 0.12), 0 12px 24px rgba(0, 0, 0, 0.08)",
    "0 17px 34px rgba(0, 0, 0, 0.12), 0 13px 26px rgba(0, 0, 0, 0.08)",
    "0 18px 36px rgba(0, 0, 0, 0.12), 0 14px 28px rgba(0, 0, 0, 0.08)",
    "0 19px 38px rgba(0, 0, 0, 0.12), 0 15px 30px rgba(0, 0, 0, 0.08)",
    "0 20px 40px rgba(0, 0, 0, 0.12), 0 16px 32px rgba(0, 0, 0, 0.08)",
    "0 21px 42px rgba(0, 0, 0, 0.12), 0 17px 34px rgba(0, 0, 0, 0.08)",
    "0 22px 44px rgba(0, 0, 0, 0.12), 0 18px 36px rgba(0, 0, 0, 0.08)",
    "0 23px 46px rgba(0, 0, 0, 0.12), 0 19px 38px rgba(0, 0, 0, 0.08)",
    "0 24px 48px rgba(0, 0, 0, 0.12), 0 20px 40px rgba(0, 0, 0, 0.08)",
  ],

  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
    },
  },

  components: {
    // Button Component Overrides
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: designSystem.borderRadius.md,
          textTransform: "none",
          fontWeight: designSystem.typography.fontWeights.semibold,
          fontSize: designSystem.typography.fontSizes.sm,
          padding: "10px 24px",
          transition: designSystem.transitions.normal,
          boxShadow: "none",
          "&:hover": {
            boxShadow: designSystem.shadows.md,
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        },
        containedPrimary: {
          background: designSystem.colors.background.primaryGradient,
          color: "white",
          "&:hover": {
            background: designSystem.colors.background.primaryGradient,
            opacity: 0.9,
          },
        },
        containedSecondary: {
          background: designSystem.colors.background.secondaryGradient,
          color: "white",
          "&:hover": {
            background: designSystem.colors.background.secondaryGradient,
            opacity: 0.9,
          },
        },
      },
    },

    // Card Component Overrides
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: designSystem.borderRadius.lg,
          boxShadow: designSystem.shadows.base,
          border: `1px solid ${designSystem.colors.grey[200]}`,
          transition: designSystem.transitions.normal,
          "&:hover": {
            boxShadow: designSystem.shadows.lg,
          },
        },
      },
    },

    // Paper Component Overrides
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: designSystem.borderRadius.lg,
        },
        elevation1: {
          boxShadow: designSystem.shadows.sm,
        },
        elevation2: {
          boxShadow: designSystem.shadows.base,
        },
        elevation3: {
          boxShadow: designSystem.shadows.md,
        },
        elevation4: {
          boxShadow: designSystem.shadows.lg,
        },
      },
    },

    // TextField Component Overrides
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: designSystem.borderRadius.md,
            transition: designSystem.transitions.normal,
            "&:hover": {
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: designSystem.colors.primary[400],
              },
            },
            "&.Mui-focused": {
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: designSystem.colors.primary.main,
                borderWidth: "2px",
              },
            },
          },
          "& .MuiInputLabel-root": {
            fontWeight: designSystem.typography.fontWeights.medium,
          },
        },
      },
    },

    // Chip Component Overrides
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: designSystem.borderRadius.xl,
          fontWeight: designSystem.typography.fontWeights.medium,
        },
        colorPrimary: {
          background: designSystem.colors.primary[100],
          color: designSystem.colors.primary[800],
        },
        colorSecondary: {
          background: designSystem.colors.secondary[100],
          color: designSystem.colors.secondary[800],
        },
      },
    },

    // Alert Component Overrides
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: designSystem.borderRadius.md,
          fontWeight: designSystem.typography.fontWeights.medium,
        },
        standardSuccess: {
          backgroundColor: designSystem.colors.success[50],
          color: designSystem.colors.success[800],
          border: `1px solid ${designSystem.colors.success[200]}`,
        },
        standardError: {
          backgroundColor: designSystem.colors.error[50],
          color: designSystem.colors.error[800],
          border: `1px solid ${designSystem.colors.error[200]}`,
        },
        standardWarning: {
          backgroundColor: designSystem.colors.warning[50],
          color: designSystem.colors.warning[800],
          border: `1px solid ${designSystem.colors.warning[200]}`,
        },
        standardInfo: {
          backgroundColor: designSystem.colors.info[50],
          color: designSystem.colors.info[800],
          border: `1px solid ${designSystem.colors.info[200]}`,
        },
      },
    },

    // Table Component Overrides
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: designSystem.borderRadius.lg,
          border: `1px solid ${designSystem.colors.grey[200]}`,
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: designSystem.colors.grey[50],
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: designSystem.typography.fontWeights.semibold,
          fontSize: designSystem.typography.fontSizes.sm,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: designSystem.colors.text.primary,
        },
        body: {
          fontSize: designSystem.typography.fontSizes.sm,
        },
      },
    },

    // Dialog Component Overrides
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: designSystem.borderRadius.lg,
        },
      },
    },

    // AppBar Component Overrides
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: designSystem.shadows.base,
        },
      },
    },
  },
});

export default muiTheme;
