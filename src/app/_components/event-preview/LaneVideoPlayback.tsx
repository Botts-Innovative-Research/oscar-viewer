/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useAppDispatch} from "@/lib/state/Hooks";
import React, {useContext, useEffect, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {Typography} from "@mui/material";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import VideoView from "osh-js/source/core/ui/view/video/VideoView";
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";

export class LaneVideoPlaybackProps {
    videoDatasources: typeof SweApi[];
    setVideoReady: Function;
    dataSynchronizer: typeof DataSynchronizer;
    addDataSource: Function;
}

export default function LaneVideoPlayback({
                                              videoDatasources,
                                              setVideoReady,
                                              dataSynchronizer,
                                              addDataSource
                                          }: LaneVideoPlaybackProps) {
    const dispatch = useAppDispatch();
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [dataSources, setDatasources] = useState<typeof SweApi[]>([]);
    const videoViewRef = useRef<typeof VideoView>();
    const [selVideoIdx, setSelVidIdx] = useState<number>(0);
    const [localVideoReady, setLocalVideoReady] = useState<boolean>(false);

    useEffect(() => {
        console.log("PLAYBACK SOURCES: ");
        console.log(videoDatasources);

        if(videoDatasources.length > 0) {
            return;
        }
        const rtds = videoDatasources[0];
        const prefix: string = rtds.properties.tls ? "https" : "http";
        const dsEndpoint: string = rtds.properties.endpointUrl;
        const dsObsResource: string = rtds.properties.resource;
        let dsBaseResourceSplit: string[] = dsObsResource.split("/");
        dsBaseResourceSplit.pop();
        const dsBaseResource: string = dsBaseResourceSplit.join("/");


        // TODO: Fetch datastream info to retrieve systemUID, outputName
        // TODO: Search ConSys API for datastream that matches outputName = "systemUID:outputName" of rtds
        // with RasterImage definition, and systemUID starting with "urn:osh:process:"
        // TODO: Add this historical video data from the process db to the videoDataSources to render


        console.log("ENDPOINT AND STUFF: ");
        console.log(dsEndpoint)
        console.log(dsObsResource);
        console.log(dsBaseResource);
        // Check if videosource has historical data, if not search for database process video data

        setDatasources(videoDatasources);
    }, [videoDatasources]);

    useEffect(() => {
        if (dataSources[selVideoIdx]) {

            addDataSource(selVideoIdx);

            videoViewRef.current = new VideoView({
                container: "event-preview-video",
                showStats: false,
                showTime: false,
                layers: [new VideoDataLayer({
                    dataSourceId: dataSources[selVideoIdx].id,
                    getFrameData: (rec: any) => rec.img,
                    getTimestamp: (rec: any) => rec.timestamp,
                })]
            });
            setVideoReady(true);
            setLocalVideoReady(true);
        } else {
            setVideoReady(false);
            setLocalVideoReady(false);
        }

        return () => {
            if (videoViewRef.current) {
                videoViewRef.current.destroy();
                videoViewRef.current = undefined;
            }
        }
    }, [dataSources, selVideoIdx]);

    useEffect(() => {
        console.log("LaneVideoPlayback: ", dataSources[selVideoIdx], videoViewRef.current);
        console.log("LaneVideoPlayback Synchro: ", dataSynchronizer);
    }, [localVideoReady]);


    return (
        <div>
            <div id="event-preview-video"></div>
        </div>
    )
}