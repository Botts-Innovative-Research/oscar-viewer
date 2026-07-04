"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {ConfigurableEventTable} from "./EventTableWidget";
import {WidgetProps} from "@/app/_components/layout/WidgetTypes";

export default function AdjudicationTableWidget(props: WidgetProps) {
    return <ConfigurableEventTable {...props} adjudicationMode/>;
}
