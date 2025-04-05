/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */
'use client';

import React, {useCallback, useEffect, useRef, useState} from "react";
import {Box, Grid, ToggleButton, ToggleButtonGroup, Typography} from "@mui/material";
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

type CurveLayers = {
    neutron: any;
    gamma: any;
    threshold: any;
    threshNsigma: any;
    nsigma: any;
};

type ChartTypes ={
    gamma?: any;
    neutron?: any;
    nsigma?: any;
}

Chart.register(...registerables, annotationPlugin);

export class ChartInterceptProps {
    setChartReady: Function;
    modeType: string;
    currentTime: any;
    datasources: { gamma: typeof SweApi, neutron: typeof SweApi, threshold: typeof SweApi };
    eventData: EventTableData;
}

export default function ChartTimeHighlight(props: ChartInterceptProps) {

    const [chartsReady, setChartsReady] = useState<boolean>(false);
    const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);

    const gammaChartViewRef = useRef<HTMLDivElement | null>(null);
    const nSigmaChartViewRef = useRef<HTMLDivElement | null>(null);
    const neutronChartViewRef = useRef<HTMLDivElement | null>(null);

    const gammaChartBaseId = "chart-view-event-detail-gamma-";
    const neutronChartBaseId = "chart-view-event-detail-neutron-";

    const [chartViews, setChartViews] = useState<ChartTypes>({
        gamma: null,
        neutron: null,
        nsigma: null,
    });


    const [toggleView, setToggleView] = useState("cps");

    const gammaToggleButtons = [
        <ToggleButton color= 'error' value={"cps"} key={"cps"}>CPS</ToggleButton>,
        <ToggleButton color= 'secondary' value={"sigma"} key={"sigma"}>NSigma</ToggleButton>
    ];


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
        let nsigmaId: string;
        let neutronId: string

        switch (eventData.status) {
            case "Gamma":
                gammaId = gammaChartBaseId + eventData.id + "-" + props.modeType;
                nsigmaId = "chart-view-event-detail-nsigma-" + eventData.id + "-" + props.modeType;
                ids.push(gammaId, nsigmaId);
                break;
            case "Neutron":
                neutronId = neutronChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(neutronId);
                break;
            case "Gamma & Neutron":
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

    const [layers, setLayers] = useState<CurveLayers>({
        neutron: null,
        gamma: null,
        threshold: null,
        threshNsigma: null,
        nsigma: null
    });


    useEffect(() => {
        if(!props.eventData || !props.datasources?.gamma || !props.datasources?.neutron || !props.datasources?.threshold) return;

        const initCurveLayers = async () => {
            try {
                const newLayers  = await createCurveLayers();

                setLayers(newLayers);
            } catch (error) {
                console.error("Error loading layers:", error);
            }
        };

        initCurveLayers();
    }, [props.eventData]);

    useEffect(() => {
        if (!props.eventData || !layers ) return;

        console.log('event data', props.eventData)
        let elementIds: any[] = updateChartElIds(props.eventData);
        console.log("elementIds", elementIds);

        if(layers.gamma){
            let gammaLayers: any[] = [];
            if(layers?.gamma ){
                gammaLayers.push(layers.gamma)
            }
            if(layers?.threshold){
                gammaLayers.push(layers.threshold)
            }

            if (gammaChartViewRef.current && gammaLayers) {

                let gammaChartElt = document.createElement("div");
                gammaChartElt.id =  elementIds.find(id=> id.includes('gamma'));

                gammaChartViewRef.current?.appendChild(gammaChartElt);

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

                //Set all charts
                setChartViews(prev => ({...prev, gamma: newGammaChart}));

                console.log('gamma chart created', newGammaChart);
            }
        }


        if (neutronChartViewRef.current && layers.neutron) {
            let neutronChartElt = document.createElement("div");
            neutronChartElt.id = elementIds.find(id => id.includes("neutron"));
            neutronChartViewRef.current?.appendChild(neutronChartElt);

            const newNeutronChart = new ChartJsView({
                container:  neutronChartElt.id,
                layers: [layers?.neutron],
                css: "chart-view-event-detail",
                type: 'line',
                options: {
                    scales: {
                        x: { title: { display: true, text: 'Time', padding: 5 }, type: 'time' },
                        y: { type: 'linear', position: 'left', title: { display: true, text: 'CPS', padding: 15 }, beginAtZero: false }
                    }
                }
            });

            // setNeutronChartView(newNeutronChart)
            setChartViews(prev => ({...prev, neutron: newNeutronChart}));

            console.log('neutron chart created', newNeutronChart)

        }

        if(layers.nsigma && layers.threshNsigma){

            if(nSigmaChartViewRef.current){
                let nsigmaChartElt = document.createElement("div");
                nsigmaChartElt.id = elementIds.find(id => id.includes('nsigma'));
                nSigmaChartViewRef.current?.appendChild(nsigmaChartElt);

                const newNsigmaChart = new ChartJsView({
                    container: nsigmaChartElt.id,
                    layers: [layers.nsigma, layers.threshNsigma],
                    css: "chart-view-event-detail",
                    type: 'line',
                    options: {
                        scales: {
                            x: {
                                title: {display: true, text: 'Time', padding: 5},
                                type: 'time',
                                stacked: true,
                            },
                            y: {
                                type: 'linear',
                                position: 'left',
                                title: {display: true, text: 'Nσ', padding: 15},
                                beginAtZero: false,
                                stacked: true,
                            }
                        }
                    }
                });

                setChartViews(prev => ({...prev, nsigma: newNsigmaChart}));
                console.log('nsigma chart created', newNsigmaChart)

            }
        }else{
            console.warn("Skipping nsigma Chart because data is empty.")
        }

        setChartsReady(true)

    }, [props.eventData, layers]);


    useEffect(() => {
        let currTime = props.currentTime;
        // console.log('curr time', currTime)
        if (currTime) {
            let chartAnnotation = {
                annotations: {
                    verticalLine: {
                        type: 'line',
                        xMin: currTime,
                        xMax: currTime,
                        borderColor: 'yellow',
                        borderWidth: 4,
                        label: {
                            enabled: true,
                            content: 'Current Time'
                        }
                    }
                }
            };

            if (chartViews.gamma) {
                // console.log("Annotating Gamma Chart", chartViews.gamma);
                const gchart = chartViews.gamma.chart;
                gchart.options.plugins.annotation = chartAnnotation;

                gchart.update();
            }

            if (chartViews.nsigma) {
                // console.log("Annotating Nsigma Chart", chartViews.nsigma);
                const nSigmachart = chartViews.nsigma.chart;
                nSigmachart.options.plugins.annotation = chartAnnotation;
                nSigmachart.update();
            }

            if (chartViews.neutron) {
                // console.log("Annotating Neutron Chart", chartViews.neutron);
                const nchart = chartViews.neutron.chart;
                nchart.options.plugins.annotation = chartAnnotation;
                nchart.update();
            }

            chartViews?.gamma?.chart.update();
            chartViews?.nsigma?.chart.update();
            chartViews?.neutron?.chart.update();
        }
    }, [props.currentTime, chartViews]);

    useEffect(() => {

        if(chartViews.gamma) {
            chartViews.gamma?.chart.update();
            console.log("CPS chart updated",  chartViews.gamma);
        }

        if(chartViews.nsigma) {
            chartViews.nsigma?.chart.update();
            console.log("NSigma chart updated", chartViews.nsigma);
        }


    }, [toggleView, chartViews]);


    useEffect(() => {
        checkReadyToRender();
    }, [chartsReady]);

    useEffect(() => {
        if (isReadyToRender) {
            console.log("Chart is ready to render");
            props.setChartReady(true);
        }
    }, [isReadyToRender]);


    function createCurveLayers() {
        return Promise.all([
            createNeutronViewCurve(props.datasources.neutron),
            createGammaViewCurve(props.datasources.gamma),
            createThresholdViewCurve(props.datasources.threshold),
            createThreshSigmaViewCurve(props.datasources.threshold),
            createNSigmaCalcViewCurve(props.datasources.threshold, props.datasources.gamma)
        ]).then(([neutron, gamma, threshold, threshNsigma, nsigma]) => {

            return {
                neutron,
                gamma,
                threshold,
                threshNsigma,
                nsigma
            };
        });
    }

    // switch between cps and sigma chart
    const handleToggle= (event: React.MouseEvent<HTMLElement>, newView: string) =>{
        setToggleView(newView);
    }

    if (props.eventData?.status === "Gamma" && isReadyToRender) {
        return (
            <Box display='flex' alignItems="center">

                <Grid container direction="column" spacing={2}>
                    <Grid item style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                        <ToggleButtonGroup
                            size="small"
                            orientation="horizontal"
                            onChange={handleToggle}
                            exclusive
                            value={toggleView}
                            sx={{
                                boxShadow: 1,
                                '& .MuiToggleButton-root': {
                                    margin: 0.5,
                                    padding: "5px",
                                },
                            }}
                        >
                            {gammaToggleButtons}
                        </ToggleButtonGroup>
                    </Grid>
                    <Grid item xs sx={{ width: "100%", display: toggleView === 'cps' ? 'block' : 'none' }} ref={gammaChartViewRef} />
                    <Grid item xs sx={{ width: "100%", display: toggleView === 'sigma' ? 'block' : 'none' }} ref={nSigmaChartViewRef} />
                </Grid>
            </Box>
        );
    } else if (props.eventData?.status === "Neutron") {
        return (
            <Grid item xs  sx={{width: "100%"}} ref={neutronChartViewRef}></Grid>
        );
    } else{
        return (
            <Box display='flex' alignItems="center">
                <Grid container direction="column" spacing={2}>
                    <Grid item style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                        <ToggleButtonGroup
                            size="small"
                            orientation="horizontal"
                            onChange={handleToggle}
                            exclusive
                            value={toggleView}
                            sx={{
                                boxShadow: 1,
                                '& .MuiToggleButton-root': {
                                    margin: 0.5,
                                    padding: "5px",
                                },
                            }}
                        >
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