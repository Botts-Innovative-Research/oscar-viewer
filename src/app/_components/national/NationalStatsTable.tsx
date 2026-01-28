
import {useEffect, useRef, useState} from "react";
import {INationalTableData} from "../../../../types/new-types";
import { NationalTableDataCollection} from "@/lib/data/oscar/TableHelpers";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import {Box} from "@mui/material";
import CustomToolbar from "@/app/_components/CustomToolbar";


export default function StatTable(selectedTimeRangeCounts: {selectedTimeRangeCounts: INationalTableData[]}){
    const natlTableRef = useRef<NationalTableDataCollection>(new NationalTableDataCollection());

    useEffect(() => {
        if (selectedTimeRangeCounts) {
            let tableData = new NationalTableDataCollection();
            tableData.setData(selectedTimeRangeCounts.selectedTimeRangeCounts);
            natlTableRef.current = tableData;
        }
    }, [selectedTimeRangeCounts]);

    const columns: GridColDef<INationalTableData>[] = [
        {
            field: 'site',
            headerName: 'Node ID',
            type: 'string',
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numGammaAlarms',
            headerName: 'G Alarm',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numNeutronAlarms',
            headerName: 'N Alarm',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numGammaNeutronAlarms',
            headerName: 'G-N Alarm',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numOccupancies',
            headerName: 'Occupancies',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numTampers',
            headerName: 'Tamper',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numGammaFaults',
            headerName: 'G Faults',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numNeutronFaults',
            headerName: 'N Faults',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numFaults',
            headerName: 'Faults',
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
    ]

    return (
        <Box sx={{height: 800, width: '100%', overflowX: 'auto'}}>
            <DataGrid
                rows={natlTableRef.current.data}
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
                sx={{
                    border: "none",
                    width: "100%"
                }}
            />
        </Box>
    )
}