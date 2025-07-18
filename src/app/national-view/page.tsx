"use client";

import {Box, Button, Grid, Paper, Typography, Stack} from "@mui/material";
import NationalStatsTable from "../_components/national/NationalStatsTable";

import NationalDatePicker from "../_components/national/NationalDatePicker";
import FaultStatsRow from "@/app/_components/reports/FaultStatsRow";
import OccAndAlarmStatsRow from "@/app/_components/reports/OccAndAlarmStatsRow";
import React, {useRef, useState} from "react";
import SiteMenuSelection from "../_components/national/SiteMenuSelection";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {PictureAsPdfRounded} from "@mui/icons-material";
import {useReactToPrint} from "react-to-print";


export default function NationalViewPage() {


    //todo: populate menu with the list of site names this will be used to update the fault and alarm/occ stats

    const nodes = useSelector((state: RootState) => state.oshSlice.nodes);
    const[site, setSite] = useState('');
    const[selectedNode, setSelectedNode] = useState(nodes[0]);

    const contentRef = useRef<HTMLDivElement>(null);
    const time = new Date().toISOString();
    const docTitle = `nationalview-${time}`;

    const reactToPrintFn = useReactToPrint({
        contentRef: contentRef,
        documentTitle: docTitle,
        onAfterPrint: () => console.log('Successfully saved as a PDF.')
    });


    function handleSiteSelection(value: string){
        setSite(value);

        setSelectedNode(nodes.find((node: any) => node.name === value));
    }
    

    return (
        <div ref={contentRef}>
            <Stack spacing={4} direction={"column"} sx={{width: "100%"}}>
                <Grid container spacing={4} alignItems="center">
                    <Grid item xs>
                        <Typography variant="h4">National View</Typography>
                    </Grid>

                    <Grid item xs={2}>
                        <Button
                            variant="outlined"
                            startIcon={<PictureAsPdfRounded />}
                            onClick={() => {
                                console.log('contentref: ', contentRef.current);
                                reactToPrintFn()
                            }}
                        >
                            Export as PDF
                        </Button>
                    </Grid>

                </Grid>

                <Grid item container spacing={2} sx={{ width: "100%" }}>
                    <Grid item xs={12}>
                        <Paper variant='outlined' sx={{width: '100%', p:2 }}>
                            <Grid container spacing={2} alignItems="center">
                                {/*<Grid item xs={2}>*/}
                                {/*    <SiteMenuSelection siteValue={site} onSelect={handleSiteSelection} />*/}
                                {/*</Grid>*/}

                                <Grid item xs={12}>
                                    <Typography variant="h6">Fault Statistics</Typography>
                                </Grid>

                                <Grid item xs={12}>
                                    <Paper variant='outlined' sx={{width: '100%'}}>
                                        <FaultStatsRow filterByLane={false} filterBySite={true}/>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="h6">Occupancy and Alarm Statistics</Typography>
                                </Grid>

                                <Grid item xs={12}>
                                    <Paper variant='outlined' sx={{width: '100%'}}>
                                        <OccAndAlarmStatsRow  filterByLane={false} filterBySite={true}/>
                                    </Paper>
                                </Grid>
                            </Grid>

                        </Paper>
                    </Grid>

                   <Grid item xs={12}>
                       <Paper variant='outlined' sx={{width: '100%', p:2 }}>
                           <NationalDatePicker/>
                           <Paper variant='outlined' sx={{height: "100%"}}>
                               <NationalStatsTable/>
                           </Paper>
                       </Paper>
                   </Grid>
                </Grid>
            </Stack>
        </div>
    );
}