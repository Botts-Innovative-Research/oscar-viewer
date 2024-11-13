"use client";

import {DataGrid, GridCellParams, gridClasses, GridColDef} from "@mui/x-data-grid";
import {IAlarmTableData, INationalTableData} from "../../../../types/new-types";
import { Box } from "@mui/material";
import CustomToolbar from "@/app/_components/CustomToolbar";
import {AlarmTableDataCollection, NationalTableDataCollection} from "@/lib/data/oscar/TableHelpers";

export default function AlarmTable(props:{ alarmData: AlarmTableDataCollection }){

  const data = props.alarmData;

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
          type: 'string',
          width: 200
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

            getCellClassName={(params: GridCellParams<any, any, string>) => {
                // Assign className for styling to 'Status' column based on value
                if (params.value === "Alarm")
                    return "highlightAlarm";
                else if (params.value === "Scan")
                    return "highlightScan";
                else if (params.value === "Tamper")
                    return "highlightTamper";
                else
                    return '';


            }}
            sx={{

                // Assign styling to 'Status' column based on className
                [`.${gridClasses.cell}.highlightAlarm`]: {
                    backgroundColor: "error.main",
                    color: "error.contrastText",
                },
                [`.${gridClasses.cell}.highlightScan`]: {
                    backgroundColor: "info.main",
                    color: "info.contrastText",
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