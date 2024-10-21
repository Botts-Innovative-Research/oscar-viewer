import { IconButton, styled } from "@mui/material";


export const StyledIconButton = styled(
    IconButton,
    { shouldForwardProp: (propName: string) => !propName.startsWith('$') }
)<{ $alwaysVisible: boolean; $fullHeightHover: boolean }>(({ $alwaysVisible }) => ({
    margin: "0 10px",
    position: "relative",
    backgroundColor: "#494949",
    top: "calc(50% - 20px) !important",
    color: "white",
    fontSize: "10px",
    transition: "200ms",
    cursor: "pointer",
    opacity: $alwaysVisible ? '1' : '0',
    '&:hover': {
        opacity: "0.6 !important",
    },
}));

export const StyledButtonWrapper = styled(
    "div",
    { shouldForwardProp: (propName: string) => !propName.startsWith('$') }
)<{ $next: boolean; $prev: boolean; $fullHeightHover: boolean }>(({ $next, $prev, $fullHeightHover }) => ({
    position: "absolute",
    height: "80px",
    backgroundColor: "transparent",
    zIndex: 1,
    top: "calc(50% - 70px)",
    '&:hover': {
        '& button': {
            backgroundColor: "black",
            filter: "brightness(120%)",
            opacity: "0.4"
        }
    },
    ...($fullHeightHover ? {
        height: "100%",
        top: "0"
    } : undefined),
    ...($next ? { right: 0 } : undefined),
    ...($prev ? { left: 0 } : undefined),
}));
