"use client";

import React, {useEffect, useRef} from "react";
import {Box, Grid, Typography} from "@mui/material";
import {Chart, registerables} from "chart.js";
import {AlarmTransferPayload, CompactAlarmSeries} from "@/lib/data/oscar/AlarmQrTransfer";
import {useLanguage} from "@/app/contexts/LanguageContext";

Chart.register(...registerables);

function points(series: CompactAlarmSeries): {x: number; y: number}[] {
    return (series.points ?? []).map(([milliseconds, value]) => ({x: milliseconds / 1000, y: value}));
}

export default function AlarmTransferCharts({payload}: {payload: AlarmTransferPayload}) {
    const {t} = useLanguage();
    const gammaCanvas = useRef<HTMLCanvasElement>(null);
    const neutronCanvas = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const charts: Chart[] = [];
        const gamma = points(payload.series.gamma);
        const threshold = payload.series.threshold.constant !== undefined
            ? gamma.map(point => ({x: point.x, y: payload.series.threshold.constant!}))
            : points(payload.series.threshold);
        const neutron = points(payload.series.neutron);

        if (gammaCanvas.current && gamma.length > 0) {
            charts.push(new Chart(gammaCanvas.current, {
                type: "line",
                data: {
                    datasets: [
                        {label: t("gamma"), data: gamma, borderColor: "#f44336", pointRadius: 2},
                        {label: t("threshold"), data: threshold, borderColor: "#9b27b0", pointRadius: 1},
                    ],
                },
                options: {
                    parsing: false,
                    animation: false,
                    responsive: true,
                    scales: {
                        x: {type: "linear", title: {display: true, text: t("secondsFromStart")}},
                        y: {title: {display: true, text: "CPS"}},
                    },
                    plugins: {title: {display: true, text: t("gammaChart")}},
                },
            }));
        }

        if (neutronCanvas.current && neutron.length > 0) {
            charts.push(new Chart(neutronCanvas.current, {
                type: "line",
                data: {
                    datasets: [
                        {label: t("neutron"), data: neutron, borderColor: "#29b6f6", pointRadius: 3},
                    ],
                },
                options: {
                    parsing: false,
                    animation: false,
                    responsive: true,
                    scales: {
                        x: {type: "linear", title: {display: true, text: t("secondsFromStart")}},
                        y: {title: {display: true, text: "CPS"}, ticks: {stepSize: 1}},
                    },
                    plugins: {title: {display: true, text: t("neutronChart")}},
                },
            }));
        }
        return () => charts.forEach(chart => chart.destroy());
    }, [payload, t]);

    return (
        <Box sx={{width: "100%"}}>
            <Typography variant="subtitle2" color="text.secondary" textAlign="center" gutterBottom>
                {t("alarmQrPreviewLabel")}
            </Typography>
            <Grid container spacing={2}>
                {payload.series.gamma.exportedCount > 0 && (
                    <Grid item xs={12} md={6}><canvas ref={gammaCanvas}/></Grid>
                )}
                {payload.series.neutron.exportedCount > 0 && (
                    <Grid item xs={12} md={6}><canvas ref={neutronCanvas}/></Grid>
                )}
            </Grid>
        </Box>
    );
}
