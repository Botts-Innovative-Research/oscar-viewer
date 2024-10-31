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



Chart.register(...registerables, annotationPlugin );

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

    // chart specifics

    const gammaChartViewRef = useRef<HTMLDivElement | null>(null);
    const neutronChartViewRef = useRef<HTMLDivElement | null>(null);

    const gammaChartBaseId = "chart-view-event-detail-gamma-";

    const neutronChartBaseId = "chart-view-event-detail-neutron-";

    const [gammaChartView, setGammaChartView] = useState<any>();
    const [neutronChartView, setNeutronChartView] = useState<any>();



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

    const resetView = useCallback(() => {
        if (!eventPreview.isOpen) {
            setGammaChartView(null);
            setNeutronChartView(null);
            setIsReadyToRender(false);
        }
    }, [eventPreview]);

    useEffect(() => {
        let currTime = props.currentTime;
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

            if (chartsReady) {
                console.log("Annotating Charts", gammaChartView, neutronChartView);

                if (gammaChartView) {
                    console.log("Annotating Gamma  Chart", gammaChartView);
                    const gchart = gammaChartView.chart;
                    gchart.options.plugins.annotation = chartAnnotation;

                    gchart.update();
                }

                if (neutronChartView) {
                    console.log("Annotating Neutron Chart", neutronChartView);
                    const nchart = neutronChartView.chart;
                    nchart.options.plugins.annotation = chartAnnotation;
                    nchart.update();
                }
            }
        }
    }, [props.currentTime, gammaChartView, neutronChartView, chartsReady]);

    function createChartViews(layers: { gamma: any, threshold: any, neutron: any, nsigma: any, threshNsigma: any }, elementIds: string[]) {

        console.log("Creating Chart Views", layers, elementIds);
        let newChartViews: any = {gamma: null, neutron: null};


        for (let id of elementIds) {
            console.log('ele ids', elementIds)

            if (id.includes("gamma") && gammaChartViewRef.current) {

                let gammaChartElt = document.createElement("div");
                gammaChartElt.id = id;
                gammaChartViewRef.current?.appendChild(gammaChartElt);

                let gammaChart = new ChartJsView({
                    container: id,
                    layers: [layers.gamma, layers.threshold, layers.nsigma, layers.threshNsigma],
                    css: "chart-view-event-detail",

                    // options:{
                    //     responsive: true,
                    //     interaction: {
                    //         mode: 'index',
                    //         intersect: false,
                    //     },
                    //     stacked: false,
                    //     scales: {
                    //         y: {
                    //             type: 'linear',
                    //             display: true,
                    //             position: 'left',
                    //         },
                    //         y1: {
                    //             type: 'linear',
                    //             display: true,
                    //             position: 'right',
                    //
                    //             // grid line settings
                    //             grid: {
                    //                 drawOnChartArea: false, // only want the grid lines for one axis to show up
                    //             },
                    //         },
                    //     }
                    // },
                    // options:{
                    //
                    //     scales: {
                    //         x: {
                    //             title: {
                    //                 display: true,
                    //                 text: 'Time',
                    //             },
                    //         },
                    //         y:{
                    //             title:{
                    //                 display: true,
                    //                 text: 'CPS',
                    //
                    //             },
                    //             display: true,
                    //             position: 'left',
                    //             align: 'center',
                    //             grid: {display: false, beginAtZero: false}
                    //
                    //         },
                    //         nsigma:{
                    //             title:{
                    //                 display: true,
                    //                 text: 'nSigma',
                    //
                    //             },
                    //             display: true,
                    //             position: 'right',
                    //             align: 'center',
                    //             grid: {display: false, beginAtZero: false}
                    //
                    //         },
                    //     },
                    // },
                });

                console.log("Created Gamma Chart", gammaChart);
                newChartViews.gamma = gammaChart;
                setGammaChartView(gammaChart);
            }

            if (id.includes("neutron") && neutronChartViewRef.current) {
                let neutronChartElt = document.createElement("div");
                neutronChartElt.id = id;
                neutronChartViewRef.current?.appendChild(neutronChartElt);

                console.log("Creating Neutron Chart in elmt", neutronChartViewRef.current);
                let neutronChart = new ChartJsView({
                    container: id,
                    layers: [layers.neutron],
                    css: "chart-view-event-detail",
                });
                console.log("Created Neutron Chart", neutronChart);
                newChartViews.neutron = neutronChart;
                setNeutronChartView(neutronChart);
            }
        }
        return newChartViews;
    }


    const checkReadyToRender = useCallback(() => {
        if (chartsReady) {
            setIsReadyToRender(true);
        } else {
            setIsReadyToRender(false);
        }
    }, [chartsReady]);


    function updateChartElIds(eventData: EventTableData): string[] {
        let ids: string[] = [];
        let gammaId: string;
        let neutronId: string

        switch (eventData.status) {
            case "Gamma":
                gammaId = gammaChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(gammaId);
                break;
            case "Neutron":
                neutronId = neutronChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(neutronId);
                break;
            case "Gamma & Neutron":
                gammaId = gammaChartBaseId + eventData.id + "-" + props.modeType;
                neutronId = neutronChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(gammaId, neutronId);
                break;
            default:
                break;
        }
        return ids;
    }

    function checkForNeededChartElements(eventData: EventTableData) {
        switch (eventData.status) {
            case "Gamma":
                return ["gamma"];
                break;
            case "Neutron":
                return ["neutron"];
                break;
            case "Gamma & Neutron":
                return ["gamma", "neutron"];
                break;
            default:
                return [];
        }
    }


    useEffect(() => {
        if (eventPreview.eventData) {
            let neededCharts = checkForNeededChartElements(eventPreview.eventData);
            console.log("Found Needed Charts:", neededCharts);
            for (let chartType of neededCharts) {
                if (chartType === "gamma") {
                    console.log("Gamma Element:", gammaChartViewRef.current);

                    // set gamma ID
                } else if (chartType === "neutron") {
                    console.log("Neutron Element:", neutronChartViewRef.current);
                }

            }
            let elementIds: any[] = updateChartElIds(eventPreview.eventData);
            let layers = createCurveLayersAndReturn();
            console.log("Chart Curve Layers", layers);

            let views = createChartViews(layers, elementIds);

            console.log("Chart Views", views);

            if (views.gamma || views.neutron) {
                setChartsReady(true);
            }
        }
    }, [eventPreview]);

    useEffect(() => {
        checkReadyToRender();
    }, [chartsReady]);

    useEffect(() => {
        if (isReadyToRender) {
            console.log("Chart is ready to render");
            props.setChartReady(true);
        }
    }, [isReadyToRender]);


    if (eventPreview.eventData?.status === "Gamma") {
        return (
            <Box>
                <Grid container direction="column" spacing={4}>
                    <Grid item xs={12} sx={{ width: "100%" }} ref={gammaChartViewRef}></Grid>
                </Grid>
            </Box>

        );
    } else if (eventPreview.eventData?.status === "Neutron") {
        return (
            <Grid item xs  sx={{width: "100%"}} ref={neutronChartViewRef}></Grid>

        );
    } else if (eventPreview.eventData?.status === "Gamma & Neutron") {
        return (
            <Box>
                <Grid container direction="column" spacing={4}>
                    <Grid item xs={12} sx={{ width: "100%" }} ref={gammaChartViewRef}></Grid>
                    <Grid item xs={12} sx={{ width: "100%" }} ref={neutronChartViewRef}></Grid>
                </Grid>
            </Box>

        );
    } else {
        return (
            <Typography variant="h6">No Event Data</Typography>
        );
    }
}

