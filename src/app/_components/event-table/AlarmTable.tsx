"use client";

import {DataGrid, GridCellParams, gridClasses, GridColDef} from "@mui/x-data-grid";
import {IAlarmTableData} from "../../../../types/new-types";
import { Box } from "@mui/material";
import CustomToolbar from "@/app/_components/CustomToolbar";
import {AlarmTableDataCollection} from "@/lib/data/oscar/TableHelpers";
import {makeStyles} from "@mui/styles";
import {useState} from "react";


const selectedRowStyles = makeStyles({
    selectedRow: {
        backgroundColor: 'rgba(33,150,243,0.5) !important',
    },
});

export default function AlarmTable(props:{ alarmData: AlarmTableDataCollection }){

  const data = props.alarmData;
  const classes = selectedRowStyles();
  
  const [selectedRow, setSelectedRow] = useState<string| null>(null);

  

  const columns: GridColDef<IAlarmTableData>[] = [
      {
          field: 'laneId',
          headerName: 'Lane ID',
          type: 'string',
          width: 200
      },
      {
          field: 'timestamp',
          headerName: 'Time',
          // type: 'string',
          valueFormatter:(value) =>{
              const dateTime = (new Date(value)).toLocaleString();
              return dateTime;
          },
          width: 200
      },
      {
          field: 'count1',
          headerName: 'Count 1 (CPS)',
          type: 'number',
          width: 200,
          valueFormatter: (value) => {
              return typeof value === 'number' ? value : 0;
          },
      },
      {
          field: 'count2',
          headerName: 'Count 2 (CPS)',
          type: 'number',
          width: 200,
          valueFormatter: (value) => {
              return typeof value === 'number' ? value : 0;
          },
      },
      {
          field: 'count3',
          headerName: 'Count 3 (CPS)',
          type: 'number',
          width: 200,
          valueFormatter: (value) => {
              return typeof value === 'number' ? value : 0;
          },
      },
      {
          field: 'count4',
          headerName: 'Count 4 (CPS)',
          type: 'number',
          width: 200,
          valueFormatter: (value) => {
              return typeof value === 'number' ? value : 0;
          },
      },
      {
          field: 'status',
          headerName: 'Status',
          type: 'string',
          width: 200
      },
  ]
  return(
      <Box sx={{height: 800, width: '100%'}}>
        <DataGrid
            rows={data.data}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 20,
                },
              },
            }}
            pageSizeOptions={[20]}
            slots={{toolbar: CustomToolbar}}

            autosizeOnMount
            autosizeOptions={{
              expand: true,
              includeOutliers: true,
              includeHeaders: false,
            }}
            onRowClick={(params)=>{
                setSelectedRow(params.row.id);
              }}
            getCellClassName={(params: GridCellParams<any, any, string>) => {
                // Assign className for styling to 'Status' column based on value
                if (params.value === "Gamma Alarm") return "highlightGamma";
                else if(params.value === "Neutron Alarm") return 'highlightNeutron'
                else if (params.value === 'Fault - Gamma Low' || params.value === 'Fault - Gamma High' || params.value === 'Fault - Neutron Low')
                    return "highlightFault";
                else if (params.value === "Tamper")
                    return "highlightTamper";
                else
                    return '';


            }}
            getRowClassName={(params) =>
                params.id == selectedRow ? classes.selectedRow : ''
            }
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
                [`.${gridClasses.cell}.highlightFault`]: {
                    backgroundColor: "warning.main",
                    color: "warning.contrastText",
                },
                [`.${gridClasses.cell}.highlightTamper`]: {
                    backgroundColor: "secondary.main",
                    color: "secondary.contrastText",
                },
                border: "none",
            }}
        />
      </Box>
  )
}