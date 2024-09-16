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

export default function ChartIntercept() {
    const dispatch = useAppDispatch();
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const eventPreview = useSelector((state: RootState) => selectEventPreview(state));

    // chart specifics
    const timeVert = useState<Date>;
    const horizontalThreshold = useState<number>(0);
    // const chartViewEl
    const chartViewRef = useRef<typeof ChartJsView | null>(null);
    const dsMap = useRef<Map<string, typeof SweApi[]>>(new Map<string, any[]>());
    const gammaDatasources = useState<typeof SweApi[]>([]);
    const neutronDatasources = useState<typeof SweApi[]>([]);
    const occDatasources = useState<typeof SweApi[]>([]);
    const thresholdDatasources = useState<typeof SweApi[]>([]);
    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof SweApi[]>>(new Map<string, typeof SweApi[]>());
    const [thresholdCurve, setThresholdCurve] = useState<typeof CurveLayer>();
    const [gammaCurve, setGammaCurve] = useState<typeof CurveLayer>();
    const [neutronCurve, setNeutronCurve] = useState<typeof CurveLayer>();
    const [occupancyCurve, setOccupancyCurve] = useState<typeof CurveLayer>();

    const collectDatasources = useCallback(() => {
        let currentLane = eventPreview.eventData.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        console.log("currentLaneEntry for ChartIntercept", currLaneEntry);
        let datasources = currLaneEntry.getDatastreamsForEventDetail(eventPreview.eventData.startTime, eventPreview.eventData.endTime);
        console.log("Datasources of Event Prev:", datasources);
        dsMap.current = datasources;
        setLocalDSMap(datasources);
    }, [dispatch, eventPreview]);

    const createCurveLayers = useCallback(() => {
        console.log("localDSMap", localDSMap);
        if (localDSMap.has("gammaTrshld")) {
            const tCurve = new CurveLayer({
                dataSourceIds: localDSMap.get("gammaTrshld")?.map((ds) => ds.id),
                getValues: (rec: any) => {
                    return {y: rec.threshold}
                },
                name: "Gamma Threshold"
            });
            setThresholdCurve(tCurve);

            const timeCurve = new CurveLayer({
                dataSourceIds: localDSMap.get("gammaTrshld")?.map((ds) => ds.id),
                getValues: () => {
                    return {x: 0}
                },
                name: "CurrentTime"
            });
        }

        if (localDSMap.has("gamma")) {

            let dss = localDSMap.get("gamma");
            console.log(dss)
            let ids = dss.map((ds) => ds.id);
            console.log("IDs:", ids);

            // todo: determine how to deal with all 4 counts at once most effectively (I assume 4 layers)
            const gCurve = new CurveLayer({
                dataSourceIds: localDSMap.get("gamma")?.map((ds) => ds.id),
                getValues: (rec: any) => {
                    return {y: rec.gammaGrossCount1}
                },
                name: "Gamma Count"
            });
            setGammaCurve(gCurve);
        }

        if (localDSMap.has("neutron")) {
            const nCurve = new CurveLayer({
                dataSourceIds: localDSMap.get("neutron")?.map((ds) => ds.id),
                getValues: (rec: any) => {
                    return {y: rec.neutronGrossCount1}
                },
                name: 'Neutron Count'
            });
            setNeutronCurve(nCurve);
        }
    }, [localDSMap]);

    useEffect(() => {
        collectDatasources();
    }, [dispatch, eventPreview]);

    useEffect(() => {
        createCurveLayers();
    }, [localDSMap]);

    useMemo(() => {
        if (!chartViewRef.current) {
            console.log("Curve Layers", [thresholdCurve, gammaCurve, neutronCurve]);

            try {
                if (!document.getElementById("chart-view-event-detail")) {
                    throw new Error("Container element not found");
                }

                if(document.getElementById("chart-view-event-detail")) {
                    console.log("Chart View Element Found", document.getElementById("chart-view-event-detail"));
                }

                let chartView = new ChartJsView({})

                // let chartView = new ChartJsView({
                //     container: "chart-view-event-detail",
                //     layers: [thresholdCurve, gammaCurve, neutronCurve],
                //     css: "chart-view-event-detail",
                // });
                //
                // chartViewRef.current = chartView;
            } catch (error) {
                console.error("Error creating ChartJsView:", error);
            }
        }

        // return () => {
        //     if (chartViewRef.current) {
        //         try {
        //             chartViewRef.current.destroy();
        //             chartViewRef.current = undefined;
        //         } catch (error) {
        //             console.error("Error destroying ChartJsView:", error);
        //         }
        //     }
        // };

    }, []);

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                [Chart Goes Here]
                <div id="chart-view-event-detail">

                </div>
            </Typography>
        </div>
    )
}
