/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */
'use client';

import React, {useCallback, useEffect, useRef, useState} from "react";
import {Box, Grid, ToggleButton, ToggleButtonGroup} from "@mui/material";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView.js";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
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
    currentTime?: any;
    datasources: { gamma: typeof ConSysApi, neutron: typeof ConSysApi, threshold: typeof ConSysApi };
    eventData: EventTableData;
    latestGB: number;
}

export default function ChartTimeHighlight(props: ChartInterceptProps) {

    const [chartsReady, setChartsReady] = useState<boolean>(false);
    const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);

    const gammaChartViewRef = useRef<HTMLDivElement | null>(null);
    const nSigmaChartViewRef = useRef<HTMLDivElement | null>(null);
    const neutronChartViewRef = useRef<HTMLDivElement | null>(null);

    const gammaChartBaseId = "chart-view-event-detail-gamma-";
    const neutronChartBaseId = "chart-view-event-detail-neutron-";

    const [layers, setLayers] = useState<CurveLayers>();

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

    useEffect(() => {
        if(chartViews.gamma)
            setTimeout(() => {
                chartViews.gamma.chart.update();
            }, 300);
    }, [chartViews.gamma]);

    const checkReadyToRender = useCallback(() => {
        if (chartsReady) {
            setIsReadyToRender(true);
        } else {
            setIsReadyToRender(false);
        }
    }, [chartsReady]);

    useEffect(() => {

        if (!props.eventData || !props.datasources?.gamma || !props.datasources?.neutron || !props.datasources?.threshold || !props.latestGB) return;

        const init = async () => {
            const layers = await createCurveLayers();
            setLayers(layers)
        };

        init();
    }, [props.eventData]);

    useEffect(() => {
        if (!layers && props.eventData) return;

        const elementIds = updateChartElIds(props.eventData);

        renderCharts(layers, elementIds);
    }, [layers, props.eventData]);


    useEffect(() => {
        if(chartViews && props.currentTime){
            annotateCharts(props.currentTime);
        }
    }, [props.currentTime, chartViews]);

    useEffect(() => {
        checkReadyToRender();
    }, [chartsReady]);

    useEffect(() => {
        if (isReadyToRender) {
            console.log("Chart is ready to render");
            props.setChartReady(true);
        }
    }, [isReadyToRender]);

    useEffect(() => {

        if(chartViews?.gamma) {
            chartViews.gamma.chart.update();
        }
        if(chartViews?.nsigma) {
            chartViews.nsigma.chart.update();
        }
        if(chartViews?.neutron) {
            chartViews.neutron.chart.update();
        }


    }, [toggleView, chartViews]);


    function annotateCharts(currTime: any){
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

            if (chartViews?.gamma) {
                const gchart = chartViews.gamma.chart;
                gchart.options.plugins.annotation = chartAnnotation;

                gchart.update();
            }

            if (chartViews?.nsigma) {
                const nSigmachart = chartViews.nsigma.chart;
                nSigmachart.options.plugins.annotation = chartAnnotation;
                nSigmachart.update();
            }

            if (chartViews?.neutron) {
                const nchart = chartViews.neutron.chart;
                nchart.options.plugins.annotation = chartAnnotation;
                nchart.update();
            }

            chartViews?.gamma?.chart.update();
            chartViews?.nsigma?.chart.update();
            chartViews?.neutron?.chart.update();
        }
    }

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

    async function createCurveLayers() {

        let result = await Promise.all([
            createNeutronViewCurve(props.datasources.neutron),
            createGammaViewCurve(props.datasources.gamma),
            createThresholdViewCurve(props.datasources.threshold),
            createThreshSigmaViewCurve(props.datasources.threshold),
            createNSigmaCalcViewCurve(props.datasources.gamma, props.latestGB)
        ]);

        const [neutron, gamma, threshold, threshNsigma, nsigma] = result;
        return {
            neutron,
            gamma,
            threshold,
            threshNsigma,
            nsigma
        };
    }

    const renderCharts = (layers: CurveLayers, elementIds: string[]) => {

        if (layers.gamma && gammaChartViewRef.current) {
            const gammaLayers: any[] = [];

            if (layers.gamma) gammaLayers.push(layers.gamma);
            if (layers.threshold) gammaLayers.push(layers.threshold);

            const gammaDiv = document.createElement("div");
            gammaDiv.id = elementIds.find(id => id.includes("gamma"))!;
            gammaChartViewRef.current.innerHTML = ""; //clear previous chart
            gammaChartViewRef.current.appendChild(gammaDiv);

           const gammaChart = new ChartJsView({
                container: gammaDiv.id,
                layers: gammaLayers,
                css: "chart-view-event-detail",
                type: 'line',
                options: {
                    scales: {
                        x: { title: { display: true, text: 'Time', padding: 5 }, type: 'time' },
                        y: { title: { display: true, text: 'CPS', padding: 15 }, beginAtZero: false }
                    }
                }
            });

           setChartViews(prev => ({ ...prev, gamma: gammaChart }));
           gammaChart.chart.update();

           setChartViews(prev => ({ ...prev, gamma: gammaChart }));


        }
        if (layers.neutron && neutronChartViewRef.current) {
            const neutronDiv = document.createElement("div");
            neutronDiv.id = elementIds.find(id => id.includes("neutron"));

            neutronChartViewRef.current.innerHTML = "";
            neutronChartViewRef.current.appendChild(neutronDiv);

            const neutronChart = new ChartJsView({
                container: neutronDiv.id,
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

            setChartViews(prev => ({ ...prev, neutron: neutronChart }));

        }

        if (layers.nsigma && layers.threshNsigma && nSigmaChartViewRef.current) {
            const nsigmaDiv = document.createElement("div");
            nsigmaDiv.id = elementIds.find(id => id.includes("nsigma"));

            nSigmaChartViewRef.current.innerHTML = "";
            nSigmaChartViewRef.current.appendChild(nsigmaDiv);

            const nsigmaChart = new ChartJsView({
                container: nsigmaDiv.id,
                layers: [layers.nsigma, layers.threshNsigma],
                css: "chart-view-event-detail",
                type: 'line',
                options: {
                    scales: {
                        x: { title: { display: true, text: 'Time', padding: 5 }, type: 'time' },
                        y: { type: 'linear', position: 'left', title: { display: true, text: 'Nσ', padding: 15 }, beginAtZero: false }
                    }
                }
            });

            setChartViews(prev => ({ ...prev, nsigma: nsigmaChart }));
        }

        setChartsReady(true);
    };


    // switch between cps and sigma chart
    const handleToggle= (event: React.MouseEvent<HTMLElement>, newView: string) =>{
        setToggleView(newView);
    }

    return (
        <Box display='flex' alignItems="center">
            <Grid container direction="column" spacing={2}>
                {(props.eventData?.status === "Gamma"  && isReadyToRender) ? (
                    <>
                        <Grid item style={{display: "flex", justifyContent: "center", width: "100%"}}>
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
                        <Grid item xs sx={{width: "100%", display: toggleView === 'cps' ? 'block' : 'none'}} ref={gammaChartViewRef}/>
                        <Grid item xs sx={{width: "100%", display: toggleView === 'sigma' ? 'block' : 'none'}} ref={nSigmaChartViewRef}/>
                    </>
                ) :
                    (props.eventData?.status === "Neutron") ? (<Grid item xs sx={{width: "100%"}} ref={neutronChartViewRef}/>)

                    : (<>
                        <Grid item style={{display: "flex", justifyContent: "center", width: "100%"}}>
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
                        <Grid item xs sx={{width: "100%", display: toggleView === 'cps' ? 'block' : 'none'}} ref={gammaChartViewRef}/>
                        <Grid item xs sx={{width: "100%", display: toggleView === 'sigma' ? 'block' : 'none'}} ref={nSigmaChartViewRef}/>
                        <Grid item xs sx={{width: "100%"}} ref={neutronChartViewRef}/>
                    </>
                )
                }
            </Grid>
        </Box>
    );

}


