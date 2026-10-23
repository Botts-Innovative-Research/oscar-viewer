"use client"

import {DailyFileData, EventTableData} from "@/lib/data/oscar/TableHelpers";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {Box} from "@mui/material";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import {useCallback, useContext, useEffect, useState} from "react";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {
    isDailyFileDataStream,
} from "@/lib/data/oscar/Utilities";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream";
import {useLanguage} from '@/app/contexts/LanguageContext';
import {getDataGridLocaleText, getIntlLocale} from '@/app/utils/LocaleUtils';
import {DataSourceContext} from "@/app/contexts/DataSourceContext";


export default function DailyFileTable({event}: { event: EventTableData}) {
    const {language, t} = useLanguage();
    const locale = getIntlLocale(language);
    const [log, setLog] = useState<DailyFileData[]>([]);
    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    const columns: GridColDef<DailyFileData>[] = [
        {
            field: 'laneId',
            headerName: t('laneId'),
            type: 'string',
            minWidth: 100,
            flex: 1,
        },
        {
            field: 'timestamp',
            headerName: t('timestamp'),
            valueFormatter: (value) => value
                ? new Date(value).toLocaleString(locale, {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric'
                })
                : '',
            minWidth: 200,
            flex: 2,
        },
        {
            field: 'message',
            headerName: t('message'),
            type: 'string',
            minWidth: 150,
            flex: 1,
        },
    ];

    const fetchMessages = useCallback(async () => {
        const currentLane = event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        if (!currLaneEntry) {
            console.warn("Cannot load daily file: lane entry is unavailable:", currentLane);
            setLog([]);
            return;
        }

        const datastream: typeof DataStream = currLaneEntry.datastreams.find((ds) => isDailyFileDataStream(ds));
        if (!datastream) {
            console.warn("No daily file datastream found for this lane");
            setLog([]);
            return;
        }

        try {
            const observations = await datastream.searchObservations(new ObservationFilter({
                resultTime: `${event.startTime}/${event.endTime}`,
                order: 'asc',
            }), 1000);
            const rows: DailyFileData[] = [];

            while (observations.hasNext()) {
                const page = await observations.nextPage();

                rows.push(...page.flatMap((observation: any) => {
                    const result = observation?.result
                        ?? observation?.properties?.result
                        ?? observation?.results?.[0]?.data;
                    const message = result?.rapiscanMessage ?? result?.aspectMessage;
                    const timestamp = observation?.resultTime
                        ?? observation?.properties?.resultTime
                        ?? observation?.timestamp;

                    return message && timestamp
                        ? [new DailyFileData(currentLane, message, timestamp)]
                        : [];
                }));
            }

            setLog(rows);
        } catch (error) {
            console.error("Failed to load daily-file messages:", error);
            setLog([]);
        }

    }, [event, laneMapRef]);

    useEffect(() => {
        void fetchMessages();
    }, [fetchMessages]);


    return(
        <Box sx={{height: 300, width: '100%'}}>
            <DataGrid
                localeText={getDataGridLocaleText(language)}
                rows={log}
                columns={columns}
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
        </Box>
    )
}
