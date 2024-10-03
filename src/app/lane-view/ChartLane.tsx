"use client"


import {Box, Button, Grid, Stack, ToggleButton, ToggleButtonGroup, Typography} from "@mui/material";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import React, {useCallback, useEffect, useRef, useState} from "react";
import CurveLayer from "osh-js/source/core/ui/layer/CurveLayer";
import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView";

export class ChartInterceptProps {
    laneName: string;
    gammaDatasources: typeof SweApi[];
    neutronDatasources: typeof SweApi[];
    occDatasources: typeof SweApi[];
    thresholdDatasources: typeof SweApi[];
    setChartReady: Function;
}

export default function ChartLane(props: ChartInterceptProps){


    const [chartsReady, setChartsReady] = useState<boolean>(false);
    const [viewReady, setViewReady] = useState<boolean>(false);
    const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);

    const gammaChartBaseId = "chart-view-gamma";
    const neutronChartBaseId = "chart-view-neutron";

    const [gammaChartID, setGammaChartID] = useState<string>("");
    const [neutronChartID, setNeutronChartID] = useState<string>("");

    const [thresholdCurve, setThresholdCurve] = useState<typeof CurveLayer>();
    const [gammaCurve, setGammaCurve] = useState<typeof CurveLayer>();
    const [neutronCurve, setNeutronCurve] = useState<typeof CurveLayer>();

    const gammaChartViewRef = useRef<typeof ChartJsView | null>(null);
    const neutronChartViewRef = useRef<typeof ChartJsView | null>(null);

    // const [selectedChart, setSelectedChart] = useState<string>('both');

    function createGammaViewCurve(gammaDatasource: { id: any; }) {
        if (!gammaDatasource) return null;

        let gCurve = new CurveLayer({
            dataSourceIds: [gammaDatasource.id],
            getValues: (rec: any, timestamp: any) => {
                return {x: timestamp, y: rec.gammaGrossCount1}
            },
            name: "Gamma Plot",
            backgroundColor: "#f44336",
            lineColor: "#f44336",
            xLabel: 'Time',
            yLabel: 'CPS',
        });

        return gCurve;
    }

    function createNeutronViewCurve(neutronDatasource: { id: any; }) {
        if (!neutronDatasource) return null;

        let nCurve = new CurveLayer({
            dataSourceIds: [neutronDatasource.id],
            getValues: (rec: any, timestamp: any) => {
                    return {x: timestamp, y: rec.neutronGrossCount1}
            },
            name: 'Neutron Plot',
            backgroundColor: "#29b6f6",
            lineColor: '#29b6f6',
            xLabel: 'Time',
            yLabel: 'CPS',
        });

        return nCurve;
    }

    function createThresholdViewCurve(thresholdDatasource: { id: any; }) {
        if (!thresholdDatasource) return null;

        let thresholdCurve = new CurveLayer({
            dataSourceIds: [thresholdDatasource.id],
            getValues: (rec: any, timestamp: any) => ({x: timestamp, y: rec.threshold}),
            name: "Gamma Threshold",
            backgroundColor: "#ab47bc",
            lineColor: '#ab47bc',
            xLabel: 'Time',
            yLabel: 'Sigma',

        });

        return thresholdCurve;
    }

    const createCurveLayers = useCallback(() => {
        // console.log("LocalDSMap", localDSMap);
        if (props.thresholdDatasources.length > 0) {
            console.log("Threshold DS", props.thresholdDatasources);

            let tCurve = createThresholdViewCurve(props.thresholdDatasources[0]);
            setThresholdCurve(tCurve);
        }

        if (props.gammaDatasources.length > 0) {
            console.log("Gamma DS", props.gammaDatasources);

            let gCurve = createGammaViewCurve(props.gammaDatasources[0]);
            setGammaCurve(gCurve);
        }

        if (props.neutronDatasources.length > 0) {
            console.log("Neutron DS", props.neutronDatasources);

            let nCurve = createNeutronViewCurve(props.neutronDatasources[0]);
            setNeutronCurve(nCurve);
        }

        setChartsReady(true);
    }, [props]);



    const checkForMountableAndCreateCharts = useCallback(() => {

        if (!gammaChartViewRef.current && !isReadyToRender && thresholdCurve && gammaCurve) {
            const container = document.getElementById(gammaChartID);
            if (container) {
                gammaChartViewRef.current = new ChartJsView({
                    container: gammaChartID,
                    layers: [thresholdCurve, gammaCurve],
                    css: "chart-view",
                    // chartjsProps: {
                    //     chartProps: {
                    //         scales: {
                    //             yAxes: [{
                    //                 scaleLabel: {
                    //                     labelString: "CPS"
                    //                 },
                    //                 ticks: {
                    //                     maxTicksLimit: 30
                    //                 }
                    //             }],
                    //             xAxes: [{
                    //                 scaleLabel: {
                    //                     labelString: "Time"
                    //                 },
                    //                 ticks: {
                    //                     maxTicksLimit: 20
                    //                 }
                    //             }],
                    //         },
                    //
                    //     },
                    // }
                });
                setViewReady(true);
            }
        }

        if (!neutronChartViewRef.current && !isReadyToRender && neutronCurve) {
            console.log("Creating Neutron Chart:", neutronCurve);

            const containerN = document.getElementById(neutronChartID);
            if (containerN) {
                neutronChartViewRef.current = new ChartJsView({
                    container: neutronChartID,
                    layers: [neutronCurve],
                    css: "chart-view",
                });
                setViewReady(true);
            }
        }
    }, [thresholdCurve, gammaCurve, neutronCurve, isReadyToRender]);

    const checkReadyToRender = useCallback(() => {
        if (chartsReady && viewReady) {
            setIsReadyToRender(true);
        } else {
            setIsReadyToRender(false);
        }
    }, [chartsReady, viewReady]);

    useEffect(() => {
        checkForMountableAndCreateCharts();
    }, [checkForMountableAndCreateCharts]);


    useEffect(() => {
        if (checkForProvidedDataSources()) {
            createCurveLayers();
        }
    }, [props]);


    useEffect(() => {
        checkReadyToRender();
    }, [chartsReady, viewReady]);

    useEffect(() => {
        if (isReadyToRender) {
            console.log("Chart is ready to render");
            props.setChartReady(true);
        }
    }, [isReadyToRender]);

    const updateChartElIds = useCallback(() => {

        setGammaChartID(gammaChartBaseId);
        setNeutronChartID(neutronChartBaseId);

    }, []);

    useEffect(() => {
        updateChartElIds();
    }, [props]);

    function checkForProvidedDataSources() {
        console.log("[CI] Checking for provided data sources...");
        if (!props.gammaDatasources || !props.neutronDatasources || !props.thresholdDatasources) {
            console.warn("No DataSources provided for ChartTimeHighlight");
            return false;
        } else {
            return true;
        }
    }


    // const handleChange = (chart: string) => {
    //     setSelectedChart(chart)
    // }



    return (
        <Grid container direction="row" spacing={6}  marginTop={2} marginLeft={2}>
            <Grid item xs>
                <div id={gammaChartID} style={{
                    marginBottom: 50,
                    height: '85%',
                }}></div>
            </Grid>
            <Grid item xs>
                <div id={neutronChartID} style={{
                    marginBottom: 50,
                    height: '85%',
                }}></div>
            </Grid>
        </Grid>
    );
};

