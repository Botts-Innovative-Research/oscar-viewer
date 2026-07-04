"use client"

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { Box, Grid } from "@mui/material";
import Chart from "chart.js/auto";
import { EventType } from "osh-js/source/core/event/EventType";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import { useLanguage } from "@/app/contexts/LanguageContext";

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
// Render cadence — one bar per tick, regardless of how often the datasource publishes.
const TICK_MS = 200;
// If no new reading arrives within this window, render gaps so a stale feed is visible.
// 15s = 3× the 5s background publish cadence, so a single missed publish doesn't trigger it.
const STALE_MS = 15_000;
// 30_000 / 200 = 150. Fixed bar count → constant bar thickness via Chart.js category scale.
const MAX_POINTS = WINDOW_MS / TICK_MS;

interface DataPoint {
    time: number;
    value: number | null;
}

/** Imperative feed for the scrolling chart: push readings from any source. */
export interface ScrollingChartHandle {
    pushValue: (value: number) => void;
    setThreshold: (value: number) => void;
}

interface ScrollingBarChartCoreProps {
    title: string;
    barColor: string;
    showThreshold?: boolean;
    height?: number | string;
}

/**
 * Chart rendering + fixed-cadence tick, decoupled from data delivery.
 * Values arrive through the imperative handle so the same chart serves both
 * the legacy direct-datasource path and registry-fed widgets.
 */
export const ScrollingBarChartCore = forwardRef<ScrollingChartHandle, ScrollingBarChartCoreProps>(
    function ScrollingBarChartCore({ title, barColor, showThreshold = false, height = 250 }, ref) {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const chartRef = useRef<Chart | null>(null);
        const pointsRef = useRef<DataPoint[]>([]);
        const thresholdRef = useRef<number | null>(null);
        // Latest reading from the datasource (carry-forward source for the timer tick).
        const lastValueRef = useRef<number | null>(null);
        // Wall-clock time of the most recent reading; used to detect stale feeds.
        const lastUpdateRef = useRef<number>(0);
        // Don't begin pushing bars until the first real reading arrives, so we
        // don't pre-fill the chart with a misleading row of zeros.
        const startedRef = useRef<boolean>(false);
        // Timer effect calls renderChartRef.current() so it doesn't need to restart
        // when the renderChart callback identity changes.
        const renderChartRef = useRef<() => void>(() => {});

        useImperativeHandle(ref, () => ({
            pushValue: (value: number) => {
                lastValueRef.current = value;
                lastUpdateRef.current = Date.now();
                startedRef.current = true;
            },
            setThreshold: (value: number) => {
                thresholdRef.current = value;
            },
        }), []);

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

        // Keep the timer's renderChart reference fresh without restarting the interval
        // when renderChart's identity changes (it depends on showThreshold).
        useEffect(() => {
            renderChartRef.current = renderChart;
        }, [renderChart]);

        // Fixed-cadence renderer: one bar per TICK_MS, regardless of publish rate.
        // Note: when the tab is hidden, browsers throttle setInterval to ~1Hz, so the
        // buffer will refill over ~30s when the user refocuses. Acceptable here.
        useEffect(() => {
            const id = setInterval(() => {
                // Don't push placeholder bars before any real data has arrived.
                if (!startedRef.current) return;

                const now = Date.now();
                const stale = now - lastUpdateRef.current > STALE_MS;
                // Carry the last value forward; render a gap (null) once stale so a
                // dropped feed is visually obvious instead of silently held forever.
                const value = stale ? null : lastValueRef.current;

                pointsRef.current.push({ time: now, value });
                while (pointsRef.current.length > MAX_POINTS) {
                    pointsRef.current.shift();
                }

                renderChartRef.current();
            }, TICK_MS);

            return () => clearInterval(id);
        }, []);

        return (
            <Box sx={{ height: height, position: 'relative', width: '100%' }}>
                <canvas ref={canvasRef} />
            </Box>
        );
    });

interface ScrollingBarChartProps {
    title: string;
    barColor: string;
    datasource: any;
    thresholdDatasource?: any;
    dataField: string;
    showThreshold?: boolean;
    height?: number | string;
}

export function ScrollingBarChart({ title, barColor, datasource, thresholdDatasource, dataField, showThreshold = false, height }: ScrollingBarChartProps) {
    const coreRef = useRef<ScrollingChartHandle>(null);

    // Subscribe to count datasource — only record the latest value here;
    // the timer tick in the core owns all chart updates so cadence is fixed.
    useEffect(() => {
        if (!datasource) return;

        const handler = (message: any) => {
            const rec = message.values?.[0];
            if (!rec) return;
            const value = rec.data?.[dataField];
            if (value == null) return;
            coreRef.current?.pushValue(value);
        };

        datasource.subscribe(handler, [EventType.DATA]);
        return () => {
            try { datasource.unsubscribe(handler, [EventType.DATA]); } catch (_) {}
        };
    }, [datasource, dataField]);

    // Subscribe to threshold datasource — store the value only;
    // the next timer tick will pick it up and redraw.
    useEffect(() => {
        if (!thresholdDatasource || !showThreshold) return;

        const handler = (message: any) => {
            const rec = message.values?.[0];
            if (!rec) return;
            const val = rec.data?.threshold;
            if (val != null) {
                coreRef.current?.setThreshold(val);
            }
        };

        thresholdDatasource.subscribe(handler, [EventType.DATA]);
        return () => {
            try { thresholdDatasource.unsubscribe(handler, [EventType.DATA]); } catch (_) {}
        };
    }, [thresholdDatasource, showThreshold]);

    return (
        <ScrollingBarChartCore
            ref={coreRef}
            title={title}
            barColor={barColor}
            showThreshold={showThreshold}
            height={height}
        />
    );
}

export default function ChartLane({ laneName, datasources, setChartReady }: ChartInterceptProps) {
    const { t } = useLanguage();
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
                        title={t('gammaChart')}
                        barColor="#f44336"
                        datasource={datasources.gamma}
                        thresholdDatasource={datasources.threshold}
                        dataField="gammaGrossCount"
                        showThreshold={true}
                    />
                </Grid>
                <Grid item xs>
                    <ScrollingBarChart
                        title={t('neutronChart')}
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
