"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {Suspense} from "react";
import {useSearchParams} from "next/navigation";
import {Box, CircularProgress} from "@mui/material";
import PageHost from "@/app/_components/layout/PageHost";
import PageToolbar from "@/app/_components/layout/PageToolbar";

/**
 * Host route for user-created pages: /custom-page/?id=<pageId>.
 * Static export emits a real custom-page/index.html, so hard reloads work on
 * plain static file servers (OSH node) and in Electron without SPA fallback.
 */
function CustomPageInner() {
    const searchParams = useSearchParams();
    const pageId = searchParams.get('id') ?? '';

    return (
        <Box sx={{width: '100%'}}>
            <PageToolbar pageId={pageId}/>
            <PageHost pageId={pageId}/>
        </Box>
    );
}

export default function CustomPage() {
    return (
        <Suspense fallback={
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh'}}>
                <CircularProgress/>
            </Box>
        }>
            <CustomPageInner/>
        </Suspense>
    );
}
