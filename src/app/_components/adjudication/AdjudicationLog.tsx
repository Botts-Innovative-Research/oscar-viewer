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

        // let systems = await currLaneEntry.parentNode.fetchSystems();
        //
        // let rpmSystem: typeof System = systems.find((sys) => sys.properties.id == "0g0g");
        // console.log("rpmSystem", rpmSystem)
        //
        // let controlStream = await rpmSystem.getControlStreamById("0g0g");
        // console.log("controlStream", controlStream)
        //
        // let status = await controlStream.searchStatus(undefined, 1000);
        // while (status.hasNext()) {
        //     console.log("status", status);
        //     let result = await status.nextPage();
        //     console.log("Result", result);
        // }

        // let cmds= await rpmSystem.searchControlStreams(undefined, 1000);

        //
        // while (cmds.hasNext()) {
        //     let cmdRes = await cmds.nextPage();
        //
        //     console.log("cmd res", cmdRes);
        //     let adjControlStream = cmdRes.find((cmd: any) => cmd.properties.id === "0g0g")
        //
        //     console.log("adj control stream", adjControlStream)
        //
        // }

        // let cmd: typeof Command = await adjudicationControlStream.getCommandById("0g0opas4p033f4fnl0", undefined);
        //
        //
        // let commandStatus = await cmd.searchStatus(undefined, 1000);
        // while (commandStatus.hasNext()) {
        //     let cmdResult = await commandStatus.nextPage();
        //
        //     console.log("commadn Result", cmdResult);
        // }

        // let commandStatuses = await adjudicationControlStream.searchStatus(undefined, 10000);
        //
        // while (commandStatuses.hasNext()) {
        //     let cmdRes = await commandStatuses.nextPage();
        //     console.log("cmd res", cmdRes)
        //
        //     let adjDataArr = cmdRes.map((obs: any) => {
        //         let results = obs.results;
        //         let data = new AdjudicationData(obs.phenomenonTime, results.data.occupancyCount, results.data.observationId, results.data.alarmingSystemUid);
        //         data.setFeedback(results.data.feedback);
        //         data.setIsotopes(results.data.isotopes);
        //         data.setSecondaryInspectionStatus(results.data.secondaryInspectionStatus);
        //         data.setAdjudicationCode(AdjudicationCodes.getCodeObjByIndex(results.data.adjudicationCode));
        //         data.setVehicleId(results.data.vehicleId);
        //         data.setFilePaths(results.data.filePaths)
        //         data.setTime(obs.phenomenonTime)
        //         data.setUser(results.data.username)
        //         return data
        //     });
        //     setAdjLog(adjDataArr);
        // }
        // props.onFetch();
    }

    useEffect(() => {


        fetchObservations();

    }, []);

    useEffect(() => {
        let filteredLog = adjLog.filter((adjData) => props.event.observationId.toString() === adjData.observationId);
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
