/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */
'use client';

import React, {useEffect, useMemo, useRef, useState} from "react";
import {Box, Grid, ToggleButton, ToggleButtonGroup} from "@mui/material";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView.js";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import annotationPlugin from 'chartjs-plugin-annotation';
import {Chart, registerables} from 'chart.js';
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {
    createGammaViewCurve,
    createGammaDetectorViewCurves,
    createNeutronViewCurve,
    createNeutronDetectorViewCurves,
    createNSigmaCalcViewCurve,
    createThresholdViewCurve, createThreshSigmaViewCurve
} from "@/app/utils/ChartUtils";
import {useLanguage} from '@/app/contexts/LanguageContext';


type CurveLayers = {
    neutron: any;
    gamma: any;
    threshold: any;
    threshNsigma: any;
    nsigma: any;
};

type ChartTypes ={
    gamma?: any;
    neutron?: any;
    nsigma?: any;
}

type ChartMode = "total" | "gamma" | "neutron";

const gammaDetectorChartIds = [
    "event-gamma-detector-1",
    "event-gamma-detector-2",
    "event-gamma-detector-3",
    "event-gamma-detector-4",
];

const neutronDetectorChartIds = [
    "event-neutron-detector-1",
    "event-neutron-detector-2",
    "event-neutron-detector-3",
    "event-neutron-detector-4",
];

Chart.register(...registerables, annotationPlugin);

export class ChartInterceptProps {
    modeType: string;
    datasources: { gamma: typeof ConSysApi, neutron: typeof ConSysApi, threshold: typeof ConSysApi };
    eventData: EventTableData;
    latestGB: number;
    currentTime: any;
    showDetectorModes?: boolean;
}

