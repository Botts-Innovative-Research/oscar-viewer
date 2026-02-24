"use client";

import React, {useCallback, useEffect, useRef, useState} from "react";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView";
import {createN42ViewCurve} from "@/app/utils/ChartUtils";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";
import {Chart, registerables} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

Chart.register(...registerables, annotationPlugin);

interface ChartInterceptProps {
    laneName: string;
    datasource: typeof ConSysApi,
    setChartReady: Function;
    title: string;
    yCurve: string;
    yValue: string;
    currentTime: any;
}


type ChartTypes ={
    n42?: any;
}

export default function N42ChartPlayback({datasource, setChartReady, yCurve, title, yValue, currentTime}: ChartInterceptProps) {
    const chartId = "chart-view-n42-playback";
    const chartViewRef = useRef<typeof ChartJsView | null>(null);
    const [curve, setCurve] = useState<typeof CurveLayer>();

    const [chartViews, setChartViews] = useState<ChartTypes>({
        n42: null,
    });

    useEffect(() => {
        if (chartViews.n42)
            setTimeout(() => {
                chartViews.n42.chart.update();
            }, 300);
    }, [ chartViews.n42]);


    useEffect(() => {
        if (datasource)
            setCurve(createN42ViewCurve(datasource, title, yCurve, yValue));

    }, [datasource]);

    const createChart = useCallback(() => {
        if (curve && !chartViewRef.current) {
            const container = document.getElementById(chartId);

            if (container) {
                chartViewRef.current = new ChartJsView({
                    type: 'line',
                    container: chartId,
                    layers: [curve],
                    css: "chart-view",
                    options: {
                        plugins: {
                            title: {
                                display: true,
                                text: title,
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
                            y: {
                                title: {
                                    display: true,
                                    text: 'Counts',

                                },
                                display: true,
                                position: 'left',
                                align: 'center',
                                grid: {beginAtZero: false},
                                ticks: {},


                            },
                        },
                    }
                })
            }
        }

        if (curve)
            setChartReady(true);

    },[curve, setChartReady]);

    const annotateCharts = (currTime: any) => {
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
                        content: 'Current Time'
                    }
                }
            }
        };

        if (chartViews?.n42) {
            const n42Chart = chartViews.n42.chart;
            n42Chart.options.plugins.annotation = chartAnnotation;
            n42Chart.update();
        }
    }

    useEffect(() => {
        createChart();
    }, [createChart]);

    return (
        <div id={chartId} style={{marginBottom: 50, height: '85%'}}></div>
    );
}
