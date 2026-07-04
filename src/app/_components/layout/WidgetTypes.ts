/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import * as React from "react";
import {PageConfig, WidgetConfig, WidgetInstance} from "@/lib/layout/PageConfigTypes";

/** Contract every widget component in the registry implements. */
export interface WidgetProps {
    page: PageConfig;
    widget: WidgetInstance;
}

/** Contract for per-widget config forms hosted by WidgetConfigDialog. */
export interface WidgetConfigFormProps {
    page: PageConfig;
    widget: WidgetInstance;
    draft: WidgetConfig;
    onChange: (next: WidgetConfig) => void;
}

export type WidgetComponent = React.ComponentType<WidgetProps>;
export type WidgetConfigFormComponent = React.ComponentType<WidgetConfigFormProps>;
