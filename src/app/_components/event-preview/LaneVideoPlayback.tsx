/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useAppDispatch} from "@/lib/state/Hooks";
import React, {useContext} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {Typography} from "@mui/material";

export default function LaneVideoPlayback() {
    const dispatch = useAppDispatch();
    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    return (
        <div>
            <Typography variant="h4" color="textSecondary" gutterBottom>
                [Video Goes Here]
            </Typography>
        </div>
    )
}
