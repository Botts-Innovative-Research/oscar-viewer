import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import React, {useCallback, useEffect, useRef, useState} from "react";
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLatestGB} from "@/lib/state/EventPreviewSlice";
import Box from "@mui/material/Box";
import {Grid, Paper} from "@mui/material";
import N42ChartPlayback from "@/app/_components/n42/N42ChartPlayback";
import DataStreamFilter from "osh-js/source/core/consysapi/datastream/DataStreamFilter";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream.js";
import {isRs350DataStream} from "@/lib/data/oscar/Utilities";


export default function EventMedia({selectedNode, datasources, eventData, mode, laneMap}: {selectedNode: any, datasources: typeof ConSysApi, eventData: EventTableData, mode: string,  laneMap: Map<string, LaneMapEntry>},) {
    let latestGB = useSelector((state: RootState) => selectLatestGB(state));

    const [videoCurrentTime, setVideoCurrentTime] = useState<number | null>(null);
    const [videoIsPlaying, setVideoIsPlaying] = useState(true);
    const selectedIndex = useRef<number>(0)
    const [rs350DataStream, setRs350DataStream] = useState();

    const handleVideoTimeUpdate = (timeMs: number) => {
        if ( !videoIsPlaying ) return;
        setVideoCurrentTime(timeMs);
    };

    const handleUpdatingPage = (page: number)=> {
        selectedIndex.current = page;
    }


    useEffect(() => {
        if (eventData.isRS350 && laneMap) {
            const entry = laneMap.get(eventData.laneId);

            const dss = entry.datastreams.find((ds: typeof DataStream)=> isRs350DataStream(ds));

            setRs350DataStream(dss);
        }
    }, [eventData, laneMap]);

    if ( mode === "preview" ){
        return(
            <Paper variant='outlined' sx={{ width: "100%" }}>
                <Box sx={{ width: "100%", height: "100%", alignItems: "center" }}>
                    {eventData.isRS350 ? (

                        <>
                            <N42ChartPlayback datastream={rs350DataStream} title={"Foreground Linear Spectrum"} chartId={"linear-spec-replay-fg"} currentTime={videoCurrentTime}/>
                            {/*<N42ChartPlayback datastream={} title={"Foreground Linear Spectrum"} chartId={"linear-spec-replay-fg"} startTime={eventData.startTime} endTime={eventData.endTime} currentTime={videoCurrentTime}/>*/}
                        </>

                    ) : (
                        <ChartTimeHighlight
                            datasources={{
                                gamma: datasources.gamma,
                                neutron: datasources.neutron,
                                threshold: datasources.threshold
                            }}
                            modeType={mode}
                            eventData={eventData}
                            latestGB={latestGB}
                            currentTime={videoCurrentTime}
                        />
                    )}
                </Box>
                <Box sx={{ width: "100%", height: "100%" }}>
                    <LaneVideoPlayback
                        selectedNode={selectedNode}
                        videos={eventData?.videoPaths}
                        modeType={mode}
                        startTime={eventData.startTime}
                        endTime={eventData.endTime}
                        isPlaying={videoIsPlaying}
                        syncTime={videoCurrentTime}
                        onVideoTimeUpdate={handleVideoTimeUpdate}
                        onSelectedVideoIdxChange={handleUpdatingPage}
                    />
                </Box>
            </Paper>
        )
    }

    if ( mode === "details" ) {
        return (
            <Paper variant='outlined' sx={{ width: "100%" }}>
                <Box>
                    <Grid container
                          direction="row"
                          spacing={2}
                          justifyContent={"center"}
                    >
                        <Grid item xs={12} md={6}>
                            {eventData.isRS350 ? (
                                <>
                                    <N42ChartPlayback datastream={rs350DataStream} title={"Foreground Linear Spectrum"} chartId={"linear-spec-replay-fg"} currentTime={videoCurrentTime}/>

                                    {/*<N42ChartPlayback datastream={} title={"Foreground Linear Spectrum"} chartId={"linear-spec-replay-fg"} startTime={eventData.startTime} endTime={eventData.endTime} />*/}
                                </>
                            ) : (
                                <ChartTimeHighlight
                                    datasources={{
                                        gamma: datasources.gamma,
                                        neutron: datasources.neutron,
                                        threshold: datasources.threshold
                                    }}
                                    modeType={mode}
                                    eventData={eventData}
                                    latestGB={latestGB}
                                    currentTime={videoCurrentTime}
                                />
                            )}
                        </Grid>
                        <Grid item xs={12}  md={6}>
                            <LaneVideoPlayback
                                selectedNode={selectedNode}
                                videos={eventData?.videoPaths}
                                modeType={mode}
                                startTime={eventData.startTime}
                                endTime={eventData.endTime}
                                syncTime={videoCurrentTime}
                                isPlaying={videoIsPlaying}
                                onVideoTimeUpdate={handleVideoTimeUpdate}
                                onSelectedVideoIdxChange={handleUpdatingPage}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        )
    }
}