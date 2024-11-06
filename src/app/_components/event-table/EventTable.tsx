"use client";

import {Box} from '@mui/material';
import {DataGrid, GridActionsCellItem, GridCellParams, GridColDef, gridClasses} from '@mui/x-data-grid';

import {IEventTableData, SelectedEvent} from 'types/new-types';
import {useContext, useState} from 'react';

import NotesRoundedIcon from '@mui/icons-material/NotesRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import {EventTableData, EventTableDataCollection} from "@/lib/data/oscar/TableHelpers";
import CustomToolbar from "@/app/_components/CustomToolbar";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useSelector} from "react-redux";
import {useAppDispatch} from "@/lib/state/Hooks";
import {selectEventPreview, setEventPreview} from "@/lib/state/OSCARClientSlice";
import {useRouter} from "next/navigation";


export default function EventTable(props: {
  viewSecondary?: boolean,  // Show 'Secondary Inspection' column, default FALSE
  viewMenu?: boolean, // Show three-dot menu button, default FALSE
  viewLane?: boolean, // Show 'View Lane' option in menu, default FALSE
  viewAdjudicated?: boolean, //shows Adjudicated status in the event log , not shown in the alarm table
  eventTable: EventTableDataCollection,  // StatTable data
}) {
  const viewAdjudicated = props.viewAdjudicated || false;
  const viewSecondary = props.viewSecondary || false;
  const viewMenu = props.viewMenu || false;
  const viewLane = props.viewLane || false;
  const eventTable = props.eventTable;

  const [selectionModel, setSelectionModel] = useState([]); // Currently selected row
  const laneMapRef = useContext(DataSourceContext).laneMapRef;

  const dispatch = useAppDispatch();
  const router = useRouter();

  // Column definition for EventTable
  const columns: GridColDef<IEventTableData>[] = [
    {
      field: 'secondaryInspection',
      headerName: 'Secondary Inspection',
      type: 'string',
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
        return typeof value === 'number' ? value : 0;
      },
    },
    {
      field: 'maxNeutron',
      headerName: 'Max Neutron (cps)',
      valueFormatter: (value) => {
        // Append units to number value, or return 'N/A'
        return typeof value === 'number' ? value : 0;
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      type: 'string',
    },
    {
      //TODO: when adjudication is updated to working state chang this back to adjudicatedCode
      // field: 'adjudicatedCode',
      field: 'isAdjudicated',
      headerName: 'Adjudicated',
      type: 'string',
      valueFormatter: (value) => value ? "Yes" : "No",
      // valueFormatter: (value) => {
      //   const adjCode = {
      //     1: 'Code 1: Contraband Found',
      //     2: 'Code 2: Other',
      //     3: 'Code 3: Medical Isotope Found',
      //     4: 'Code 4: NORM Found',
      //     5: 'Code 5: Declared Shipment of Radioactive Material',
      //     6: 'Code 6: Physical Inspection Negative',
      //     7: 'Code 7: RIID/ASP Indicates Background Only',
      //     8: 'Code 8: Other',
      //     9: 'Code 9: Authorized Test, Maintenance, or Training Activity',
      //     10: 'Code 10: Unauthorized Activity',
      //     11: 'Code 11: Other'
      //   };
      //   return typeof value === 'number' ? adjCode[value] : 'No';
      // }
    },
    {
      field: 'Menu',
      headerName: '',
      type: 'actions',
      maxWidth: 50,
      getActions: (params) => [
        <GridActionsCellItem
            icon={<NotesRoundedIcon/>}
            label="Details"
            onClick={() => handleEventPreview()}
            showInMenu
        />,
        (viewLane ?
                <GridActionsCellItem
                    icon={<VisibilityRoundedIcon/>}
                    label="View Lane"
                    onClick={() => handleLaneView(params.row.laneId)}
                    showInMenu
                />
                : <></>
        ),
      ],
    },
  ];

  const handleLaneView = (laneName: string) => {
    router.push(`/lane-view?name=${encodeURIComponent(laneName)}`);
  };

  const handleEventPreview = () =>{
    //should we set the event preview open here using dispatch?
    router.push("/event-details")
  }

  // Manage list of columns in toggle menu
  const getColumnList = () => {
    const excludeFields: string[] = [];
    // Exclude fields based on component parameters
    if (!viewSecondary) excludeFields.push('secondaryInspection');
    if (!viewMenu) excludeFields.push('Menu');
    if (!viewAdjudicated) excludeFields.push('adjudicatedCode');

    return columns
        .filter((column) => !excludeFields.includes(column.field))
        .map((column) => column.field);
  }

  // Handle currently selected row
  const handleRowSelection = (selection: any[]) => {

    console.log("Selection: ", selection);

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

      // Find the selected row's eventTable
      const selectedRow = eventTable.data.find((row) => row.id === selectedId);
      if (selectedRow && onRowSelect) {
        onRowSelect(selectedRow); // Return start and end time to parent function
      }
    }
  };

  function onRowSelect(event: EventTableData) {
    if (event) {
      dispatch(setEventPreview({
        isOpen: false,
        eventData: null,
      }));
      console.log("Row selected: ", event);
      console.log("LaneMapRef: ", laneMapRef.current);
      const currentSystem = laneMapRef.current.get(event.laneId).systems.find((system) => system.properties.id === event.systemIdx)
      console.log("Current System: ", currentSystem);

      dispatch(setEventPreview({
        isOpen: true,
        eventData: event,
      }));
    } else {
      console.log("Setting EventPreview Data to null");
      dispatch(setEventPreview({
        isOpen: false,
        eventData: null,
      }));
    }
  }

  return (
      <Box sx={{height: 800, width: '100%'}}>
        <DataGrid
            rows={eventTable.data}
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
                },
              },
            }}
            pageSizeOptions={[20]}
            slots={{toolbar: CustomToolbar}}
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
              else if (params.formattedValue === 'Code 1: Contraband Found' || params.formattedValue === 'Code 2: Other' || params.formattedValue === 'Code 3: Medical Isotope Found')
                return "highlightReal";
              else if (params.formattedValue === 'Code 4: Norm Found' || params.formattedValue === 'Code 5: Declared Shipment of Radioactive Material' || params.formattedValue === 'Code 6: Physical Inspection Negative')
                return "highlightInnocent";
              else if (params.formattedValue === 'Code 7: RIID/ASP Indicates Background Only' || params.formattedValue === 'Code 8: Other' || params.formattedValue === 'Code 9: Authorized Test, Maintenance, or Training Activity')
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

              border: "none",
            }}
        />
      </Box>
  );
}
