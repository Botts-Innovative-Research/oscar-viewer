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
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream.js";

export default function TestComponent() {
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const videoViewRef = useRef<VideoView>();

    function sweapiFromDSObj(dsObj: DataStream) {
        return new SweApi(dsObj.id, {
            protocol: dsObj.networkProperties.streamProtocol,
            endpointUrl: dsObj.networkProperties.endpointUrl,
            resource: `/datastreams/${dsObj.properties.id}/observations`,
            tls: dsObj.networkProperties.tls,
            responseFormat: dsObj.properties.outputName === "video" ? 'application/swe+binary' : 'application/swe+json',
            connectorOpts: {
                username: "admin",
                password: "admin"
            }
        });
    }

    useEffect(() => {
        if (laneMap.size > 0 && !videoViewRef.current) {
            console.log("TEST lanemap: ", laneMap);
            let aDS = laneMap.get("lane1").datastreams[36];
            console.log("TEST datasource: ", aDS);

            // let ds = sweapiFromDSObj(aDS);
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
