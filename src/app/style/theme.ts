import { PaletteMode, ThemeOptions } from "@mui/material";

export const getTheme = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
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
  },
});