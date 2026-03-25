"use client";

import React, {useCallback, useEffect, useRef, useState} from "react";
import Chart from "chart.js/auto";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream.js";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {Box, Typography} from "@mui/material";

interface ChartInterceptProps {
    laneName?: string;
    datastream: typeof DataStream;
    title: string;
    yCurve?: string;
    yValue?: string;
    chartId: string;
    startTime?: string;
    endTime?: string;
    currentTime?: number;
}

export default function Rs350ChartPlayback({datastream, title, yValue = "linearSpectrum", chartId, startTime='2026-02-24T20:44:06Z', endTime='2026-02-24T20:44:25Z', currentTime}: ChartInterceptProps) {
    const chartRef = useRef<Chart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [spectrumFrames, setSpectrumFrames] = useState<number[][]>([]);
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const [hasData, setHasData] = useState(false);

    const updateChart = useCallback((spectrumData: number[], frameIndex: number, totalFrames: number) => {
        if (!canvasRef.current) return;

        const channels = spectrumData.map((_, index) => index);
        setHasData(true);

        if (chartRef.current) {
            chartRef.current.data.labels = channels;
            chartRef.current.data.datasets[0].data = spectrumData;
            chartRef.current.options.plugins!.title!.text = `${title} - Frame ${frameIndex + 1}/${totalFrames}`;
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

    // need to have the chart move through each array just as it would the video frames
    useEffect(() => {
        if (!datastream) return;

        const fetchSpectrumData = async () => {
            let initialResColl = await datastream.searchObservations(
                new ObservationFilter({ resultTime: `${startTime}/${endTime}` }),
                1000
            );

            let frames: number[][] = [];
            while (initialResColl.hasNext()) {
                let resArray = await initialResColl.nextPage();
                let res = resArray.map((item: any) => item.result[yValue]);
                frames.push(...res);
            }
            setSpectrumFrames(frames);
        };

        fetchSpectrumData();

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [datastream, startTime, endTime, yValue]);

    useEffect(() => {
        if (spectrumFrames.length > 0 && spectrumFrames[currentFrameIndex]) {
            updateChart(spectrumFrames[currentFrameIndex], currentFrameIndex, spectrumFrames.length);
        }
    }, [currentFrameIndex, spectrumFrames, updateChart]);

    useEffect(() => {
        if (currentTime == undefined || spectrumFrames.length === 0) return;

        const frameIndex = getFrameIndex(currentTime);
        if (frameIndex !== currentFrameIndex) {
            setCurrentFrameIndex(frameIndex);
        }
    }, [currentTime, spectrumFrames]);

    function getFrameIndex(currTimeMs: number) {
        if (spectrumFrames.length === 0)
            return 0;

        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        const totalDuration = end - start;

        const progress = Math.max(0, Math.min(1, (currTimeMs - start) / totalDuration));
        const frameIndex = Math.floor(progress * spectrumFrames.length);
        return Math.min(frameIndex, spectrumFrames.length - 1);
    }

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
            <Box sx={{position: 'relative', height: 400, width: '100%', display: hasData ? 'block' : 'none',}}>
                <canvas ref={canvasRef} id={chartId}></canvas>
            </Box>
        </>
    );
}