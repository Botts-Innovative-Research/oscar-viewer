"use client";

import {
  Box,
  ThemeProvider,
  createTheme,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { ReactNode, Suspense, useMemo } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { getTheme } from "@/app/style/theme";
import "@/app/style/global.css";
import SuspenseLoad from "./_components/SuspenseLoad";

export default function Providers({ children }: { children: ReactNode }) {
  // Get system preference for dark/light mode
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  // Implement custom theme based on system preference
  const theme = useMemo(
    () => createTheme(getTheme(prefersDarkMode ? "dark" : "light")),
    [prefersDarkMode]
  );

  return (
    <Suspense fallback={<SuspenseLoad />}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Suspense>
  );
}

// Handle breakpoints for desktop vs. tablets vs. mobile displays
export const useBreakpoint = () => {
  const theme = useTheme();

  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const isTablet = useMediaQuery(theme.breakpoints.up("md"));

  const size = isDesktop ? "desktop" : isTablet ? "tablet" : "mobile"

  return {
    size,
    isMobile: size === "mobile",
    isTablet: size === "tablet",
    isDesktop: size === "desktop",
  };
}