export default function ChartTimeHighlight(props: ChartInterceptProps) {
    const {language, t} = useLanguage();

    const gammaChartViewRef = useRef<HTMLDivElement | null>(null);
    const nSigmaChartViewRef = useRef<HTMLDivElement | null>(null);
    const neutronChartViewRef = useRef<HTMLDivElement | null>(null);

    const gammaChartBaseId = "chart-view-event-detail-gamma-";
    const neutronChartBaseId = "chart-view-event-detail-neutron-";
    const nsigmaChartBaseId = "chart-view-event-detail-nsigma-";

    const [layers, setLayers] = useState<CurveLayers>();

    const [hasNsigma, setHasNsigma] = useState(false);

    const [chartViews, setChartViews] = useState<ChartTypes>({
        gamma: null,
        neutron: null,
        nsigma: null,
    });

    const [toggleView, setToggleView] = useState("cps");
    const detectorChartViewsRef = useRef<any[]>([]);
    const [mode, setMode] = useState<ChartMode>("total");

    const availableModes = useMemo<ChartMode[]>(() => {
        if (props.eventData.status === "Gamma")
            return ["total", "gamma"];
        if (props.eventData.status === "Neutron")
            return ["total", "neutron"];
        return ["total", "gamma", "neutron"];
    }, [props.eventData.status]);

    const gammaChartIds = useMemo(() => gammaDetectorChartIds, []);
    const neutronChartIds = useMemo(() => neutronDetectorChartIds, []);

    useEffect(() => {
        if (!availableModes.includes(mode))
            setMode("total");
    }, [availableModes, mode]);

    useEffect(() => {
        if (!props.showDetectorModes) return;

        const labels = {time: t("time"), gamma: t("gamma"), neutron: t("neutron")};
        const createCharts = (datasource: typeof ConSysApi | undefined, chartIds: string[], curves: any[]) => {
            if (!datasource) return [];

            return curves.flatMap((curve, index) => {
                const container = chartIds[index];
                if (!document.getElementById(container)) return [];

                return [
                    new ChartJsView({
                        type: "line",
                        container,
                        layers: [curve],
                        css: "chart-view",
                        options: {
                            plugins: {
                                title: {
                                    display: true,
                                    text: `${t("detector")} ${index + 1}`,
                                    font: {size: 14, weight: "bold" as const},
                                },
                                legend: {display: true, position: "bottom" as const},
                            },
                            responsive: true,
                            scales: {
                                x: {type: "time", title: {display: true, text: t("time")}},
                                y: {title: {display: true, text: "CPS"}, position: "left" as const},
                            },
                        },
                    })
                ];
            });
        };

        const views = [
            ...(availableModes.includes("gamma")
                ? createCharts(props.datasources.gamma, gammaChartIds, createGammaDetectorViewCurves(props.datasources.gamma, labels))
                : []),
            ...(availableModes.includes("neutron")
                ? createCharts(props.datasources.neutron, neutronChartIds, createNeutronDetectorViewCurves(props.datasources.neutron, labels))
                : []),
        ];

        detectorChartViewsRef.current = views;
        return () => {
            views.forEach(view => view.chart?.destroy());
            detectorChartViewsRef.current = [];
        };
    }, [availableModes, gammaChartIds, neutronChartIds, props.datasources.gamma, props.datasources.neutron, props.showDetectorModes, t]);

    useEffect(() => {
        if (!props.showDetectorModes || props.currentTime === null || props.currentTime === undefined) return;

        const time = new Date(props.currentTime);
        detectorChartViewsRef.current.forEach(view => {
            view.chart.options.plugins.annotation = {
                annotations: {
                    currentTime: {
                        type: "line",
                        xMin: time,
                        xMax: time,
                        borderColor: "yellow",
                        borderWidth: 4,
                        label: {enabled: true, content: t("currentTime")},
                    },
                },
            };
            view.chart.update();
        });
    }, [props.currentTime, props.showDetectorModes, t]);


    useEffect(() => {
        if (chartViews.gamma)
            setTimeout(() => {
                chartViews.gamma.chart.update();
            }, 300);

        if (chartViews.nsigma)
            setTimeout(() => {
                chartViews.nsigma.chart.update();
            }, 300);
    }, [chartViews.gamma, chartViews.nsigma]);


    useEffect(() => {
        if (!props.eventData || !props.datasources?.gamma || !props.datasources?.neutron) return;

        if (props.datasources?.threshold && props?.latestGB) setHasNsigma(true);

        const init = async () => {
            const layers = await createCurveLayers();
            setLayers(layers)
        };
        init();
    }, [props.eventData, props.latestGB, props.datasources]);

    const chartsInitializedRef = useRef(false);

    useEffect(() => {
        if (!props.eventData) {
            console.warn("No event data");
            return;
        }

        if (!layers) {
            console.warn("No layers");
            return;
        }

        if (chartsInitializedRef.current) return;

        const elementIds = updateChartElIds(props.eventData);

        renderCharts(layers, elementIds);
        chartsInitializedRef.current = true;

    }, [layers, props.eventData]);

    useEffect(() => {
        if (chartViews && props.currentTime) {
            annotateCharts(props.currentTime);
        }
    }, [props.currentTime, chartViews]);

    useEffect(() => {
        const updateLabels = (view: any, datasetLabels: string[]) => {
            if (!view?.chart) return;

            view.chart.options.scales.x.title.text = t('time');
            view.chart.data.datasets.forEach((dataset: any, index: number) => {
                if (datasetLabels[index]) dataset.label = datasetLabels[index];
            });
            view.chart.update();
        };

        updateLabels(chartViews.gamma, [t('gamma'), t('threshold')]);
        updateLabels(chartViews.neutron, [t('neutron')]);
        updateLabels(chartViews.nsigma, [t('gammaNSigma'), t('threshold')]);

        if (props.currentTime) annotateCharts(props.currentTime);
    }, [language, chartViews, props.currentTime]);



    function annotateCharts(currTime: any) {
        if (!currTime) return;

        const timeVal = new Date(currTime);

        let chartAnnotation = {
            annotations: {
                verticalLine: {
                    type: 'line',
                    xMin: timeVal,
                    xMax: timeVal,
                    borderColor: 'yellow',
                    borderWidth: 4,
                    label: {
                        enabled: true,
                        content: t('currentTime')
                    }
                }
            }
        };

        if (chartViews?.gamma) {
            const gchart = chartViews.gamma.chart;
            gchart.options.plugins.annotation = chartAnnotation;
            gchart.update();
        }

        if (chartViews?.nsigma) {
            const nSigmachart = chartViews.nsigma.chart;
            nSigmachart.options.plugins.annotation = chartAnnotation;
            nSigmachart.update();
        }

        if (chartViews?.neutron) {
            const nchart = chartViews.neutron.chart;
            nchart.options.plugins.annotation = chartAnnotation;
            nchart.update();
        }
    }

    function updateChartElIds(eventData: EventTableData): string[] {
        let ids: string[] = [];
        let gammaId: string;
        let nsigmaId: string;
        let neutronId: string

        switch (eventData.status) {
            case "Gamma":
                gammaId = gammaChartBaseId + eventData.id + "-" + props.modeType;
                nsigmaId = nsigmaChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(gammaId, nsigmaId);
                break;
            case "Neutron":
                neutronId = neutronChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(neutronId);
                break;
            case "Gamma & Neutron":
            case "None":
                gammaId = gammaChartBaseId + eventData.id + "-" + props.modeType;
                nsigmaId = nsigmaChartBaseId + eventData.id + "-" + props.modeType;
                neutronId = neutronChartBaseId + eventData.id + "-" + props.modeType;
                ids.push(gammaId, neutronId, nsigmaId);
                break;
            default:
                break;
        }
        return ids;
    }

    async function createCurveLayers() {
        const labels = {
            time: t('time'),
            neutron: t('neutron'),
            gamma: t('gamma'),
            threshold: t('threshold'),
            gammaNSigma: t('gammaNSigma'),
        };

        let result = await Promise.all([
            createNeutronViewCurve(props.datasources.neutron, labels),
            createGammaViewCurve(props.datasources.gamma, labels),
            createThresholdViewCurve(props.datasources.threshold, labels),
            createThreshSigmaViewCurve(props.datasources.threshold, labels),
            createNSigmaCalcViewCurve(props.datasources.gamma, props.latestGB, labels)
        ]);

        const [neutron, gamma, threshold, threshNsigma, nsigma] = result;
        return {
            neutron,
            gamma,
            threshold,
            threshNsigma,
            nsigma
        };
    }

    /**
     * Patches a ChartJsView instance so that its internal buffer is sorted by
     * timestamp before each chart update, ensuring data points render in order
     * even when the API returns them out of chronological order.
     *
     * TODO Probably should guarantee order in the API / datastore, or fix this in osh-js
     */
    const patchChartSorting = (chartView: any) => {
        const originalUpdate = chartView.chart.update.bind(chartView.chart);
        chartView.chart.update = (mode?: any) => {
            for (const dataset of chartView.chart.data.datasets) {
                if (dataset.data?.length > 1) {
                    dataset.data.sort((a: any, b: any) => a.x - b.x);
                }
            }
            originalUpdate(mode);
        };
    };

    const createOptions = (yLabel: string) => ({
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
                    text: yLabel
                },
                display: true,
                position: 'left' as const,
                grid: {
                    beginAtZero: false
                },
            },
        },
    });

    const renderCharts = (layers: CurveLayers, elementIds: string[]) => {
        if (layers?.gamma && gammaChartViewRef?.current) {
            const gammaLayers: any[] = [];

            if (layers.gamma) gammaLayers.push(layers.gamma);
            if (layers.threshold) gammaLayers.push(layers.threshold);

            const gammaDiv = document.createElement("div");
            gammaDiv.id = elementIds.find(id => id.includes("gamma"))!;
            gammaChartViewRef.current.innerHTML = ""; //clear previous chart
            gammaChartViewRef.current.appendChild(gammaDiv);

            const gammaChart = new ChartJsView({
                container: gammaDiv.id,
                layers: gammaLayers,
                css: "chart-view-event-detail",
                type: 'line',
                options: createOptions("CPS")
            });

            patchChartSorting(gammaChart);
            setChartViews(prev => ({...prev, gamma: gammaChart}));
        }

        if (layers?.neutron && neutronChartViewRef?.current) {
            const neutronDiv = document.createElement("div");
            neutronDiv.id = elementIds.find(id => id.includes("neutron"));

            neutronChartViewRef.current.innerHTML = "";
            neutronChartViewRef.current.appendChild(neutronDiv);

            const neutronChart = new ChartJsView({
                container: neutronDiv.id,
                layers: [layers.neutron],
                css: "chart-view-event-detail",
                type: 'line',
                options: {
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: t('time'),
                                padding: 5},
                            type: 'time'
                        },
                        y: {
                            type: 'linear',
                            position: 'left',
                            title: {
                                display: true,
                                text: 'CPS',
                                padding: 15
                            },
                            beginAtZero: false,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });

            patchChartSorting(neutronChart);
            setChartViews(prev => ({...prev, neutron: neutronChart}));
        }

        if (layers?.nsigma && layers?.threshNsigma && nSigmaChartViewRef?.current) {
            setHasNsigma(true);
            const nsigmaDiv = document.createElement("div");
            nsigmaDiv.id = elementIds.find(id => id.includes("nsigma"));

            nSigmaChartViewRef.current.innerHTML = "";
            nSigmaChartViewRef.current.appendChild(nsigmaDiv);

            const nsigmaChart = new ChartJsView({
                container: nsigmaDiv.id,
                layers: [layers.nsigma, layers.threshNsigma],
                css: "chart-view-event-detail",
                type: 'line',
                options: createOptions("Nσ")
            });
            patchChartSorting(nsigmaChart);
            setChartViews(prev => ({...prev, nsigma: nsigmaChart}));
        }
    };

    const handleToggle = (event: React.MouseEvent<HTMLElement>, newView: string) => {
        setToggleView(newView);
    }

    const renderToggleButtons = () => {
        if (!hasNsigma) return null;

        return (
            <Grid item style={{display: "flex", justifyContent: "center", width: "100%"}}>
                <ToggleButtonGroup
                    size="small"
                    orientation="horizontal"
                    onChange={handleToggle}
                    exclusive
                    value={toggleView}
                >
                    <ToggleButton
                        color='error'
                        value={"cps"}
                        key={"cps"}
                        disabled={toggleView === 'cps'}
                    >
                        CPS
                    </ToggleButton>,
                    <ToggleButton
                        color='secondary'
                        value={"sigma"}
                        key={"sigma"}
                        disabled={toggleView === 'sigma'}
                    >
                        NSigma
                    </ToggleButton>

                </ToggleButtonGroup>
            </Grid>
        );
    }

    const renderGammaChart = () => {
        return (
            <Grid item xs sx={{width: "100%", display: toggleView === 'cps' ? 'block' : 'none'}} ref={gammaChartViewRef}/>
        )
    }

    const renderNSigmaChart = () => {
        if(!hasNsigma) return null;

        return(
            <Grid item xs sx={{width: "100%", display: toggleView === 'sigma' ? 'block' : 'none'}} ref={nSigmaChartViewRef}/>
        )
    }

    const renderNeutronChart = () => {
        return (
            <Grid item xs sx={{width: "100%"}} ref={neutronChartViewRef}/>
        )

    }

    const renderChartsByStatus = () => {
        switch (props.eventData.status) {
            case "Gamma":
                return (
                    <>
                        {renderToggleButtons()}
                        {renderGammaChart()}
                        {renderNSigmaChart()}
                    </>
                );

            case "Neutron":
                return renderNeutronChart();

            case "Gamma & Neutron":
            case "None":
            default:
                return (
                    <>
                        {renderToggleButtons()}
                        {renderGammaChart()}
                        {renderNSigmaChart()}
                        {renderNeutronChart()}
                    </>
                );
        }
    };

    const renderDetectorCharts = (chartIds: string[]) => (
        <Grid container spacing={2}>
            {chartIds.map(chartId => (
                <Grid item xs={12} md={6} key={chartId}>
                    <div id={chartId} style={{height: 360}}/>
                </Grid>
            ))}
        </Grid>
    );

    const aggregateCharts = (
        <Box display='flex' alignItems="center">
            <Grid container direction="column" spacing={2}>
                {renderChartsByStatus()}
            </Grid>
        </Box>
    );

    if (!props.showDetectorModes) return aggregateCharts;

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <ToggleButtonGroup
                    exclusive
                    value={mode}
                    onChange={(_, nextMode: ChartMode | null) => nextMode && setMode(nextMode)}
                    size="small"
                    aria-label="chart mode"
                >
                    <ToggleButton value="total">{t("chartModeTotal")}</ToggleButton>
                    {availableModes.includes("gamma") && <ToggleButton value="gamma">{t("chartModeGammaDetectors")}</ToggleButton>}
                    {availableModes.includes("neutron") && <ToggleButton value="neutron">{t("chartModeNeutronDetectors")}</ToggleButton>}
                </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} sx={{position: "relative"}}>
                <Box sx={{display: mode === "total" ? "block" : "none"}}>{aggregateCharts}</Box>
                {availableModes.includes("gamma") && (
                    <Box sx={{display: mode === "gamma" ? "block" : "none"}}>
                        {renderDetectorCharts(gammaChartIds)}
                    </Box>
                )}
                {availableModes.includes("neutron") && (
                    <Box sx={{display: mode === "neutron" ? "block" : "none"}}>
                        {renderDetectorCharts(neutronChartIds)}
                    </Box>
                )}
            </Grid>
        </Grid>
    );
}