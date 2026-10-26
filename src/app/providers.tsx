"use client";

import {
  Box,
  ThemeProvider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {createContext, ReactNode, Suspense, useContext, useEffect, useMemo, useState} from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { getTheme } from "@/app/style/theme";
import "@/app/style/global.css";
import SuspenseLoad from "./_components/SuspenseLoad";
import {LanguageProvider} from "@/app/contexts/LanguageContext";

export type ThemePreference = "system" | "light" | "dark";

interface ThemePreferenceContextValue {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | undefined>(undefined);
const THEME_PREFERENCE_STORAGE_KEY = "oscar-theme-preference";

export const useThemePreference = () => {
  const context = useContext(ThemePreferenceContext);

  if (!context) {
    throw new Error("useThemePreference must be used within Providers");
  }

  return context;
};

export default function Providers({ children }: { children: ReactNode }) {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    const savedPreference = localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);

    if (savedPreference === "system" || savedPreference === "light" || savedPreference === "dark") {
      setThemePreferenceState(savedPreference);
    }
  }, []);

  const setThemePreference = (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
  };

  const resolvedMode = themePreference === "system"
    ? (prefersDarkMode ? "dark" : "light")
    : themePreference;

  const theme = useMemo(
    () => getTheme(resolvedMode),
    [resolvedMode]
  );

  return (
    <Suspense fallback={<SuspenseLoad fullPage={false} />}>
      <LanguageProvider>
        <ThemeProvider theme={theme}>
          <ThemePreferenceContext.Provider value={{themePreference, setThemePreference}}>
            <Box sx={{backgroundColor: "background.default"}}>
              <CssBaseline />
              {children}
            </Box>
          </ThemePreferenceContext.Provider>
        </ThemeProvider>
      </LanguageProvider>
    </Suspense>
  );
}

// Handle breakpoints for desktop vs. tablets vs. mobile displays
export const useBreakpoint = () => {
  const theme = useTheme();

  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const isTablet = useMediaQuery(theme.breakpoints.up("md"));
  const isSmallTablet = useMediaQuery(theme.breakpoints.up("sm"))

  const size = isDesktop ? "desktop" : isTablet ? "tablet" : isSmallTablet ? "smallTablet" : "mobile"

  return {
    size,
    isMobile: size === "mobile",
    isSmallTablet: size === "smallTablet",
    isTablet: size === "tablet",
    isDesktop: size === "desktop",
  };
}
