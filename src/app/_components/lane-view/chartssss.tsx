// "use client"
//
//
// import {Grid} from "@mui/material";
// import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// import React, {useCallback, useEffect, useRef, useState} from "react";
// import ChartJsView from "osh-js/source/core/ui/view/chart/ChartJsView";
// import {createGammaViewCurve, createNeutronViewCurve, createThresholdViewCurve} from "@/app/utils/Utils";
//
// export class ChartInterceptProps {
//     laneName: string;
//     datasources: { gamma: typeof SweApi, neutron: typeof SweApi, threshold: typeof SweApi };
//     setChartReady: Function;
// }
//
// export default function ChartLane(props: ChartInterceptProps){
//
//     const [chartsReady, setChartsReady] = useState<boolean>(false);
//     const [isReadyToRender, setIsReadyToRender] = useState<boolean>(false);
//
//     const gammaChartViewRef = useRef(null);
//     const neutronChartViewRef = useRef(null);
//     const gammaChartBaseId = "chart-lane-view-gamma";
//     const neutronChartBaseId = "chart-lane-view-neutron";
//     const [gammaChartView, setGammaChartView] = useState<any>();
//     const [neutronChartView, setNeutronChartView] = useState<any>();
//
//     let datasources = props.datasources
//
//     function createCurveLayersAndReturn() {
//         let tCurve = createThresholdViewCurve(props.datasources.threshold);
//         let gCurve = createGammaViewCurve(props.datasources.gamma);
//         let nCurve = createNeutronViewCurve(props.datasources.neutron);
//         let sCurve = createNeutronViewCurve(props.datasources.threshold);
//         return {
//             gamma: gCurve,
//             neutron: nCurve,
//             threshold: tCurve,
//             sigma: sCurve
//         }
//     }
//
//     function createChartViews(layers: { gamma: any, threshold: any, sigma: any, neutron: any }, elementIds: string[]) {
//         console.log("Creating Chart Views", layers, elementIds);
//         let newChartViews: any = {gamma: null, neutron: null};
//
//
//         for (let id of elementIds) {
//
//             if (id.includes("gamma")) {
//
//                 let gammaChartElt = document.createElement("div");
//                 gammaChartElt.id = id;
//                 if (gammaChartViewRef.current) {
//                     gammaChartViewRef.current.appendChild(gammaChartElt);
//                 }
//
//                 let layersAvail: any[] =[];
//
//                 if(layers.gamma && layers.threshold && layers.sigma){
//                     layersAvail.push(layers.gamma, layers.sigma, layers.threshold)
//                 }
//                 else if(layers.gamma && !layers.sigma && !layers.threshold){
//                     layersAvail.push(layers.gamma)
//                 }
//
//                 let gammaChart = new ChartJsView({
//                     container: id,
//                     layers: layersAvail,
//                     css: "chart-view",
//                 });
//
//                 console.log("Created Gamma Chart", gammaChart);
//                 newChartViews.gamma = gammaChart;
//                 setGammaChartView(gammaChart);
//             }
//
//             if (id.includes("neutron")) {
//                 let neutronChartElt = document.createElement("div");
//                 neutronChartElt.id = id;
//                 if (neutronChartViewRef.current) {
//                     neutronChartViewRef.current.appendChild(neutronChartElt);
//                 }
//
//
//                 let neutronChart = new ChartJsView({
//                     container: id,
//                     layers: [layers.neutron],
//                     css: "chart-view",
//                 });
//                 console.log("Created Neutron Chart", neutronChart);
//                 newChartViews.neutron = neutronChart;
//                 setNeutronChartView(neutronChart);
//
//             }
//
//
//         }
//         return newChartViews;
//     }
//
//     useEffect(() => {
//         let elementIds: any[] = updateChartElIds();
//         if(datasources.gamma && datasources.neutron){
//             let layers = createCurveLayersAndReturn();
//             console.log(layers)
//             let views = createChartViews(layers, elementIds);
//             if (views.gamma || views.neutron) {
//                 console.log('setting chart ready')
//                 setChartsReady(true);
//             }
//         }
//
//     }, [datasources]);
//
//     const checkReadyToRender = useCallback(() => {
//         if (chartsReady) {
//             setIsReadyToRender(true);
//         } else {
//             setIsReadyToRender(false);
//         }
//     }, [chartsReady]);
//
//     function updateChartElIds() {
//         return [gammaChartBaseId, neutronChartBaseId];
//     };
//
//     useEffect(() => {
//         checkReadyToRender();
//     }, [chartsReady]);
//
//     useEffect(() => {
//         if (isReadyToRender) {
//             console.log("Chart is ready to render");
//             props.setChartReady(true);
//         }
//     }, [isReadyToRender]);
//
//
//     return (
//         <Grid container direction="row" marginTop={2} marginLeft={1} spacing={3}>
//             <Grid item xs>
//                 <div ref={gammaChartViewRef} style={{marginBottom: 50, height: '85%',}}></div>
//             </Grid>
//             <Grid item xs>
//                 <div ref={neutronChartViewRef} style={{marginBottom: 50, height: '85%',}}></div>
//             </Grid>
//         </Grid>
//     );
// };