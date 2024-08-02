"use client";

import { ThemeProvider, createTheme, useMediaQuery } from "@mui/material";
import { ReactNode, useMemo } from "react";
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme } from "@/app/style/theme";
import "@/app/style/global.css"
import { Provider } from "react-redux";
import { appStore } from "@/state/Store";

export default function Providers({ children }: { children: ReactNode }) {

  // Get system preference for dark/light mode
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  // Implement custom theme based on system preference
  const theme = useMemo(
    () => createTheme(getTheme(prefersDarkMode ? "dark" : "light")),
    [prefersDarkMode],
  );

  return (
    <Provider store={appStore}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Provider>
  );
}