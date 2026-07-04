"use client";

import React, {useContext} from "react";
import {Box} from "@mui/material";
import {useSelector} from "react-redux";
import BackButton from "../_components/BackButton";
import PageHost from "@/app/_components/layout/PageHost";
import PageToolbar from "@/app/_components/layout/PageToolbar";
import RS350BackpackView from "../_components/lane-view/RS350BackpackView";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";

export default function LaneViewPage() {
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const {laneMapRef} = useContext(DataSourceContext);
    const currentLane = useSelector((state: RootState) => state.laneView.currentLane);

    const entry = currentLane ? laneMapRef.current?.get(currentLane) : undefined;

    // RS350 backpack lanes keep their dedicated view; portal lanes get the
    // configurable widget page.
    if (entry?.isRS350Backpack) {
        return (
            <Box sx={{width: '100%'}}>
                <PageToolbar pageId="lane-view" leading={<BackButton/>}/>
                <RS350BackpackView entry={entry} currentLane={currentLane} laneMap={laneMap}/>
            </Box>
        );
    }

    return (
        <Box sx={{width: '100%'}}>
            <PageToolbar pageId="lane-view" leading={<BackButton/>}/>
            <PageHost pageId="lane-view"/>
        </Box>
    );
}
