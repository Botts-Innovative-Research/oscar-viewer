"use client"


import {Grid} from "@mui/material";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import React, {useCallback, useEffect, useRef, useState} from "react";
import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView";
import {
    createNSigmaCalcViewCurve,
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
    const [thresholdCurve, setThresholdCurve] = useState<typeof CurveLayer>();
    const [nSigmaCurve, setNSigmaCurve] = useState<typeof CurveLayer>();
    const [neutronCurve, setNeutronCurve] = useState<typeof CurveLayer>();

    const gammaChartViewRef = useRef<typeof ChartJsView | null>(null);
    const neutronChartViewRef = useRef<typeof ChartJsView | null>(null);


    const createCurveLayers = useCallback(() =>{

        if(props.datasources.gamma){

            if(props.datasources.threshold){
                let nCurve = createNSigmaCalcViewCurve(props.datasources.gamma, props.datasources.threshold);
                setNSigmaCurve(nCurve);

                let tCurve = createThresholdViewCurve(props.datasources.threshold);
                setThresholdCurve(tCurve);
                console.log('new thres curve layer created')
            }

            let gCurve = createGammaViewCurve(props.datasources.gamma);
            setGammaCurve(gCurve);
            console.log('new gamma curve layer created')
        }


        if(props.datasources.neutron){
            let nCurve = createNeutronViewCurve(props.datasources.neutron);
            setNeutronCurve(nCurve);
            console.log('new neutorn curve layer created')
        }

    },[props.datasources]);


    const checkForMountableAndCreateCharts = useCallback(() => {

        if (!gammaChartViewRef.current && !isReadyToRender && (thresholdCurve || gammaCurve)) {
            console.log("Creating Gamma Chart with layers:", { gammaCurve, thresholdCurve });

            const container = document.getElementById(gammaChartID);
            let layers: any[] =[];

            if (gammaCurve) {
                layers.push(gammaCurve);
            }
            if (thresholdCurve) {
                layers.push(thresholdCurve);
            }

            if (container) {
                gammaChartViewRef.current = new ChartJsView({
                    container: gammaChartID,
                    layers: layers,
                    css: "chart-view-lane-view",
                    options:{
                        // interaction: {
                        //     intersect: false,
                        //     mode: 'index',
                        // },
                        plugins: {
                            title: {
                                display: true,
                                text: 'Gamma Chart',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                },
                                align: 'center',
                                position: 'top',

                            },

                            //count threshold legend position
                            legend: {
                                display: true,
                                align: 'center',
                                position: 'bottom',
                            }
                        },
                        autoPadding: true,
                        responsive: true, //resizes chart based on container size... good for browser changing size
                        scales: {
                            y:{
                                title:{
                                    display: true,
                                    text: 'CPS',

                                },
                                display: true,
                                position: 'left',
                                align: 'center',
                                // suggestedMin: 0,
                                suggestedMax: 1500,
                                ticks: {

                                },
                                grid: {display: false, beginAtZero: false}

                            },
                            'right-y-axis':{
                                title:{
                                    display: true,
                                    text: 'Sigma',
                                },
                                display: true,
                                position: 'left',
                                suggestedMin: -10,
                                suggestedMax: 10,


                                // ticks: {
                                //     beginAtZero: false, color: '#9b27b0' ,
                                //     callback: function(value: any){
                                //
                                //         return value
                                //     }
                                // },
                                ticks: {
                                    // callback: function(value: any, index: any, ticks: any){
                                    //     //value is the tick value on the axi
                                    //     //index
                                    //     let gammaValues = gammaCurve.data;
                                    //     let thresholdValues = thresholdCurve.data;
                                    //
                                    //     let sigmaValues = nSigmaCurve.data;
                                    //
                                    //     if(sigmaValues.length> 0){
                                    //         console.log(sigmaValues[0].y)
                                    //     }
                                    //
                                    //     if(thresholdValues.length > 0 && gammaValues.length> 0){
                                    //
                                    //         // console.log('thres data', thresholdValues[0].y,'gammaVals', gammaValues[0].y)
                                    //         value = (thresholdValues[0].y -gammaValues[0].y)/ 32
                                    //         // console.log('value', value)
                                    //         return value.toFixed(0)
                                    //         // return (thresholdValues-gammaValues)/sigmaValues
                                    //     }
                                    //
                                    // }
                                },

                                grid: {display: false,}

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

                    options: {
                        //shows both count and thresh when hover over time index...
                        interaction: {
                            intersect: false,
                            mode: 'index',
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: 'Neutron Chart',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                },
                                align: 'center',
                                position: 'top',
                                padding: {
                                    top: 10,
                                    bottom: 10,

                                }
                            },
                            legend: {
                                display: true,
                                align: 'right',
                                position: 'bottom',


                            }
                        },
                        responsive: true, //resizes chart based on container size... good for browser changing size
                        scales: {
                            y: {
                                title: {
                                    display: true,
                                    text: 'CPS',
                                },
                                display: true,
                                position: 'left',
                                align: 'center',
                                ticks: {
                                },

                            },
                        }
                    },
                });
                setViewReady(true);
            }
        }
    }, [gammaCurve, thresholdCurve, neutronCurve, isReadyToRender]);

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
