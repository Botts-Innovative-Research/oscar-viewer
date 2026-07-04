"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import LaneStatus from "@/app/_components/dashboard/LaneStatus";
import {SystemStatusWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetProps} from "@/app/_components/layout/WidgetTypes";

export default function SystemStatusWidget({widget}: WidgetProps) {
    const config = widget.config as SystemStatusWidgetConfig;
    return <LaneStatus lanes={config.lanes ?? {mode: 'all'}} hideTitle/>;
}
