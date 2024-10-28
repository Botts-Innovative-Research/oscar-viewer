"use client";

import {DataGrid, GridColDef} from "@mui/x-data-grid";
import {INationalTableData} from "../../../../types/new-types";
import { Box } from "@mui/material";
import CustomToolbar from "@/app/_components/CustomToolbar";
import {NationalTableDataCollection} from "@/lib/data/oscar/TableHelpers";

export default function NationalTable(props:{
    tableData: NationalTableDataCollection
}){

    const natlTable = props.tableData;

    const columns: GridColDef<INationalTableData>[] = [
        {
            field: 'site',
            headerName: 'Site Name',
            type: 'string'
        },
        {
            field: 'occupancyCount',
            headerName: 'Occupancy',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 'N/A';
            }
        },
        {
            field: 'gammaAlarmCount',
            headerName: 'Gamma Alarms',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 'N/A';
            }
        },
        {
            field: 'neutronAlarmCount',
            headerName: 'Neutron Alarms',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 'N/A';
            }
        },
        {
            field: 'faultAlarmCount',
            headerName: 'Fault Alarms',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 'N/A';
            }
        },
        {
            field: 'tamperAlarmCount',
            headerName: 'Tamper Alarms',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 'N/A';
            }
        },
    ]
    return(
        <Box sx={{height: 800, width: '100%'}}>
            <DataGrid
                rows={natlTable.data}
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
                />
        </Box>
    )
}