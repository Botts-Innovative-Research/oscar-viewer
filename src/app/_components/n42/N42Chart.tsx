"use client";

import React, {useCallback, useEffect, useRef, useState} from "react";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView";
import {createN42ViewCurve} from "@/app/utils/ChartUtils";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";


interface ChartInterceptProps {
    laneName: string;
    datasource: typeof ConSysApi,
    setChartReady: Function;
    title: string;
    yCurve: string;
    yValue: string;

}


export default function N42Chart({datasource, setChartReady, yCurve, title, yValue}: ChartInterceptProps) {
    const chartId = "chart-view-n42";
    const chartViewRef = useRef<typeof ChartJsView | null>(null);
    const [curve, setCurve] = useState<typeof CurveLayer>();

    useEffect(() => {
        if(datasource)
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

    useEffect(() => {
        createChart();
    }, [createChart]);

    return (
        <div id={chartId} style={{marginBottom: 50, height: '85%'}}></div>
    );
}
