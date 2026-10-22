import { PaletteMode, ThemeOptions } from "@mui/material";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import '@mui/material/Paper';

// When using TypeScript 4.x and above
import type {} from "@mui/x-data-grid/themeAugmentation";

type StatusName = "alarm" | "fault" | "tamper" | "online" | "offline" | "scan" | "background";

type StatusToken = {
    main: string;
    contrastText: string;
    container: string;
    onContainer: string;
};

type AppTokens = {
    radius: {
        sm: number;
        md: number;
        lg: number;
    };
    size: {
        controlHeight: number;
        touchTarget: number;
        appBarHeight: number;
    }
};


declare module "@mui/material/styles" {
    interface Palette {
        status: Record<StatusName, StatusToken>;
        surface: {
            page: string;
            panel: string;
            raised: string;
        };
        border: {
            subtle: string;
            strong: string;
        };
        focus: {
            ring: string;
        };
        content: {
            inverse: string;
        };
    }
    interface PaletteOptions {
        status?: Record<StatusName, StatusToken>;
        surface?: Palette["surface"];
        border?: Palette["border"];
        focus?: Palette["focus"];
        content?: Palette["content"];
    }

    interface Theme {
        tokens: AppTokens;
    }

    interface ThemeOptions {
        tokens?: AppTokens;
    }
}

export const getTheme = (mode: PaletteMode) => {
    const isDark = mode == 'dark';

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
            background: {
                default: isDark ? "#101318" : "#FFFFFF",
                paper: isDark ? "#191E26" : "#FFFFFF",
            },
            text: {
                primary: isDark ? "#F3F6FA" : "#17202A",
                secondary: isDark ? "#B7C1CE" : "#5A6675",
            },
            surface: {
                page: isDark ? "#101318" : "#F7F9FC",
                panel: isDark ? "#191E26" : "#FFFFFF",
                raised: isDark ? "#222A35" : "#FFFFFF",
            },
            border: {
                subtle: isDark ? "#303A47" : "#D9E0E8",
                strong: isDark ? "#4B5868" : "#AAB6C4",
            },
            focus: {
                ring: "#1976D2",
            },
            content: {
                inverse: "#FFFFFF",
            },
            status: {
                alarm: {
                    main: "#d32f2f",
                    contrastText: "#FFFFFF",
                    container: isDark ? "#c62828" : "#ef5350",
                    onContainer: isDark ? "#FFB4AB" : "#7A1B15",
                },
                fault: {
                    main: "#0288d1",
                    contrastText: "#FFFFFF",
                    container: isDark ? "#01579b" : "#03a9f4",
                    onContainer: isDark ? "#98e2ff" : "#1d4fa5",
                },
                tamper: {
                    main: "#7A2E8E",
                    contrastText: "#FFFFFF",
                    container: isDark ? "#4C1F59" : "#F8E9FC",
                    onContainer: isDark ? "#F3C4FC" : "#592067",
                },
                online: {
                    main: "#2e7d32",
                    contrastText: "#FFFFFF",
                    container: isDark ? "#1b5e20" : "#4caf50",
                    onContainer: isDark ? "#9BE8BA" : "#0B5732",
                },
                offline: {
                    main: "#667085",
                    contrastText: "#FFFFFF",
                    container: isDark ? "#343B45" : "#EEF1F4",
                    onContainer: isDark ? "#D0D5DD" : "#344054",
                },
                scan: {
                    main: "#667085",
                    contrastText: "#FFFFFF",
                    container: isDark ? "#343B45" : "#EEF1F4",
                    onContainer: isDark ? "#D0D5DD" : "#344054",
                },
                background: {
                    main: "#667085",
                    contrastText: "#FFFFFF",
                    container: isDark ? "#343B45" : "#EEF1F4",
                    onContainer: isDark ? "#D0D5DD" : "#344054",
                }
            },
        },
        tokens: {
            radius: { sm: 6, md: 10, lg: 16 },
            size: { controlHeight: 40, touchTarget: 44, appBarHeight: 64 },
        },
        shape: {
            borderRadius: 10,
        },
        typography: {
            fontFamily: "Roboto, Arial, sans-serif",
            h1: {
                fontWeight: 700,
                fontSize: '2.5rem',
                letterSpacing: '-0.015em'
            },
            h4: {
                fontWeight: 400,
                letterSpacing: "-0.02em"
            },
            h6: {
                fontWeight: 400
            },
            button: {
                textTransform: "none"
            },
        },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: ({ ownerState, theme }) => ({
                        ...(ownerState.variant === "outlined" && {
                            borderRadius: "10px",
                            flexGrow: 1,
                            padding: theme.spacing(2),
                            overflow: "hidden",
                        }),
                    }),
                },
                variants: [{
                    props: { variant: "dynamic" },
                    style: ({ theme }) => ({
                        flexGrow: 1,
                        overflow: "hidden",
                    })
                }],
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
}

declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    dynamic: true;
  }
}
