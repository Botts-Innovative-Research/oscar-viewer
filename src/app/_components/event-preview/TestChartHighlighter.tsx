/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

"use client";


import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView.js";
import CurveLayer from 'osh-js/source/core/ui/layer/CurveLayer.js';
import {Mode} from "osh-js/source/core/datasource/Mode";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {END_TIME, START_TIME} from "@/lib/data/Constants";
import {useEffect, useRef, useState} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectMoveHighlighterTimeStamp} from "@/lib/state/Slice";
// import styled from "styled-components";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";


// const TopRight = styled.div`
//     display: flex;
//     flex-direction: column;
//     align-items: center;
//     justify-content: center;
//     background-color: #e0e0e0;
//     height: 377.5px;
// `;


interface HistoricalChartProps {
    OccDataSourceId: string;
    GamaDataSourceId?: string;
    NeutronDataSourceId?: string;
    GamaName?: string;
    NeutronName?: string;
    ThreshDataSourceId: string;

}

const initialState: HistoricalChartProps = {
    OccDataSourceId: '',
    GamaDataSourceId: '',
    NeutronDataSourceId: '',
    NeutronName: '',
    ThreshDataSourceId: '',
}

export default function TestChartHighlighter({
                                                 OccDataSourceId,
                                                 GamaDataSourceId,
                                                 NeutronDataSourceId,
                                                 GamaName,
                                                 NeutronName,
                                                 ThreshDataSourceId
                                             }: HistoricalChartProps) {
    const [isThreshold, setThreshold] = useState(null);

    const gamaChartViewRef = useRef(null);

    let HighlighterValue =
        '2024-08-06T19:28:49Z '

    const server = 'http://162.238.96.81:8781/sensorhub/api';
    const GamaEnd = ' 2024-08-20T15:18:03Z'
    const GamaStart = '2024-08-20T15:16:41Z'
    const OccStart = '2024-08-20T15:17:21Z'
    const OccEnd = '2024-08-20T15:18:45Z'
    const ThreshStart = '2024-08-20T15:17:23Z'
    const ThreshEnd = '2024-08-20T15:17:48Z'


    // const HighlighterValue = useSelector((state: RootState) => selectMoveHighlighterTimeStamp(state));


    //TODO Replace SweApi structure with store/context datasource calls.
    const gamaName: string = GamaName;

    const chartOccupancyDataSource = new SweApi("asd", {
        protocol: "ws",
        endpointUrl: server,
        resource: `/datastreams/${OccDataSourceId}/observations`,
        startTime: OccStart,
        endTime: OccEnd,
        mode: Mode.BATCH
        // tls: secure

    });
    chartOccupancyDataSource.connect();
    const chartThresholdDataSource = new SweApi("asd", {
        protocol: "ws",
        endpointUrl: server,
        resource: `/datastreams/${ThreshDataSourceId}/observations`,
        startTime: OccStart,
        endTime: OccEnd,
        mode: Mode.BATCH
        // tls: secure

    });
    chartThresholdDataSource.connect();

    const gamaValueDataSource = new SweApi("asd", {
        protocol: "ws",
        endpointUrl: server,
        resource: `/datastreams/${GamaDataSourceId}/observations`,
        startTime: GamaStart,
        endTime: GamaEnd,
        mode: Mode.BATCH
        // tls: secure


    });
    gamaValueDataSource.connect();
    const dataSynchronizerOcc = new DataSynchronizer({
        startTime: OccStart,
        endTime: OccEnd,
        dataSources: [chartOccupancyDataSource],

    });
    dataSynchronizerOcc.connect();
    const dataSynchronizerGama = new DataSynchronizer({
        startTime: GamaStart,
        endTime: GamaEnd,
        dataSources: [gamaValueDataSource]
    })
    dataSynchronizerGama.connect();
    dataSynchronizerOcc.connect();
    const dataSynchronizerThresh = new DataSynchronizer({
        startTime: ThreshStart,
        endTime: ThreshEnd,
        dataSources: [gamaValueDataSource]
    })
    dataSynchronizerThresh.connect();
    const gamaCurve = new CurveLayer({
        dataSourceId: [gamaValueDataSource.id],
        getValues: (rec: any) => {

            return {
                y: rec.gamaName,
            }

        },
        lineColor: 'rgba(38,152,255,0.5)',
        fill: true,
        backgroundColor: 'rgba(169,212,255,0.5)',
        maxValues: 1000,
        name: gamaName,

    });


    const threshCurve = new CurveLayer({
        dataSourceId: [chartThresholdDataSource.id],
        getValues: (rec: any, threshold: any) => {
            setThreshold(threshold)
            return {
                // x: rec.threshold,
                y: rec.sigma
            }

        },
        lineColor: 'rgba(38,152,255,0.5)',
        fill: true,
        backgroundColor: 'rgba(169,212,255,0.5)',
        maxValues: 1000,
        name: 'startTime',
    })

    const timeCurve = new CurveLayer({
        dataSourceId: [chartOccupancyDataSource.id],
        getValues: (rec: any) => {

            return {
                x: rec.startTime,
            }

        },
        lineColor: 'rgba(38,152,255,0.5)',
        fill: true,
        backgroundColor: 'rgba(169,212,255,0.5)',
        maxValues: 1000,
        name: 'startTime',

    });


    useEffect(() => {

        const gamaChartConfig = {
            container: 'chart-historical-container',
            layers: [timeCurve, gamaCurve],
            css: "chart-view",
            options: {
                type: 'line',
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: gamaName || 'NA',
                            padding: 20
                        }
                    },
                }
            },

            plugins: {
                annotation: {
                    annotations: {
                        thresholdLine: {
                            type: 'line',
                            // yMin: ThresholdValue || 'NA',
                            // yMax: ThresholdValue || 'NA',
                            yMin: isThreshold,
                            yMax: isThreshold,
                            borderColor: 'orange',
                            fill: true,
                            backgroundColor: 'rgba(253, 200,50, 0.9)',
                            borderWidth: 2,
                            label: {
                                content: 'Threshold',
                                enabled: false,
                                position: 'center'
                            }
                        },
                        highlighterLine: {
                            type: 'line',
                            xMin: 'Point 2',
                            xMax: 'Point 2',
                            borderColor: 'red',
                            fill: true,
                            backgroundColor: 'rgba(253, 200,0, 0.5)',
                            borderWidth: 2,
                            label: {
                                content: 'Threshold',
                                enabled: false,
                                position: 'center'
                            }
                        },
                    }
                }
            },

            datasetOptions: {
                tension: 0.2 // for 'line',

            },
        };
        const gamaChart = new ChartJsView(gamaChartConfig);
        gamaChartViewRef.current = gamaChart;
        // Cleanup if necessary when the component unmounts

        if (gamaChart) {
            console.log(OccDataSourceId)
        }

        const chart = gamaChartViewRef.current.chart;

        // test to see if adding annotation directly to chatJSView props is viable or if it needs to be declared separately.
        chart.options.plugins.annotation = {
            annotations: {
                line1: {
                    type: 'line',
                    xMin: HighlighterValue,
                    xMax: HighlighterValue,
                    borderColor: 'red',
                    borderWidth: 2,
                },

            }
        };

        chart.update();

        return () => {
            gamaChart.destroy(); // Assuming ChartJsView has a destroy method
        };
    }, [timeCurve, HighlighterValue]);


    return (
        // <div className="chart-Historical">
        //     <h3>Chart</h3>
        //     {/*<TopRight>*/}
        //     <div id="chart-historical-container" className="chart-container"></div>
        //     {/*</TopRight>*/}
        // </div>
        <div>
            <h3>Chart!</h3>
        </div>
    );
}
