import { PaletteMode, ThemeOptions } from "@mui/material";
// When using TypeScript 4.x and above
import type {} from '@mui/x-data-grid/themeAugmentation';

declare module "@mui/material/styles" {
  interface Palette {
    errorHighlight: string;
    secondaryHighlight: string;
    infoHighlight: string;
  }
  interface PaletteOptions {
    errorHighlight: string;
    secondaryHighlight: string;
    infoHighlight: string;
  }
}

export const getTheme = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    errorHighlight: "#D32F2F4D",
    secondaryHighlight: "#9C27B04D",
    infoHighlight: "#2196F34D",
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
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: "10px",
        }),
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
        },
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
              display: 'none',
            },
          }),
        }),
      },
    },
  },
});