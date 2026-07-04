"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import MapComponent from "@/app/_components/maps/MapComponent";
import {MapWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetProps} from "@/app/_components/layout/WidgetTypes";

export default function MapWidget({widget}: WidgetProps) {
    const config = widget.config as MapWidgetConfig;
    // Unique, stable DOM id per widget instance — Leaflet containers collide otherwise.
    const containerId = `map-widget-${widget.id}`;
    return (
        <MapComponent
            laneFilter={config.lanes ?? {mode: 'all'}}
            containerId={containerId}
            height="100%"
        />
    );
}
