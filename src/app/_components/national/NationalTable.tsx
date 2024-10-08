


// A table that summarizes the following from a single "site" (all rpms on a single opensensorhub node = site):
//
// number of occupancies
// number of gamma alarms
// number of neutron alarms
// number of faults
// number of tampers
// This would utilize a batch request and then calculate the totals in the client.
//extra functionality We will want to be able to adjust the time frame from 1 day, 1 week, 1 month from current date time.

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
    console.log('props',props.tableData)


    // const columns: GridColDef<(typeof rows)[number]>[] = [
    const columns: GridColDef<INationalTableData>[] = [
        {
            field: 'site',
            headerName: 'Site Name',
            type: 'string'
        },
        {
            field: 'occupancyCount',
            headerName: 'Occupancy Count',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 'N/A';
            }
        },
        {
            field: 'gammaAlarmCount',
            headerName: 'Gamma Count',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 'N/A';
            }
        },
        {
            field: 'neutronAlarmCount',
            headerName: 'Neutron Count',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 'N/A';
            }
        },
        {
            field: 'faultAlarmCount',
            headerName: 'Fault Count',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 'N/A';
            }
        },
        {
            field: 'tamperAlarmCount',
            headerName: 'Tamper Count',
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