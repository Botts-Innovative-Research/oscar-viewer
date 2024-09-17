/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */
'use client';

import {useAppDispatch} from "@/lib/state/Hooks";
import {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {Typography} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectEventPreview} from "@/lib/state/OSCARClientSlice";
import {current} from "@reduxjs/toolkit";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView.js";
import CurveLayer from 'osh-js/source/core/ui/layer/CurveLayer.js';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {Mode} from "osh-js/source/core/datasource/Mode";
import annotationPlugin from 'chartjs-plugin-annotation';
import {Chart, registerables} from 'chart.js';

Chart.register(...registerables, annotationPlugin);

export default function ChartIntercept() {
    const dispatch = useAppDispatch();
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const eventPreview = useSelector((state: RootState) => selectEventPreview(state));
    const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);

    // chart specifics
    const timeVert = useState<Date>;
    const horizontalThreshold = useState<number>(0);
    // const chartViewEl
    const chartViewRef = useRef<typeof ChartJsView | null>(null);
    const [localDataSync, setLocalDataSync] = useState<typeof DataSynchronizer>();
    const dsMap = useRef<Map<string, typeof SweApi[]>>(new Map<string, any[]>());
    const [gammaDatasources, setGammaDS] = useState<typeof SweApi[]>([]);
    const [neutronDatasources, setNeutronDS] = useState<typeof SweApi[]>([]);
    const occDatasources = useState<typeof SweApi[]>([]);
    const [thresholdDatasources, setThresholdDS] = useState<typeof SweApi[]>([]);
    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof SweApi[]>>(new Map<string, typeof SweApi[]>());
    const [thresholdCurve, setThresholdCurve] = useState<typeof CurveLayer>();
    const [gammaCurve, setGammaCurve] = useState<typeof CurveLayer>();
    const [neutronCurve, setNeutronCurve] = useState<typeof CurveLayer>();
    const [occupancyCurve, setOccupancyCurve] = useState<typeof CurveLayer>();

    const collectDatasources = useCallback(() => {
        let currentLane = eventPreview.eventData.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        if (currLaneEntry) {
            let datasources = currLaneEntry.getDatastreamsForEventDetail(eventPreview.eventData.startTime, eventPreview.eventData.endTime);
            setLocalDSMap(datasources);
        }
        setGammaDS(localDSMap.get("gamma"));
        setNeutronDS(localDSMap.get("neutron"));
        setThresholdDS(localDSMap.get("gammaTrshld"));
    }, [eventPreview, laneMapRef]);

    const createCurveLayers = useCallback(() => {
        console.log("LocalDSMap", localDSMap);
        if (thresholdDatasources) {
            const tCurve = new CurveLayer({
                dataSourceIds: thresholdDatasources.map((ds) => ds.id),
                getValues: (rec: any, timestamp: any) => ({x: timestamp, y: rec.threshold}),
                name: "Gamma Threshold"
            });
            setThresholdCurve(tCurve);

            const timeCurve = new CurveLayer({
                dataSourceIds: thresholdDatasources.map((ds) => ds.id),
                getValues: () => {
                    return {x: 0}
                },
                name: "CurrentTime"
            });
        }

        if (gammaDatasources) {
            const gCurve = new CurveLayer({
                dataSourceIds: gammaDatasources.map((ds) => ds.id),
                getValues: (rec: any, timestamp: any) => {
                    console.log(rec.gammaGrossCount1)
                    return {x: timestamp, y: rec.gammaGrossCount1}
                },
                name: "Gamma Count"
            });
            setGammaCurve(gCurve);
        }

        if (neutronDatasources) {
            const nCurve = new CurveLayer({
                dataSourceIds: neutronDatasources.map((ds) => ds.id),
                // dataSourceIds: localDSMap.get("neutron")?.map((ds) => ds.id),
                getValues: (rec: any, timestamp: any) => {
                    console.log(rec.neutronGrossCount1);
                    return {x: timestamp, y: rec.neutronGrossCount1}
                },
                name: 'Neutron Count'
            });
            setNeutronCurve(nCurve);
        }
    }, [localDSMap]);

    const addAllDSToSync = useCallback(() => {
        let allDS = [
            ...(gammaDatasources || []),
            ...(neutronDatasources || []),
            ...(thresholdDatasources || [])
        ];
        if (allDS.length > 0) {
            let newSync = new DataSynchronizer({
                dataSources: allDS,
                replaySpeed: 1.0,
                startTime: eventPreview.eventData.startTime,
                endTime: "Now",
            });
            setLocalDataSync(newSync);
        }
    }, [localDSMap, eventPreview]);

    useEffect(() => {
        collectDatasources();
    }, [eventPreview, laneMapRef]);

    useEffect(() => {
        if (localDSMap.size > 0) {
            addAllDSToSync();
        }
    }, [localDSMap, eventPreview]);

    useEffect(() => {
        if (localDSMap.size > 0) {
            createCurveLayers();
        }
    }, [localDSMap]);

    const resetView = useCallback(() => {
        if (!eventPreview.isOpen && chartViewRef.current) {
            chartViewRef.current.destroy();
            chartViewRef.current = null;
            setIsReadyToRender(false);
            localDSMap.clear();
            localDataSync?.disconnect();
            setLocalDataSync(undefined);
        }
    }, [eventPreview, localDSMap, localDataSync]);

    useEffect(() => {
        resetView();
    }, [resetView]);

    const checkForMountableAndCreateChart = useCallback(() => {
        if (!chartViewRef.current && !isReadyToRender && thresholdCurve && gammaCurve && neutronCurve) {
            const container = document.getElementById("chart-view-event-detail");
            if (container) {
                let chartView = new ChartJsView({
                    container: "chart-view-event-detail",
                    layers: [thresholdCurve, gammaCurve, neutronCurve],
                    css: "chart-view-event-detail",
                });
                chartViewRef.current = chartView;
                setIsReadyToRender(true);
            }
        }
    }, [thresholdCurve, gammaCurve, neutronCurve, isReadyToRender]);

    useEffect(() => {
        checkForMountableAndCreateChart();
    }, [checkForMountableAndCreateChart]);

    useEffect(() => {
        if (localDataSync && isReadyToRender) {
            localDataSync.connect().then((r: any) => {
                console.log("DataSync Connected", r);
            });
        }
    }, [isReadyToRender, localDataSync]);

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                [Chart Goes Here]
                <div id="chart-view-event-detail"></div>
            </Typography>
        </div>
    );
}
