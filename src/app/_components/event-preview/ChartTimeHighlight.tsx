/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */
'use client';

import {useCallback, useEffect, useRef, useState} from "react";
import {Typography} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectEventPreview} from "@/lib/state/OSCARClientSlice";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView.js";
import CurveLayer from 'osh-js/source/core/ui/layer/CurveLayer.js';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import annotationPlugin from 'chartjs-plugin-annotation';
import {Chart, registerables} from 'chart.js';
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";

Chart.register(...registerables, annotationPlugin);

export class ChartInterceptProps {
    gammaDatasources: typeof SweApi[];
    neutronDatasources: typeof SweApi[];
    occDatasources: typeof SweApi[];
    thresholdDatasources: typeof SweApi[];
    setChartReady: Function;
    modeType: string;
    syncRef?: typeof DataSynchronizer;
    currentTime: any;
}

export default function ChartTimeHighlight(props: ChartInterceptProps) {
    const eventPreview = useSelector((state: RootState) => selectEventPreview(state));
    const [chartsReady, setChartsReady] = useState<boolean>(false);
    const [viewReady, setViewReady] = useState<boolean>(false);
    const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);

    // chart specifics
    const timeVert = useState<Date>;
    const horizontalThreshold = useState<number>(0);
    const gammaChartViewRef = useRef<typeof ChartJsView | null>(null);
    const neutronChartViewRef = useRef<typeof ChartJsView | null>(null);
    const [thresholdCurve, setThresholdCurve] = useState<typeof CurveLayer>();
    const [gammaCurve, setGammaCurve] = useState<typeof CurveLayer>();
    const [neutronCurve, setNeutronCurve] = useState<typeof CurveLayer>();
    const [occupancyCurve, setOccupancyCurve] = useState<typeof CurveLayer>();
    const gammaChartBaseId = "chart-view-event-detail-gamma-";
    const neutronChartBaseId = "chart-view-event-detail-neutron-";
    const bothChartBaseId = "chart-view-event-detail-both-";
    const [gammaChartID, setGammaChartID] = useState<string>("");
    const [neutronChartID, setNeutronChartID] = useState<string>("");
    const [bothChartID, setBothChartID] = useState<string>("");

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


    const createCurveLayers = useCallback(() => {
        // console.log("LocalDSMap", localDSMap);
        if (props.thresholdDatasources.length > 0) {
            console.log("Threshold DS", props.thresholdDatasources);

            let tCurve = createThresholdViewCurve(props.thresholdDatasources[0]);
            setThresholdCurve(tCurve);
        }

        if (props.gammaDatasources.length > 0) {
            console.log("Gamma DS", props.gammaDatasources);

            let gCurve = createGammaViewCurve(props.gammaDatasources[0]);
            setGammaCurve(gCurve);
        }

        if (props.neutronDatasources.length > 0) {
            console.log("Neutron DS", props.neutronDatasources);

            let nCurve = createNeutronViewCurve(props.neutronDatasources[0]);
            setNeutronCurve(nCurve);
        }

        setChartsReady(true);
    }, [props]);

    const resetView = useCallback(() => {
        if (!eventPreview.isOpen) {
            gammaChartViewRef.current.destroy();
            neutronChartViewRef.current.destroy();
            gammaChartViewRef.current = null;
            neutronChartViewRef.current = null;
            setIsReadyToRender(false);
        }

    }, [eventPreview]);

    useEffect(() => {
        resetView();
    }, [resetView]);

    const checkForMountableAndCreateCharts = useCallback(() => {
        if (!gammaChartViewRef.current && thresholdCurve && gammaCurve) {
            console.log("Creating Gamma Chart:", thresholdCurve, gammaCurve);

            const container = document.getElementById(gammaChartID);
            if (container) {
                gammaChartViewRef.current = new ChartJsView({
                    container: gammaChartID,
                    layers: [thresholdCurve, gammaCurve],
                    css: "chart-view-event-detail",
                });

                setViewReady(true);
            }
        }

        if (!neutronChartViewRef.current && neutronCurve) {
            console.log("Creating Neutron Chart:", neutronCurve);

            const containerN = document.getElementById(neutronChartID);
            if (containerN) {
                neutronChartViewRef.current = new ChartJsView({
                    container: neutronChartID,
                    layers: [neutronCurve],
                    css: "chart-view-event-detail",
                });
                setViewReady(true);
            }
        }
    }, [thresholdCurve, gammaCurve, neutronCurve, isReadyToRender]);

    const checkReadyToRender = useCallback(() => {
        if (chartsReady && viewReady) {
            setIsReadyToRender(true);
        } else {
            setIsReadyToRender(false);
        }
    }, [chartsReady, viewReady]);

    useEffect(() => {
        checkForMountableAndCreateCharts();
    }, [checkForMountableAndCreateCharts]);

    useEffect(() => {
        checkReadyToRender();
    }, [chartsReady, viewReady]);

    useEffect(() => {
        if (isReadyToRender) {
            console.log("Chart is ready to render");
            props.setChartReady(true);
        }
    }, [isReadyToRender]);

    const updateChartElIds = useCallback(() => {
        if (eventPreview.eventData?.status === "Gamma") {
            setGammaChartID(gammaChartBaseId + eventPreview.eventData?.id + "-" + props.modeType);
        } else if (eventPreview.eventData?.status === "Neutron") {
            setNeutronChartID(neutronChartBaseId + eventPreview.eventData?.id + "-" + props.modeType);
        } else if (eventPreview.eventData?.status === "Gamma & Neutron") {
            setBothChartID(bothChartBaseId + eventPreview.eventData?.id + "-" + props.modeType);
        }
    }, [eventPreview]);

    useEffect(() => {
        updateChartElIds();
    }, [eventPreview, props]);


    useEffect(() => {
        if (checkForProvidedDataSources()) {
            createCurveLayers();
        }
    }, [props]);

    function checkForProvidedDataSources() {
        console.log("[CI] Checking for provided data sources...");
        if (!props.gammaDatasources || !props.neutronDatasources || !props.thresholdDatasources) {
            console.warn("No DataSources provided for ChartTimeHighlight");
            return false;
        } else {
            return true;
        }
    }

    // const checkForProvidedDataSources = useCallback(() => {
    //     console.log("[CI] Checking for provided data sources...");
    //     if (!props.gammaDatasources || !props.neutronDatasources || !props.thresholdDatasources) {
    //         console.warn("No DataSources provided for ChartTimeHighlight");
    //         return false;
    //     } else {
    //         return true;
    //     }
    // }, [props.gammaDatasources, props.neutronDatasources, props.thresholdDatasources]);

    useEffect(() => {
        let currTime = props.currentTime;
        if (currTime?.data !== undefined) {
            let theTime = new Date(currTime.data);
            console.log("Current Time: ", currTime, theTime);
            let chartAnnotation = {
                annotations: {
                    verticalLine: {
                        type: 'line',
                        // value: props.syncRef.getCurrentTime(),
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
            if (gammaChartViewRef.current) {
                const gchart = gammaChartViewRef.current.chart;
                gchart.options.plugins.annotation = chartAnnotation;
                gchart.update();
            }
            if (neutronChartViewRef.current) {
                const nchart = neutronChartViewRef.current.chart;
                nchart.options.plugins.annotation = chartAnnotation;
                nchart.update();
            }
        }
    }, [props.currentTime, gammaChartViewRef]);


    if (eventPreview.eventData?.status === "Gamma") {
        return (
            <div>
                <Typography variant="h6">Gamma Readings</Typography>
                <div id={gammaChartID}></div>
            </div>
        );
    } else if (eventPreview.eventData?.status === "Neutron") {
        return (
            <div>
                <Typography variant="h6">Neutron Readings</Typography>
                <div id={neutronChartID}></div>
            </div>
        );
    } else if (eventPreview.eventData?.status === "Gamma & Neutron") {
        return (
            <div>
                <Typography variant="h6">Gamma Readings</Typography>
                <div id={gammaChartID}></div>
                <Typography variant="h6">Neutron Readings</Typography>
                <div id={neutronChartID}></div>
            </div>
        );
    } else {
        return (
            <Typography variant="h6">No Event Data</Typography>
        );
    }
}