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
type ChartMode = 'total' | 'gamma' | 'neutron';

export default function ChartLane({laneName, datasources, setChartReady}: ChartInterceptProps) {
    const {t} = useLanguage();

    const gammaChartID = "chart-view-gamma";
    const neutronChartID = "chart-view-neutron";

    const neutronDetectorChartIds = [
        "neutron-detector-1",
        "neutron-detector-2",
        "neutron-detector-3",
        "neutron-detector-4",
    ];

    const gammaDetectorChartIds = [
        "gamma-detector-1",
        "gamma-detector-2",
        "gamma-detector-3",
        "gamma-detector-4",
    ];
    const [mode, setMode] = useState<ChartMode>('total');
    const chartViewsRef = useRef<any[]>([]);

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
        const labels = { time: t('time'), gamma: t('gamma'), neutron: t('neutron'), threshold: t('threshold') };
        const views: any[] = [];

        const addChart = (container: string, layers: any[], title: string) => {
            if (layers.length === 0 || !document.getElementById(container)) return;

            views.push(new ChartJsView({
                type: 'line',
                container,
                layers,
                css: 'chart-view',
                options: createOptions(title),
            }));
        };

        if (mode === 'total') {
            const gammaLayers = [
                createGammaViewCurve(datasources.gamma, labels),
                createThresholdViewCurve(datasources.threshold, labels),
            ].filter(Boolean);
            const neutronLayers = [createNeutronViewCurve(datasources.neutron, labels)].filter(Boolean);

            addChart(gammaChartID, gammaLayers, t('gammaChart'));
            addChart(neutronChartID, neutronLayers, t('neutronChart'));
        } else {
            const curves = mode === 'gamma'
                ? createGammaDetectorViewCurves(datasources.gamma, labels)
                : createNeutronDetectorViewCurves(datasources.neutron, labels);
            const chartLabel = t('detector');

            const chartIds = mode === 'gamma'
                ? gammaDetectorChartIds
                : neutronDetectorChartIds;

            curves.forEach((curve, index) => {
                addChart(chartIds[index], [curve], `${chartLabel} ${index + 1}`);
            });
        }

        chartViewsRef.current = views;
        return () => {
            views.forEach(view => view.chart?.destroy());
            chartViewsRef.current = [];
        };
    }, [datasources.gamma, datasources.neutron, datasources.threshold, laneName, mode, t]);

    useEffect(() => {
        const ready = Boolean(datasources.gamma || datasources.neutron);
        setChartReady(ready);

        return () => setChartReady(false);
    }, [datasources.gamma, datasources.neutron, setChartReady]);

    const handleToggle = (event: React.MouseEvent<HTMLElement>, newView: ChartMode | null) => {
        if (newView) setMode(newView);
    };

    const renderToggleButtons = () => (
        <Grid item xs={12}>
            <ToggleButtonGroup
                aria-label={`chart mode`}
                exclusive
                onChange={handleToggle}
                size="small"
                value={mode}
            >
                <ToggleButton
                    value="total"
                    disabled={mode === 'total'}
                >
                    {t('chartModeTotal')}
                </ToggleButton>
                <ToggleButton
                    value="gamma"
                    disabled={mode === 'gamma'}
                >
                    {t('chartModeGammaDetectors')}
                </ToggleButton>
                <ToggleButton
                    value="neutron"
                    disabled={mode === 'neutron'}
                >
                    {t('chartModeNeutronDetectors')}
                </ToggleButton>
            </ToggleButtonGroup>
        </Grid>
    );

    const renderTotalCharts = () => (
        <Grid container xs={12}>
            <Grid item xs={12} md={6}>
                <div
                    id={gammaChartID}
                    style={{
                        marginBottom: 25,
                        height: '360px'
                    }}
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <div
                    id={neutronChartID}
                    style={{
                        marginBottom: 25,
                        height: '360px'
                    }}
                />
            </Grid>
        </Grid>
    );

    const renderDetectorCharts = (mode: ChartMode) => {
        const chartIds = mode === 'gamma'
            ? gammaDetectorChartIds
            : neutronDetectorChartIds;

        return (
            <Grid container spacing={2} xs={12}>
                {chartIds.map(chartId => (
                    <Grid item xs={12} md={6} key={chartId}>
                        <div id={chartId} style={{height: '360px'}}/>
                    </Grid>
                ))}
            </Grid>
        )
    };

    const renderChartsByMode = () => {
        switch (mode) {
            case "total":
                return (
                    <>
                        {renderToggleButtons()}
                        {renderTotalCharts()}
                    </>
                );
            case "gamma":
                return (
                    <>
                        {renderToggleButtons()}
                        {renderDetectorCharts("gamma")}
                    </>
                );

            case "neutron":
                return (
                    <>
                        {renderToggleButtons()}
                        {renderDetectorCharts("neutron")}
                    </>
                );

        }
    }

    return (
        <Grid container spacing={2} alignItems="center">
            {renderChartsByMode()}
        </Grid>
    );
}
