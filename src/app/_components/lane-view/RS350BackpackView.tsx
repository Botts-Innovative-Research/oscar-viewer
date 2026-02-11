"use client";

import React from "react";
import { Grid, Paper, Typography, Stack } from "@mui/material";
import { LaneMapEntry } from "@/lib/data/oscar/LaneCollection";

interface RS350BackpackViewProps {
    entry: LaneMapEntry;
    currentLane: string;
}

export default function RS350BackpackView({ entry, currentLane }: RS350BackpackViewProps) {
    return (
        <Stack spacing={2} direction="column" sx={{ width: "100%" }}>
            <Paper variant="outlined" sx={{ width: "100%", padding: 2 }}>
                <Typography variant="h6" gutterBottom>
                    RS350 Backpack - {currentLane}
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ padding: 2, height: "100%" }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                Status
                            </Typography>
                            {/* TODO: Add RS350 status data display */}
                            <Typography variant="body2" color="text.secondary">
                                Status data will be displayed here
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ padding: 2, height: "100%" }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                Foreground Report
                            </Typography>
                            {/* TODO: Add RS350 foreground data display */}
                            <Typography variant="body2" color="text.secondary">
                                Foreground report data will be displayed here
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ padding: 2, height: "100%" }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                Background Report
                            </Typography>
                            {/* TODO: Add RS350 background data display */}
                            <Typography variant="body2" color="text.secondary">
                                Background report data will be displayed here
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ padding: 2, height: "100%" }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                Alarms
                            </Typography>
                            {/* TODO: Add RS350 alarm data display */}
                            <Typography variant="body2" color="text.secondary">
                                Alarm data will be displayed here
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>
        </Stack>
    );
}
