"use client"

import React, { useCallback, useEffect, useRef } from "react";
import { Box, Grid } from "@mui/material";
import Chart from "chart.js/auto";
import { EventType } from "osh-js/source/core/event/EventType";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";

export class ChartInterceptProps {
    laneName: string;
    datasources: {
        gamma: typeof ConSysApi,
        neutron: typeof ConSysApi,
        threshold: typeof ConSysApi
    };
    setChartReady: Function;
}

const WINDOW_MS = 30_000;

interface DataPoint {
    time: number;
    value: number;
}

interface ScrollingBarChartProps {
    title: string;
    barColor: string;
    datasource: any;
    thresholdDatasource?: any;
    dataField: string;
    showThreshold?: boolean;
}

function ScrollingBarChart({ title, barColor, datasource, thresholdDatasource, dataField, showThreshold = false }: ScrollingBarChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const pointsRef = useRef<DataPoint[]>([]);
    const thresholdRef = useRef<number | null>(null);

    // Create chart on mount, destroy on unmount
    useEffect(() => {
        if (!canvasRef.current) return;

        chartRef.current = new Chart(canvasRef.current, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        type: 'bar',
                        label: title,
                        data: [],
                        backgroundColor: barColor + '99',
                        borderColor: barColor,
                        borderWidth: 1,
                        order: 2,
                        barPercentage: 0.9,
                        categoryPercentage: 1.0,
                    } as any,
                    {
                        type: 'line',
                        label: 'Threshold',
                        data: [],
                        borderColor: '#ff9800',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        pointRadius: 0,
                        stepped: true,
                        order: 1,
                    } as any,
                ],
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: title,
                        font: { size: 14, weight: 'bold' },
                    },
                    legend: { display: true, position: 'bottom' },
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Time' },
                        ticks: { maxTicksLimit: 6, maxRotation: 0 },
                    },
                    y: {
                        title: { display: true, text: 'CPS' },
                        beginAtZero: true,
                    },
                },
            },
        });

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, []);

    const renderChart = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const points = pointsRef.current;
        const labels = points.map(p => {
            const d = new Date(p.time);
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        });

        chart.data.labels = labels;
        chart.data.datasets[0].data = points.map(p => p.value);
        chart.data.datasets[1].data = (showThreshold && thresholdRef.current != null)
            ? points.map(() => thresholdRef.current as number)
            : [];

        chart.update('none');
    }, [showThreshold]);

    // Subscribe to count datasource
    useEffect(() => {
        if (!datasource) return;

        const handler = (message: any) => {
            const rec = message.values?.[0];
            if (!rec) return;
            const value = rec.data?.[dataField];
            if (value == null) return;

            const rawTs = rec.timeStamp ?? rec.data?.timestamp;
            const time = rawTs ? new Date(rawTs).getTime() : Date.now();

            const cutoff = time - WINDOW_MS;
            pointsRef.current.push({ time, value });
            // Trim points outside the 30s window from the front (data arrives in order)
            while (pointsRef.current.length > 0 && pointsRef.current[0].time < cutoff) {
                pointsRef.current.shift();
            }

            renderChart();
        };

        datasource.subscribe(handler, [EventType.DATA]);
        return () => {
            try { datasource.unsubscribe(handler, [EventType.DATA]); } catch (_) {}
        };
    }, [datasource, dataField, renderChart]);

    // Subscribe to threshold datasource
    useEffect(() => {
        if (!thresholdDatasource || !showThreshold) return;

        const handler = (message: any) => {
            const rec = message.values?.[0];
            if (!rec) return;
            const val = rec.data?.threshold;
            if (val != null) {
                thresholdRef.current = val;
                renderChart();
            }
        };

        thresholdDatasource.subscribe(handler, [EventType.DATA]);
        return () => {
            try { thresholdDatasource.unsubscribe(handler, [EventType.DATA]); } catch (_) {}
        };
    }, [thresholdDatasource, showThreshold, renderChart]);

    return (
        <Box sx={{ height: 250, position: 'relative', width: '100%' }}>
            <canvas ref={canvasRef} />
        </Box>
    );
}

export default function ChartLane({ laneName, datasources, setChartReady }: ChartInterceptProps) {
    useEffect(() => {
        if (datasources.gamma || datasources.neutron) {
            setChartReady(true);
        }
    }, [datasources.gamma, datasources.neutron]);

    return (
        <Box display='flex' alignItems="center" width="100%">
            <Grid container direction="row" marginTop={2} marginLeft={1} spacing={4}>
                <Grid item xs>
                    <ScrollingBarChart
                        title="Gamma Chart"
                        barColor="#f44336"
                        datasource={datasources.gamma}
                        thresholdDatasource={datasources.threshold}
                        dataField="gammaGrossCount"
                        showThreshold={true}
                    />
                </Grid>
                <Grid item xs>
                    <ScrollingBarChart
                        title="Neutron Chart"
                        barColor="#29b6f6"
                        datasource={datasources.neutron}
                        dataField="neutronGrossCount"
                        showThreshold={false}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
