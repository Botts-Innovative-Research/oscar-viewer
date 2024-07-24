import { PaletteMode, ThemeOptions } from "@mui/material";

export const getTheme = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    // ...(mode === "light"
    //   ? {
    //     background: {
    //       default: "#FFFFFF",
    //     },
    //   } : {
    //     background: {
    //       default: "#000000",
    //     },
    //   }),
  },
  typography: {},
  components: {},
});