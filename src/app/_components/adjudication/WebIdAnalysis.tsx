"use client";

import React, {useCallback, useContext, useEffect, useState} from "react";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import { Box, Dialog, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";
import {IWebIdIsotope} from "@/lib/data/oscar/adjudication/WebId";
import WebIdAnalysisResult from "@/lib/data/oscar/adjudication/WebId";
import {WEB_ID_DEF} from "@/lib/data/Constants";
import {EventType} from "osh-js/source/core/event/EventType";


export default function WebIdAnalysis(props: { event: EventTableData; }) {
    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    const [webIdLog, setWebIdLog] = useState<any[]>([]);
    const [filteredLog, setFilteredLog] = useState<any[]>([]);
    const [expandDialog, setExpandDialog] = useState({ open: false, title: "", text: "" });

    const locale = navigator.language || 'en-US';

    const MAX_CELL_LENGTH = 50;

    const renderStringCell = (headerName: string) => (params: any) => {
        const fullText = params.value != null ? String(params.value) : "";
        const truncated = fullText.length > MAX_CELL_LENGTH
            ? fullText.substring(0, MAX_CELL_LENGTH) + "..."
            : fullText;
        return (
            <div style={{ whiteSpace: "normal", wordWrap: "break-word" }}>
                {truncated}
                {fullText.length > MAX_CELL_LENGTH && (
                    <button
                        style={{ color: "#1976d2", border: "none", background: "none", cursor: "pointer", paddingLeft: 4 }}
                        onClick={() => setExpandDialog({ open: true, title: headerName, text: fullText })}
                    >
                        Read more
                    </button>
                )}
            </div>
        );
    };

    const logColumns: GridColDef<WebIdAnalysisResult>[] = [
        {
            field: 'time',
            headerName: 'Timestamp',
            minWidth: 140,
            flex: 1,
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
            minWidth: 100,
            flex: 1,
            valueGetter: (value, row) => row.isotopes?.map((i: IWebIdIsotope) => i.name).join(', '),
            renderCell: renderStringCell('Name'),
        },
        {
            field: 'type',
            headerName: 'Type',
            minWidth: 80,
            flex: 0.8,
            valueGetter: (value, row) => row.isotopes?.map((i: IWebIdIsotope) => i.type).join(', '),
            renderCell: renderStringCell('Type'),
        },
        {
            field: 'confidence',
            headerName: 'Confidence',
            minWidth: 90,
            flex: 0.8,
            valueGetter: (value, row) => row.isotopes?.map((i: IWebIdIsotope) => i.confidence).join(', '),
            renderCell: renderStringCell('Confidence'),
        },
        {
            field: 'confidenceStr',
            headerName: 'Confidence String',
            minWidth: 120,
            flex: 1,
            valueGetter: (value, row) => row.isotopes?.map((i: IWebIdIsotope) => i.confidenceStr).join(', '),
            renderCell: renderStringCell('Confidence String'),
        },
        {
            field: 'countRate',
            headerName: 'Count Rate',
            minWidth: 90,
            flex: 0.8,
            valueGetter: (value, row) => row.isotopes?.map((i: IWebIdIsotope) => i.countRate).join(', '),
            renderCell: renderStringCell('Count Rate'),
        },
        {
            field: 'isotopeString',
            headerName: 'Isotope String',
            minWidth: 100,
            flex: 1,
            type: 'string',
            renderCell: renderStringCell('Isotope String'),
        },
        {
            field: 'numIsotopes',
            headerName: '# Isotopes',
            minWidth: 80,
            flex: 0.6,
            type: 'number',
        },
        {
            field: 'numAnalysisWarning',
            headerName: '# Warnings',
            minWidth: 80,
            flex: 0.6,
            type: 'string',
            renderCell: renderStringCell('# Warnings'),
        },
        {
            field: 'analysisWarning',
            headerName: 'Analysis Warning',
            minWidth: 120,
            flex: 1,
            type: 'string',
            renderCell: renderStringCell('Analysis Warning'),
        },
        {
            field: 'chiSquare',
            headerName: 'Chi Square',
            minWidth: 90,
            flex: 0.7,
            type: 'number',
        },
        {
            field: 'detectorResponseFunction',
            headerName: 'DRF',
            minWidth: 80,
            flex: 0.6,
            type: 'string',
            renderCell: renderStringCell('DRF'),
        },
        {
            field: 'errorMessage',
            headerName: 'Error Message',
            minWidth: 100,
            flex: 1,
            type: 'string',
            renderCell: renderStringCell('Error Message'),
        },
        {
            field: 'estimatedDose',
            headerName: 'Est. Dose',
            minWidth: 80,
            flex: 0.6,
            type: 'number',
        }
    ];

    const fetchData = useCallback(async() => {
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        let webIdDatastream: typeof DataStream = currLaneEntry.findDataStreamByObsProperty(WEB_ID_DEF);
        if(!webIdDatastream) {
            console.warn("No WebID Analysis datastream found for this lane");
            return;
        }

        let query = await webIdDatastream.searchObservations(undefined, 100);

        while (query.hasNext()) {
            let obsCollection = await query.nextPage();

            let webIdData = obsCollection.map((obs: any)=> {
                return new WebIdAnalysisResult(obs.resultTime, obs.result);
            })
            setWebIdLog(webIdData)
        }
    },[])

    useEffect(() => {
        if (props.event)
            fetchData();
    }, [props.event]);

    useEffect(() => {
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        let webIdStream = currLaneEntry.findDataStreamByObsProperty(WEB_ID_DEF);
        if(!webIdStream) {
            console.warn("No WebID Analysis datastream found for this lane");
            return;
        }

        const webIdSource = currLaneEntry.datasourcesRealtime?.find((ds: any) => {
            const parts = ds.properties.resource?.split("/");
            return parts && parts[2] === webIdStream.properties.id;
        });
        if (!webIdSource) {
            console.warn("No WebID Analysis data source found for this lane");
            return;
        }

        const handleObservations = (msg: any) => {
            const data = msg.values?.[0]?.data;
            if (!data) return;

            const webId = new WebIdAnalysisResult(data.timestamp, data);
            if (webId.occupancyObsId !== props.event.occupancyObsId) return;

            setFilteredLog(prev => {
                const exists = prev.some(item => item.occupancyObsId === webId.occupancyObsId && item.time === webId.time);
                if (exists) return prev;
                return [webId, ...prev];
            });
        };

        webIdSource.subscribe(handleObservations, [EventType.DATA]);

        try {
            webIdSource.connect();
        } catch (err) {
            console.error("Error connecting webid source:", err);
        }
    }, [props.event]);


    useEffect(() => {
        let filteredLog = webIdLog.filter((data) => data?.occupancyObsId ==  props.event.occupancyObsId);
        setFilteredLog(filteredLog);
    }, [webIdLog]);


    return (
        <Stack spacing={2} sx={{ width: '100%' }}>
            <Stack direction={"column"} spacing={1}>
                <Typography variant="h5">
                    WebID Analysis Results Log
                </Typography>
            </Stack>
            <Box sx={{ width: '100%' }}>
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
            </Box>
            <Dialog
                open={expandDialog.open}
                onClose={() => setExpandDialog({ open: false, title: "", text: "" })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{expandDialog.title}</DialogTitle>
                <DialogContent>
                    <Typography whiteSpace="pre-wrap">{expandDialog.text}</Typography>
                </DialogContent>
            </Dialog>
        </Stack>
    );
}
