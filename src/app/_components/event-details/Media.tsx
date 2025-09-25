import {Box, Grid, Paper} from "@mui/material";
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";
import React, { useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import CircularProgress from "@mui/material/CircularProgress";
import {selectLatestGB} from "@/lib/state/EventPreviewSlice";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";


export default function Media({eventData, datasources, laneMap}: {eventData: EventTableData, datasources: typeof ConSysApi, laneMap: any}){

    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false)
    let latestGB = useSelector((state: RootState) => selectLatestGB(state));

    useEffect(() => {
        if (eventData && datasources)
            setDatasourcesReady(true);

    }, [datasources, eventData]);

    useEffect(() => {
        if (datasources.gamma)
            datasources?.gamma.connect()

        if (datasources.neutron)
            datasources?.neutron.connect()

        if (datasources.threshold)
            datasources?.threshold.connect()

    }, [datasourcesReady, datasources]);


    return (
        <Paper variant='outlined' sx={{ width: "100%" , padding: 2}}>
            {datasourcesReady && latestGB ? (
                <Box>
                    <Grid
                        container
                        direction="row"
                        spacing={2}
                        justifyContent={"center"}
                    >
                        <Grid item xs={12} md={6}>
                            <ChartTimeHighlight
                                datasources={{
                                    gamma:  datasources.gamma,
                                    neutron:  datasources.neutron,
                                    threshold: datasources.threshold,
                                }}
                                modeType="detail"
                                eventData={eventData}
                                latestGB={latestGB}
                            />

                        </Grid>
                        <Grid item xs={12} md={6}>
                            <video autoPlay controls height="320" width="100%">
                                {eventData?.videoFiles?.map((video, index) => (
                                    <source key={index} src={video.trim()} type="video/mp4" />
                                ))}
                                Your browser does not support the video tag.
                            </video>
                        </Grid>
                    </Grid>

                </Box>
            ):
                <Box
                    sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}
                >
                    <CircularProgress/>
                </Box>
            }
        </Paper>
    )
}