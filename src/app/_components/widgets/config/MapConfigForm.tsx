"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import LaneSelectionField from "./LaneSelectionField";
import {MapWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetConfigFormProps} from "@/app/_components/layout/WidgetTypes";

export default function MapConfigForm({draft, onChange}: WidgetConfigFormProps) {
    const config = draft as MapWidgetConfig;
    return (
        <LaneSelectionField
            value={config.lanes ?? {mode: 'all'}}
            onChange={(lanes) => onChange({...config, lanes})}
        />
    );
}
