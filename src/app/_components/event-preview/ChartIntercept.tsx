/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useAppDispatch} from "@/lib/state/Hooks";
import {useCallback, useContext, useEffect, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {Typography} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectEventPreview} from "@/lib/state/OSCARClientSlice";
import {current} from "@reduxjs/toolkit";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";

export default function ChartIntercept() {
    const dispatch = useAppDispatch();
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const eventPreview = useSelector((state: RootState) => selectEventPreview(state));

    // chart specifics
    const timeVert = useState<Date>;
    const horizontalThreshold = useState<number>(0);

    const collectDatasources = useCallback(() => {
        let currentLane = eventPreview.eventData.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        console.log("currentLaneEntry for ChartIntercept", currLaneEntry);
        // currLaneEntry.
        // find Gamma DS in LaneMapRef

        // find Neutron DS in LaneMapRef

    }, [dispatch, eventPreview]);

    useEffect(() => {
        collectDatasources();
    }, [dispatch, eventPreview]);

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                [Chart Goes Here]
            </Typography>
        </div>
    )
}
