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
    createThresholdViewCurve
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
    const gammaNSigmaChartViewRef = useRef<HTMLDivElement | null>(null);
    const gammaCpsChartViewRef = useRef<HTMLDivElement | null>(null);
    const neutronChartViewRef = useRef<HTMLDivElement | null>(null);

    const gammaChartBaseId = "chart-view-event-detail-gammaCPS-";
    const gammaNsigmaChartBaseId = "chart-view-event-detail-gammaNSIGMA-";
    const neutronChartBaseId = "chart-view-event-detail-neutron-";

    const [gammaCpsChartView, setGammaCpsChartView] = useState<any>();
    const [gammaNsigmaChartView, setGammaNsigmaChartView] = useState<any>();
    const [neutronChartView, setNeutronChartView] = useState<any>();

    const [toggleView, setToggleView] = useState("cps");

    const gammaButtons = [
        <ToggleButton value={"cps"} key={"cps"}>CPS</ToggleButton>,
        <ToggleButton value={"sigma"} key={"sigma"}>NSigma</ToggleButton>
    ];


    function createCurveLayersAndReturn() {
        let tCurve = createThresholdViewCurve(props.datasources.threshold);
        let gCurve = createGammaViewCurve(props.datasources.gamma);
        let nCurve = createNeutronViewCurve(props.datasources.neutron);
        let nsigmaCurve = createNSigmaCalcViewCurve(props.datasources.threshold, props.datasources.gamma);

        return {
            gamma: gCurve,
            neutron: nCurve,
            threshold: tCurve,
            nsigma: nsigmaCurve
        }
    }

    const resetView = useCallback(() => {
        if (!eventPreview.isOpen) {
            setGammaCpsChartView(null);
            setGammaNsigmaChartView(null);
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
                console.log("Annotating Charts", gammaCpsChartView, gammaNsigmaChartView, neutronChartView);

                if (gammaCpsChartView) {
                    console.log("Annotating Gamma Cps Chart", gammaCpsChartView);
                    const gchart = gammaCpsChartView.chart;
                    gchart.options.plugins.annotation = chartAnnotation;
                    gchart.update();
                }

                if (gammaNsigmaChartView) {
                    console.log("Annotating Gamma Nsigma Chart", gammaNsigmaChartView);
                    const gchart = gammaNsigmaChartView.chart;
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
    }, [props.currentTime, gammaCpsChartView, gammaNsigmaChartView, neutronChartView, chartsReady]);

    function createChartViews(layers: { gamma: any, threshold: any, neutron: any, nsigma: any }, elementIds: string[]) {

        console.log("Creating Chart Views", layers, elementIds);
        let newChartViews: any = {gammaCPS: null, neutron: null, gammaNsigma: null};

        for (let id of elementIds) {
            console.log('ele ids', elementIds)

            if (id.includes("gammaCPS")) {

                let gammaCpsChartElt = document.createElement("div");
                gammaCpsChartElt.id = id;
                gammaCpsChartViewRef.current?.appendChild(gammaCpsChartElt);

                let gammaCpsChart = new ChartJsView({
                    container: id,
                    layers: [layers.gamma, layers.threshold],
                    css: "chart-view-event-detail",
                });

                console.log("Created Gamma Chart", gammaCpsChart);
                newChartViews.gammaCPS = gammaCpsChart;
                setGammaCpsChartView(gammaCpsChart);
            }

            if (id.includes("gammaNSIGMA")) {
                let gammaChartElt = document.createElement("div");
                gammaChartElt.id = id;
                gammaNSigmaChartViewRef.current?.appendChild(gammaChartElt);

                let gammaNsigmaChart = new ChartJsView({
                    container: id,
                    layers: [layers.nsigma],
                    css: "chart-view-event-detail",
                });

                console.log("Created Gamma Nsigma Chart", gammaNsigmaChart);
                setGammaNsigmaChartView(gammaNsigmaChart);
                newChartViews.gammaNsigma = gammaNsigmaChart;
            }

            if (id.includes("neutron")) {
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
        let gammaCpsId: string;
        let gammaNsigmaId: string;
        let neutronId: string

        switch (eventData.status) {
            case "Gamma":
                gammaCpsId = gammaChartBaseId + eventData.id + "-" + props.modeType;
                gammaNsigmaId = gammaNsigmaChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(gammaCpsId, gammaNsigmaId);
                break;
            case "Neutron":
                neutronId = neutronChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(neutronId);
                break;
            case "Gamma & Neutron":
                gammaCpsId = gammaChartBaseId + eventData.id + "-" + props.modeType;
                gammaNsigmaId = gammaNsigmaChartBaseId + eventData.id + "-" + props.modeType;
                neutronId = neutronChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(gammaCpsId, gammaNsigmaId, neutronId);
                break;
            default:
                break;
        }
        return ids;
    }

    function checkForNeededChartElements(eventData: EventTableData) {
        switch (eventData.status) {
            case "Gamma":
                return ["gammaNsigma", "gammaCps"];
                break;
            case "Neutron":
                return ["neutron"];
                break;
            case "Gamma & Neutron":
                return ["gammaNsigma", "gammaCps", "neutron"];
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
                if (chartType === "gammaCps") {
                    console.log("Gamma Element:", gammaCpsChartViewRef.current);

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

            if (views.gammaCPS || views.gammaNsigma || views.neutron) {
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


    // switch between cps and sigma chart
    const handleToggle= (event: React.MouseEvent<HTMLElement>, newView: any) =>{
        if(newView){
            setToggleView(newView);
        }
    }

    if (eventPreview.eventData?.status === "Gamma") {
        return (
            <Box>
                <ToggleButtonGroup size={"small"} orientation={"horizontal"} onChange={handleToggle} exclusive value={toggleView}>
                    {gammaButtons}
                </ToggleButtonGroup>
                <Grid item xs sx={{width: "100%"}}>
                    {toggleView === "cps" ? (
                        <Box sx={{width: "100%"}}  ref={gammaCpsChartViewRef}></Box>
                    ) : (
                        <Box sx={{width: "100%"}}  ref={gammaNSigmaChartViewRef}></Box>
                    )}
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
                <ToggleButtonGroup size={"small"} orientation={"horizontal"} onChange={handleToggle} exclusive value={toggleView}>
                    {gammaButtons}
                </ToggleButtonGroup>
                <Grid container direction="column" spacing={4}>
                    <Grid item xs sx={{width: "100%"}}>
                        {toggleView === "cps" ? (
                            <Box ref={gammaCpsChartViewRef} sx={{width: "100%"}} ></Box>
                        ) : (
                            <Box ref={gammaNSigmaChartViewRef} sx={{width: "100%"}} ></Box>
                        )}
                    </Grid>
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

