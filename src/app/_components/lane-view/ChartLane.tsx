"use client"


import {Box, Grid} from "@mui/material";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import React, {useEffect, useRef} from "react";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView";
import {
    createGammaViewCurve,
    createNeutronViewCurve,
    createThresholdViewCurve,
} from "@/app/utils/ChartUtils";
import {useLanguage} from '@/app/contexts/LanguageContext';

export class ChartInterceptProps {
    laneName: string;
    datasources: {
        gamma: typeof ConSysApi,
        neutron: typeof ConSysApi,
        threshold: typeof ConSysApi
    };
    setChartReady: Function;
}

export default function ChartLane({laneName, datasources, setChartReady}: ChartInterceptProps){
    const {t} = useLanguage();

    const gammaChartID = "chart-view-gamma";
    const neutronChartID = "chart-view-neutron";

    const gammaChartViewRef = useRef<typeof ChartJsView | null>(null);
    const neutronChartViewRef = useRef<typeof ChartJsView | null>(null);

    useEffect(() => {
        setChartReady(false);

        const labels = {time: t('time'), gamma: t('gamma'), neutron: t('neutron'), threshold: t('threshold')};
        const gammaCurve = createGammaViewCurve(datasources.gamma, labels);
        const neutronCurve = createNeutronViewCurve(datasources.neutron, labels);
        const thresholdCurve = createThresholdViewCurve(datasources.threshold, labels);

        if (gammaCurve) {
            const container = document.getElementById(gammaChartID);

            if (container) {
                gammaChartViewRef.current = new ChartJsView({
                    type: 'line',
                    container: gammaChartID,
                    layers: thresholdCurve ? [gammaCurve, thresholdCurve] : [gammaCurve],
                    css: "chart-view",
                    options:{
                        plugins: {
                            title: {
                                display: true,
                                text: t('gammaChart'),
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
                                    text: t('time'),
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

        if (neutronCurve) {
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
                                text: t('neutronChart'),
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
                                    text: t('time'),
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
                                    stepSize: 1
                                },

                            },
                        }
                    },
                });
            }
        }

        if (gammaCurve || neutronCurve) {
            setChartReady(true);
        }

        return () => {
            gammaChartViewRef.current?.destroy();
            neutronChartViewRef.current?.destroy();
            gammaChartViewRef.current = null;
            neutronChartViewRef.current = null;
            setChartReady(false);
        };
    }, [laneName, datasources.gamma, datasources.neutron, datasources.threshold, setChartReady, t]);


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
