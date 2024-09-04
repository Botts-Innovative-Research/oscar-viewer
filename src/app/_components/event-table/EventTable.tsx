"use client";

import { Box } from '@mui/material';
import { DataGrid, GridActionsCellItem, GridCellParams, GridColDef, gridClasses } from '@mui/x-data-grid';
import CustomToolbar from '../CustomToolbar';
import { EventTableData, SelectedEvent } from 'types/new-types';
import { useState } from 'react';

import NotesRoundedIcon from '@mui/icons-material/NotesRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import {colorCodes} from "@/app/_components/AdjudicationSelect";


export default function EventTable(props: {
  onRowSelect?: (event: SelectedEvent) => void, // Return start/end time to parent
  viewSecondary?: boolean,  // Show 'Secondary Inspection' column, default FALSE
  viewMenu?: boolean, // Show three-dot menu button, default FALSE
  viewLane?: boolean, // Show 'View Lane' option in menu, default FALSE
  viewAdjudicated?: boolean, //shows Adjudicated status in the event log , not shown in the alarm table
  data: EventTableData[],  // Table data
}) {
  const onRowSelect = props.onRowSelect;
  const viewAdjudicated = props.viewAdjudicated || false;
  const viewSecondary = props.viewSecondary || false;
  const viewMenu = props.viewMenu || false;
  const viewLane = props.viewLane || false;
  const data = props.data;
  const [selectionModel, setSelectionModel] = useState([]); // Currently selected row


  // Column definition for EventTable
  const columns: GridColDef<EventTableData>[] = [
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
      headerName: 'Max Gamma (cps)',
      valueFormatter: (value) => {
        // Append units to number value, or return 'N/A'
        return typeof value === 'number' ? value : 'N/A';
      },
    },
    {
      field: 'maxNeutron',
      headerName: 'Max Neutron (cps)',
      valueFormatter: (value) => {
        // Append units to number value, or return 'N/A'
        return typeof value === 'number' ? value : 'N/A';
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      type: 'string',
    },
    {
      field: 'adjudicatedCode',
      headerName: 'Adjudicated',
      valueFormatter: (value) => {
        const adjCode = {
          1: 'Code 1: Contraband Found',
          2: 'Code 2: Other',
          3: 'Code 3: Medical Isotope Found',
          4: 'Code 4: NORM Found',
          5: 'Code 5: Declared Shipment of Radioactive Material',
          6: 'Code 6: Physical Inspection Negative',
          7: 'Code 7: RIID/ASP Indicates Background Only',
          8: 'Code 8: Other',
          9: 'Code 9: Authorized Test, Maintenance, or Training Activity',
          10: 'Code 10: Unauthorized Activity',
          11: 'Code 11: Other'
        };
        return typeof value === 'number' ? adjCode[value] : 'None';
      }
    },
    {
      field: 'Menu',
      headerName: '',
      type: 'actions',
      maxWidth: 50,
      getActions: (params) => [
        <GridActionsCellItem
            icon={<NotesRoundedIcon />}
            label="Details"
            onClick={() => console.log(params.id)}
            showInMenu
        />,
        (viewLane ?
                <GridActionsCellItem
                    icon={<VisibilityRoundedIcon />}
                    label="View Lane"
                    onClick={() => console.log(params.id)}
                    showInMenu
                />
                : <></>
        ),
      ],
    },
  ];

  // Manage list of columns in toggle menu
  const getColumnList = () => {
    const excludeFields: string[] = [];
    // Exclude fields based on component parameters
    if (!viewSecondary) excludeFields.push('secondaryInspection');
    if (!viewMenu) excludeFields.push('Menu');
    if(!viewAdjudicated) excludeFields.push('adjudicatedCode');

    return columns
        .filter((column) => !excludeFields.includes(column.field))
        .map((column) => column.field);
  }

  // Handle currently selected row
  const handleRowSelection = (selection: any[]) => {
    const selectedId = selection[0]; // Get the first selected ID

    if (selectionModel[0] === selectedId) {
      // If the same row is selected, clear the selection
      setSelectionModel([]);
      if (onRowSelect) {
        onRowSelect(null); // Return an empty object when deselected
      }
    } else {
      // Otherwise, set the new selection
      setSelectionModel([selectedId]);

      // Find the selected row's data
      const selectedRow = data.find((row) => row.id === selectedId);
      if (selectedRow && onRowSelect) {
        onRowSelect({
          startTime: selectedRow.startTime.toString(),
          endTime: selectedRow.endTime.toString()
        }); // Return start and end time to parent function
      }
    }
  };

  return (
      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
            rows={data}
            columns={columns}
            onRowSelectionModelChange={handleRowSelection}
            rowSelectionModel={selectionModel}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 20,
                },
              },
              columns: {
                // Manage visible columns in table based on component parameters
                columnVisibilityModel: {
                  secondaryInspection: viewSecondary,
                  adjudicatedCode: viewAdjudicated,
                  Menu: viewMenu,
                }
              },
            }}
            pageSizeOptions={[20]}
            slots={{ toolbar: CustomToolbar }}
            slotProps={{
              columnsManagement: {
                getTogglableColumns: getColumnList,
              }
            }}
            autosizeOnMount
            autosizeOptions={{
              expand: true,
              includeOutliers: true,
              includeHeaders: false,
            }}
            getCellClassName={(params: GridCellParams<any, any, string>) => {
              // Assign className for styling to 'Status' column based on value
              if (params.value === "Gamma")
                return "highlightGamma";
              else if (params.value === "Neutron")
                return "highlightNeutron";
              else if (params.value === "Gamma & Neutron")
                return "highlightGammaNeutron";
              else if (params.formattedValue === 'Code 1: Contraband Found'|| params.formattedValue === 'Code 2: Other' || params.formattedValue === 'Code 3: Medical Isotope Found')
                return "highlightReal";
              else if (params.formattedValue === 'Code 4: Norm Found'|| params.formattedValue === 'Code 5: Declared Shipment of Radioactive Material' || params.formattedValue === 'Code 6: Physical Inspection Negative')
                return "highlightInnocent";
              else if (params.formattedValue === 'Code 7: RIID/ASP Indicates Background Only'|| params.formattedValue === 'Code 8: Other' || params.formattedValue === 'Code 9: Authorized Test, Maintenance, or Training Activity')
                return "highlightFalse";
              else if (params.formattedValue === 'Code 10: Unauthorized Activity' || params.formattedValue === 'Code 11: Other')
                return "highlightOther";
              else
                return '';


            }}
            sx={{
              // Assign styling to 'Status' column based on className
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

              [`.${gridClasses.cell}.highlightReal`]: {
                color: "error.dark",
              },
              [`.${gridClasses.cell}.highlightInnocent`]: {
                color: "primary.dark",
              },
              [`.${gridClasses.cell}.highlightFalse`]: {
                color: "success.dark",
              },
              [`.${gridClasses.cell}.highlightOther`]: {
                color: "text.primary",
              },

              border: "none"
            }}
        />
      </Box>
  );
}