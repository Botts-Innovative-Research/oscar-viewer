"use client";

import React, {useCallback, useContext, useEffect, useState} from "react";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import { Box, Stack, Typography} from "@mui/material";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {isAdjudicationControlStream} from "@/lib/data/oscar/Utilities";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import ControlStreamFilter from "osh-js/source/core/consysapi/controlstream/ControlStreamFilter";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {INode} from "@/lib/data/osh/Node";
import {EventType} from "osh-js/source/core/event/EventType";


export default function AdjudicationLog(props: {
    event: EventTableData;
    node: INode;
}) {
    const { t } = useLanguage();
    const locale = navigator.language || 'en-US';
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [adjLog, setAdjLog] = useState<AdjudicationData[]>([]);
    const [filteredLog, setFilteredLog] = useState<AdjudicationData[]>([]);
    const [feedbackDialog, setFeedbackDialog] = useState({
        open: false,
        text: ""
    });
    const [nodeEndpoint, setNodeEndpoint] = useState<string | null>(null);

    const logColumns: GridColDef<AdjudicationData>[] = [
        {
            field: 'occupancyCount',
            headerName: 'Occupancy ID',
            minWidth: 100,
            flex: 1,
            type: 'string',
        },
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
            field: 'username',
            headerName: 'User',
            minWidth: 80,
            flex: 0.8,
            type: 'string',
        },
        {
            field: 'adjudicationCode',
            headerName: 'Adjudication Code',
            minWidth: 150,
            flex: 1.5,
            valueGetter: (value, row) => {
                return row.adjudicationCode.label
            }
        },
        {
            field: 'feedback',
            headerName: 'Feedback',
            minWidth: 120,
            flex: 1,
            type: 'string',
            renderCell: (params) => {
                const fullText = params.value ?? "";
                const maxLength = 50;

                const truncated = fullText.length > maxLength
                    ? fullText.substring(0, maxLength) + "..."
                    : fullText;

                return (
                    <div style={{ whiteSpace: "normal", wordWrap: "break-word" }}>
                        {truncated}
                        {fullText.length > maxLength && (
                            <button
                                style={{ color: "#1976d2", border: "none", background: "none", cursor: "pointer" }}
                                onClick={() => setFeedbackDialog({ open: true, text: fullText })}
                            >
                                Read more
                            </button>
                        )}
                    </div>
                );
            }
        },
        {
            field: 'isotopes',
            headerName: 'Isotopes',
            minWidth: 100,
            flex: 1,
            valueGetter: (value) => {
                if (value === "") return "Unknown";
                else return value;
            }
        },
        {
            field: 'filePaths',
            headerName: 'FilePaths',
            minWidth: 100,
            flex: 1,
            renderCell: (params) => {
                const paths: string[] = Array.isArray(params.value) ? params.value : [];
                if (paths.length === 0) return null;
                return (
                    <span>
                        {paths.map((path, index) =>

                            <React.Fragment key={index}>
                                {index > 0 && ', '}
                                {nodeEndpoint ? (
                                    <a
                                        href={nodeEndpoint + path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#1976d2', textDecoration: 'underline' }}
                                    >
                                        {path.split("/")[1]}
                                    </a>
                                ) : path}
                            </React.Fragment>
                        )}
                    </span>
                );
            }
        },
        {
            field: 'secondaryInspectionStatus',
            headerName: 'Secondary Inspection',
            minWidth: 120,
            flex: 1,
        },
        {
            field: 'vehicleId',
            headerName: 'Vehicle ID',
            minWidth: 80,
            flex: 0.8,
            valueGetter: (value) => {
                if (value === "") return "Unknown";
                else return value;
            }
        },
    ];

    useEffect(() => {
        if (props.node == null || !props.node.address || !props.node.port)
            return;
        const protocol = props.node.isSecure ? 'https://' : 'http://';
        const endpoint =  `${protocol}${props.node.address}:${props.node.port}${props.node.oshPathRoot}${props.node.bucketsEndpoint}/`

        setNodeEndpoint(endpoint)
    }, [props.node]);


    const fetchStatuses = useCallback(async() => {
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        let controlStream: typeof ControlStream = currLaneEntry.controlStreams.find((cs) => isAdjudicationControlStream(cs));
        if(!controlStream) {
            console.warn("No Adjudication control stream found for this lane");
            return;
        }
        // TODO: Paginate this
        let commandStatuses = await controlStream.searchStatus(new ControlStreamFilter({ statusCode: "COMPLETED" }), 100);

        while (commandStatuses.hasNext()) {
            let cmdRes = await commandStatuses.nextPage();

            let adjDataArr = cmdRes.map((obs: any) => {
                if (!obs?.results)
                    return null;

                let results = obs?.results[0].data;
                let data = new AdjudicationData(obs.reportTime, props.event.occupancyCount, results.occupancyObsId);
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
    }, []);

    useEffect(() => {
        if (props.event)
            fetchStatuses();
    }, [props.event]);

    useEffect(() => {
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);


        let controlStream: typeof ControlStream = currLaneEntry.controlStreams.find((cs) => isAdjudicationControlStream(cs));
        if(!controlStream) {
            console.warn("No Adjudication control stream found for this lane");
            return;
        }

        let controlSource = currLaneEntry.createRealTimeConSysApi(controlStream);

        if (!controlSource) {
            console.warn("Cannot create rt datasource for this controlstream");
            return;
        }

        const handleStatuses = (data: any) => {
            const newAdjData: AdjudicationData[] = [];

            const values = data?.values ?? [];
            for (const value of values) {
                const statusData = value?.data;
                if (!statusData?.results) continue;

                for (const result of statusData.results) {
                    const results = result?.data;
                    if (!results) continue;

                    let adjData = new AdjudicationData(statusData.reportTime, props.event.occupancyCount, results.occupancyObsId);
                    adjData.setFeedback(results.feedback);
                    adjData.setIsotopes(results.isotopes ?? NaN);
                    adjData.setSecondaryInspectionStatus(results.secondaryInspectionStatus);
                    adjData.setAdjudicationCode(AdjudicationCodes.getCodeObjByIndex(results.adjudicationCode));
                    adjData.setVehicleId(results.vehicleId ?? NaN);
                    adjData.setFilePaths(results.filePaths ?? NaN)
                    adjData.setTime(statusData.reportTime)
                    adjData.setOccupancyCount(props.event.occupancyCount);
                    adjData.setOccupancyObsId(results.occupancyObsId);
                    adjData.setUser(results.username ?? NaN)
                    newAdjData.push(adjData);
                }
            }
            setAdjLog(prev => [...prev, ...newAdjData]);
        }

        controlSource.subscribe(handleStatuses, [EventType.DATA])
        try {
            controlSource.connect();
        }  catch (err) {
            console.error("Error connecting webid source:", err);
        }
    }, [props.event]);

    useEffect(() => {
        let filteredLog = adjLog.filter((adjData) => adjData?.occupancyObsId ==  props.event.occupancyObsId);
        setFilteredLog(filteredLog);
    }, [adjLog]);



    return (
        <>
            <Stack spacing={2} sx={{ width: '100%' }}>
                <Stack direction={"column"} spacing={1}>
                    <Typography variant="h5">Logged Adjudications</Typography>
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
                    open={feedbackDialog.open}
                    onClose={() => setFeedbackDialog({ open: false, text: "" })}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Feedback</DialogTitle>
                    <DialogContent>
                        <Typography whiteSpace="pre-wrap">
                            {feedbackDialog.text}
                        </Typography>
                    </DialogContent>
                </Dialog>
            </Stack>
        </>
    );
}
