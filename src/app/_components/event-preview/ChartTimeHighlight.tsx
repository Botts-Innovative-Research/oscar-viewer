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
    // const [viewReady, setViewReady] = useState<boolean>(false);
    const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);

    // chart specifics
    const gammaChartViewRef = useRef<HTMLDivElement | null>(null);
    const neutronChartViewRef = useRef<HTMLDivElement | null>(null);
    const gammaChartBaseId = "chart-view-event-detail-gamma-";
    const neutronChartBaseId = "chart-view-event-detail-neutron-";
    const [gammaChartView, setGammaChartView] = useState<any>();
    const [neutronChartView, setNeutronChartView] = useState<any>();

    // const [theTime, setTheTime] = useState(props.currentTime?.data);

    const [toggleView, setToggleView] = useState("cps");

    const gammaButtons =[
        <ToggleButton value={"cps"}>CPS</ToggleButton>,
        <ToggleButton value={"sigma"}>Sigma</ToggleButton>
    ];

    const [gammaData, setGammaData] = useState(null);
    const [threshData, setThreshData] = useState(null);


    function createCurveLayersAndReturn() {
        let tCurve = createThresholdViewCurve(props.datasources.threshold);
        let gCurve = createGammaViewCurve(props.datasources.gamma);
        let nCurve = createNeutronViewCurve(props.datasources.neutron);
        let latestBkgCurve = createNSigmaCalcViewCurve(props.datasources.threshold);
        return {
            gamma: gCurve,
            neutron: nCurve,
            threshold: tCurve,
            latestBkg: latestBkgCurve
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
            // setTheTime(new Date(currTime.data))
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

            // let gammaLegend = {
            //     legend: {
            //         display: true,
            //         align: 'center',
            //         position: 'bottom',
            //         // onClick: null
            //         labels: {
            //             filter: function(item: any){
            //                 return !item.text.includes('NSigma')
            //             }
            //         },
            //     }
            // }



            //
            // let gammaPlugins ={
            //     annotations: {
            //         verticalLine: {
            //             type: 'line',
            //             xMin: theTime,
            //             xMax: theTime,
            //             borderColor: 'yellow',
            //             borderWidth: 4,
            //             label: {
            //                 enabled: true,
            //                 content: 'Current Time'
            //             }
            //         }
            //     },
            //     title: {
            //         display: true,
            //         text: 'Gamma Chart',
            //         font: {
            //             size: 14,
            //             weight: 'bold'
            //         },
            //         align: 'center',
            //         position: 'top',
            //     },
            //     legend: {
            //         display: true,
            //         align: 'center',
            //         position: 'bottom',
            //         // onClick: null
            //         labels: {
            //             filter: function(item: any){
            //                 return !item.text.includes('NSigma')
            //             }
            //         },
            //     }
            // }

            if (chartsReady) {
                console.log("Annotating Charts", gammaChartView, neutronChartView);

                if (gammaChartView) {
                    console.log("Annotating Gamma Chart", gammaChartView);
                    const gchart = gammaChartView.chart;
                    gchart.options.plugins.annotation = chartAnnotation;

                    // if(toggleView === 'cps' && gammaData.length === 0 && threshData.length === 0){
                    //     setGammaData(gchart.config.data.datasets[0]?.data);
                    //     setThreshData(gchart.config.data.datasets[1]?.data);
                    // }

                    // gchart.options.plugins = gammaPlugins
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

    function createChartViews(layers: { gamma: any, threshold: any, neutron: any, latestBkg: any }, elementIds: string[]) {

        console.log("Creating Chart Views", layers, elementIds);
        let newChartViews: any = {gamma: null, neutron: null};

        for (let id of elementIds) {

            if (id.includes("gamma")) {

                let gammaChartElt = document.createElement("div");
                gammaChartElt.id = id;
                gammaChartViewRef.current.appendChild(gammaChartElt);

                console.log("Creating Gamma Chart in elmt", gammaChartViewRef.current);

                //hide the latestbkg from appearing on the chart and in the legend
                // layers.latestBkg.display = false;
                // layers.latestBkg.hidden = true;

                console.log('bkg layer',layers.latestBkg)

                let gamma = new ChartJsView({
                    container: id,
                    layers: [layers.gamma, layers.threshold, layers.latestBkg],
                    css: "chart-view-event-detail",

                    // options: chartOptions
                });

                console.log("Created Gamma Chart", gamma);
                newChartViews.gamma = gamma;
                setGammaChartView(gamma);
            }

            if (id.includes("neutron")) {
                let neutronChartElt = document.createElement("div");
                neutronChartElt.id = id;
                neutronChartViewRef.current.appendChild(neutronChartElt);

                console.log("Creating Neutron Chart in elmt", neutronChartViewRef.current);
                let neutronChart = new ChartJsView({
                    container: id,
                    layers: [layers.neutron],
                    css: "chart-view-event-detail",

                    // options: {
                    //     plugins: {
                    //         title: {
                    //             display: true,
                    //             text: 'Neutron Chart',
                    //             font: {
                    //                 size: 14,
                    //                 weight: 'bold'
                    //             },
                    //             align: 'center',
                    //             position: 'top',
                    //         },
                    //         legend: {
                    //             display: true,
                    //             align: 'right',
                    //             position: 'bottom',
                    //             onClick: null
                    //         }
                    //     },
                    //     responsive: true,
                    //     scales: {
                    //         y: {
                    //             title: {
                    //                 display: true,
                    //                 text: 'CPS',
                    //             },
                    //             display: true,
                    //             position: 'left',
                    //             align: 'center',
                    //         },
                    //     }
                    // }
                });
                console.log("Created Neutron Chart", neutronChart);
                newChartViews.neutron = neutronChart;
                setNeutronChartView(neutronChart);
            }
        }
        return newChartViews;
    }


    useEffect(() => {

        if(gammaChartView){
            const chart = gammaChartView.chart;

            const datasets = chart.config.data.datasets;

            console.log('datasets', datasets)

            const gammaDatasets = datasets[0]
            const thresholdDatasets = datasets[1]
            const latestBkg = datasets[2]?.data[0].y;


            console.log('gamma ds', gammaDatasets)
            console.log('thresh ds', thresholdDatasets)


            // console.log('gammmmmmmma',chart.config.data.datasets)
            // console.log('thresh',chart.config.data.datasets[1]?.data)
            // console.log('latestbkg',chart.config.data.datasets[2]?.data)

            console.log('latest bkg', latestBkg)

            // if(toggleView === 'cps' && gammaData === null && threshData === null){
            //
            //     setGammaData(gammaDatasets?.data.map((point: any) => ({ ...point })));
            //     setThreshData(thresholdDatasets?.data.map((point: any) => ({ ...point })));
            //     // chart.config.data.datasets[0]?.data.forEach((point: any) => {point.y = gammaData.forEach(point.y)});
            //     // chart.config.data.datasets[1]?.data.forEach((point: any) => {point.y = threshData.forEach(point.y)});
            // }

            if(toggleView === 'cps'){
                //change title
                chart.config.options.scales.y.title = {display: true, text: "CPS"};
                // need to restore values for the original data....

            } else if(toggleView === 'sigma'){
                // change title to nsigma and calculate the y values for thresh and gamma counts to nsigma

                chart.config.options.scales.y.title = {display: true, text: "NSigma"};
                chart.config.data.datasets[0]?.data.forEach((point: any) => {point.y = (calculateNSigmaValue(point.y, latestBkg)).toFixed(2);});
                chart.config.data.datasets[1]?.data.forEach((point: any) => {point.y = (calculateNSigmaValue(point.y,latestBkg)).toFixed(2);});
            }
            chart.update();
        }
    }, [toggleView, gammaChartView]);


    const calculateNSigmaValue = (point: any, latestBkg: number) =>{
        return (point -latestBkg) / Math.sqrt(latestBkg)
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
                    document
                    // set gamma ID
                } else if (chartType === "neutron") {
                    console.log("Neutron Element:", neutronChartViewRef.current);
                }
            }
            // setChartElementsFound(true);
            let elementIds: any[] = updateChartElIds(eventPreview.eventData);
            let layers = createCurveLayersAndReturn();
            console.log("Chart Curve Layers", layers);
            // setLayersReady(true);
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


    // switch between cps and sigma chart
    const handleToggle= (event: React.MouseEvent<HTMLElement>, newView: any) =>{
        if(newView){
            setToggleView(newView);
        }
    }

    if (eventPreview.eventData.status === "Gamma") {
        return (
            <Box>
                <ToggleButtonGroup size={"small"} orientation={"horizontal"} onChange={handleToggle} exclusive value={toggleView}>
                    {gammaButtons}
                </ToggleButtonGroup>
                <Grid item xs sx={{width: "100%"}} ref={gammaChartViewRef}></Grid>
            </Box>

        );
    } else if (eventPreview.eventData.status === "Neutron") {
        return (
            <Grid item xs  sx={{width: "100%"}} ref={neutronChartViewRef}></Grid>

        );
    } else if (eventPreview.eventData.status === "Gamma & Neutron") {
        return (
            <Box>
                <ToggleButtonGroup size={"small"} orientation={"horizontal"} onChange={handleToggle} exclusive value={toggleView}>
                    {gammaButtons}
                </ToggleButtonGroup>
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

