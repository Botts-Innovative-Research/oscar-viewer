/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useAppDispatch} from "@/lib/state/Hooks";
import React, {useContext, useEffect, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {Grid, Typography} from "@mui/material";
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
        <Grid item id="event-preview-video"></Grid>
    )
}