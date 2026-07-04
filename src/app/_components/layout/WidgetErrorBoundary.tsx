"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {Box, Typography} from "@mui/material";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

interface Props {
    children: React.ReactNode;
    widgetName?: string;
}

interface State {
    hasError: boolean;
}

/** One broken widget must not take down the whole page. */
export default class WidgetErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {hasError: false};
    }

    static getDerivedStateFromError(): State {
        return {hasError: true};
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error(`Widget "${this.props.widgetName ?? 'unknown'}" crashed:`, error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '100%', gap: 1, p: 2,
                }}>
                    <ErrorOutlineRoundedIcon color="error"/>
                    <Typography variant="body2" color="text.secondary" align="center">
                        {this.props.widgetName ?? 'Widget'} failed to render
                    </Typography>
                </Box>
            );
        }
        return this.props.children;
    }
}
