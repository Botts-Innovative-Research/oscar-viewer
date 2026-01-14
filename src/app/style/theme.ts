import { PaletteMode, ThemeOptions } from "@mui/material";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";

// When using TypeScript 4.x and above
import type {} from "@mui/x-data-grid/themeAugmentation";

declare module "@mui/material/styles" {
  interface Palette {
    errorHighlight: string;
    secondaryHighlight: string;
    infoHighlight: string;
    successHighlight: string;
  }
  interface PaletteOptions {
    errorHighlight: string;
    secondaryHighlight: string;
    infoHighlight: string;
    successHighlight: string;
  }
}

export const getTheme = (mode: PaletteMode) => {
  let theme = createTheme({
    breakpoints: {
      values: {
        xs: 0, // Phones
        sm: 600,
        md: 900, // Tablets
        lg: 1200, // Small laptops
        xl: 1536,
      },
    },
    palette: {
      mode,
      errorHighlight: "#D32F2F4D",
      secondaryHighlight: "#9C27B04D",
      infoHighlight: "#2196F34D",
      successHighlight: "#C1D8C2",
    },
    typography: {},
    components: {
      MuiPaper: {
        styleOverrides: {
          root: ({ ownerState }) => ({
            ...(ownerState.variant === "outlined" && {
              borderRadius: "10px",
            }),
          }),
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ ownerState }) => ({
            borderRadius: "10px",
          }),
        },
      },
      MuiButton: {
        styleOverrides: {
          root: ({ ownerState }) => ({
            borderRadius: "10px",
          }),
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {},
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: ({ ownerState }) => ({
            "& .MuiInputBase-root": {
              borderRadius: "10px",
            },
          }),
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: ({ ownerState }) => ({
            ...(ownerState.variant === "outlined" && {
              borderRadius: "10px",
            }),
          }),
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: ({ ownerState }) => ({
            ...(ownerState.type === "file" && {
              color: "transparent",
              position: "absolute",
              "& ::file-selector-button": {
                display: "none",
              },
            }),
          }),
        },
      },
    },
  });

  theme = responsiveFontSizes(theme);
  return theme;
};
