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

const locale = navigator.language || 'en-US';

const logColumns: GridColDef<AdjudicationData>[] = [
    {
        field: 'occupancyCount',
        headerName: 'Occupancy ID',
        width: 200,
        type: 'string',
    },
    {
        field: 'username',
        headerName: 'User',
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
    const [filteredLog, setFilteredLog] = useState<AdjudicationData[]>([]);
    const [laneAdjControlStream, setLaneAdjControlStream] = useState<typeof ControlStream>();


    async function getControlStream(){
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        let streams = await currLaneEntry.parentNode.fetchNodeControlStreams();
        if(!streams)
            return;

        let adjudicationControlStream: typeof ControlStream = streams.find((stream: typeof ControlStream) => isAdjudicationControlStream(stream));
        if (!adjudicationControlStream)
            return

        setLaneAdjControlStream(adjudicationControlStream);
    }

    useEffect(() => {
        getControlStream();
    }, [props.event.laneId]);

    useEffect(() => {
        if (laneAdjControlStream)
            fetchObservations(laneAdjControlStream);
    }, [laneAdjControlStream]);


    async function fetchObservations(controlStream: typeof ControlStream) {

        let commandStatuses = await controlStream.searchStatus(new ControlStreamFilter({}), 10000);

        while (commandStatuses.hasNext()) {
            let cmdRes = await commandStatuses.nextPage();

            let completedAdjData =  cmdRes.filter((obs: any) => obs.statusCode === "COMPLETED");

            console.log("cmdRed", cmdRes);
            console.log("completedAdjData", completedAdjData)
            let adjDataArr = completedAdjData.map((obs: any) => {

                if (!obs?.results)
                    return null;

                let results = obs?.results[0].data;
                let data = new AdjudicationData(obs.reportTime, props.event.occupancyCount, results.occupancyObsId, results.alarmingSystemUid);
                data.setFeedback(results.feedback);
                data.setIsotopes(results.isotopes ?? NaN);
                data.setSecondaryInspectionStatus(results.secondaryInspectionStatus);
                data.setAdjudicationCode(AdjudicationCodes.getCodeObjByIndex(results.adjudicationCode));
                data.setVehicleId(results.vehicleId ?? NaN);
                data.setFilePaths(results.filePaths ?? NaN)
                data.setTime(obs.reportTime)
                data.setOccupancyCount(props.event.occupancyCount);
                data.setOccupancyObsId(results.occupancyObsId);
                data.setUser(results.username ?? NaN)
                return data
            });
            setAdjLog(adjDataArr);
        }
        props.onFetch();
    }

    useEffect(() => {
        console.log("adj log", adjLog)
        let filteredLog = adjLog.filter((adjData) => adjData?.occupancyObsId ==  props.event.occupancyObsId);
        setFilteredLog(filteredLog);
    }, [adjLog]);

    useEffect(() => {
        if (props.shouldFetch) {
            setTimeout(() => {
                fetchObservations(laneAdjControlStream);
            }, 10000);
        }
    }, [props.shouldFetch]);


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
