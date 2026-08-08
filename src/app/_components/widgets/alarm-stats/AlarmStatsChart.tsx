"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useEffect, useRef} from "react";
import Chart from "chart.js/auto";
import {Box} from "@mui/material";

interface Props {
    /** Full chart.js config ({type, data, options}) from chartSpecs. */
    spec: any;
}

/**
 * Canvas host for the alarm-stats charts: owns the chart.js lifecycle, resize
 * and in-place updates so the three visualizations only have to describe
 * themselves as data. Fills whatever height its parent gives it.
 */
export default function AlarmStatsChart({spec}: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);
    const typeRef = useRef<string | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !spec) return;

        // Recreate only when the chart type changes (chart.js can't switch a
        // bar chart to a line chart in place); everything else is an update,
        // so theme and data changes never flash.
        if (chartRef.current && typeRef.current === spec.type) {
            const chart = chartRef.current;
            chart.data = spec.data;
            chart.options = spec.options;
            chart.update('none');
            return;
        }

        chartRef.current?.destroy();
        chartRef.current = new Chart(canvas, spec);
        typeRef.current = spec.type;
    }, [spec]);

    useEffect(() => () => {
        chartRef.current?.destroy();
        chartRef.current = null;
    }, []);

    // chart.js's own resize handling misses some react-grid-layout resize
    // paths (the container is resized without a window resize event), the same
    // reason MapComponent carries its own observer.
    useEffect(() => {
        const el = containerRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => chartRef.current?.resize());
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <Box ref={containerRef} sx={{flex: 1, minHeight: 0, minWidth: 0, position: 'relative', width: '100%'}}>
            <canvas ref={canvasRef}/>
        </Box>
    );
}
