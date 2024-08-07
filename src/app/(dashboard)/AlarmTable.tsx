"use client";

import { Box, IconButton } from '@mui/material';
import { DataGrid, GridCellParams, GridColDef, GridRenderCellParams, gridClasses } from '@mui/x-data-grid';
import CustomToolbar from '../components/CustomToolbar';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';

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
    type: 'string',
  }, 
  { 
    field: 'maxNeutron',
    headerName: 'Max Neutron',
    type: 'string',
  }, 
  { 
    field: 'status',
    headerName: 'Status',
    type: 'string',
  }, 
  { 
    field: 'details',
    headerName: '',
    renderCell: (params: GridRenderCellParams<any, Date>) => (
      <IconButton
        aria-label="details"
      >
        <MoreVertRoundedIcon fontSize="inherit" />
      </IconButton>
    ),
  }, 
];

const rows = [
  { id: 1, secondaryInspection: 'false', laneId: 1, occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: '25642 cps', maxNeutron: 'N/A', status: 'Gamma' },
  { id: 2, secondaryInspection: 'false', laneId: 1, occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: '25642 cps', maxNeutron: 'N/A', status: 'Neutron' },
  { id: 3, secondaryInspection: 'false', laneId: 1, occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: '25642 cps', maxNeutron: 'N/A', status: 'Gamma & Neutron' },
  { id: 4, secondaryInspection: 'false', laneId: 1, occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: '25642 cps', maxNeutron: 'N/A', status: 'Gamma' },
  { id: 5, secondaryInspection: 'false', laneId: 1, occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: '25642 cps', maxNeutron: 'N/A', status: 'Gamma' },
  { id: 6, secondaryInspection: 'false', laneId: 1, occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: '25642 cps', maxNeutron: 'N/A', status: 'Gamma' },
  { id: 7, secondaryInspection: 'false', laneId: 1, occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: '25642 cps', maxNeutron: 'N/A', status: 'Gamma' },
  { id: 8, secondaryInspection: 'false', laneId: 1, occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: '25642 cps', maxNeutron: 'N/A', status: 'Gamma' },
  { id: 9, secondaryInspection: 'false', laneId: 1, occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: '25642 cps', maxNeutron: 'N/A', status: 'Gamma' },
];

export default function AlarmTable() {
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
        }}
        pageSizeOptions={[20]}
        disableRowSelectionOnClick
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