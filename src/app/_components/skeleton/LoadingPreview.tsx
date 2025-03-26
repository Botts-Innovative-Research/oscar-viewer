'use client'

import { Box, Grid, Paper, Skeleton, Stack } from "@mui/material";
import React from "react";

export default function Loading() {
    return (
        <>
            <Paper variant="outlined" sx={{ width: '100%', height: '100%', p: 2 }}>
                <Skeleton variant="rectangular" width="100%" height="100%" style={{ borderRadius: 12 }} />
            </Paper>
        </>

    );
}
