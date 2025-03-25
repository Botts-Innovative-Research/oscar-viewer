"use client";

import {Box, Grid, Paper, Stack, Typography} from "@mui/material";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import BackButton from "../_components/BackButton";
import DataRow from "../_components/event-details/DataRow";

import MiscTable from "../_components/event-details/MiscTable";
import {useDispatch, useSelector} from "react-redux";
import {
    selectEventData,
} from '@/lib/state/EventDetailsSlice';

import ChartTimeHighlight from "../_components/event-preview/ChartTimeHighlight";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import AdjudicationDetail from "@/app/_components/adjudication/AdjudicationDetail";
import TimeController from "@/app/_components/TimeController";
import {EventType} from "osh-js/source/core/event/EventType";

import {store} from "@/lib/state/Store";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useSearchParams} from "next/navigation";
import Media from "@/app/_components/event-details/Media";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {selectEventPreview} from "@/lib/state/EventPreviewSlice";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {selectCurrentUser} from "@/lib/state/OSCARClientSlice";



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
    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof SweApi[]>>(new Map<string, typeof SweApi[]>());
    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);

    const [gammaDatasources, setGammaDS] = useState<typeof SweApi[]>([]);
    const [neutronDatasources, setNeutronDS] = useState<typeof SweApi[]>([]);
    const [occDatasources, setOccDS] = useState<typeof SweApi[]>([]);
    const [thresholdDatasources, setThresholdDS] = useState<typeof SweApi[]>([]);
    const [videoDatasources, setVideoDatasources] = useState<typeof SweApi[]>([]);


    const collectDataSources = useCallback(() => {
        if(!eventPreview.eventData?.laneId || !laneMapRef.current) return;

        let currentLane = eventPreview.eventData.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        if (!currLaneEntry) {
            console.error("LaneMapEntry not found for:", currentLane);
            return;
        }

        console.log("Collecting DataSources...", currLaneEntry, currentLane);

        let tempDSMap = new Map<string, typeof SweApi[]>();

        let datasources = currLaneEntry.getDatastreamsForEventDetail(eventPreview.eventData.startTime, eventPreview.eventData.endTime);
        console.log("MY DATASOURCES ", datasources);

        setLocalDSMap(datasources);
        tempDSMap = datasources;

        console.log("LocalDSMap", localDSMap);

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
        console.log('state', store.getState())
        console.log('lanemapref', laneMapRef)
        if(laneMapRef.current && eventPreview)
            collectDataSources();
    }, [eventPreview, laneMapRef.current]);

    console.log("jack data", gammaDatasources, neutronDatasources, thresholdDatasources)

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

            { (gammaDatasources.length > 0 || neutronDatasources.length > 0 || thresholdDatasources.length > 0) &&

                <Media eventData={eventPreview.eventData}  datasources={{
                    gamma: gammaDatasources?.[0],
                    neutron: neutronDatasources?.[0],
                    threshold: thresholdDatasources?.[0],
                    video: videoDatasources
                }}
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