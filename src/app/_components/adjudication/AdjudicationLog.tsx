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

const locale = navigator.language || 'en-US';

const logColumns: GridColDef<AdjudicationData>[] = [
    {
        field: 'occupancyCount',
        headerName: 'Occupancy ID',
        width: 200,
        type: 'string',
    },
    {
        field: 'time',
        headerName: 'Timestamp',
        width: 200,
        type: 'string',
        valueFormatter: (params) => (new Date(params)).toLocaleString(locale, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }),
    },

    {
        field: 'secondaryInspectionStatus',
        headerName: 'Secondary Inspection Status',
        width: 200
    },
    {
        field: 'adjudicationCode',
        headerName: 'Adjudication Code',
        width: 400,
        valueGetter: (value, row) => {
            return row.adjudicationCode.label
        }
    },
    {
        field: 'isotopes',
        headerName: 'Isotopes',
        width: 200,
        valueGetter: (value) => {
            if (value === "") return "Unknown";
            else return value;
        }
    },
    {
        field: 'filePaths',
        headerName: 'FilePaths',
        width: 200,
        type: 'string'
    },
    {
        field: 'vehicleId',
        headerName: 'Vehicle ID',
        width: 200,
        valueGetter: (value) => {
            if (value === "") return "Unknown";
            else return value;
        }
    },
];

export default function AdjudicationLog(props: {
    event: EventTableData;
    shouldFetch: boolean;
    onFetch: () => void;
}) {

    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [adjLog, setAdjLog] = useState<AdjudicationData[]>([]);
    const [onlySameObs, setOnlySameObs] = useState(false);
    const [filteredLog, setFilteredLog] = useState<AdjudicationData[]>([]);

    async function fetchObservations() {
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        let streams = await currLaneEntry.parentNode.fetchNodeControlStreams();
        if(!streams)
            return;

        let adjudicationControlStream: typeof ControlStream = streams.find((stream: typeof ControlStream) => isAdjudicationControlStream(stream));
        if (!adjudicationControlStream)
            return

        let commandStatuses = await adjudicationControlStream.searchStatus(undefined, 10000);

        while (commandStatuses.hasNext()) {
            let cmdRes = await commandStatuses.nextPage();

            let adjDataArr = cmdRes.map((obs: any) => {
                let results = obs.results[0];
                let data = new AdjudicationData(obs.reportTime, results.data.occupancyCount, results.data.occupancyObsId, results.data.alarmingSystemUid);
                data.setFeedback(results.data.feedback);
                data.setIsotopes(results.data.isotopes);
                data.setSecondaryInspectionStatus(results.data.secondaryInspectionStatus);
                data.setAdjudicationCode(AdjudicationCodes.getCodeObjByIndex(results.data.adjudicationCode));
                data.setVehicleId(results.data.vehicleId);
                data.setFilePaths(results.data.filePaths)
                data.setTime(obs.reportTime)
                data.setOccupancyCount(props.event.occupancyCount);
                data.setOccupancyObsId(results.data.occupancyObsId);
                data.setUser(results.data.username)
                return data
            });
            setAdjLog(adjDataArr);
        }
        props.onFetch();
    }

    useEffect(() => {
        let filteredLog = adjLog.filter((adjData) => props.event.occupancyObsId.toString() === adjData.occupancyObsId);
        setFilteredLog(filteredLog);
    }, [adjLog, onlySameObs]);

    useEffect(() => {
        if (props.shouldFetch) {
            setTimeout(() => {
                fetchObservations();
            }, 10000);
        }
    }, [props.shouldFetch]);

    function toggleOnlySameObs() {
        setOnlySameObs(prevState => !prevState);
    }

    return (
        <>
            <Stack spacing={2}>
                <Stack direction={"column"} spacing={1}>
                    <Typography variant="h5">Logged Adjudications</Typography>
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
