"use client";

import {Grid, Paper, Stack, Typography} from "@mui/material";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import BackButton from "../_components/BackButton";
import DataRow from "../_components/event-details/DataRow";

import MiscTable from "../_components/event-details/MiscTable";
import {useSelector} from "react-redux";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import AdjudicationDetail from "@/app/_components/adjudication/AdjudicationDetail";
import Media from "@/app/_components/event-details/Media";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {selectEventPreview, setSelectedRowId} from "@/lib/state/EventPreviewSlice";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";


/**
 * Expects the following search params:
 * startTime: string;
 * endTime: string;
 *
 * Need to implement an error page to handle invalid/no search params
 */

export default function EventDetailsPage() {

    const eventPreview = useSelector(selectEventPreview);
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof ConSysApi[]>>(new Map<string, typeof ConSysApi[]>());
    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);

    const [gammaDatasources, setGammaDS] = useState<typeof ConSysApi[]>([]);
    const [neutronDatasources, setNeutronDS] = useState<typeof ConSysApi[]>([]);
    const [occDatasources, setOccDS] = useState<typeof ConSysApi[]>([]);
    const [thresholdDatasources, setThresholdDS] = useState<typeof ConSysApi[]>([]);
    const [videoDatasources, setVideoDatasources] = useState<typeof ConSysApi[]>([]);


    const collectDataSources = useCallback(async() => {
        if(!eventPreview.eventData?.laneId || !laneMapRef.current) return;

        let currentLane = eventPreview.eventData.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        if (!currLaneEntry) {
            console.error("LaneMapEntry not found for:", currentLane);
            return;
        }

        // @ts-ignore
        let tempDSMap: Map<string, typeof ConSysApi[]>;

        let datasources = await currLaneEntry.getDatastreamsForEventDetail(eventPreview.eventData.startTime, eventPreview.eventData.endTime);
        setLocalDSMap(datasources);
        tempDSMap = datasources;


        if(!tempDSMap){
            return;
        }

        const updatedGamma = tempDSMap.get("gamma") || [];
        const updatedNeutron = tempDSMap.get("neutron") || [];
        const updatedThreshold = tempDSMap.get("gammaTrshld") || [];
        const updatedVideo = tempDSMap.get("video") || [];
        const updatedOcc = tempDSMap.get("occ") || [];

        setGammaDS(updatedGamma);
        setNeutronDS(updatedNeutron);
        setThresholdDS(updatedThreshold);
        setVideoDatasources(updatedVideo);
        setOccDS(updatedOcc);
        setDatasourcesReady(true);


    }, [eventPreview, laneMapRef]);


    useEffect(() => {

        async function callCollectDatasources(){
            await collectDataSources();
        }


        if(laneMapRef.current && eventPreview) {
            callCollectDatasources();
        }
    }, [eventPreview, laneMapRef.current]);




    return (
        <Stack spacing={4} direction={"column"} sx={{width: "100%"}}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={"auto"} >
                    <BackButton/>
                </Grid>
                <Grid item xs>
                    <Typography variant="h4">Event Details</Typography>
                </Grid>
            </Grid>

            <Paper variant='outlined' sx={{ width: '100%'}}>
                <DataRow/>
            </Paper>

            { (gammaDatasources.length > 0 || neutronDatasources.length > 0 || thresholdDatasources.length > 0) && laneMapRef &&

                <Media eventData={eventPreview.eventData}  datasources={{
                    gamma: gammaDatasources?.[0],
                    neutron: neutronDatasources?.[0],
                    threshold: thresholdDatasources?.[0],
                    video: videoDatasources
                }}
                       laneMap={laneMapRef.current}
                />

            }

            <Paper variant='outlined' sx={{width: "100%"}}>
                <MiscTable currentTime={eventPreview.eventData?.startTime}/>
            </Paper>

            <Paper variant='outlined' sx={{width: "100%"}}>
                <AdjudicationDetail event={eventPreview.eventData}/>
            </Paper>

        </Stack>
    );
}