"use client";

import React, {useContext, useEffect, useState} from "react";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import { Stack, Typography} from "@mui/material";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {isAdjudicationControlStream, isWebIdAnalysisDataStream} from "@/lib/data/oscar/Utilities";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import ControlStreamFilter from "osh-js/source/core/consysapi/controlstream/ControlStreamFilter";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";



export default function WebIdAnalysis(props: {
    event: EventTableData;
    shouldFetch: boolean;
    onFetch: () => void;
}) {

    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [webIdLog, setWebIdLog] = useState<any[]>([]);
    const [filteredLog, setFilteredLog] = useState<any[]>([]);
    const [webIdDataStream, setWebIdDatastream] = useState();


    const logColumns: GridColDef<AdjudicationData>[] = [
        {
            field: 'name',
            headerName: 'Name',
            width: 200,
            type: 'string',
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 200,
            type: 'string',
        },
        {
            field: 'confidence',
            headerName: 'Confidence',
            width: 200,
            type: 'number',
        },
        {
            field: 'confidenceStr',
            headerName: 'Confidence String',
            width: 200,
            type: 'string',
        },
        {
            field: 'countRate',
            headerName: 'Count Rate',
            width: 200,
            type: 'number',
        }
    ];

    async function getDataStream(){
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        let streams = currLaneEntry.datastreams.length > 0 ? currLaneEntry.datastreams : await currLaneEntry.parentNode.fetchNodeDataStreams()
        if(!streams) return;

        let webIdDs: typeof DataStream = streams.find((stream: typeof DataStream) => isWebIdAnalysisDataStream(stream));
        if (!webIdDs) return
        setWebIdDatastream(webIdDs);
    }

    useEffect(() => {
        getDataStream();
    }, []);

    useEffect(() => {
        if (webIdDataStream)
            fetchObservations(webIdDataStream);
    }, [webIdDataStream]);

    async function fetchObservations(datastream: typeof DataStream) {

        let query = await datastream.searchObservations(undefined, 100);

        while (query.hasNext()) {
            let obsCollection = await query.nextPage();

        }
    }

    useEffect(() => {
        let filteredLog = webIdLog.filter((data) => data?.occupancyObsId ==  props.event.occupancyObsId);
        setFilteredLog(filteredLog);
    }, [webIdLog]);

    useEffect(() => {
        if (props.shouldFetch) {
            setTimeout(() => {
                fetchObservations(webIdDataStream);
            }, 5000);
        }
    }, []);


    return (
        <>
            <Stack spacing={2} p={2}>
                <Stack direction={"column"} spacing={1}>
                    <Typography variant="h5">
                        WebID Analysis Log
                    </Typography>
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