{/*<Grid container direction="row" spacing={2}>*/}
{/*    /!*<ToggleButtonGroup*!/*/}
{/*    /!*    color="error"*!/*/}
{/*    /!*    orientation="vertical"*!/*/}

{/*    /!*>*!/*/}

{/*    /!*    /!*<Button value="cps" onClick={() => handleChange('cps')}>CPS</Button>*!/*!/*/}
{/*    /!*    /!*<Button value="sigma" onClick={() => handleChange("sigma")}>Sigma</Button>*!/*!/*/}
{/*    /!*    /!*<Button value="both" onClick={() => handleChange("both")}>Both</Button>*!/*!/*/}
{/*    /!*</ToggleButtonGroup>*!/*/}
{/*   */}

{/*</Grid>*/}

{/*<div id={gammaChartID} style={{display: selectedChart === "cps" ? "block" : "none"}}></div>*/}
{/*<div id={thresholdChartID} style={{display: selectedChart === "sigma" ? "block" : "none"}}></div>*/}
{/*<div id={bothChartID} style={{display: selectedChart === "both" ? "block" : "none"}}></div>*/}

{/*<div id={gammaChartID}*/}
{/*     style={{contentVisibility: selectedChart === 'cps' ? 'visible' : 'hidden'}}></div>*/}
{/*<div id={gammaChartID}*/}
{/*     style={{contentVisibility: selectedChart === 'sigma' ? 'visible' : 'hidden'}}></div>*/}
{/*<div id={gammaChartID}*/}
{/*     style={{contentVisibility: selectedChart === 'both' ? 'visible' : 'hidden'}}></div>*/}