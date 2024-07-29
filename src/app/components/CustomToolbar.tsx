import { Box, Stack, Typography } from "@mui/material";
import { GridToolbarColumnsButton, GridToolbarContainer, GridToolbarDensitySelector, GridToolbarFilterButton } from "@mui/x-data-grid";

export default function CustomToolbar() {
  return (
    <GridToolbarContainer
      sx={{
        display: "flex",
        justifyContent: "space-between",
        paddingInline: "1em"
      }}
    >
      <Typography variant="h6">Alarms</Typography>
      <Stack direction={"row"}>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector/>
      </Stack>
    </GridToolbarContainer>
  );
}