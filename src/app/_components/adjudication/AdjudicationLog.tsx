"use client";

import React, {useContext, useEffect, useState} from "react";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {DataGrid, GridColDef} from "@mui/x-data-grid";
import { Box, Grid, Paper, Stack, Typography} from "@mui/material";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {isAdjudicationControlStream} from "@/lib/data/oscar/Utilities";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import ControlStreamFilter from "osh-js/source/core/consysapi/controlstream/ControlStreamFilter";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";



export default function AdjudicationLog(props: {
    event: EventTableData;
    shouldFetch: boolean;
    onFetch: () => void;
}) {

    const locale = navigator.language || 'en-US';
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [adjLog, setAdjLog] = useState<AdjudicationData[]>([]);
    const [filteredLog, setFilteredLog] = useState<AdjudicationData[]>([]);
    const [laneAdjControlStream, setLaneAdjControlStream] = useState<typeof ControlStream>();

    const [feedbackDialog, setFeedbackDialog] = useState({
        open: false,
        text: ""
    });

    const logColumns: GridColDef<AdjudicationData>[] = [
        {
            field: 'occupancyCount',
            headerName: 'Occupancy ID',
            // width: 175,
            type: 'string',
        },
        {
            field: 'username',
            headerName: 'User',
            // width: 150,
            type: 'string',
        },
        {
            field: 'time',
            headerName: 'Timestamp',
            // width: 200,
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
            field: 'feedback',
            headerName: 'Feedback',
            // width: 250,
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
            field: 'secondaryInspectionStatus',
            headerName: 'Secondary Inspection Status',
            // width: 200
        },
        {
            field: 'adjudicationCode',
            headerName: 'Adjudication Code',
            // width: 400,
            valueGetter: (value, row) => {
                return row.adjudicationCode.label
            }
        },
        {
            field: 'isotopes',
            headerName: 'Isotopes',
            // width: 200,
            valueGetter: (value) => {
                if (value === "") return "Unknown";
                else return value;
            }
        },
        {
            field: 'filePaths',
            headerName: 'FilePaths',
            // width: 200,
            type: 'string'
        },
        {
            field: 'vehicleId',
            headerName: 'Vehicle ID',
            // width: 150,
            valueGetter: (value) => {
                if (value === "") return "Unknown";
                else return value;
            }
        },
    ];
    async function getControlStream(){
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        let streams = currLaneEntry.controlStreams.length > 0 ? currLaneEntry.controlStreams : await currLaneEntry.parentNode.fetchNodeControlStreams();
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
        // TODO: Paginate this
        let commandStatuses = await controlStream.searchStatus(new ControlStreamFilter({ statusCode: "COMPLETED" }), 100);

        while (commandStatuses.hasNext()) {
            let cmdRes = await commandStatuses.nextPage();

            let adjDataArr = cmdRes.map((obs: any) => {
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
        <Grid container spacing={2} xs={12}>
            <Grid item xs={12}>
                <Typography variant="h5">Logged Adjudications</Typography>
            </Grid>
            <Grid item xs={12}>
                <Paper variant="outlined" sx={{ padding: 0 }}>
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
                        sx={{
                            border: "none",
                            width: "100%",
                            minHeight: 200
                        }}
                    />
                </Paper>
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
            </Grid>
        </Grid>
    );
}
