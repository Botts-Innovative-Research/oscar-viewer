"use client"


import {Box, Grid} from "@mui/material";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import React, {useCallback, useEffect, useRef, useState} from "react";
import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView";
import {
    createGammaViewCurve,
    createNeutronViewCurve,
} from "@/app/utils/ChartUtils";

export class ChartInterceptProps {
    laneName: string;
    datasources: { gamma: typeof ConSysApi, neutron: typeof ConSysApi, threshold: typeof ConSysApi };
    setChartReady: Function;
}

export default function ChartLane(props: ChartInterceptProps){

    const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);

    const gammaChartBaseId = "chart-view-gamma";
    const neutronChartBaseId = "chart-view-neutron";

    const [gammaChartID, setGammaChartID] = useState<string>(gammaChartBaseId);
    const [neutronChartID, setNeutronChartID] = useState<string>(neutronChartBaseId);

    const [gammaCurve, setGammaCurve] = useState<typeof CurveLayer>();
    const [neutronCurve, setNeutronCurve] = useState<typeof CurveLayer>();

    const gammaChartViewRef = useRef<typeof ChartJsView | null>(null);
    const neutronChartViewRef = useRef<typeof ChartJsView | null>(null);


    const createCurveLayers = useCallback(() =>{
        if(props.datasources.gamma){
            let gCurve = createGammaViewCurve(props.datasources.gamma);
            setGammaCurve(gCurve);
        }


        if(props.datasources.neutron){
            let nCurve = createNeutronViewCurve(props.datasources.neutron);
            setNeutronCurve(nCurve);
        }

    },[props.datasources]);


    const checkForMountableAndCreateCharts = useCallback(() => {

        if (!gammaChartViewRef.current && !isReadyToRender && gammaCurve) {
            console.log("Creating Gamma Chart with layers:", { gammaCurve});

            const container = document.getElementById(gammaChartID);

            if (container) {
                gammaChartViewRef.current = new ChartJsView({
                    type: 'line',
                    container: gammaChartID,
                    layers: [gammaCurve],
                    css: "chart-view",
                    options:{
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
                            legend: {
                                display: true,
                                align: 'center',
                                position: 'bottom',
                            }
                        },
                        responsive: true,
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'Time',
                                },
                            },
                            y:{
                                title:{
                                    display: true,
                                    text: 'CPS',

                                },
                                display: true,
                                position: 'left',
                                align: 'center',
                                grid: {beginAtZero: false},
                                ticks: {
                                },


                            },
                        },
                    },
                });
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
                        responsive: true,
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'Time',
                                },
                            },
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
            }
        }

        props.setChartReady(true);
    }, [gammaCurve, neutronCurve, isReadyToRender]);

    const checkReadyToRender = useCallback(() => {
        if ( props.setChartReady()) {
            setIsReadyToRender(true);
        } else {
            setIsReadyToRender(false);
        }
    }, [ props.setChartReady]);

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
    }, [ props.setChartReady]);

    useEffect(() => {
        if (isReadyToRender) {
            console.log("Lane View: Chart is ready to render");
            props.setChartReady(true);
        }
    }, [isReadyToRender]);


    const checkForProvidedDataSources = useCallback(() => {
        if (!props.datasources) {
            console.warn("No DataSources provided for ChartTimeHighlight");
            return false;
        } else {
            return true;
        }
    }, [props.datasources]);


    return (
        <Box display='flex' alignItems="center">
            <Grid container direction="row" marginTop={2} marginLeft={1} spacing={4}>
                <Grid item xs>
                    <div id={gammaChartID} style={{marginBottom: 50, height: '85%',}}></div>
                </Grid>
                <Grid item xs>
                    <div id={neutronChartID} style={{marginBottom: 50, height: '85%',}}></div>
                </Grid>
            </Grid>
        </Box>

    );
};
