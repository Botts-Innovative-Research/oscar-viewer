"use client";

import {Box, Grid, ToggleButton, ToggleButtonGroup} from "@mui/material";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import React, {useEffect, useRef, useState} from "react";
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
    const [gammaMode, setGammaMode] = useState<ChartMode>('sum');
    const [neutronMode, setNeutronMode] = useState<ChartMode>('sum');

    const createOptions = (title: string) => ({
        plugins: {
            title: {
                display: true,
                text: title,
                font: {size: 14, weight: 'bold' as const},
                align: 'center' as const,
                position: 'top' as const,
            },
            legend: {display: true, align: 'center' as const, position: 'bottom' as const}
        },
        responsive: true,
        scales: {
            x: {
                title: {
                    display: true,
                    text: t('time'),
                    padding: 5
                },
                type: 'time'
            },
            y: {
                title: {
                    display: true,
                    text: 'CPS'
                },
                display: true,
                position: 'left' as const,
                grid: {
                    beginAtZero: false
                },
            },
        },
    });

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

    const renderModeToggle = (value: ChartMode, onChange: (mode: ChartMode) => void, label: string) => (
        <ToggleButtonGroup
            aria-label={`${label} chart mode`}
            exclusive
            onChange={(_, mode: ChartMode | null) => mode && onChange(mode)}
            size="small"
            value={value}
        >
            <ToggleButton
                value="sum"
                color='error'
                disabled={value === 'sum'}
            >
                Sum
            </ToggleButton>
            <ToggleButton
                value="individual"
                color='secondary'
                disabled={value === 'individual'}
            >
                Individual detectors
            </ToggleButton>
        </ToggleButtonGroup>
    );

    return (
        <Box
            display="flex"
            alignItems="center"
        >
            <Grid
                container
                direction="row"
                marginTop={2}
                marginLeft={1}
                spacing={4}
            >
                <Grid item xs>
                    <Box
                        display="flex"
                        justifyContent="center"
                        marginBottom={1}
                    >
                        {renderModeToggle(gammaMode, setGammaMode, t('gamma'))}
                    </Box>
                    <div
                        id={gammaChartID}
                        style={{marginBottom: 50, height: '85%'}}
                    />
                </Grid>
                <Grid item xs>
                    <Box
                        display="flex"
                        justifyContent="center"
                        marginBottom={1}
                    >
                        {renderModeToggle(neutronMode, setNeutronMode, t('neutron'))}
                    </Box>
                    <div
                        id={neutronChartID}
                        style={{
                            marginBottom: 50,
                            height: '85%'
                        }}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
