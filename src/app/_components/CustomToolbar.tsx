import { Badge, Button, Stack } from "@mui/material";
import {
    GridToolbarColumnsButton,
    GridToolbarContainer,
    GridToolbarDensitySelector,
    GridToolbarFilterButton,
    GridToolbarProps,
} from "@mui/x-data-grid";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import DoneAllOutlinedIcon from "@mui/icons-material/DoneAllOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";

export interface CustomToolbarProps {
  activeFilterCount?: number;
  selectedCount?: number;
  rowCount?: number;
  allFilteredSelected?: boolean;
  filterLabel?: string;
  selectAllFilteredLabel?: string;
  clearSelectionLabel?: string;
  bulkAdjudicateLabel?: string;
  onOpenFilters?: () => void;
  onSelectAllFiltered?: () => void;
  onClearSelection?: () => void;
  onBulkAdjudicate?: () => void;
}

declare module "@mui/x-data-grid" {
  interface ToolbarPropsOverrides extends CustomToolbarProps {}
}

export default function CustomToolbar({
  activeFilterCount = 0,
  selectedCount = 0,
  rowCount = 0,
  allFilteredSelected = false,
  filterLabel = "Filters",
  selectAllFilteredLabel = "Select all filtered",
  clearSelectionLabel = "Clear selection",
  bulkAdjudicateLabel = "Bulk adjudicate",
  onOpenFilters,
  onSelectAllFiltered,
  onClearSelection,
  onBulkAdjudicate,
}: GridToolbarProps & CustomToolbarProps) {
  return (
    <GridToolbarContainer
      sx={{
        display: "flex",
        justifyContent: "space-between",
        paddingInline: "1em"
      }}
    >
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        <GridToolbarColumnsButton />
        {onOpenFilters ? (
          <Button size="small" startIcon={<Badge color="primary" badgeContent={activeFilterCount}><FilterAltOutlinedIcon fontSize="small" /></Badge>} onClick={onOpenFilters}>
            {filterLabel}
          </Button>
        ) : <GridToolbarFilterButton />}
        <GridToolbarDensitySelector/>
      </Stack>
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        {selectedCount > 0 && <Button size="small" onClick={onClearSelection}>{clearSelectionLabel}</Button>}
        {rowCount > 0 && !allFilteredSelected && (
          <Button size="small" startIcon={<DoneAllOutlinedIcon />} onClick={onSelectAllFiltered}>{selectAllFilteredLabel}</Button>
        )}
        {selectedCount > 0 && (
          <Button size="small" color="success" startIcon={<GavelOutlinedIcon />} onClick={onBulkAdjudicate}>{bulkAdjudicateLabel}</Button>
        )}
      </Stack>
    </GridToolbarContainer>
  );
}
