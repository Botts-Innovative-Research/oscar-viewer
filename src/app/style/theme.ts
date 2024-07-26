import { PaletteMode, ThemeOptions } from "@mui/material";

declare module "@mui/material/styles" {
  interface Palette {
    errorHighlight: string;
    secondaryHighlight: string;
  }
  interface PaletteOptions {
    errorHighlight: string;
    secondaryHighlight: string;
  }
}

export const getTheme = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    errorHighlight: "#D32F2F4D",
    secondaryHighlight: "#9C27B04D",
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
  },
});