import { PaletteMode, ThemeOptions } from "@mui/material";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import '@mui/material/Paper';

// When using TypeScript 4.x and above
import type {} from "@mui/x-data-grid/themeAugmentation";

declare module "@mui/material/styles" {
  interface Palette {
    errorHighlight: string;
    secondaryHighlight: string;
    infoHighlight: string;
    successHighlight: string;
    faultHighlight: string;
  }
  interface PaletteOptions {
    errorHighlight: string;
    secondaryHighlight: string;
    infoHighlight: string;
    successHighlight: string;
    faultHighlight: string;
  }
}
declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    dynamic: true;
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
      faultHighlight: "#ED6C024D",
    },
    typography: {},
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
        // Tables live inside resizable widget cells, where the standard 56px
        // headers / 52px rows leave room for only a handful of rows. Compact
        // roughly doubles the visible count; the grid's own density selector
        // still lets users switch back.
        defaultProps: {
          density: "compact",
        },
        styleOverrides: {
          root: {},
          // Default is a fixed 52px for what is one line of pagination text.
          // The inner TablePagination toolbar carries its own 52px, so shrinking
          // the container alone leaves the height unchanged.
          footerContainer: {
            minHeight: 38,
            "& .MuiTablePagination-toolbar": {
              minHeight: 38,
            },
            // Full-size icon buttons (40px) would otherwise set the height.
            "& .MuiTablePagination-actions .MuiIconButton-root": {
              padding: 4,
            },
            // These are <p> elements: the default 14px block margins turn one
            // 20px line of text into a 48px row, which set the footer height.
            "& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel": {
              margin: 0,
            },
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
