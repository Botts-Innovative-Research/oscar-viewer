"use client";

import React, {useCallback, useEffect, useRef, useState} from "react";
import {Box, Typography} from "@mui/material";
import Chart from "chart.js/auto";
import {N42Report} from "@/app/_components/n42/N42Detail";

interface N42ChartPlaybackProps {
    reports: N42Report[];
    title: string;
    yValue?: string;
    chartId: string;
}

export default function N42ChartPlayback({reports, title, yValue = "linearSpectrum", chartId}: N42ChartPlaybackProps) {
    const chartRef = useRef<Chart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

    const spectrumFrames = React.useMemo(() => {
        return reports
            .map((r: any) => r[yValue])
            .filter((s: any) => Array.isArray(s) && s.length > 0);
    }, [reports, yValue]);

    const updateChart = useCallback((spectrumData: number[], frameIndex: number, totalFrames: number) => {
        if (!canvasRef.current) return;

        const channels = spectrumData.map((_, index) => index);

        if (chartRef.current) {
            chartRef.current.data.labels = channels;
            chartRef.current.data.datasets[0].data = spectrumData;
            if (chartRef.current.options.plugins?.title) {
                chartRef.current.options.plugins.title.text = `${title} - Frame ${frameIndex + 1}/${totalFrames}`;
            }
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
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `${title} - Frame ${frameIndex + 1}/${totalFrames}`,
                            font: {size: 14, weight: 'bold'},
                        },
                        legend: {
                            display: true,
                            position: 'bottom',
                        }
                    },
                    scales: {
                        x: {
                            title: {display: true, text: 'Channel'},
                            ticks: {maxTicksLimit: 20},
                        },
                        y: {
                            title: {display: true, text: 'Counts'},
                            beginAtZero: true,
                        },
                    },
                }
            });
        }
    }, [title]);

    useEffect(() => {
        if (spectrumFrames.length > 0 && spectrumFrames[currentFrameIndex]) {
            updateChart(spectrumFrames[currentFrameIndex], currentFrameIndex, spectrumFrames.length);
        }
    }, [currentFrameIndex, spectrumFrames, updateChart]);

    useEffect(() => {
        if (spectrumFrames.length <= 1) return;

        const duration = reports[currentFrameIndex]?.duration ?? 0.2;
        const intervalMs = Math.max(duration * 1000, 100);

        const timeout = setTimeout(() => {
            setCurrentFrameIndex(prev => (prev + 1) % spectrumFrames.length);
        }, intervalMs);

        return () => clearTimeout(timeout);
    }, [currentFrameIndex, spectrumFrames, reports]);

    useEffect(() => {
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, []);

    if (spectrumFrames.length === 0) {
        return (
            <Box sx={{height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Typography color="text.secondary">No {yValue} data available</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{position: 'relative', height: 400, width: '85%'}}>
            <canvas ref={canvasRef} id={chartId}></canvas>
        </Box>
    );
}
