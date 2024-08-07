"use client";

import { Box, IconButton } from '@mui/material';
import { DataGrid, GridCellParams, GridColDef, GridRenderCellParams, gridClasses } from '@mui/x-data-grid';
import CustomToolbar from '../components/CustomToolbar';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import { EventTableData } from 'types/new-types';

const columns: GridColDef<(typeof rows)[number]>[] = [
  { 
    field: 'secondaryInspection',
    headerName: 'Secondary Inspection',
    type: 'boolean',
  },
  { 
    field: 'laneId',
    headerName: 'Lane ID',
    type: 'string',
  }, 
  { 
    field: 'occupancyId',
    headerName: 'Occupancy ID',
    type: 'string',
  }, 
  { 
    field: 'startTime',
    headerName: 'Start Time',
    type: 'string',
  }, 
  { 
    field: 'endTime',
    headerName: 'End Time',
    type: 'string',
  }, 
  { 
    field: 'maxGamma',
    headerName: 'Max Gamma',
    valueFormatter: (value) => {
      // Append units to number value, or return 'N/A'
      return typeof value === 'number' ? `${value} cps` : 'N/A';
    },
  }, 
  { 
    field: 'maxNeutron',
    headerName: 'Max Neutron',
    valueFormatter: (value) => {
      // Append units to number value, or return 'N/A'
      return typeof value === 'number' ? `${value} cps` : 'N/A';
    },  }, 
  { 
    field: 'status',
    headerName: 'Status',
    type: 'string',
  }, 
  { 
    field: 'menu',
    headerName: '',
    renderCell: (params: GridRenderCellParams<any, Date>) => (
      <IconButton
        aria-label="menu"
      >
        <MoreVertRoundedIcon fontSize="inherit" />
      </IconButton>
    ),
  }, 
];

const rows: EventTableData[] = [
  { id: '1', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, status: 'Gamma' },
  { id: '2', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxNeutron: 25642, status: 'Neutron' },
  { id: '3', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, maxNeutron: 29482, status: 'Gamma & Neutron' },
  { id: '4', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, status: 'Gamma' },
];

export default function EventTable(props: {
  //onSelectedRow: (startTime: string, endTime: string) => void,
  viewSecondary?: boolean,  // Show 'Secondary Inspection' column
  viewMenu?: boolean, // Show three-dot menu button
  viewLane?: boolean, // Show 'View Lane' option in menu
  data?: EventTableData[],
}) {
  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 20,
            },
          },
          columns: {
            columnVisibilityModel: {
              secondaryInspection: props.viewSecondary,
              menu: props.viewMenu,
            }
          },
        }}
        pageSizeOptions={[20]}
        slots={{ toolbar: CustomToolbar }}
        autosizeOnMount
        autosizeOptions={{
          expand: true,
          includeOutliers: true,
          includeHeaders: false,
        }}
        getCellClassName={(params: GridCellParams<any, any, string>) => {
          if (params.value === "Gamma")
            return "highlightGamma";
          else if (params.value === "Neutron")
            return "highlightNeutron";
          else if (params.value === "Gamma & Neutron")
            return "highlightGammaNeutron";
          else
            return "";
        }}
        sx={{
          [`.${gridClasses.cell}.highlightGamma`]: {
            backgroundColor: "error.main",
            color: "error.contrastText",
          },
          [`.${gridClasses.cell}.highlightNeutron`]: {
            backgroundColor: "info.main",
            color: "info.contrastText",
          },
          [`.${gridClasses.cell}.highlightGammaNeutron`]: {
            backgroundColor: "secondary.main",
            color: "secondary.contrastText",
          },
        }}
      />
    </Box>
  );
}