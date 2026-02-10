"use client";

import { Box, ThemeProvider, createTheme, useMediaQuery } from "@mui/material";
import {ReactNode, Suspense, useMemo} from "react";
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme } from "@/app/style/theme";
import "@/app/style/global.css"
import SuspenseLoad from "./_components/SuspenseLoad";
import {LanguageProvider} from "@/app/contexts/LanguageContext";

export default function Providers({ children }: { children: ReactNode }) {

  // Get system preference for dark/light mode
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  // Implement custom theme based on system preference
  const theme = useMemo(
    () => createTheme(getTheme(prefersDarkMode ? "dark" : "light")),
    [prefersDarkMode],
  );

  return (
    <Suspense fallback={<SuspenseLoad />}>
      <LanguageProvider>
          <ThemeProvider theme={theme}>
            <Box sx={{backgroundColor: "background.default"}}>
              <CssBaseline />
              {children}
            </Box>
          </ThemeProvider>
      </LanguageProvider>
    </Suspense>
  );
}