/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

"use client";

import {useSelector} from "react-redux";
import {selectLaneMap} from "@/lib/state/OSCARClientSlice";
import {RootState} from "@/lib/state/Store";
import {useEffect, useRef} from "react";
import VideoView from "osh-js/source/core/ui/view/video/VideoView";
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer";

export default function TestComponent() {
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const videoViewRef = useRef<typeof VideoView>();

    useEffect(() => {
        if (laneMap.size > 0 && !videoViewRef.current) {
            // console.log("TEST lanemap: ", laneMap);
            let aDS = laneMap.get("lane1").datastreams[36];
            // console.log("TEST datasource: ", aDS);

            let ds = laneMap.get("lane1").datasourcesRealtime[36];

            videoViewRef.current = new VideoView({
                container: "video-container",
                showStats: true,
                showTime: true,
                layers: [new VideoDataLayer({
                    dataSourceId: ds.id,
                    getFrameData: (rec: any) => rec.img,
                    getTimestamp: (rec: any) => rec.timestamp,
                })]
            });

            ds.connect();
        }

        return () => {
            if (videoViewRef.current) {
                videoViewRef.current.destroy();
                videoViewRef.current = undefined;
            }
        }
    }, [laneMap]);

    return (
        <div>
            <h1>Test Component</h1>
            <div id="video-container"></div>
        </div>
    );
}
