"use client";

import React, {useContext, useEffect, useState} from "react";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import { Stack, Typography} from "@mui/material";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {isAdjudicationControlStream} from "@/lib/data/oscar/Utilities";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import ControlStreamFilter from "osh-js/source/core/consysapi/controlstream/ControlStreamFilter";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";


interface NuclideAnalysisProps {
    datasource: typeof ConSysApi;
}

export default function NuclideAnalysisTable({datasource}: NuclideAnalysisProps) {
    const [filteredLog, setFilteredLog] = useState([]);
    const logColumns: GridColDef[] = [
        {
            field: 'nuclideIdentifiedIndicator',
            headerName: 'Nuclide Identified Indicator',
            width: 150,
            type: 'string',
        },
        {
            field: 'nuclideName',
            headerName: 'Nuclide Name',
            width: 200,
            type: 'string',
        },
        {
            field: 'nuclideIDConfidenceDescription',
            headerName: 'Nuclide ID Confidence Description',
            width: 200,
            type: 'string',
        },
        {
            field: 'nuclideIDConfidenceValue',
            headerName: 'Nuclide ID Confidence Value',
            width: 200,
            type: 'number',
        },
        {
            field: 'nuclideCategoryDescription',
            headerName: 'Nuclide Category Description',
            width: 200,
            type: 'string',
        },
        {
            field: 'n42rsiB',
            headerName: 'n42rsiB',
            width: 200,
            type: 'string',
        }
    ];

    return (
        <>
            <Stack spacing={2}>
                <Stack direction={"column"} spacing={1}>
                    <Typography variant="h5">Nuclide Analysis Results</Typography>
                </Stack>
                <DataGrid
                    rows={filteredLog}
                    columns={logColumns}
                    initialState={{
                        pagination: {
                            paginationModel: {
                                pageSize: 10
                            }
                        }
                    }}
                    pageSizeOptions={[5, 10, 25, 50, 100]}
                    disableRowSelectionOnClick={true}
                />
            </Stack>
        </>
    );
}
