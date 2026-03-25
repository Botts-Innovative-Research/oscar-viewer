"use client";

import React, {useCallback, useEffect, useRef, useState} from "react";
import {Box, Typography} from "@mui/material";
import Chart from "chart.js/auto";
import {EventType} from "osh-js/source/core/event/EventType";

interface ChartInterceptProps {
    laneName?: string;
    datasource: any;
    title: string;
    yCurve?: string;
    yValue?: string;
    chartId: string
}

export default function N42Chart({datasource, title, yValue = "linearSpectrum", chartId}: ChartInterceptProps) {
    const chartRef = useRef<Chart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [hasData, setHasData] = useState(false);

    const updateChart = useCallback((spectrumData: number[]) => {
        if (!canvasRef.current) return;

        const channels = spectrumData.map((_, index) => index);

        setHasData(true);

        if (chartRef.current) {
            chartRef.current.data.labels = channels;
            chartRef.current.data.datasets[0].data = spectrumData;
            chartRef.current.update('none');
        } else {
            chartRef.current = new Chart(canvasRef.current, {
                type: 'line',
                data: {
                    labels: channels,
                    datasets: [{
                        label: title,
                        data: spectrumData,
                        borderColor: '#366cf4',
                        backgroundColor: 'rgb(109,162,231)',
                        borderWidth: 1,
                        fill: true,
                        pointRadius: 0,
                        tension: 0.1,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    animation: false,
                    plugins: {
                        title: {
                            display: true,
                            text: title,
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                        },
                        legend: {
                            display: true,
                            position: 'bottom',
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Channel',
                            },
                            ticks: {
                                maxTicksLimit: 20,
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Counts',
                            },
                            beginAtZero: true,
                        },
                    },
                }
            });
        }
    }, [title]);

    useEffect(() => {
        if (!datasource) return;

        const handleData = (rec: any) => {
            const spectrum = rec.values[0].data[yValue];

            if (spectrum && Array.isArray(spectrum)) {
                updateChart(spectrum);
            }
        };

        datasource.subscribe(handleData, [EventType.DATA]);

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [datasource, yValue, updateChart]);


    return (
        <>
            {!hasData && (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '85%',
                    minHeight: 50,
                    marginBottom: '50px',
                    p: 2,
                }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        No data available at this time
                    </Typography>
                </Box>
            )}
            <Box sx={{
                position: 'relative',
                width: '100%',
                maxHeight: 300,
                display: hasData ? 'block' : 'none',
            }}>
                <canvas ref={canvasRef} id={chartId} />
            </Box>
        </>
    );

}
