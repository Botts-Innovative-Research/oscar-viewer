
import {useEffect, useRef, useState} from "react";
import {INationalTableData} from "../../../../types/new-types";
import { NationalTableDataCollection} from "@/lib/data/oscar/TableHelpers";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import {Box} from "@mui/material";
import CustomToolbar from "@/app/_components/CustomToolbar";
import {useLanguage} from '@/app/contexts/LanguageContext';
import {getDataGridLocaleText} from '@/app/utils/LocaleUtils';


export default function StatTable(selectedTimeRangeCounts: {selectedTimeRangeCounts: INationalTableData[]}){
    const {language, t} = useLanguage();
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
            headerName: t('nodeId'),
            type: 'string',
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numGammaAlarms',
            headerName: t('gammaAlarms'),
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numNeutronAlarms',
            headerName: t('neutronAlarms'),
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numGammaNeutronAlarms',
            headerName: t('gammaNeutronAlarms'),
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numOccupancies',
            headerName: t('occupancies'),
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numTampers',
            headerName: t('tamper'),
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numGammaFaults',
            headerName: t('gammaFaults'),
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numNeutronFaults',
            headerName: t('neutronFaults'),
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
            minWidth: 150,
            flex: 1,
        },
        {
            field: 'numFaults',
            headerName: t('faults'),
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
                localeText={getDataGridLocaleText(language)}
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
