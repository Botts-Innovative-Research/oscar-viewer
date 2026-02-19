"use client";

import React, {useContext, useEffect, useState} from "react";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import { Stack, Typography} from "@mui/material";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {isWebIdAnalysisDataStream} from "@/lib/data/oscar/Utilities";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {IWebIdIsotope} from "@/lib/data/oscar/adjudication/WebId";
import WebIdAnalysisResult from "@/lib/data/oscar/adjudication/WebId";


export default function WebIdAnalysis(props: {
    event: EventTableData;
    shouldFetch: boolean;
    onFetch: () => void;
}) {

    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [webIdLog, setWebIdLog] = useState<any[]>([]);
    const [filteredLog, setFilteredLog] = useState<any[]>([]);
    const [webIdDataStream, setWebIdDatastream] = useState();
    const { t } = useLanguage();

    const locale = navigator.language || 'en-US';

    const logColumns: GridColDef<WebIdAnalysisResult>[] = [
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
            field: 'name',
            headerName: 'Name',
            width: 200,
            valueGetter: (value, row) => row.isotopes?.map((i: IWebIdIsotope) => i.name).join(', '),
        },
        {
            field: 'type',
            headerName: 'Type',
            width: 200,
            valueGetter: (value, row) => row.isotopes?.map((i: IWebIdIsotope) => i.type).join(', '),
        },
        {
            field: 'confidence',
            headerName: 'Confidence',
            width: 200,
            valueGetter: (value, row) => row.isotopes?.map((i: IWebIdIsotope) => i.confidence).join(', '),
        },
        {
            field: 'confidenceStr',
            headerName: 'Confidence String',
            width: 200,
            valueGetter: (value, row) => row.isotopes?.map((i: IWebIdIsotope) => i.confidenceStr).join(', '),
        },
        {
            field: 'countRate',
            headerName: 'Count Rate',
            width: 200,
            valueGetter: (value, row) => row.isotopes?.map((i: IWebIdIsotope) => i.countRate).join(', '),
        },
        {
            field: 'isotopeString',
            headerName: 'Isotope String',
            width: 200,
            type: 'string',
        },
        {
            field: 'numIsotopes',
            headerName: 'Number of Isotopes',
            width: 200,
            type: 'number',
        },
        {
            field: 'numAnalysisWarning',
            headerName: 'Num Analysis Warning',
            width: 200,
            type: 'string',
        },
        {
            field: 'analysisWarning',
            headerName: 'Analysis Warning',
            width: 200,
            type: 'string',
        },
        {
            field: 'chiSquare',
            headerName: 'Chi Square',
            width: 200,
            type: 'number',
        },
        {
            field: 'detectorResponseFunction',
            headerName: 'Detector Response Function',
            width: 200,
            type: 'string',
        },
        {
            field: 'errorMessage',
            headerName: 'Error Message',
            width: 200,
            type: 'string',
        },
        {
            field: 'estimatedDose',
            headerName: 'Estimated Dose',
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
    }, [props.event.laneId]);

    useEffect(() => {
        if (webIdDataStream)
            fetchObservations(webIdDataStream);
    }, [webIdDataStream]);

    async function fetchObservations(datastream: typeof DataStream) {
        let query = await datastream.searchObservations(undefined, 100);

        while (query.hasNext()) {
            let obsCollection = await query.nextPage();

            let webIdData = obsCollection.map((obs: any)=> {
                // let resultIsotopes = obs?.result.isotopes[0];
                return new WebIdAnalysisResult(obs.resultTime, obs.result);
                // return new WebIdIsotopeData(obs.resultTime, resultIsotopes.name, resultIsotopes.type, resultIsotopes.confidence, resultIsotopes.confidenceString, resultIsotopes.countRate, obs.result.occupancyObsId)
            })
            setWebIdLog(webIdData)
        }
        props.onFetch();
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
    }, [props.shouldFetch]);


    return (
        <>
            <Stack spacing={2} p={2}>
                <Stack direction={"column"} spacing={1}>
                    <Typography variant="h5">
                        WebID Analysis Results Log
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
