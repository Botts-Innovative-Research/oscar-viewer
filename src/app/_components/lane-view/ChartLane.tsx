"use client"


import {Grid} from "@mui/material";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import React, {useCallback, useEffect, useRef, useState} from "react";
import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView";
import {
    createGammaSigmaCalcViewCurve,
    createGammaViewCurve,
    createNeutronViewCurve,
    createThresholdViewCurve
} from "@/app/utils/ChartUtils";

export class ChartInterceptProps {
    laneName: string;
    datasources: { gamma: typeof SweApi, neutron: typeof SweApi, threshold: typeof SweApi };
    setChartReady: Function;
}

export default function ChartLane(props: ChartInterceptProps){


    const [chartsReady, setChartsReady] = useState<boolean>(false);
    const [viewReady, setViewReady] = useState<boolean>(false);
    const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);

    const gammaChartBaseId = "chart-view-gamma";
    const neutronChartBaseId = "chart-view-neutron";

    const [gammaChartID, setGammaChartID] = useState<string>(gammaChartBaseId);
    const [neutronChartID, setNeutronChartID] = useState<string>(neutronChartBaseId);

    const [gammaCurve, setGammaCurve] = useState<typeof CurveLayer>();
    const [gammaSigmaCurve, setGammaSigmaCurve] = useState<typeof CurveLayer>();
    const [neutronCurve, setNeutronCurve] = useState<typeof CurveLayer>();

    const gammaChartViewRef = useRef<typeof ChartJsView | null>(null);
    const neutronChartViewRef = useRef<typeof ChartJsView | null>(null);


    const createCurveLayers = useCallback(() =>{

        if(props.datasources.gamma){

            if(props.datasources.threshold){
                let sCurve = createGammaSigmaCalcViewCurve(props.datasources.gamma, props.datasources.threshold);
                setGammaSigmaCurve(sCurve);

            }

            let gCurve = createGammaViewCurve(props.datasources.gamma);
            setGammaCurve(gCurve);
        }


        if(props.datasources.neutron){
            let nCurve = createNeutronViewCurve(props.datasources.neutron);
            setNeutronCurve(nCurve);
        }

    },[props.datasources]);


    const checkForMountableAndCreateCharts = useCallback(() => {

        if (!gammaChartViewRef.current && !isReadyToRender && (gammaSigmaCurve || gammaCurve)) {
            console.log("Creating Gamma Chart:", gammaSigmaCurve, gammaCurve);

            const container = document.getElementById(gammaChartID);
            let layers: any[] =[];

            if (gammaCurve) {
                layers.push(gammaCurve);
            }
            if (gammaSigmaCurve) {
                layers.push(gammaSigmaCurve);
            }

            if (container) {
                gammaChartViewRef.current = new ChartJsView({
                    type: 'line',
                    container: gammaChartID,
                    layers: layers,
                    css: "chart-view-lane-view",
                    options:{
                        responsive: true,
                        scales: {
                            'left-y-axis': {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                ticks: { beginAtZero: true, color: '#f44336' },
                                grid: {display: false,  drawOnChartArea: false,}

                            },
                            'right-y-axis':{
                                type: 'linear',
                                display: true,
                                ticks: { beginAtZero: true, color: '#9b27b0' },
                                position: 'right',
                                grid: {display: false,  drawOnChartArea: false,}

                            },
                        },
                    },
                });
                setViewReady(true);
            }
        }

        if (!neutronChartViewRef.current && !isReadyToRender && neutronCurve) {
            console.log("Creating Neutron Chart:", neutronCurve);

            const containerN = document.getElementById(neutronChartID);
            if (containerN) {
                neutronChartViewRef.current = new ChartJsView({
                    container: neutronChartID,
                    layers: [neutronCurve],
                    css: "chart-view",
                    chartjsProps: {
                        chartProps: {
                            scales: {
                                yAxes: [{

                                    scaleLabel: {
                                        labelString: "CPS"
                                    },
                                    ticks: {
                                        maxTicksLimit: 20
                                    }
                                }],
                                xAxes: [{
                                    scaleLabel: {
                                        labelString: "Time"
                                    },
                                    ticks: {
                                        maxTicksLimit: 20
                                    }
                                }],
                            },
                            maintainAspectRatio: false
                        }
                    }, datasetsProps: {
                        backgroundColor: 'rgba(141,242,246, 0.1)'
                    }
                });
                setViewReady(true);
            }
        }
    }, [gammaSigmaCurve, gammaCurve, neutronCurve, isReadyToRender]);

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
        if (checkForProvidedDataSources()) {
            createCurveLayers();
        }
    }, [props]);


    useEffect(() => {
        checkReadyToRender();
    }, [chartsReady, viewReady]);

    useEffect(() => {
        if (isReadyToRender) {
            console.log("Chart is ready to render");
            props.setChartReady(true);
        }
    }, [isReadyToRender]);


    const checkForProvidedDataSources = useCallback(() => {
        console.log("[CI] Checking for provided data sources...");
        if (!props.datasources) {
            console.warn("No DataSources provided for ChartTimeHighlight");
            return false;
        } else {
            return true;
        }
    }, [props.datasources]);


    return (
        <Grid container direction="row" marginTop={2} marginLeft={1} spacing={4}>
            <Grid item xs>
                <div id={gammaChartID} style={{
                    marginBottom: 50,
                    height: '85%',
                }}></div>
            </Grid>
            <Grid item xs>
                <div id={neutronChartID} style={{
                    marginBottom: 50,
                    height: '85%',
                }}></div>
            </Grid>
        </Grid>
    );
};
