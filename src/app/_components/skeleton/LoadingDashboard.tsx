'use client'

import { Box, Grid, Paper, Skeleton, Stack } from "@mui/material";
import React from "react";

export default function LoadingDashboard() {
    return (
        <>
            {/*<Grid container spacing={2}  sx={{ display: 'flex'}}>*/}
            {/*    <Grid item spacing={2} style={{ flexBasis: '100%', flexGrow: 0, flexShrink: 0 }}>*/}
            {/*        <Paper variant='outlined' sx={{ flexGrow: 1, padding: 2, overflow: "hidden" }}>*/}
            {/*            <Skeleton variant="rectangular" width="100%" height={50} style={{borderRadius: 20}}/>*/}
            {/*        </Paper>*/}
            {/*    </Grid>*/}
            {/*</Grid>*/}

            {/*<Grid container spacing={2} direction={"column"} sx={{ mt: 1 }}>*/}

            {/*    <Grid item xs={2}>*/}
            {/*        <Paper variant="outlined" sx={{ height: "100%", padding: 2 }}>*/}
            {/*            <Stack spacing={2}>*/}
            {/*                {Array.from({ length: 6 }).map((_, index) => (*/}
            {/*                    <Skeleton key={index} variant="rectangular" width="100%" height={40} style={{ borderRadius: 12 }} />*/}
            {/*                ))}*/}
            {/*            </Stack>*/}
            {/*        </Paper>*/}
            {/*    </Grid>*/}
            {/*    <Grid item xs={10}>*/}
            {/*        <Grid item container spacing={2} style={{ flexBasis: '33.33%', flexGrow: 0, flexShrink: 0 }}>*/}
            {/*        <Grid item xs={8} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>*/}
            {/*            <Paper variant='outlined' sx={{ height: "auto", minHeight: 225, padding: 1 }}>*/}
            {/*                <Stack padding={2} justifyContent={"start"} spacing={1}>*/}
            {/*                    <Box sx={{ overflowY: "auto", maxHeight: 225, flexGrow: 1 }}>*/}
            {/*                        <Grid container columns={{ sm: 12, md: 24, lg: 36, xl: 48 }} spacing={1}>*/}
            {/*                            {Array.from({ length: 20 }).map((_, index) => (*/}
            {/*                                <Grid key={index} item sm={8} md={6} lg={6} xl={6}>*/}
            {/*                                    <Skeleton variant="text" width="100%" height={30} style={{borderRadius: 20}}/>*/}
            {/*                                </Grid>*/}
            {/*                            ))}*/}
            {/*                        </Grid>*/}
            {/*                    </Box>*/}
            {/*                </Stack>*/}
            {/*            </Paper>*/}

            {/*            <Paper variant='outlined' sx={{ flexGrow: 1, padding: 2, overflow: "hidden" }}>*/}
            {/*                <Box sx={{ flex: 1, width: '100%' }}>*/}
            {/*                    <Skeleton variant="rectangular" width="100%" height={900} style={{borderRadius: 20}}/>*/}
            {/*                </Box>*/}
            {/*            </Paper>*/}
            {/*        </Grid>*/}

            {/*        <Grid item xs={4}>*/}
            {/*            <Paper variant='outlined' sx={{ height: "100%" }}>*/}
            {/*                <Box sx={{ width: '100%', height: 1200, padding: 2, overflow: 'hidden' }}>*/}
            {/*                    <Skeleton variant="rectangular" width="100%" height="100%" style={{borderRadius: 20}}/>*/}
            {/*                </Box>*/}
            {/*            </Paper>*/}
            {/*        </Grid>*/}
            {/*    </Grid>*/}
            {/*    </Grid>*/}
            {/*</Grid>*/}


            <Grid container sx={{}}>
                {/* appbar  */}
                <Box sx={{ height: 64, px: 2, py: 1 }}>
                    <Skeleton variant="rectangular" width="100%" height={48} style={{ borderRadius: 12 }} />
                </Box>
            </Grid>
            <Grid container sx={{ height: '100vh' }}>
                {/* side navigation */}
                <Grid item sx={{ width: 80, bgcolor: 'grey.100', p: 1 }}>
                    <Stack spacing={2} alignItems="center">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} variant="circular" width={40} height={40} />
                        ))}
                    </Stack>
                </Grid>

                {/* Main Content */}
                <Grid item xs sx={{ display: 'flex', flexDirection: 'column' }}>

                    <Grid container spacing={2} sx={{ px: 2, pb: 2, flexGrow: 1 }}>

                        {/*Status and Occupancy*/}
                        <Grid item xs={8}>
                            <Stack spacing={2}>
                                <Skeleton variant="rectangular" width="100%" height={200} style={{ borderRadius: 12 }} />
                                <Skeleton variant="rectangular" width="100%" height={800} style={{ borderRadius: 12 }} />
                            </Stack>
                        </Grid>

                        {/* Map & Event Preview */}
                        <Grid item xs={4}>
                            <Skeleton variant="rectangular" width="100%" height="100%" style={{ borderRadius: 12 }} />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

        </>

    );
}
