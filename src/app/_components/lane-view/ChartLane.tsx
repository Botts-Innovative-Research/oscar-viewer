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
    datasources: {
        gamma: typeof ConSysApi,
        neutron: typeof ConSysApi,
        threshold: typeof ConSysApi
    };
    setChartReady: Function;
}

export default function ChartLane(props: ChartInterceptProps){

    const gammaChartID = "chart-view-gamma";
    const neutronChartID = "chart-view-neutron";

    const [gammaCurve, setGammaCurve] = useState<typeof CurveLayer>();
    const [neutronCurve, setNeutronCurve] = useState<typeof CurveLayer>();
    const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);

    const gammaChartViewRef = useRef<typeof ChartJsView | null>(null);
    const neutronChartViewRef = useRef<typeof ChartJsView | null>(null);


    const createCurveLayers = useCallback(() => {
        if(props.datasources.gamma)
            setGammaCurve(createGammaViewCurve(props.datasources.gamma));

        if(props.datasources.neutron)
            setNeutronCurve(createNeutronViewCurve(props.datasources.neutron));

    },[props.datasources]);

    const checkForMountableAndCreateCharts = useCallback(() => {

        if (!isReadyToRender && gammaCurve && !gammaChartViewRef.current) {
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

        if (!isReadyToRender && neutronCurve && !neutronChartViewRef.current) {
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

        if(!isReadyToRender && (gammaCurve || neutronCurve)){
            setIsReadyToRender(true);
            // props.setChartReady(true);
        }

    }, [gammaCurve, neutronCurve, isReadyToRender, props.setChartReady]);

    const checkForProvidedDataSources = useCallback(() => {
        if (!props.datasources) {
            console.warn("No DataSources provided for ChartTimeHighlight");
            return false;
        }
        return true;

    }, [props.datasources]);

    const checkReadyToRender = useCallback(() => {
        if (props.setChartReady()) {
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

    useEffect(() => {
        return() => {
            console.log("Charts unmounted, cleaning up resources");

            if(gammaChartViewRef.current != null){
                gammaChartViewRef.current.destroy();
                gammaChartViewRef.current = undefined;
            }

            if(neutronChartViewRef.current != null){
                neutronChartViewRef.current.destroy();
                neutronChartViewRef.current = undefined;
            }

            setGammaCurve(null);
            setNeutronCurve(null);
            setIsReadyToRender(false);
            props.setChartReady(false);
        };
    }, []);

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
