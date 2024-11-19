/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */
'use client';

import React, {useCallback, useEffect, useRef, useState} from "react";
import {Box, Grid, ToggleButton, ToggleButtonGroup, Typography} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectEventPreview} from "@/lib/state/OSCARClientSlice";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView.js";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import annotationPlugin from 'chartjs-plugin-annotation';
import {Chart, registerables} from 'chart.js';
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {
    createGammaViewCurve,
    createNeutronViewCurve,
    createNSigmaCalcViewCurve,
    createThresholdViewCurve, createThreshSigmaViewCurve
} from "@/app/utils/ChartUtils";


Chart.register(...registerables, annotationPlugin);

export class ChartInterceptProps {
    setChartReady: Function;
    modeType: string;
    currentTime: any;
    datasources: { gamma: typeof SweApi, neutron: typeof SweApi, threshold: typeof SweApi };
}

export default function ChartTimeHighlight(props: ChartInterceptProps) {
    const eventPreview = useSelector((state: RootState) => selectEventPreview(state));

    const [chartsReady, setChartsReady] = useState<boolean>(false);
    const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);

    const gammaChartViewRef = useRef<HTMLDivElement | null>(null);
    const nSigmaChartViewRef = useRef<HTMLDivElement | null>(null);
    const neutronChartViewRef = useRef<HTMLDivElement | null>(null);

    const gammaChartBaseId = "chart-view-event-detail-gamma-";

    const neutronChartBaseId = "chart-view-event-detail-neutron-";

    const [gammaChartView, setGammaChartView] = useState<any>();
    const [nsigmaChartView, setGammaNsigmaChartView] = useState<any>();
    const [neutronChartView, setNeutronChartView] = useState<any>();


    const [toggleView, setToggleView] = useState("cps");

    const gammaToggleButtons = [
        <ToggleButton color= 'error' value={"cps"} key={"cps"}>CPS</ToggleButton>,
        <ToggleButton color= 'secondary' value={"sigma"} key={"sigma"}>NSigma</ToggleButton>
    ];

    // resets chart when event preview is closed
    const resetView = useCallback(() => {
        if (!eventPreview.isOpen) {
            setGammaChartView(null);
            setGammaNsigmaChartView(null);
            setNeutronChartView(null);
            setIsReadyToRender(false);
        }
    }, [eventPreview]);


    // determines if the charts are ready for rendering and updates
    const checkReadyToRender = useCallback(() => {
        if (chartsReady) {
            setIsReadyToRender(true);
        } else {
            setIsReadyToRender(false);
        }
    }, [chartsReady]);


    // generates element id for charts based on event status (gamma, neutron, both, or none)
    function updateChartElIds(eventData: EventTableData): string[] {
        let ids: string[] = [];
        let gammaId: string;
        let nsigmaId: string;
        let neutronId: string

        switch (eventData.status) {
            case "Gamma":
                gammaId = gammaChartBaseId + eventData.id + "-" + props.modeType;
                nsigmaId = "chart-view-event-detail-nsigma-" + eventData.id + "-" + props.modeType;
                ids.push(gammaId,nsigmaId);
                break;
            case "Neutron":
                neutronId = neutronChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(neutronId);
                break;
            case "Gamma & Neutron":
                gammaId = gammaChartBaseId + eventData.id + "-" + props.modeType;
                nsigmaId = "chart-view-event-detail-nsigma-" + eventData.id + "-" + props.modeType;
                neutronId = neutronChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(gammaId, neutronId, nsigmaId);
                break;
            case "None":
                gammaId = gammaChartBaseId + eventData.id + "-" + props.modeType;
                nsigmaId = "chart-view-event-detail-nsigma-" + eventData.id + "-" + props.modeType;
                neutronId = neutronChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(gammaId, neutronId, nsigmaId);
                break;
            default:
                break;
        }
        return ids;
    }


    useEffect(() => {
        if (eventPreview.eventData) {

            let elementIds: any[] = updateChartElIds(eventPreview.eventData);
            let layers = createCurveLayersAndReturn();

            //set up all refs
            let gammaChartElt = document.createElement("div");
            gammaChartElt.id =  elementIds.find(id=> id.includes('gamma'));
            gammaChartViewRef.current?.appendChild(gammaChartElt);

            let nsigmaChartElt = document.createElement("div");
            nsigmaChartElt.id = elementIds.find(id => id.includes('nsigma'));
            nSigmaChartViewRef.current?.appendChild(nsigmaChartElt);

            let neutronChartElt = document.createElement("div");
            neutronChartElt.id = elementIds.find(id => id.includes("neutron"));
            neutronChartViewRef.current?.appendChild(neutronChartElt);

            let gammaLayers: any[] = [];
            if(layers.gamma ){
                gammaLayers.push(layers.gamma)
            }
            if(layers.threshold){
                gammaLayers.push(layers.threshold)
            }
            //create all charts
            const newGammaChart = new ChartJsView({
                container:  gammaChartElt.id,
                layers: gammaLayers,
                css: "chart-view-event-detail",
                type: 'line',
                options: {
                    scales: {
                        x: { title: { display: true, text: 'Time', padding: 5 }, type: 'time' },
                        y: { type: 'linear', position: 'left', title: { display: true, text: 'CPS', padding: 15 }, beginAtZero: false }
                    }
                }
            })



            const newNeutronChart = new ChartJsView({
                container:  neutronChartElt.id,
                layers: [layers.neutron],
                css: "chart-view-event-detail",
                type: 'line',
                options: {

                    scales: {
                        x: { title: { display: true, text: 'Time', padding: 5 }, type: 'time' },
                        y: { type: 'linear', position: 'left', title: { display: true, text: 'CPS', padding: 15 }, beginAtZero: false }
                    }
                }
            });

            if(layers.nsigma || layers.threshNsigma){
                const newNsigmaChart = new ChartJsView({
                    container: nsigmaChartElt.id,
                    layers: [layers.nsigma, layers.threshNsigma],
                    css: "chart-view-event-detail",
                    type: 'line',
                    options: {
                        stacked: true,
                        scales: {
                            x: { title: { display: true, text: 'Time', padding: 5 }, type: 'time' },
                            y: { type: 'linear', position: 'left', title: { display: true, text: 'Nσ', padding: 15 }, beginAtZero: false }
                        }
                    }
                });


                setGammaNsigmaChartView(newNsigmaChart);
                console.log('nsigma chart created', newNsigmaChart)

            }


            //Set all charts
            setGammaChartView(newGammaChart);
            console.log('gamma chart created', newGammaChart)

            setNeutronChartView(newNeutronChart)
            console.log('neutron chart created', newNeutronChart)

            setChartsReady(true);
        }

    }, [eventPreview]);

    useEffect(() => {
        let currTime = props.currentTime;
        // console.log('curr time', currTime)
        if (currTime?.data !== undefined) {
            let theTime = new Date(currTime.data);
            console.log("Current Time: ", currTime, theTime);
            let chartAnnotation = {
                annotations: {
                    verticalLine: {
                        type: 'line',
                        xMin: theTime,
                        xMax: theTime,
                        borderColor: 'yellow',
                        borderWidth: 4,
                        label: {
                            enabled: true,
                            content: 'Current Time'
                        }
                    }
                }
            };

            console.log("Annotating Charts", gammaChartView, neutronChartView, nsigmaChartView);
            if (gammaChartView) {
                console.log("Annotating Gamma Chart", gammaChartView);
                const gchart = gammaChartView.chart;
                gchart.options.plugins.annotation = chartAnnotation;

                gchart.update();
            }

            if (nsigmaChartView) {
                console.log("Annotating Nsigma Chart", nsigmaChartView);
                const nSigmachart = nsigmaChartView.chart;
                nSigmachart.options.plugins.annotation = chartAnnotation;
                nSigmachart.update();
            }

            if (neutronChartView) {
                console.log("Annotating Neutron Chart", neutronChartView);
                const nchart = neutronChartView.chart;
                nchart.options.plugins.annotation = chartAnnotation;
                nchart.update();
            }


        }
    }, [props.currentTime, gammaChartView, nsigmaChartView, neutronChartView]);

    useEffect(() => {
        if (toggleView === 'cps' && gammaChartView) {
            gammaChartView.chart.update();
            console.log("CPS chart updated", gammaChartView);
        }
        if (toggleView === 'sigma' && nsigmaChartView) {
            nsigmaChartView.chart.update();
            console.log("NSigma chart updated", nsigmaChartView);
        }
    }, [toggleView, gammaChartView, nsigmaChartView]);


    useEffect(() => {
        checkReadyToRender();
    }, [chartsReady]);

    useEffect(() => {
        if (isReadyToRender) {
            console.log("Chart is ready to render");
            props.setChartReady(true);
        }
    }, [isReadyToRender]);



    function createCurveLayersAndReturn() {
        let tCurve = createThresholdViewCurve(props.datasources.threshold);
        let gCurve = createGammaViewCurve(props.datasources.gamma);
        let nCurve = createNeutronViewCurve(props.datasources.neutron);
        let nsigmaCurve = createNSigmaCalcViewCurve(props.datasources.threshold, props.datasources.gamma);
        let threshSigmaCurve = createThreshSigmaViewCurve(props.datasources.threshold);

        return {
            gamma: gCurve,
            neutron: nCurve,
            threshold: tCurve,
            nsigma: nsigmaCurve,
            threshNsigma: threshSigmaCurve
        }
    }

    // switch between cps and sigma chart
    const handleToggle= (event: React.MouseEvent<HTMLElement>, newView: string) =>{
        setToggleView(newView);
    }

    if (eventPreview.eventData?.status === "Gamma") {
        return (
            <Box display='flex' alignItems="center">

                <Grid container direction="column" spacing={2}>
                    <Grid item sx={{ display: "flex", justifyContent: "center", padding: 1 }}>
                        <ToggleButtonGroup
                            size="small"
                            orientation="horizontal"
                            onChange={handleToggle}
                            exclusive
                            value={toggleView}
                            sx={{
                                borderRadius: 1,
                                boxShadow: 1,
                                '& .MuiToggleButton-root': {
                                    margin: 0.5,
                                    padding: "5px",
                                },
                            }}>
                            {gammaToggleButtons}
                        </ToggleButtonGroup>
                    </Grid>
                    <Grid item xs sx={{ width: "100%", display: toggleView === 'cps' ? 'block' : 'none' }} ref={gammaChartViewRef} />
                    <Grid item xs sx={{ width: "100%", display: toggleView === 'sigma' ? 'block' : 'none' }} ref={nSigmaChartViewRef} />
                </Grid>
            </Box>
        );
    } else if (eventPreview.eventData?.status === "Neutron") {
        return (
            <Grid item xs  sx={{width: "100%"}} ref={neutronChartViewRef}></Grid>
        );
    } else{
        return (
            <Box display='flex' alignItems="center">
                <Grid container direction="column">
                    <Grid item sx={{ display: "flex", justifyContent: "center", padding: 1 }}>
                        <ToggleButtonGroup
                            size="small"
                            orientation="horizontal"
                            onChange={handleToggle}
                            exclusive
                            value={toggleView}
                            sx={{
                                borderRadius: 1,
                                boxShadow: 1,
                                '& .MuiToggleButton-root': {
                                    margin: 0.5,
                                    padding: "5px",
                                },
                            }}>
                            {gammaToggleButtons}
                        </ToggleButtonGroup>
                    </Grid>
                    <Grid item xs sx={{ width: "100%", display: toggleView === 'cps' ? 'block' : 'none' }} ref={gammaChartViewRef} />
                    <Grid item xs sx={{ width: "100%", display: toggleView === 'sigma' ? 'block' : 'none' }} ref={nSigmaChartViewRef} />
                    <Grid item xs={12} sx={{ width: "100%" }} ref={neutronChartViewRef}></Grid>
                </Grid>
            </Box>

        );
    }
}