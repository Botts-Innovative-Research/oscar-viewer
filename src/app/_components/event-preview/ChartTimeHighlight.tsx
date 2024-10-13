/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */
'use client';

import {useCallback, useEffect, useRef, useState} from "react";
import {Box, Typography} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectEventPreview} from "@/lib/state/OSCARClientSlice";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView.js";
import CurveLayer from 'osh-js/source/core/ui/layer/CurveLayer.js';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import annotationPlugin from 'chartjs-plugin-annotation';
import {Chart, registerables} from 'chart.js';
import {EventTableData} from "@/lib/data/oscar/TableHelpers";

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
    // const [viewReady, setViewReady] = useState<boolean>(false);
    const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);

    // chart specifics
    const gammaChartViewRef = useRef<HTMLDivElement | null>(null);
    const neutronChartViewRef = useRef<HTMLDivElement | null>(null);
    const gammaChartBaseId = "chart-view-event-detail-gamma-";
    const neutronChartBaseId = "chart-view-event-detail-neutron-";
    const [gammaChartView, setGammaChartView] = useState<any>();
    const [neutronChartView, setNeutronChartView] = useState<any>();

    function createGammaViewCurve(gammaDatasource: { id: any; }) {
        if (!gammaDatasource) return null;

        let gCurve = new CurveLayer({
            dataSourceIds: [gammaDatasource.id],
            getValues: (rec: any, timestamp: any) => {
                // console.log(rec.gammaGrossCount1)
                return {x: timestamp, y: rec.gammaGrossCount1}
            },
            name: "Gamma Count",
            lineColor: "red",
            backgroundColor: "red"
        });

        return gCurve;
    }

    function createNeutronViewCurve(neutronDatasource: { id: any; }) {
        if (!neutronDatasource) return null;

        let nCurve = new CurveLayer({
            dataSourceIds: [neutronDatasource.id],
            getValues: (rec: any, timestamp: any) => {
                // console.log(rec.neutronGrossCount1);
                return {x: timestamp, y: rec.neutronGrossCount1}
            },
            name: 'Neutron Count',
            lineColor: "blue",
            backgroundColor: "blue"
        });

        return nCurve;
    }

    function createThresholdViewCurve(thresholdDatasource: { id: any; }) {
        if (!thresholdDatasource) return null;

        let thresholdCurve = new CurveLayer({
            dataSourceIds: [thresholdDatasource.id],
            getValues: (rec: any, timestamp: any) => ({x: timestamp, y: rec.threshold}),
            name: "Gamma Threshold"
        });

        return thresholdCurve;
    }

    function createOccupancyViewCurve(occDatasource: { id: any; }) {
        if (!occDatasource) return null;

        let occCurve = new CurveLayer({
            dataSourceIds: [occDatasource.id],
            getValues: (rec: any, timestamp: any) => ({x: timestamp, y: rec.occupancy}),
            name: "Occupancy"
        });

        return occCurve;
    }

    function createCurveLayersAndReturn() {
        let tCurve = createThresholdViewCurve(props.datasources.threshold);
        let gCurve = createGammaViewCurve(props.datasources.gamma);
        let nCurve = createNeutronViewCurve(props.datasources.neutron);
        return {
            gamma: gCurve,
            neutron: nCurve,
            threshold: tCurve
        }
    }

    const resetView = useCallback(() => {
        if (!eventPreview.isOpen) {
            gammaChartViewRef.current = null;
            neutronChartViewRef.current = null;
            setIsReadyToRender(false);
        }

    }, [eventPreview]);

    function createChartViews(layers: { gamma: any, threshold: any, neutron: any }, elementIds: string[]) {
        console.log("Creating Chart Views", layers, elementIds);
        let newChartViews: any = {gamma: null, neutron: null};

        for (let id of elementIds) {

            if (id.includes("gamma")) {

                let gammaChartElt = document.createElement("div");
                gammaChartElt.id = id;
                gammaChartViewRef.current.appendChild(gammaChartElt);

                console.log("Creating Gamma Chart in elmt", gammaChartViewRef.current);
                let gammaChart = new ChartJsView({
                    container: id,
                    layers: [layers.gamma, layers.threshold],
                    css: "chart-view-event-detail",
                });
                console.log("Created Gamma Chart", gammaChart);
                newChartViews.gamma = gammaChart;
                setGammaChartView(gammaChart);
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
                });
                console.log("Created Neutron Chart", neutronChart);
                newChartViews.neutron = neutronChart;
                setNeutronChartView(neutronChart);
            }
            // }
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
                // setGammaChartID(gammaId);
                ids.push(gammaId);
                break;
            case "Neutron":
                neutronId = neutronChartBaseId + eventData.id + "-" + props.modeType;
                // setNeutronChartID(neutronId);
                ids.push(neutronId);
                break;
            case "Gamma & Neutron":
                gammaId = gammaChartBaseId + eventData.id + "-" + props.modeType;
                neutronId = neutronChartBaseId + eventData.id + "-" + props.modeType;
                // setGammaChartID(gammaId);
                // setNeutronChartID(neutronId);
                ids.push(gammaId, neutronId);
                // setBothChartID(bothChartBaseId + eventData.id + "-" + props.modeType);
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
                    console.log("Annotating Gamma Chart", gammaChartView);
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


    if (eventPreview.eventData?.status === "Gamma") {
        return (
            <Box sx={{width: "100%"}} ref={gammaChartViewRef}>
                <Typography variant="h6">Gamma Readings</Typography>
                {/*<div id={gammaChartID} ref={gammaChartViewRef}></div>*/}
            </Box>
        );
    } else if (eventPreview.eventData?.status === "Neutron") {
        return (
            <Box sx={{width: "100%"}} ref={neutronChartViewRef}>
                <Typography variant="h6">Neutron Readings</Typography>
                {/*<div id={neutronChartID} ref={neutronChartViewRef}></div>*/}
            </Box>
        );
    } else if (eventPreview.eventData?.status === "Gamma & Neutron") {
        return (
            <Box sx={{width: "100%"}}>
                <div ref={gammaChartViewRef}>
                    <Typography variant="h6">Gamma Readings</Typography>
                </div>
                <div ref={neutronChartViewRef}>
                    <Typography variant="h6">Neutron Readings</Typography>
                </div>
            </Box>
        );
    } else {
        return (
            <Typography variant="h6">No Event Data</Typography>
        );
    }
}
