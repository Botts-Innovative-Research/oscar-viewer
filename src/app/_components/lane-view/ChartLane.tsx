"use client";

import {Box, Grid, ToggleButton, ToggleButtonGroup} from "@mui/material";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import React, {useEffect, useRef, useState} from "react";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView";
import {
    createGammaDetectorViewCurves,
    createGammaViewCurve,
    createNeutronDetectorViewCurves,
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
    setChartReady: (ready: boolean) => void;
}
type ChartMode = 'sum' | 'individual';

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
        const labels = { time: t('time'), gamma: t('gamma'), threshold: t('threshold') };
        const gammaLayers = gammaMode === 'sum'
            ? [createGammaViewCurve(datasources.gamma, labels)]
            : createGammaDetectorViewCurves(datasources.gamma, labels);
        const thresholdCurve = createThresholdViewCurve(
            datasources.threshold,
            labels,
        );

        const validGammaLayers = gammaLayers.filter((layer) => layer !== null);
        if (validGammaLayers.length > 0 && document.getElementById(gammaChartID)) {
            gammaChartViewRef.current = new ChartJsView({
                type: 'line',
                container: gammaChartID,
                layers: thresholdCurve ? [...validGammaLayers, thresholdCurve] : validGammaLayers,
                css: "chart-view",
                options: createOptions(t('gammaChart')),
            });
        }

        return () => {
            gammaChartViewRef.current?.chart?.destroy();
            gammaChartViewRef.current?.destroy();
            gammaChartViewRef.current = null;
        };
    }, [laneName, datasources.gamma, datasources.threshold, gammaMode, t]);

    useEffect(() => {
        const labels = {time: t('time'), neutron: t('neutron')};
        const neutronLayers = neutronMode === 'sum'
            ? [createNeutronViewCurve(datasources.neutron, labels)]
            : createNeutronDetectorViewCurves(datasources.neutron, labels);

        const validNeutronLayers = neutronLayers.filter((layer) => layer !== null);
        if (validNeutronLayers.length > 0 && document.getElementById(neutronChartID)) {
            neutronChartViewRef.current = new ChartJsView({
                type: 'line',
                container: neutronChartID,
                layers: validNeutronLayers,
                css: "chart-view",
                options: createOptions( t('neutronChart')),
            });
        }

        return () => {
            neutronChartViewRef.current?.chart?.destroy();
            neutronChartViewRef.current?.destroy();
            neutronChartViewRef.current = null;
        };
    }, [laneName, datasources.neutron, neutronMode, t]);

    useEffect(() => {
        const ready = Boolean(datasources.gamma || datasources.neutron);
        setChartReady(ready);

        return () => setChartReady(false);
    }, [datasources.gamma, datasources.neutron, setChartReady]);


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
                disabled={value === 'sum'}
            >
                {t('chartModeSum')}
            </ToggleButton>
            <ToggleButton
                value="individual"
                disabled={value === 'individual'}
            >
                {t('chartModeIndividual')}
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
                margin={2}
                spacing={4}
            >
                <Grid item xs>
                    <Box
                        display="flex"
                        justifyContent="center"
                        marginBottom={1}
                    >
                        { renderModeToggle(gammaMode, setGammaMode, t('gamma')) }
                    </Box>
                    <div
                        id={gammaChartID}
                        style={{
                            marginBottom: 25,
                            height: '360px'
                    }}
                    />
                </Grid>
                <Grid item xs>
                    <Box
                        display="flex"
                        justifyContent="center"
                        marginBottom={1}
                    >
                        { renderModeToggle(neutronMode, setNeutronMode, t('neutron')) }
                    </Box>
                    <div
                        id={neutronChartID}
                        style={{
                            marginBottom: 25,
                            height: '360px'
                        }}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
